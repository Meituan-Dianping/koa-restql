'use strict'

const Restql = require('../lib/index');
const common = require('./common');

const koa     = common.koa;
const util    = common.util;
const http    = common.http;
const Router  = common.Router;
const assert  = common.assert;
const request = common.request;
const debug   = common.debug('koa-restql:test:restql');

describe ('Restql', function () {
  it ('creates new restql', function (done) {
   
    let restql = new Restql({
      sequelize: common.sequelize
    });

    assert(restql instanceof Restql);
    done();
  })

  describe ('mounts restql router', function () {
    let server;

    before (function () {
      let app = koa();
      let restql = new Restql({
        sequelize: common.sequelize
      });

      app.use(restql.routes());
      debug(restql.routes().router);
      server = request(http.createServer(app.callback()));
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
  })

})

