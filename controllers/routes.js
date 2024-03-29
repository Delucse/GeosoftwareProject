// jshint esversion: 6
// jshint node: true
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application to manage routes (CRUD)
*/


const mongoose = require('mongoose');

// import the functions "calculateEncounters()", "createFeatureCollection()"
const calculateEncounters = require('../controllers/calculateEncounters');

// import route model
const Route = require('../models/route');
// import animal model
const Animal = require('../models/animal');
// import encounter models
const EncounterUser = require('../models/encounterUser');
const EncounterAnimal = require('../models/encounterAnimal');



/**
* @desc renders the "create route" page
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.getCreate = (req, res) => {
  req.flash('message', {type: 'infoMsg', msg: 'Hinweis: Es kann unter Umständen dazu kommen, dass die Route nicht sofort berechnet wird. Bei Nicht-Anzeige der Route wählen Sie bitte nochmals ihren Endpunkt der Route als Ziel aus. Wir bemühen uns schnellstmöglichst eine Lösung für das Problem zu finden und entschuldigen uns für die dadurch entstehenden Unannehmlichkeiten.'});
  res.render('create', {
    title: 'Routen-Editor',
    message: req.flash('message')
  });
};


/**
* @desc creates a new route and stores it in the database
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.postCreate = (req, res) => {

  const type = req.body.type;
  const name = req.body.name;
  const description = req.body.description;
  const geometry = req.body.geometry;
  const coordinates = JSON.parse(geometry);

  // checks if the inputs are valid
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
    // no errors - a valid Route can be created
    var objectId = new mongoose.Types.ObjectId();
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
      // new route has been created
      req.flash('message', {
        type: 'successMsg',
        msg: 'Die neu angelelgte Route wurde erfolgreich der Datenbank hinzugefügt.'
      });
      // calculate possible new encounters
      Route.find({_id: objectId}).populate('userId', 'username').exec().then(createdRoute => {
        // possible new user-encounter
        Route.find({_id: {$ne: objectId}}).populate('userId', 'username').exec().then(allOtherRoutes => {
          calculateEncounters.calculateEncounters(createdRoute[0], allOtherRoutes, 'user');
          req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen möglichen Nutzer-Begegnungen wurden erfolgreich ermittelt.'});
          // possible new animal-user-encounter
          Animal.find().exec().then(allAnimalRoutes => {
            for(var i = 0; i < allAnimalRoutes.length; i++){
              calculateEncounters.calculateEncounters(allAnimalRoutes[i], createdRoute, 'animal');
            }
            req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen möglichen Tier-Begegnungen wurden erfolgreich ermittelt.'});
            res.redirect('/route/manage/'+req.user._id);
          })
          .catch(err => {
            req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler beim Berechnen möglicher Tier-Begegnungen'});
            res.redirect('/route/manage/'+req.user._id);
          });
        })
        .catch(err => {
          req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler beim Berechnen möglicher Nutzer-Begegnungen'});
          res.redirect('/route/manage/'+req.user._id);
        });
      })
      .catch(err => {
        req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler beim Berechnen möglicher Begegnungen'});
        res.redirect('/route/manage/'+req.user._id);
      });
    })
    .catch(err => {
      req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler'});
      res.redirect('/route/manage/'+req.user._id);
    });
  }
  else {
    // error output
    res.redirect('/route/create/');
  }
};


/**
* @desc renders the "update route" page
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.getUpdate = (req, res) => {
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
        input: calculateEncounters.createFeatureCollection([route]),
        message: req.flash('message')
      });
    }
    // current user is not the same user, who created the routes
    else {
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
};


/**
* @desc updates an existing route and stores it in the database
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.postUpdate = (req, res) => {
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
      // checks if the input is valid
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
          //calculate possible new encounters if coordinates or route-name has changed
          if(route.name !== req.body.name || JSON.stringify(route.coordinates) !== JSON.stringify(JSON.parse(req.body.geometry))){
            Route.find({_id: id}).populate('userId', 'username').exec().then(createdRoute => {
              // possible new user-encounters
              Route.find({_id: {$ne: id}}).populate('userId', 'username').exec().then(allOtherRoutes => {
                calculateEncounters.calculateEncounters(createdRoute[0], allOtherRoutes, 'user');
                req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen möglichen Nutzer-Begegnungen wurden erfolgreich aktualisiert.'});
                // possible new animal-user-encounters
                Animal.find({}).exec().then(allAnimalRoutes => {
                  for(var i = 0; i < allAnimalRoutes.length; i++){
                  calculateEncounters.calculateEncounters(allAnimalRoutes[i], createdRoute, 'animal');
                  }
                  req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen möglichen Tier-Begegnungen wurden erfolgreich aktualisiert.'});
                  res.redirect('/route/manage/'+req.user._id);
                })
                .catch(err => {
                  req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler beim Berechnen möglicher Tier-Begegnungen'});
                  res.redirect('/route/manage/'+req.user._id);
                });

              })
              .catch(err => {
                req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler beim Berechnen möglicher Nutzer-Begegnungen'});
                res.redirect('/route/manage/'+req.user._id);
              });
            })
            .catch(err => {
              req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler beim Berechnen möglicher Begegnungen'});
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
            msg: 'Server-Fehler'
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
};


/**
* @desc renders the "read route" page
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.getOne = (req, res) => {
  Route.findById(req.params.routeId).exec().then(route => {
    var userId = route.userId;
    // checks if current user is the same user, who created the route
    if(JSON.stringify(userId) === JSON.stringify(res.locals.user._id)){
      var id = req.params.routeId;
      res.render('read', {
        title: 'Verwaltung',
        route: calculateEncounters.createFeatureCollection([route]),
        name: "Route mit der ID ",
        id: id,
        update: route.updates
      });
    }
    // current user is not the same user, who created the routes
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
};


/**
* @desc renders the "manage routes" page
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.getAll = (req, res) => {
  // checks if current user is the same user, who created the routes
  if(JSON.stringify(req.params.userId) === JSON.stringify(res.locals.user._id)){
    Route.find({userId: req.params.userId}).exec().then(route => {
      // current user has no route
      if(route.length < 1){
        req.flash('message', {
          type: 'infoMsg',
          msg: 'Es sind keine Routen unter dem aktuellen Benutzer abgespeichert.'
        });
        res.render('manager', {
          title: "Verwaltung",
          message: req.flash('message')
        });
      // current user has at least one route
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
  // current user is not the same user, who created the routes
  else {
    req.flash('message',{
      type: 'errorMsg',
      link: '/user/logout',
      msg: ['Die angeforderten Informationen stimmen nicht mit Ihrem Benutzerkonto überein. Sie haben daher keine Rechte für deren Zugriff. Gegebenfalls müssen Sie sich unter einem anderen Benutzerkonto ','hier anmelden.', '']
    });
    res.redirect('/route/manage/'+res.locals.user._id);
  }
};


/**
* @desc deletes specific route and corresponding encounters
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.getDelete = (req, res) => {
  Route.findById(req.params.routeId).exec().then(route => {
    var userId = route.userId;
    // checks if current user is the same user, who created the routes
    if(JSON.stringify(userId) === JSON.stringify(res.locals.user._id)){
      // deletes possible user-encounters
      EncounterUser.deleteMany({$or: [{routeId: req.params.routeId}, {comparedRoute: req.params.routeId}]}).exec().then(encountersUser =>{
        // deletes possible animal-user-encounters
        EncounterAnimal.deleteMany({$or: [{routeId: req.params.routeId}, {comparedRoute: req.params.routeId}]}).exec().then(encountersAnimal =>{
          // deletes specfic route
          Route.deleteOne({_id: req.params.routeId}).exec().then(result => {
            req.flash('message', {type: 'successMsg',
              msg: 'Die Route wurde erfolgreich aus der Datenbank entfernt.'
            });
            // only if at least one encounter has been deleted
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
    // current user is not the same user, who created the routes
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
};
