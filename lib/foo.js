'use strict';

const middlewares = require('middlewares');
const debug       = require('debug')('koa-restql:xxx');

const handlers    = middlewares.handlers;

const mountModelRoutes = (router, method, { model }) => {
  
  let base = `/${model.name}`,

  handlers[method](router, { base, model });

  for (association in model.associations) {
    mountAssociationGetMethod(router, { model, base, association });
  }
}

const mountModelAssociationRoutes = (router, { base, model, association }) => {

  base = `${base}/${association.as}`;
  handlers[method](router, { base, model, association });
}
