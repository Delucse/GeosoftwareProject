// jshint esversion: 6
// jshint node: true
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application to get the data of the movebank API
*/


const https = require("https");
const JL = require('jsnlog').JL;

// import the function "calculateEncounters()"
const calculateEncounters = require('../controllers/calculateEncounters');
// import tokens for the Movebank API
const token = require('../config/token').token;


// import animal model
const Animal = require('../models/animal');
// import animal model
const EncounterAnimal = require('../models/encounterAnimal');
// import route model
const Route = require('../models/route');



/**
* @desc retrieves the data of a specific study or an individual_local_identifier from movebank and stores it in the database
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.postMovebank = (req, res) => {
  // choice between a whole study or a specific animal
  var study_id = req.body.study_id;
  var sensor_type = req.body.sensor_type;
  var endpoint = "https://www.movebank.org/movebank/service/json-auth?&study_id="+study_id+"&sensor_type="+sensor_type;
  if(req.body.individual_local_identifier !== ''){
    var individual_local_identifiers = req.body.individual_local_identifier;
    endpoint = "https://www.movebank.org/movebank/service/json-auth?&study_id="+study_id+"&individual_local_identifiers[]="+individual_local_identifiers+"&sensor_type="+sensor_type;
  }
  var username = token.MOVEBANK_USERNAME;
  var password = token.MOVEBANK_PASSWORD;
  // set authorization-header to get secured data
  const options = {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
    }
  };
  // movebank query
  var request = https.get(endpoint, options, (httpResponse) => {
    // concatenate updates from datastream
    var body = "";
    httpResponse.on("data", (chunk) => {
      body += chunk;
    });
    httpResponse.on("end", () => {
      try{
        // if the response is not json, than the URL was wrong (catch-block)
        var movebankData = JSON.parse(body);
        // if the length of movebankData.individuals > 0, then data exists
        if(movebankData.individuals.length > 0){
          var message = [0, 0, 0, 0, 0, 0, 0, 0]; // [AnimalAdded, AnimalExist, AnimalExist&update, calculateAllEncounters, errorEncounters, AnimalNotFound, errorServer, errorServerDataLimit]
          asyncLoopAnimals(0, movebankData, sensor_type, res, req, message, function(){createMessages(message, req, res);});
        }
        else {
          req.flash('message', {type: 'infoMsg', msg: 'Zu dem angefragten Tier "'+req.body.individual_local_identifier+'" der Studie "'+study_id+'" liegen keine Daten vor. Gegebenenfalls ist der sog. "Individual Local Identifier" falsch.'});
          res.redirect('/');
        }
      }
      catch(err){
        req.flash('message', {type: 'errorMsg', link: 'https://www.movebank.org/', msg: ['Keine Übereinstimmung mit den Daten von ', 'movebank.org', ' gefunden. Überprüfen Sie Ihre Eingaben und versuchen Sie es gegebenenfalls erneut. (Ausgenommen sind Studien, die eine seperate Zertifizierung bedürfen.)']});
        res.redirect('/');
      }
    });
  });

  request.on("error", (error) => {
    req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler'});
    JL().info("An error occurred with the movebank API when retrieving new data: " + error);
    res.redirect('/');
  });
};


/**
* @desc updates the data of a specific animal species from movebank and stores it in the database if the data has changed
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.postMovebankUpdate = (req, res) => {
  // querying the animal database for a specific animal species
  Animal.find({individual_taxon_canonical_name:req.body.individual_taxon_canonical_name}).exec().then(animal => {
    var message = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    // creates a HTTP.GET-request for every specific animal from the queried animal species
    asyncLoopHTTPGet(0, animal, req, res, message);
  })
  .catch(err => {
    req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler'});
    res.redirect('/');
  });
};


/**
* @desc checks whether the data already exists in the database and saves it as new or updated if necessary.
* @see https://cpt.today/asynchronous-loop-in-nodejs-mongoose/
* @param {number} i, index
* @param {object} movebankData, data get from movebank API
* @param {String} sensor_type sensor-type, for example "gps"
* @param {object} res response, to send back the desired HTTP response
* @param {object} req request, containing information about the HTTP request
* @param {array} message, array to store the counts of the different messages, see "createMessages()"
* @param {function} cb, callback-function
*/
function asyncLoopAnimals(i, movebankData, sensor_type, res, req, message, cb){

  if(i < movebankData.individuals.length){
    var study_id = movebankData.individuals[i].study_id;
    var individual_local_identifier = movebankData.individuals[i].individual_local_identifier;
    var individual_taxon_canonical_name = movebankData.individuals[i].individual_taxon_canonical_name;
    var coordinates = [];
    // creates an array with all coordinates of an animal (without timestamp)
    for(var j = 0; j < movebankData.individuals[i].locations.length; j++){
      coordinates.push([movebankData.individuals[i].locations[j].location_long, movebankData.individuals[i].locations[j].location_lat]);
    }
    Animal.find({individual_local_identifier: individual_local_identifier, study_id: study_id, sensor_type: sensor_type}).exec().then(animal => {
      // checks if this specfic animal exists
      if(animal.length === 1){
        // checks if there are any changes
        if(JSON.stringify(animal[0].coordinates) !== JSON.stringify(coordinates)){
          var updateAnimal = {};
          updateAnimal.coordinates = coordinates;
          updateAnimal.updates = animal[0].updates + 1;
          // update the database-document
          Animal.updateOne({_id: animal[0]._id}, updateAnimal).exec().then(animalUpdate => {
            // update animal was successfull
            message[2] = message[2]+1; // {type: 'successMsg', msg: 'Das angeforderte Tier existiert bereits in der Datenbank und wurde nun aktualisiert.'}
            Animal.find({_id: animal[0]._id}).exec().then(updatedAnimal => {
              Route.find({}).populate('userId', 'username').exec().then(allRoutes => {
                // geometry has changed, which is why new encounters may arise.
                calculateEncounters.calculateEncounters(updatedAnimal[0], allRoutes, 'animal');
                message[3] = message[3]+1; // {type: 'successMsg', link: '/', msg: ['Alle zugehörigen Tier-Begegnungen wurden erfolgreich ermittelt. Gegebenenfalls muss die Seite ','neu geladen',' werden.']}
                asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
              })
              .catch(err => {
                message[4] = message[4]+1; // {type: 'errorMsg', msg: 'Mögliche Tier-Begegnungen konnten nicht berechnet werden.'}
                asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
              });
            })
            .catch(err => {
              message[6] = message[6]+1; // {type: 'infoMsg', msg: 'Server Fehler'}
              asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
            });
          })
          .catch(err => {
            message[7] = message[7]+1; // {type: 'infoMsg', msg: 'Server Fehler. Gegebenenfalls ist der Speicherbedarf zu groß (max. 10 MB).'}
            asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
          });
        }
        else{
          // do not update the database-document
          message[1] = message[1]+1; // {type: 'successMsg', msg: 'Das angeforderte Tier existiert schon in der Datenbank und ist bereits auf dem aktuellen Stand.'}
          asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
        }
      }
      else {
        //  specific animal do not exist, create a new animal
        const newAnimal = new Animal({
          individual_taxon_canonical_name: individual_taxon_canonical_name,
          study_id: study_id,
          individual_local_identifier: individual_local_identifier,
          sensor_type: sensor_type,
          coordinates: coordinates
        });
        newAnimal.save().then(animal => {
          message[0] = message[0]+1; // {type: 'successMsg', msg: 'Die angeforderten Tier-Daten wurden erfolgreich ermittelt und in der Datenbank gespeichert.'}
          Animal.find({$and:[{study_id: study_id},{individual_local_identifier: individual_local_identifier},{sensor_type: sensor_type}]}).exec().then(animalNew => {
            Route.find({}).populate('userId','username').exec().then(allRoutes => {
              // new geometry, which is why new encounters may arise.
              calculateEncounters.calculateEncounters(animalNew[0], allRoutes, 'animal');
              message[3] = message[3]+1;
              asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
            })
            .catch(err => {
              message[4] = message[4]+1; // {type: 'errorMsg', msg: 'Mögliche Tier-Begegnungen konnten nicht berechnet werden.'}
              asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
            });
          })
          .catch(err => {
            message[5] = message[5]+1;
            asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
          });
        })
        .catch(err => {
          message[7] = message[7]+1; // {type: 'infoMsg', msg: 'Server Fehler. Gegebenenfalls ist der Speicherbedarf zu groß (max. 10 MB).'}
          asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
        });
      }
    })
    .catch(err  => {
      message[6] = message[6]+1; // {type: 'infoMsg', msg: 'Server Fehler'}
      asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
    });
  }
  else {
    // if condition is not fulfilled, callback function is executed
    cb();
  }
}


