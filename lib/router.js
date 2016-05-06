'use strict';

const debug       = require('debug')('koa-restql:router');
const Router      = require('koa-router');

const common      = require('./common');
const methods     = require('./methods');
const middlewares = require('./middlewares');

const handlers = middlewares.handlers;
const global   = {};

const methodShouldMount = (path, method) => {
  if (method.isSingular === undefined || method.isSingular === path.isSingular)
    return true;

  return false;
}

const createModelRoutes = (path, model, association) => {
   
  let models = global.models || {}
    , router = global.router || {}
    , paths  = [ path ];

  /**
   * if there is no association and path is plural, 
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
      if (methodShouldMount(path, method)) {
          
        let args = [model]
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
      , isSingular  = !! association.isSingleAssociation
      , pathName    = paths[1].name.slice();
    
    pathName += `/${common.getAssociationName(association)}`;
    debug(pathName);
    debug(isSingular);
    createModelRoutes({ name: pathName, isSingular }, model, association);
  })
}

module.exports.load = (models, opts) => {

  let router = new Router();

  global.models = models;
  global.router = router;

  Object.keys(models).forEach(key => {

    let model = models[key]
      , path  = `/${key}`;

    createModelRoutes({ name: path, isSingular: false }, model);
  })
  return router;
}

module.exports.methodShouldMount = methodShouldMount;
