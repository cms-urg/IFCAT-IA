var async = require('async'),
    fs = require('fs-extra'),
    mongoose = require('mongoose'),
    path = require('path');

var config = require('../lib/config'),
    models = require('../models');

// Retrieve file
exports.getFile = function (req, res, next, file) {
    models.File.findById(file, function (err, file) {
        if (err)
            return next(err);
        if (!file)
            return next(new Error('No file is found.'));
        req.fil3 = file; // careful: req.file is used by multer
        next();
    });
};
// Retrieve all files in the course
exports.getFileList = function (req, res) {
    req.course.withFiles().execPopulate().then(function () {
        res.render('admin/course-files', { 
            title: 'Files',
            course: req.course
        });
    });
};
// Add new files
exports.addFiles = function (req, res) {
    async.eachSeries(req.files, function (obj, done) {
        var file = new models.File();
        file.store(obj, function (err) {
            if (err)
                return done(err);
            req.course.update({ $push: { files: file._id }}, done);
        });
    }, function (err) {
        if (err)
            req.flash('error', 'An error occurred while trying to perform operation.');
        else
            req.flash('success', 'The files have been added.');
        res.redirect(req.originalUrl);
    });
};
// Delete specific files from course
exports.deleteFiles = function (req, res) {
    var dir = config.uploadPath + '/' + req.course.id;
    async.each(req.body.files, function (id, done) {
        async.waterfall([
            function find(done) {
                models.File.findById(id, function (err, file) {
                    if (err)
                        return done(err);
                    if (!file)
                        return done(new Error('no file'));
                    done(null, file);
                });
            },
            function del(file, done) {
                file.remove(function (err) {
                    if (err)
                        return done(err);
                    done(null, file);
                });
            },
            function unlink(file, done) {
                var filename = path.resolve(dir + '/' + file.name);
                fs.stat(filename, function (err, stats) {
                    if (err && err.code === 'ENOENT')
                        return done();
                    else if (err)
                        return done(err);
                    else if (stats.isFile())
                        fs.remove(filename, done);
                    else
                        return done();
                });
            }
        ], done);
    }, function (err) {
        if (err) 
            req.flash('error', 'An error occurred while trying to perform operation.');
        else
            req.flash('success', 'The files have been deleted.');
        res.sendStatus(200);
    });
};

// Retrieve a file by Id
exports.getFileLinkById = function (req,res){
    models.Course.findOne({ files : req.params.id }).exec()
    .then(function(course){
        models.File.findById(req.params.id).exec()
        .then(function(file){
            var fileUrl = '/upl/' + course._id + '/' + file.name;
            res.redirect(fileUrl);
        });      
    });
};