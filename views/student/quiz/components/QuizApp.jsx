import CodeOutputQuestion from './CodeOutputQuestion.jsx'
import Question from './Question.jsx'
import PreQuiz from './PreQuiz.jsx'
import PostQuiz from './PostQuiz.jsx'
import GroupBuilder from './GroupBuilder.jsx'
import GroupSelect from './GroupSelect.jsx'
import ScoreBar from './ScoreBar.jsx'
import EmptyLine from './EmptyLine.jsx'

import enums from '../enums'

import React from 'react'

export default class QuizApp extends React.Component {
    constructor(props) {
        super(props);

        this.setDriverCb = this.setDriverCb.bind(this);
        this.awardPointCb = this.awardPointCb.bind(this);
        this.submitChoiceCb = this.submitChoiceCb.bind(this);
        this.selectQuestionCb = this.selectQuestionCb.bind(this);
        this.createGroupCb = this.createGroupCb.bind(this);

        this.state = {
            score: 0,
            quiz: {
                allocateMembers: null
            },
            groupId: null,
            groupName: null,
            userId: null,
            isDriver: false,
            hasCreatedGroup: false,
            selectedQuestion: null,
            active: true,
            complete: false,
            inProgress: false,
            responses: {},
            numCorrect: 0

        }
    }

    componentWillMount() {
        var url = window.location.href;
        var quizId = url.slice(url.indexOf('/quizzes/') + 9, url.indexOf('/start'));
        var socket = this.props.io();
        this.socket = socket;

        // Request quiz data
        socket.emit('REQUEST_QUIZ', quizId);

        socket.on('setGroup', (id) => {
            if (id != this.state.groupId)
                window.location.href = window.location.href;
        })

        socket.on('groupsUpdated', (data) => {
            console.log('groupsUpdated');
            console.log(data);
        })

        socket.on('quizData', (tutorialQuiz) => {
            console.log('quizData');
            console.log(tutorialQuiz);
            this.setState({
                quiz: tutorialQuiz.quiz,
                groupId: tutorialQuiz.groupId || this.state.groupId,
                userId: tutorialQuiz.userId || this.state.userId,
                groupName: tutorialQuiz.groupName,
                active: tutorialQuiz.quiz.active,
                selectedQuestion: tutorialQuiz.quiz.quiz.questions[0],
            });
        })


        socket.on('resetDriver', (data) => {
            console.log('resetDriver');
            swal('New Driver', 'Your group now has a new driver.', 'info');
            if (this.state.groupId != data.groupId) return;
            this.setState({
                isDriver: false,
                inProgress: true
            });
        });

        socket.on('info', (data) => {
            console.log('info');
            swal('Note', data.message, 'info');
        })

        socket.on('ctGroupAttempt', (data) => {
            if (data.groupId != this.state.groupId) return;
            console.log('ctGroupAttempt');
            console.log(data);
            var question = this.state.quiz.quiz.questions.filter(q => q._id == data.response.question)[0];
            question.output = data.codeOutput;

            if (data.allCodeTracingLinesCorrect) {
                swal("Well done!", "The line(s) entered are correct", "success");

            } else {
                swal("Yikes!", "Looks like you made a mistake somewhere", "error");
            }

            this.setState({
                quiz: this.state.quiz
            });
        })

        socket.on('groupAttempt', (data) => {
            if (this.state.groupId && data.groupId != this.state.groupId) return;
            console.log('groupAttempt');

            var responsesStore = this.state.responses;
            responsesStore[data.response.question] = data.response;
            var question = this.state.quiz.quiz.questions.filter(q => q._id == data.response.question)[0];
            var maxScore = question.firstTryBonus + question.points;
            question.output = data.codeOutput;


            if (data.response.correct) {
                var msg = "Question " + question.number + " was answered correctly!\
                          Received " + data.response.points + " of " + maxScore + " points ";

                swal("Good job!", msg, "success");

                var scoreInc = parseInt(data.response.points, 10);
                var numCorrInc = 1;

                this.setState({
                    score: this.state.score + scoreInc,
                    numCorrect: this.state.numCorrect + numCorrInc
                });

                // All questions completed
                if (this.state.quiz.quiz.questions.length == this.state.numCorrect)
                    socket.emit('QUIZ_COMPLETE', {
                        groupId: this.state.groupId,
                        quizId: this.state.quiz.quiz._id
                    });

            } else {
                swal("Yikes!", "Question " + question.number + " was answered incorrectly!", "error");
            }

            this.setState({
                responses: responsesStore,
                quiz: this.state.quiz
            });
        })

        socket.on('updateScores', (data) => {
            console.log('updateScores');
            
            if (this.state.groupId && data.groupId != this.state.groupId) return;
            console.log(data);

            var responsesStore = this.state.responses;
            let numCorrectInc = 0;
            let newScore = 0;

            data.responses.forEach((response, i) => {
                responsesStore[response.question] = response;
                numCorrectInc += response.correct ? 1 : 0;
                newScore += response.points;
            });

            console.log(responsesStore)

            this.setState({
                numCorrect: this.state.numCorrect + numCorrectInc,
                responses: responsesStore,
                score: newScore
            });
        });

        socket.on('assignedAsDriver', (data) => {
            console.log('assignedAsDriver');
            console.log(data);

            if (!this.state.groupId || data.groupId != this.state.groupId) return;
            // enable choices and submit buttons (disabled by default)
            this.setState({
                isDriver: true,
                inProgress: true
            });

        });

        socket.on('quizActivated', (data) => {
            console.log('postQuiz');
            console.log(data);
            if (data.active) {
                swal('Quiz activated', 'You can pick a driver and start the quiz', 'info');
            } else {
                swal('Quiz de-activated', 'Your answers have been submitted', 'info');
            }
            if (!this.state.groupId || data.groupId != this.state.groupId) return;
            this.setState({
                complete: !data.active,
                active: data.active,
                inProgress: false
            });
        });

        socket.on('SYNC_RESPONSE', (data) => {
            console.log('sync response');
            console.log(data);
            var responses = this.state.responses;
            responses[data.questionId] = data.response;
            this.setState({
                responses: responses
            });
        })




    }

