const Member = require('../../models/Member');
const httpResponses = require('./');

function forgotPassword(request, response) {
    const { password, email } = request.body;

    if (!password && !email) {
        return response.json(httpResponses.onUserPassEmpty);
    }

    if (!password) {
        return response.json(httpResponses.onPassEmpty);
    }

    if (!email) {
        return response.json(httpResponses.onUsernameEmpty);
    }

    Member.findOne({ email: email })
        .lean()
        .exec((error, doc) => {
            if (error) return response.json({success: false, message: error});
            Member.updateOne({ email: email }, { password: password }, (err, emp) => {
                if (err) return response.json(err);
                return response.json(httpResponses.onPasswordUpdateSuccess);
            });
        });
}

module.exports = {
    forgotPassword: forgotPassword
};
