// jshint esversion: 6
// jshint node: true
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application to calculate possible encounters
*/


const mongoose = require('mongoose');
const https = require("https");
const JL = require('jsnlog').JL;

// import the functions "prettyTime()"
const auxilaryFunction = require('../public/javascripts/map');
// import tokens for the here API
const token = require('../config/token').token;

// import turf
const turf = require('@turf/turf');

// import encounter models
const EncounterUser = require('../models/encounterUser');
const EncounterAnimal = require('../models/encounterAnimal');



/**
* @desc calculates the encounters between the "original route" and the others if any exists
* @param {object} originalData "original route", new or changed route
* @param {array} dataToCompare all routes except the original route
* @param {String} encounterType specifies whether it is a user-encounter or an animal-user-encounter
*/
exports.calculateEncounters = function(originalData, dataToCompare, encounterType){

  var line1 = turf.lineString(originalData.coordinates);
  for(var j = 0; j < dataToCompare.length; j++){
    // only compare routes with different Id
    if(originalData._id !== dataToCompare[j]._id){
      var line2 = turf.lineString(dataToCompare[j].coordinates);
      var coordinates = [];
      var coordinatesOverlap = [];
      // calculates possible overlaps between the two routes (line1 and line2)
      calculateOverlap(originalData, dataToCompare[j], line1, line2, coordinates, coordinatesOverlap);
      // calculates possible intersections between the two routes (line1 and line2)
      calculateIntersect(originalData, dataToCompare[j], line1, line2, coordinates, coordinatesOverlap);
      var id = [];
      // only store the real encounters, those who have not an empty coordinate-array
      if(coordinates.length > 0){
        for(var i = 0; i < coordinates.length; i++){
          // calculate the mid coordinate
          var midCoordinate = calculateMidCoordinate(coordinates[i]);
          // save the encounterif(encounterType === 'animal'){
          saveEncounter(originalData, dataToCompare[j], coordinates, encounterType, midCoordinate, i, id);
        }
      }
      else {
        // delete all encounters except the encounters with the ids in the "id-array"
        deleteEncounter(encounterType, id, originalData, dataToCompare[j]);
      }
    }
  }
};


/**
* @desc calculates the possible intersections between the "original route" and one other route
* @param {object} originalData "original route", new or changed route
* @param {object} dataToCompare one other route (except the original route)
* @param {object} line1 original route in turf-syntax
* @param {object} line2 other route in turf-syntax
* @param {array} coordinates array, which stores the coordinates from the encounters
* @param {array} coordinatesOverlap array, which stores the coordinates from the overlapping encounters
*/
function calculateIntersect(originalData, dataToCompare, line1, line2, coordinates, coordinatesOverlap){
  // calculate the intersection
  var intersect = turf.lineIntersect(line1, line2);
  for(var i = 0; i < intersect.features.length; i++){
    var isPointOnLine = false;
    var point = turf.point(intersect.features[i].geometry.coordinates);
    // checks for every intersection, if it's already exists as overlap
    for(var j = 0; j < coordinatesOverlap.length; j++){
      var line = turf.lineString(coordinatesOverlap[j]);
      var distance = turf.pointToLineDistance(point, line, {units: 'kilometers'});
      if(distance < 0.001){
        // if exists, then change variable "isPointOnLine" to true
        isPointOnLine = true;
      }
    }
    // all intersections that are not on a line are new encounters
    if(!isPointOnLine){
      coordinates.push([[intersect.features[i].geometry.coordinates[0], intersect.features[i].geometry.coordinates[1]]]);
    }
  }
}