    emit(eventName, data) {
        data.questionId = this.state.selectedQuestion._id || null;
        data.groupId = this.state.groupId;
        console.log(data);
        this.socket.emit(eventName, data);
    }



    selectQuestion(i) {
        this.setState({
            selectedQuestion: i
        });
    }

    getCurrentQuestion() {
        let selectedQuestion = null;
        var _quiz = this.state.quiz;


        if (this.state.selectedQuestion === null) {
            selectedQuestion = _quiz.quiz.questions[0];
        } else {
            selectedQuestion = this.state.selectedQuestion;
        }
        return (
            <Question 
                key= {selectedQuestion._id + "questionObj"}
				isDriver = {this.state.isDriver}
                questionRef = {selectedQuestion}
                response = {this.state.responses[selectedQuestion._id]}
				questionType = {selectedQuestion.type}
				submitCb = {this.submitChoiceCb}
            />
        );
    }

    getScoreBar() {
        return (<ScoreBar 
			questions = {this.state.quiz.quiz.questions}
            responses = {this.state.responses}
			selectQuestionCb = {this.selectQuestionCb}
			selectedQuestion = {this.state.selectedQuestion}
                />)
    }

    getPostQuiz() {
        if (!this.state.complete) {
            return null;
        }
        return (<PostQuiz finalScore = {10}
                    teammates = {[{
                            name: 'Kobe',
                            id: 'KB24'
                        }]
			}
                    awardPointCb = {this.awardPointCb}
                    />);
    }

    getGroupBuilder() {
        if (this.state.quiz.allocateMembers !== enums.allocateMembers.selfSelect) {
            return null;
        }
        return (<GroupBuilder groups = {
                        [{
                            name: 'G1'
                        }, {
                            name: 'G2'
                        }]
                    }
                    createGroupCb = {
                        this.createGroupCb
                    }
                    />);
    }

    render() {
        var scoreIndicator = this.state.inProgress ? <span> Quiz: {this.state.score} </span> : null;
        var preQuiz = this.state.inProgress ? null : <PreQuiz setDriverCb = {this.setDriverCb} groupName = {this.state.groupName} />;
        var scoreBar = this.state.inProgress ? this.getScoreBar() : null;
        var question = this.state.inProgress ? this.getCurrentQuestion() : null;
        var postQuiz = this.state.inProgress ? null : this.getPostQuiz();
        var groupBuilder = this.state.inProgress ? null : this.getGroupBuilder();

        return (<div className="row col-xs-12 col-md-10 col-md-offset-1"> 
                    {preQuiz} 
                    {groupBuilder} 
                    {scoreBar}
                    {question} 
                    {postQuiz}
                </div>);
    }



    setDriverCb(selfIsDriver) {
        if (selfIsDriver) {
            this.socket.emit('NOMINATE_SELF_AS_DRIVER', {
                groupId: this.state.groupId
            });
        } else {
            this.setState({
                inProgress: true,
                isDriver: false
            });
        }
    }

    createGroupCb() {
        alert('creating group');
    }

    awardPointCb(id) {
        alert('Awarded point to ' + id);
    }

    submitChoiceCb(answer, isCodeTracingQuestion) {
        if (isCodeTracingQuestion) {
            this.emit('CODE_TRACING_ANSWER_ATTEMPT', {
                answer: answer
            });
        } else {
            this.emit(enums.eventNames.attemptAnswer, {
                answer: answer
            });
        }
    }

    selectQuestionCb(question) {
        this.setState({
            selectedQuestion: question
        });
    }

}