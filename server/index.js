'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const cors = require('cors');

module.exports = function() {
    let server = express();
    let create;
    let start;

    create = function(config) {
        let routes = require('./routes');

        server.set('env', config.env);
        server.set('port', config.port);
        server.set('hostname', config.host);

        server.use(cors());
        server.use(bodyParser.json());
        server.use(bodyParser.urlencoded({ extended: false }));
        server.use(cookieParser());
        server.use(logger('dev'));
        server.use(passport.initialize());
        mongoose.connect(config.mongoUrl, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useFindAndModify: false,
        });
        require('../config/passport')(passport);

        if (config.env === 'production') {
            server.use(express.static(config.staticFiles));
        }

        // Ugly fix
        server.disable('etag');

        routes.init(server);
    };

    start = function() {
        let hostname = server.get('hostname');
        let port = server.get('port');

        server.listen(port, function() {
            console.log(
                'Jäsenrekisteri backend listening on http://' +
                    hostname +
                    ':' +
                    port
            );
        });
    };

    return {
        create: create,
        start: start,
    };
};
