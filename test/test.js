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
//Routerdateien
var app = require('../app');
const Route = require('../models/route');
const User = require('../models/user');

chai.use(chaiHttp);

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
    geometry: '[[7.63196,51.95471],[7.63202,51.95478]]'
}
var authenticatedUser = request.agent(app);

//die userid soll die ID des eingeloggten Users speichern
var username = loginCredentials.username;
var userid;
    User.find({username: username}).exec().then(testuser => {
    userid = testuser[0]._id;
    });
//Die ID der angelgten Route
var routeid;

describe('Login notwendige Funktionen', function() {

    before(function(done){
      authenticatedUser
        .post('/user/signup')
        .send(userCredentials)
        .end(function(err, res){
          expect(res.statusCode).to.be.oneOf([200, 302]);
          expect('Location', '/user/login');
          done();
      });
    });

    before(function(done){
           authenticatedUser
              .post('/user/login')
              .send(loginCredentials)
              .end(function(err, res){
                  expect(res.statusCode).to.equal(302);
                  expect('Location', '/');
                done();
              });
    });

/**
    after(function() {
        authenticatedUser
                      .get('/user/logout')
                      .end(function(err, res){
                          expect(res.statusCode).to.equal(302);
                          expect('Location', '/');
                        done();
                      });
    });
**/
    describe('GET /route/create', function(done){
        //addresses 1st bullet point: if the user is logged in we should get a 200 status code
          it('should return a 200 response if the user is logged in', function(done){
            authenticatedUser.get('/route/create')
            .expect(200, done);
            });
        //addresses 2nd bullet point: if the user is not logged in we should get a 302 response code and be directed to the /login page
          it('should return a 302 response and redirect to /login', function(done){
            request(app).get('/route/create')
            .expect('Location', '/user/login')
            .expect(302, done);
          });
    });

    describe('POST /route/create', function() {
        it('should create a Route', function(done) {
          //oder die Route hier anlegen
          authenticatedUser
            .post('/route/create')
            .send(testroute)
            .end(function(err, res){




                  res.should.have.status(302);
                  res.body.should.be.a('object');
                  done();
                  Route.findOne({type: testroute.type, name: testroute.name, description: testroute.description}).exec().then(troute => {
                                                    console.log("das ist die angelegte route", troute);
                                                    routeid = troute._id;
                                                    console.log(routeid);
                                                    deletetest();
                                                    });

            });
            //die routeid soll die ID der erstellten Route speichern


        });
    });

   function deletetest(){ describe('Delete-Test', function() {
        it('should delete a SINGLE route on /routes/delete/<route_id> DELETE', function(done) {
          //oder die Route hier anlegen
          authenticatedUser
            .get('/route/delete/' + routeid)
            .end(function(err, res){
                  res.should.have.status(302);
                  res.body.should.be.a('object');
                  //hier noch drauf testen dass die wirklich weg ist
                  //die id muss asynchron gespeichert wereden sonst wird das hier nichts glaube ich
                  done();
              });
            });
        });
}

 });
/**
//TODO
//hier noch den test, um begegnungen zu testen
 describe('Testing API', function() {

     before(function(done){
       authenticatedUser
         .post('/user/signup')
         .send(userCredentials)
         .end(function(err, res){
           expect(res.statusCode).to.be.oneOf([200, 302]);
           expect('Location', '/user/login');
           done();
       });
     });

     before(function(done){
            authenticatedUser
               .post('/user/login')
               .send(loginCredentials)
               .end(function(err, res){
                   expect(res.statusCode).to.equal(302);
                   expect('Location', '/');
                 done();
               });
     });

   describe('POST ', function() {
         it('should irgendwas machen', function(done) {
           authenticatedUser
             .post('/api/encounter')
             .send(testroute)
             .end(function(err, res){
                   res.should.have.status(302);
                   res.body.should.be.a('object');

                   done();
             });
         });
     });


  });
**/