'use strict';

const mock   = require('./mock/data');
const common = require('./common');
const debug  = common.debug('koa-restql:test:setup');

before ('db setup', function (done) {

  let sequelize = common.sequelize;

  sequelize.sync({
    force : true,
  }).then(res => {
    common.loadMockData();
    done();
  }).catch(done);
})
