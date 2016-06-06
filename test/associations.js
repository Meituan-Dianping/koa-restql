'use strict'

const Restql = require('../lib/Restql');
const common = require('./lib/common');

const qs      = common.qs;
const koa     = common.koa;
const util    = common.util;
const http    = common.http;
const Router  = common.Router;
const assert  = common.assert;
const request = common.request;
const models  = common.sequelize.models;
const debug   = common.debug('koa-restql:test:middlewares');

describe ('association ignore', function () {

  beforeEach (function (done) {
    /*
     * clean db
     */
    debug('clean db');
    common.loadMockData().then(() => {
      done();
    }).catch(err => {
      done(err);
    });
  })

  const setupServer = (models) => {
    let app = koa();
    let restql = new Restql(models);

    app.use(restql.routes());
    let server = request(http.createServer(app.callback()));

    return server;
  }

  let data = {
    description: 'new department'
  };

  describe ('ignore is true', function () {

    models.user.hasMany(models.department, {
      as: 'departments',
      foreignKey: 'user_id',
      constraints: false,
      restql: {
        ignore: true
      }
    })

    let server = setupServer(models);

    it ('should return 404 not found when get', function (done) {

      server
        .get(`/user/1/departments`)
        .expect(404)
        .end(done);
    })

    it ('should return 404 not found when post', function (done) {

      server
        .post(`/user/1/departments`)
        .send(data)
        .expect(404)
        .end(done);

    })

    it ('should return 404 not found when get a deparment', function (done) {
      models.department.findAll({
        where: {
          user_id: 1
        }
      }).then(departments => {
        let department = departments[0];
        server
          .get(`/user/1/departments/${department.id}`)
          .expect(404)
          .end(done);
      })

    })

    it ('should return 404 not found when put', function (done) {

      models.department.findAll({
        where: {
          user_id: 1
        }
      }).then(departments => {
        let department = departments[0];
        server
          .put(`/user/1/departments/${department.id}`)
          .send(data)
          .expect(404)
          .end(done);
      })

    })

    it ('should return 404 not found when del', function (done) {

      models.department.findAll({
        where: {
          user_id: 1
        }
      }).then(departments => {
        let department = departments[0];
        server
          .delete(`/user/1/departments/${department.id}`)
          .expect(404)
          .end(done);
      })

    })
  })

  describe ('ignore is array', function () {

    models.user.hasMany(models.department, {
      as: 'departments',
      foreignKey: 'user_id',
      constraints: false,
      restql: {
        ignore: ['get']
      }
    })

    let server = setupServer(models);
    let data = {
      description: 'new department'
    };

    it ('should return 404 not found when get', function (done) {
      
      server
        .get(`/user/1/departments`)
        .expect(404)
        .end(done);

    })

    it ('should return 201 not found when post', function (done) {

      server
        .post(`/user/1/departments`)
        .send(data)
        .expect(201)
        .end(done);

    })

    it ('should return 404 not found when get a deparment', function (done) {

      models.department.findAll({
        where: {
          user_id: 1
        }
      }).then(departments => {
        let department = departments[0];
        server
          .get(`/user/1/departments/${department.id}`)
          .expect(404)
          .end(done);
      })

    })

    it ('should return 201 not found when put', function (done) {
      
      models.department.findAll({
        where: {
          user_id: 1
        }
      }).then(departments => {
        let department = departments[0];
        server
          .put(`/user/1/departments/${department.id}`)
          .send(data)
          .expect(200)
          .end(done);
      })

    })

    it ('should return 404 not found when del', function (done) {

      models.department.findAll({
        where: {
          user_id: 1
        }
      }).then(departments => {
        let department = departments[0];
        server
          .delete(`/user/1/departments/${department.id}`)
          .expect(204)
          .end(done)
      })

    })
  })
})


