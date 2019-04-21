var http = require('http');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cors = require('cors');
var mongoose = require('mongoose');
var flash = require('connect-flash');
var passport = require('passport');

var middleware = require('./utils/middleware');
var config = require('./utils/config');

var app = express();

mongoose.connect(config.mongoUrl, { useNewUrlParser: true });
mongoose.Promise = global.Promise;

// require('./utils/passport')(passport);

app.use(cors());

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

app.use(express.static('build'));
app.use(middleware.logger);

app.use(session({ secret: 'ilovescotchscotchyscotchscotch' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

require('./app/routes.js')(app, passport);

app.use(middleware.error);

const server = http.createServer(app);

server.listen(config.port, () => {
    console.log(`Jäsenrekisteri backend server running on http://localhost:${config.port}`);
});

server.on('close', () => {
    mongoose.connection.close();
});

module.exports = {
    app, server,
};
