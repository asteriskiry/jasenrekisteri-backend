let JwtStrategy = require('passport-jwt').Strategy;
let ExtractJwt = require('passport-jwt').ExtractJwt;
let Member = require('../server/models/Member');
let config = require('./config');

function setPassortConfigs(passport) {
    let opts = {};

    opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
    opts.secretOrKey = config.secret;
    passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
        Member.findOne({ id: jwt_payload.id }, (err, user) => {
            if (err) {
                return done(err, false);
            }

            if (user) {
                done(null, user);
            } else {
                done(null, false);
            }
        });
    }));
};

module.exports = setPassortConfigs;
