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


module.exports = router;