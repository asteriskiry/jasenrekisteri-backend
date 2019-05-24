'use strict';

const Member = require('../../models/Member');
const httpResponses = require('./');

function registerUser(request, response) {
    let {
        firstName,
        lastName,
        utuAccount,
        email,
        hometown,
        tyyMember,
        tiviaMember,
        password,
        passwordAgain,
    } = request.body;

    if (
        !firstName ||
        !lastName ||
        !utuAccount ||
        !email ||
        !hometown ||
        !password ||
        !passwordAgain
    ) {
        response.json(httpResponses.onValidationError);
    } else if (password !== passwordAgain) {
        response.json(httpResponses.onNotSamePasswordError);
    } else {
        let newMember = new Member();
        newMember.firstName = firstName;
        newMember.lastName = lastName;
        newMember.utuAccount = utuAccount;
        newMember.email = email;
        newMember.hometown = hometown;
        newMember.tyyMember = !!tyyMember;
        newMember.tiviaMember = !!tiviaMember;
        newMember.accessRights = false;
        newMember.role = 'Member';
        newMember.membershipStarts = new Date();
        newMember.accountCreated = new Date();
        newMember.accepted = false;
        newMember.password = password;

        newMember.save(error => {
            if (error) {
                return response.json(httpResponses.onUserSaveError);
            }
            response.json(httpResponses.onUserSaveSuccess);
        });
    }
}

module.exports = {
    registerUser: registerUser,
};
