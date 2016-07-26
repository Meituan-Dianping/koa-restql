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
    type: 'unique',
    name: 'seat_house_id_unique',
    fields: ['house_id']
  }],

  classMethods: {
    associate: (models) => {

      models.seat.belongsTo(models.house, {
        as: 'house',
        constraints: false
      })
    }
  }
}
