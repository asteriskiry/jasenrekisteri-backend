'use strict';

const jwt = require('jsonwebtoken');
const config = require('../../../config/config');

const Member = require('../../models/Member');

const httpResponse = {
    onUserNotFound: {
        success: false,
        message: 'Käyttäjää ei löydy.'
    },
    onAuthenticationFail: {
        success: false,
        message: 'Väärä salasana.'
    }
};

let http, userPassword;

function loginUser(request, response) {
    let { email, password } = request.body;
    console.log(email, password);

    Member.findOne({
        email: email
    }, function(error, user) {
        if (error) return response.json(error);
        if (!user) return response.json(httpResponse.onUserNotFound);
        userPassword = password;
        http = response;
        comparePassword(user);
    });
};

function comparePassword(user) {
    let responseToken;

    user.comparePassword(userPassword, function(error, isMatch) {
        if (error) return http.json(error);
        if (isMatch && !error) {
            var token = jwt.sign(user.toJSON(), config.secret, {
                expiresIn: '1h'
            });

            if (user != null) {
                responseToken = { success: true, role: user.role, id: user._id, token: 'JWT ' + token };
            }

            return http.json(responseToken);
        }

        return http.json(httpResponse.onAuthenticationFail);
    });
}

module.exports = {
    loginUser: loginUser
};
