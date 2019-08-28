// jshint esversion: 6
// jshint node: true
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application to filter the encounters
*/


// import encounter models
const EncounterAnimal = require('../models/encounterAnimal');
const EncounterUser = require('../models/encounterUser');
// import route model
const Route = require('../models/route');



/**
* @desc filters the encounters according to the parameters passed in the body
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.postEncounterFilter = (req, res) => {

  var bodyUser = JSON.parse(req.body.user);
  var bodyAnimal = JSON.parse(req.body.animal);
  var bodyReal = req.body.real;
  var bodyType = req.body.type;
  var bodyDate = req.body.date;

  // encounters can only exist if at least one user or one animal is passed as parameter in the body
  if(bodyAnimal.length === 0 && bodyUser.length === 0){
    res.json('Error');
  }
  else {

    // creates the query for user-encounters for current user
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

    // creates the query for animal-user-encounters for current user
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

    // creates the query for the routes of current user
    var optionRoute = {$and: [{userId: req.body.currentUserId}, {date: {$lte: bodyDate}}]};
    if(bodyType){
      optionRoute = {$and: [{type:bodyType.replace(/"/g, '')}, {userId: req.body.currentUserId}, {date: {$lt: bodyDate}}]};
    }


    Route.find(optionRoute).exec().then(userRoutes => {
      // only if routes exist, encounters can exist too
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
        // no routes exist, so no encounter exist
        res.json('Info');
      }
    })
    .catch(err => {
      res.json(err);
    });
  }
};
