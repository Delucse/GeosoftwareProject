// jshint esversion: 6
// jshint node: true
"use strict";

const express = require('express');
const https = require("https");
const router = express.Router();
const mongoose = require("mongoose");

const authorizationCheck = require('../middleware/authorizationCheck');


const token = require('../config/token');


// import animal model
const Animal = require('../models/animal');
// import animal model
const EncounterAnimal = require('../models/encounterAnimal');
// import route model
const Route = require('../models/route');




// filters encounters
router.post('/encounter/filter', authorizationCheck, (req, res, next) => {
  console.log('body', req.body);

  var bodyUser = JSON.parse(req.body.user);
  var bodyAnimal = JSON.parse(req.body.animal);
  var bodyReal = req.body.real;
  var bodyType = req.body.type;
  var bodyDate = req.body.date;

  // console.log('bodyType', bodyType);
  console.log('bodyDate', bodyDate);

  if(bodyAnimal.length === 0 && bodyUser.length === 0){
    res.json('Error');
  }
  else {

    var userId = '';
    var userComparedTo = '';
    if(bodyUser.length > 0){

      for(var i = 0; i < bodyUser.length-1; i++){
        userId = userId + "{\"userId\":\""+bodyUser[i]+"\"},";
        userComparedTo = userComparedTo + "{\"comparedTo\":\""+bodyUser[i]+"\"},";
      }
      userId = userId + "{\"userId\":\""+bodyUser[bodyUser.length-1]+"\"}";
      userId = {$or:JSON.parse('['+userId+']')};
      userComparedTo = userComparedTo + "{\"comparedTo\":\""+bodyUser[bodyUser.length-1]+"\"}";
      userComparedTo = {$or:JSON.parse('['+userComparedTo+']')};
    }
    else {
      userId = {userId:bodyUser};
      userComparedTo = {comparedTo:bodyUser};
    }

    var user = {$or: [{$and:[{userId:req.body.currentUserId},userComparedTo]},{$and:[userId,{comparedTo:req.body.currentUserId}]}]};


    var animalName = '';
    if(bodyAnimal.length > 0){
      for(var j = 0; j < bodyAnimal.length-1; j++){
        animalName = animalName + "{\"animal\":\""+bodyAnimal[j]+"\"},";
      }
      animalName = animalName + "{\"animal\":\""+bodyAnimal[bodyAnimal.length-1]+"\"}";
      animalName = {$or:JSON.parse('['+animalName+']')};
    }
    else {
      animalName = {animal:bodyAnimal};
    }

    var animal = {$and:[{comparedTo:req.body.currentUserId},animalName]};


    var optionUser;
    var optionAnimal;
    var optionReal;
    if(bodyReal){
      optionReal = {$or: [{$and:[{userId:req.body.currentUserId},{realEncounter:bodyReal.replace(/"/g, '')}]},
          {$and:[{comparedTo:req.body.currentUserId},{realEncounterCompared:bodyReal.replace(/"/g, '')}]}]};
      optionUser = {$and:[optionReal, user]};
      optionAnimal = {$and:[optionReal, animal]};
    } else {
      optionUser = user;
      optionAnimal = animal;
    }

    var optionRoute = {$and: [{userId: req.body.currentUserId}, {date: {$lt: bodyDate}}]};
    if(bodyType){
      console.log('bodyType', bodyType.replace(/"/g, ''));
      optionRoute = {$and: [{type:bodyType.replace(/"/g, '')}, {userId: req.body.currentUserId}, {date: {$lt: bodyDate}}]};
    }


    console.log('option', optionUser);
    Route.find(optionRoute).exec().then(userRoutes => {
      if(userRoutes.length > 0){
        EncounterUser.find(optionUser).exec().then(resultUserQuery => {
          EncounterAnimal.find(optionAnimal).exec().then(resultAnimalQuery => {
            var result = [];
            result.push(resultUserQuery);
            result.push(resultAnimalQuery);
            result.push(userRoutes);
            res.json(result);
          })
              .catch(err => {
                res.json(err);
              });
        })
            .catch(err => {
              res.json(err);
            });
      }
      else {
        res.json('Info');
      }
    })
        .catch(err => {
          res.json(err);
        });
  }
});



router.post("/movebank", authorizationCheck, (req, res, next) => {
  console.log('body', req.body);
  var study_id = req.body.study_id;
  var sensor_type = req.body.sensor_type;
  var endpoint = "https://www.movebank.org/movebank/service/json-auth?&study_id="+study_id+/*"&individual_local_identifiers[]="+individual_local_identifiers+*/"&sensor_type="+sensor_type;
  if(req.body.individual_local_identifier !== ''){
    var individual_local_identifiers = req.body.individual_local_identifier;
    endpoint = "https://www.movebank.org/movebank/service/json-auth?&study_id="+study_id+"&individual_local_identifiers[]="+individual_local_identifiers+"&sensor_type="+sensor_type;
    console.log(endpoint);
  }
  var username = token.MOVEBANK_USERNAME;
  var password = token.MOVEBANK_PASSWORD;
  console.log('username', username);
  const options = {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
    }
  };

  https.get(endpoint, options, (httpResponse) => {
    // concatenate updates from datastream
    var body = "";
    httpResponse.on("data", (chunk) => {
      body += chunk;
    });

    httpResponse.on("end", () => {
      try{
        // if the response is not json, than the URL was wrong (catch-block)
        var movebankData = JSON.parse(body);
        var message = [0, 0, 0, 0, 0, 0, 0, 0]; // [AnimalAdded, AnimalExist, AnimalExist&update, calculateAllEncounters, errorEncounters, AnimalNotFound, errorServer, errorServerDataLimit]
        asyncLoopAnimals(0, movebankData, sensor_type, res, req, message, function(){createMessages(message, req, res);});
      }
      catch(err){
        req.flash('message', {type: 'errorMsg', link: 'https://www.movebank.org/', msg: ['Keine Übereinstimmung mit den Daten von ', 'movebank.org', ' gefunden. Überprüfen Sie Ihre Eingaben und versuchen Sie es gegebenenfalls erneut.']});
        res.redirect('/');
      }
    });

    httpResponse.on("error", (error) => {
      req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler. Versuchen Sie es erneut.'});
      res.redirect('/');

      throw error;
    });

  });

});



// @see https://cpt.today/asynchronous-loop-in-nodejs-mongoose/
function asyncLoopAnimals(i, movebankData, sensor_type, res, req, message, cb){
  if(i < movebankData.individuals.length){
    var study_id = movebankData.individuals[i].study_id;
    var individual_local_identifier = movebankData.individuals[i].individual_local_identifier;
    var individual_taxon_canonical_name = movebankData.individuals[i].individual_taxon_canonical_name;
    var coordinates = [];
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
                calculateEncounters(updatedAnimal[0], allRoutes, 'animal');
                message[3] = message[3]+1; // {type: 'successMsg', link: '/', msg: ['Alle zugehörigen Tier-Begegnungen wurden erfolgreich ermittelt. Gegebenfalls muss die Seite ','neu geladen',' werden.']}
                asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
              })
                  .catch(err => {
                    message[4] = message[4]+1; // {type: 'errorMsg', msg: 'Mögliche Tier-Begegnungen konnten nicht berechnet werden.'}
                    asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
                  });
            })
                .catch(err => {
                  message[6] = message[6]+1; // {type: 'infoMsg', msg: 'Server Fehler. Versuchen Sie es erneut.'}
                  asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
                });
          })
              .catch(err => {
                message[7] = message[7]+1; // {type: 'infoMsg', msg: 'Server Fehler. Gegebenfalls ist der Speicherbedarf zu groß (max. 10 MB).'}
                asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
              });
        }
        else{
          // do not update the database-document
          message[1] = message[1]+1; // {type: 'successMsg', msg: 'Das angeforderte Tier existiert schon in der Datenbank und ist bereits auf dem aktuellen Stand.'}
          console.log('message[1]',message[1]);
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
              // console.log('Routes', allRoutes);
              calculateEncounters(animalNew[0], allRoutes, 'animal');
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
              message[7] = message[7]+1; // {type: 'infoMsg', msg: 'Server Fehler. Gegebenfalls ist der Speicherbedarf zu groß (max. 10 MB).'}
              asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
            });
      }
    })
        .catch(err  => {
          message[6] = message[6]+1; // {type: 'infoMsg', msg: 'Server Fehler. Versuchen Sie es erneut.'}
          asyncLoopAnimals(i+1, movebankData, sensor_type, res, req, message, cb);
        });
  }
  else {
    cb();
  }
}



function asyncLoopHTTPGet(i, array, req, res, message){
  if (i < array.length) {
    var username = token.MOVEBANK_USERNAME;
    var password = token.MOVEBANK_PASSWORD;
    const options = {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
      }
    };

    var sensor_type = array[i].sensor_type;
    var study_id = array[i].study_id;
    var individual_local_identifier = array[i].individual_local_identifier;
    var endpoint = "https://www.movebank.org/movebank/service/json-auth?&study_id="+study_id+"&individual_local_identifiers[]="+individual_local_identifier+"&sensor_type="+sensor_type;
    https.get(endpoint, options, (httpResponse) => {
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
          // asyncLoopHTTPGet(i+1, array, req, res, message);
        }

        catch(err){
          message[8] = message[8]+1; // {type: 'errorMsg', link: 'https://www.movebank.org/', msg: ['Keine Übereinstimmung mit den Daten von ', 'movebank.org', ' gefunden. Überprüfen Sie Ihre Eingaben und versuchen Sie es gegebenenfalls erneut.']}
          asyncLoopHTTPGet(i+1, array, req, res, message);
        }
      });
      httpResponse.on("error", (error, animal, i, req, res) => {
        message[6] = message[6]+1; // {type: 'infoMsg', msg: 'Server Fehler. Versuchen Sie es erneut.'}
        asyncLoopHTTPGet(i+1, array, req, res, message);
      });
    });
  }
  else{
    createMessages(message, req, res);
  }
}


