const _ = require('../lib/lodash.mixin'),
    async = require('async'),
    mongoose = require('mongoose'),
    url = require('url');
const QuestionSchema = new mongoose.Schema({
    number: String,
    type: { type: String, enum: ['multiple choice', 'multiple select', 'short answer', 'code tracing'] },
    question: { type: String, required: true },
    code: String,
    choices: [String],
    answers: [String],
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    links: [String],
    caseSensitive: Boolean,
    maxPointsPerLine: { type: Number, default: 1 },
    maxAttemptsPerLine: { type: Number, default: 1 },
    shuffleChoices: Boolean,
    useLaTeX: Boolean,
    points: Number,
    firstTryBonus: Number,
    penalty: Number,
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    votes: {
        up: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        down: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }
}, {
    timestamps: true 
});
// Get total number of votes
QuestionSchema.virtual('votes.length').get(function () {
    return this.votes.up.length + this.votes.down.length;
});
// Delete cascade
QuestionSchema.pre('remove', function (next) {
    let self = this;
    async.parallel([
        done => self.model('Quiz').update({ questions: { $in: [self._id] }}, { $pull: { questions: self._id }}, done),
        done => self.model('Response').remove({ question: self._id }, done)
    ], next);
});
// Populate files
QuestionSchema.methods.withFiles = function () {
    return this.populate({ path: 'files', options: { sort: { name: 1 }}});
};
// Check if question is a multiple choice question
QuestionSchema.methods.isMultipleChoice = function () {
    return this.type === 'multiple choice';
};
// Check if question is a multiple select question
QuestionSchema.methods.isMultipleSelect = function () {
    return this.type === 'multiple select';
};
// Check if question is a short answer question
QuestionSchema.methods.isShortAnswer = function () {
    return this.type === 'short answer';
};
// Check if question is a code tracing question
QuestionSchema.methods.isCodeTracing = function () {
    return this.type === 'code tracing';
};
// Check if question has file with given ID
QuestionSchema.methods.hasFile = function (id) {
    return this.files.indexOf(id) > -1;
};
// Check if given choice is one of the answers
QuestionSchema.methods.isAnswer = function (choice) {
    return this.answers.indexOf(choice) > -1;
};
// Set question
QuestionSchema.methods.store = function (obj) {
    this.number = _.trim(obj.number);
    this.type = obj.type;
    this.question = _.trim(obj.question);
    this.code = _.trim(obj.code);
    this.choices = []; 
    this.answers = [];
    // multimedia options
    this.files = obj.files || [];
    this.links = [];
    // additional options
    this.caseSensitive = obj.caseSensitive;
    this.shuffleChoices = obj.shuffleChoices;
    this.useLaTeX = obj.useLaTeX;
    this.points = obj.points;
    this.firstTryBonus = obj.firstTryBonus;
    this.maxPointsPerLine = obj.maxPointsPerLine
    this.maxAttemptsPerLine = obj.maxAttemptsPerLine;
    this.penalty = obj.penalty;

    let selected, self = this;

    _.each(obj.links, link => {
        link = _.trim(link);
        if (link) {
            if (!url.parse(link).protocol)
                link = 'http://' + link;
            if (self.links.indexOf(link) === -1)
                self.links.push(link);
        }
    });

    // type-specific options
    if (this.isMultipleChoice()) {
        _.forOwn(obj.choices, (choice, i) => {
            choice = _.trim(choice);
            if (choice && self.choices.indexOf(choice) === -1) {
                self.choices.push(choice);
                // mark as the answer if selected
                if (i === obj.answer)
                    self.answers = [choice];
            }
        });
    } else if (this.isMultipleSelect()) {
        selected = _.isObject(obj.answers) ? obj.answers : [];
        _.forOwn(obj.choices, (choice, i) => {
            choice = _.trim(choice);
            if (choice && self.choices.indexOf(choice) === -1) {
                self.choices.push(choice);
                // mark as one of answers if selected
                if (selected.indexOf(i) > -1)
                    self.answers.push(choice);
            }
        });
    } else if (this.isShortAnswer()) {
        _.forOwn(obj.answers, answer => {
            answer = _.trim(answer);
            if (answer && self.answers.indexOf(answer) === -1) {
                self.answers.push(answer);
            }
        });
        
    } else if (this.isCodeTracing()) {
        self.answers = obj.answers.split("\n");
    }
    return self;
};

module.exports = mongoose.model('Question', QuestionSchema);