// jshint esversion: 6
// jshint node: true
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application to update the status of an encounter
*/


// import encounter models
const EncounterAnimal = require('../models/encounterAnimal');
const EncounterUser = require('../models/encounterUser');



/**
* @desc updates the status of real encounter for a specific encounter (the real encounter depends on the current user)
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.postEncounterUpdate = (req, res) => {

  // query which database is queried
  if(req.body.encounterTyp === 'animal'){
    // the model of encounterAnimal pretends that an animal encounter has only one status property: "realEncounterCompared"
    EncounterAnimal.updateOne({_id: req.body.id}, {realEncounterCompared: req.body.real}).exec().then(resultAnimal => {
      res.json({real: req.body.real, encounterId: req.body.id, originalRoute: req.body.originalRoute});
    })
    .catch(err => {
      res.json(err);
    });
  }
  else {
    if(req.body.encounterTyp === 'me'){
      // if a user wants to change the status of the self-encounter, this must logically be changed for both properties
      EncounterUser.updateOne({_id: req.body.id}, {realEncounter: req.body.real, realEncounterCompared: req.body.real}).exec().then(resultMe => {
        res.json({real: req.body.real, encounterId: req.body.id, originalRoute: req.body.originalRoute, comparedRoute: req.body.comparedRoute});
      })
      .catch(err => {
        res.json(err);
      });
    }
    else {
      // if a user wants to change the status of the user-encounter, this may only happen with one property
      if(req.body.changedValue === 'compared'){
        // if the current user belongs to the 'compared'-property of the encounter, only 'realEncounterCompared' may be changed
        EncounterUser.updateOne({_id: req.body.id}, {realEncounterCompared: req.body.real}).exec().then(resultOthers => {
          res.json({real: req.body.real, encounterId: req.body.id, originalRoute: req.body.originalRoute});
        })
        .catch(err => {
          res.json(err);
        });
      }
      else {
        // if the current user belongs not to the 'compared'-property of the encounter, only 'realEncounter' may be changed
        EncounterUser.updateOne({_id: req.body.id}, {realEncounter: req.body.real}).exec().then(resultOthers => {
          res.json({real: req.body.real, encounterId: req.body.id, originalRoute: req.body.originalRoute});
        })
        .catch(err => {
          res.json(err);
        });
      }
    }
  }
};
