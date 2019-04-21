// Passport config

var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');

module.exports = function(passport) {

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    // Signup

    passport.use('local-signup', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    function(req, email, password, done) {

        process.nextTick(function() {

            User.findOne({ email: email }, function(err, user) {
                if (err) {
                    return done(err);
                }

                if (user) {
                    return done(null, false, req.flash('signupMessage', 'Sähköpostiosoite on jo käytössä.'));
                } else {

                    var newUser = new User();

                    newUser.firstName = req.body.firstName;
                    newUser.lastName = req.body.lastName;
                    newUser.utuAccount = req.body.utuAccount;
                    newUser.email = email;
                    newUser.hometown = req.body.hometown;
                    newUser.tyyMember = !!req.body.tyyMember;
                    newUser.tiviaMember = !!req.body.tiviaMember;
                    newUser.board = false;
                    newUser.admin = false;
                    newUser.accountCreated = new Date();
                    newUser.password = newUser.generateHash(password);

                    newUser.save(function(err) {
                        if (err)
                            throw err;
                        return done(null, newUser);
                    });
                }
            });
        });
    }));

    // Login

    passport.use('local-login', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    function(req, email, password, done) {

        User.findOne({ email: email }, function(err, user) {
            if (err) {
                return done(err);
            }

            if (!user) {
                return done(null, false, req.flash('loginMessage', 'Tuntematon sähköposti'));
            }

            if (!user.validPassword(password)) {
                return done(null, false, req.flash('loginMessage', 'Väärä salasana'));
            }

            return done(null, user);
        });

    }));

};
