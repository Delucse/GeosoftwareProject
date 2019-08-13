// jshint esversion: 6
// jshint node: true
"use strict";


// Access Control
module.exports = function authorizationCheck(req, res, next){
  if(req.isAuthenticated()){
    return next();
  } else {
    req.flash('message', { type: 'errorMsg',
                           link: 'user/login',
                            msg: ['Die angeforderte Webseite ist nur nach erfolgter Authorisierung abrufbar. Sie können sich ', 'hier', 'anmelden.']
                             });
    res.redirect('/user/login');
  }
};
