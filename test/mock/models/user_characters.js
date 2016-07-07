'use strict';

module.exports.attributes = (DataTypes) => {
  return {
    id : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },   

    user_id : {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },

    character_id : {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },

    rate : {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }
}
