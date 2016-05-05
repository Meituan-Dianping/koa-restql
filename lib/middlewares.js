'use strict'

const debug = require('debug')('koa-restql:middlewares');

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const get = (model, association) => {
  return function * () {
    let params = this.params || {}
      , data   = null;

    let debugInfo = `get ${this.request.url}, using model: ${model.name}`;

    if (association) {
      debugInfo += `, with association: `;
      if (association.isSingleAssociation) {
        debugInfo += `${association.options.name.singular}`;
      } else {
        debugInfo += `${association.options.name.plural}`;
      }
    }

    debug(debugInfo);

    if (!Object.keys(params).length) {

      data = yield model.findAll();
    } else {
      
      let id = params.id;
      data = yield model.findOne({
        where: { id }
      })

      if (!data) {
        this.throw(`${model.name} ${id} is not found`, 404);
      }

      if (association) {

        let isSingular = association.isSingleAssociation
          , name       = association.options.name
          , suffix     = isSingle ? name.singular : name.plural
          , getter     = `get${capitalizeFirstLetter(suffix)}`
          , where      = {};
        
        where.id = params.associationId;
        data = yield data[getter]({ where });

        if (isSingular && !data) {
          this.throw(`${model.name} ${params.id} association ${suffix} is not found`, 404);
        }
      }
    }

    this.body   = data;
    this.status = 200;
  }
}

const post = (model, associationModel) => {
  return function * () {
    this.body = {
      name: 'post'
    }
    this.staus = 201;
  }
}

const put = (model, associationModel) => {
  return function * () {
    this.body = {
      name: 'put',
      id: this.params.id
    }
    this.staus = 200;
  }
}

const del = (model, associationModel) => {
  return function * () {
    this.body = {
      name: 'del',
      id: this.params.id
    }
    this.staus = 200;
  }
}

const handlers = {
  get, post, put, del 
}

module.exports.callback = handlers;
