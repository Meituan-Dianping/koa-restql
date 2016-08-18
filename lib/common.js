'use strict'

const debug = require('debug')('koa-restql:common')

function switchByType (param, callbacks) {

  callbacks = callbacks || {}

  const {
    object, array, string, bool, number, defaults
  } = callbacks

  let callback

  switch (typeof param) {
    case 'object':
      if (Array.isArray(param)) {
        callback = array
      } else {
        callback = object
      }
      break
    case 'string':
      callback = string
      break
    case 'boolean':
      callback = bool
      break
    case 'number':
      callback = number
      break
    default:
      callback = defaults
      break
  }

  if (callback !== undefined) {
    if ('function' === typeof callback) {
      return callback(param)
    } else {
      return callback
    }
  }
}

function shouldIgnoreAssociation (method, options) {

  options = options || {}

  let ignore  = options.ignore

  return switchByType(ignore, {
    array : () => 
      ignore.find(ignoreMethod => ignoreMethod.toLowerCase() === method),
    bool  : () => ignore
  })
}

function parseAttributes (_attributes, attributes) {
  let attrs

  if (_attributes)

  return switchByType(_attributes, {
    array  : () => (_attributes.filter(attr => attributes[attr])),
    string : () => (_attributes.split(/,/).filter(attr => attributes[attr]))
  })
}

function unionWhere (_where) {

  return switchByType(_where, {
    object : () => {
  
      let where

      Object.keys(_where).forEach(key => {
        if (!/^_/.test(key)) {
          where = where || {}
          where[key] = _where[key]
        }
      })

      return where
    }
  })
}

function parseInclude (_include, associations, method) {

  return switchByType(_include, {
    string : () => {

      let association = associations[_include]

      if (!association)
        return

      if (shouldIgnoreAssociation(method, association.options.restql)) 
        return

      return association
    },

    object : () => {

      let include     = []
        , where       = _include.where
        , attributes  = _include.attributes
        , subQuery    = _include.subQuery
        , required    = !!+_include.required
        , through     = _include.through
        , association = associations[_include.association]

      subQuery = subQuery === undefined ? subQuery : !!+subQuery

      if (!association)
        return

      let options = association.options

      if (shouldIgnoreAssociation(method,options.restql))
        return

      if (_include.include) {
        include = unionInclude(_include.include, association.target.associations)
      }

      return {
        where, attributes, through, association, required, include, subQuery
      }

    }

  })

}

function unionInclude (_include, associations, method) {

  return switchByType(_include, {
    array: () => {
      return _include
        .map(item => parseInclude(item, associations, method))
        .filter(item => item)
    },

    object: () => {
      let include = parseInclude(_include, associations, method)
      return include || []
    },

    string: () => {
      let include = parseInclude(_include, associations, method)
      return include || []
    },

    defaults: () => ([])
  })

}

function parseQuery (query, model, method, options) {

  const {
    _attributes, _order, _through, _include, 
    _group, _having, _offset, _limit, 
    _subQuery, _distinct
  } = query

  const where      = unionWhere(query)
  const include    = unionInclude(_include, model.associations, method)
  const attributes = _attributes
  const order      = _order
  const through    = _through
  const group      = _group
  const having     = _having
  const subQuery   = _subQuery === undefined ? _subQuery : !!+_subQuery
  const offset     = +_offset || 0
  const distinct   = !!+_distinct
  const limit      = +_limit  || options.query._limit

  debug(where)
  debug(attributes)
  debug(order)
  debug(through)
  debug(include)
  debug(group)
  debug(having)
  debug(distinct)
  debug(subQuery)
  debug(offset)
  debug(limit)

  return {
    offset, limit, order, where, through, include, attributes,
    group, having, distinct, subQuery
  }

}

module.exports.parseQuery              = parseQuery
module.exports.switchByType            = switchByType
module.exports.shouldIgnoreAssociation = shouldIgnoreAssociation
