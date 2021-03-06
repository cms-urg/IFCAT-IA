/*------------------------------------
Remote I.A. model that represents an user.

Author(s): Jun Zheng [me at jackzh dot com]
           Neeilan Selvalingam
-------------------------------------*/

// I.A. configuration
const config = require('../Utils/config').ia;

// Service providers
const getIAServiceProvider = () => require('../Providers/IAServiceProvider');

// Constants
const ADMIN_GROUP      = "admin";
const INSTRUCTOR_GROUP = "instructor";
const TA_SUFFIX        = "\.ta";

/**
 * Class describes a remote I.A. user
 */
class RemoteUser {
    /**
     * Construct a new user from the API response
     * @param user
     */
    constructor(user) {
        this.user = user;
    }

    /**
     * Create list
     * @param users
     * @returns {Array}
     */
    static createList(users) {
        let result = [];
        users.forEach(user => {
            result.push(new RemoteUser(user));
        });
        return result;
    }

    /**
     * Get user ID
     * @returns {*}
     */
    getId() {
        return this.user._id;
    }

    /**
     * Get username, username is NOT UNIQUE
     * @returns {string | *}
     */
    getUsername() {
        return this.user.username;
    }

    /**
     * Return if a user is an admin
     * @returns {boolean}
     */
    isAdmin() {
        return this.user.groups.indexOf(ADMIN_GROUP) > -1;
    }

    /**
     * Return if a user is an instructor
     * @returns {boolean}
     */
    isInstructor() {
        return this.user.groups.indexOf(INSTRUCTOR_GROUP) > -1;
    }

    /**
     * Return if a user is a TA
     * @returns {boolean}
     */
    isTA() {
        for(let group of this.user.groups) {
            if(group.match(`.*${TA_SUFFIX}`)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if this user is a TA for a specific course.
     * @param course
     * @returns {boolean}
     */
    isTAForCourse(course) {
        for(let group of this.user.groups) {
            if(group === course.getName() + TA_SUFFIX) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if this user is a TA for a specific tutorial.
     * @param tutorial
     * @returns {boolean}
     */
    isTAForTutorial(tutorial) {
        for(let group of this.user.groups) {
            if(group === tutorial.getName() + TA_SUFFIX) {
                return true;
            }
        }
        return false;
    }

    /**
     * Return if a user can access the admin panel
     * @returns {boolean}
     */
    canAccessAdminPanel() {
        return this.isAdmin() || this.isInstructor() || this.isTA();
    }

    /**
     * Get all courses enrolled by this user
     * @returns {Promise<any>}
     */
    getCourses() {
        return new Promise((resolve, reject) => {
            getIAServiceProvider()
                .runGetRequest(`${config.root}/api/users/${this.user._id}/courses`)
                .then(data => {
                    resolve(require('./Course').createList(data));
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    /**
     * Get one course by ID
     * @param id
     * @returns {Promise<any>}
     */
    getCourse(id) {
        return new Promise((resolve, reject) => {
            this.getCourses()
                .then(courses => {
                    let result = null;
                    // Loop through and try to get one matching course
                    courses.some(course => {
                        if (course.getId() === id) {
                            result = course;
                            return true;
                        }
                    });
                    resolve(result);
                })
                .catch(e => reject(e));
        })
    }

    /**
     * Convert user to JSON
     * @returns {*}
     */
    toJSON() {
        return this.user;
    }
}

module.exports = RemoteUser;
