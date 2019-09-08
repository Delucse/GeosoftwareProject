// jshint esversion: 6
// jshint node: true

const mongoose = require('mongoose');
const http = require("http");
const https = require("https");
//Test Packages
var chai = require('chai');
var chaiHttp = require('chai-http');
var request = require('supertest');
var agent = require('superagent');
//Assertions
var should = chai.should();
var expect = chai.expect;
var assert = require('assert');
// needed files for testing
var app = require('../app');
const Route = require('../models/route');
const User = require('../models/user');
const Animal = require('../models/animal');
const encounterAnimal = require('../models/encounterAnimal');
const encounterUser = require('../models/encounterUser');
const token = require('../config/token.js').token;

chai.use(chaiHttp);

var authenticatedUser = request.agent(app);

//let's set up the data we need to pass to the login method
const userCredentials = {
  firstName: 'Max',
  lastName: 'Mustermann',
  email: 'max@mustermann.com',
  username: 'maxmuster01',
  password: '123',
  confirmPassword: '123'
};
//let's set up the data we need to pass to the login method
const loginCredentials = {
  username: 'maxmuster01',
  password: '123'
};
const testroute = {
    type: 'Planung',
    name: 'testroute',
    description: 'justatest',
    geometry: '[[7.59624,51.96882],[7.5963,51.96881],[7.59637,51.9688],[7.59653,51.96877],[7.59655,51.96876],[7.59655,51.96876]]'
};
//the ID of the created route
var routeid;
//the userid saves the ID of the logged-in user
var userid;
describe('Tests zu Create von Routen', function() {

    before(function(done){
      authenticatedUser
        .post('/user/signup')
        .send(userCredentials)
        .end(function(err, res){
          expect(res.statusCode).to.equal(302);
          expect('Location', '/user/login');
          User.find({username: loginCredentials.username}).exec().then(testuser => {
            userid = testuser[0]._id;

            //logging in the user to test functions needing an authorizatino
            //the login will be saved in authenticUser and can be used for the following tests
               authenticatedUser
                  .post('/user/login')
                  .send(loginCredentials)
                  .end(function(err, res){
                      expect(res.statusCode).to.equal(302);
                      expect('Location', '/');

                    done();
                  });

          });
        });
    });
    //tests the function of the login - /route/create has an authorizationCheck
    describe('GET /route/create, um Anmeldung zu testen', function(done){
          it('sollte Status 200 zurückgeben und zur create Seite weiterleiten, wenn korrekt eingeloggt', function(done){
            authenticatedUser.get('/route/create')
            .expect(200, done);
            });
          it('sollte zur Login Seite weiterleiten, da nicht angemeldet', function(done){
            request(app).get('/route/create')
            .expect('Location', '/user/login')
            .expect(302, done);
          });
    });
    describe('Test auf Create und Delete', function() {
        it('sollte keine Route anlegen, da die Eingabewerte nicht korrekt sind', function(done){
                    authenticatedUser.post('/route/create')
                    .send({
                      type: 'Planung',
                      name: '',
                      description: 'justatest',
                      geometry: ''
                    })
                    .expect('Location', '/route/create')
                    .end(function(err, res){
                      res.should.have.status(500);
                      });
                      done();
                    });
        it('sollte eine Route anlegen', function(done){
            authenticatedUser.post('/route/create/')
            .send(testroute)
            .expect('Location', '/route/manage/' + userid)
            .end(function(err, res){
              res.should.have.status(302);
              res.body.should.be.a('object');
              Route.findOne({type: testroute.type, name: testroute.name, description: testroute.description}).exec().then(troute => {
                routeid = troute._id;
                done();
              });
            });
        });
        it('sollte nichts löschen, da die Route ID nicht existiert', function(done) {
            var before;
            Route.find({userId: userid}).exec().then(troute => {
                before = troute.length;
                var after;
                authenticatedUser
                 .get('/route/delete/dieseIDgibtesnicht')
                 .end(function(err, res){
                   res.should.have.status(302);
                   res.body.should.be.a('object');
                   Route.find({userId: userid}).exec().then(troute => {
                      after = troute.length;
                      expect(before).to.equal(after);

                      done();
                      });
                 });
            });

        });
        it('sollte die erstellte Route löschen', function(done) {
            var before;
            Route.find({userId: userid}).exec().then(troute => {
                before = troute.length;
                var after;
                authenticatedUser
                 .get('/route/delete/' + routeid)
                 .end(function(err, res){
                       res.should.have.status(302);
                       res.body.should.be.a('object');
                       Route.find({userId: userid}).exec().then(troute => {
                              after = troute.length;
                              expect(before).to.equal(after + 1);
                              done();
                       });
                });
            });

        });
    });
    describe('Erzeugen von Begegnungen durch die Create Route', function() {
             it('sollte keine Begegnung erzeugen, da nur eine Route angelegt wird', function(done) {
                // "before" and "after" is the amount of the encounters, before and after creating the route "testroute1"
                var before;
                encounterUser.find({userId: userid}).exec().then(tencounters => {
                    before = tencounters.length;
                    var after;
                    authenticatedUser.post('/route/create')
                     .send({
                       type: 'Planung',
                       name: 'testroute1',
                       description: 'justatest',
                       geometry: '[[7.59624,51.96882],[7.5963,51.96881],[7.59637,51.9688],[7.59653,51.96877],[7.59655,51.96876],[7.59655,51.96876]]'
                     })
                     .expect('Location', '/route/manage/' + userid)
                     .end(function(err, res){
                         res.should.have.status(302);
                         res.body.should.be.a('object');
                         encounterUser.find({userId: userid}).exec().then(troute => {
                             after = troute.length;
                             expect(before).to.equal(after);
                             done();
                         });
                     });
                });

            });

            it('sollte keine neuen Begegnungen mit maxmuster01 anlegen', function(done) {
                var before;
                encounterUser.find({userId: userid}).exec().then(tencounters => {
                    before = tencounters.length;
                    var after;
                    authenticatedUser.post('/route/create')
                         .send({
                           type: 'Planung',
                           name: 'testroute3',
                           description: 'justatest',
                           geometry: '[[3.49002,51.56077],[3.49057,51.5611],[3.49075,51.5612],[3.49112,51.5614],[3.49165,51.56159]]'
                         })
                         .expect('Location', '/route/manage/' + userid)
                         .end(function(err, res){
                             res.should.have.status(302);
                             res.body.should.be.a('object');
                             encounterUser.find({userId: userid}).exec().then(troute => {
                                 after = troute.length;
                                 expect(before).to.equal(after);
                                 done();
                             });
                         });
                });

            });
            var before1;
            it('sollte eine neue Route angelegt haben', function(done) {
                // "before" and "after" is the amount of the encounters, before and after creating the route "testroute2"
                encounterUser.find({userId: userid}).exec().then(findencounters => {
                    before1 = findencounters.length;
                });
                authenticatedUser.post('/route/create')
                    .send({
                      type: 'Planung',
                      name: 'testroute2',
                      description: 'justatest',
                      geometry: '[[7.59638,51.96892],[7.59638,51.96888],[7.59637,51.9688],[7.59637,51.96875],[7.59637,51.96866],[7.59637,51.96866]]'
                    })
                    .expect('Location', '/route/manage/' + userid)
                    .end(function(err, res){
                        res.should.have.status(302);
                        done();
                    });
            });
            it('sollte eine neue Begegnung erzeugt haben', function(done){
                setTimeout(function(){
                    var after;
                    encounterUser.find({userId: userid}).exec().then(tencounters2 => {
                        after = tencounters2.length;
                        expect(before1).to.not.equal(after);
                        done();
                    });
                }, 2000);
            });
    });
    after( function(done){
        setTimeout(function(){
           // deletes possible user-encounters
               encounterUser.deleteMany({$or: [{userId: userid}, {comparedTo: userid}]}).exec().then(encountersUser =>{
                 // deletes possible animal-user-encounters
                 encounterAnimal.deleteMany({$or: [{userId: userid}, {comparedTo: userid}]}).exec().then(encountersAnimal =>{
                   // deletes possible routes from user
                   Route.deleteMany({userId: userid}).exec().then(route => {
                     // deletes the user
                     User.deleteOne({_id: userid}).exec().then(result => {
                     });
                   });
                 });
               });
           User.find({username: loginCredentials.username}).exec().then(testuser => {
               expect(testuser.legnth).to.equal(undefined);
               done();
           });
       }, 5000);
    });
});
describe('Testen der APIs', function() {
    describe('here API', function() {
          it('sollte mit der here API verbinden', (done) => {
              var endpointHere = 'https://places.demo.api.here.com/places/v1/discover/explore?at=7.59624,51.96882&cat=sights-museums&size=5&app_id='+token.HERE_APP_ID_TOKEN+'&app_code='+token.HERE_APP_CODE_TOKEN;
              // movebank query
              var request = https.get(endpointHere,  (httpResponse) => {
                // concatenate updates from datastream
                var body = "";
                httpResponse.on("data", (chunk) => {
                  body += chunk;
                });
                httpResponse.on("end", () => {
                  try{
                    // if the response is not json, than the URL was wrong (catch-block)
                    var hereData = JSON.parse(body);
                    expect(typeof hereData).to.equal('object');
                    done();
                  }
                  catch(err){
                    //eine Falsche aussage um den Test fehlschlagen zu lassen
                      expect(true).to.equal(false);
                      done();
                  }
                });
              });
                request.on("error", (error) => {
                  //eine Falsche aussage um den Test fehlschlagen zu lassen
                  expect(true).to.equal(false);
                  done();
                });

              });
    });
    describe('movebank API', function() {
          it('sollte mit der movebank API verbinden', function(done) {
                      var endpoint = "https://www.movebank.org/movebank/service/json-auth?&study_id=446579&individual_local_identifiers[]=1790 - Radolfzell JC72014&sensor_type=gps";
                      var username = token.MOVEBANK_USERNAME;
                      var password = token.MOVEBANK_PASSWORD;
                      // set authorization-header to get secured data
                      const options = {
                        headers: {
                          'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
                        }
                      };
                      // movebank query
                      var request = https.get(endpoint, options, (httpResponse) => {
                        // concatenate updates from datastream
                        var body = "";
                        httpResponse.on("data", (chunk) => {
                          body += chunk;
                        });
                        httpResponse.on("end", () => {
                          try{
                            // if the response is not json, than the URL was wrong (catch-block)
                            var movebankData = JSON.parse(body);
                            expect(typeof movebankData).to.equal('object');
                            done();
                          }
                          catch(err){
                            //eine Falsche aussage um den Test fehlschlagen zu lassen
                              expect(true).to.equal(false);
                              done();
                          }
                        });
                      });
                        request.on("error", (error) => {
                          //eine Falsche aussage um den Test fehlschlagen zu lassen
                          expect(true).to.equal(false);
                          done();
                        });
        });
    });
    describe('openweathermap API', function() {
          it('sollte mit der openweathermap API verbinden', (done) => {
              var endpointOpenweather = "https://api.openweathermap.org/data/2.5/weather?lat=7.59624&lon=51.96882&units=metric&appid="+ token.OPENWEATHERMAP_TOKEN;
               var request = https.get(endpointOpenweather, (httpResponse) => {
                       // concatenate updates from datastream
                       var body = "";
                       httpResponse.on("data", (chunk) => {
                         body += chunk;
                       });
                       httpResponse.on("end", () => {
                            try{
                                // if the response is not json, than the URL was wrong (catch-block)
                               var openweathermap = JSON.parse(body);
                               expect(typeof openweathermap).to.equal('object');
                               expect(openweathermap.cod).to.equal(200);
                               done();
                              }
                              catch(err){
                                  //creates a wrong equation to fail the test
                                  expect(true).to.equal(false);
                                  done();
                              }
                            });
               });
               request.on("error", (error) => {
                 //creates a wrong equation to fail the test
                 expect(true).to.equal(false);
                 done();
               });
          });
    });
});


