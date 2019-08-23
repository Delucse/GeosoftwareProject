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
                      msg: ['Email-Adresse existiert bereits. Sie können sich mit Ihren Benutzerdaten ', 'hier anmelden.', '']
                     });
      req.flash('message', {type: 'errorMsg',
                            link: '/user/login',
                             msg: ['Email-Adresse existiert bereits. Sie können sich mit Ihren Benutzerdaten ', 'hier anmelden.', '']
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


// profile of current user
router.get('/:userId', authorizationCheck, (req, res, next) => {
  if(req.params.userId == res.locals.user._id){
    User.findById(req.params.userId).exec().then(user => {
      Route.find({userId: req.params.userId}).exec().then(route => {
        console.log('activity', route);
        res.render('profile', {
          title: 'Profil',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          id: user._id,
          date: prettyTime(user.date),
          activity: route.length,
          message: req.flash('message')
        });
      })
      .catch(err => {
        console.log(err);
        req.flash('message', {type: 'infoMsg',
                               msg: 'Server Fehler. Versuchen Sie es erneut.'
                             });
        res.redirect('/user/'+req.params.userId);
      });
    })
    .catch(err => {
      console.log(err);
      req.flash('message', {type: 'infoMsg',
                             msg: 'Server Fehler. Versuchen Sie es erneut.'
                           });
      res.redirect('/user/'+req.params.userId);
    });
  }
  else {
    req.flash('message', {type: 'errorMsg',
                          link: '/user/logout',
                           msg: ['Die angeforderten Informationen stimmen nicht mit Ihrem Benutzerkonto überein. Sie haben daher keine Rechte für deren Zugriff. Gegebenfalls müssen Sie sich unter einem anderen Benutzerkonto ','hier anmelden.', '']
                         });
    res.redirect('/user/login');
  }
});

// import route model
const Route = require('../models/route');
// import encounter models
const EncounterUser = require('../models/encounterUser');
const EncounterAnimal = require('../models/encounterAnimal');


router.get('/delete/:userId', authorizationCheck, (req, res, next) => {
  if(req.params.userId == res.locals.user._id){
    EncounterUser.deleteMany({$or: [{userId: req.params.userId}, {comparedTo: req.params.userId}]}).exec().then(encountersUser =>{
      EncounterAnimal.deleteMany({$or: [{userId: req.params.userId}, {comparedTo: req.params.userId}]}).exec().then(encountersAnimal =>{
        Route.deleteMany({userId: req.params.userId}).exec().then(route => {
          User.deleteOne({_id: req.params.userId}).exec().then(result => {
            req.flash('message', {type: 'successMsg',
                                   msg: 'Der Benutzer wurde erfolgreich gelöscht'
                                 });
            if(route.deletedCount > 0){  // route = { n: 1, ok: 1, deletedCount: 1}
            req.flash('message', {type: 'successMsg',
                                   msg: 'Alle zugehörigen Routen wurden erfolgreich aus der Datenbank entfernt.'
                                 });
          }
          if(encountersUser.deletedCount + encountersAnimal.deletedCount > 0){
            req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen Begegnungen wurden erfolgreich entfernt.'});
          }
          res.redirect('/user/login');
        })
        .catch(err => {
          console.log(err);
          req.flash('message', {type: 'infoMsg',
                                 msg: 'Server Fehler.'
                               });
          res.redirect('/user/'+req.params.userId);
        });
      })
      .catch(err => {
        console.log(err);
        req.flash('message', {type: 'infoMsg',
                               msg: 'Server Fehler.'
                             });
        res.redirect('/user/'+req.params.userId);
      });
    })
    .catch(err => {
      console.log(err);
      req.flash('message', {type: 'infoMsg',
                             msg: 'Server Fehler.'
                           });
      res.redirect('/user/'+req.params.userId);
    });
  })
  .catch(err => {
    console.log(err);
    req.flash('message', {type: 'infoMsg',
                           msg: 'Server Fehler.'
                         });
    res.redirect('/user/'+req.params.userId);
  });
}
else {
  req.flash('message', {type: 'errorMsg',
                        link: '/user/logout',
                         msg: ['Die angeforderten Informationen stimmen nicht mit Ihrem Benutzerkonto überein. Sie haben daher keine Rechte für deren Zugriff. Gegebenfalls müssen Sie sich unter einem anderen Benutzerkonto ','hier anmelden.', '']
                       });
  res.redirect('/user/login');
}
});


module.exports = router;




/**
* @desc changes the time and date in a pretty way
* @param {date} time
* @return {string} prettyTime, time and date in a pretty way (day dd.mm.yyyy, hh:mm:ss)
*/
function prettyTime(time){
  var today = time;
  var day = today.getDate();
  // get the day of the week
  var dayNumber = today.getDay();
  var weekday = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samsatg'];
  // counting starts at 0
  var month = today.getMonth() + 1;
  var year = today.getFullYear();
  var hour = today.getHours();
  var minute = today.getMinutes();
  var second = today.getSeconds();
  // to retain the schema (hh:mm:ss, dd.mm.yyyy), a 0 must be added if necessary
  var add0 = [day, month, hour, minute, second];
  for(var i=0; i < add0.length; i++){
    if(add0[i] < 10){
      add0[i] = '0'+add0[i];
    }
  }
  var prettyTime = weekday[dayNumber]+' '+add0[0]+'.'+add0[1]+'.'+year+', '+add0[2]+':'+add0[3]+':'+add0[4]+' Uhr';
  return prettyTime;
}
