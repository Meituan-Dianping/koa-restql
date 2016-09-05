'use strict';

module.exports.attributes = (DataTypes) => {

  return {

    id : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },   

    name : {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    }, 

    words : {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    }, 

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
  }
}

module.exports.options = {

  indexes: [{
    type: 'unique',
    /* Name is important for unique index */
    name: 'house_name_unique',
    fields: ['name']
  }],

  classMethods: {
    associate: (models) => {

      models.house.hasOne(models.seat, {
        as: 'seat',
        constraints: false
      })

      models.house.hasMany(models.character, {
        as: 'members',
        constraints: false
      })

      models.house.hasMany(models.character, {
        as: 'bastards',
        constraints: false,
        scope: {
          is_bastard: true
        }
      })
    }
  }
}
