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
    description : DataTypes.STRING,
  };
}

module.exports.options = {

  classMethods: {
    associate: (models) => {
      models.profile.belongsTo(models.user, {
        as: 'user',
        foreignKey: 'user_id',
        constraints: false
      });
    }
  }
};