/**
* @desc calculates the possible overlappings between the "original route" and one other route
* @param {object} originalData "original route", new or changed route
* @param {object} dataToCompare one other route (except the original route)
* @param {object} line1 original route in turf-syntax
* @param {object} line2 other route in turf-syntax
* @param {array} coordinates array, which stores the coordinates from the encounters
* @param {array} coordinatesOverlap array, which stores the coordinates from the overlapping encounters
*/
function calculateOverlap(originalData, dataToCompare, line1, line2, coordinates, coordinatesOverlap){
  // calculates the possible overlappings
  /*
  * comment: function works as desired only with "smaller" arrays, if the length exceeds 600,
  * a possible overlap is not shown. Self-experiment: Two identical lines of the function are
  * passed and the result overlaps with only one part of the input line, which is wrong because
  * the input lines were identical. not bad since the application is designed for shorter
  * distances (see Strava)
  */
  var overlapping = turf.lineOverlap(line1, line2, {tolerance: 0.001}); // tolerance about 1 meters
  // if an overlapping exist, then check if it's a line
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


/**
* @desc deletes all encounters containing the "original route" and the other route, which exist no longer
* @param {String} encounterType specifies whether it is a user-encounter or an animal-user-encounter
* @param {array} id array that stores all IDs that should not be deleted
* @param {object} originalData "original route", new or changed route
* @param {object} dataToCompare one other route (except the original route)
*/
function deleteEncounter(encounterType, id, originalData, dataToCompare){
  // query for all encounters containing both routes
  var queryOption = {$or: [{$and:[{routeId:originalData._id},{comparedRoute:dataToCompare._id}]},
  {$and:[{routeId:dataToCompare._id},{comparedRoute:originalData._id}]}]};
  if(id.length > 0){
    // query for all encounters containing both routes except the encounters with the ids in the id-array
    queryOption = {$and:
      [{$or: [{$and:[{routeId:originalData._id},{comparedRoute:dataToCompare._id}]},
      {$and:[{routeId:dataToCompare._id},{comparedRoute:originalData._id}]}]},
      {_id: {$not: {$in: id}}}]};
    }

  if(encounterType === 'user'){
    // deletes the user-encounters
    EncounterUser.deleteMany(queryOption).exec().then()
    .catch(err => {
      console.log(err);
    });
  }
  else if(encounterType === 'animal'){
    // deletes the user-animal-encounters
    EncounterAnimal.deleteMany(queryOption).exec().then(encounterUser => {
    })
    .catch(err => {
      console.log(err);
    });
  }
}


/**
* @desc updates the encounter with a specific ObjectId
* @param {String} encounterType specifies whether it is a user-encounter or an animal-user-encounter
* @param {object} originalData "original route", new or changed route
* @param {String} objectId mongoDB - ObjectId
*/
function updateEncounter(encounterType, originalData, objectId){
  var update = {};

  if(encounterType === 'user'){
    EncounterUser.find({_id: objectId}).exec().then(encounter => {
      // checks which route-name should be updated (depends on whether the original route was originally "dataToCompare" or not.)
      if(JSON.stringify(originalData._id) === JSON.stringify(encounter[0].routeId)){
        update.routeName = originalData.name;
      }
      else if(JSON.stringify(originalData._id) === JSON.stringify(encounter[0].comparedRoute)){
        update.comparedRouteName = originalData.name;
      }
      EncounterUser.updateOne({_id: objectId}, update).exec().then()
      .catch(err => {
        console.log(err);
      });
    })
    .catch(err => {
      console.log(err);
    });

  }
  else if(encounterType === 'animal'){
    update.comparedRouteName = originalData.name;
    EncounterAnimal.updateOne({_id: objectId}, update).exec().then()
    .catch(err => {
      console.log(err);
    });
  }
}


/**
* @desc checks if specfic encounter already exists and updates it or creates a new one if necessary
* @param {number} i index of the async-function
* @param {array} array the result of a database-query
* @param {array} coordinates array, which stores the coordinates from one encounter
* @param {array} midCoordinate array, which stores the mid coordinates from one encounter
* @param {object} dataToCompare one other route (except the original route)
* @param {object} originalData "original route", new or changed route
* @param {String} encounterType specifies whether it is a user-encounter or an animal-user-encounter
* @param {number} index index
* @param {array} id array that stores all IDs that should not be deleted.
* @param {boolean} found specifies whether an encounter was found in the database
*/
function asyncLoopEncounter(i, array, coordinates, midCoordinate, dataToCompare, originalData, encounterType, index, id, found){

  if(i < array.length && !found){
    // checks if the coordinates the routeId and compareRoute matches (encounter exist?)
    if(JSON.stringify(coordinates[index]) === JSON.stringify(array[i].coordinates) &&
      (JSON.stringify(originalData._id) === JSON.stringify(array[i].routeId) || JSON.stringify(dataToCompare._id) === JSON.stringify(array[i].routeId)) &&
      (JSON.stringify(originalData._id) === JSON.stringify(array[i].comparedRoute) || JSON.stringify(dataToCompare._id) === JSON.stringify(array[i].comparedRoute))){
      // encounter already exist
      found = true;
      // checks which property from the encounter belongs to the original route
      if(JSON.stringify(originalData._id) === JSON.stringify(array[i].routeId)){
        if(encounterType === 'user'){
          // if the name has changed, update the encounter
          if(JSON.stringify(originalData.name) !== JSON.stringify(array[i].routeName)){
            updateEncounter(encounterType, originalData, array[i]._id);
          }
          // necessary to query the encounterType, because the structure of saving is different
        } else if(encounterType === 'animal'){
          // compare the name of the route to the routeName of the animalEncounter
          // if the name has changed, update the encounter
          if(JSON.stringify(dataToCompare.name) !== JSON.stringify(array[i].comparedRouteName)){
            updateEncounter(encounterType, dataToCompare, array[i]._id);
          }
        }
      }
      // checks which property from the encounter belongs to the original route
      else if(JSON.stringify(originalData._id) === JSON.stringify(array[i].comparedRoute)){
        // if the name has changed, update the encounter
        if(JSON.stringify(originalData.name) !== JSON.stringify(array[i].comparedRouteName)){
          updateEncounter(encounterType, originalData, array[i]._id);
        }
      }
      // stores the id from the encounter so that it is not deleted.
      id.push(array[i]._id);
    }
    asyncLoopEncounter(i+1, array, coordinates, midCoordinate, dataToCompare, originalData, encounterType, index, id, found);
  }
  else {
    // encounter do not exist: creates a new encouner
    if(!found){
      var objectId = new mongoose.Types.ObjectId();
      here(midCoordinate, coordinates[index], dataToCompare, originalData, encounterType, index, objectId);
      id.push(objectId);
    }
    // deletes all encounter except the encounters with the ids from the id-array
    if(index === coordinates.length-1){
      deleteEncounter(encounterType, id, originalData, dataToCompare);
    }
  }
}


/**
* @desc checks the type of the encounter and stores it
* @param {object} originalData "original route", new or changed route
* @param {object} dataToCompare one other route (except the original route)
* @param {array} coordinates array, which stores the coordinates from one encounter
* @param {String} encounterType specifies whether it is a user-encounter or an animal-user-encounter
* @param {array} midCoordinate array, which stores the mid coordinates from one encounter
* @param {number} index index
* @param {array} id array that stores all IDs that should not be deleted.
*/
function saveEncounter(originalData, dataToCompare, coordinates, encounterType, midCoordinate, index, id){

  if(encounterType === 'user'){
    // query of all user-encounters containing the orignal route and the other route
    EncounterUser.find({$or: [{$and:[{routeId:originalData._id},{comparedRoute:dataToCompare._id}]},
      {$and:[{routeId:dataToCompare._id},{comparedRoute:originalData._id}]}]}).exec().then(encounterUser => {
        asyncLoopEncounter(0, encounterUser, coordinates, midCoordinate, dataToCompare, originalData, encounterType, index, id, false);
      })
      .catch(err => {
        console.log(err);
      });
  }
  else if (encounterType === 'animal'){
    // query of all user-animal-encounters containing the orignal route or the other route
    EncounterAnimal.find({$or: [{routeId:originalData._id},{compareTo:dataToCompare._id}]}).exec().then(encounterAnimal => {
      asyncLoopEncounter(0, encounterAnimal, coordinates, midCoordinate, dataToCompare, originalData, encounterType, index, id, false);
    })
    .catch(err => {
      console.log(err);
    });
  }
}


/**
* @desc retrieves data from here API
* @param {array} midCoordinate array, which stores the mid coordinates from one encounter
* @param {array} coordinates array, which stores the coordinates from one encounter
* @param {object} dataToCompare one other route (except the original route)
* @param {object} originalData "original route", new or changed route
* @param {String} encounterType specifies whether it is a user-encounter or an animal-user-encounter
* @param {number} index index
* @param {String} objectId mongoDB - ObjectId
*/
function here(midCoordinate, coordinates, dataToCompare, originalData, encounterType, index, objectId){
  const category = 'sights-museums';
  var endpoint = 'https://places.demo.api.here.com/places/v1/discover/explore?at='+midCoordinate[1]+','+midCoordinate[0]+'&cat='+category+'&size=5&app_id='+token.HERE_APP_ID_TOKEN+'&app_code='+token.HERE_APP_CODE_TOKEN;
  var request = https.get(endpoint, (httpResponse) => {

    // concatenate updates from datastream
    var body = "";
    httpResponse.on("data", (chunk) => {
      body += chunk;
    });

    httpResponse.on("end", () => {
      var location_info = createPrettyLocationInfo(JSON.parse(body), coordinates);
      newEncounter(encounterType, originalData, dataToCompare, coordinates, midCoordinate, JSON.stringify(location_info), index, objectId);
    });
  });

  request.on("error", (error) => {
    var location_info = 'keine ortsbezogenen Informationen abrufbar';
    JL().info("An error occurred with the here API: " + error);
    newEncounter(encounterType, originalData, dataToCompare, coordinates, midCoordinate, location_info, index, objectId);
  });
}


/**
* @desc creates readable localised information
* @param {object} location_info result from here API
* @param {array} coordinates array, which stores the coordinates from one encounter
* @return {String} content
*/
function createPrettyLocationInfo(location_info, coordinates){
  var info = location_info.results.items;
  var content = '';
  if(coordinates.length > 1){
    // line in turf-syntax is needed to calculate the minmum distance to the "attraction"
    var line = turf.lineString(coordinates);
    for(var i = 0; i < info.length; i++){
      var polylinePoint = turf.point([info[i].position[1],info[i].position[0]]);
      content = content + '<li>• '+info[i].title+', <text style="font-size: 10pt;">'+info[i].vicinity.replace(/<br\/>/g, ", ")+' (Entfernung: '+parseFloat(turf.pointToLineDistance(polylinePoint, line, {units: 'kilometers'})).toFixed(2)+' km)</text></li>';
    }
  }
  else if(coordinates.length === 1){
    // point in turf-syntax is needed to calculate the distance to the "attraction"
    var circle = turf.point(coordinates[0]);
    for(var j = 0; j < info.length; j++){
      var circlePoint = turf.point([info[j].position[1],info[j].position[0]]);
      content = content + '<li>• '+info[j].title+', <text style="font-size: 10pt;">'+info[j].vicinity.replace(/<br\/>/g, ", ")+' (Entfernung: '+parseFloat(turf.distance(circlePoint, circle, {units: 'kilometers'})).toFixed(2)+' km)</li>';
    }
  }
  return content;
}


/**
* @desc creates a new encounter
* @param {String} encounterType specifies whether it is a user-encounter or an animal-user-encounter
* @param {object} originalData "original route", new or changed route
* @param {object} dataToCompare one other route (except the original route)
* @param {array} coordinates array, which stores the coordinates from one encounter
* @param {array} midCoordinate array, which stores the mid coordinates from one encounter
* @param {String} location_info result from the function "createPrettyLocationInfo()"
* @param {number} index index
* @param {String} objectId mongoDB - ObjectId
*/
function newEncounter(encounterType, originalData, dataToCompare, coordinates, midCoordinate, location_info, index, objectId){
  if(encounterType === 'user'){
    // create new user-encounter
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
    // create new user-animal-encounter
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


/**
* @desc calculates the mid coordinate of an array of coordinates
* @param {array} coordinates array, which stores the coordinates from one encounter
* @return {array} array, which stores the mid coordinate
*/
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


/**
* @desc creates a featureCollection with all features/lineStrings from database
* @param {array} input, array as result of a database query
* @return {string} featureCollection
*/
exports.createFeatureCollection = function(input){
  var featureCollection = "";
  if(input.length > 0){
    var lineString = "";
    for(var i = 0; i < input.length-1; i++){
      lineString = lineString + '{"type":"Feature","properties":{"id":"'+input[i].id+'","date":"'+auxilaryFunction.prettyTime(input[i].date)+'","type":"'+input[i].type+'","name":"'+input[i].name+'","description":"'+input[i].description+'"},"geometry":{"type":"LineString","coordinates":'+JSON.stringify(input[i].coordinates)+'}},';
    }
    lineString = lineString + '{"type":"Feature","properties":{"id":"'+input[input.length-1].id+'","date":"'+auxilaryFunction.prettyTime(input[input.length-1].date)+'","type":"'+input[input.length-1].type+'","name":"'+input[input.length-1].name+'","description":"'+input[input.length-1].description+'"},"geometry":{"type":"LineString","coordinates":'+JSON.stringify(input[input.length-1].coordinates)+'}}';
    featureCollection = '{"type":"FeatureCollection","features":['+lineString+']}';
  }
  return featureCollection;
};
