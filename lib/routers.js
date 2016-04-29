'use strict';

const common = require('./common');
const debug  = common.debug('koa-restql:routers');

module.exports.load = (router, models, options) => {
  debug(options);

  let keys    = Object.keys(models)
    , routers = {}
    , methods = options.methods || ['get', 'post', 'put', 'del'];

  keys.forEach(key => {
    let model = models[key];
    methods.forEach(method => {
      let url = `/${key}`
      router[method](url, function *(next) {
        debug(`MOUNTED API: ${prefix}`);
      })
    })    
  })
}