//message is an array
function createMessages(message, req, res){

  console.log('message', message);
  if(message[0] > 0){
    if(message[0] === 1){
      req.flash('message', {type: 'successMsg', msg: message[0]+' Tier wurde erfolgreich ermittelt und in der Datenbank gespeichert.'});
    } else {
      req.flash('message', {type: 'successMsg', msg: message[0]+' Tier-Daten wurden erfolgreich ermittelt und in der Datenbank gespeichert.'});
    }
  }
  if(message[1] > 0){
    console.log('Nachricht');
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
    req.flash('message', {type: 'successMsg', link: '/', msg: ['Alle zugehörigen Tier-Begegnungen wurden erfolgreich ermittelt. Gegebenfalls muss die Seite ','neu geladen',' werden.']});
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
    req.flash('message', {type: 'infoMsg', msg: 'Server Fehler. Versuchen Sie es erneut.'});
  }
  if(message[7] > 0){
    req.flash('message', {type: 'infoMsg', msg: 'Server Fehler. Gegebenfalls ist der Speicherbedarf zu groß (max. 10 MB).'});
  }
  if(message[8] !== 'undefined' && message[8] > 0){
    req.flash('message', {type: 'errorMsg', link: 'https://www.movebank.org/', msg: ['Keine Übereinstimmung mit den Daten von ', 'movebank.org', ' gefunden. Überprüfen Sie Ihre Eingaben und versuchen Sie es gegebenenfalls erneut.']});
  }
  res.redirect('/');
}


