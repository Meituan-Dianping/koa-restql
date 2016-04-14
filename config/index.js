'use strict';

const env = process.env.NODE_ENV || 'test';
const config = require(`./${env}.json`);

module.exports = config;
