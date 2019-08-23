const mongoose = require('mongoose');
//Test Packages
var chai = require('chai');
var chaiHttp = require('chai-http');
var request = require('supertest');
var agent = require('superagent');
//Assertions
var should = chai.should();
var expect = chai.expect;
var assert = require('assert');
//zum Testen benoetigte Dateien
var app = require('../app');
const Route = require('../models/route');
const User = require('../models/user');
const Animal = require('../models/animal');
const encounterAnimal = require('../models/encounterAnimal');
const encounterUser = require('../models/encounterUser');

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
}

//let's set up the data we need to pass to the login method
const loginCredentials = {
  username: 'maxmuster01',
  password: '123'
}

const testroute = {
    type: 'Planung',
    name: 'testroute',
    description: 'justatest',
    geometry: '[[7.59624,51.96882],[7.5963,51.96881],[7.59637,51.9688],[7.59653,51.96877],[7.59655,51.96876],[7.59655,51.96876]]'
}


//die userid soll die ID des eingeloggten Users speichern
var username = loginCredentials.username;
var userid;

//Die ID der angelgten Route
var routeid;

describe('Tests um Create von Routen und die damit zusammenhängende Begegnungserstellung zu testen', function() {

    before(function(done){
      authenticatedUser
        .post('/user/signup')
        .send(userCredentials)
        .end(function(err, res){
          //TODO wenn der User in der finalen Version zuvor gelöscht wird muss es hier eine 200 Meldung geben
          expect(res.statusCode).to.be.oneOf([200, 302]);
          expect('Location', '/user/login');
          User.find({username: username}).exec().then(testuser => {
            userid = testuser[0]._id;

            //Den Testuser hier einloggen, um Funktionen testen zu können, die nur mit Login funktionieren
            //der Login wird im authenticUser gespeichert und kann in anknuepfenden Tests verwendet werden

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
    //Test auf Funktionalitaet des Logins - /route/create hat einen authorizationCheck
    describe('GET /route/create', function(done){
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
    //Testet ob mit einem angemeldeten User eine Route in der Datenbank abgespeichert werden kann
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
            authenticatedUser.post('/route/create')
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
        it('should delete nothing because the ID is not existing', function(done) {
            var before;
            Route.find({userId: userid}).exec().then(troute => {
                before = troute.length;
            });
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
        it('should delete the createt Route', function(done) {
                            var before;
                            Route.find({userId: userid}).exec().then(troute => {
                                before = troute.length;
                            });
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

                                           //res.text.should.include('Die angefragte Route existiert nicht in der Datenbank.')

                            });
        });
    });
    describe('Erzeugen von Begegnungen durch die Create Route', function() {
             it('sollte keine Begegnung erzeugen, da nur eine Route angelegt wird', function(done) {
                //before und after ist die Anzahl der Begegnungen, vor und nach Anlegen der testroute1
                var before;
                encounterUser.find({userId: userid}).exec().then(tencounters => {
                    before = tencounters.length;
                });
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
            it('hier sollte eine Begegnung mit testroute entstehen', function(done) {
                //before und after ist die Anzahl der Begegnungen, vor und nach Anlegen der testroute2
                var before;
                encounterUser.find({userId: userid}).exec().then(tencounters => {
                    before = tencounters.length;
                });
                var after;
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
                        res.body.should.be.a('object');
                        encounterUser.find({userId: userid}).exec().then(troute => {
                            after = troute.length;
                            expect(before + 1).to.equal(after);
                            done();
                        });
                    });
            });
            it(' sollte keine neuen Begegnungen mit maxmuster01 anlegen', function(done) {
                    var before;
                    encounterUser.find({userId: userid}).exec().then(tencounters => {
                        before = tencounters.length;
                    });
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
            it('sollte Tier-Begegnungen erzeugen', function(done) {
                    //TODO hier Tier Daten zur Datenbank hinzufügen und nicht eine normale Route
                     var before;
                     encounterAnimal.find({userId: userid}).exec().then(tencounters => {
                         before = tencounters.length;
                     });
                     var after;
                     authenticatedUser.post('/route/create')
                                  .send({
                                            type: 'Planung',
                                            name: 'testroute2',
                                            description: 'justatest',
                                            geometry: '[[7.63196,51.95471]]'
                                        })
                                  .expect('Location', '/route/manage/' + userid)
                                  .end(function(err, res){
                                       res.should.have.status(302);
                                       res.body.should.be.a('object');
                                       encounterAnimal.find({userId: userid}).exec().then(troute => {
                                           after = troute.length;
                                           //TODO: hier einen Equalizer zu vorher nachher
                                           //expect(before).to.equal(after);
                                           done();
                                       });
                                  });
                   });
    });

    //TODO die APIS anbindungen testen
    describe('Testen der APIs', function() {
        describe('Testen der here API', function() {
            var api, conn;
              it('sollte erreichbar sein', (done) => {
                // Try to connect:
                Api.connect((error, new_api) => {
                  if (error) {done(error);} else {
                    api = new_api
                    done();
                  }
                });
              });

              it('should authenticate properly', (done) => {
                // Then try to authenticate:
                api.authenticate(TEST_AUTH_CREDENTIALS, (error, new_conn) => {
                  if (error) {done(error);} else {
                    conn = new_conn;
                    done();
                  }
                });
              });

              it('should allow for data to be written to the data store', (done) => {
                // Then try to write data:
                conn.write(generateTestData(), (error, res) => {
                  if (error) {done(error);} else {
                    done();
                  }
                });
              });
        });
        describe('Testen der movebank API', function() {
            var api, conn;
              it('sollte erreichbar sein', (done) => {
                // Try to connect:
                authenticatedUser
                .post('/api/movebank')
                .end(function(err, res){
                    //TODO eine ganze Anfrage schreiben und checken
                    res.should.have.status(302);
                    //console.log("dieses hier ist die res", res);
                    done();
                  });
                });

              it('should authenticate properly', (done) => {
                // Then try to authenticate:
                api.authenticate(TEST_AUTH_CREDENTIALS, (error, new_conn) => {
                  if (error) {done(error);} else {
                    conn = new_conn;
                    done();
                  }
                });
              });

              it('should allow for data to be written to the data store', (done) => {
                // Then try to write data:
                conn.write(generateTestData(), (error, res) => {
                  if (error) {done(error);} else {
                    done();
                  }
                });
              });
        });
        describe('Testen der here API', function() {
            var api, conn;
              it('sollte erreichbar sein', (done) => {
                // Try to connect:
                Api.connect((error, new_api) => {
                  if (error) {done(error);} else {
                    api = new_api
                    done();
                  }
                });
              });

              it('should authenticate properly', (done) => {
                // Then try to authenticate:
                api.authenticate(TEST_AUTH_CREDENTIALS, (error, new_conn) => {
                  if (error) {done(error);} else {
                    conn = new_conn;
                    done();
                  }
                });
              });

              it('should allow for data to be written to the data store', (done) => {
                // Then try to write data:
                conn.write(generateTestData(), (error, res) => {
                  if (error) {done(error);} else {
                    done();
                  }
                });
              });
        });
    });
    /**
    after(function() {
        //TODO den User lösche, damit sollten dann alles anhängende gelöscht werden
       authenticatedUser
              .get('/user/delete/' + userid)
              .expect('Location', '/user/login')
              .expect(302, done);
              }
        });
       **/

});