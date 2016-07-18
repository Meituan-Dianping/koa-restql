'use strict'

const qs      = require('qs')
const koa     = require('koa')
const http    = require('http')
const uuid    = require('node-uuid')
const assert  = require('assert')
const request = require('supertest')
const debug   = require('debug')('koa-restql:test:associations')

const test    = require('./lib/test')
const prepare = require('./lib/prepare')
const RestQL  = require('../lib/RestQL')

const models  = prepare.sequelize.models

describe ('model association routers', function () {

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

  describe ('hasOne association', function () {
    
    const model       = models.house
    const association = models.seat

    it ('should return 200 | get /house/:id/seat', function (done) {

      const id = 2

      model.findById(id).then(data => {

        server
          .get(`/gameofthrones/house/${id}/seat`)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.house_id === id)
            done()

          })

      }).catch(done)

    })

    it ('should return 200 | put /house/:id/seat', function (done) {

      const id = 2
      const data = {
        name: uuid()
      }

      model.findById(id).then(house => {

        server
          .put(`/gameofthrones/house/${id}/seat`)
          .send(data)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.house_id === id)
            test.assertObject(body, data)
            test.assertModelById(association, body.house_id, data, done)

          })

      }).catch(done)

    })

    it ('should return 201 | put /house/:id/seat', function (done) {

      const id = 2
      const data = {
        name: uuid()
      }

      association.destroy({
        where: {
          house_id: id
        }      
      }).then((row) => {
        assert(row)
        return model.findById(id)
      }).then(house => {

        server
          .put(`/gameofthrones/house/${id}/seat`)
          .send(data)
          .expect(201)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.house_id === id)
            test.assertObject(body, data)
            test.assertModelById(association, body.house_id, data, done)

          })

      }).catch(done)

    })

    it ('should return 204 | delete /house/:id/seat', function (done) {

      const id = 2

      association.find({
        where: {
          house_id: id
        }
      }).then(seat => {
        assert(seat)
        return model.findById(id)
      }).then(house => {

        server
          .del(`/gameofthrones/house/${id}/seat`)
          .expect(204)
          .end((err, res) => {

            association.find({
              where: {
                house_id: id
              },
            }).then(data => {
              assert(!data)
              done()
            })

          })

      }).catch(done)

    })

    it ('should return 404 | delete /house/:id/seat', function (done) {

      const id = 2

      association.destroy({
        where: {
          house_id: id
        }
      }).then(row => {
        assert(row)
        return model.findById(id)
      }).then(house => {

        server
          .del(`/gameofthrones/house/${id}/seat`)
          .expect(404)
          .end(done)

      }).catch(done)

    })

  })

  describe ('belongsTo association', function () {

    const model       = models.seat
    const association = models.house

    it ('should return 200 | get /seat/:id/house', function (done) {

      const id = 3

      model.findById(id).then(data => {

        server
          .get(`/gameofthrones/seat/${id}/house`)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.id === data.house_id)
            done()

          })

      }).catch(done)

    })

    it ('should return 200 | put /seat/:id/house', function (done) {

      const id = 3
      const data = {
        name: uuid()
      }

      model.findById(id).then(seat => {

        server
          .put(`/gameofthrones/seat/${id}/house`)
          .send(data)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.id === seat.house_id)
            test.assertObject(body, data)
            test.assertModelById(association, seat.house_id, data, done)

          })

      }).catch(done)

    })
    
    it ('should return 201 | put /seat/:id/house', function (done) {

      const id = 2
      const data = {
        name: uuid()
      }

      model.findById(id).then(seat => {
        return association.destroy({
          where: {
            id: seat.house_id
          }
        }).then((row) => {
          assert(row)
          return seat
        })
      }).then(seat => {

        server
          .put(`/gameofthrones/seat/${id}/house`)
          .send(data)
          .expect(201)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)

            model.findById(id).then(seat => {
              assert(body.id === seat.house_id)
              test.assertObject(body, data)
              test.assertModelById(association, seat.house_id, data, done)
            })

          })

      }).catch(done)

    })

    it ('should return 204 | delete /seat/:id/house', function (done) {

      const id = 2

      model.findById(id).then(seat => {
        return association.findById(seat.house_id).then(house => {
          assert(house)
          return seat
        })
      }).then(seat => {

        server
          .del(`/gameofthrones/seat/${id}/house`)
          .expect(204)
          .end((err, res) => {

            association.findById(seat.house_id).then(data => {
              assert(!data)
              done()
            })

          })

      }).catch(done)

    })
  })

  describe ('hasMany association', function () {

    const model       = models.house
    const association = models.character

    it ('should return 200 | get /house/:id/members', function (done) {

      const id = 1

      model.findById(id).then(data => {

        server
          .get(`/gameofthrones/house/${id}/members`)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert(Array.isArray(body))
            debug(body)
            assert(body.length === 2)
            done()

          })

      }).catch(done)

    })

    it ('should return 201 | post /house/:id/members, object body', function (done) {

      const id = 1
      const data = {
        name: 'Sansa'  
      }

      model.findById(id).then(house => {

        server
          .post(`/gameofthrones/house/${id}/members`)
          .send(data)
          .expect(201)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.id)
            assert(body.house_id === house.id)
            test.assertObject(body, data)
            test.assertModelById(association, body.id, data, done)

          })

      }).catch(done)

    })

    it ('should return 201 | post /house/:id/members, array body', function (done) {

      const id = 1
      const data = [{
        name: 'Sansa'  
      }, {
        name: 'Bran'
      }]

      model.findById(id).then(house => {

        server
          .post(`/gameofthrones/house/${id}/members`)
          .send(data)
          .expect(201)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert(Array.isArray(body))
            debug(body)

            assert(body.length === data.length)

            const promises = body.map((character, index) => {
              assert(character.id)
              assert(character.house_id === house.id)
              test.assertObject(character, data[index])
              return test.assertModelById(association, 
                character.id, data[index])
            })

            Promise.all(promises).then(() => done())

          })

      }).catch(done)

    })

    describe ('unique key constraint error', function () {

      it ('should return 409 | post /house/:id/members, object body', function (done) {

        const id = 1
        association.find({
          where: {
            house_id: id
          }
        }).then(character => {
         
          character = character.dataValues
          delete character.id
          delete character.created_at
          delete character.updated_at
          delete character.deleted_at

          debug(character)

          server
            .post(`/gameofthrones/house/${id}/members`)
            .send(character)
            .expect(409)
            .end(done)
          
        }).catch(done)
      
      })

      it ('should return 409 | post /house/:id/members, array body', function (done) {

        const id = 1

        association.findAll({
          where: {
            house_id: id
          }
        }).then(characters => {

          characters = characters.map(character => {
            character = character.dataValues
            delete character.id
            delete character.created_at
            delete character.updated_at
            delete character.deleted_at
            return character
          })

          characters.push({
            name: 'Sansa'
          })
         
          debug(characters)

          server
            .post(`/gameofthrones/house/${id}/members`)
            .send(characters)
            .expect(409)
            .end((err, res) => {
              
              if (err) return done(err)

              association.findAll({
                where: {
                  house_id: id
                }
              }).then(data => {
                assert(data.length === characters.length - 1)
                assert(!data.find(row => row.name === 'Sansa'))
                done()
              })
            })
          
        }).catch(done)
      
      })

      it ('should return 201 | post /house/:id/members, object body', function (done) {

        const id = 1

        association.find({
          where: {
            house_id: id
          }
        }).then(character => {
          return character.destroy().then(() => {
            return association.findById(character.id).then(data => {
              assert(!data)
              return character.dataValues
            })
          })
        }).then(character => {

          delete character.id
          delete character.created_at
          delete character.updated_at
          delete character.deleted_at

          server
            .post(`/gameofthrones/house/${id}/members`)
            .send(character)
            .expect(201)
            .end((err, res) => {

              if (err) return done(err)
              let body = res.body
              assert('object' === typeof body)
              debug(body)
              assert(body.id)
              assert(body.house_id === id)
              test.assertObject(body, character)
              test.assertModelById(association, body.id, character, done)

            })

        }).catch(done)

      })

      it ('should return 201 | post /house/:id/members, array body', function (done) {

        const id = 1

        const where = { house_id: id }

        association.findAll({ where }).then(characters => {
          return association.destroy({ where }).then(() => {
            return association.findAll({ where }).then(data => {
              assert(!data.length)
              return characters
            })
          })
        }).then(characters => {

          characters = characters.map(character => {

            character = character.dataValues

            delete character.id
            delete character.created_at
            delete character.updated_at
            delete character.deleted_at

            return character
          })

          characters.push({
            name: 'Sansa'
          })

          server
            .post(`/gameofthrones/house/${id}/members`)
            .send(characters)
            .expect(201)
            .end((err, res) => {

              if (err) return done(err)
              let body = res.body
              assert(Array.isArray(body))
              debug(body)

              let promises = body.map((character, index) => {
                assert(character.id)
                assert(character.house_id === id)
                test.assertObject(character, characters[index])
                test.assertModelById(association, character.id, characters[index])
              })

              Promise.all(promises).then(() => done())
            })

        }).catch(done)

      })

    })

    it ('should return 201 | put /house/:id/members, object body', function (done) {

      const id = 1
      const data = {
        name: 'Sansa'  
      }

      model.findById(id).then(house => {

        server
          .put(`/gameofthrones/house/${id}/members`)
          .send(data)
          .expect(201)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.id)
            assert(body.house_id === house.id)
            test.assertObject(body, data)
            test.assertModelById(association, body.id, data, done)

          })

      }).catch(done)

    })

    it ('should return 200 | put /house/:id/members, object body', function (done) {

      const id = 1
      const data = {
        name: 'Jon',
        is_bastard: false
      }

      model.findById(id).then(house => {

        server
          .put(`/gameofthrones/house/${id}/members`)
          .send(data)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.id)
            assert(body.house_id === house.id)
            test.assertObject(body, data)
            test.assertModelById(association, body.id, data, done)

          })

      }).catch(done)

    })

    it ('should return 200 | put /house/:id/members, array body', function (done) {

      const id = 1
      const data = [{
        name: 'Sansa'  
      }, {
        name: 'Bran'
      }, {
        name: 'Jon',
        is_bastard: false
      }]

      model.findById(id).then(house => {

        server
          .put(`/gameofthrones/house/${id}/members`)
          .send(data)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert(Array.isArray(body))
            debug(body)

            assert(body.length === data.length)

            const promises = body.map((character, index) => {
              assert(character.id)
              assert(character.house_id === house.id)
              test.assertObject(character, data[index])
              return test.assertModelById(association, 
                character.id, data[index])
            })

            Promise.all(promises).then(() => done())

          })

      }).catch(done)

    })

    it ('should return 200 | put /house/:id/members/:associationId, object body', function (done) {

      const id = 1
      const data = {
        name: 'Jon',
        is_bastard: false
      }

      association.find({
        where: {
          house_id: id
        }
      }).then(character => {

          server
            .put(`/gameofthrones/house/${id}/members/${character.id}`)
            .send(data)
            .expect(200)
            .end((err, res) => {

              if (err) return done(err)
              let body = res.body
              assert('object' === typeof body)
              debug(body)
              assert(body.id)
              assert(body.house_id === id)
              test.assertObject(body, data)
              test.assertModelById(association, body.id, data, done)

            })

      }).catch(done)

    })

    it ('should return 404 | delete /house/:id/members, object body', function (done) {

      const id = 100

      server
        .del(`/gameofthrones/house/${id}/members`)
        .expect(404)
        .end(done)

    })

    it ('should return 204 | delete /house/:id/members, destroy nothing', function (done) {

      const id = 1
      const where = {
        house_id: id
      }

      association.count({
        where
      }).then(count => {

        server
          .del(`/gameofthrones/house/${id}/members`)
          .expect(204)
          .end((err, res) => {

            if (err) return done(err)
            debug(count)

            association.count({ where }).then(newCount => {
              assert(newCount === count)
              done()
            }).catch(done)

          })
      })

    })

    it ('should return 204 | delete /house/:id/members', function (done) {

      const id = 1
      const where = {
        name: 'Jon'
      }

      const querystring = qs.stringify(where)

      association.findAll({ where }).then(characters => {
        
        assert(characters.length)

        server
          .del(`/gameofthrones/house/${id}/members?${querystring}`)
          .expect(204)
          .end((err, res) => {

            if (err) return done(err)

            association.findAll({ where }).then(characters => {
              assert(!characters.length)
              done()
            }).catch(done)

          })
      })

    })

    it ('should return 404 | put /house/:id/members/:associationId, wrong id', function (done) {

      const id = 100
      const associationId = 100

      const data = {
        name: 'Arya',
      }

      server
        .put(`/gameofthrones/house/${id}/members/${associationId}`)
        .send(data)
        .expect(404)
        .end(done)

    })

    it ('should return 404 | put /house/:id/members/:associationId, wrong associationId', function (done) {

      const id = 1
      const associationId = 4

      const data = {
        name: 'Arya',
      }

      server
        .put(`/gameofthrones/house/${id}/members/${associationId}`)
        .send(data)
        .expect(404)
        .end(done)

    })

    it ('should return 409 | put /house/:id/members/:associationId, object body', function (done) {

      const id = 1
      const data = {
        name: 'Arya',
      }

      association.find({
        where: {
          house_id: id
        }
      }).then(character => {

        server
          .put(`/gameofthrones/house/${id}/members/${character.id}`)
          .send(data)
          .expect(409)
          .end(done)

      }).catch(done)

    })

    it ('should return 404 | get /house/:id/members/:associationId, wrong id', function (done) {

      const id = 100
      const associationId = 100

      server
        .get(`/gameofthrones/house/${id}/members/${associationId}`)
        .expect(404)
        .end(done)

    })

    it ('should return 404 | get /house/:id/members/:associationId, wrong associationId', function (done) {

      const id = 1
      const associationId = 100

      server
        .get(`/gameofthrones/house/${id}/members/${associationId}`)
        .expect(404)
        .end(done)

    })

    it ('should return 200 | get /house/:id/members/:associationId', function (done) {

      const id = 1

      const where = {
        house_id: id
      }

      association.find({ where }).then(character => {

        character = character.dataValues
        test.deleteObjcetTimestamps(character)
        
        server
          .get(`/gameofthrones/house/${id}/members/${character.id}`)
          .expect(200)
          .end((err, res) => {
            
            if (err) return done(err)

            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.id)
            assert(body.house_id === id)
            test.assertObject(body, character)
            test.assertModelById(association, body.id, character, done)
            
          })

      }).catch(done)

    })

    it ('should return 404 | delete /house/:id/members/:associationId, wrong id', function (done) {

      const id = 100
      const associationId = 100

      server
        .del(`/gameofthrones/house/${id}/members/${associationId}`)
        .expect(404)
        .end(done)

    })

    it ('should return 404 | delete /house/:id/members/:associationId, wrong associationId', function (done) {

      const id = 1
      const associationId = 100

      server
        .del(`/gameofthrones/house/${id}/members/${associationId}`)
        .expect(404)
        .end(done)

    })

    it ('should return 204 | delete /house/:id/members/:associationId', function (done) {

      const id = 1

      const where = {
        house_id: id
      }

      association.find({ where }).then(character => {
        
        server
          .del(`/gameofthrones/house/${id}/members/${character.id}`)
          .expect(204)
          .end((err, res) => {
            
            if (err) return done(err)

            association.findById(character.id).then(character => {
              assert(!character)
              done()
            })

          })

      }).catch(done)

    })

  })

  describe ('belongsToMany association', function () {

    const model       = models.user
    const association = models.character

    it ('should return 200 | get /user/:id/partialities', function (done) {

      const id = 1

      model.findById(id).then(data => {

        server
          .get(`/user/${id}/partialities`)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert(Array.isArray(body))
            debug(body)
            
            assert(body.length === 4)
            done()

          })

      }).catch(done)

    })

    it ('should return 200 | get /user/:id/pests', function (done) {

      const id = 1

      model.findById(id).then(data => {

        server
          .get(`/user/${id}/pests`)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert(Array.isArray(body))
            debug(body)
            assert(body.length === 1)
            done()

          })

      }).catch(done)

    })
    
    it.only ('should return 201 | post /user/:id/, object body', function (done) {

      const id = 1
      const associationId = 2

      association.findById(associationId).then(character => {
        
        assert(character)
        return character

      }).then(character => {

        character = character.dataValues

        server
          .post(`/user/${id}/characters`)
          .send(character)
          .expect(201)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.id)
            test.assertObject(body, character)
            test.assertModelById(association, body.id, character, done)

          })

      }).catch(done)

    })

    it ('should return 201 | post /house/:id/members, array body', function (done) {

      const id = 1

      const where = { house_id: id }

      association.findAll({ where }).then(characters => {
        return association.destroy({ where }).then(() => {
          return association.findAll({ where }).then(data => {
            assert(!data.length)
            return characters
          })
        })
      }).then(characters => {

        characters = characters.map(character => {

          character = character.dataValues

          delete character.id
          delete character.created_at
          delete character.updated_at
          delete character.deleted_at

          return character
        })

        characters.push({
          name: 'Sansa'
        })

        server
          .post(`/gameofthrones/house/${id}/members`)
          .send(characters)
          .expect(201)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert(Array.isArray(body))
            debug(body)

            let promises = body.map((character, index) => {
              assert(character.id)
              assert(character.house_id === id)
              test.assertObject(character, characters[index])
              test.assertModelById(association, character.id, characters[index])
            })

            Promise.all(promises).then(() => done())
          })

      }).catch(done)

    })

  })


})
