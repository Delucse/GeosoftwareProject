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
      req.flash('message', { type: 'successMsg',
                              msg: 'Die neu angelelgte Route wurde erfolgreich der Datenbank hinzugefügt.'
                           });
      res.redirect('/');

    })
    .catch(err => {
      req.flash('message', {type: 'infoMsg',
                             msg: 'Server Fehler. Versuchen Sie es erneut.'
                           });
      res.redirect('/route/create/');
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
      res.redirect('/');
    }
  })
      .catch(err => {
        req.flash('message', [{
          type: 'errorMsg',
          msg: 'Die angefragte Route existiert nicht in der Datenbank.'
        }]);
        res.redirect('/');
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
      res.redirect('/');
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
          req.flash('message', [{ type: 'successMsg',
            msg: 'Die Route wurde erfolgreich in der Datenbank aktualisiert.'
          }]);})}

      else {
        // error output (req.flash(...))
        res.redirect('/route/update/'+id);
      }

    }})
      .catch(err => {
        // requested route do not exist
        req.flash('message', [{
          type: 'errorMsg',
          msg: 'Die angefragte Route existiert nicht in der Datenbank.'
        }]);
        res.redirect('/');
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

module.exports = router;