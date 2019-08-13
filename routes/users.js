// jshint esversion: 6
// jshint node: true
"use strict";

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const router = express.Router();

const authorizationCheck = require('../middleware/authorizationCheck');

// import user model
const User = require('../models/user');



// get register page
router.get('/signup', function(req, res){
  res.render('signup', {
    title: 'Registrieren',
    message: req.flash('message')
  });
});

// register process
router.post('/signup', (req, res, next) => {

  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

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

  User.find({email: email}).exec().then(result => {
    if(result.length > 0) {
      errorMsg.push({type: 'errorMsg',
                     link: '/user/login',
                      msg: ['Email-Adresse existiert bereits. Sie können sich mit Ihren Benutzerdaten ', 'hier', 'anmelden.']
                     });
      req.flash('message', {type: 'errorMsg',
                            link: '/user/login',
                             msg: ['Email-Adresse existiert bereits. Sie können sich mit Ihren Benutzerdaten ', 'hier', 'anmelden.']
                           });
    }
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
                                   msg: 'Server Fehler. Versuchen Sie es erneut.'
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
              console.log(err);
              req.flash('message', {type: 'infoMsg',
                                     msg: 'Server Fehler. Versuchen Sie es erneut.'
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
});


// get login page
router.get('/login', function(req, res){
  res.render('login', {
    title: 'Anmelden',
    message: req.flash('message')
  });
});

// Login Process
// @see https://github.com/bradtraversy/nodekb/blob/master/routes/users.js
router.post('/login', function(req, res, next){
  passport.authenticate('local', {
    successRedirect:'/',
    failureRedirect:'/user/login',
    failureFlash: true,
    successFlash: true
  })(req, res, next);
});


// logout
// @see https://github.com/bradtraversy/nodekb/blob/master/routes/users.js
router.get('/logout', authorizationCheck, function(req, res){
  req.logout();
  req.flash('message', { type: 'successMsg',
                          msg: 'Sie wurden erfolgreich ausgeloggt.'
                       });
  res.redirect('/user/login');
});


module.exports = router;