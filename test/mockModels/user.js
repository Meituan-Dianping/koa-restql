'use strict';

module.exports.attributes = (DataTypes) => {
  return {
    id : {
      type: DataTypes.INTEGER,
      primaryKey: true
    },   

    company_id : DataTypes.INTEGER,
    login      : DataTypes.STRING,
    email      : DataTypes.STRING
  };
}

module.exports.options = {

  indexes: [{
    unique: true,
    fields: ['login']
  }],

  classMethods: {
    associate: (models) => {
      models.user.hasOne(models.profile, {
        as: 'profile',
        foreignKey: 'user_id'
      });

      models.user.hasMany(models.department, {
        as: 'departments',
        foreignKey: 'user_id'
      });

      models.user.belongsToMany(models.tag, {
        as: 'tags',
        through: {
          model: models.user_tags,
          foreignKey: 'user_id',
          otherKey: 'tag_id'
        }
      })
    }
  }
}
