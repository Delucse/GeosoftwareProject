// jshint esversion: 6
// jshint node: true
"use strict";

const express = require('express');
const router = express.Router();

// import user-user encounter model
const EncounterUser = require('../models/encounterUser');
// import animal-user encounter model
const EncounterAnimal = require('../models/encounterAnimal');
// import route model
const Route = require('../models/route');



router.get('/:encounterType/:routeId/:encounterId', (req, res, next) => {

  if(req.params.encounterType === 'others' || req.params.encounterType === 'me'){
    EncounterUser.find({_id: req.params.encounterId}).exec().then(query => {
      Route.find({_id: req.params.routeId}).populate('userId', 'username').exec().then(route => {
        console.log(route);
        res.render('encounter', {
            title: 'geteilte Begegnung',
            userRoutes: route,
            encountersUser: query,
            encountersAnimal: [],
            message: req.flash('message')
          });
      })
      .catch(err => {
        console.log(1, err);
      });
      })
      .catch(err => {
        console.log(2, err);
      });
  }
  else if(req.params.encounterType === 'animal'){
    EncounterAnimal.find({_id: req.params.encounterId}).exec().then(query => {
      Route.find({_id: req.params.routeId}).populate('userId', 'username').exec().then(route => {
        res.render('encounter', {
            title: 'Begegnung',
            userRoutes: route,
            encountersUser: [],
            encountersAnimal: query,
            message: req.flash('message')
          });
      })
      .catch(err => {
        console.log(1, err);
      });
      })
      .catch(err => {
        console.log(2, err);
      });
  }
});


module.exports = router;
