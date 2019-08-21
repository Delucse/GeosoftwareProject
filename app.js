// jshint esversion: 8
// jshint node: true
"use strict";

// server uses port 3000
var port = 3000;

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

(async () => {
  // set up default ("Docker") mongoose connection
  await mongoose.connect(config.databaseDocker, {
    useNewUrlParser: true,
    useCreateIndex: true
  }).then(db => {
      console.log('Connected to MongoDB (databasename: "'+db.connections[0].name+'") on host "'+db.connections[0].host+'" and on port "'+db.connections[0].port+'""');
  }).catch(async err => {
    console.log('Connection to '+config.databaseDocker+' failed, try to connect to '+config.databaseLocal);
    // set up "local" mongoose connection
    await mongoose.connect(config.databaseLocal, {
      useNewUrlParser: true,
      useCreateIndex: true
    }).then(db => {
        console.log('Connected to MongoDB (databasename: "'+db.connections[0].name+'") on host "'+db.connections[0].host+'" and on port "'+db.connections[0].port+'""');
    }).catch(err2nd => {
      console.log('Error at MongoDB-connection with Docker: '+err);
      console.log('Error at MongoDB-connection with Localhost: '+err2nd);
    });
  });
})();



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

var token = require('./config/token');

// Express Session Middleware
// @see https://github.com/expressjs/session
app.use(session({
  secret: token.secretSession,
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
