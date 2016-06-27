'use strict'

const qs    = require('qs');
const debug = require('debug')('koa-restql:common');

const defaultLimit = 20;

module.exports.getAssociationName = (association) => {
    let isSingular  = association.isSingleAssociation
      , name        = association.options.name;

    return isSingular ? name.singular : name.plural;
}

const parseAttributes = (_attributes) => {
  let attrs;

  if (Array.isArray(_attributes)) {
    attrs = _attributes;
  } else if (typeof _attributes === 'string') {
    attrs = _attributes.split(/(,|\ )/);
  } 

  return attrs;
}

const unionAttributes = (_attributes, attributes) => {

  if (typeof _attributes === 'object') {
    if (_attributes.include) {
      /**
       * @FIXME
       *
       * This is a bug in Sequelize 
       * include doesn't work at all
       */
      _attributes.include = parseAttributes(_attributes.include);
    }
    if (_attributes.exclude) {
      _attributes.exclude = parseAttributes(_attributes.exclude);
    }
  } else {
    return parseAttributes(_attributes);
  }

  return _attributes;
}

const unionWhere = (_where, attributes) => {
  if (!_where || typeof _where !== 'object')
    return;

  let blackKeylist = [
    '_include', '_attributes', '_order', 
    '_through', '_offset', '_limit', '_ignoreDuplicates'
  ];

  let where;

  Object.keys(_where).forEach(key => {
    if (attributes[key] || blackKeylist.indexOf(key) === -1) {
      where = where || {};
      where[key] = _where[key];
    }
  })

  return where;
}

const unionOrder = (_order, attributes) => {
  if (!_order)
    return;

  if (Array.isArray(_order)) {
    if (!_order.length)
      return;

    return _order.filter(item => {
      if (!item)
        return false;
      
      let name;
      if (Array.isArray(item)) {
        name = item[0];
      } else if (typeof item === 'string'){
        name = item.split(' ')[0];
      }
      return name && !!attributes[name];
    }).map(item => {
      if (typeof item === 'string') {
        return item.split(' ');
      }
      return item;
    })
  } else if (typeof _order === 'string') {
    let order = _order.split(' ');
    if (attributes[order[0]]) {
      return [order];
    }   
  } 
}

const shouldIgnoreAssociation = (method, options) => {

  options = options || {}

  let ignore  = options.ignore;

  switch (typeof ignore) {
    case 'object':
      if (Array.isArray(ignore)) {
        if (ignore.indexOf(method.name) !== -1)
          return true;
      }
      break;
    case 'boolean':
      if (ignore) return true;
      break;
    default:
      break;
  }

  return false;
}

const parseInclude = (_include, associations, method) => {

  let include, association, where, attributes, through, required;

  if ('string' === typeof _include) {

    association = associations[_include];
    if (!association)
      return;

    if (shouldIgnoreAssociation(method, association.options.restql)) 
      return;

  } else if ('object' === typeof _include) {

    where       = _include.where;
    attributes  = _include.attributes;
    required    = _include.required;
    through     = _include.through;

    association = associations[_include.association];

    if (!association)
      return;

    let options = association.options
    if (shouldIgnoreAssociation(method, association.options.restql))
      return;

    if (_include.include) {
      include = unionInclude(_include.include, association.target.associations);
    }
  }
    
  return {
    where, attributes, through, association, required,
    include: include || []
  }
}

const unionInclude = (_include, associations, method) => {
  if (!_include)
    return;

  if (Array.isArray(_include)) {
    return _include.map(item => {
      return parseInclude(item, associations, method);
    }).filter(item => item);
  } else {
    let include = parseInclude(_include, associations, method);
    return include ? [ include ] : [];
  }
}

module.exports.parseQuerystring = (querystring, model, method) => {

  let attributes = model.attributes
    , query      = qs.parse(querystring, { allowDots: true  });

  debug(query);

  let _where      = unionWhere(query, attributes)
    , _attributes = unionAttributes(query._attributes, attributes)
    , _order      = unionOrder(query._order, attributes)
    , _through    = query._through
    , _include    = unionInclude(query._include, model.associations, method)
    , _offset     = query._offset ? +query._offset : 0
    , _limit      = query._limit ? +query._limit : defaultLimit
    , _ignoreDuplicates = query._ignoreDuplicates;

  debug(_where);
  debug(_attributes);
  debug(_order);
  debug(_through);
  debug(_include);
  debug(_offset);
  debug(_limit);
  debug(_ignoreDuplicates);

  return {
    _offset           : _offset,
    _limit            : _limit,
    _order            : _order,
    _where            : _where, 
    _through          : _through, 
    _include          : _include || [],
    _attributes       : _attributes || Object.keys(model.attributes),
    _ignoreDuplicates : _ignoreDuplicates
  };
}

module.exports.shouldIgnoreAssociation = shouldIgnoreAssociation;
