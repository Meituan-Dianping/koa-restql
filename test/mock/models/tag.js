'use strict';

module.exports.attributes = (DataTypes) => {
  return {
    id : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },   

    name : {
      type: DataTypes.STRING,
      unique: true
    }  
  }
}

module.exports.options = {
  
  classMethods: {
    associate: (models) => {
      models.tag.belongsToMany(models.user, {
        as: 'users',
        constraints: false,
        through: {
          model: models.user_tags,
          foreignKey: 'tag_id',
          otherKey: 'user_id'
        }
      })
    }
  }
}
