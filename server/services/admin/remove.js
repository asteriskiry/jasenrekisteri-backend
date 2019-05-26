const Member = require('../../models/Member');

const utils = require('../../utils');
const httpResponses = require('./');

// Remove member

function remove(request, response) {
    const accessTo = request.body.access.toLowerCase();

    if (accessTo === 'admin' || accessTo === 'board') {
        utils.checkUserControl(request.body.id).then(admin => {
            Member.remove({ _id: request.body.memberID }, function(err) {
                if (err) response.json(err);
                response.json({ success: true, message: 'Jäsen poistettu.' });
            });
        });
    } else {
        return response.json(httpResponses.clientAdminFailed);
    }
}

module.exports = {
    remove: remove,
};