/**
* @desc creates for every single animal an own HTTP.GET-request to query the movebank API
* @see https://cpt.today/asynchronous-loop-in-nodejs-mongoose/
* @param {number} i, index
* @param {array} array the result of the database-query
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
* @param {array} message, array to store the counts of the different messages, see "createMessages()"
*/
function asyncLoopHTTPGet(i, array, req, res, message){
  if (i < array.length) {
    var username = token.MOVEBANK_USERNAME;
    var password = token.MOVEBANK_PASSWORD;
    // set authorization-header to get secured data
    const options = {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
      }
    };
    var sensor_type = array[i].sensor_type;
    var study_id = array[i].study_id;
    var individual_local_identifier = array[i].individual_local_identifier;
    var endpoint = "https://www.movebank.org/movebank/service/json-auth?&study_id="+study_id+"&individual_local_identifiers[]="+individual_local_identifier+"&sensor_type="+sensor_type;
    // movebank query
    var request = https.get(endpoint, options, (httpResponse) => {
      // concatenate updates from datastream
      var body = "";
      httpResponse.on("data", (chunk) => {
        body += chunk;
      });
      httpResponse.on("end", () => {
        try{
          // if the response is not json, than the URL was wrong (catch-block)
          var movebankData = JSON.parse(body);
          // only one individuum is requested
          asyncLoopAnimals(0, movebankData, sensor_type, res, req, message, function(){asyncLoopHTTPGet(i+1, array, req, res, message);});
        }
        catch(err){
          message[8] = message[8]+1; // {type: 'errorMsg', link: 'https://www.movebank.org/', msg: ['Keine Übereinstimmung mit den Daten von ', 'movebank.org', ' gefunden. Überprüfen Sie Ihre Eingaben und versuchen Sie es gegebenenfalls erneut. (Ausgenommen sind Studien, die eine seperate Zertifizierung bedürfen.)']}
          asyncLoopHTTPGet(i+1, array, req, res, message);
        }
      });
    });
    request.on("error", (error) => {
      message[6] = message[6]+1; // {type: 'infoMsg', msg: 'Server Fehler'}
      JL().info("An error occurred with the movebank API during the update: " + error);
      asyncLoopHTTPGet(i+1, array, req, res, message);
    });
  }
  else{
    // if condition is not fulfilled, createMessages() is executed
    createMessages(message, req, res);
  }
}


