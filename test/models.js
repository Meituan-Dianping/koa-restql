'use strict'

const qs      = require('qs')
const koa     = require('koa')
const http    = require('http')
const uuid    = require('node-uuid')
const assert  = require('assert')
const request = require('supertest')
const debug   = require('debug')('koa-restql:test:models')

const test    = require('./lib/test')
const prepare = require('./lib/prepare')
const RestQL  = require('../lib/RestQL')

const models  = prepare.sequelize.models

describe ('model routers', function () {

  let server

  before (function () {

    let app = koa()
      , restql = new RestQL(models)

    app.use(restql.routes())
    server = request(http.createServer(app.callback()))

  })

  beforeEach (function (done) {

    debug('reset db')
    prepare.loadMockData().then(() => {
      done()
    }).catch(done)  

  })

  describe ('user | with single field unique index', function () {

    const model = models.user

    it ('should return 200 | get /user', function (done) {

      server
        .get('/user')
        .expect(200)
        .end((err, res) => {

          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)
          assert(body.length === 2)
          done()

        })

    })

    it ('should return 201 | post /user, object body', function (done) {

      const data = {
        name     : 'Li Xin',
        nickname : 'xt'
      }

      server
        .post(`/user`)
        .send(data)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err)
          let body = res.body
          assert(typeof body === 'object')
          debug(body)

          test.assertObject(body, data)
          test.assertModelById(model, body.id, data, done).catch(done)
        })
    })

    it ('should return 201 | post /user, object body, with object include create new character', function (done) {

      const data = {
        name     : 'Li Xin',
        nickname : 'xt',
        characters: { name: uuid() }
      }

      server
        .post(`/user`)
        .send(data)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err)
          let body = res.body
          assert(typeof body === 'object')
          debug(body)
          assert(body.id)
          assert(Array.isArray(body.characters))
          assert(body.characters)

          delete data.characters

          test.assertObject(body, data)
          test.assertModelById(model, body.id, data, done).catch(done)
        })

    })

    it ('should return 409 | post /user, object body, with object include', function (done) {

      models.character.findAll().then(res => ({
        name     : 'Li Xin',
        nickname : 'xt',
        characters: res[0]
      })).then(data => {

        server
          .post(`/user`)
          .send(data)
          .expect(409)
          .end(done)

      })

    })

    it ('should return 201 | post /user, object body, with array include', function (done) {

      const data = {
        name     : 'Li Xin',
        nickname : 'xt',
        characters: [
          { name: uuid() }
        ]
      }

      server
        .post(`/user`)
        .send(data)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err)
          let body = res.body
          assert(typeof body === 'object')
          debug(body)
          assert(body.id)
          assert(Array.isArray(body.characters))
          assert(body.characters)

          delete data.characters

          test.assertObject(body, data)
          test.assertModelById(model, body.id, data, done).catch(done)
        })

    })

    it ('should return 201 | post /user, array body', function (done) {

      const data = [{
        name: 'Li Xin'
      }, {
        name: 'yadan'
      }]

      server
        .post(`/user`)
        .send(data)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)

          let promises = data.map((row, index) => {
            test.assertObject(body[index], row) 
            return test.assertModelById(model, body[index].id, row)
          })

          Promise.all(promises)
            .then(() => done())
            .catch(done)
        })
    })

    it ('should return 201 | put /user, object body', function (done) {

      const data = {
        name     : 'Li Xin',
        nickname : 'xt'
      }

      server
        .put(`/user`)
        .send(data)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err)
          let body = res.body
          assert(typeof body === 'object')
          debug(body)

          test.assertObject(body, data) 
          test.assertModelById(model, body.id, data, done).catch(done)
        })
    })

    it ('should return 201 | put /user, object body, without name', function (done) {

      const data = {
        nickname : 'xt',
        characters: []
      }

      server
        .put(`/user`)
        .send(data)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err)
          let body = res.body
          assert(typeof body === 'object')
          debug(body)

          delete data.characters
          test.assertObject(body, data) 
          test.assertModelById(model, body.id, data, done).catch(done)
        })
    })

    it ('should return 200 | put /user, object body', function (done) {

      const id = 2

      models.user.findById(id).then(data => {

        data = data.dataValues
        delete data.created_at
        delete data.updated_at
        delete data.deleted_at

        data.nickname = uuid()

        server
          .put(`/user`)
          .send(data)
          .expect(200)
          .end((err, res) => {
            if (err) return done(err)
            let body = res.body
            assert(typeof body === 'object')
            debug(body)

            test.assertObject(body, data) 
            test.assertModelById(model, body.id, data, done).catch(done)
          })

      })

    })

    it ('should return 201 | put /user, array body', function (done) {

      const data = [{
        name: 'Li Xin'
      }, {
        name: 'yadan'
      }]

      server
        .put(`/user`)
        .send(data)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err)
          let body = res.body
          assert(Array.isArray(body))
          debug(body)

          let promises = data.map((row, index) => {
            test.assertObject(body[index], row) 
            return test.assertModelById(model, body[index].id, row)
          })

          Promise.all(promises)
            .then(() => done())
            .catch(done)
        })
    })

    it ('should return 204 | delete /user', function (done) {

      const where = {
        $or: [{ id: 1 }, { id: 2 }]
      }

      const querystring = qs.stringify(where)

      server
        .del(`/user?${querystring}`)
        .expect(204)
        .end((err, res) => {

          if (err) return done(err)
          models.user.findAll({
            where
          }).then(data => {
            assert(!data.length)
            done()
          }).catch(done)

        })

    })

    describe ('unique key constraint error', function () {

      it ('should return 409 | post /user, object body', function (done) {

        const id = 1

        models.user.findById(id).then(data => {

          data = data.dataValues
          delete data.id
          delete data.created_at
          delete data.updated_at
          delete data.deleted_at

          server
            .post(`/user`)
            .send(data)
            .expect(409)
            .end(done)
        })

      })

      it ('should return 409 | post /user, array body', function (done) {

        const ids = [1, 2]

        models.user.findAll({
          where: {
            id: ids
          }
        }).then(data => {

          data = data.map(row => {
            row = row.dataValues
            delete row.id
            delete row.created_at
            delete row.updated_at
            delete row.deleted_at
            return row
          })

          server
            .post(`/user`)
            .send(data)
            .expect(409)
            .end(done)
        })

      })

      it ('should return 201 | post /user, object body', function (done) {

        const id = 2

        models.user.findById(id).then(data => {
          return models.user.destroy({
            where: {
              id: data.id
            }
          }).then(() => {
            return models.user.findById(id)
          }).then(res => {
            assert(!res)
            return data
          })
        }).then(data => {

          data = data.dataValues
          delete data.created_at
          delete data.updated_at
          delete data.deleted_at

          data.nickname = uuid()
          debug(data)

          server
            .post(`/user`)
            .send(data)
            .expect(201)
            .end((err, res) => {
              if (err) return done(err)
              let body = res.body
              assert(typeof body === 'object')
              debug(body)

              test.assertObject(body, data)
              test.assertModelById(model, body.id, data, done).catch(done)
            })
        })

      })

      it ('should return 201 | post /user, array body', function (done) {

        const ids = [2]

        models.user.findAll({
          where: {
            id: ids
          }     
        }).then(data => {
          return models.user.destroy({
            where: {
              id: ids
            }
          }).then(() => {
            return models.user.findAll({
              where: {
                id: ids
              }
            })
          }).then(res => {
            assert(!res.length)
            return data
          })
        }).then(data => {

          data = data.map(row => {
            row = row.dataValues
            row.nickname = uuid()
            delete row.id
            delete row.created_at
            delete row.updated_at
            delete row.deleted_at
            return row
          })

          server
            .post(`/user`)
            .send(data)
            .expect(201)
            .end((err, res) => {
              if (err) return done(err)
              let body = res.body
              assert(Array.isArray(body))
              debug(body)

              let promises = data.map((row, index) => {
                test.assertObject(body[index], row) 
                return test.assertModelById(model, body[index].id, row)
              })

              Promise.all(promises)
                .then(() => done())
                .catch(done)
            })
        })

      })

    })

    it ('should return 200 | get /user/:id', function (done) {

      const id = 1

      server
        .get(`/user/${id}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err)
          let body = res.body
          assert(typeof body === 'object')
          debug(body)
          assert(body.id === id)
          done()
        })
    })

    it ('should return 404 | get /user/:id', function (done) {

      const id = 100

      server
        .get(`/user/${id}`)
        .expect(404)
        .end(done)

    })

    it ('should return 200 | put /user/:id', function (done) {

      const id = 1

      const data = {
        id: id,
        nickname: uuid()
      }

      server
        .put(`/user/${id}`)
        .send(data)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err)
          let body = res.body
          assert(typeof body === 'object')
          debug(body)

          test.assertObject(body, data)
          test.assertModelById(model, body.id, data, done).catch(done)
        })
    })

    it ('should return 204 | delete /user/:id', function (done) {

      const id = 2

      server
        .del(`/user/${id}`)
        .expect(204)
        .end((err, res) => {

          if (err) return done(err)

          models.user.findById(id).then(data => {
            assert(!data)
            done()
          }).catch(done)

        })

    })

  })

  describe ('user_characters | with multi-field unique index', function () {

    const model = models.user_characters

    describe ('unique key constraint error', function () {

      it ('should return 409 | post /user_characters, object body', function (done) {

        const id = 1

        model.findById(id).then(data => {

          data = data.dataValues
          delete data.id
          delete data.created_at
          delete data.updated_at
          delete data.deleted_at

          server
            .post(`/user_characters`)
            .send(data)
            .expect(409)
            .end(done)
        })

      })

      it ('should return 409 | post /user_characters, array body', function (done) {

        const ids = [1, 2]

        model.findAll({
          where: {
            id: ids
          }
        }).then(data => {

          data = data.map(row => {
            row = row.dataValues
            delete row.id
            delete row.created_at
            delete row.updated_at
            delete row.deleted_at
            return row
          })

          server
            .post(`/user_characters`)
            .send(data)
            .expect(409)
            .end(done)
        })

      })

      it ('should return 201 | post /user_characters, object body', function (done) {

        const id = 2

        model.findById(id).then(data => {
          return model.destroy({
            where: {
              id: data.id
            }
          }).then(() => {
            return model.findById(id)
          }).then(res => {
            assert(!res)
            return data
          })
        }).then(data => {

          data = data.dataValues
          delete data.created_at
          delete data.updated_at
          delete data.deleted_at

          data.rate = 0
          debug(data)

          server
            .post(`/user_characters`)
            .send(data)
            .expect(201)
            .end((err, res) => {
              if (err) return done(err)
              let body = res.body
              assert(typeof body === 'object')
              debug(body)

              test.assertObject(body, data)
              test.assertModelById(model, id, data, done)
              .catch(done)
            })
        })

      })

      it ('should return 201 | post /user_characters, array body', function (done) {

        const ids = [2]

        model.findAll({
          where: {
            id: ids
          }     
        }).then(data => {
          return model.destroy({
            where: {
              id: ids
            }
          }).then(() => {
            return model.findAll({
              where: {
                id: ids
              }
            })
          }).then(res => {
            assert(!res.length)
            return data
          })
        }).then(data => {

          data = data.map(row => {
            row = row.dataValues
            row.rate = 0
            delete row.id
            delete row.created_at
            delete row.updated_at
            delete row.deleted_at
            return row
          })

          debug(data)

          server
            .post(`/user_characters`)
            .send(data)
            .expect(201)
            .end((err, res) => {
              if (err) return done(err)
              let body = res.body
              assert(Array.isArray(body))
              debug(body)

              let promises = data.map((row, index) => {
                test.assertObject(body[index], row)
                return test.assertModelById(model, body[index].id, row)
              })

              Promise.all(promises)
                .then(() => done())
                .catch(done)
            })
        })

      })

    })

  })

  describe ('characters | with schema', function () {

    const model = models.character

    it ('should return 200 | get /gameofthrones/character', function (done) {

      model.count().then(count => {

        server
          .get('/gameofthrones/character')
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert(Array.isArray(body))
            debug(body)
            assert(body.length === count)
            done()

          })
        }).catch(done)

    })

  })

})
