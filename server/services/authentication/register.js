'use strict';

const Member = require('../../models/Member');

const httpResponses = {
    onValidationError: {
        success: false,
        message: 'Kaikki kentät ovat pakollisia.'
    },
    onPasswordError: {
        success: false,
        message: 'Salasanat eivät ole samoja.'
    },
    onUserSaveError: {
        success: false,
        message: 'Sähköpostiosoite on jo käytössä.'
    },
    onNotSamePasswordError: {
        success: false,
        message: 'Salasanat eivät täsmää.'
    },
    onUserSaveSuccess: {
        success: true,
        message: 'Käyttäjätunnus luotu onnistuneesti.'
    }
};

// Register new users
function registerUser(request, response) {
    let { firstName, lastName, utuAccount, email, hometown, tyyMember, tiviaMember, password, passwordAgain } = request.body;

    if (!firstName || !lastName || !utuAccount || !email || !hometown || !password || !passwordAgain) {
        response.json(httpResponses.onValidationError);
    } else if (password !== passwordAgain) {
        response.json(httpResponses.onNotSamePasswordError);
    } else {

        let newUser = new Member();
        newUser.firstName = firstName;
        newUser.lastName = lastName;
        newUser.utuAccount = utuAccount;
        newUser.email = email;
        newUser.hometown = hometown;
        newUser.tyyMember = !!tyyMember;
        newUser.tiviaMember = !!tiviaMember;
        newUser.accessRights = false;
        newUser.role = 'Member';
        newUser.accountCreated = new Date();
        newUser.password = password;

        newUser.save(error => {
            if (error) {
                return response.json(httpResponses.onUserSaveError);
            }
            response.json(httpResponses.onUserSaveSuccess);
        });
    }
}

module.exports = {
    registerUser: registerUser
};
