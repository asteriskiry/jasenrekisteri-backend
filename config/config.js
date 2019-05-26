'use strict';

require('dotenv').config();

const mongoUrl = process.env.MONGOURL || 'mongodb://127.0.0.1/jasenrekisteri';
const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 3001;
const secret = process.env.SECRET;
const viewDir = process.env.VIEWDIR || './app/views';
const env = process.env.NODE_ENV || 'local';
const clientUrl = process.env.CLIENTURL || 'http://localhost:3000';
const CSVFilePath = process.env.CSVFILEPATH || '/tmp/kulkuoikeudet_asteriski.csv';
// Gmail stuff for testing purposes only
const gmailUser = process.env.GMAILUSER;
const gmailPassword = process.env.GMAILPASSWORD;

module.exports = {
    mongoUrl,
    host,
    port,
    secret,
    viewDir,
    env,
    clientUrl,
    CSVFilePath,
    gmailUser,
    gmailPassword,
};
