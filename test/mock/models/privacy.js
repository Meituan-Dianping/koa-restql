'use strict';

module.exports.attributes = (DataTypes) => {
  return {
    id : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },   

    user_id: {
      type: DataTypes.INTEGER,
      unique: true
    },
    secret : DataTypes.STRING,
  };
}

module.exports.options = {
};
