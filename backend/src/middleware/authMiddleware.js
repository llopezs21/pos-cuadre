import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // Añade el payload del token a la petición
            next();
        } catch (error) {
            res.status(401).send('Token no válido o expirado.');
        }
    }
    if (!token) {
        res.status(401).send('No autorizado, no hay token.');
    }
};

// Middleware para roles
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).send('No tienes permiso para realizar esta acción.');
        }
        next();
    };
};