/**
* @desc creates flash-messages based on information from an array
* @param {object} res response, to send back the desired HTTP response
* @param {object} req request, containing information about the HTTP request
* @param {array} message, array to store the counts of the different messages
*/
function createMessages(message, req, res){
  // checks whether a message (array[i]) must be displayed. This is the case if array[i] > 0.
  if(message[0] > 0){
    if(message[0] === 1){
      req.flash('message', {type: 'successMsg', msg: message[0]+' Tier wurde erfolgreich ermittelt und in der Datenbank gespeichert.'});
    } else {
      req.flash('message', {type: 'successMsg', msg: message[0]+' Tier-Daten wurden erfolgreich ermittelt und in der Datenbank gespeichert.'});
    }
  }
  if(message[1] > 0){
    if(message[1] === 1){
      req.flash('message', {type: 'successMsg', msg: message[1]+' Tier existiert schon in der Datenbank und ist bereits auf dem aktuellen Stand.'});
    } else {
      req.flash('message', {type: 'successMsg', msg: message[1]+' Tiere existieren schon in der Datenbank und sind bereits auf dem aktuellen Stand.'});
    }
  }
  if(message[2] > 0){
    if(message[2] === 1){
      req.flash('message', {type: 'successMsg', msg: message[2]+' Tier existiert bereits in der Datenbank und wurde nun aktualisiert.'});
    } else {
      req.flash('message', {type: 'successMsg', msg: message[2]+' Tiere existieren bereits in der Datenbank und wurden nun aktualisiert.'});
    }
  }
  if(message[3] > 0){
    req.flash('message', {type: 'successMsg', link: '/', msg: ['Alle zugehörigen Tier-Begegnungen wurden erfolgreich ermittelt. Gegebenenfalls muss die Seite ','neu geladen',' werden.']});
  }
  if(message[4] > 0){
    req.flash('message', {type: 'errorMsg', msg: 'Mögliche Tier-Begegnungen konnten nicht berechnet werden.'});
  }
  if(message[5] > 0){
    if(message[5] === 1){
      req.flash('message',  {type: 'errorMsg', msg: message[0]+' Tier wurde nicht in der Datenbank gefunden.'});
    } else {
      req.flash('message', {type: 'errorMsg', msg: message[0]+' Tiere wurden nicht in der Datenbank gefunden.'});
    }
  }
  if(message[6] > 0){
    req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler'});
  }
  if(message[7] > 0){
    req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler. Gegebenenfalls ist der Speicherbedarf zu groß (max. 10 MB).'});
  }
  if(message[8] !== 'undefined' && message[8] > 0){
    req.flash('message', {type: 'errorMsg', link: 'https://www.movebank.org/', msg: ['Keine Übereinstimmung mit den Daten von ', 'movebank.org', ' gefunden. Überprüfen Sie Ihre Eingaben und versuchen Sie es gegebenenfalls erneut. (Ausgenommen sind Studien, die eine seperate Zertifizierung bedürfen.)']});
  }
  res.redirect('/');
}
