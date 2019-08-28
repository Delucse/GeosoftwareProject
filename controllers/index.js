// jshint esversion: 6
// jshint node: true
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application to retrieve all encounters and belonging routes from current user
*/


// import encounter models
const EncounterUser = require('../models/encounterUser');
const EncounterAnimal = require('../models/encounterAnimal');
// import animal model
const Animal = require('../models/animal');
// import user model
const User = require('../models/user');
// import route model
const Route = require('../models/route');



/**
* @desc retrieves all encounters and belonging routes from current user
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.getIndex = (req, res) => {
  var id = res.locals.user._id;
  // queries all users to make them usable for the filter
  User.find({}).select('_id username').sort({username: 'asc'}).exec().then(user => {
    Route.find({userId: id}).exec().then(userRoutes => {
      // result for all relevant user-user encounters for current user
      EncounterUser.find({$or: [{userId: id}, {comparedTo: id}]}).exec().then(encountersUser => {
        // result for all relevant user-animal encounters for current user
        EncounterAnimal.find({comparedTo: id}).exec().then(encountersAnimal => {
          // queries all animals to make them usable for the filter
          Animal.find().distinct('individual_taxon_canonical_name').exec().then(animals => {
            res.render('index', {
              title: 'Begegnungen',
              userRoutes: userRoutes,
              userAll: user,
              encountersUser: encountersUser,
              encountersAnimal: encountersAnimal,
              // hack: sort() cannot be used with distinct() in mongoose, so we used javascript sort()
              animal: animals.sort(),
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
  })
  .catch(err => {
    req.flash('message', {type: 'infoMsg', msg: 'Server-Fehler'});
    res.redirect('/');
  });
};
