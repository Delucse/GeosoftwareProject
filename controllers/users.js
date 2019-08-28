// jshint esversion: 6
// jshint node: true
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application to singup, login and "manage" user
*/


const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');

// import the function "prettyTime()"
const auxilaryFunction = require('../public/javascripts/map');

// import user model
const User = require('../models/user');
// import route model
const Route = require('../models/route');
// import encounter models
const EncounterUser = require('../models/encounterUser');
const EncounterAnimal = require('../models/encounterAnimal');



/**
* @desc renders the "signup" page
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.getSignup = (req, res) => {
  res.render('signup', {
    title: 'Registrieren',
    message: req.flash('message')
  });
};


/**
* @desc creates a new user in the database.
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.postSignup = (req, res) => {

  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  // checks if the input is valid
  req.checkBody('firstName', 'Vorname ist erforderlich.').notEmpty();
  req.checkBody('firstName', 'Vorname darf nur aus Buchstaben bestehen.').isAlpha();
  req.checkBody('lastName', 'Nachname ist erforderlich.').notEmpty();
  req.checkBody('lastName', 'Nachname darf nur aus Buchstaben bestehen.').isAlpha();
  req.checkBody('email', 'Email-Adresse ist erforderlich.').notEmpty();
  req.checkBody('email', 'Email-Adresse ist nicht valide.').isEmail();
  req.checkBody('username', 'Benutzername ist erforderlich.').notEmpty();
  req.checkBody('username', 'Der Benutzername muss aus mindestens 5 Zeichen bestehen.').matches(/^.{5,}$/);
  req.checkBody('password', 'Passwort ist erforderlich.').notEmpty();
  req.checkBody('confirmPassword', 'Bestätigen Sie Ihr Passwort').notEmpty();
  req.checkBody('confirmPassword', 'Passwörter stimmen nicht überein.').equals(password);

  const validError = req.validationErrors();
  const errorMsg = [];
  // checks if email already exist (email should be unique)
  User.find({email: email}).exec().then(result => {
    if(result.length > 0) {
      errorMsg.push({type: 'errorMsg',
                     link: '/user/login',
                      msg: ['Email-Adresse existiert bereits. Sie können sich mit Ihren Benutzerdaten ', 'hier anmelden.', '']
                     });
      req.flash('message', {type: 'errorMsg',
                            link: '/user/login',
                             msg: ['Email-Adresse existiert bereits. Sie können sich mit Ihren Benutzerdaten ', 'hier anmelden.', '']
                           });
    }
    // checks if username already exist (username should be unique)
    User.find({username: username}).exec().then(result => {
      if(result.length > 0) {
        errorMsg.push({type: 'errorMsg',
                        msg: 'Benutzername ist bereits vergeben.'
                       });
        req.flash('message', {type: 'errorMsg',
                               msg: 'Benutzername ist bereits vergeben.'
                             });
      }
      for(var i = 0; i < validError.length; i++){
        errorMsg.push({type: 'errorMsg', msg: validError[i].msg});
        req.flash('message', {type: 'errorMsg', msg: validError[i].msg});
      }
      if(errorMsg.length < 1) {
        bcrypt.hash(password, 10, (err, hash) => {
          if (err) {
            req.flash('message', {type: 'infoMsg',
                                   msg: 'Server-Fehler'
                                 });
            res.redirect('/user/signup');
          } else {
            // no errors - a valid User can be created
            const newUser = new User({
              _id: new mongoose.Types.ObjectId(),
              firstName: firstName,
              lastName: lastName,
              email: email,
              username: username,
              password: hash, // result from hashing the password
              date: new Date()
            });
            newUser.save().then(result => {
              req.flash('message', { type: 'successMsg',
                                      msg: 'Sie haben sich erfolgreich registriert.'
                                   });
              res.redirect('/user/login');
            })
            .catch(err => {
              req.flash('message', {type: 'infoMsg',
                                     msg: 'Server-Fehler'
                                   });
              res.redirect('/user/signup');
            });
          }
        });
      }
      else {
        res.redirect('/user/signup');
      }
    });
  });
};


/**
* @desc renders the "login" page
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.getLogin = (req, res) => {
  res.render('login', {
    title: 'Anmelden',
    message: req.flash('message')
  });
};


/**
* @desc login process
* @see https://github.com/bradtraversy/nodekb/blob/master/routes/users.js
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
* @param {function} next middleware function
*/
exports.postLogin = (req, res, next) => {
  passport.authenticate('local', {
    successRedirect:'/',
    failureRedirect:'/user/login',
    failureFlash: true,
    successFlash: true
  })(req, res, next);
};


