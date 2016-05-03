'use strict'

const debug = require('debug')('koa-restql:handlers');

module.exports.get = (model, associationModel) => {
  return function * () {
    this.body = {
      name: 'get'
    }
    this.staus = 200;
  }
}

module.exports.post = (model, associationModel) => {
  return function * () {
    this.body = {
      name: 'post'
    }
    this.staus = 201;
  }
}

module.exports.put = (model, associationModel) => {
  return function * () {
    this.body = {
      name: 'put',
      id: this.params.id
    }
    this.staus = 200;
  }
}

module.exports.del = (model, associationModel) => {
  return function * () {
    this.body = {
      name: 'del',
      id: this.params.id
    }
    this.staus = 200;
  }
}
