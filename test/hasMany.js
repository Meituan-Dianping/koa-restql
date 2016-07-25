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

describe ('model hasMany association routers', function () {

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

  const model       = models.house
  const association = models.character

  describe ('GET', function () {

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

    it ('should return 404 | get /house/:id/members', function (done) {

      const id = 100

      server
        .get(`/gameofthrones/house/${id}/members`)
        .expect(404)
        .end(done)

    })
    
    it ('should return 200 | get /house/:id/members/:associationId ', function (done) {

      const id = 1

      model.findById(id).then(house => {

        house.getMembers().then(members => {

          let member = members[0]
          member = member.dataValues

          test.deleteObjcetTimestamps(member)

          debug(member)

          server
            .get(`/gameofthrones/house/${id}/members/${member.id}`)
            .expect(200)
            .end((err, res) => {

              if (err) return done(err)
              let body = res.body
              assert('object' === typeof body)
              debug(body)
              test.assertObject(body, member)
              test.assertModelById(association, body.id, member, done)

            })

        })

      }).catch(done)

    })

    it ('should return 404 | get /house/:id/members/:associationId, wrong id', function (done) {

      const id = 100

      server
        .get(`/gameofthrones/house/${id}/members/1`)
        .expect(404)
        .end(done)

    })

    it ('should return 404 | get /house/:id/members/:associationId, wrong associationId', function (done) {

      const id = 1

      model.findById(id).then(house => {

        assert(house)

        server
          .get(`/gameofthrones/house/${id}/members/100`)
          .expect(404)
          .end(done)

      }).catch(done)

    })

  })
  
  describe ('POST', function () {

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

    it ('should return 404 | post /house/:id/members', function (done) {

      const id = 100

      server
        .post(`/gameofthrones/house/${id}/members`)
        .send({})
        .expect(404)
        .end(done)

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

  })

  describe ('PUT', function () {

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
      const members = [{
        name: 'Sansa',  
        is_bastard: false
      }, {
        name: 'Bran',
        is_bastard: false
      }, {
        name: 'Jon',
        is_bastard: false
      }]

      model.findById(id).then(house => {

        server
          .put(`/gameofthrones/house/${id}/members`)
          .send(members)
          .expect(200)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert(Array.isArray(body))
            debug(body)

            assert(body.length === members.length)

            const promises = body.map((character, index) => {
              assert(character.id)
              assert(character.house_id === house.id)
              test.deleteObjcetTimestamps(character)
              return test.assertModelById(association, character.id, character)
            })

            Promise.all(promises).then(() => done())

          })

      }).catch(done)

    })

    it ('should return 404 | put /house/:id/members', function (done) {

      const id = 100

      server
        .put(`/gameofthrones/house/${id}/members`)
        .send({})
        .expect(404)
        .end(done)

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

    it ('should return 201 | put /house/:id/members/:associationId', function (done) {

      const id = 1
      const associationId = 100
      const character = {
        name: 'Sansa',
      }

      model.findById(id).then(house => {

        assert(house)

        return model.find({
          where: character
        }).then(member => {
          assert(!member)
          return { house, character }
        })

      }).then(res => {

        const {
          house, character
        } = res


        server
          .put(`/gameofthrones/house/${id}/members/${associationId}`)
          .send(character)
          .expect(201)
          .end((err, res) => {

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.id)
            assert(body.id === associationId)
            assert(body.house_id === id)
            test.assertObject(body, character)
            test.assertModelById(association, body.id, character, done)

          })

      }).catch(done)

    })

    it ('should return 200 | put /house/:id/members/:associationId, create relationship', function (done) {

      const id = 1

      const character = {
        name: 'Sansa'
      }

      model.findById(id).then(house => {

        assert(house)

        return association.create(character).then(character => {
          return { house, character }
        })

      }).then(res => {

        let {
          house, character
        } = res

        character = character.dataValues
        test.deleteObjcetTimestamps(character)
        delete character.house_id

        debug(character)

        server
          .put(`/gameofthrones/house/${id}/members/${character.id}`)
          .send(character)
          .end((err, res) => {

            // sequelize bug which upsert return wrong value
            debug(res.statusCode)
            assert([200, 201].indexOf(res.statusCode) !== -1)

            if (err) return done(err)
            let body = res.body
            assert('object' === typeof body)
            debug(body)
            assert(body.id)
            assert(body.id === character.id)
            assert(body.house_id === id)
            test.assertObject(body, character)
            test.assertModelById(association, body.id, character, done)

          })

      }).catch(done)

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


    it ('should return 404 | put /house/:id/members/:associationId, wrong id', function (done) {

      const id = 100

      server
        .put(`/gameofthrones/house/${id}/members/1`)
        .send({})
        .expect(404)
        .end(done)

    })

  })

  describe ('DELETE', function () {

    it ('should return 204 | delete /house/:id/members', function (done) {

      const id = 1

      model.findById(id).then(house => {

        assert(house)
        return house.getMembers().then(members => {
          assert(members.length)
          return { house, members }
        })

      }).then(res => {

        const {
          house, members
        } = res

        server
          .del(`/gameofthrones/house/${id}/members`)
          .expect(204)
          .end((err, res) => {

            if (err) return done(err)

            house.getMembers().then(members => {
              assert(!members.length)    
              done()
            })

          })

      }).catch(done)

    })

    it ('should return 204 | delete /house/:id/members, with query', function (done) {

      const id = 1

      const where = {
        name: 'Jon'    
      }

      const querystring = qs.stringify(where)

      model.findById(id).then(house => {

        assert(house)
        return house.getMembers({ where }).then(members => {
          assert(members.length)
          return { house, members }
        })

      }).then(res => {

        const {
          house, members
        } = res

        server
          .del(`/gameofthrones/house/${id}/members?${querystring}`)
          .expect(204)
          .end((err, res) => {

            if (err) return done(err)

            house.getMembers({ where }).then(members => {
              assert(!members.length)    
              return house.getMembers()
            }).then(members => {
              assert(members.length)
              done()
            })

          })

      }).catch(done)

    })

    it ('should return 404 | delete /house/:id/members', function (done) {

      const id = 100

      server
        .del(`/gameofthrones/house/${id}/members`)
        .expect(404)
        .end(done)

    })

    it ('should return 204 | delete /house/:id/members/associationId', function (done) {

      const id = 1

      model.findById(id).then(house => {

        assert(house)
        return house.getMembers().then(members => {
          assert(members.length)
          return { house, members }
        })

      }).then(res => {

        const {
          house, members
        } = res

        let member = members[0].dataValues
        test.deleteObjcetTimestamps(member)

        server
          .del(`/gameofthrones/house/${id}/members/${member.id}`)
          .expect(204)
          .end((err, res) => {

            if (err) return done(err)

            association.findById(member.id).then(member => {
              assert(!member)
              done()
            })

          })

      }).catch(done)

    })

    it ('should return 404 | delete /house/:id/members/:associationId, wrong id', function (done) {

      const id = 100

      server
        .del(`/gameofthrones/house/${id}/members/1`)
        .expect(404)
        .end(done)

    })

    it ('should return 404 | delete /house/:id/members/:associationId, wrong associationId', function (done) {

      const id = 1

      model.findById(id).then(house => {

        assert(house)

        server
          .delete(`/gameofthrones/house/${id}/members/1000`)
          .expect(404)
          .end(done)

      }).catch(done)

    })

  })

})
