const controllers = require('../controllers/student'),
    passport = require('passport'),
    models = require('../models');

let router = require('express').Router(),
    ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();

// query single objects
router.param('course', controllers.Course.getCourseByParam);
router.param('question', controllers.Question.getQuestionByParam);
router.param('tutorialQuiz', controllers.TutorialQuiz.getTutorialQuizByParam);

// non-authenticated routes
router.post('/login', passport.authenticate('local-login', {
    successRedirect: '/student/courses',
    failureRedirect: '/login',
    failureFlash: true
}));

router.post('/uteach-login', passport.authenticate('auth0', {
    successRedirect: '/student/courses',
    failureRedirect: '/login',
    failureFlash: true
}), function(req,res) {
    res.redirect('/student/courses');
});

// check if user is authenticated
router.use((req, res, next) => {
    if (req.isAuthenticated())
        return next();
    res.redirect('/login');
});

// authenticated routes
router.get('/logout', controllers.User.logout);
router.get('/courses', controllers.Student.getCourses);
router.get('/courses/:course/quizzes', controllers.Student.getQuizzes);
router.post('/courses/:course/quizzes/:quiz/questions/:question/votes', controllers.Question.addVote);
router.get('/courses/:course/quizzes/:tutorialQuiz/start', controllers.TutorialQuiz.startQuiz);
router.get('/file/:id', controllers.File.getFileLinkById);

module.exports = router;