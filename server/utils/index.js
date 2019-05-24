const Member = require('../models/Member');

function checkUserControl(id) {
    return new Promise((resolve, reject) => {
        Member.findOne({ _id: id }, (error, doc) => {
            if (error) reject(error);
            if (
                doc.role === 'Admin' ||
                doc.role === 'admin' ||
                doc.role === 'Board' ||
                doc.role === 'board'
            )
                resolve(true);
            reject({
                success: false,
                message: 'Tämä alue on vain hallituslaisille.',
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
    getUser: getUser,
};
