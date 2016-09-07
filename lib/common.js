'use strict'

const _     = require('lodash')
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
      return include ? [ include ] : []
    },

    string: () => {
      let include = parseInclude(_include, associations, method)
      return include ? [ include ] : []
    },

    defaults: () => ([])
  })

}

function unionLimit (_limit, options) {

  if (_limit !== null) {
    return +_limit || +options.query._limit
  }

}

function parseQuery (query, model, method, options) {

  const queryParsers = {
    '_include'  : (include) => unionInclude(include, model.associations, method), 
    '_limit'    : (limit) => unionLimit(limit, options),
    '_offset'   : (offset) => +offset || 0,
    '_distinct' : (distinct) => !!+distinct,
    '_subQuery' : (subQuery) => subQuery === undefined ? subQuery : !!+subQuery,
    '_ignoreDuplicates': (ignoreDuplicates) => !!+ignoreDuplicates
  }

  const parsedQuery = {}

  _.keys(query).forEach(key => {

    const regex  = /^_/
    const parser = queryParsers[key]

    if (!regex.test(key))
      return

    const propName  = key.replace(regex, '')
    const propValue = parser ? parser(query[key]) : query[key]

    if (propValue !== undefined) {
      parsedQuery[propName] = propValue
    }

  })

  parsedQuery.where = parsedQuery.where || {}
  _.assign(parsedQuery.where, unionWhere(query))

  if (parsedQuery.limit === undefined) {
    parsedQuery.limit = queryParsers['_limit'](query._limit)
  }

  if (parsedQuery.offset === undefined) {
    parsedQuery.offset = queryParsers['_offset'](query._offset)
  }

  debug(parsedQuery)

  return parsedQuery

}

module.exports.parseQuery              = parseQuery
module.exports.switchByType            = switchByType
module.exports.shouldIgnoreAssociation = shouldIgnoreAssociation
