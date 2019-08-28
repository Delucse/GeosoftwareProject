// jshint esversion: 6
// jshint node: true
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application for access control
*/



/**
* @desc checks if a user is authenticated
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
* @param {function} next middleware function
*/
module.exports = function authorizationCheck(req, res, next){
  if(req.isAuthenticated()){
    return next();
  } else {
    req.flash('message', { type: 'errorMsg',
                            msg: 'Die angeforderte Webseite ist nur nach erfolgter Authorisierung abrufbar. Sie können sich hier anmelden.'
                          });
    res.redirect('/user/login');
  }
};
