// jshint esversion: 6
// jshint node: true
"use strict";

const express = require('express');
const router = express.Router();

// import middleware: access only possible if you have been authorized successfully
const authorizationCheck = require('../middleware/authorizationCheck');


const UserController = require('../controllers/users');


// renders register page
router.get('/signup', UserController.getSignup);

// creates a new user
router.post('/signup', UserController.postSignup);

// renders login page
router.get('/login', UserController.getLogin);

// login Process
router.post('/login', UserController.postLogin);

// logout
router.get('/logout', authorizationCheck, UserController.getLogout);

// profile of current user
router.get('/:userId', authorizationCheck, UserController.getOne);

// deletes one user
router.get('/delete/:userId', authorizationCheck, UserController.getDelete);



module.exports = router;
