// jshint esversion: 6
// jshint node: true
"use strict";


const express = require('express');
const router = express.Router();

// import middleware: access only possible if you have been authorized successfully
const authorizationCheck = require('../middleware/authorizationCheck');


const ApiMovebankController = require('../controllers/apiMovebank');

const ApiEncounterFilterController = require('../controllers/apiEncounterFilter');

const ApiEncounterUpdateController = require('../controllers/apiEncounterUpdate');


// updates encounter status
router.post('/encounter/update', authorizationCheck, ApiEncounterUpdateController.postEncounterUpdate);

// filters encounters
router.post('/encounter/filter', authorizationCheck, ApiEncounterFilterController.postEncounterFilter);

// retrieves data from movebank API
router.post("/movebank", authorizationCheck, ApiMovebankController.postMovebank);

// updates data from movebank API
router.post("/movebank/update", authorizationCheck, ApiMovebankController.postMovebankUpdate);



module.exports = router;
