'use strict'

const debug = require('debug')('koa-restql:middlewares');
const util  = require('util');

const getResource = (params, paramNames, models) => {

}

module.exports.get = (pathRegex, model, association) => {
  return function * () {
    let params = this.params || {};

    debug(this.request.url);
    debug(params);
    debug(pathRegex);
    debug(pathRegex.keys);
    debug(model);
    debug(association);

    // let name = paramNames[0];
    // if (params[name] === undefined) {
    //   this.body = yield model.findAll();
    // } else {
    //   this.body = yield model.findOne({
    //     where { id: params[name] }
    //   }) 
    // }
    // 
    // name = paramNames[1];
    // if (name) {
    //   
    // }

     //let include = [];
     //if (associationName) {
     //  let association = model.associations[associationName];
     //  include.push({
     //  
     //  })
     //}

     //paramNames.forEach((name, index) => {
     //  if (params[name] === undefined) {
     //    this.status = 200;
     //    if (this.body) {
     //      let getter = `get${associationName}`;
     //      this.body
     //    } else {
     //    }
     //    return;
     //  } else {
     //    let where = {
     //      id: params[name]
     //    };

     //    let data = yield models[index].findOne({
     //      where
     //    })

     //    if (!data) {
     //      this.throw('404', `${models[index].name} NOT FOUND`);
     //    }

     //    this.status = 200;
     //    this.body = data.dataValues;
     //  }
     //})




    //debug(util.inspect(this, false, null));
    //debug(this.params);
    //if (association) {
    //  this.body = {};
    //  this.staus = 200;
    //} else {
    //  let id = this.params.id;

    //  if (id !== undefined) {
    //    data = yield model.findAll();
    //  } else {
    //    data = yield model.find({
    //      where: { id }
    //    })
    //  }
    //}

    //if (!data) {
    //  this.status = 404;
    //} else {
      this.status = 200;
    //}
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
