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
