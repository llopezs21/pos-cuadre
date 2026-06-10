import pool from '../db/database.js';

export const listStaffPhones = async (req, res) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const query = activeOnly
      ? 'SELECT * FROM staff_phones WHERE is_active = TRUE ORDER BY owner_name ASC'
      : 'SELECT * FROM staff_phones ORDER BY owner_name ASC';
    const [rows] = await pool.query(query);
    return res.json(rows);
  } catch (err) {
    console.error('listStaffPhones error', err);
    return res.status(500).json({ message: 'Error al listar teléfonos del personal' });
  }
};

export const createStaffPhone = async (req, res) => {
  try {
    const { phone_number, owner_name } = req.body;
    if (!phone_number || !owner_name) {
      return res.status(400).json({ message: 'phone_number y owner_name son obligatorios' });
    }

    const normalized = String(phone_number).replace(/\D/g, '');
    const [result] = await pool.query(
      'INSERT INTO staff_phones (phone_number, owner_name) VALUES (?, ?)',
      [normalized, owner_name.trim()]
    );

    const [rows] = await pool.query('SELECT * FROM staff_phones WHERE id = ?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ese número de teléfono ya está registrado' });
    }
    console.error('createStaffPhone error', err);
    return res.status(500).json({ message: 'Error al crear teléfono del personal' });
  }
};

export const deleteStaffPhone = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      'UPDATE staff_phones SET is_active = FALSE WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Teléfono no encontrado' });
    }
    return res.json({ message: 'Teléfono desactivado exitosamente' });
  } catch (err) {
    console.error('deleteStaffPhone error', err);
    return res.status(500).json({ message: 'Error al eliminar teléfono del personal' });
  }
};
