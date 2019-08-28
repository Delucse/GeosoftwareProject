// jshint esversion: 6
// jshint node: true
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application to retrieve a specfic encounter
*/


// import encounter models
const EncounterUser = require('../models/encounterUser');
const EncounterAnimal = require('../models/encounterAnimal');
// import route model
const Route = require('../models/route');



/**
* @desc retrieves a specific encounter and beloning route (called by the share-button)
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.getEncounter = (req, res) => {
  // checks the affiliation of the requested encounter
  if(req.params.encounterType === 'others' || req.params.encounterType === 'me'){
    // queries the specific user-encounter and the corresponding route
    EncounterUser.find({_id: req.params.encounterId}).exec().then(query => {
      Route.find({_id: req.params.routeId}).populate('userId', 'username').exec().then(route => {
        res.render('encounter', {
            title: 'geteilte Begegnung',
            userRoutes: route,
            encountersUser: query,
            encountersAnimal: [],
            message: req.flash('message')
        });
      })
      .catch(err => {
        req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler'});
        res.redirect('/');
      });
    })
    .catch(err => {
      req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler'});
      res.redirect('/');
    });
  }
  else if(req.params.encounterType === 'animal'){
    // queries the specific animal-user-encounter and the corresponding route
    EncounterAnimal.find({_id: req.params.encounterId}).exec().then(query => {
      Route.find({_id: req.params.routeId}).populate('userId', 'username').exec().then(route => {
        res.render('encounter', {
            title: 'geteilte Begegnung',
            userRoutes: route,
            encountersUser: [],
            encountersAnimal: query,
            message: req.flash('message')
        });
      })
      .catch(err => {
        req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler'});
        res.redirect('/');
      });
    })
    .catch(err => {
      req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler'});
      res.redirect('/');
    });
  }
};
