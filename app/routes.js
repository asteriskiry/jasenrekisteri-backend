// All the routes

module.exports = function(app, passport) {

    // Home page / Login

    app.get('/', function(req, res) {
        res.render('index.ejs', { message: req.flash('loginMessage') });
    });

    // process the login form
    // app.post('/login', do all our passport stuff here);

    // Join

    app.get('/signup', function(req, res) {
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/profile',
        failureRedirect: '/signup',
        failureFlash: true
    }));

    // Profile

    app.get('/profile', isLoggedIn, function(req, res) {
        res.render('profile.ejs', {
            user: req.user,
        });
    });

    // Logout

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
};

function isLoggedIn(req, res, next) {

    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}