/**
* @desc logs off the current user
* @see https://github.com/bradtraversy/nodekb/blob/master/routes/users.js
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.getLogout = (req, res) => {
  req.logout();
  req.flash('message', { type: 'successMsg',
                          msg: 'Sie wurden erfolgreich ausgeloggt.'
                       });
  res.redirect('/user/login');
};


/**
* @desc renders the "user-profil" page
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.getOne = (req, res) => {
  // checks if current user is the same user, whose profile was requested
  if(req.params.userId == res.locals.user._id){
    User.findById(req.params.userId).exec().then(user => {
      Route.find({userId: req.params.userId}).exec().then(route => {
        res.render('profile', {
          title: 'Profil',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          id: user._id,
          date: auxilaryFunction.prettyTime(user.date),
          activity: route.length,
          message: req.flash('message')
        });
      })
      .catch(err => {
        req.flash('message', {type: 'infoMsg',
                               msg: 'Server-Fehler'
                             });
        res.redirect('/user/'+req.params.userId);
      });
    })
    .catch(err => {
      req.flash('message', {type: 'infoMsg',
                             msg: 'Server-Fehler'
                           });
      res.redirect('/user/'+req.params.userId);
    });
  }
  // current user is not the same user, whose profile was requested
  else {
    req.flash('message', {type: 'errorMsg',
                          link: '/user/logout',
                           msg: ['Die angeforderten Informationen stimmen nicht mit Ihrem Benutzerkonto überein. Sie haben daher keine Rechte für deren Zugriff. Gegebenfalls müssen Sie sich unter einem anderen Benutzerkonto ','hier anmelden.', '']
                         });
    res.redirect('/user/login');
  }
};


/**
* @desc deletes specific user and corresponding routes and encounters
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.getDelete = (req, res) => {
  // checks if current user is the same user, whose profile was requested
  if(req.params.userId == res.locals.user._id){
    // deletes possible user-encounters
    EncounterUser.deleteMany({$or: [{userId: req.params.userId}, {comparedTo: req.params.userId}]}).exec().then(encountersUser =>{
      // deletes possible animal-user-encounters
      EncounterAnimal.deleteMany({$or: [{userId: req.params.userId}, {comparedTo: req.params.userId}]}).exec().then(encountersAnimal =>{
        // deletes possible routes from user
        Route.deleteMany({userId: req.params.userId}).exec().then(route => {
          // deletes the user
          User.deleteOne({_id: req.params.userId}).exec().then(result => {
            req.flash('message', {type: 'successMsg',
                                   msg: 'Der Benutzer wurde erfolgreich gelöscht'
                                 });
            // only if at least one route has been deleted
            if(route.deletedCount > 0){  // route = { n: 1, ok: 1, deletedCount: 1}
            req.flash('message', {type: 'successMsg',
                                   msg: 'Alle zugehörigen Routen wurden erfolgreich aus der Datenbank entfernt.'
                                 });
            }
            // only if at least one encounter has been deleted
            if(encountersUser.deletedCount + encountersAnimal.deletedCount > 0){
              req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen Begegnungen wurden erfolgreich entfernt.'});
            }
            res.redirect('/user/login');
          })
          .catch(err => {
            req.flash('message', {type: 'infoMsg',
                                   msg: 'Server-Fehler'
                                 });
            res.redirect('/user/'+req.params.userId);
          });
        })
        .catch(err => {
          req.flash('message', {type: 'infoMsg',
                                 msg: 'Server-Fehler'
                               });
          res.redirect('/user/'+req.params.userId);
        });
      })
      .catch(err => {
        req.flash('message', {type: 'infoMsg',
                               msg: 'Server-Fehler'
                             });
        res.redirect('/user/'+req.params.userId);
      });
    })
    .catch(err => {
      req.flash('message', {type: 'infoMsg',
                            msg: 'Server-Fehler'
                          });
      res.redirect('/user/'+req.params.userId);
    });
  }
  // current user is not the same user, whose profile was requested
  else {
    req.flash('message', {type: 'errorMsg',
                          link: '/user/logout',
                           msg: ['Die angeforderten Informationen stimmen nicht mit Ihrem Benutzerkonto überein. Sie haben daher keine Rechte für deren Zugriff. Gegebenfalls müssen Sie sich unter einem anderen Benutzerkonto ','hier anmelden.', '']
                         });
    res.redirect('/user/login');
  }
};
