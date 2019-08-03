'use strict';

const TempMember = require('../../models/TempMember');
const httpResponses = require('./');

// Here we only make temporary member record. We create real one when the payment is made.

function registerUser(request, response) {
    let {
        firstName,
        lastName,
        utuAccount,
        email,
        hometown,
        tyyMember,
        tiviaMember,
    } = request.body;

    // Validations

    if (!firstName || !lastName || !utuAccount || !email || !hometown) {
        response.json(httpResponses.onValidationError);
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
