const _ = require('lodash'),
    async = require('async'),
    mongoose = require('mongoose');
const QuizSchema = new mongoose.Schema({
    name: { type: String, required: true },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    default: {
        shuffleChoices: Boolean,
        useLaTeX: Boolean,
        points: { type: Number, default : 4 },
        firstTryBonus: { type : Number, default : 1 },
        penalty: { type : Number, default : 1 }
    },
    studentChoice: Boolean,
    studentVoting: Boolean
}, {
    timestamps: true
});
// Delete cascade
QuizSchema.pre('remove', function (next) {
    let self = this;
    async.parallel([
        done => self.model('Course').update({ quizzes: { $in: [self._id] }}, { $pull: { quizzes: self._id }}, done),
        done => self.model('Question').remove({ _id: { $in: self.questions }}, done),
        done => self.model('TutorialQuiz').remove({ quiz: self._id }, done)
    ], next);
});
// Populate tutorial-quizzes
QuizSchema.virtual('tutorialQuizzes', { ref: 'TutorialQuiz', localField: '_id', foreignField: 'quiz' });
// Populate questions
QuizSchema.methods.withQuestions = function (deep = false) {
    let opts = {
        path: 'questions',
        model: 'Question'
    };
    if (deep) {
        opts.populate = {
            path: 'submitter',
            model: 'User'
        }
    }
    return this.populate(opts);
};
// Set quiz
QuizSchema.methods.store = function (opts) {
    this.studentChoice = !!opts.studentChoice;
    this.studentVoting = !!opts.studentVoting;
    this.default.shuffleChoices = !!opts.default.shuffleChoices;
    this.default.useLaTeX = !!opts.default.useLaTeX;
    this.set(opts);
    return this;
};
// Check if quiz is linked with tutorial
QuizSchema.methods.isLinkedTo = function (tutorial) {
    return _.some(this.tutorialQuizzes, tutorialQuiz => tutorialQuiz.tutorial.equals(tutorial._id));
};
// Save quiz
QuizSchema.methods.linkTutorials = function (tutorials = [], done) {
    let self = this;
    async.series([
        done => {
            self.populate({
                path: 'tutorialQuizzes',
                match: {
                    tutorial: { $nin: tutorials } // TODO: prevent started TQs
                }
            }, done)
        },
        done => {
            self.model('TutorialQuiz').remove({ _id: { $in: self.tutorialQuizzes }}, done)
        },
        done => {
            async.eachSeries(tutorials, (tutorial, done) => {
                self.model('TutorialQuiz').create({ tutorial: tutorial, quiz: self }, err => {
                    done(err && err.code !== 11000 ? err : null);
                });
            }, done);
        }
    ], done);
};

// Load quiz' tutorials (deprecated)
QuizSchema.methods.loadTutorials = function () {
    let quiz = this;
    return self.model('TutorialQuiz').find({ quiz: quiz }).populate('tutorial').exec(function (err, tutorialQuizzes) {
        quiz.tutorials = tutorialQuizzes.map(function (tutorialQuiz) { 
            return tutorialQuiz.tutorial.id;
        });
    });
};

module.exports = mongoose.model('Quiz', QuizSchema);