'use strict';

const co          = require('co');
const parse       = require('co-body');
const middlewares = require('middlewares');

const debug       = require('debug')('koa-restql:loaders');
const common      = require('./common');

const loaders     = {};

loaders.model                = {};
loaders.association          = {};
loaders.association.plural   = {};
loaders.association.singular = {};

loaders.model.get = (router, { base, model }) => {
  router.get(base, function * () {});
  router.get(`${base}/:id`, function *() {})
}

loaders.model.post = (router, { base, model }) => {
  router.post(base, function * () {});
}

loaders.model.put = (router, { base, model }) => {
  router.put(base, function * () {});
  router.put(`${base}/:id`, function * () {});
}

loaders.model.del = (router, { base, model }) => {
  router.del(base, function * () {});
  router.del(`${base}/:id`, function * () {});
}

loaders.association.singular.get = (router, { base, model, association }) => {
  router.get(base, function * () {});
  router.get(`${base}/:id`, function *() {})
}

loaders.association.singular.put = (router, { base, model, association }) => {
  router.put(base, function * () {});
  router.put(`${base}/:id`, function * () {});
}

loaders.association.singular.del = (router, { base, model, association }) => {
  router.del(base, function * () {});
  router.del(`${base}/:id`, function * () {});
}

loaders.association.plural.get = (router, { base, model, association }) => {
  router.get(base, function * () {});
  router.get(`${base}/:id`, function *() {})
}

loaders.association.plural.post = (router, { base, model, association }) => {
  router.post(base, function * () {});
}

loaders.association.plural.put = (router, { base, model, association }) => {
  router.put(base, function * () {});
  router.put(`${base}/:id`, function * () {});
}

loaders.association.plural.del = (router, { base, model, association }) => {
  router.del(base, function * () {});
  router.del(`${base}/:id`, function * () {});
}

module.exports.loaders = loaders;
