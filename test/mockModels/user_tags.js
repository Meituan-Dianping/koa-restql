'use strict';

module.exports.attributes = (DataTypes) => {
  return {
    id : {
      type: DataTypes.INTEGER,
      primaryKey: true
    },   

    name : DataTypes.STRING
  }
}
