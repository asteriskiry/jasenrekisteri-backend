'use strict';

const TempMember = require('../../models/TempMember');
const httpResponses = require('./');
const formatters = require('../../utils/formatters');
const validator = require('validator');

// Here we only make temporary member record. We create real one when the payment is made.

function registerUser(request, response) {
    let { firstName, lastName, utuAccount, email, hometown, tyyMember, tiviaMember } = request.body;

    // Validations

    if (!firstName || !lastName || !utuAccount || !email || !hometown) {
        response.json(httpResponses.onEmptyError);
    } else if (
        !validator.isAlpha(firstName, 'sv-SE') ||
        !validator.isAlpha(lastName, 'sv-SE') ||
        !validator.isAlpha(utuAccount, 'sv-SE') ||
        !validator.isEmail(email) ||
        !validator.isAlpha(hometown, 'sv-SE') ||
        !typeof tyyMember === 'boolean' ||
        !typeof tiviaMember === 'boolean'
    ) {
        response.json(httpResponses.onValidationError);
    } else {
        // New member record

        let newTempMember = new TempMember();
        newTempMember.firstName = formatters.capitalizeFirstLetter(firstName);
        newTempMember.lastName = formatters.capitalizeFirstLetter(lastName);
        newTempMember.utuAccount = utuAccount.toLowerCase();
        newTempMember.email = email.toLowerCase();
        newTempMember.hometown = formatters.capitalizeFirstLetter(hometown);
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
