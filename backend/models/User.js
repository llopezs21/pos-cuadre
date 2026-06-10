'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'user' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    gie_app_username: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null },
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
  });

  return User;
};
