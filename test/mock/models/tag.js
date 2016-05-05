'use strict';

module.exports.attributes = (DataTypes) => {
  return {
    id : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },   

    name : DataTypes.STRING
  }
}

module.exports.options = {
  
  indexes: [{
    unique: true,
    fields: ['name']
  }],

  classMethods: {
    associate: (models) => {
      models.tag.belongsToMany(models.user, {
        as: 'users',
        through: {
          model: models.user_tags,
          foreignKey: 'tag_id',
          otherKey: 'user_id'
        }
      })
    }
  }
}
