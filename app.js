// jshint esversion: 6
// jshint node: true
"use strict";

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var validator = require('express-validator');
var flash = require('express-flash');
var session = require('express-session');
var passport = require('passport');


var config = require('./config/database');

// set up default mongoose connection
mongoose.connect(config.database, {
  useNewUrlParser: true,
  useCreateIndex: true
});
// get the default connection
var db = mongoose.connection;
// check database connection
db.once('open', function(){
  console.log('Connected to MongoDB - itemdb');
});
//check for database errors
db.on('error', function(err){
  console.log(err);
});



var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// set public folder
app.use('/', express.static(__dirname + '/public'));

// make packages available for client using statics
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist'));
app.use('/popper', express.static(__dirname + '/node_modules/popper.js/dist'));
app.use('/open-iconic', express.static(__dirname + '/node_modules/open-iconic/font'));
app.use("/leaflet", express.static(__dirname + "/node_modules/leaflet/dist"));
app.use("/leaflet-routing-machine", express.static(__dirname + "/node_modules/leaflet-routing-machine/dist"));
app.use("/leaflet-control-geocoder", express.static(__dirname + "/node_modules/leaflet-control-geocoder/dist"));
app.use('/turf', express.static(__dirname + '/node_modules/@turf/turf'));

// body parser middleware
// parse application/x-www-form-urlencoded
/*
* sets the limit to 2MB:
* now it is possible to load routes, that are very long without any error
* (my tested maximum was 11359.36 km)
*/
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
// parse application/json
app.use(express.json());

// Express Validator Middleware
// @see https://github.com/VojtaStavik/GetBack2Work-Node/blob/master/node_modules/express-validator/README.md
app.use(validator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.'),
          root    = namespace.shift(),
          formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

app.use(cookieParser());
app.use(logger('dev'));

const token = require('./config/token'); // Express Session Middleware
// @see https://github.com/expressjs/session
app.use(session({
  secret: token.secretSession, // TODO:
  resave: true,
  saveUninitialized: true
}));

// Express Messages Middleware
// @see https://gist.github.com/brianmacarthur/a4e3e0093d368aa8e423#file-flash-app-js-L44
app.use(flash());
app.use(function (req, res, next) {
  res.locals.sessionFlash = req.session.sessionFlash;
  delete req.session.sessionFlash;
  next();
});

// Passport Config
require('./config/passport')(passport);
// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('*', function(req, res, next){
  res.locals.user = req.user || null;
  console.log('user', res.locals.user);
  next();
});

// route files
let indexRouter = require('./routes/index');
app.use('/', indexRouter);
let usersRouter = require('./routes/users');
app.use('/user', usersRouter);
let impressumRouter = require('./routes/impressum');
app.use('/impressum', impressumRouter);
let routesRouter = require('./routes/routes');
app.use('/route', routesRouter);
let apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

// normally has to start in ./bin/www
// at the moment it does not work ...
// start server
var port = 3000;
var server = app.listen(port, () => console.log("App listening on port " + port + "! (http://localhost:" + port + "/)"));
