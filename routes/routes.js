// jshint esversion: 6
// jshint node: true
"use strict";

const express = require('express');
const router = express.Router();

// import middleware: access only possible if you have been authorized successfully
const authorizationCheck = require('../middleware/authorizationCheck');


const RouteController = require('../controllers/routes');


// renders create page
router.get('/create', authorizationCheck, RouteController.getCreate);

// creates a route
router.post('/create', authorizationCheck, RouteController.postCreate);

// renders update page
router.get('/update/:routeId', authorizationCheck, RouteController.getUpdate);

// updates a route
router.post('/update', authorizationCheck, RouteController.postUpdate);

// renders read page
router.get('/:routeId', authorizationCheck, RouteController.getOne);

// renders manage page
router.get('/manage/:userId', authorizationCheck, RouteController.getAll);

// deletes one route
router.get('/delete/:routeId', authorizationCheck, RouteController.getDelete);



module.exports = router;
