'use strict';

const apiRoute = require('./apis');
const homeRoute = require('./home');

function init(server) {
    server.get('*', function(req, res, next) {
        console.log('Request was made to: ' + req.originalUrl);
        return next();
    });

    server.get('/', function(req, res) {
        res.redirect('/home');
    });

    server.use('/api', apiRoute);
    server.use('/home', homeRoute);
}

module.exports = {
    init: init,
};
