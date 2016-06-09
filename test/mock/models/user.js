'use strict';

module.exports.attributes = (DataTypes) => {

  return {
    id : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },   
    // login : {
    //   type: DataTypes.STRING,
    //   unique: true
    // }, 
    login : {
      type: DataTypes.STRING,
    }, 
    email : DataTypes.STRING,
    deleted_at : {
      type: DataTypes.DATE,
      allowNull: false,
      /**
       * if this type is DATE,
       * defaultValue must be a Date, 
       * otherwise paranoid is useless
       */
      defaultValue: new Date(0)
    }
  };
}

module.exports.options = {

  indexes: [{
    type: 'unique',
    name: 'user_login',
    fields: ['login']
  }],

  classMethods: {
    associate: (models) => {

      models.user.hasOne(models.profile, {
        as: 'profile',
        foreignKey: 'user_id',
        constraints: false
      });

      models.user.hasMany(models.department, {
        as: 'departments',
        foreignKey: 'user_id',
        constraints: false
      });

      models.user.belongsToMany(models.tag, {
        as: 'tags',
        constraints: false,
        through: {
          model: models.user_tags,
          foreignKey: 'user_id',
          otherKey: 'tag_id',
        }
      })
    }
  }
}
