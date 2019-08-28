// jshint esversion: 6
// jshint node: true
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application for authentication
*/


const config = require('../config/database');
const bcrypt = require('bcryptjs');

// import local passport strategy
const LocalStrategy = require('passport-local').Strategy;

// import user model
const User = require('../models/user');



/**
* @desc authenticates an user
* @see https://github.com/bradtraversy/nodekb/blob/master/config/passport.js
* @param {object} passport
*/
module.exports = function(passport){
  // Local Strategy
  passport.use(new LocalStrategy({
    passReqToCallback : true
  }, function(req, username, password, done){
    // matches username
    let query = {username:username};
    User.findOne(query, function(err, user){
      if(err) throw err;
      if(!user){
        // user does not exist
        return done(null, false, req.flash('message', { type: 'errorMsg',
                                                         msg: 'Authorisierung ist fehlgeschlagen.'
                                                      }));
      }
      // match password
      bcrypt.compare(password, user.password, function(err, isMatch){
        if(err) throw err;
        if(isMatch){
          return done(null, user, req.flash('message', { type: 'successMsg',
                                                          msg: 'Sie haben sich erfolgreich angemeldet.'
                                                       }));
        }
        else {
          // password does not match
          return done(null, false, req.flash('message', { type: 'errorMsg',
                                                           msg: 'Authorisierung ist fehlgeschlagen.'
                                                        }));
        }
      });
    });
  }));

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
};
