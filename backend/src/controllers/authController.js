import pool from '../db/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Función para registrar un nuevo usuario (opcional, pero útil)
export const register = async (req, res) => {
    const { username, password, role } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        const query = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
        await pool.query(query, [username, hashedPassword, role || 'user']);
        res.status(201).send('Usuario creado exitosamente.');
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar el usuario', error });
    }
};

// Función para el inicio de sesión
export const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).send('Usuario o contraseña incorrectos.');
        }
        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send('Usuario o contraseña incorrectos.');
        }

        // Crear el payload del token
        const payload = { userId: user.id, role: user.role };

        // Firmar el token
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });

    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error });
    }
};

// FASE 2: Función para obtener el usuario actual (perfil protegido)
export const getCurrentUser = async (req, res) => {
    try {
        // req.user viene del middleware protect y contiene { userId, role }
        const userId = req.user.userId;
        
        const [users] = await pool.query('SELECT id, username, role FROM users WHERE id = ?', [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        const user = users[0];
        res.json({ 
            user: { 
                id: user.id, 
                username: user.username, 
                role: user.role 
            } 
        });
    } catch (error) {
        console.error('Error al obtener usuario actual:', error);
        res.status(500).json({ message: 'Error al obtener usuario', error });
    }
};