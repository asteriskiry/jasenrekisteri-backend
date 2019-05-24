'use strict';

const Member = require('../../models/Member');
const httpResponses = require('./');
const moment = require('moment');

function registerUser(request, response) {
    let {
        firstName,
        lastName,
        utuAccount,
        email,
        hometown,
        tyyMember,
        tiviaMember,
        membershipDuration,
        password,
        passwordAgain,
    } = request.body;

    if (
        !firstName ||
        !lastName ||
        !utuAccount ||
        !email ||
        !hometown ||
        !membershipDuration ||
        !password ||
        !passwordAgain
    ) {
        response.json(httpResponses.onValidationError);
    } else if (password !== passwordAgain) {
        response.json(httpResponses.onNotSamePasswordError);
    } else {
        let membershipEnds;
        membershipDuration = Number(membershipDuration);
        if (membershipDuration === 1) {
            membershipEnds = moment(new Date()).add(1, 'y');
        } else if (membershipDuration === 5) {
            membershipEnds = moment(new Date()).add(5, 'y');
        } else {
            response.json(httpResponses.onValidationError);
        }
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
        newMember.membershipEnds = membershipEnds;
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
