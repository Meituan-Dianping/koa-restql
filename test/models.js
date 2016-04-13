'use strict';

const chai   = require('chai');
const debug  = require('debug')('kr:test:models');
const models = require('../lib/models');

const assert = chai.assert;
const expect = chai.expect;
const should = chai.should;

describe('loadModels (path -> models)', function () {
  it ('should return a object', function () {
    let val = models.loadModels('./test/mockModels');
    expect(val).to.be.a('object');

    let keys = Object.keys(val);
    expect(keys).to.be.a('array');
    assert.isAbove(keys.length, 0);

    keys.forEach((key) => {
      let model = val[key];
      expect(model).to.be.a('object');
      expect(model.name).to.be.a('string');
      expect(model.attributes).to.be.a('function');
      expect(model.options).to.be.a('object');
    });
  })
})
