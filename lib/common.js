'use strict'

const qs    = require('qs');
const debug = require('debug')('koa-restql:common');

module.exports.getAssociationName = (association) => {
    let isSingular  = association.isSingleAssociation
      , name        = association.options.name;

    return isSingular ? name.singular : name.plural;
}

const unionAttributes = (_attributes, attributes) => {

  if (!_attributes)
    return;

  let attrs;

  if (Array.isArray(_attributes)) {
    attrs = _attributes;
  } else if (typeof _attributes === 'string') {
    attrs = _attributes.split(/(,|\ )/);
  }

  if (!attrs || !attrs.length)
    return;
  
  return attrs.filter(attr => !!attributes[attr]);
}

const unionWhere = (_where, attributes) => {
  if (!_where || typeof _where !== 'object')
    return;

  let where;

  Object.keys(_where).forEach(key => {
    if (attributes[key]) {
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

const parseInclude = (_include, associations) => {

  let include, association, where, attributes, through;

  if ('string' === typeof _include) {
    association = associations[_include];
  } else if ('object' === typeof _include) {
    where       = _include.where
    attributes  = _include.attributes
    through     = _include.through;
    association = associations[_include.association];

    if (!association)
      return;

    if (_include.include) {
      include = unionInclude(_include.include, association.target.associations);
    }
  }
    
  return {
    where, attributes, through, association, 
    include: include || []
  }
}

const unionInclude = (_include, associations) => {
  if (!_include)
    return;

  if (Array.isArray(_include)) {
    return _include.map(item => {
      return parseInclude(item, associations);
    }).filter(item => item);
  } else {
    return [ parseInclude(_include, associations) ]
  }
}

module.exports.parseQuerystring = (querystring, model) => {
  let _order, _where, _attributes, _through, _include
    , attributes = model.attributes
    , query      = qs.parse(querystring, { allowDots: true  });
  
  debug(query);

  _where      = unionWhere(query, attributes);
  _attributes = unionAttributes(query._attributes, attributes);
  _order      = unionOrder(query._order, attributes);
  _through    = query._through;
  _include    = unionInclude(query._include, model.associations);

  debug(_where);
  debug(_attributes);
  debug(_order);
  debug(_through);
  debug(_include);

  return {
    _order   : _order,
    _where   : _where, 
    _through : _through, 
    _include : _include || [],
    _attributes : _attributes || Object.keys(model.attributes)
  };
}
