'use strict';

module.exports.attributes = (DataTypes) => {

  return {

    id : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },   

    name : {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ''
    }, 

    house_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
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
  };
}

module.exports.options = {

  indexes: [{
    type: 'unique',
    /* Name is important for unique index */
    name: 'seat_name_unique',
    fields: ['name']
  }, {
    fields: ['house_id']
  }],

  classMethods: {
    associate: (models) => {

      models.character.belongsTo(models.house, {
        as: 'seat',
        constraints: false
      })
    }
  }
}
