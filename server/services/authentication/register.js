'use strict';

const TempMember = require('../../models/TempMember');
const Member = require('../../models/Member');
const httpResponses = require('./');
const formatters = require('../../utils/formatters');
const validator = require('validator');

// Here we only make temporary member record. We create real one when the payment is made.

function registerUser(request, response) {
    let { firstName, lastName, utuAccount, email, hometown, tyyMember } = request.body;

    // Validations

    if (!firstName || !lastName || !email || !hometown) {
        response.json(httpResponses.onEmptyError);
    } else if (
        !validator.matches(request.body.firstName, /[a-zA-Z\u00c0-\u017e- ]{2,20}$/g) ||
        !validator.matches(request.body.lastName, /[a-zA-Z\u00c0-\u017e- ]{2,25}$/g) ||
        !validator.isEmail(request.body.email) ||
        !validator.matches(request.body.hometown, /[a-zA-Z\u00c0-\u017e- ]{2,25}$/g) ||
        !typeof request.body.tyyMember === 'boolean'
    ) {
        response.json(httpResponses.onValidationError);
    } else {
        // Check that email is unique

        Member.findOne({ email: email }).exec(function(err, member) {
            if (err) response.json(httpResponses.onError);
            if (member) {
                response.json(httpResponses.onUserSaveError);
            } else {
                // New temp member record

                let newTempMember = new TempMember();
                newTempMember.firstName = formatters.capitalizeFirstLetter(firstName);
                newTempMember.lastName = formatters.capitalizeFirstLetter(lastName);
                newTempMember.utuAccount = utuAccount ? utuAccount.toLowerCase() : '';
                newTempMember.email = email.toLowerCase();
                newTempMember.hometown = formatters.capitalizeFirstLetter(hometown);
                newTempMember.tyyMember = !!tyyMember;
                newTempMember.tiviaMember = false;

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
        });
    }
}

module.exports = {
    registerUser: registerUser,
};
