// jshint esversion: 6
// jshint node: true
"use strict";


const express = require('express');
const router = express.Router();

const EncounterController = require('../controllers/encounter');


// shared encounter, access without authorization
router.get('/:encounterType/:routeId/:encounterId', EncounterController.getEncounter);



module.exports = router;
