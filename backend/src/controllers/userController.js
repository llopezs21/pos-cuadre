import pool from '../db/database.js';
import bcrypt from 'bcryptjs';

const PUBLIC_FIELDS = 'id, username, role, is_active, gie_app_username, created_at, updated_at';

/** API usa cashier; BD almacena user */
const toPublicRole = (dbRole) => (dbRole === 'admin' ? 'admin' : 'cashier');
const toDbRole = (apiRole) => (apiRole === 'admin' ? 'admin' : 'user');

const normalizeGieUsername = (value) => {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === '') return null;
  return String(value).trim();
};

const formatUser = (row) => ({
  id: row.id,
  username: row.username,
  role: toPublicRole(row.role),
  is_active: row.is_active !== 0 && row.is_active !== false,
  gie_app_username: row.gie_app_username ?? null,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const fetchUserById = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`,
    [id]
  );
  return rows[0] ? formatUser(rows[0]) : null;
};

// GET /api/users
export const listUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM users ORDER BY id ASC`
    );
    return res.json(rows.map(formatUser));
  } catch (err) {
    console.error('listUsers error', err);
    return res.status(500).json({ message: 'Error al listar usuarios' });
  }
};

// POST /api/users
export const createUser = async (req, res) => {
  try {
    const { username, password, role = 'cashier', is_active = true, gie_app_username } = req.body;

    if (!username?.trim() || !password) {
      return res.status(400).json({ message: 'username y password son obligatorios' });
    }
    if (!['admin', 'cashier'].includes(role)) {
      return res.status(400).json({ message: 'role debe ser admin o cashier' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const dbRole = toDbRole(role);

    const gieUsername = normalizeGieUsername(gie_app_username);

    const [result] = await pool.query(
      'INSERT INTO users (username, password, role, is_active, gie_app_username) VALUES (?, ?, ?, ?, ?)',
      [username.trim(), hashedPassword, dbRole, Boolean(is_active), gieUsername ?? null]
    );

    const user = await fetchUserById(result.insertId);
    return res.status(201).json(user);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ese nombre de usuario ya existe' });
    }
    console.error('createUser error', err);
    return res.status(500).json({ message: 'Error al crear usuario' });
  }
};

// PUT /api/users/:id
export const updateUser = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const actorId = req.user?.userId;

    if (targetId === actorId) {
      const { is_active } = req.body;
      if (is_active === false) {
        return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
      }
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [targetId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const { username, password, role, is_active, gie_app_username } = req.body;
    const updates = [];
    const values = [];

    if (username !== undefined) {
      updates.push('username = ?');
      values.push(String(username).trim());
    }
    if (role !== undefined) {
      if (!['admin', 'cashier'].includes(role)) {
        return res.status(400).json({ message: 'role debe ser admin o cashier' });
      }
      updates.push('role = ?');
      values.push(toDbRole(role));
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(Boolean(is_active));
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }
    if (gie_app_username !== undefined) {
      updates.push('gie_app_username = ?');
      values.push(normalizeGieUsername(gie_app_username));
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(targetId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const user = await fetchUserById(targetId);
    return res.json(user);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ese nombre de usuario ya existe' });
    }
    console.error('updateUser error', err);
    return res.status(500).json({ message: 'Error al actualizar usuario' });
  }
};

// DELETE /api/users/:id  (soft-delete)
export const deactivateUser = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const actorId = req.user?.userId;

    if (targetId === actorId) {
      return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
    }

    const [result] = await pool.query(
      'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [targetId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = await fetchUserById(targetId);
    return res.json({ message: 'Usuario desactivado', user });
  } catch (err) {
    console.error('deactivateUser error', err);
    return res.status(500).json({ message: 'Error al desactivar usuario' });
  }
};
