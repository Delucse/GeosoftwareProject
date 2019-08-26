const mongoose = require('mongoose');
const https = require("https");
//Test Packages
var chai = require('chai');
var chaiHttp = require('chai-http');
var request = require('supertest');
var agent = require('superagent');
var nock = require('nock');
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
const token = require('../config/token.js').token;

//TODO weiß nicht ob das benötigt wird
const response = require('./response.js');

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
//Die ID der angelgten Route
var routeid;
//die userid soll die ID des eingeloggten Users speichern
var userid;
describe('Tests um Create von Routen und die damit zusammenhängende Begegnungserstellung zu testen', function() {

    before(function(done){
      authenticatedUser
        .post('/user/signup')
        .send(userCredentials)
        .end(function(err, res){
          //TODO wenn der User in der finalen Version zuvor gelöscht wird muss es hier eine 200 Meldung geben
          expect(res.statusCode).to.equal(302);
          expect('Location', '/user/login');
          User.find({username: loginCredentials.username}).exec().then(testuser => {
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
    //Testet ob mit einem angemeldeten User eine Route in der Datenbank abgespeichert werden kann
    describe('Test auf Create und Delete', function() {
        /**
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
                    **/
        it('sollte eine Route anlegen', function(done){
            authenticatedUser.post('/route/create/')
            .send(testroute)
            .expect('Location', '/route/manage/' + userid)
            .end(function(err, res){
              res.should.have.status(302);
              res.body.should.be.a('object');
              Route.findOne({type: testroute.type, name: testroute.name, description: testroute.description}).exec().then(troute => {
                console.log("die id der route", troute._id);
                console.log("die route", troute);
                routeid = troute._id;
                done();
              });
            });
        });
        /**
        it('sollte nichts löschen, da die Route ID nicht existiert', function(done) {
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
        **/
        it('sollte die erstellte Route löschen', function(done) {
                            console.log("die user id", userid);
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
                            expect(before).to.not.equal(after);
                            done();
                        });
                    });
            });
            it('sollte keine neuen Begegnungen mit maxmuster01 anlegen', function(done) {
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
    });
/**
    //TODO die APIS anbindungen testen
    describe('Testen der APIs', function() {
        describe('here API', function() {
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
        });
        describe('movebank API', function() {
            beforeEach(function(done) {
                const testanimal = {
                  study_id: "446579",
                  individual_local_identifier: "1790 - Radolfzell JC72014",
                  sensor_type: "gps"
                };

                nock("https://www.movebank.org", {
                reqheaders: {
                        'Authorization': 'Basic ' + Buffer.from(token.MOVEBANK_USERNAME + ':' + token.MOVEBANK_PASSWORD ).toString('base64')
                    }})
                .get("/movebank/service")
                .send(testanimal)
                //.get("/json-auth?&study_id=16880941&individual_local_identifiers[]=Mary&individual_local_identifiers[]=Butterball&individual_local_identifiers[]=Schaumboch&&max_events_per_individual=2000&sensor_type=gps")
                .reply(200, response);
                done();
            });

              it('sollte mit der API verbunden werden', (done) => {
                return authenticatedUser
                .post('/api/movebank')
                .send(testanimal)
                .end(function(response){
                    expect(typeof response).to.equal('object');
                    expect(response.individual_taxon_canonical_name).to.equal('Anas platyrhynchos')
                  });
              });

                  /**
                            it('falscher Test', (done) => {
                              // Then try to authenticate:

                              var endpoint = "https://www.movebank.org/movebank/service/json-auth?&study_id=16880941&individual_local_identifiers[]=Mary&individual_local_identifiers[]=Butterball&individual_local_identifiers[]=Schaumboch&&max_events_per_individual=2000&sensor_type=gps";
                              var usernameMovebank = token.MOVEBANK_USERNAME;
                              var passwordMovebank = token.MOVEBANK_PASSWORD;
                              const options = {
                                headers: {
                                  'Authorization': 'Basic ' + Buffer.from(usernameMovebank + ':' + passwordMovebank).toString('base64')
                                }
                                  };

                              https.get(endpoint, options, (httpResponse) => {
                                var body = "";
                                httpResponse.on("data", (chunk) => {
                                  body += chunk;
                                  done();
                                });
                               })
                            });
                              **/
/**
        });
        describe('openweathermap API', function() {
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

        });
    });
    /**
    after(function() {
        //TODO den User lösche, damit sollten dann alles anhängende gelöscht werden
                 User.find({username: username}).remove().exec();
    });
    **/
});
