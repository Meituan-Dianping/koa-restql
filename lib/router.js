'use strict';

const Router  = require('koa-router');
const debug   = require('debug')('koa-restql:router');

const common  = require('./common');
const methods = require('./methods');
const loaders = require('./loaders');

function loadModelRoutes (router, method, model, name, options) {
  
  let base         = `/${name}`
    , associations = model.associations
    , schema       = model.options.schema;

  if (schema) {
    base = `/${schema}${base}`;
  }

  let loader = loaders.model[method];
  if (loader) {
    loader(router, base, model, options)
  }

  Object.keys(associations).forEach(key => {

    let association     = associations[key]
      , isSingular      = association.isSingleAssociation
      , associationType = association.associationType
      , loaderPath      = loaders.model.association
      , loader

    /***
     * to camel case
     */
    associationType = 
      associationType.replace(/^(.)/, $1 => $1.toLowerCase())

    loaderPath = isSingular ? loaderPath.singular : loaderPath.plural
    loader = (loaderPath[associationType] && 
        loaderPath[associationType][method]) || loaderPath[method]

    if (loader) {
      loader(router, `${base}/:id/${key}`, model, association, options)
    }
  })
}

function load (models, options) {

  let router = new Router();

  Object.keys(models).forEach(key => {

    let model = models[key];

    methods.forEach(method => {
      loadModelRoutes(router, method.toLowerCase(), model, key, options);
    })
  })

  return router;
}

module.exports.load = load;
