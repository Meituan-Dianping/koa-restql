'use strict';

const debug        = require('debug')('koa-restql:router');
const Router       = require('koa-router');
const pathToRegexp = require('path-to-regexp');
const defaults     = require('./defaults');

const global = {};

const shouldMount = (method, association) => {

  method = method || {};

  let mount = method.mount || {}

  if (association) {
    let isSingleAssociation = association.isSingleAssociation;

    if (!mount.association && !mount.associationOnly)
      return false;

    if (mount.singleModelOnly && !isSingleAssociation)
      return false;

    if (mount.pluralModelOnly && isSingleAssociation)
      return false;

  } else {
    if (mount.associationOnly)
      return false;
  }

  return true;
}

const createModelRoutes = (path, model, association) => {
   
  let models = global.models || {}
    , router = global.router || {};

  defaults.methods.forEach(method => {
    if (shouldMount(method, association)) {
      let _path = `/${path}${method.path}`
        , re    = pathToRegexp(_path, [])
        , args  = [re, model];

      if (association) {
        args.push(association);
      } 

      router[method.name](`${_path}`, method.fn.apply(this, args));
    }
  })

  if (association || !model.associations)
    return;

  Object.keys(model.associations).forEach(key => {

    let association = model.associations[key]
      , name        = association.options.name
      , _path       = `${path}/:${model.name}_id/`;

    _path += association.isSingleAssociation ? name.singular : name.plural;
    createModelRoutes(`${_path}`, model, association);
  })
}

module.exports.load = (models, opts) => {

  let router = new Router();

  global.models = models;
  global.router = router;

  Object.keys(models).forEach(key => {

    let model = models[key]
      , path  = `${key}`;

    createModelRoutes(path, model);
  })
  return router;
}

module.exports.shouldMount = shouldMount;