router.post("/movebank/update", authorizationCheck, (req, res, next) => {
  console.log(req.body);
  Animal.find({individual_taxon_canonical_name:req.body.individual_taxon_canonical_name}).exec().then(animal => {
    console.log('animal.length',animal.length);
    var message = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    asyncLoopHTTPGet(0, animal, req, res, message);
    console.log(1);
  })
      .catch(err => {
        req.flash('message', {type: 'infoMsg', msg: 'Server Fehler. Versuchen Sie es erneut.'});
        res.redirect('/');
      });
});


// ######################################################
// import turf
const turf = require('@turf/turf');


function calculateEncounters(originalData, dataToCompare, encounterType){

  var line1 = turf.lineString(originalData.coordinates);
  console.log('dataToCompare', dataToCompare);
  for(var j = 0; j < dataToCompare.length; j++){
    // only compare routes with different Id
    if(originalData._id !== dataToCompare[j]._id){
      var line2 = turf.lineString(dataToCompare[j].coordinates);
      var coordinates = [];
      var coordinatesOverlap = [];
      calculateOverlap(originalData, dataToCompare[j], line1, line2, coordinates, coordinatesOverlap);
      calculateIntersect(originalData, dataToCompare[j], line1, line2, coordinates, coordinatesOverlap);
      // only store the real encounters, those who have not an empty coordinate-array
      console.log('Result', coordinates.length);
      var id = [];
      if(coordinates.length > 0){
        for(var i = 0; i < coordinates.length; i++){
          var midCoordinate = calculateMidCoordinate(coordinates[i]);
          saveEncounter(originalData, dataToCompare[j], coordinates, encounterType, midCoordinate, i, id);
        }
      }
      else {
        deleteEncounter(encounterType, id, originalData, dataToCompare[j]);
      }
    }
  }
}


