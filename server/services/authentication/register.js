'use strict';

const TempMember = require('../../models/TempMember');
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

    // Validations

    if (!firstName || !lastName || !utuAccount || !email || !hometown || !password || !passwordAgain) {
        response.json(httpResponses.onValidationError);
    } else if (password !== passwordAgain) {
        response.json(httpResponses.onNotSamePasswordError);
    } else if (password.length < 6) {
        response.json(httpResponses.onTooShortPassword);
    } else {
        // New member record

        let newTempMember = new TempMember();
        newTempMember.firstName = firstName;
        newTempMember.lastName = lastName;
        newTempMember.utuAccount = utuAccount;
        newTempMember.email = email;
        newTempMember.hometown = hometown;
        newTempMember.tyyMember = !!tyyMember;
        newTempMember.tiviaMember = !!tiviaMember;
        newTempMember.password = password;

        // Save new member

        newTempMember.save(error => {
            if (error) {
                return response.json(httpResponses.onUserSaveError);
            }

            response.json({
                success: true,
                message: 'Käyttäjätunnus luotu onnistuneesti.',
                memberId: newTempMember._id,
            });
        });
    }
}

module.exports = {
    registerUser: registerUser,
};
