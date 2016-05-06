'use strict'

const Restql = require('../lib/Restql');
const common = require('./common');

const koa     = common.koa;
const util    = common.util;
const http    = common.http;
const Router  = common.Router;
const assert  = common.assert;
const request = common.request;
const models  = common.sequelize.models;
const debug   = common.debug('koa-restql:test:restql');

describe ('Restql', function () {
  it ('creates new Restql', function (done) {
   
    let restql = new Restql(common.sequelize.models);

    assert(restql instanceof Restql);
    done();
  })

  describe ('middlewares', function () {
    let server = null;

    before (function () {
      let app = koa();
      let restql = new Restql(common.sequelize.models)

      app.use(restql.routes());
      server = request(http.createServer(app.callback()));
    })

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

    /*
     * without association
     */

    it ('should return a user array', function (done) {
      
      server
        .get('/user')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          assert(Array.isArray(body));
          debug(body);
          assert(body.length === 2);
          done();
        })
    })

    it ('should return a user identified by 1', function (done) {
      
      server
        .get('/user/1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          assert(typeof body === 'object');
          debug(body);
          assert(body.id === 1);
          done();
        })
    })

    it ('should return a updated user identified by 1', function (done) {
      
      let data = {
        login : 'sam',
        email : 'sam@gmail.com'
      }

      server
        .put('/user/1')
        .send(data)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          assert(typeof body === 'object');
          debug(body);
          assert(body.id === 1);
          assert(body.login === data.login);
          assert(body.email === data.email);
          
          models.user.findById(1).then(user => {
            assert(user.login === body.login);
            assert(user.email === body.email);
            done();
          }).catch (done);
        })
    })

    it ('should return a new user', function (done) {
      
      let data = {
        login : 'dean',
        email : 'dean@gmail.com'
      }

      server
        .post('/user')
        .send(data)
        .expect(201)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          assert(typeof body === 'object');
          debug(body);
          assert(body.login === data.login);
          assert(body.email === data.email);

          models.user.findById(body.id).then(user => {
            assert(user.login === body.login);
            assert(user.email === body.email);
            done();
          }).catch (done);
        })
    })

    it ('should delete a user', function (done) {

      server
        .delete('/user/1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          assert(typeof body === 'object');
          debug(body);

          models.user.findById(1).then(user => {
            assert(!user);
            done();
          }).catch (done);
        })
    })

    /*
     * hasOne association
     */
    
    it ('should return a user profile', function (done) {

      server
        .get('/user/1/profile')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(body.user_id === 1);
          assert(body.description);
          done();
        })
    })

    it ('should return a updated profile', function (done) {

      let data = {
        description: 'I am updated'
      }
      
      server
        .put('/user/1/profile')
        .send(data)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(body.user_id === 1);
          assert(body.description === data.description);

          models.profile.findById(body.id).then(profile => {
            assert(profile.description === body.description);
            done();
          }).catch (done);
        })
    })

    it ('should return a new profile', function (done) {
      
      let data = {
        description: 'I am updated'
      }

      let user = {
        login : 'sam',
        email : 'sam@gmail.com'
      }

      server
        .post('/user')
        .send(user)
        .expect(201)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          user = body;
          return models.profile.findOne({
            where: {
              user_id : user.id
            }
          }).then(profile => {
            assert(!profile);
            server
              .put(`/user/${user.id}/profile`)
              .send(data)
              .expect(200)
              .end(function (err, res) {
                if (err) return done(err);
                let body = res.body;
                debug(body);
                assert(body.user_id === user.id);
                assert(body.description === data.description);
                models.profile.findById(body.id).then(profile => {
                  assert(profile.description === body.description);
                  done();
                }).catch(done);
              })
          })
        })
    })

    it ('should delete a user profile', function (done) {

      server
        .delete('/user/1/profile')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);

          models.profile.findOne({
            where: {
              user_id: 1
            }
          }).then(profile => {
            assert(!profile)
            done();
          }).catch(done);
        })
    })

    /*
     * belongsTo association
     */

    it ('should return a user', function (done) {

      server
        .get('/profile/1/user')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(body.id);
          assert(body.login);
          done();
        })
    })

    it ('should return a updated user', function (done) {

      let data = {
        login: 'dale ZHANG'
      }

      server
        .put('/profile/1/user')
        .send(data)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(body.id);
          assert(body.login === data.login);

          models.user.findById(body.id).then(user => {
            assert(user.login === body.login);
            done();
          }).catch (done);
        })
    })

    it ('should return a new profile user', function (done) {
      
      let profile = {
        description: 'I am new'
      }

      let data = {
        login : 'sam',
        email : 'sam@gmail.com'
      }

      server
        .post('/profile')
        .send(profile)
        .expect(201)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          profile = body;

          server
            .put(`/profile/${profile.id}/user`)
            .send(data)
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              let body = res.body;
              debug(body);
              assert(body.login === data.login);
              assert(body.email === data.email);

              models.profile.findById(profile.id).then(profile => {
                return profile;
              }).then(profile => {
                return models.user.findById(body.id).then(user => {
                  assert(profile.user_id === user.id);
                  assert(user.login === data.login);
                  assert(user.email === data.email);
                  done();
                }) 
              }).catch(done);
            })
          })
    })

    it ('should delete a profile user', function (done) {

      server
        .delete('/profile/1/user')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);

          models.profile.findById(1).then(profile => {
            return profile;
          }).then(profile => {
            return models.user.findById(profile.user_id).then(user => {
              assert(!user);
              done();
            })
          }).catch(done);
        })
    })

    /*
     * hasMany association
     */

    it ('should return an user department array', function (done) {

      server
        .get('/user/1/departments')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(Array.isArray(body));
          assert(body.length === 2);
          done();
        })
    })

    it ('should return an new user department', function (done) {

      let data = {
        description : 'Seaview, Beach Patio, Dog'
      }
      
      server
        .post('/user/1/departments')
        .send(data)
        .expect(201)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(body.id);
          assert(body.description === data.description);

          models.department.findById(body.id).then(department => {
            assert(body.description === department.description);
            done();
          }).catch (done);
        })    
    })

    it ('should get a user department', function (done) {
      
      server
        .get('/user/1/departments/1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          debug(body.id === 1);
          done();
        })    
    })

    it ('should update a user department', function (done) {

      let data = {
        description : 'Seaview, Beach Patio, Dog'
      }

      server
        .put('/user/1/departments/1')
        .send(data)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);

          assert(body.description === data.description);
          models.department.findById(body.id).then(department => {
            assert(department.description === body.description);
            done();
          }).catch(done);
        })
    })

    it ('should delete a user department', function (done) {

      server
        .delete('/user/1/departments/1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);

          models.department.findById(1).then(department => {
            assert(!department);
            done();
          }).catch(done);
        })
    })

    /*
     * belongsToMany association
     */

    it ('should return an user tags array', function (done) {

      server
        .get('/user/1/tags')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(Array.isArray(body));
          done();
        })
    })

    it ('should create an new user tag', function (done) {

      let data = {
        name : 'MIT'
      }
      
      server
        .post('/user/1/tags')
        .send(data)
        .expect(201)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(body.id);
          assert(body.name === data.name);

          models.tag.findById(body.id).then(tag => {
            assert(body.name === tag.name);
            done();
          }).catch (done);
        })
    })

    it ('should get a user tag', function (done) {
      
      server
        .get('/user/1/tags/1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          debug(body.id === 1);
          done();
        })    
    })

    it ('should update a user tag', function (done) {

      let data = {
        name: 'MIT'
      };

      server
        .put('/user/1/tags/1')
        .send(data)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);

          assert(body.name === data.name);
          models.tag.findById(body.id).then(tag => {
            assert(tag.name === body.name);
            done();
          }).catch(done);
        })
    })

    it ('should delete a user tag', function (done) {

      server
        .delete('/user/1/tags/1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          let body = res.body;
          debug(body);

          models.user_tags.findOne({
            where: {
              user_id : 1,
              tag_id  : 1
            }
          }).then(user_tag => {
            assert(!user_tag);
            done();
          }).catch(done);
        })
    })
  })
})

