const Member = require('../models/Member');

// Access control utils

function checkUserControl(id) {
    return new Promise((resolve, reject) => {
        Member.findOne({ _id: id }, (error, doc) => {
            if (error) reject(error);
            let role = doc.role.toLowerCase();
            if (
                role === 'admin' ||
                role === 'board'
            )
                resolve(true);
            reject({
                success: false,
                message: 'Tämä alue on vain hallituslaisille.',
            });
        });
    });
}

function checkAdminControl(id) {
    return new Promise((resolve, reject) => {
        Member.findOne({ _id: id }, (error, doc) => {
            if (error) reject(error);
            let role = doc.role.toLowerCase();
            if (
                role === 'admin'
            )
                resolve(true);
            reject({
                success: false,
                message: 'Tämä alue on vain ylläpitäjille.',
            });
        });
    });
}

function getUser(id) {
    return new Promise((resolve, reject) => {
        Member.findOne({ _id: id }, (error, user) => {
            if (error) reject(error);
            resolve(user.firstName);
        });
    });
}

module.exports = {
    checkUserControl: checkUserControl,
    checkAdminControl: checkAdminControl,
    getUser: getUser,
};
