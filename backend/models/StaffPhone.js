'use strict';
module.exports = (sequelize, DataTypes) => {
  const StaffPhone = sequelize.define('StaffPhone', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    phone_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    owner_name: { type: DataTypes.STRING(128), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'staff_phones',
    timestamps: true,
    underscored: true
  });

  return StaffPhone;
};
