'use strict';

const debug        = require('debug')('koa-restql:router');
const Router       = require('koa-router');
const RoutesConfig = require('./routesConfig');

const global = {};

const checkMountCondition = (method, opts) => {

  opts   = opts || {};
  method = method || {};

  let isMounted           = method.isMounted || {}
    , isAssociation       = opts.isAssociation
    , isSingleAssociation = opts.isSingleAssociation;

  if (isAssociation) {
    if (!isMounted.association && !isMounted.associationOnly)
      return false;

    if (isMounted.singleResourceOnly && !isSingleAssociation)
      return false;

    if (isMounted.pluralResourceOnly && isSingleAssociation)
      return false;

  } else {
    if (isMounted.associationOnly)
      return false;
  }

  return true;
}

const createResourceRoutes = (path, model, opts) => {
   
  opts = opts || {};

  let models = global.models || {}
    , router = global.router || {};

  RoutesConfig.methods.forEach(method => {
    let isMounted       = checkMountCondition(method, opts)
      , associatedModel = opts.associatedModel;

    if (isMounted) {
      let handler = associatedModel ? 
        method.fn(associatedModel, model) : method.fn(model);

      router[method.name](`${path}${method.path}`, handler);
    }
  })

  if (opts.isAssociation || !model.associations)
    return;

  Object.keys(model.associations).forEach(key => {
    let association         = model.associations[key]
      , targetName          = association.target.name
      , isSingleAssociation = association.isSingleAssociation
      , associationModel    = global.models[targetName]
      , associationPath     = `:${model.name}_id/${association.as}`;

    debug(`create ${model.name} association ${targetName} router`);
    createResourceRoutes(`${path}/${associationPath}`, associationModel, {
      isAssociation       : true,
      isSingleAssociation : association.isSingleAssociation,
      associatedModel     : model
    });
  })
}

module.exports.load = (router, models, opts) => {

  global.models = models;
  global.router = router;

  Object.keys(models).forEach(key => {
    let model = models[key]
      , path  = `${key}`;
    createResourceRoutes(path, model);
  })
  return router;
}

module.exports.checkMountCondition = checkMountCondition;