function calculateIntersect(originalData, dataToCompare, line1, line2, coordinates, coordinatesOverlap){

  var intersect = turf.lineIntersect(line1, line2);

  // var coordinatesOverlap = coordinates;
  for(var i = 0; i < intersect.features.length; i++){
    var isPointOnLine = false;
    var point = turf.point(intersect.features[i].geometry.coordinates);
    for(var j = 0; j < coordinatesOverlap.length; j++){
      console.log(coordinatesOverlap[j]);
      var line = turf.lineString(coordinatesOverlap[j]);
      var distance = turf.pointToLineDistance(point, line, {units: 'kilometers'});
      if(distance < 0.001){
        isPointOnLine = true;
      }
    }
    if(!isPointOnLine){
      coordinates.push([[intersect.features[i].geometry.coordinates[0], intersect.features[i].geometry.coordinates[1]]]);
    }
  }
}

function calculateOverlap(originalData, dataToCompare, line1, line2, coordinates, coordinatesOverlap){

  // calculate the possible overlappings
  var overlapping = turf.lineOverlap(line1, line2, {tolerance: 0.001}); //tolerance about 1 meters

  if(overlapping.features.length > 0){
    for(var i = 0; i < overlapping.features.length; i++){
      var overlapSegment = turf.lineString(overlapping.features[i].geometry.coordinates);
      var length = turf.length(overlapSegment, {units: 'kilometers'});
      // in turf it is possible to have a lineString out of exactly the same coordinates, normaly a point!
      if(length > 0){
        coordinates.push(overlapping.features[i].geometry.coordinates);
        coordinatesOverlap.push(overlapping.features[i].geometry.coordinates);
      }
    }
  }
}


// import encounter models
const EncounterUser = require('../models/encounterUser');

function deleteEncounter(encounterType, id, originalData, dataToCompare){
  console.log('id3', id);
  console.log('originalData._id', originalData._id);
  console.log('dataToCompare._id', dataToCompare._id);
  var queryOption = {$or: [{$and:[{routeId:originalData._id},{comparedRoute:dataToCompare._id}]},
      {$and:[{routeId:dataToCompare._id},{comparedRoute:originalData._id}]}]};
  if(id.length > 0){
    queryOption = {$and:
          [{$or: [{$and:[{routeId:originalData._id},{comparedRoute:dataToCompare._id}]},
              {$and:[{routeId:dataToCompare._id},{comparedRoute:originalData._id}]}]},
            {_id: {$not: {$in: id}}}]};
  }

  if(encounterType === 'user'){
    EncounterUser.find(queryOption).exec().then(possibleDelete => {
      console.log('possibleDelete', possibleDelete);
      EncounterUser.deleteMany(queryOption).exec().then()
          .catch(err => {
            console.log('löschen Fehler User');
            console.log(err);
          });
    })
        .catch(err => {
          console.log(err);
        });
  }
  else if(encounterType === 'animal'){
    EncounterAnimal.deleteMany(queryOption).exec().then()
        .catch(err => {
          console.log('löschen Fehler Animal');
        });
  }
}

