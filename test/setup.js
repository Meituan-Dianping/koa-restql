'use strict';

const common = require('./common');

const debug  = common.debug('kr:test:setup');
const config = common.config;

before('setup', function (done) {

  let sequelize = common.sequelize;
  common.loadMockModels('./test/mockModels');

  sequelize.sync({
    force : true,
  }).then(res => done()).catch(done);

})
