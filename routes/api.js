// jshint esversion: 6
// jshint node: true
"use strict";

const express = require('express');
const https = require("https");
const router = express.Router();


const authorizationCheck = require('../middleware/authorizationCheck');

// import animal model
const Animal = require('../models/animal');


// import animal model
const EncounterAnimal = require('../models/encounterAnimal');
// import route model
const Route = require('../models/route');

const token = require('../config/token');

router.post("/movebank", authorizationCheck, (req, res, next) => {
    var study_id = req.body.study_id;
    var individual_local_identifiers = req.body.individual_local_identifier;
    var sensor_type = req.body.sensor_type;
    var endpoint = "https://www.movebank.org/movebank/service/json-auth?&study_id="+study_id+"&individual_local_identifiers[]="+individual_local_identifiers+"&sensor_type="+sensor_type;

    var username = token.MOVEBANK_USERNAME;
    var password = token.MOVEBANK_PASSWORD;
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
                // only one individuum is requested
                var study_id = movebankData.individuals[0].study_id;

                var individual_local_identifier = movebankData.individuals[0].individual_local_identifier;
                var individual_taxon_canonical_name = movebankData.individuals[0].individual_taxon_canonical_name;
                var coordinates = [];
                for(var i = 0; i < movebankData.individuals[0].locations.length; i++){
                    coordinates.push([movebankData.individuals[0].locations[i].location_long, movebankData.individuals[0].locations[i].location_lat]);
                }
                // coordinates.push([1,2]);
                // DATEN ÜBERPRÜFEN????!!!!

                // it is possible to have more than one individual_local_identifier, but only one individual_taxon_canonical_name!
                // so it is possible to store more than one individual_local_identifier to one individual_taxon_canonical_name
                Animal.find({individual_local_identifier: individual_local_identifier, study_id: study_id, sensor_type: sensor_type}).exec().then(animal => {
                    console.log(animal.length);
                    // checks if this specfic animal exists
                    if(animal.length == 1){
                        // checks if there are any changes
                        if(JSON.stringify(animal[0].coordinates) !== JSON.stringify(coordinates)){
                            var updateAnimal = {};
                            updateAnimal.coordinates = coordinates;
                            updateAnimal.updates = animal[0].updates + 1;
                            // update the database-document
                            Animal.updateOne({_id: animal[0]._id}, updateAnimal).exec().then(animalUpdate => {
                                // update animal was successfull
                                req.flash('message', {type: 'successMsg', msg: 'Das angeforderte Tier existiert bereits in der Datenbank und wurde nun aktualisiert.'});
                                EncounterAnimal.deleteMany({routeId: animal[0]._id}).exec().then(removeAnimals =>{
                                    Animal.findById(animal[0]._id).exec().then(updatedAnimal => {
                                        Route.find({}).populate('userId', 'username').exec().then(allRoutes => {
                                            console.log('Routes', allRoutes);
                                            console.log('animal', animalUpdate);
                                            console.log('updateAnimal[0]', updatedAnimal[0]);
                                            console.log('allRoutes', allRoutes);
                                            calculateEncounters(updatedAnimal, allRoutes, 'animal');
                                            req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen Tier-Begegnungen wurden erfolgreich ermittelt.'});
                                            res.redirect('/');
                                        })
                                            .catch(err => {
                                                console.log(err);
                                                req.flash('message', {type: 'errorMsg', msg: 'Funktion wurde nicht anerkannt.'});
                                                res.redirect('/');
                                            });
                                    })
                                        .catch(err => {
                                            req.flash('message', message[2][0]);
                                            res.redirect('/');
                                        });
                                })
                                    .catch(err => {
                                        req.flash('message', message[2][0]);
                                        res.redirect('/');
                                    });
                            })
                                .catch(err => {
                                    req.flash('message', message[2][0]);
                                    res.redirect('/');
                                });
                        }
                        else{
                            // do not update the database-document
                            req.flash('message', {type: 'successMsg', msg: 'Das angeforderte Tier existiert bereits und ist schon auf dem neuesten Stand.'});
                            res.redirect('/');
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
                            req.flash('message', {type: 'successMsg', msg: 'Die angeforderten Tier-Daten wurden erfolgreich ermittelt und gespeichert.'});
                            Animal.find({study_id: study_id},{individual_local_identifier: individual_local_identifier},{sensor_type: sensor_type}).exec().then(animalNew => {
                                Route.find({}).populate('userId','username').exec().then(allRoutes => {
                                    console.log('Routes', allRoutes);
                                    calculateEncounters(animalNew[0], allRoutes, 'animal');
                                    req.flash('message', {type: 'successMsg', msg: 'Alle zugehörigen Tier-Begegnungen wurden erfolgreich ermittelt.'});
                                    res.redirect('/');
                                })
                                    .catch(err => {
                                        console.log('error', err);
                                        req.flash('message', {type: 'errorMsg', msg: 'Mögliche Tier-Begegnungen konnten nicht berechnet werden.'});
                                        res.redirect('/');
                                    });
                            })
                                .catch(err => {
                                    console.log('error', err);
                                    req.flash('message', {type: 'errorMsg', msg: 'Bestimmtes Tier wurde nicht in der Datenbank gefunden.'});
                                    res.redirect('/');
                                });
                        })
                            .catch(err => {
                                req.flash('message', message[2][0]);
                                res.redirect('/');
                            });
                    }
                })
                    .catch(err => {
                        req.flash('message', message[2][0]);
                        res.redirect('/');
                    });
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

// ######################################################
// import turf
const turf = require('@turf/turf');


function calculateEncounters(originalData, dataToCompare, encounterType){
    console.log('originalData', originalData);
    console.log('dataToCompare', dataToCompare);
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


function here(midCoordinate, coordinates, dataToCompare, originalData, encounterType, index){

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
        const newEncounter = new EncounterAnimal({
            index: index,
            routeId: originalData._id,
            animal: originalData.individual_taxon_canonical_name,
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