function updateEncounter(encounterType, originalData, objectId){
  var update = {};

  if(encounterType === 'user'){
    EncounterUser.find({_id: objectId}).exec().then(encounter => {
      if(JSON.stringify(originalData._id) === JSON.stringify(encounter[0].routeId)){
        update.routeName = originalData.name;
      }
      else if(JSON.stringify(originalData._id) === JSON.stringify(encounter[0].comparedRoute)){
        update.comparedRouteName = originalData.name;
      }
      console.log('update', update);
      EncounterUser.updateOne({_id: objectId}, update).exec().then()
          .catch(err => {
            console.log(err);
            console.log('Fehler User');
          });
    })
        .catch(err => {
          console.log(err);
          console.log('Fehler 1 User');
        });

  }
  else if(encounterType === 'animal'){
    update.comparedRouteName = originalData.name;
    EncounterAnimal.updateOne({_id: objectId}, update).exec().then()
        .catch(err => {
          console.log(err);
          console.log('Fehler Animal');
        });
  }
}

function asyncLoopEncounter(i, array, coordinates, midCoordinate, dataToCompare, originalData, encounterType, index, id, found){

  if(i < array.length && !found){
    if(JSON.stringify(coordinates[index]) === JSON.stringify(array[i].coordinates)){
      found = true;
      if(JSON.stringify(originalData._id) === JSON.stringify(array[i].routeId)){
        console.log(22);
        if(encounterType === 'user'){
          if(JSON.stringify(originalData.name) !== JSON.stringify(array[i].routeName)){
            console.log(23);
            updateEncounter(encounterType, originalData, array[i]._id);
          }
          // necessary to query the encounterType, because the structure of saving is different
        } else if(encounterType === 'animal'){
          // compare the name of the route to the routeName of the animalEncounter
          if(JSON.stringify(dataToCompare.name) !== JSON.stringify(array[i].comparedRouteName)){
            updateEncounter(encounterType, dataToCompare, array[i]._id);
          }
        }
      }
      else if(JSON.stringify(originalData._id) === JSON.stringify(array[i].comparedRoute)){
        console.log(24);
        if(JSON.stringify(originalData.name) !== JSON.stringify(array[i].comparedRouteName)){
          console.log(25);
          updateEncounter(encounterType, originalData, array[i]._id);
        }
      }
      id.push(array[i]._id);
    }
    asyncLoopEncounter(i+1, array, coordinates, midCoordinate, dataToCompare, originalData, encounterType, index, id, found);
  }
  else {
    if(!found){
      var objectId = new mongoose.Types.ObjectId();
      here(midCoordinate, coordinates[index], dataToCompare, originalData, encounterType, index, objectId);
      id.push(objectId);
    }
    if(index === coordinates.length-1){
      deleteEncounter(encounterType, id, originalData, dataToCompare);
    }
  }
}

function saveEncounter(originalData, dataToCompare, coordinates, encounterType, midCoordinate, index, id){

  if(encounterType === 'user'){
    console.log('originalData', originalData);
    EncounterUser.find({$or: [{$and:[{routeId:originalData._id},{comparedRoute:dataToCompare._id}]},
        {$and:[{routeId:dataToCompare._id},{comparedRoute:originalData._id}]}]}).exec().then(encounterUser => {
      asyncLoopEncounter(0, encounterUser, coordinates, midCoordinate, dataToCompare, originalData, encounterType, index, id, false);
    })
        .catch(err => {
          console.log(err);
          console.log('Fehler 2 User');
        });
  }
  else if (encounterType === 'animal'){
    EncounterAnimal.find({$or: [{routeId:originalData._id},{compareTo:dataToCompare._id}]}).exec().then(encounterAnimal => {
      console.log('encounterAnimal', encounterAnimal);
      asyncLoopEncounter(0, encounterAnimal, coordinates, midCoordinate, dataToCompare, originalData, encounterType, index, id, false);
    })
        .catch(err => {
          console.log(err);
          console.log('Fehler 2 Animal');
        });
  }
}



