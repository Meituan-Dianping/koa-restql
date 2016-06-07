'use strict';

const debug       = require('debug')('koa-restql:router');
const Router      = require('koa-router');

const common      = require('./common');
const methods     = require('./methods');
const middlewares = require('./middlewares');

const handlers = middlewares.handlers;
const global   = {};

const methodShouldMount = (path, method, options) => {
  
  options = options || {};

  let ignore = options.ignore;

  if (common.shouldIgnoreAssociation(method, options))
    return false;

  if (method.isSingular !== undefined && method.isSingular !== path.isSingular)
    return false;

  return true;
}

const createModelRoutes = (path, model, association, options) => {
   
  let models  = global.models || {}
    , router  = global.router || {}
    , paths   = [ path ];

  /**
   * if association === undefined and path is plural, 
   * mount /path
   * and   /path/:id to router
   *
   * else if there is a association
   * and if this path is singular
   * mount /path
   *
   * and if this path is plural
   * mount /path
   * and   /path/:associationId
   */

  if (!association || !path.isSingular) {
    let id = !association ? ':id' : ':associationId';
    paths.push({ name: `${path.name}/${id}`, isSingular: true });
  }

  paths.forEach(path => {
    methods.forEach(method => {
      if (methodShouldMount(path, method, options)) {
          
        let args = [method, model]
          , name = method.name;

        if (association) 
          args.push(association);

        debug(path.name);
        router[name](path.name, handlers[name].apply(this, args)); 
      }
    })
  })

  if (association || !model.associations)
    return;

  Object.keys(model.associations).forEach(key => {

    let association = model.associations[key]
      , options     = association.options
      , isSingular  = !! association.isSingleAssociation
      , pathName    = paths[1].name.slice();

    pathName += `/${common.getAssociationName(association)}`;
    createModelRoutes({ name: pathName, isSingular }, model, association, options.restql);
  })
}

module.exports.load = (models, opts) => {

  let router = new Router();

  global.models = models;
  global.router = router;

  Object.keys(models).forEach(key => {

    let model  = models[key]
      , schema = model.options.schema
      , path   = `/${key}`;

    if (schema) {
      path = `/${schema}${path}`;
    }

    createModelRoutes({ name: path, isSingular: false }, model);
  })
  return router;
}

module.exports.methodShouldMount = methodShouldMount;
