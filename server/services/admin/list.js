const Member = require('../../models/Member.js');

const utils = require('../../utils');
const httpResponses = require('./');

// Member list

function list(request, response) {
    const accessTo = request.query.access.toLowerCase();

    if (accessTo === 'admin' || accessTo === 'board') {
        utils
            .checkUserControl(request.query.id)
            .then(user => {
                Member.find({}, null).exec((error, docs) => {
                    if (error) return response.json(error);
                    if (!docs) return response.json({ memberNotFound: true });

                    let updatedDocument = docs.map(doc => {
                        let documentToObject = doc.toObject();

                        delete documentToObject.password;

                        return documentToObject;
                    });

                    return response.json(updatedDocument);
                });
            })
            .catch(error => {
                console.log(error);
                return response.json(httpResponses.onServerAdminFail);
            });
    } else {
        return response.json(httpResponses.clientAdminFailed);
    }
}

module.exports = {
    list: list,
};
