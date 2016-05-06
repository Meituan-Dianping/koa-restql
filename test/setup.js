'use strict';

const mock   = require('./mock/data');
const common = require('./common');
const debug  = common.debug('koa-restql:test:setup');

before ('db setup', function (done) {

  let sequelize = common.sequelize;

  common.loadMockData().then(res => {
    done();
  }).catch(done);
})
