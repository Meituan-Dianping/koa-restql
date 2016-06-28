'use strict';

const debug   = require('debug')('koa-restql:router');
const Router  = require('koa-router');

const common  = require('./common');
const methods = require('./methods');
const loaders = require('./handlers');

const loadModelRoutes = (router, method, model, name) => {
  
  let base         = `/${name}`,
    , associations = model.associations,
    , schema       = model.options.schema;

  if (schema) {
    base = `/${schema}${base}`;
  }

  let loader = loader.model[method];
  if (loader) {
    loader(router, base, model);
  }

  Object.keys(associations).forEach(key => {

    let association = associations[key]
      , isSingular  = association.isSingular

    base = `${base}/${key}`;

    let loader = isSingular ? 
      loaders.association.singular[method] : 
      loaders.association.plural[method];

    if (loader) {
      loader(router, base, model, association);
    }
  })
}

const load = (models) => {

  let router = new Router();

  Object.keys(models).forEach(key => {

    let model  = models[key];

    methods.forEach(method => {
      loadModelRoutes(router, method, model, key);
    })
  })

  return router;
}

module.exports.load = load;