function here(midCoordinate, coordinates, dataToCompare, originalData, encounterType, index, objectId){

  const category = 'sights-museums';
  var endpoint = 'https://places.demo.api.here.com/places/v1/discover/explore?at='+midCoordinate[1]+','+midCoordinate[0]+'&cat='+category+'&size=5&app_id='+token.HERE_APP_ID_TOKEN+'&app_code='+token.HERE_APP_CODE_TOKEN;
  console.log('endpoint', endpoint);
  https.get(endpoint, (httpResponse) => {

    // concatenate updates from datastream
    var body = "";
    httpResponse.on("data", (chunk) => {
      body += chunk;
    });

    httpResponse.on("end", () => {
      var location_info = createPrettyLocationInfo(JSON.parse(body), coordinates);
      newEncounter(encounterType, originalData, dataToCompare, coordinates, midCoordinate, JSON.stringify(location_info), index, objectId);
    });

    httpResponse.on("error", (error) => {
      var location_info = 'keine ortsbezogenen Informationen abrufbar';
      newEncounter(encounterType, originalData, dataToCompare, coordinates, midCoordinate, location_info, index, objectId);
    });

  });
}

function createPrettyLocationInfo(location_info, coordinates){
  var info = location_info.results.items;
  var content = '';
  console.log('prettyCoordinates', coordinates);
  if(coordinates.length > 1){
    var line = turf.lineString(coordinates);
    for(var i = 0; i < info.length; i++){
      var polylinePoint = turf.point([info[i].position[1],info[i].position[0]]);
      content = content + '<li>• '+info[i].title+', <text style="font-size: 10pt;">'+info[i].vicinity.replace(/<br\/>/g, ", ")+' (Entfernung: '+parseFloat(turf.pointToLineDistance(polylinePoint, line, {units: 'kilometers'})).toFixed(2)+' km)</text></li>';
    }
  }
  else if(coordinates.length === 1){
    var circle = turf.point(coordinates[0]);
    for(var j = 0; j < info.length; j++){
      var circlePoint = turf.point([info[j].position[1],info[j].position[0]]);
      content = content + '<li> •'+info[j].title+', <text style="font-size: 10pt;">'+info[j].vicinity.replace(/<br\/>/g, ", ")+' (Entfernung: '+parseFloat(turf.distance(circlePoint, circle, {units: 'kilometers'})).toFixed(2)+' km)</text></li>';
    }
  }
  return content;
}

function newEncounter(encounterType, originalData, dataToCompare, coordinates, midCoordinate, location_info, index, objectId){
  if(encounterType === 'user'){
    const newEncounter = new EncounterUser({
      _id: objectId,
      routeId: originalData._id,
      routeName: originalData.name,
      userId: originalData.userId._id,
      userName: originalData.userId.username,
      comparedRoute: dataToCompare._id,
      comparedRouteName: dataToCompare.name,
      comparedTo: dataToCompare.userId._id,
      comparedToName: dataToCompare.userId.username,
      realEncounter: false,
      realEncounterCompared: false,
      coordinates: coordinates,
      midCoordinate: midCoordinate,
      location_info: location_info
    });
    newEncounter.save()
        .catch(err => {
          console.log(err);
        });
  }
  else if(encounterType === 'animal'){
    const newEncounter = new EncounterAnimal({
      _id: objectId,
      routeId: originalData._id,
      animal: originalData.individual_taxon_canonical_name,
      animalId: originalData.individual_local_identifier,
      comparedRoute: dataToCompare._id,
      comparedRouteName: dataToCompare.name,
      comparedTo: dataToCompare.userId._id,
      comparedToName: dataToCompare.userId.username,
      realEncounterCompared: false,
      coordinates: coordinates,
      midCoordinate: midCoordinate,
      location_info: location_info
    });
    newEncounter.save()
        .catch(err => {
          console.log(err);
        });
  }
}

function calculateMidCoordinate(coordinates){
  if(coordinates.length > 1){
    var line = turf.lineString(coordinates);
    var length = turf.length(line, {units: 'kilometers'});
    var center = turf.along(line, (length/2), {units: 'kilometers'});
    return center.geometry.coordinates;
  }
  else{
    return coordinates[0];
  }
}



module.exports = router;
