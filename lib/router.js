'use strict';

const debug       = require('debug')('koa-restql:router');
const Router      = require('koa-router');
const defaults    = require('./defaults');
const middlewares = require('./middlewares');

const handlers = middlewares.handlers;
const global   = {};

const createModelRoutes = (path, model, association) => {
   
  let models = global.models || {}
    , router = global.router || {}
    , paths  = [ path ];

  if (!association || !association.isSingleAssociation) {
    let id = !association ? 'id' : ':associationId';
    paths.push({ name: `${path}/${id}`, isSingular: true });
  }

  paths.forEach(path => {
    defaults.methods.forEach(method => {
      if (!method.mount 
        || method.mount.singular === undefined
        || method.mount.singular === method.isSingular) {
          
        let args = [model]
          , name = method.name;

        if (association) 
          args.push(association);

        router[name](path, handlers[name].apply(this, args)); 
      }
    })
  })

  if (association || !model.associations)
    return;

  Object.keys(model.associations).forEach(key => {

    let association = model.associations[key]
      , isSingular  = association.isSingleAssociation
      , name        = association.options.name
      , path        = path[1];
    
    path.name += isSingular ? name.singular : name.plural;
    createModelRoutes({ name: _path,  isSingular }, model, association);
  })
}

module.exports.load = (models, opts) => {

  let router = new Router();

  global.models = models;
  global.router = router;

  Object.keys(models).forEach(key => {

    let model = models[key]
      , path  = `${key}`;

    createModelRoutes({ name: path, isSingular }, model);
  })
  return router;
}

module.exports.shouldMount = shouldMount;
