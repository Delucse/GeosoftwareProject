// jshint esversion: 6
// jshint node: true
"use strict";

// @see https://github.com/bradtraversy/nodekb/blob/master/config/passport.js
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');
const config = require('../config/database');
const bcrypt = require('bcryptjs');

module.exports = function(passport){
  // Local Strategy
  passport.use(new LocalStrategy({
    passReqToCallback : true
  }, function(req, username, password, done){
    // Match Username
    let query = {username:username};
    User.findOne(query, function(err, user){
      if(err) throw err;
      if(!user){
        return done(null, false, req.flash('message', { type: 'errorMsg',
                                                         msg: 'Authorisierung ist fehlgeschlagen.'
                                                      }));
      }

      // Match Password
      bcrypt.compare(password, user.password, function(err, isMatch){
        if(err) throw err;
        if(isMatch){
          return done(null, user, req.flash('message', { type: 'successMsg',
                                                          msg: 'Sie haben sich erfolgreich angemeldet.'
                                                       }));
        } else {
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