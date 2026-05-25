import pool from '../db/database.js';

// GET /api/admin/users
export const listUsers = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, role, gie_app_username FROM users ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('listUsers error', err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// PUT /api/admin/users/:id/gie-username
export const updateUserGieUsername = async (req, res) => {
  const { id } = req.params;
  const { gie_app_username } = req.body;
  try {
    const [result] = await pool.query('UPDATE users SET gie_app_username = ? WHERE id = ?', [gie_app_username || null, id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    const [rows] = await pool.query('SELECT id, username, role, gie_app_username FROM users WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('updateUserGieUsername error', err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};
