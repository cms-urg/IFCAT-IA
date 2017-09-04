const _ = require('../../utils/lodash.mixin'),
    async = require('async'),
    models = require('../../models'),
    url = require('url');
// Retrieve course
exports.getQuestionByParam = (req, res, next, id) => {
    models.Question.findById(id, (err, question) => {
        if (err)
            return next(err);
        if (!question) 
            return next(new Error('No question is found.'));
        req.question = question;
        next();
    });
};
// Retrieve list of questions for quiz
exports.getQuestions = (req, res, next) => {
    let options = { 
        populate: { path: 'submitter', model: 'User' }
    };
    if (req.query.sort && req.query.sort != 'votes') {
        options.options = { sort: req.query.sort };
    }
    req.quiz.withQuestions(options).execPopulate().then(() => {
        let questions = req.quiz.questions;
        // sort questions by voting score
        if (req.query.sort == 'votes')
            questions = _.orderBy(questions, 'votes.score', 'desc');
        // group questions by status
        questions = _.groupBy(questions, question => question.submitter && !question.approved ? 'pending' : 'approved');

        res.render('admin/pages/quiz-questions', {
            mathjax: true,
            bodyClass: 'questions-page',
            title: 'Questions',
            course: req.course,
            quiz: req.quiz,
            questions: questions
        });
    }, next);
};
// Sort list of questions
exports.sortQuestions = (req, res, next) => {
    let o = req.body.questions || [];
    // sort questions based off order given
    req.quiz.questions.sort((a, b) => o.indexOf(a.toString()) < o.indexOf(b.toString()) ? -1 : 1);
    req.quiz.save(err => {
        if (err) 
            return next(err);
        req.flash('success', 'List of questions have been reordered.');
        res.redirect('back');
    });
};
// Retrieve specific question for quiz
exports.getQuestion = (req, res, next) => {
    let question = req.question || new models.Question();
    // set default options
    _.forOwn(req.quiz.default, (v, k) => {
        if (_.isUndefined(question[k]) || _.isNull(question[k]) || _.isEmptyArray(question[k]))
            question[k] = v;
    });

    req.course.withFiles().execPopulate().then(() => {
        question.populate('submitter').execPopulate().then(() => {
            res.render('admin/pages/quiz-question', {
                bodyClass: 'question-page',
                title: question.isNew ? 'Add New Question' : 'Edit Question',
                course: req.course, 
                quiz: req.quiz, 
                question: question
            });
        }, next);
    }, next);
};
// Add new question for quiz
exports.addQuestion = (req, res, next) => {
    let question = new models.Question();
    let url = `/admin/courses/${req.course._id}/quizzes/${req.quiz._id}/questions`;
    async.series([
        done => question.store(req.body).save(done),
        done => req.quiz.update({ $addToSet: { questions: question._id }}, done)
    ], err => {
        if (err) 
            return next(err);
        req.flash('success', 'Question <b>%s</b> has been created.', question.number);
        res.redirect(req.body.back === '1' ? url : 'back');
    });
};
// Update specific question for quiz
exports.editQuestion = (req, res, next) => {
    req.question.store(req.body).save(err => {
        if (err) 
            return next(err);
        req.flash('success', 'Question <b>%s</b> has been updated.', req.question.number);
        res.redirect('back');
    });
};
// Delete specific question for quiz
exports.deleteQuestion = (req, res, next) => {
    req.question.remove(err => {
        if (err) 
            return next(err);
        req.flash('success', 'Question <b>%s</b> has been deleted.', req.question.number);
        res.redirect('back');
    });
};
// Preview question
exports.previewQuestion = (req, res, next) => {
    res.render('admin/pages/previewQuestion/preview-question.ejs', {});
};