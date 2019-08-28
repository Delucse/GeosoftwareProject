// jshint esversion: 6
// jshint node: true
"use strict";


const express = require('express');
const router = express.Router();

const ImpressumController = require('../controllers/impressum');


// renders the imprint (dt.: Impressum) page, access without authorization
router.get('/', ImpressumController.getImpressum);



module.exports = router;
