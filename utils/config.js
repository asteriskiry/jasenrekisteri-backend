require('dotenv').config();

const mongoUrl = process.env.MONGOURL || 'mongodb://127.0.0.1/jasenrekisteri';
let port = process.env.PORT || 3001;
let secret = process.env.SECRET;
let adminSecret = process.env.ADMINSECRET;

module.exports = {
  mongoUrl,
  port,
  secret,
  adminSecret,
};
