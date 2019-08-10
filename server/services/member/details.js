const Member = require('../../models/Member');
const utils = require('../../utils');
const httpResponses = require('./');
const formatters = require('../../utils/formatters');
const validator = require('validator');

// Get member details

function fetchDetails(request, response) {
    const memberID = request.query.memberID;

    Member.findOne({ _id: memberID }, (error, doc) => {
        if (error) response.json(error);

        if (!doc) return response.json({ memberNotFound: true });
        const member = doc.toObject();

        delete member.password;

        response.json(member);
    });
}

// Update member details

function updateDetails(request, response) {
    utils
        .getUser(request.body.id)
        .then(user => {
            let query = {
                _id: request.body.id,
            };

            // Validations

            if (
                !request.body.firstName ||
                !request.body.lastName ||
                !request.body.utuAccount ||
                !request.body.email ||
                !request.body.hometown
            ) {
                return response.json(httpResponses.onFieldEmpty);
            } else if (
                !validator.matches(request.body.firstName, /[a-zA-Z\u00c0-\u017e-]{2,20}$/g) ||
                !validator.matches(request.body.lastName, /[a-zA-Z\u00c0-\u017e-]{2,25}$/g) ||
                !validator.matches(request.body.utuAccount, /[a-öA-Ö]{4,8}$/g) ||
                !validator.isEmail(request.body.email) ||
                !validator.matches(request.body.hometown, /[a-zA-Z\u00c0-\u017e-]{2,25}$/g) ||
                !typeof request.body.tyyMember === 'boolean' ||
                !typeof request.body.tiviaMember === 'boolean'
            ) {
                return response.json(httpResponses.onValidationError);
            }

            if (request.body.password !== request.body.passwordAgain) {
                return response.json(httpResponses.onPasswordNotMatch);
            }

            let record = {
                firstName: formatters.capitalizeFirstLetter(request.body.firstName),
                lastName: formatters.capitalizeFirstLetter(request.body.lastName),
                utuAccount: request.body.utuAccount.toLowerCase(),
                email: request.body.email.toLowerCase(),
                hometown: formatters.capitalizeFirstLetter(request.body.hometown),
                tyyMember: request.body.tyyMember,
                tiviaMember: request.body.tiviaMember,
                password: request.body.password,
            };

            if (request.body.password === '' || request.body.password === null) {
                delete record.password;
            } else if (request.body.password.length < 6) {
                return response.json(httpResponses.onTooShortPassword);
            }

            // Update member details

            Member.findOneAndUpdate(query, record, { new: true }, (error, doc) => {
                if (error) return response.json(httpResponses.onMustBeUnique);
                return response.json(httpResponses.onUpdateSuccess);
            });
        })
        .catch(error => {
            return response.json(error);
        });
}

module.exports = {
    fetchDetails: fetchDetails,
    updateDetails: updateDetails,
};
