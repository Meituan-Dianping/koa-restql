'use strict';

module.exports.attributes = (DataTypes) => {
  return {
    login : DataTypes.STRING,
    email : DataTypes.STRING,
  };
}

module.exports.options = {

  indexes: [{
    unique: true,
    fields: ['login'],
  }],

  classMethods: {
    associations: (models) => {
      models.mituser.hasOne(models.profile, {
        as: 'profile',
        foreignKey: 'user_id',
      });
    }
  }
};
