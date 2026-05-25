// Cargar el módulo de modelos CommonJS desde ESM mediante import dinámico
const dbModule = await import('../../models/index.cjs');
const db = dbModule.default || dbModule;
const { PaymentMethod } = db;

export const listPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.findAll({
      where: { is_active: true },
      order: [['id', 'ASC']]
    });
    return res.json(methods);
  } catch (err) {
    console.error('listPaymentMethods error', err);
    return res.status(500).json({ message: 'Error al listar métodos de pago' });
  }
};

export const getPaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const method = await PaymentMethod.findByPk(id);
    if (!method) return res.status(404).json({ message: 'Método de pago no encontrado' });
    return res.json(method);
  } catch (err) {
    console.error('getPaymentMethod error', err);
    return res.status(500).json({ message: 'Error al obtener método de pago' });
  }
};

export const createPaymentMethod = async (req, res) => {
  try {
    const { name, code, currency = 'USD', is_active = true, requires_responsable = false, generates_commission = false } = req.body;
    if (!name || !code) return res.status(400).json({ message: 'name y code son obligatorios' });

    // evitar duplicados por code
    const exists = await PaymentMethod.findOne({ where: { code } });
    if (exists) return res.status(409).json({ message: 'El código ya existe' });

    const created = await PaymentMethod.create({
      name, code, currency, is_active, requires_responsable, generates_commission
    });
    return res.status(201).json(created);
  } catch (err) {
    console.error('createPaymentMethod error', err);
    return res.status(500).json({ message: 'Error al crear método de pago' });
  }
};

export const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const method = await PaymentMethod.findByPk(id);
    if (!method) return res.status(404).json({ message: 'Método de pago no encontrado' });

    // No permitir cambiar id
    delete payload.id;

    await method.update(payload);
    return res.json(method);
  } catch (err) {
    console.error('updatePaymentMethod error', err);
    return res.status(500).json({ message: 'Error al actualizar método de pago' });
  }
};