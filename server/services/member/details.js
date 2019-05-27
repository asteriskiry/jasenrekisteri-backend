const Member = require('../../models/Member');
const utils = require('../../utils');
const httpResponses = require('./');

// Get member details

function fetchDetails(request, response) {
    const memberID = request.query.memberID;

    Member.findOne({ _id: memberID }, (error, doc) => {
        if (error) response.json(error);

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
            }

            if (request.body.password !== request.body.passwordAgain) {
                return response.json(httpResponses.onPasswordNotMatch);
            }

            let record = {
                firstName: request.body.firstName,
                lastName: request.body.lastName,
                utuAccount: request.body.utuAccount,
                email: request.body.email,
                hometown: request.body.hometown,
                tyyMember: request.body.tyyMember,
                tiviaMember: request.body.tiviaMember,
                password: request.body.password,
            };

            if (
                request.body.password === '' ||
                request.body.password === null
            ) {
                delete record.password;
            } else if (request.body.password.length < 6) {
                return response.json(httpResponses.onTooShortPassword);
            }

            // Update member details

            Member.findOneAndUpdate(
                query,
                record,
                { new: true },
                (error, doc) => {
                    if (error) return response.json(httpResponses.onMustBeUnique);
                    return response.json(httpResponses.onUpdateSuccess);
                }
            );
        })
        .catch(error => {
            return response.json(error);
        });
}

module.exports = {
    fetchDetails: fetchDetails,
    updateDetails: updateDetails,
};
