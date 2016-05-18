'use strict';

module.exports.attributes = (DataTypes) => {
  return {
    id : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },   

    user_id : DataTypes.INTEGER,
    tag_id  : DataTypes.INTEGER,
    status  : DataTypes.INTEGER
  }
}

module.exports.options = {

  indexes: [{
    unique: true,
    fields: ['user_id', 'tag_id']
  }]
}
