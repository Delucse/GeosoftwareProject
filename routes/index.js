// jshint esversion: 6
// jshint node: true
"use strict";


const express = require('express');
const router = express.Router();

// import middleware: access only possible if you have been authorized successfully
const authorizationCheck = require('../middleware/authorizationCheck');


const IndexController = require('../controllers/index');


// renders the main page
router.get('/', authorizationCheck, IndexController.getIndex);



module.exports = router;
