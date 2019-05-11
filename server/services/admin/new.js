const Member = require('../../models/Member');

const utils = require('../../utils');
const httpResponses = require('./');

let usernameCheck, passwordCheck, passwordAgainCheck;

function save(request, response) {
    const { firstName, lastName, utuAccount, email, hometown, tyyMember, tiviaMember, role, accessRights, membershipStarts, membershipEnds, password, passwordAgain } = request.body;
    usernameCheck = email;
    passwordCheck = password;
    passwordAgainCheck = passwordAgain;

    if (request.body.admin.access.toLowerCase() !== 'admin' | 'board') {
        return response.json(httpResponses.clientAdminFailed);
    }

    if (password !== passwordAgain) {
        return response.json(httpResponses.notSamePasswordError);
    }

    if (performUpdateProfileChecks() !== true) {
        return response.json(performUpdateProfileChecks());
    }

    utils.checkUserControl(request.body.admin.id)
        .then(user => {

            let newMember = new Member();
            newMember.firstName = firstName;
            newMember.lastName = lastName;
            newMember.utuAccount = utuAccount;
            newMember.email = email;
            newMember.hometown = hometown;
            newMember.tyyMember = !!tyyMember;
            newMember.tiviaMember = !!tiviaMember;
            newMember.role = role;
            newMember.accessRights = accessRights;
            newMember.membershipStarts = membershipStarts;
            newMember.membershipEnds = membershipEnds;
            newMember.accountCreated = new Date();
            newMember.password = password;

            newMember.save(error => {
                if (error) return response.json(error);

                return response.json(httpResponses.memberAddedSuccessfully);
            });
        }).catch(error => {
            return response.json(error);
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
    save: save
};
