import pool from './database.js';

const MAX_RETRIES = 10;
const RETRY_DELAY = 3000; // 3 segundos

/**
 * Intenta conectarse a MySQL con reintentos
 */
async function waitForDatabase() {
    for (let i = 1; i <= MAX_RETRIES; i++) {
        try {
            console.log(`🔄 Intento ${i}/${MAX_RETRIES}: Conectando a MySQL...`);
            const connection = await pool.getConnection();
            await connection.ping();
            connection.release();
            console.log('✅ Conexión a MySQL establecida exitosamente.');
            return true;
        } catch (error) {
            console.warn(`⚠️  Intento ${i} fallido: ${error.message}`);
            if (i < MAX_RETRIES) {
                console.log(`⏳ Esperando ${RETRY_DELAY / 1000}s antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }
    }
    throw new Error('❌ No se pudo conectar a MySQL después de múltiples intentos.');
}

/**
 * Crea las tablas principales del sistema
 */
async function initializeTables() {
    const connection = await pool.getConnection();
    
    try {
        console.log('🗄️  Inicializando esquema de base de datos...');

        // ===== TABLA: users =====
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                gie_app_username VARCHAR(100) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('  ✓ Tabla users creada/verificada.');

        // ===== TABLA: cashier_sessions =====
        await connection.query(`
            CREATE TABLE IF NOT EXISTS cashier_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId INT NOT NULL,
                status ENUM('open', 'closed') DEFAULT 'open',
                openedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                closedAt TIMESTAMP NULL DEFAULT NULL,
                closing_cash_usd DECIMAL(15, 2) DEFAULT NULL,
                closing_cash_ves DECIMAL(15, 2) DEFAULT NULL,
                closing_pos_banesco_lote VARCHAR(50) DEFAULT NULL,
                closing_pos_banesco_total DECIMAL(15, 2) DEFAULT NULL,
                closing_pos_mibanco_lote VARCHAR(50) DEFAULT NULL,
                closing_pos_mibanco_total DECIMAL(15, 2) DEFAULT NULL,
                closing_mikrowisp_total DECIMAL(15, 2) DEFAULT NULL,
                system_total_usd DECIMAL(15, 2) DEFAULT NULL,
                discrepancy DECIMAL(15, 2) DEFAULT NULL,
                INDEX idx_userId (userId),
                INDEX idx_status (status),
                INDEX idx_openedAt (openedAt),
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('  ✓ Tabla cashier_sessions creada/verificada.');

        // ===== TABLA: external_clients =====
        await connection.query(`
            CREATE TABLE IF NOT EXISTS external_clients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mks_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_mks_id (mks_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('  ✓ Tabla external_clients creada/verificada.');

        // ===== TABLA: external_invoices =====
        await connection.query(`
            CREATE TABLE IF NOT EXISTS external_invoices (
                id VARCHAR(100) PRIMARY KEY,
                client_mks_id VARCHAR(50) NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                status ENUM('NO PAGADO', 'PAGADO') DEFAULT 'NO PAGADO',
                our_transaction_id VARCHAR(100) DEFAULT NULL,
                vencido BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_client_mks_id (client_mks_id),
                INDEX idx_status (status),
                INDEX idx_our_transaction_id (our_transaction_id),
                FOREIGN KEY (client_mks_id) REFERENCES external_clients(mks_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('  ✓ Tabla external_invoices creada/verificada.');

        // ===== TABLA: transactions =====
        await connection.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(100) PRIMARY KEY,
                clientName VARCHAR(255) DEFAULT NULL,
                invoiceType ENUM('service', 'support', 'installation', 'abono') NOT NULL,
                invoiceBaseUSD DECIMAL(15, 2) DEFAULT 0,
                notes TEXT DEFAULT NULL,
                sessionId INT NOT NULL,
                external_reference INT DEFAULT NULL COMMENT 'ID del abono si invoiceType=abono',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_sessionId (sessionId),
                INDEX idx_createdAt (createdAt),
                INDEX idx_invoiceType (invoiceType),
                FOREIGN KEY (sessionId) REFERENCES cashier_sessions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('  ✓ Tabla transactions creada/verificada.');

        // ===== TABLA: payment_methods =====
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payment_methods (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(128) NOT NULL,
                code VARCHAR(64) NOT NULL UNIQUE,
                currency ENUM('USD', 'VES') NOT NULL DEFAULT 'USD',
                is_active BOOLEAN DEFAULT TRUE,
                requires_responsable BOOLEAN DEFAULT FALSE,
                generates_commission BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_code (code),
                INDEX idx_is_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('  ✓ Tabla payment_methods creada/verificada.');

        // ===== TABLA: payments =====
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                transactionId VARCHAR(100) NOT NULL,
                method VARCHAR(50) DEFAULT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                bcvRate DECIMAL(10, 4) DEFAULT NULL,
                payment_method_id INT UNSIGNED DEFAULT NULL,
                payment_method_code VARCHAR(64) DEFAULT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_transactionId (transactionId),
                INDEX idx_method (method),
                INDEX idx_payment_method_id (payment_method_id),
                INDEX idx_createdAt (createdAt),
                FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
                FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('  ✓ Tabla payments creada/verificada.');

        // ===== TABLA: abonos =====
        await connection.query(`
            CREATE TABLE IF NOT EXISTS abonos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_mks_id VARCHAR(50) NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                currency ENUM('USD', 'VES') DEFAULT 'USD',
                bcv_rate DECIMAL(10, 4) DEFAULT NULL,
                notes TEXT DEFAULT NULL,
                status ENUM('disponible', 'aplicado') DEFAULT 'disponible',
                created_at_session_id INT DEFAULT NULL,
                applied_at_session_id INT DEFAULT NULL,
                applied_to_invoice_id VARCHAR(100) DEFAULT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_client_mks_id (client_mks_id),
                INDEX idx_status (status),
                INDEX idx_applied_to_invoice_id (applied_to_invoice_id),
                FOREIGN KEY (client_mks_id) REFERENCES external_clients(mks_id) ON DELETE CASCADE,
                FOREIGN KEY (created_at_session_id) REFERENCES cashier_sessions(id) ON DELETE SET NULL,
                FOREIGN KEY (applied_at_session_id) REFERENCES cashier_sessions(id) ON DELETE SET NULL,
                FOREIGN KEY (applied_to_invoice_id) REFERENCES external_invoices(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('  ✓ Tabla abonos creada/verificada.');

        // ===== TABLA: payment_method_configs =====
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payment_method_configs (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                payment_method_id INT UNSIGNED NOT NULL,
                user_id INT DEFAULT NULL,
                iva_exempt BOOLEAN DEFAULT FALSE,
                apply_iva_by_default BOOLEAN DEFAULT FALSE,
                notes TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_payment_method_id (payment_method_id),
                INDEX idx_user_id (user_id),
                FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('  ✓ Tabla payment_method_configs creada/verificada.');

        // ===== TABLA: payment_commissions =====
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payment_commissions (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                payment_method_id INT UNSIGNED NOT NULL,
                commission_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
                commission_value DECIMAL(10, 4) NOT NULL DEFAULT 0,
                min_amount DECIMAL(15, 2) DEFAULT NULL,
                max_amount DECIMAL(15, 2) DEFAULT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_payment_method_id (payment_method_id),
                INDEX idx_is_active (is_active),
                FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('  ✓ Tabla payment_commissions creada/verificada.');

        console.log('✅ Todas las tablas han sido creadas/verificadas exitosamente.');
        
    } catch (error) {
        console.error('❌ Error al inicializar tablas:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Inserta datos iniciales básicos si no existen
 */
async function seedInitialData() {
    const connection = await pool.getConnection();
    
    try {
        console.log('🌱 Verificando datos iniciales...');

        // Verificar si existe al menos un usuario admin
        const [users] = await connection.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
        
        if (users[0].count === 0) {
            console.log('  📝 No se encontró usuario admin. Creando usuario por defecto...');
            // Importar bcrypt dinámicamente
            const bcrypt = await import('bcryptjs');
            const hashedPassword = await bcrypt.default.hash('admin123', 10);
            
            await connection.query(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                ['admin', hashedPassword, 'admin']
            );
            console.log('  ✓ Usuario admin creado (usuario: admin, contraseña: admin123)');
            console.log('  ⚠️  IMPORTANTE: Cambia la contraseña del admin inmediatamente.');
        } else {
            console.log('  ✓ Usuario admin ya existe.');
        }

        // Verificar si existen métodos de pago básicos
        const [paymentMethods] = await connection.query('SELECT COUNT(*) as count FROM payment_methods');
        
        if (paymentMethods[0].count === 0) {
            console.log('  📝 Creando métodos de pago básicos...');
            
            const basicMethods = [
                ['Efectivo USD', 'CASH_USD', 'USD', true, false, false],
                ['Efectivo VES', 'CASH_VES', 'VES', true, false, false],
                ['POS Banesco', 'POS_BANESCO', 'VES', true, false, false],
                ['POS Mi Banco', 'POS_MIBANCO', 'VES', true, false, false]
            ];
            
            for (const method of basicMethods) {
                await connection.query(
                    'INSERT INTO payment_methods (name, code, currency, is_active, requires_responsable, generates_commission) VALUES (?, ?, ?, ?, ?, ?)',
                    method
                );
            }
            console.log('  ✓ Métodos de pago básicos creados.');
        } else {
            console.log('  ✓ Métodos de pago ya existen.');
        }

        console.log('✅ Datos iniciales verificados/creados exitosamente.');
        
    } catch (error) {
        console.error('❌ Error al crear datos iniciales:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Función principal de inicialización
 */
export async function initializeDatabase() {
    console.log('🔵 [DEBUG] initializeDatabase() LLAMADA');
    
    try {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🚀 INICIANDO CONFIGURACIÓN DE BASE DE DATOS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('🔵 [DEBUG] Paso 1: Llamando a waitForDatabase()...');
        // Paso 1: Esperar a que MySQL esté disponible
        await waitForDatabase();

        console.log('🔵 [DEBUG] Paso 2: Llamando a initializeTables()...');
        // Paso 2: Crear/verificar tablas
        await initializeTables();

        console.log('🔵 [DEBUG] Paso 3: Llamando a seedInitialData()...');
        // Paso 3: Insertar datos iniciales
        await seedInitialData();

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ BASE DE DATOS LISTA PARA USAR');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        console.log('🔵 [DEBUG] initializeDatabase() COMPLETADA EXITOSAMENTE');
        return true;
    } catch (error) {
        console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ ERROR EN INICIALIZACIÓN DE BASE DE DATOS');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('🔵 [DEBUG] Error capturado:', error.message);
        console.error('🔵 [DEBUG] Stack:', error.stack);
        console.error(error);
        throw error;
    }
}

export default initializeDatabase;
