// jshint esversion: 6
// jshint node: true
"use strict";

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const authorizationCheck = require('../middleware/authorizationCheck');


// import route model
const Route = require('../models/route');

// get create page
router.get('/create', authorizationCheck, (req, res, next) => {
  res.render('create', {
    title: 'Routen-Editor',
    message: req.flash('message')
  });
});


// create (CRUD)
router.post('/create', authorizationCheck, (req, res, next) => {

  const type = req.body.type;
  const name = req.body.name;
  const description = req.body.description;
  const geometry = req.body.geometry;
  const coordinates = JSON.parse(geometry);

  req.checkBody('type', 'Ein Routentyp ist entweder "Aufnahme" oder "Planung".').matches(/^(Aufnahme|Planung)$/);
  req.checkBody('name', 'Ein Name für die Route ist erforderlich.').notEmpty();
  req.checkBody('name', 'Ein Name für die Route darf keine Anführungszeichen enthalten.').matches(/^[^"]*$/);
  req.checkBody('description', 'Eine Beschreibung für die Route ist erforderlich.').notEmpty();
  req.checkBody('description', 'Eine Beschreibung für die Route darf keine Anführungszeichen enthalten.').matches(/^[^"]*$/);
  req.checkBody('geometry', 'Die Koordinaten müssen wie folgt angegeben werden: "[[longitude, latitude], [longitude, latitude], ... ]".').matches(/^\[\s*(\s*\[\s*(-?(([0-9]{1,2}|[1][0-7][0-9])(\.[0-9]*)?|180(\.0*)?))\s*,\s*(-?(([0-9]|[0-8][0-9])(\.[0-9]*)?|90(\.0*)?))\s*\]\s*,){1,}\s*\[\s*(-?(([0-9]{1,2}|[1][0-7][0-9])(\.[0-9]*)?|180(\.0*)?))\s*,\s*(-?(([0-9]|[0-8][0-9])(\.[0-9]*)?|90(\.0*)?))\s*\]\s*\]$/);

  const validError = req.validationErrors();
  const errorMsg = [];
  for(var i = 0; i < validError.length; i++){
    errorMsg.push({type: 'errorMsg', msg: validError[i].msg});
    req.flash('message', {type: 'errorMsg', msg: validError[i].msg});
  }

  if(errorMsg.length < 1) {
    var objectId = new mongoose.Types.ObjectId();
    // no errors - a valid Route can be created
    const newRoute = new Route({
      _id: objectId,
      userId: req.user._id,
      date: new Date(),
      type: type,
      name: name,
      description: description,
      coordinates: coordinates
    });
    newRoute.save().then(result => {
      console.log(objectId);
      req.flash('message', {
        type: 'successMsg',
        msg: 'Die neu angelelgte Route wurde erfolgreich der Datenbank hinzugefügt.'
      });
      //calculate possible new encounters
      Route.find({_id: objectId}).populate('userId', 'username').exec().then(createdRoute => {
        Route.find({_id: {$ne: objectId}}).populate('userId', 'username').exec().then(allOtherRoutes => {
          calculateEncounters(createdRoute[0], allOtherRoutes, 'user');
          req.flash('message', {
            type: 'successMsg',
            msg: 'Alle zugehörigen möglichen Nutzer-Begegnungen wurden erfolgreich ermittelt.'
          });


          res.redirect('/route/manage/' + req.user._id);
        })
            .catch(err => {
              console.log(err);
              req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler beim Berechnen möglicher Nutzer-Begegnungen'});
              res.redirect('/route/manage/' + req.user._id);
            });


      })
          .catch(err => {
            req.flash('message', {
              type: 'infoMsg',
              msg: 'Server Fehler. Versuchen Sie es erneut.'
            });
            res.redirect('/route/create/');
          });
    });
  }
  else {
    // error output
    res.redirect('/route/create/');
  }
});

//update (CRUD)
router.get('/update/:routeId', authorizationCheck, (req, res, next) => {
  Route.findById(req.params.routeId).exec().then(route => {
    var userId = route.userId;
    // checks if current user is the same user, who created the route
    if(JSON.stringify(userId) === JSON.stringify(res.locals.user._id)){
      var id = req.params.routeId;
      res.render('update',{
        title: 'Routen-Editor',
        input: createFeatureCollection([route]),
        message: req.flash('message')
      });
    } else {
      req.flash('message', [{
        type: 'errorMsg',
        link: '/user/logout',
        msg: ['Die angeforderten Informationen stimmen nicht mit Ihrem Benutzerkonto überein. Sie haben daher keine Rechte für deren Zugriff. Gegebenfalls müssen Sie sich unter einem anderen Benutzerkonto ','hier', 'anmelden.']
      }]);
      res.redirect('/route/manage/'+req.user._id);
    }
  })
      .catch(err => {
        req.flash('message', [{
          type: 'errorMsg',
          msg: 'Die angefragte Route existiert nicht in der Datenbank.'
        }]);
        res.redirect('/route/manage/'+req.user._id);
      });
});

router.post('/update', authorizationCheck, (req, res, next) => {
  var id = req.body.id;
  Route.findById(id).exec().then(route => {
    // checks if any changes are made, no: no update needed
    if(route.type === req.body.type &&
        route.name === req.body.name &&
        route.description === req.body.description &&
        JSON.stringify(route.coordinates) === JSON.stringify(JSON.parse(req.body.geometry))){
      req.flash('message', [{
        type: 'infoMsg',
        msg: 'Es wurden keine Änderungen an der Route vorgenommen.'
      }]);
      res.redirect('/route/manage/'+req.user._id);
    }
    else {
      // changes are made: current route must be updated
      // checks if the input is valide
      req.checkBody('type', 'Ein Routentyp ist entweder "Aufnahme" oder "Planung".').matches(/^(Aufnahme|Planung)$/);
      req.checkBody('name', 'Ein Name für die Route ist erforderlich.').notEmpty();
      req.checkBody('name', 'Ein Name für die Route darf keine Anführungszeichen enthalten.').matches(/^[^"]*$/);
      req.checkBody('description', 'Eine Beschreibung für die Route ist erforderlich.').notEmpty();
      req.checkBody('description', 'Eine Beschreibung für die Route darf keine Anführungszeichen enthalten.').matches(/^[^"]*$/);
      req.checkBody('geometry', 'Die Koordinaten müssen wie folgt angegeben werden: "[[longitude, latitude], [longitude, latitude], ... ]".').matches(/^\[\s*(\s*\[\s*(-?(([0-9]{1,2}|[1][0-7][0-9])(\.[0-9]*)?|180(\.0*)?))\s*,\s*(-?(([0-9]|[0-8][0-9])(\.[0-9]*)?|90(\.0*)?))\s*\]\s*,){1,}\s*\[\s*(-?(([0-9]{1,2}|[1][0-7][0-9])(\.[0-9]*)?|180(\.0*)?))\s*,\s*(-?(([0-9]|[0-8][0-9])(\.[0-9]*)?|90(\.0*)?))\s*\]\s*\]$/);

      const validError = req.validationErrors();
      const errorMsg = [];
      for(var i = 0; i < validError.length; i++){
        errorMsg.push({type: 'errorMsg', msg: validError[i].msg});
        req.flash('message', {type: 'errorMsg', msg: validError[i].msg});
      }

      // no error, everything is valid and the route can be updated
      if(errorMsg.length < 1) {

        var updateRoute = {};
        updateRoute.type = req.body.type;
        updateRoute.name = req.body.name;
        updateRoute.description = req.body.description;
        updateRoute.coordinates = JSON.parse(req.body.geometry);
        updateRoute.updates = route.updates + 1;

        Route.updateOne({_id: id}, updateRoute).exec().then(newRoute => {
          // update route was successfull
          req.flash('message', { type: 'successMsg',
            msg: 'Die Route wurde erfolgreich in der Datenbank aktualisiert.'
            });
          EncounterUser.deleteMany({$or: [{routeId: id}, {comparedRoute: id}]}).exec().then(removeUsers =>{
            Route.find({_id: id}).populate('userId', 'username').exec().then(createdRoute => {
              Route.find({_id: {$ne: id}}).populate('userId', 'username').exec().then(allOtherRoutes => {
                calculateEncounters(createdRoute[0], allOtherRoutes, 'user');
                req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen möglichen Nutzer-Begegnungen wurden erfolgreich aktualisiert.'})
              .catch(err => {
                  console.log(err);
                  req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler beim Berechnen möglicher Nutzer-Begegnungen'});
                  res.redirect('/route/manage/'+req.user._id);
                });
              })
                  .catch(err => {
                    console.log(err);
                    req.flash('message', {
                      type: 'infoMsg',
                      msg: 'Server-Fehler beim Berechnen möglicher Nutzer-Begegnungen'
                    });
                    res.redirect('/route/manage/'+req.user._id);
                  });
            })
                .catch(err => {
                  req.flash('message', [{
                    type: 'infoMsg',
                    msg: 'Server Fehler. Versuchen Sie es erneut.'
                  }]);
                  res.redirect('/route/create/');
                });
          })
              .catch(err => {
                req.flash('message', [{
                  type: 'infoMsg',
                  msg: 'Server Fehler. Versuchen Sie es erneut.'
                }]);
                res.redirect('/route/create/');
              });
      })
            .catch(err => {
              req.flash('message', [{
                type: 'infoMsg',
                msg: 'Server Fehler. Versuchen Sie es erneut.'
              }]);
              res.redirect('/route/update/'+id);
            });

      }
      else {
        // error output (req.flash(...))
        res.redirect('/route/update/'+id);
      }

    }
    })
      .catch(err => {
        // requested route do not exist
        req.flash('message', {
          type: 'errorMsg',
          msg: 'Die angefragte Route existiert nicht in der Datenbank.'
        });
        res.redirect('/route/manage/'+req.user._id);
      });
});

/**
 * @desc creates a featureCollection with all features/lineStrings from database
 * @param {array} input, array as result of a database query
 * @return {string} featureCollection
 */
function createFeatureCollection(input){
  var featureCollection = "";
  console.log('length', input[input.length-1]);
  if(input.length > 0){
    var lineString = "";
    for(var i = 0; i < input.length-1; i++){
      lineString = lineString + '{"type":"Feature","properties":{"id":"'+input[i].id+'","date":"'+prettyTime(input[i].date)+'","type":"'+input[i].type+'","name":"'+input[i].name+'","description":"'+input[i].description+'"},"geometry":{"type":"LineString","coordinates":'+JSON.stringify(input[i].coordinates)+'}},';
    }
    lineString = lineString + '{"type":"Feature","properties":{"id":"'+input[input.length-1].id+'","date":"'+prettyTime(input[input.length-1].date)+'","type":"'+input[input.length-1].type+'","name":"'+input[input.length-1].name+'","description":"'+input[input.length-1].description+'"},"geometry":{"type":"LineString","coordinates":'+JSON.stringify(input[input.length-1].coordinates)+'}}';
    featureCollection = '{"type":"FeatureCollection","features":['+lineString+']}';
  }
  return featureCollection;
}

/**
 * @desc changes the time and date in a pretty way
 * @param {date} time
 * @return {string} prettyTime, time and date in a pretty way (day hh:mm:ss, dd.mm.yyyy)
 */
function prettyTime(time){
  var today = time;
  var day = today.getDate();
  // get the day of the week
  var dayNumber = today.getDay();
  var weekday = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samsatg'];
  // counting starts at 0
  var month = today.getMonth() + 1;
  var year = today.getFullYear();
  var hour = today.getHours();
  var minute = today.getMinutes();
  var second = today.getSeconds();
  // to retain the schema (hh:mm:ss, dd.mm.yyyy), a 0 must be added if necessary
  var add0 = [day, month, hour, minute, second];
  for(var i=0; i < add0.length; i++){
    if(add0[i] < 10){
      add0[i] = '0'+add0[i];
    }
  }
  var prettyTime = weekday[dayNumber]+' '+add0[2]+':'+add0[3]+':'+add0[4]+' Uhr, '+add0[0]+'.'+add0[1]+'.'+year;
  return prettyTime;
}

// read (CRUD)
router.get('/:routeId', authorizationCheck, (req, res, next) => {
  Route.findById(req.params.routeId).exec().then(route => {
    var userId = route.userId;
    if(JSON.stringify(userId) === JSON.stringify(res.locals.user._id)){
      var id = req.params.routeId;
      res.render('read', {
        title: 'Verwaltung',
        route: createFeatureCollection([route]),
        name: "Route mit der ID ",
        id: id,
        update: route.updates
      });
    }
    else {
      req.flash('message',{
            type: 'errorMsg',
            link: '/user/logout',
            msg: ['Die angeforderten Informationen stimmen nicht mit Ihrem Benutzerkonto überein. Sie haben daher keine Rechte für deren Zugriff. Gegebenfalls müssen Sie sich unter einem anderen Benutzerkonto ','hier', 'anmelden.']
          });
      res.redirect('/route/manage/'+res.locals.user._id);
    }
  })
  .catch(err => {
    req.flash('message',{
          type: 'errorMsg',
          msg: 'Die angefragte Route existiert nicht in der Datenbank.'
        });
    res.redirect('/route/manage/'+res.locals.user._id);
  });
});

//delete (CRUD)
router.get('/delete/:routeId', authorizationCheck, (req, res, next) => {
Route.findById(req.params.routeId).exec().then(route => {
  var userId = route.userId;
  if(JSON.stringify(userId) === JSON.stringify(res.locals.user._id)){

      EncounterUser.deleteMany({$or: [{routeId: req.params.routeId}, {comparedRoute: req.params.routeId}]}).exec().then(removeUser =>{
      Route.deleteOne({_id: req.params.routeId}).exec().then(result => {
          req.flash('message',
            { type: 'successMsg',
             msg: 'Die Route wurde erfolgreich aus der Datenbank entfernt.'
           });
          res.redirect('/route/manage/'+res.locals.user._id);
        })
    .catch(err => {
      req.flash('message', {
         type: 'errorMsg',
         msg: 'Die angefragte Route existiert nicht in der Datenbank.'
       });
      res.redirect('/route/manage/'+res.locals.user._id);
    });
  })
          .catch(err => {
            req.flash('message', [{
              type: 'errorMsg',
              msg: 'Die angefragte Route existiert nicht in der Datenbank.'
            }]);
            res.redirect('/route/manage/'+res.locals.user._id);
          });}
  else {
    req.flash('message', {
       type: 'errorMsg',
       link: '/user/logout',
       msg: ['Die angeforderten Informationen stimmen nicht mit Ihrem Benutzerkonto überein. Sie haben daher keine Rechte für deren Zugriff. Gegebenfalls müssen Sie sich unter einem anderen Benutzerkonto ','hier', 'anmelden.']
     });
    res.redirect('/route/manage/'+res.locals.user._id);
  }
})
.catch(err => {
  req.flash('message', {
     type: 'errorMsg',
     msg: 'Die angefragte Route existiert nicht in der Datenbank.'
   });
  res.redirect('/route/manage/'+res.locals.user._id);
});
});

router.get('/manage/:userId', authorizationCheck, (req, res, next) => {
    if(JSON.stringify(req.params.userId) === JSON.stringify(res.locals.user._id)){
      Route.find({userId: req.params.userId}).exec().then(route => {
        if(route.length < 1){
          req.flash('message', {
             type: 'infoMsg',
             msg: 'Es sind keine Routen unter dem aktuellen Benutzer abgespeichert.'
           });
          res.render('manager', {
            title: "Verwaltung",
            message: req.flash('message')
          });
        } else {
          console.log('ResultRoute', route);
          res.render('manager', {
            title: 'Verwaltung',
            data: route,
            id: req.params.userId,
            message: req.flash('message')
          });
        }
      })
      .catch(err => {
        res.render('manager', {
          title: 'Verwaltung',
          message:{
            type: 'errorMsg',
            msg: 'Der Benutzer existiert nicht.'
          }
        });
      });
    }
    else {
      req.flash('message',{
            type: 'errorMsg',
            link: '/user/logout',
            msg: ['Die angeforderten Informationen stimmen nicht mit Ihrem Benutzerkonto überein. Sie haben daher keine Rechte für deren Zugriff. Gegebenfalls müssen Sie sich unter einem anderen Benutzerkonto ','hier', 'anmelden.']
          });
      res.redirect('/route/manage/'+res.locals.user._id);
    }
  });

// ######################################################
// import turf
const turf = require('@turf/turf');


function calculateEncounters(originalData, dataToCompare, encounterType){
  if(encounterType === 'animal'){
    console.log(encounterType);
    console.log('originalData', originalData);
    console.log('dataToCompare', dataToCompare);
  }
  var line1 = turf.lineString(originalData.coordinates);
  for(var j = 0; j < dataToCompare.length; j++){
    // only compare routes with different Id
    if(originalData._id !== dataToCompare[j]._id){
      var line2 = turf.lineString(dataToCompare[j].coordinates);
      var coordinates = [];
      var coordinatesOverlap = [];
      calculateOverlap(originalData, dataToCompare[j], line1, line2, coordinates, coordinatesOverlap);
      calculateIntersect(originalData, dataToCompare[j], line1, line2, coordinates, coordinatesOverlap);
      // only store the real encounters, those who have not an empty coordinate-array
      if(coordinates.length > 0){
        saveEncounter(originalData, dataToCompare[j], coordinates, encounterType);
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
  var overlapping = turf.lineOverlap(line1, line2);

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

function saveEncounter(originalData, dataToCompare, coordinates, encounterType){

  for(var i = 0; i < coordinates.length; i++){
    var midCoordinate = calculateMidCoordinate(coordinates[i]);
    here(midCoordinate, coordinates[i], dataToCompare, originalData, encounterType, (i+1));
  }
}

const https = require("https");

function here(midCoordinate, coordinates, dataToCompare, originalData, encounterType, index){
  const token = {
    HERE_APP_ID_TOKEN: //your HERE_APP_ID_TOKEN,
    HERE_APP_CODE_TOKEN: //your HERE_APP_CODE_TOKEN
  };
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
      newEncounter(encounterType, originalData, dataToCompare, coordinates, midCoordinate, JSON.stringify(location_info), index);
    });

    httpResponse.on("error", (error) => {
      var location_info = 'keine ortsbezogenen Informationen abrufbar';
      newEncounter(encounterType, originalData, dataToCompare, coordinates, midCoordinate, location_info, index);
    });

  });
}

function createPrettyLocationInfo(location_info, coordinates){
  var info = location_info.results.items;
  var content = '<br>';
  console.log('prettyCoordinates', coordinates);
  if(coordinates.length > 1){
    var line = turf.lineString(coordinates);
    for(var i = 0; i < info.length; i++){
      var polylinePoint = turf.point([info[i].position[1],info[i].position[0]]);
      content = content + '<li>'+info[i].title+', '+info[i].vicinity.replace(/<br\/>/g, ", ")+' (Entfernung: '+parseFloat(turf.pointToLineDistance(polylinePoint, line, {units: 'kilometers'})).toFixed(2)+' km)</li>';
    }
  }
  else if(coordinates.length === 1){
    var circle = turf.point(coordinates[0]);
    for(var j = 0; j < info.length; j++){
      var circlePoint = turf.point([info[j].position[1],info[j].position[0]]);
      content = content + '<li>'+info[j].title+', '+info[j].vicinity.replace(/<br\/>/g, ", ")+' (Entfernung: '+parseFloat(turf.distance(circlePoint, circle, {units: 'kilometers'})).toFixed(2)+' km)</li>';
    }
  }
  return content;
}

function newEncounter(encounterType, originalData, dataToCompare, coordinates, midCoordinate, location_info, index){
  if(encounterType === 'user'){
    const newEncounter = new EncounterUser({
      index: index,
      routeId: originalData._id,
      routeName: originalData.name,
      userId: originalData.userId._id,
      userName: originalData.userId.username,
      comparedRoute: dataToCompare._id,
      comparedRouteName: dataToCompare.name,
      comparedTo: dataToCompare.userId._id,
      comparedToName: dataToCompare.userId.username,
      realEncounter: false,
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

// TODO: steht ursprünglich in index.js (route)
/**
 * @desc creates a featureCollection with all features/lineStrings from database
 * @param {array} input, array as result of a database query
 * @return {string} featureCollection
 */
function createFeatureCollection(input){
  var featureCollection = "";
  console.log('length', input[input.length-1]);
  if(input.length > 0){
    var lineString = "";
    for(var i = 0; i < input.length-1; i++){
      lineString = lineString + '{"type":"Feature","properties":{"id":"'+input[i].id+'","date":"'+prettyTime(input[i].date)+'","type":"'+input[i].type+'","name":"'+input[i].name+'","description":"'+input[i].description+'"},"geometry":{"type":"LineString","coordinates":'+JSON.stringify(input[i].coordinates)+'}},';
    }
    lineString = lineString + '{"type":"Feature","properties":{"id":"'+input[input.length-1].id+'","date":"'+prettyTime(input[input.length-1].date)+'","type":"'+input[input.length-1].type+'","name":"'+input[input.length-1].name+'","description":"'+input[input.length-1].description+'"},"geometry":{"type":"LineString","coordinates":'+JSON.stringify(input[input.length-1].coordinates)+'}}';
    featureCollection = '{"type":"FeatureCollection","features":['+lineString+']}';
  }
  return featureCollection;
}


module.exports = router;