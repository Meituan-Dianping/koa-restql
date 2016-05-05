'use strict'

const debug = require('debug')('koa-restql:middlewares');
const util  = require('util');

const getResource = (params, paramNames, models) => {

}

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports.get = (pathRegex, model, association) => {
  return function * () {
    let params = this.params || {}
      , keys   = pathRegex.keys
      , key    = keys[0]
      , data;

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

    if (!keys.length) {
      data = yield model.findAll();
    } else {
      let id = params[key.name];

      data = yield model.findOne({
        where: { id }
      })

      if (!data) {
        this.throw(`${model.name} ${id} is not found`, 404);
      }

      if (association) {

        let isSingle = association.isSingleAssociation
          , name     = association.options.name
          , suffix   = isSingle ? name.singular : name.plural
          , getter   = `get${capitalizeFirstLetter(suffix)}`
          , where    = {};
        
        key = keys[1];
        if (key) {
          where.id = params[key.name];
        }
        
        data = yield data[getter]({ where });

        if (isSingle && !data) {
          this.throw(`${association.name} ${id} is not found`, 404);
        }
      }
    }

    this.body   = data;
    this.status = 200;
  }
}

module.exports.post = (model, associationModel) => {
  return function * () {
    this.body = {
      name: 'post'
    }
    this.staus = 201;
  }
}

module.exports.put = (model, associationModel) => {
  return function * () {
    this.body = {
      name: 'put',
      id: this.params.id
    }
    this.staus = 200;
  }
}

module.exports.del = (model, associationModel) => {
  return function * () {
    this.body = {
      name: 'del',
      id: this.params.id
    }
    this.staus = 200;
  }
}
