// jshint esversion: 6
// jshint node: true
"use strict";

// const jwt = require('jsonwebtoken');
// // import defined messages
const message = require('../models/messages');
// const JWT_KEY = require('../config/secret');
//
// // @see https://medium.com/swlh/a-practical-guide-for-jwt-authentication-using-nodejs-and-express-d48369e7e6d4
// module.exports = (req, res, next) => {
//   try {
//     console.log(req.headers.authorization);
//     const token = req.headers.authorization.split(" ")[1];
//     jwt.verify(token, JWT_KEY);
//     next();
//   }
//   catch (err) {
//     req.flash('message', message[0][1]);
//     return res.redirect('/user/login');
//   }
// };


// Access Control
// @see
module.exports = function authorizationCheck(req, res, next){
  if(req.isAuthenticated()){
    return next();
  } else {
    req.flash('message', message[0][1]);
    res.redirect('/user/login');
  }
};
