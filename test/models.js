'use strict'

const qs      = require('qs')
const koa     = require('koa')
const http    = require('http')
const uuid    = require('node-uuid')
const assert  = require('assert')
const request = require('supertest')
const debug   = require('debug')('koa-restql:test:models')

const prepare = require('./lib/prepare')
const RestQL  = require('../lib/RestQL')

const models  = prepare.sequelize.models

const validateUser = (user, expect, done) => {

  assert(user)

  const keys = Object.keys(expect)
  keys.forEach(key => {
    assert(user[key])
    assert(user[key] === expect[key])
  })

  return models.user.findById(user.id).then(data => {
    keys.forEach(key => {
      assert(data[key])
      assert(data[key] === expect[key])
    })
    if (done) done()
  })

}

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

  describe.only ('user', function () {

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
          done();

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
          if (err) return done(err);
          let body = res.body;
          assert(typeof body === 'object');
          debug(body);

          data.id = body.id;
          validateUser(body, data, done)
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

          let promises = 
          body.map((user, index) => validateUser(user, data[index]))

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
          if (err) return done(err);
          let body = res.body;
          assert(typeof body === 'object');
          debug(body);

          data.id = body.id;
          validateUser(body, data, done).catch(done)
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
            if (err) return done(err);
            let body = res.body;
            assert(typeof body === 'object');
            debug(body);

            data.id = body.id;
            validateUser(body, data, done)
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

          let promises = 
          body.map((user, index) => validateUser(user, data[index]))

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

    it ('should return 204 | delete /user, no query, delete nothing', function (done) {

      models.user.count().then(count => {
        server
          .del(`/user`)
          .expect(204)
          .end((err, res) => {

            if (err) return done(err)
            models.user.count().then(newCount => {
              assert(count === newCount)
              done()
            }).catch(done)

          })
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

          data = data.dataValues;
          delete data.created_at
          delete data.updated_at
          delete data.deleted_at

          data.nickname = uuid()
          debug(data);

          server
            .post(`/user`)
            .send(data)
            .expect(201)
            .end((err, res) => {
              if (err) return done(err);
              let body = res.body;
              assert(typeof body === 'object');
              debug(body);

              validateUser(body, data, done).catch(done)
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
              if (err) return done(err);
              let body = res.body;
              assert(Array.isArray(body))
              debug(body)

              let promises = 
              data.map((row, index) => validateUser(body[index], row))

              Promise.all(promises)
                .then(() => done())
                .catch(done)
            })
        })

      })

    })

    it ('should return 200 | get /user/:id', function (done) {

      const id = 1;

      server
        .get(`/user/${id}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          let body = res.body;
          assert(typeof body === 'object');
          debug(body);
          assert(body.id === id);
          done();
        })
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
          validateUser(body, data, done).catch(done)
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

  //it ('should get user array and id > 1', function (done) {

  //  let querystring = {
  //    id: {
  //      $gt: 1
  //    }
  //  }

  //  server
  //    .get(`/user?${qs.stringify(querystring)}`)
  //    .expect(200)
  //    .end((err, res) => {
  //      if (err) return done(err);
  //      let body = res.body;
  //      assert(Array.isArray(body));
  //      debug(body);
  //      assert(body.length === 1);
  //      body.forEach(user => {
  //        assert(user.id > 1);
  //      })
  //      done();
  //    })
  //})

  // it ('should get users which id like da%', function (done) {

  //   let querystring = {
  //     $or: [{
  //       login: {
  //         $like: 'da%'
  //       }
  //     },{
  //       email: {
  //         $like: 'ggg%'
  //       }
  //     }]
  //   }

  //   server
  //     .get(`/user?${qs.stringify(querystring)}`)
  //     .expect(200)
  //     .end((err, res) => {
  //       if (err) return done(err);
  //       let body = res.body;
  //       assert(Array.isArray(body));
  //       debug(body);
  //       assert(body.length === 1);
  //       done();
  //     })
  // })

  it ('should get an user', function (done) {

    const id = 1;

    server
      .get(`/user/${id}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(typeof body === 'object');
        debug(body);
        assert(body.id === id);
        done();
      })
  })

  it ('should update an user', function (done) {

    const data = {
      login : 'sam',
      email : 'sam@gmail.com'
    }

    const id = 1;

    server
      .put(`/user/${id}`)
      .send(data)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(typeof body === 'object');
        debug(body);
        assert(body.id === id);
        assert(body.login === data.login);
        assert(body.email === data.email);

        models.user.findById(id).then(user => {
          assert(user.login === body.login);
          assert(user.email === body.email);
          done();
        }).catch (done);
      })
  })

  it ('should update an user id = 100', function (done) {

    const id = 100;

    const data = {
      login : 'sam',
      email : 'sam@gmail.com'
    }

    server
      .put(`/user/${id}`)
      .send(data)
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(typeof body === 'object');
        debug(body);
        assert(body.id === id);
        assert(body.login === data.login);
        assert(body.email === data.email);

        models.user.findById(id).then(user => {
          assert(user.login === body.login);
          assert(user.email === body.email);
          done();
        }).catch (done);
      })
  })

  it ('should return 400 when body is an array', function (done) {

    const id = 1;

    server
      .put(`/user/${id}`)
      .send([])
      .expect(400)
      .end(done);
  })

  it ('should create a user use put', function (done) {

    const data = {
      login : 'sam',
      email : 'sam@gmail.com'
    }

    server
      .put(`/user/`)
      .send(data)
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(typeof body === 'object');
        debug(body);
        assert(body.id);
        assert(body.login === data.login);
        assert(body.email === data.email);

        models.user.findById(body.id).then(user => {
          assert(user.login === body.login);
          assert(user.email === body.email);
          done();
        }).catch (done);
      })
  })
 
  it ('should return 400 create a user use put', function (done) {

    const data = {
      email : 'sam@gmail.com'
    }

    server
      .put(`/user/`)
      .send(data)
      .expect(400)
      .end(done);
  })

  it ('should create users use put', function (done) {

    const data = [{
      login : 'sam',
      email : 'sam@gmail.com'
    }, {
      login : 'dean',
      email : 'dean@gmail.com'
    }]

    server
      .put(`/user/`)
      .send(data)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        assert(body.length === data.length);

        debug(body);

        let promises = []
        body.forEach((item, index) => {
          assert(item.id);
          assert(item.login === data[index].login);
          assert(item.email === data[index].email);

          promises.push(
            models.user.findById(item.id).then(user => {
              assert(user.login === item.login);
              assert(user.email === item.email);
            }))
        })

        Promise.all(promises).then(() => done()).catch(done);
      })
  })

  it ('should return 400 when create users use put', function (done) {

    const data = [{
      email : 'sam@gmail.com'
    }, {
      login : 'dean',
      email : 'dean@gmail.com'
    }]

    server
      .put(`/user/`)
      .send(data)
      .expect(400)
      .end(done); 
  })

  //it.only ('should return 400 when body has not unique index fields', function (done) {

  //  const id = 1;

  //  const data = {
  //    email : 'sam@gmail.com'
  //  }

  //  server
  //    .put(`/user/${id}`)
  //    .send(data)
  //    .expect(400)
  //    .end(done);
  //})

  it ('should update an user with put', function (done) {
    
    let id = 1;

    models.user.findById(id).then(data => {

      data = data.dataValues;
      let email = 'updated@email.com';
      
      data.email = email;
      debug(data);

      server
        .put('/user')
        .send(data)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          let body = res.body;
          assert(typeof body === 'object');
          debug(body);
          assert(body.id === id);
          assert(body.login === data.login);
          assert(body.email === data.email);

          models.user.findById(id).then(user => {
            assert(user.login === body.login);
            assert(user.email === body.email);
            done();
          }).catch (done);
        })

    })

  })

  it ('should create an user', function (done) {

    let data = {
      login : 'dean',
      email : 'dean@gmail.com'
    }

    server
      .post('/user')
      .send(data)
      .expect(201)
      .end((err, res) => {
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

  it ('should update a user', function (done) {

    let querystring = qs.stringify({
      _ignoreDuplicates: true
    });

    models.user.findById(1)
      .then(data => {

        data.email = 'updated@gmail.com';

        server
          .post(`/user?${querystring}`)
          .send(data)
          .expect(201)
          .end((err, res) => {
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
  })

  it ('should create a bulk of users', function (done) {

    let data = [{
      login : 'dean',
      email : 'dean@gmail.com'
    }, {
      login : 'sam',
      email : 'sam@gmail.com'
    }]

    server
      .post('/user')
      .send(data)
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        assert(body.length === 2);

        debug(body);
        
        let promises = body.map((user, index) => {

          assert(user.login === data[index].login);
          assert(user.email === data[index].email);

          return models.user.findById(user.id).then(result => {
            assert(user.login === result.login);
            assert(user.email === result.email);
          })
        })

        Promise.all(promises)
          .then(users => {
            done();   
          })
          .catch(done);
      })
  })

  it ('should return a 409 when create an user', function (done) {

    /***
     * test sequelize polyfill
     */
    models.user.uniqueKeys = {};

    let data = {
      login : 'dean',
      email : 'dean@gmail.com'
    }

    server
      .post('/user')
      .send(data)
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        server
          .post('/user')
          .send(data)
          .expect(409)
          .end(done);
      })
  })

  it ('should return a 409 when create an user', function (done) {

    let data = {
      login : 'dean',
      email : 'dean@gmail.com'
    }

    server
      .post('/user')
      .send(data)
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        server
          .post('/user')
          .send(data)
          .expect(409)
          .end(done);
      })
  })

  it ('should create an user without 409', function (done) {

    models.user.findAll().then(users => {

      assert(users);

      let data = users[0];

      assert(data);

      server
        .delete(`/user/${data.id}`)
        .expect(204)
        .end((err, res) => {
          server
            .post('/user')
            .send(data.dataValues)
            .expect(201)
            .end((err, res) => {
              if (err) return done(err);

              let body = res.body;
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
    })
  })

  it ('should return a 409 when create an tag', function (done) {

    let data = {
      name: '409'
    }

    server
      .post('/tag')
      .send(data)
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        server
          .post('/tag')
          .send(data)
          .expect(409)
          .end(done);
      })
  })

  it ('should create an tag without 409', function (done) {

    models.tag.findAll().then(tags => {

      assert(tags);

      let data = tags[0];

      assert(data);

      server
        .delete(`/tag/${data.id}`)
        .expect(204)
        .end((err, res) => {
          server
            .post('/tag')
            .send(data.dataValues)
            .expect(201)
            .end((err, res) => {
              if (err) return done(err);

              let body = res.body;
              debug(body);
              assert(body.name === data.name);

              models.tag.findById(body.id).then(tag => {
                assert(tag.name === body.name);
                done();
              }).catch (done);
            })
        })
    })
  })

  it ('should return a 409 when create user_tag', function (done) {

    let data = {
      user_id : 1,
      tag_id  : 1
    }

    server
      .post('/user_tags')
      .send(data)
      .expect(409)
      .end(done);
  })

  it ('should return a 409 when create user_tag', function (done) {

    let data = {
      user_id : 1,
      tag_id  : 1
    }

    /***
     * test sequelize polyfill
     */
    models.user_tags.uniqueKeys = {};
    models.user_tags.options.indexes = [{
      unique: true,
      name: 'user_tags_user_id_tag_id_unique',
      fields: ['user_id', 'tag_id']
    }];

    debug(models.user_tags.uniqueKeys);
    debug(models.user_tags.options.indexes);

    server
      .post('/user_tags')
      .send(data)
      .expect(409)
      .end(done);
  })

  it ('should create a user_tag without 409', function (done) {

    models.user_tags.findAll().then(userTags => {

      assert(userTags);

      let data = userTags[0];

      assert(data);

      server
        .delete(`/user_tags/${data.id}`)
        .expect(204)
        .end((err, res) => {
          server
            .post('/user_tags')
            .send(data.dataValues)
            .expect(201)
            .end((err, res) => {
              if (err) return done(err);

              let body = res.body;
              debug(body);
              assert(body.user_id === data.user_id);
              assert(body.tag_id === data.tag_id);

              models.user_tags.findById(body.id).then(userTag => {
                assert(userTag.user_id === body.user_id);
                assert(userTag.tag_id === body.tag_id);
                done();
              }).catch (done);
            })
        })
    })
  })

  it ('should create a user profile without 409', function (done) {

    models.profile.findAll().then(profiles => {

      assert(profiles);

      let data = profiles[0];

      assert(data);

      server
        .delete(`/profile/${data.id}`)
        .expect(204)
        .end((err, res) => {
          server
            .put(`/user/${data.user_id}/profile`)
            .send(data.dataValues)
            .expect(201)
            .end((err, res) => {
              if (err) return done(err);

              let body = res.body;
              debug(body);
              assert(body.user_id === data.user_id);
              assert(body.description === data.description);

              models.profile.findById(body.id).then(profile => {
                assert(profile.user_id === body.user_id);
                assert(profile.description === body.description);
                done();
              }).catch (done);
            })
        })

    })
  })

  it ('should create an user with profile and tags', function (done) {

    let data = {
      login : 'dean',
      email : 'dean@gmail.com',
      profile : {
        description: 'I am a ghost hunter'
      },
      tags  : [
      { name: 'ghost hunter' },
      { name: 'brave' }
      ]
    }

    let querystring = {
      _include: ['profile', 'tags']
    }

    server
      .post(`/user?${qs.stringify(querystring)}`)
      .send(data)
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(typeof body === 'object');
        debug(body);
        assert(body.login === data.login);
        assert(body.email === data.email);

        models.user.findById(body.id, {
          include: [
          { association: models.user.associations.profile },
          { association: models.user.associations.tags }
          ] 
        }).then(user => {
          assert(user.login === body.login);
          assert(user.email === body.email);
          let profile = user.profile
            , tags    = user.tags;
          assert(profile.description === data.profile.description);
          assert(tags.length === data.tags.length);
          data.tags.forEach(tag => {
            let name = tag.name;
            assert(tags.find(tag => tag.name === name));
          })
          done();
        }).catch (done);
      })
  })

  it ('should delete an user', function (done) {

    server
      .delete('/user/1')
      .expect(204)
      .end((err, res) => {
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

  it ('should get user profile', function (done) {

    server
      .get('/user/1/profile')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        debug(body);
        assert(body.user_id === 1);
        assert(body.description);
        done();
      })
  })

  it ('should get 404 when get user 100 profile', function (done) {

    server
      .get('/user/100/profile')
      .expect(404)
      .end(done)
  })

  it ('should update user profile', function (done) {

    let data = {
      description: 'I am updated'
    }

    server
      .put('/user/1/profile')
      .send(data)
      .expect(200)
      .end((err, res) => {
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

  it ('should create user profile', function (done) {

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
      .end((err, res) => {
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
            .expect(201)
            .end((err, res) => {
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

  it ('should delete user profile', function (done) {

    server
      .delete('/user/1/profile')
      .expect(204)
      .end((err, res) => {
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

  it ('should get profile user', function (done) {

    server
      .get('/profile/1/user')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        debug(body);
        assert(body.id);
        assert(body.login);
        done();
      })
  })

  it ('should update profile user', function (done) {

    let data = {
      login: 'dale ZHANG'
    }

    server
      .put('/profile/1/user')
      .send(data)
      .expect(200)
      .end((err, res) => {
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

  it ('should create profile user', function (done) {

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
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        debug(body);
        profile = body;

        server
          .put(`/profile/${profile.id}/user`)
          .send(data)
          .expect(201)
          .end((err, res) => {
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

  it ('should delete profile user', function (done) {

    server
      .delete('/profile/1/user')
      .expect(204)
      .end((err, res) => {
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

  it ('should get user department array', function (done) {

    server
      .get('/user/1/departments')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        debug(body);
        assert(Array.isArray(body));
        assert(body.length === 2);
        done();
      })
  })

  it ('should create an user department', function (done) {

    let data = {
      description : 'Seaview, Beach Patio, Dog'
    }

    server
      .post('/user/1/departments')
      .send(data)
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        debug(body);
        assert(body.id);
        assert(body.description === data.description);

        models.department.findById(body.id).then(department => {
          assert(body.user_id);
          assert(body.description === department.description);
          done();
        }).catch (done);
      })    
  })

  it ('should create an array of departments', function (done) {

    let data = [{
      description : 'MT'
    }, {
      description : 'DP'
    }]

    server
      .post(`/user/1/departments`)
      .send(data)
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        debug(body);
        assert(Array.isArray(body));
        assert(body.length === 2);

        let promises = body.map(department => {
          assert(department.user_id);
          return models.department.find({
            id : department.id,
          }).then(res => {
            assert(res);
          });
        }) 

        Promise.all(promises).then(() => done());
      })
  })

  it ('should get an user department', function (done) {

    server
      .get('/user/1/departments/1')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        debug(body);
        debug(body.id === 1);
        done();
      })    
  })

  it ('should update an user department', function (done) {

    let data = {
      description : 'Seaview, Beach Patio, Dog'
    }

    server
      .put('/user/1/departments/1')
      .send(data)
      .expect(200)
      .end((err, res) => {
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

  it ('should delete an user department', function (done) {

    server
      .delete('/user/1/departments/1')
      .expect(204)
      .end((err, res) => {
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

  it ('should get user tags array', function (done) {

    server
      .get('/user/1/tags')
      .expect(200)
      .end((err, res) => {
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
      .end((err, res) => {
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

  it ('should assocition a tag', function (done) {

    let data = {
      name : 'MIT'
    }

    let querystring = qs.stringify({
      _ignoreDuplicates: true
    })

    models.tag.create(data)
      .then(tag => {
        server
          .post(`/user/1/tags?${querystring}`)
          .send(data)
          .expect(201)
          .end((err, res) => {
            if (err) return done(err);
            let body = res.body;
            debug(body);
            assert(body.id);
            assert(body.name === tag.name);

            models.user_tags.findOne({
              where: {
                user_id : 1,
                tag_id  : tag.id
              }
            }).then(userTag => {
              assert(userTag);
              done();
            })
          })
      })
      .catch(done);
  })

  it ('should assocition a tag only use id', function (done) {

    let data = {
      name : 'MIT'
    }

    models.tag.create(data)
      .then(tag => {
        server
          .post(`/user/1/tags`)
          .send({ id: tag.id })
          .expect(201)
          .end((err, res) => {
            if (err) return done(err);
            let body = res.body;
            debug(body);
            assert(body.id);
            assert(body.name === tag.name);

            models.user_tags.findOne({
              where: {
                user_id : 1,
                tag_id  : tag.id
              }
            }).then(userTag => {
              assert(userTag);
              done();
            })
          })
      })
      .catch(done);
  })

  it ('should assocition a tags', function (done) {

    let data = [{
      name : 'MT'
    }, {
      name : 'DP'
    }]

    let querystring = qs.stringify({
      _ignoreDuplicates: true
    })

    models.tag.bulkCreate(data)
      .then(() => {
        server
          .post(`/user/1/tags?${querystring}`)
          .send(data)
          .expect(201)
          .end((err, res) => {
            if (err) return done(err);
            let body = res.body;
            debug(body);
            assert(Array.isArray(body));
            assert(body.length === 2);

            let promises = body.map(tag => {
              return models.user_tags.find({
                tag_id  : tag.id,
                user_id : 1,
              }).then(userTag => {
                assert(userTag);
              });
            }) 

            Promise.all(promises).then(() => done());
          })
      }).catch(done);
  })

  it ('should get an user tag', function (done) {

    server
      .get('/user/1/tags/1')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        debug(body);
        debug(body.id === 1);
        done();
      })    
  })

  it ('should update an user tag', function (done) {

    let data = {
      name: 'MIT'
    };

    server
      .put('/user/1/tags/1')
      .send(data)
      .expect(200)
      .end((err, res) => {
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

  it ('should delete an user tag', function (done) {

    server
      .delete('/user/1/tags/1')
      .expect(204)
      .end((err, res) => {
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

  /*
   * query string where
   */

  it ('should get an user array with query where', function (done) {

    let querystring = qs.stringify({
      id: 1
    });

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        assert(body.length === 1);
        assert(body[0].id === 1);
        done();
      })
  })

  it ('should get an user array with query where', function (done) {

    let querystring = qs.stringify({
      id: [1, 2]
    });

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        assert(body.length === 2);
        done();
      })
  })

  it ('should get a tag array with query where', function (done) {

    let querystring = qs.stringify({
      id: [1, 2]
    });

    server
      .get(`/user/1/tags?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        assert(body.length === 2);
        done();
      })
  })

  /*
   * query string attributes
   */

  it ('should get user array with query attribute', function (done) {

    let querystring = qs.stringify({
      _attributes: 'id'
    });

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        assert(body.length === 2);
        body.forEach(user => {
          assert(!user.login);
          assert(user.id);
        })
        done();
      })
  })

  it ('should get user array with query attribute exclude', function (done) {

    let querystring = qs.stringify({
      _attributes: {
        exclude: ['id']
      }
    });

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        assert(body.length === 2);
        body.forEach(user => {
          assert(user.login);
          assert(!user.id);
        })
        done();
      })
  })

  it ('should get user array with query attribute exclude string', function (done) {

    let querystring = qs.stringify({
      _attributes: {
        exclude: 'id'
      }
    });

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        assert(body.length === 2);
        body.forEach(user => {
          assert(user.login);
          assert(user.email);
          assert(!user.id);
        })
        done();
      })
  })


  it ('should get user array with query attributes', function (done) {

    let querystring = qs.stringify({
      _attributes: ['id', 'login']
    });

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        assert(body.length === 2);
        body.forEach(user => {
          assert(user.id);
          assert(user.login);
        })
        done();
      })
  })

  it ('should get an user with query attribute', function (done) {

    let querystring = qs.stringify({
      _attributes: 'id'
    });

    server
      .get(`/user/1?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert('object' === typeof body);
        debug(body);
        assert(!body.login);
        assert(body.id);
        done();
      })
  })

  it ('should get an user with query attributes', function (done) {

    let querystring = qs.stringify({
      _attributes: ['id', 'login']
    });

    server
      .get(`/user/1?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert('object' === typeof body);
        debug(body);
        assert(body.login);
        assert(body.id);
        done();
      })
  })

  it ('should get user tag array with query attribute', function (done) {

    let querystring = qs.stringify({
      _attributes: 'name'
    });

    server
      .get(`/user/1/tags?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        assert(body.length === 3);
        body.forEach(tag => {
          assert(!tag.id);
          assert(tag.name);
        })
        done();
      })
  })

  /*
   * query string order
   */

  it ('should get tags array with order', function (done) {

    let querystring = qs.stringify({
      _order: [
        'id DESC',
      ]
    });

    server
      .get(`/tag?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        assert(body.length === 5);

        for (let i = 1; i < body.length; i ++) {
          assert(body[i-1].id > body[i].id);
        }

        done();
      })

  })

  it ('should get tags array with orders', function (done) {

    let querystring = qs.stringify({
      _order: [
        'id DESC',
        'name DESC'
      ]
    });

    server
      .get(`/tag?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        assert(body.length === 5);

        for (let i = 1; i < body.length; i ++) {
          assert(body[i-1].id > body[i].id);
        }

        done();
      })

  })

  it ('should get user tag array with orders', function (done) {

    let querystring = qs.stringify({
      _order: [
        ['id', 'DESC'],
        ['name', 'DESC']
      ]
    });

    server
      .get(`/user/1/tags?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        assert(body.length === 3);

        for (let i = 1; i < body.length; i ++) {
          assert(body[i-1].id > body[i].id);
        }

        done();
      })

  })

  it ('should get user tag array with through', function (done) {

    let querystring = qs.stringify({
      _through: {
        where: {
          status: 1
        }
      }
    }, {
      allowDots: true
    });

    server
      .get(`/user/1/tags?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        assert(body.length === 2);

        body.forEach(tag => {
          assert(tag.user_tags);
          assert(tag.user_tags.status === 1);
        })
        done();
      })

  })

  it ('should get an user with query include', function (done) {

    let querystring = qs.stringify({
      _include: {
        association: 'tags',
        include: [{
          association: 'users'
        }]
      }
    });

    server
      .get(`/user/1?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert('object' === typeof body);
        debug(body.tags);
        assert(Array.isArray(body.tags));
        assert(body.tags.length === 3);
        body.tags.forEach(tag => {
          assert(tag.id);
          assert(tag.name);
          assert(tag.users);
          assert(Array.isArray(tag.users));
          assert(tag.users.length > 0);
        })
        done();
      })
  })

  it ('should get an user with query include tags', function (done) {

    let querystring = qs.stringify({
      _include: ['tags', 'notExists']
    });

    server
      .get(`/user/1?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert('object' === typeof body);
        debug(body.tags);
        assert(Array.isArray(body.tags));
        assert(!body.notExists);
        done();
      })
  })

  it ('should get users who has profile', function (done) {

    let data = {
      login: 'dean'
    }

    let querystring = qs.stringify({
      _include: [
        { association: 'profile', required: true },
      ]      
    });

    server
      .post('/user')
      .send(data)
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        server
          .get(`/user?${querystring}`)
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            let body = res.body;
            debug(body);
            assert(body.every(user => user.login !== data.login));
            done();
          })
      })    
  })

  it ('should get an user with profile & tags | object array', function (done) {

    let querystring = qs.stringify({
      _include: [
        { association: 'profile' },
        { association: 'tags' }
      ]      
    });

    server
      .get(`/user/1?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert('object' === typeof body);
        debug(body);
        debug(body.tags);
        debug(body.profile);
        assert(body.tags)
          assert(body.profile.id)
          assert(body.profile.user_id === 1);
        done();
      })
  })

  it ('should get an user with profile & tags | string array', function (done) {

    let querystring = qs.stringify({
      _include: ['profile', 'tags']      
    });

    server
      .get(`/user/1?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert('object' === typeof body);
        debug(body);
        debug(body.tags);
        debug(body.profile);
        assert(body.tags)
          assert(body.profile.id)
          assert(body.profile.user_id === 1);
        done();
      })
  })

  it ('should get an user with profile', function (done) {

    let querystring = qs.stringify({
      _include: { association: 'profile' }
    });

    server
      .get(`/user/1?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert('object' === typeof body);
        debug(body.profile);
        assert(body.profile.id)
          assert(body.profile.user_id === 1);
        done();
      })
  })

  it ('should get user tags array with users', function (done) {

    let querystring = qs.stringify({
      _include: {
        association: 'users'
      }
    });

    server
      .get(`/user/1/tags?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        body.forEach(tag => {
          assert(tag.users);
          assert(Array.isArray(tag.users));
        })
        done();
      })

  })

  it ('should get user array with tags query include', function (done) {

    let querystring = qs.stringify({
      _include: {
        association: 'tags'
      }
    });

    server
      .get(`/user?${querystring}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        assert(Array.isArray(body));
        debug(body);
        body.forEach(user => {
          debug(user.tags);
          assert(user.tags);
          assert(Array.isArray(user.tags));
          assert(user.tags.length === 3);
        })
        done();
      })

  })

  /*
   * with schema
   */
  it ('should get car array', function (done) {

    server
      .get(`/schema/car`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        let body = res.body;
        debug(body);
        assert(Array.isArray(body));
        assert(body.length === 2);
        body.forEach(car => {
          assert(car.name);
        })
        done();
      })
  })

  /*
   * pagination
   */

  const createMockUsers = (count) => {

    let users = [];
    for (let i = 0; i < count; i ++) {
      let name = `user-${i}-${uuid.v4()}`;
      users.push({
        login : name,
        email : `${name}@gmail.com`
      });
    }

    return models.user.bulkCreate(users); 
  }

  it ('should get 20 users', function (done) {

    const CREATE_USER_COUNT = 20;

    createMockUsers(CREATE_USER_COUNT).then(users => {
      debug(users);
      server
        .get(`/user`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(Array.isArray(body));
          assert(body.length === 20);
          done();
        })
    })
  })

  it ('should get 10 users', function (done) {

    const CREATE_USER_COUNT = 20;

    createMockUsers(CREATE_USER_COUNT).then(users => {
      server
        .get(`/user?_limit=10`)
        .expect(200)
        .expect('X-Range', 'objects 0-10/22')
        .end((err, res) => {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(Array.isArray(body));
          assert(body.length === 10);
          done();
        })
    })
  })

  it ('should get 10 users from 6', function (done) {

    const CREATE_USER_COUNT = 20;

    createMockUsers(CREATE_USER_COUNT).then(users => {
      server
        .get(`/user?_limit=10&&_offset=5`)
        .expect(200)
        .expect('X-Range', 'objects 5-15/22')
        .end((err, res) => {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(Array.isArray(body));
          assert(body.length === 10);
          assert(body[0].id === 6);
          done();
        })
    })
  })

  const createMockTags = (user, count) => {

    let tags = [];
    for (let i = 0; i < count; i ++) {
      let name = `tag-${i}`;
      tags.push({ name });
    }

    return models.tag.bulkCreate(tags)
      .then(tags => {
        let promises = [];
        tags.forEach(tag => {
          let name = tag.name;
          promises.push(models.tag.find({
            where: { name }
          }).then(tag => {
            return models.user_tags.create({
              user_id : user.id,
              tag_id  : tag.id
            })
          }))
        })
        return Promise.all(promises);
      })
  }

  it ('should get 20 user tags', function (done) {

    const CREATE_TAG_COUNT = 20;

    createMockTags({ id: 1 }, CREATE_TAG_COUNT).then(tags => {
      server
        .get(`/user/1/tags`)
        .expect(200)
        .expect('X-Range', 'objects 0-20/23')
        .end((err, res) => {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(Array.isArray(body));
          assert(body.length === 20);
          done();
        })
    })
  })

  it ('should get 10 user tags', function (done) {

    const CREATE_TAG_COUNT = 20;

    createMockTags({ id: 1 }, CREATE_TAG_COUNT).then(tags => {
      server
        .get(`/user/1/tags?_limit=10`)
        .expect(200)
        .expect('X-Range', 'objects 0-10/23')
        .end((err, res) => {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(Array.isArray(body));
          assert(body.length === 10);
          done();
        })
    })
  })

  it ('should get 10 user tags from 6', function (done) {

    const CREATE_TAG_COUNT = 20;

    createMockTags({ id: 1 }, CREATE_TAG_COUNT).then(tags => {
      server
        .get(`/user/1/tags?_limit=10&_offset=5`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          let body = res.body;
          debug(body);
          assert(Array.isArray(body));
          assert(body.length === 10);
          assert(body[0].id !== 0);
          done();
        })
    })
  })
})
