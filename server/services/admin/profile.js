const Member = require('../../models/Member');

const utils = require('../../utils');
const httpResponses = require('./');

let usernameCheck, passwordCheck, passwordAgainCheck;

function get(request, response) {
    const memberID = request.query.memberID;
    console.log(request.query);

    if (request.query.access.toLowerCase() !== 'admin' | 'board') {
        return response.json(httpResponses.clientAdminFailed);
    }

    utils.checkUserControl(request.query.id)
        .then(admin => {
            Member.findOne({ _id: memberID })
                .lean()
                .exec((error, doc) => {
                    if (error) return response.json(error);
                    delete doc.password;
                    return response.json(doc);
                });
        })
        .catch(error => {
            return response.json(httpResponses.onServerAdminFail);
        });
}

function update(request, response) {
    const adminProfile = {
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        email: request.body.email,
        role: request.body.role,
        password: request.body.password
    };

    usernameCheck = request.body.email;
    passwordCheck = request.body.password;
    passwordAgainCheck = request.body.passwordAgain;

    if (request.body.access.toLowerCase() !== 'admin' | 'board') {
        return response.json(httpResponses.clientAdminFailed);
    }

    if (performUpdateProfileChecks() !== true) {
        return response.json(performUpdateProfileChecks());
    }

    if (request.body.password === '') {
        delete adminProfile.password;
    }

    utils.checkUserControl(request.body.id)
        .then(admin => {
            Member.findOneAndUpdate({ _id: request.body.id }, adminProfile)
                .lean()
                .exec((error, doc) => {
                    if (error) return response.json(error);
                    return response.json(httpResponses.onProfileUpdateSuccess);
                });
        })
        .catch(error => {
            return response.json(httpResponses.onServerAdminFail);
        });
}

function performUpdateProfileChecks() {
    if (passwordCheck === '' && usernameCheck === '') {
        return httpResponses.onProfileUpdatePasswordCheckUserEmpty;
    }

    if (passwordCheck === '') {
        return httpResponses.onProfileUpdatePasswordEmpty;
    }

    if (usernameCheck === '') {
        return httpResponses.onProfileUpdateUsernameEmpty;
    }

    if (passwordCheck !== passwordAgainCheck) {
        return httpResponses.notSamePasswordError;
    }

    return true;
}

module.exports = {
    get: get,
    update: update
};
