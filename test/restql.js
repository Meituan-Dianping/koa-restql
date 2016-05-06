'use strict'

const Restql = require('../lib/Restql');
const common = require('./common');

const koa     = common.koa;
const util    = common.util;
const http    = common.http;
const Router  = common.Router;
const assert  = common.assert;
const request = common.request;
const debug   = common.debug('koa-restql:test:restql');

describe ('Restql', function () {
  it ('creates new Restql', function (done) {
   
    let restql = new Restql(common.sequelize.models);

    assert(restql instanceof Restql);
    done();
  })

  describe ('middlewares', function () {
    let server;

    before (function () {
      let app = koa();
      let restql = new Restql(common.sequelize.models)

      app.use(restql.routes());
      server = request(http.createServer(app.callback()));
    })

    it ('should return a new user object', function (done) {

      let user = {
        login : 'Sam',
        email : 'Sammy@gmail.com'
      }

      server
        .post('/user')
        .send(user)
        .expect(201)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(body.login);
          assert(body.login === 'Sam');
          done();
        })
    })

    it ('should return a new user tag', function (done) {

      let tag = {
        name : 'ghost hunter'
      }

      server
        .post('/user/3/tags')
        .send(tag)
        .expect(201)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(body.name);
          assert(body.name === tag.name);
          done();
        })
    })

    it ('should update a user profile', function (done) {

      let profile = {
        description : 'I am little smart dean'
      }

      server
        .put('/user/3/profile')
        .send(profile)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(body.description);
          assert(body.description === profile.description);
          done();
        })
    })

    it.only ('should delete a user', function (done) {

      server
        .delete('/user/3')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          done();
        })
    })

    it ('should delete a user profile', function (done) {

      server
        .delete('/user/3/profile')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          done();
        })
    })

    it.only ('should delete a user tag', function (done) {

      server
        .delete('/user/3/tags/1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          done();
        })
    })

    it ('should update a user tag', function (done) {

      let data = {
        name : 'hacker 123'
      }

      server
        .put('/user/1/tags/1')
        .send(data)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(body.name);
          assert(body.name === data.name);
          done();
        })
    })

    it ('should update a user department', function (done) {

      let data = {
        description : 'Seaview, Beach Patio, Dog'
      }

      server
        .put('/user/1/departments/2')
        .send(data)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(body.description);
          assert(body.description === data.description);
          done();
        })
    })

    it ('should return a user array', function (done) {
      server
        .get('/user')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          assert(Array.isArray(body));
          assert(body.length === 2);
          done();
        })
    })

    it ('should return an object', function (done) {
      server
        .get('/user/1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          debug(res.body);
          done();
        })
    })
    
    it ('should return an user profile', function (done) {
      server
        .get('/user/1/profile')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          debug(res.body);
          done();
        })
    })

    it ('should return an object', function (done) {
      server
        .get('/user/1/departments')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          debug(res.body);
          done();
        })
    })

    it ('should return an object', function (done) {
      server
        .get('/user/1/tags')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          debug(res.body);
          done();
        })
    })

    it ('should return an object', function (done) {
      server
        .get('/user/1/tags/1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          debug(res.body);
          done();
        })
    })
  })

})

