'use strict';

module.exports.attributes = (DataTypes) => {
  return {
    id : {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },   

    user_id     : DataTypes.INTEGER,
    description : DataTypes.STRING,
  };
}

module.exports.options = {

  indexes: [{
    unique: true,
    fields: ['user_id'],
  }],

  classMethods: {
    associate: (models) => {
      models.profile.belongsTo(models.user, {
        as: 'user',
        foreignKey: 'user_id'
      });
    }
  }
};
