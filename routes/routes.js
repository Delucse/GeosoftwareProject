// jshint esversion: 6
// jshint node: true
"use strict";

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const authorizationCheck = require('../middleware/authorizationCheck');
const token = require('../config/token.js').token;

// import route model
const Route = require('../models/route');

// import animal model
const Animal = require('../models/animal');

// get create page
router.get('/create', authorizationCheck, (req, res, next) => {
  req.flash('message', {type: 'infoMsg', msg: 'Hinweis: Es kann unter Umständen dazu kommen, dass die Route nicht sofort berechnet wird. Bei Nicht-Anzeige der Route wählen Sie bitte nochmals ihren Endpunkt der Route als Ziel aus. Wir bemühen uns schnellstmöglichst eine Lösung für das Problem zu finden und entschuldigen uns für die dadurch entstehenden Unannehmlichkeiten.'});
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
      req.flash('message', {
        type: 'successMsg',
        msg: 'Die neu angelelgte Route wurde erfolgreich der Datenbank hinzugefügt.'
      });
      //calculate possible new encounters
      Route.find({_id: objectId}).populate('userId', 'username').exec().then(createdRoute => {
        Route.find({_id: {$ne: objectId}}).populate('userId', 'username').exec().then(allOtherRoutes => {
          calculateEncounters(createdRoute[0], allOtherRoutes, 'user');
          req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen möglichen Nutzer-Begegnungen wurden erfolgreich ermittelt.'});

          Animal.find().exec().then(allAnimalRoutes => {
            for(var i = 0; i < allAnimalRoutes.length; i++){
              calculateEncounters(allAnimalRoutes[i], createdRoute, 'animal');
            }
            req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen möglichen Tier-Begegnungen wurden erfolgreich ermittelt.'});
            res.redirect('/route/manage/'+req.user._id);
          })
              .catch(err => {
                console.log(err);
                req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler beim Berechnen möglicher Tier-Begegnungen'});
                res.redirect('/route/manage/'+req.user._id);
              });
        })
            .catch(err => {
              console.log(err);
              req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler beim Berechnen möglicher Nutzer-Begegnungen'});
              res.redirect('/route/manage/'+req.user._id);
            });
      });
    })
        .catch(err => {
          console.log(err);
          req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler beim Berechnen möglicher Nutzer-Begegnungen'});
          res.redirect('/route/manage/'+req.user._id);
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
      req.flash('message', {type: 'infoMsg',
                            link: '/route/update/'+req.params.routeId,
                             msg: ['Hinweis: Es kann unter Umständen dazu kommen, dass die Route nicht sofort berechnet wird. Bei Nicht-Anzeige der Route ', 'laden Sie die Seite neu.', ' Wir bemühen uns schnellstmöglichst eine Lösung für das Problem zu finden und entschuldigen uns für die dadurch entstehenden Unannehmlichkeiten.']});
      res.render('update',{
        title: 'Routen-Editor',
        input: createFeatureCollection([route]),
        message: req.flash('message')
      });
    } else {
      req.flash('message', {
        type: 'errorMsg',
        link: '/user/logout',
        msg: ['Die angeforderten Informationen stimmen nicht mit Ihrem Benutzerkonto überein. Sie haben daher keine Rechte für deren Zugriff. Gegebenfalls müssen Sie sich unter einem anderen Benutzerkonto ','hier anmelden.', '']
      });
      res.redirect('/route/manage/'+req.user._id);
    }
  })
      .catch(err => {
        req.flash('message', {
          type: 'errorMsg',
          msg: 'Die angefragte Route existiert nicht in der Datenbank.'
        });
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
      req.flash('message', {
        type: 'infoMsg',
        msg: 'Es wurden keine Änderungen an der Route vorgenommen.'
      });
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
          //calculate possible new encounters
          if(route.name !== req.body.name || JSON.stringify(route.coordinates) !== JSON.stringify(JSON.parse(req.body.geometry))){
            Route.find({_id: id}).populate('userId', 'username').exec().then(createdRoute => {
              Route.find({_id: {$ne: id}}).populate('userId', 'username').exec().then(allOtherRoutes => {
                calculateEncounters(createdRoute[0], allOtherRoutes, 'user');
                req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen möglichen Nutzer-Begegnungen wurden erfolgreich aktualisiert.'});
                Animal.find({}).exec().then(allAnimalRoutes => {
                  for(var i = 0; i < allAnimalRoutes.length; i++){
                    calculateEncounters(allAnimalRoutes[i], createdRoute, 'animal');
                  }
                  req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen möglichen Tier-Begegnungen wurden erfolgreich aktualisiert.'});
                  res.redirect('/route/manage/'+req.user._id);
                })
                    .catch(err => {
                      console.log(err);
                      req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler beim Berechnen möglicher Tier-Begegnungen'});
                      res.redirect('/route/manage/'+req.user._id);
                    });

              })
                  .catch(err => {
                    console.log(err);
                    req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler beim Berechnen möglicher Nutzer-Begegnungen'});
                    res.redirect('/route/manage/'+req.user._id);
                  });
            })
                .catch(err => {
                  req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler.'});
                  res.redirect('/route/create/');
                });

          }
          else {
            res.redirect('/route/manage/'+req.user._id);
          }
        })
            .catch(err => {
              req.flash('message', {
                type: 'infoMsg',
                msg: 'Server Fehler. Versuchen Sie es erneut.'
              });
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
* @return {string} prettyTime, time and date in a pretty way (day dd.mm.yyyy, hh:mm:ss)
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
  var prettyTime = weekday[dayNumber]+' '+add0[0]+'.'+add0[1]+'.'+year+', '+add0[2]+':'+add0[3]+':'+add0[4]+' Uhr';
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
        msg: ['Die angeforderten Informationen stimmen nicht mit Ihrem Benutzerkonto überein. Sie haben daher keine Rechte für deren Zugriff. Gegebenfalls müssen Sie sich unter einem anderen Benutzerkonto ','hier anmelden.', '']
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
      EncounterUser.deleteMany({$or: [{routeId: req.params.routeId}, {comparedRoute: req.params.routeId}]}).exec().then(encountersUser =>{
        EncounterAnimal.deleteMany({$or: [{routeId: req.params.routeId}, {comparedRoute: req.params.routeId}]}).exec().then(encountersAnimal =>{
          Route.deleteOne({_id: req.params.routeId}).exec().then(result => {
            req.flash('message', {type: 'successMsg',
              msg: 'Die Route wurde erfolgreich aus der Datenbank entfernt.'
            });
            if(encountersUser.deletedCount + encountersAnimal.deletedCount > 0){
              req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen Begegnungen wurden erfolgreich entfernt.'});
            }
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
              req.flash('message', {
                type: 'errorMsg',
                msg: 'Die angefragte Route existiert nicht in der Datenbank.'
              });
              res.redirect('/route/manage/'+res.locals.user._id);
            });
      })
          .catch(err => {
            req.flash('message', {
              type: 'errorMsg',
              msg: 'Die angefragte Route existiert nicht in der Datenbank.'
            });
            res.redirect('/route/manage/'+res.locals.user._id);
          });
    }
    else {
      req.flash('message', {
        type: 'errorMsg',
        link: '/user/logout',
        msg: ['Die angeforderten Informationen stimmen nicht mit Ihrem Benutzerkonto überein. Sie haben daher keine Rechte für deren Zugriff. Gegebenfalls müssen Sie sich unter einem anderen Benutzerkonto ','hier anmelden.', '']
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
      msg: ['Die angeforderten Informationen stimmen nicht mit Ihrem Benutzerkonto überein. Sie haben daher keine Rechte für deren Zugriff. Gegebenfalls müssen Sie sich unter einem anderen Benutzerkonto ','hier anmelden.', '']
    });
    res.redirect('/route/manage/'+res.locals.user._id);
  }
});





// ######################################################
// import turf
const turf = require('@turf/turf');


function calculateEncounters(originalData, dataToCompare, encounterType){

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
const EncounterAnimal = require('../models/encounterAnimal');


function deleteEncounter(encounterType, id, originalData, dataToCompare){
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
      EncounterUser.deleteMany(queryOption).exec().then()
          .catch(err => {
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

function asyncLoopEncounter(i, array, coordinates, midCoordinate, dataToCompare, originalData, encounterType, index, id, found){

  if(i < array.length && !found){
    if(JSON.stringify(coordinates[index]) === JSON.stringify(array[i].coordinates)){
      found = true;
      if(JSON.stringify(originalData._id) === JSON.stringify(array[i].routeId)){
        if(encounterType === 'user'){
          if(JSON.stringify(originalData.name) !== JSON.stringify(array[i].routeName)){
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
        if(JSON.stringify(originalData.name) !== JSON.stringify(array[i].comparedRouteName)){
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
    EncounterUser.find({$or: [{$and:[{routeId:originalData._id},{comparedRoute:dataToCompare._id}]},
        {$and:[{routeId:dataToCompare._id},{comparedRoute:originalData._id}]}]}).exec().then(encounterUser => {
      asyncLoopEncounter(0, encounterUser, coordinates, midCoordinate, dataToCompare, originalData, encounterType, index, id, false);
    })
        .catch(err => {
          console.log(err);
        });
  }
  else if (encounterType === 'animal'){
    EncounterAnimal.find({$or: [{routeId:originalData._id},{compareTo:dataToCompare._id}]}).exec().then(encounterAnimal => {
      asyncLoopEncounter(0, encounterAnimal, coordinates, midCoordinate, dataToCompare, originalData, encounterType, index, id, false);
    })
        .catch(err => {
          console.log(err);
          console.log('Fehler 2 Animal');
        });
  }
}


const https = require("https");

function here(midCoordinate, coordinates, dataToCompare, originalData, encounterType, index, objectId){

  const category = 'sights-museums';
  var endpoint = 'https://places.demo.api.here.com/places/v1/discover/explore?at='+midCoordinate[1]+','+midCoordinate[0]+'&cat='+category+'&size=5&app_id='+token.HERE_APP_ID_TOKEN+'&app_code='+token.HERE_APP_CODE_TOKEN;
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
      content = content + '<li>• '+info[j].title+', <text style="font-size: 10pt;">'+info[j].vicinity.replace(/<br\/>/g, ", ")+' (Entfernung: '+parseFloat(turf.distance(circlePoint, circle, {units: 'kilometers'})).toFixed(2)+' km)</li>';
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

// TODO: steht ursprünglich in index.js (route)
/**
 * @desc creates a featureCollection with all features/lineStrings from database
 * @param {array} input, array as result of a database query
 * @return {string} featureCollection
 */
function createFeatureCollection(input){
  var featureCollection = "";
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
