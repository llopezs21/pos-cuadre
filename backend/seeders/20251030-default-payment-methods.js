'use strict';
module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert('payment_methods', [
      { name: 'Efectivo USD', code: 'CASH_USD', currency: 'USD', is_active: true, requires_responsable: false, generates_commission: false, created_at: now, updated_at: now },
      { name: 'Efectivo VES', code: 'CASH_VES', currency: 'VES', is_active: true, requires_responsable: false, generates_commission: false, created_at: now, updated_at: now },
      { name: 'Punto Mi Banco', code: 'POS_MIBANCO', currency: 'VES', is_active: true, requires_responsable: true, generates_commission: false, created_at: now, updated_at: now },
      { name: 'Punto Banesco', code: 'POS_BANESCO', currency: 'VES', is_active: true, requires_responsable: true, generates_commission: false, created_at: now, updated_at: now },
      { name: 'Transferencia', code: 'TRANSFER', currency: 'USD', is_active: true, requires_responsable: false, generates_commission: false, created_at: now, updated_at: now }
    ], {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('payment_methods', null, {});
  }
};
