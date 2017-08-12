const _ = require('../../utils/lodash.mixin'),
    async = require('async'),
    models = require('../../models');
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
// exports.getQuestions = (req, res) => { 
//     req.quiz.withQuestions().execPopulate().then(() => {
//         if (req.query.sort === 'votes') {
//             // sort questions based on votes
//             req.quiz.questions = _.orderBy(req.quiz.questions, question => {
//                 return _.lowerBound(question.votes.up.length, question.votes.length);
//             }, 'desc');
//         }
//         res.render(/* TBD */);
//     });
// };
//
exports.getQuestionForm = (req, res) => {
    let question = new models.Question();
    res.render('student/submit-question', {
        title: 'Submit Question',
        course: req.course,
        tutorialQuiz: req.tutorialQuiz,
        question: question,
        initQuestionForm: true
    });
};

exports.addQuestion = (req, res) => {
    let question = new models.Question({ submitter: req.user._id });
    // set default options
    _.forOwn(req.tutorialQuiz.quiz.default, (v, k) => {
        question[k] = _.defaultTo(question[k], v);
    });

    async.series([
        done => question.store(req.body).save(done),
        done => req.tutorialQuiz.quiz.update({ $addToSet: { questions: question._id }}, done)
    ], err => {
        console.log(err)
        if (err)
            req.flash('error', 'An error has occurred while trying to perform operation.');
        else
            req.flash('success', 'Your question has been submitted for review.');
        res.redirect(`/student/courses/${req.course._id}/quizzes/${req.tutorialQuiz._id}/submit-question`);
    });
};

// Update user's vote to question
exports.updateVote = (req, res) => {
    req.question.votes.up.pull(req.user._id);
    req.question.votes.down.pull(req.user._id);
    // req.body.vote = up|down
    req.question.votes[req.body.vote].push(req.user._id);
    req.question.save(err => {
        res.json(/* TBD */);
    });
};

exports.upvoteQuestion = (questionId, voterId) => {
    models.Question.findById(questionId, (err, question) => {
        question.votes.up.push(voterId);
        question.save(err => {
            console.log(err);
        });
    });
} 

exports.downvoteQuestion = (questionId, voterId) => {
    models.Question.findById(questionId, (err, question) => {
        question.votes.down.push(voterId);
        question.save(err => {
            console.log(err);
        });
    });
} 

