'use strict';

module.exports.attributes = (DataTypes) => {
  return {
    id : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },   

    user_id : DataTypes.INTEGER,
    tag_id  : DataTypes.INTEGER
  }
}

module.exports.options = {

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
