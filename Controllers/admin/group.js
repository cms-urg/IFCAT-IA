const _            = require('../../Utils/lodash.mixin');
const async        = require('async');
const models       = require('../../Models');
const asyncForEach = require('../../Utils/asyncForEach');
const getAbsUrl    = require('../../Utils/getAbsUrl');

// Retrieve group
exports.getGroupByParam = (req, res, next, id) => {
    models.Group.findById(id, (err, group) => {
        if (err)
            return next(err);
        if (!group)
            return next(new Error('No group is found.'));
        req.group = group;
        next();
    });
};

/**
 * Temp generate groups (shuffle)
 * @param req
 * @param res
 * @param next
 * @returns {Promise<void>}
 */
exports.generateGroups = async (req, res, next) => {

    try {
        // Populate fields
        await req.tutorialQuiz.fillTutorialFromRemote();
        await req.tutorialQuiz.tutorial.fillStudentsFromRemote();
        await req.tutorialQuiz.populate('quiz').execPopulate();

        // shuffle students
        let students = _.shuffle(_.map(req.tutorialQuiz.tutorial.students, student => student.getId()));
        // split into chunks of size + shuffle chunks
        let chunks   = _.chunk(students, req.tutorialQuiz.maxMembersPerGroup);
        // map chunks to groups
        let groups   = _.map(chunks, (members, i) => new models.Group({name: i + 1, members}));
        // add warning
        req.flash('warning', 'Below is an <b><u>unsaved</u></b> list of new groups.');
        res.locals.flash = req.flash();

        res.render('admin/pages/tutorial-quiz', {
            bodyClass: 'tutorial-quiz-page',
            title: `Conduct ${req.tutorialQuiz.quiz.name} in Tutorial ${req.tutorialQuiz.tutorial.number}`,
            course: req.course,
            tutorialQuiz: req.tutorialQuiz,
            tutorial: req.tutorialQuiz.tutorial,
            quiz: req.tutorialQuiz.quiz,
            students: req.tutorialQuiz.tutorial.students,
            groups: groups
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Save tutorial quiz group settings
 * @param req
 * @param res
 * @param next
 * @returns {Promise<void>}
 */
exports.saveGroups = async (req, res, next) => {
    try {
        let dict = _.transpose(req.body['+users'] || {}); // {groupId: [userIds...]}

        // Populate fields
        await req.tutorialQuiz.fillTutorialFromRemote();
        await req.tutorialQuiz.tutorial.fillStudentsFromRemote();
        await req.tutorialQuiz.populate('quiz groups').execPopulate();

        await asyncForEach(req.tutorialQuiz.groups, async (group) => {
            let members          = group.members.map(String);
            let tutorialStudents = req.tutorialQuiz.tutorial.getStudents().map(student => student.getId());
            // Make sure all students are actually in the tutorial
            members              = _.intersection(members, tutorialStudents);
            // Remove all users
            members              = _.difference(members, req.body.users);
            // Add all users
            members              = _.union(members, dict[group._id]);
            // Mark group as done updating
            delete dict[group._id.toString()];
            // Depends on if a group has member, remove or update
            if (members.length) {
                await group.update({members: members});
            } else {
                await group.remove();
                await req.tutorialQuiz.update({$pull: {groups: group._id}});
            }
        });

        // New groups
        await asyncForEach(dict, async (members, name) => {
            let group = await models.Group.create({name, members});
            await req.tutorialQuiz.update({$push: {groups: group._id}});
        });

        req.flash('success', '<b>%s</b> groups have been updated for <b>TUT %s</b>.', req.tutorialQuiz.quiz.name, req.tutorialQuiz.tutorial.getDisplayName());
        res.redirect(getAbsUrl(`/admin/courses/${req.course.getId()}/tutorials-quizzes/${req.tutorialQuiz._id}`));
    } catch (e) {
        next(e);
    }
};