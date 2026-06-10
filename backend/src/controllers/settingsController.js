import pool from '../db/database.js';

/**
 * FASE 1: Controlador de Configuración Global
 * Gestiona los parámetros de negocio dinámicos desde la tabla global_settings
 * SIEMPRE fuerza WHERE id = 1 para mantener un único registro de configuración
 */

/**
 * GET /api/settings
 * Obtiene la configuración global del sistema
 */
export const getSettings = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM global_settings WHERE id = 1'
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                message: 'Configuración no encontrada. Ejecute los scripts de inicialización.' 
            });
        }

        const settings = rows[0];
        
        res.json({
            success: true,
            data: {
                id: settings.id,
                iva_rate: Number(settings.iva_rate),
                iva_threshold: Number(settings.iva_threshold),
                reconciliation_tolerance: Number(settings.reconciliation_tolerance),
                recharge_commission_percent: Number(settings.recharge_commission_percent ?? 10),
                updated_at: settings.updated_at
            }
        });
    } catch (error) {
        console.error('Error al obtener configuración global:', error);
        res.status(500).json({ 
            message: 'Error al obtener la configuración',
            error: error.message 
        });
    }
};

/**
 * PUT /api/settings
 * Actualiza la configuración global del sistema
 * Body: { iva_rate?, iva_threshold?, reconciliation_tolerance? }
 */
export const updateSettings = async (req, res) => {
    try {
        const { iva_rate, iva_threshold, reconciliation_tolerance, recharge_commission_percent } = req.body;

        // Validaciones
        if (iva_rate !== undefined) {
            const rate = Number(iva_rate);
            if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
                return res.status(400).json({ 
                    message: 'iva_rate debe ser un número entre 0 y 1 (ej: 0.16 para 16%)' 
                });
            }
        }

        if (iva_threshold !== undefined) {
            const threshold = Number(iva_threshold);
            if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
                return res.status(400).json({ 
                    message: 'iva_threshold debe ser un número entre 0 y 1 (ej: 0.5 para 50%)' 
                });
            }
        }

        if (reconciliation_tolerance !== undefined) {
            const tolerance = Number(reconciliation_tolerance);
            if (!Number.isFinite(tolerance) || tolerance < 0) {
                return res.status(400).json({ 
                    message: 'reconciliation_tolerance debe ser un número positivo' 
                });
            }
        }

        if (recharge_commission_percent !== undefined) {
            const commission = Number(recharge_commission_percent);
            if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
                return res.status(400).json({
                    message: 'recharge_commission_percent debe ser un número entre 0 y 100'
                });
            }
        }

        // Construir query de actualización dinámicamente
        const updates = [];
        const values = [];

        if (iva_rate !== undefined) {
            updates.push('iva_rate = ?');
            values.push(Number(iva_rate));
        }
        if (iva_threshold !== undefined) {
            updates.push('iva_threshold = ?');
            values.push(Number(iva_threshold));
        }
        if (reconciliation_tolerance !== undefined) {
            updates.push('reconciliation_tolerance = ?');
            values.push(Number(reconciliation_tolerance));
        }
        if (recharge_commission_percent !== undefined) {
            updates.push('recharge_commission_percent = ?');
            values.push(Number(recharge_commission_percent));
        }

        if (updates.length === 0) {
            return res.status(400).json({ 
                message: 'Debe proporcionar al menos un campo para actualizar' 
            });
        }

        // Agregar timestamp de actualización
        updates.push('updated_at = CURRENT_TIMESTAMP');

        // Forzar WHERE id = 1
        values.push(1);

        const query = `UPDATE global_settings SET ${updates.join(', ')} WHERE id = ?`;
        
        const [result] = await pool.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: 'Configuración no encontrada. Ejecute los scripts de inicialización.' 
            });
        }

        // Obtener la configuración actualizada
        const [updatedRows] = await pool.query(
            'SELECT * FROM global_settings WHERE id = 1'
        );

        const settings = updatedRows[0];

        res.json({
            success: true,
            message: 'Configuración actualizada exitosamente',
            data: {
                id: settings.id,
                iva_rate: Number(settings.iva_rate),
                iva_threshold: Number(settings.iva_threshold),
                reconciliation_tolerance: Number(settings.reconciliation_tolerance),
                recharge_commission_percent: Number(settings.recharge_commission_percent ?? 10),
                updated_at: settings.updated_at
            }
        });
    } catch (error) {
        console.error('Error al actualizar configuración global:', error);
        res.status(500).json({ 
            message: 'Error al actualizar la configuración',
            error: error.message 
        });
    }
};
