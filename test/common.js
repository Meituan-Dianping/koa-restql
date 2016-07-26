'use strict';

const debug   = require('debug')('restql:test:common')
const assert  = require('assert')
const common  = require('../lib/common')
const methods = require('../lib/methods')

describe ('common', function () {

  const {
    switchByType, shouldIgnoreAssociation
  } = common;

  describe ('switchByType | callbacks are functions', function () {

    const callbacks = {
      object   : () => 'object',
      array    : () => 'array',
      string   : () => 'string',
      bool     : () => 'bool',
      number   : () => 'number',
      defaults : () => 'defaults'
    }
    
    it ('should call object callback', function () {

      let res = switchByType({}, callbacks);
      assert(res === 'object');

    })

    it ('should call array callback', function () {

      let res = switchByType([], callbacks);
      assert(res === 'array');

    })

    it ('should call string callback', function () {

      let res = switchByType('', callbacks);
      assert(res === 'string');

    })

    it ('should call bool callback', function () {

      let res = switchByType(true, callbacks);
      assert(res === 'bool');

    })

    it ('should call number callback', function () {

      let res = switchByType(0, callbacks);
      assert(res === 'number');

    })

    it ('should call default callback', function () {

      function tester () {}

      let res = switchByType(tester, callbacks);
      assert(res === 'defaults');

    })

  })

  describe ('switchByType | callbacks are not function', function () {

    function getTestCallbacks (key) {
      const callbacks = {};
      callbacks[key] = true;
      return  callbacks;
    }
    
    it ('should call object callback', function () {

      let cbs = getTestCallbacks('object')
      let res = switchByType({}, cbs)
      assert(res)

    })

    it ('should call array callback', function () {

      let cbs = getTestCallbacks('array')
      let res = switchByType([], cbs)
      assert(res)

    })

    it ('should call string callback', function () {

      let cbs = getTestCallbacks('string')
      let res = switchByType('', cbs);
      assert(res);

    })

    it ('should call bool callback', function () {

      let cbs = getTestCallbacks('bool')
      let res = switchByType(false, cbs);
      assert(res);

    })

    it ('should call number callback', function () {

      let cbs = getTestCallbacks('number')
      let res = switchByType(0, cbs);
      assert(res);

    })

    it ('should call defaults callback', function () {

      function tester () {}

      let cbs = getTestCallbacks('defaults')
      let res = switchByType(tester, cbs);
      assert(res);

    })

  })

  describe ('shouldIgnoreAssociation', function () {

    let func = shouldIgnoreAssociation

    it ('should return false | ignore is a boolean', function () {

      methods.forEach(method => {
        let res = shouldIgnoreAssociation(method, { ignore: true })
        assert(res);
      })

    })  

    it ('should return false | ignore is an array', function () {

      methods.forEach(method => {

        let ignore = ['get', 'post']
          , res    = shouldIgnoreAssociation(method, { ignore })

        if (ignore.indexOf(method) !== -1) {
          assert(res)
        } else {
          assert(!res);
        }
      })

    })

  })

})

