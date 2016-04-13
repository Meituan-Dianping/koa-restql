'use strict';

module.exports.attributes = (DataTypes) => {
  return {
    id          : DataTypes.INTEGER,
    user_id     : DataTypes.INTEGER,
    description : DataTypes.STRING,
  };
}

module.exports.options = {

  indexes: [{
    unique: true,
    fields: ['user_id'],
  }],

};
