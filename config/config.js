'use strict';

require('dotenv').config();

const _ = require('lodash');
const mongoUrl = process.env.MONGOURL || 'mongodb://127.0.0.1/jasenrekisteri';
let host = process.env.HOST || 'localhost';
let port = process.env.PORT || 3001;
let secret = process.env.SECRET;
let viewDir = process.env.VIEWDIR || './app/views';
const env = process.env.NODE_ENV || 'local';

module.exports = {
    mongoUrl,
    host,
    port,
    secret,
    viewDir,
    env
};
