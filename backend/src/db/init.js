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
 * Agrega columnas faltantes a tablas existentes
 */
async function addMissingColumns() {
    const connection = await pool.getConnection();
    
    try {
        console.log('🔧 Verificando y agregando columnas faltantes...');

        // Helper: verifica si una columna existe
        const columnExists = async (table, column) => {
            const [rows] = await connection.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                [process.env.DB_NAME, table, column]
            );
            return rows.length > 0;
        };

        // ===== external_clients =====
        if (!await columnExists('external_clients', 'id_number')) {
            await connection.query(
                `ALTER TABLE external_clients ADD COLUMN id_number VARCHAR(100) DEFAULT NULL COMMENT 'Cédula o número de identificación' AFTER name`
            );
            console.log('  + Columna id_number agregada a external_clients');
        }
        
        if (!await columnExists('external_clients', 'phone')) {
            await connection.query(
                `ALTER TABLE external_clients ADD COLUMN phone VARCHAR(50) DEFAULT NULL AFTER id_number`
            );
            console.log('  + Columna phone agregada a external_clients');
        }
        
        if (!await columnExists('external_clients', 'email')) {
            await connection.query(
                `ALTER TABLE external_clients ADD COLUMN email VARCHAR(255) DEFAULT NULL AFTER phone`
            );
            console.log('  + Columna email agregada a external_clients');
        }

        // ===== external_invoices =====
        if (!await columnExists('external_invoices', 'mks_invoice_number')) {
            await connection.query(
                `ALTER TABLE external_invoices ADD COLUMN mks_invoice_number INT NOT NULL UNIQUE COMMENT 'Número de factura del sistema MKS' AFTER id`
            );
            console.log('  + Columna mks_invoice_number agregada a external_invoices');
        }
        
        if (!await columnExists('external_invoices', 'issue_date')) {
            await connection.query(
                `ALTER TABLE external_invoices ADD COLUMN issue_date DATE DEFAULT NULL COMMENT 'Fecha de emisión' AFTER amount`
            );
            console.log('  + Columna issue_date agregada a external_invoices');
        }
        
        if (!await columnExists('external_invoices', 'due_date')) {
            await connection.query(
                `ALTER TABLE external_invoices ADD COLUMN due_date DATE DEFAULT NULL COMMENT 'Fecha de vencimiento' AFTER issue_date`
            );
            console.log('  + Columna due_date agregada a external_invoices');
        }
        
        if (!await columnExists('external_invoices', 'payment_method_external')) {
            await connection.query(
                `ALTER TABLE external_invoices ADD COLUMN payment_method_external VARCHAR(100) DEFAULT NULL COMMENT 'Método de pago del sistema externo' AFTER status`
            );
            console.log('  + Columna payment_method_external agregada a external_invoices');
        }

        // Verificar y actualizar ENUM de status si es necesario
        const [statusInfo] = await connection.query(
            `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'external_invoices' AND COLUMN_NAME = 'status'`,
            [process.env.DB_NAME]
        );
        if (statusInfo.length > 0 && !statusInfo[0].COLUMN_TYPE.includes('VENCIDO')) {
            await connection.query(
                `ALTER TABLE external_invoices MODIFY COLUMN status 
                 ENUM('NO PAGADO', 'PAGADO', 'VENCIDO', 'ANULADO') DEFAULT 'NO PAGADO'`
            );
            console.log('  + ENUM status actualizado en external_invoices (agregado VENCIDO)');
        }

        // ===== payment_method_configs =====
        if (!await columnExists('payment_method_configs', 'username')) {
            await connection.query(
                `ALTER TABLE payment_method_configs ADD COLUMN username VARCHAR(128) DEFAULT NULL COMMENT 'Responsable del método de pago' AFTER user_id`
            );
            console.log('  + Columna username agregada a payment_method_configs');
        }
        
        if (!await columnExists('payment_method_configs', 'account_number')) {
            await connection.query(
                `ALTER TABLE payment_method_configs ADD COLUMN account_number VARCHAR(128) DEFAULT NULL COMMENT 'Número de cuenta' AFTER username`
            );
            console.log('  + Columna account_number agregada a payment_method_configs');
        }
        
        if (!await columnExists('payment_method_configs', 'commission_percentage')) {
            await connection.query(
                `ALTER TABLE payment_method_configs ADD COLUMN commission_percentage DECIMAL(10, 4) DEFAULT NULL COMMENT 'Comisión en porcentaje' AFTER iva_exempt`
            );
            console.log('  + Columna commission_percentage agregada a payment_method_configs');
        }
        
        if (!await columnExists('payment_method_configs', 'commission_fixed')) {
            await connection.query(
                `ALTER TABLE payment_method_configs ADD COLUMN commission_fixed DECIMAL(10, 2) DEFAULT NULL COMMENT 'Comisión fija' AFTER commission_percentage`
            );
            console.log('  + Columna commission_fixed agregada a payment_method_configs');
        }
        
        if (!await columnExists('payment_method_configs', 'is_default')) {
            await connection.query(
                `ALTER TABLE payment_method_configs ADD COLUMN is_default BOOLEAN DEFAULT FALSE AFTER commission_fixed`
            );
            console.log('  + Columna is_default agregada a payment_method_configs');
        }

        // ===== FASE 1: payment_methods - Nuevas columnas para reglas dinámicas =====
        if (!await columnExists('payment_methods', 'triggers_iva')) {
            await connection.query(
                `ALTER TABLE payment_methods ADD COLUMN triggers_iva BOOLEAN DEFAULT FALSE COMMENT 'Si este método dispara aplicación de IVA' AFTER generates_commission`
            );
            console.log('  + Columna triggers_iva agregada a payment_methods');
        }
        
        if (!await columnExists('payment_methods', 'is_base_currency')) {
            await connection.query(
                `ALTER TABLE payment_methods ADD COLUMN is_base_currency BOOLEAN DEFAULT FALSE COMMENT 'Si este método es considerado moneda base para el umbral' AFTER triggers_iva`
            );
            console.log('  + Columna is_base_currency agregada a payment_methods');
        }

        console.log('✅ Verificación de columnas completada.');

        // ===== CORRECCIÓN CRÍTICA: Cambiar id de VARCHAR a INT AUTO_INCREMENT =====
        console.log('🔧 Verificando tipos de columna id en tablas críticas...');

        // Verificar external_invoices.id
        const [invoiceIdType] = await connection.query(
            `SELECT DATA_TYPE, COLUMN_TYPE, EXTRA FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'external_invoices' AND COLUMN_NAME = 'id'`,
            [process.env.DB_NAME]
        );
        
        if (invoiceIdType.length > 0 && invoiceIdType[0].DATA_TYPE === 'varchar') {
            console.log('  ⚠️  external_invoices.id es VARCHAR, cambiando a INT AUTO_INCREMENT...');
            
            // Desactivar temporalmente checks de foreign keys
            await connection.query('SET FOREIGN_KEY_CHECKS = 0');
            
            // Verificar si hay datos en la tabla
            const [countResult] = await connection.query(
                `SELECT COUNT(*) as count FROM external_invoices`
            );
            const hasData = countResult[0].count > 0;
            
            if (hasData) {
                console.log(`    ⚠️  Tabla tiene ${countResult[0].count} registros. Truncando para cambiar tipo...`);
                await connection.query(`TRUNCATE TABLE external_invoices`);
                console.log('    - Tabla truncada');
            }
            
            // Eliminar PRIMARY KEY existente
            await connection.query(`ALTER TABLE external_invoices DROP PRIMARY KEY`);
            console.log('    - PRIMARY KEY eliminada');
            
            // Cambiar el tipo de columna a INT AUTO_INCREMENT
            await connection.query(
                `ALTER TABLE external_invoices 
                 MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY`
            );
            console.log('  ✓ external_invoices.id cambiada a INT AUTO_INCREMENT PRIMARY KEY');
            
            // Reactivar checks de foreign keys
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        }
        
        console.log('✅ Verificación de tipos de columna completada.');
        
        // Verificar abonos.applied_to_invoice_id
        const [abonosRefType] = await connection.query(
            `SELECT DATA_TYPE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'abonos' AND COLUMN_NAME = 'applied_to_invoice_id'`,
            [process.env.DB_NAME]
        );
        
        if (abonosRefType.length > 0 && abonosRefType[0].DATA_TYPE === 'varchar') {
            console.log('  ⚠️  abonos.applied_to_invoice_id es VARCHAR, cambiando a INT...');
            
            await connection.query('SET FOREIGN_KEY_CHECKS = 0');
            
            // Eliminar FK si existe
            try {
                await connection.query(
                    `ALTER TABLE abonos DROP FOREIGN KEY abonos_ibfk_3`
                );
                console.log('    - FK abonos_ibfk_3 eliminada temporalmente');
            } catch (err) {
                // FK puede no existir, ignorar error
            }
            
            // Cambiar tipo de columna
            await connection.query(
                `ALTER TABLE abonos 
                 MODIFY COLUMN applied_to_invoice_id INT DEFAULT NULL`
            );
            console.log('    - Columna applied_to_invoice_id modificada a INT');
            
            // Recrear FK
            await connection.query(
                `ALTER TABLE abonos 
                 ADD CONSTRAINT abonos_ibfk_3 
                 FOREIGN KEY (applied_to_invoice_id) 
                 REFERENCES external_invoices(id) ON DELETE SET NULL`
            );
            console.log('  ✓ abonos.applied_to_invoice_id cambiada a INT con FK recreada');
            
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        }
        
        console.log('✅ Verificación exhaustiva de FKs completada.');
        
        // Verificar mks_id y client_mks_id (deben ser INT, no VARCHAR)
        console.log('🔧 Verificando tipos de columnas mks_id...');
        
        const [mksIdType] = await connection.query(
            `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'external_clients' AND COLUMN_NAME = 'mks_id'`,
            [process.env.DB_NAME]
        );
        
        if (mksIdType.length > 0 && mksIdType[0].DATA_TYPE === 'varchar') {
            console.log('  ⚠️  external_clients.mks_id es VARCHAR, cambiando a INT...');
            
            await connection.query('SET FOREIGN_KEY_CHECKS = 0');
            
            // Verificar si hay datos
            const [countClients] = await connection.query(`SELECT COUNT(*) as count FROM external_clients`);
            if (countClients[0].count > 0) {
                console.log(`    ⚠️  Tabla external_clients tiene ${countClients[0].count} registros. Truncando...`);
                await connection.query(`TRUNCATE TABLE external_invoices`);
                await connection.query(`TRUNCATE TABLE abonos`);
                await connection.query(`TRUNCATE TABLE external_clients`);
                console.log('    - Tablas truncadas');
            }
            
            // Eliminar FKs que referencian mks_id
            console.log('    - Eliminando FKs temporalmente...');
            try {
                await connection.query(`ALTER TABLE external_invoices DROP FOREIGN KEY external_invoices_ibfk_1`);
            } catch (e) { /* FK puede no existir */ }
            try {
                await connection.query(`ALTER TABLE abonos DROP FOREIGN KEY abonos_ibfk_1`);
            } catch (e) { /* FK puede no existir */ }
            
            // Cambiar tipos de columnas
            await connection.query(`ALTER TABLE external_clients MODIFY COLUMN mks_id INT NOT NULL UNIQUE`);
            console.log('    - external_clients.mks_id cambiada a INT');
            
            await connection.query(`ALTER TABLE external_invoices MODIFY COLUMN client_mks_id INT NOT NULL`);
            console.log('    - external_invoices.client_mks_id cambiada a INT');
            
            await connection.query(`ALTER TABLE abonos MODIFY COLUMN client_mks_id INT NOT NULL`);
            console.log('    - abonos.client_mks_id cambiada a INT');
            
            // Recrear FKs
            await connection.query(`
                ALTER TABLE external_invoices 
                ADD CONSTRAINT external_invoices_ibfk_1 
                FOREIGN KEY (client_mks_id) REFERENCES external_clients(mks_id) ON DELETE CASCADE
            `);
            await connection.query(`
                ALTER TABLE abonos 
                ADD CONSTRAINT abonos_ibfk_1 
                FOREIGN KEY (client_mks_id) REFERENCES external_clients(mks_id) ON DELETE CASCADE
            `);
            console.log('  ✓ FKs recreadas correctamente');
            
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        }
        
        console.log('✅ Verificación de tipos mks_id completada.');
        
    } catch (error) {
        console.error('❌ Error al agregar columnas faltantes:', error);
        throw error;
    } finally {
        connection.release();
    }
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

        // ===== FASE 1: TABLA global_settings - Parámetros dinámicos de reglas de negocio =====
        await connection.query(`
            CREATE TABLE IF NOT EXISTS global_settings (
                id INT PRIMARY KEY DEFAULT 1,
                iva_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.1600 COMMENT 'Tasa de IVA (ej: 0.16 = 16%)',
                iva_threshold DECIMAL(5, 4) NOT NULL DEFAULT 0.5000 COMMENT 'Umbral de exoneración de IVA (ej: 0.5 = 50%)',
                reconciliation_tolerance DECIMAL(10, 2) NOT NULL DEFAULT 0.05 COMMENT 'Tolerancia de cuadre en USD (ej: 0.05 = 5 centavos)',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CHECK (id = 1)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('  ✓ Tabla global_settings creada/verificada.');

        // Insertar registro único si no existe
        await connection.query(`
            INSERT IGNORE INTO global_settings (id, iva_rate, iva_threshold, reconciliation_tolerance)
            VALUES (1, 0.1600, 0.5000, 0.05);
        `);
        console.log('  ✓ Registro de configuración global inicializado.');

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
                mks_id INT NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                id_number VARCHAR(100) DEFAULT NULL COMMENT 'Cédula o número de identificación',
                phone VARCHAR(50) DEFAULT NULL,
                email VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_mks_id (mks_id),
                INDEX idx_id_number (id_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('  ✓ Tabla external_clients creada/verificada.');

        // ===== TABLA: external_invoices =====
        await connection.query(`
            CREATE TABLE IF NOT EXISTS external_invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mks_invoice_number INT NOT NULL UNIQUE COMMENT 'Número de factura del sistema MKS',
                client_mks_id INT NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                issue_date DATE DEFAULT NULL COMMENT 'Fecha de emisión',
                due_date DATE DEFAULT NULL COMMENT 'Fecha de vencimiento',
                status ENUM('NO PAGADO', 'PAGADO', 'VENCIDO', 'ANULADO') DEFAULT 'NO PAGADO',
                payment_method_external VARCHAR(100) DEFAULT NULL COMMENT 'Método de pago del sistema externo',
                our_transaction_id VARCHAR(100) DEFAULT NULL,
                vencido BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_mks_invoice_number (mks_invoice_number),
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
                triggers_iva BOOLEAN DEFAULT FALSE COMMENT 'FASE 1: Si este método dispara aplicación de IVA',
                is_base_currency BOOLEAN DEFAULT FALSE COMMENT 'FASE 1: Si este método es considerado moneda base para el umbral',
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
                client_mks_id INT NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                currency ENUM('USD', 'VES') DEFAULT 'USD',
                bcv_rate DECIMAL(10, 4) DEFAULT NULL,
                notes TEXT DEFAULT NULL,
                status ENUM('disponible', 'aplicado') DEFAULT 'disponible',
                created_at_session_id INT DEFAULT NULL,
                applied_at_session_id INT DEFAULT NULL,
                applied_to_invoice_id INT DEFAULT NULL,
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
                username VARCHAR(128) DEFAULT NULL COMMENT 'Responsable del método de pago',
                account_number VARCHAR(128) DEFAULT NULL COMMENT 'Número de cuenta',
                iva_exempt BOOLEAN DEFAULT FALSE,
                apply_iva_by_default BOOLEAN DEFAULT FALSE,
                commission_percentage DECIMAL(10, 4) DEFAULT NULL COMMENT 'Comisión en porcentaje',
                commission_fixed DECIMAL(10, 2) DEFAULT NULL COMMENT 'Comisión fija',
                is_default BOOLEAN DEFAULT FALSE,
                notes TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_payment_method_id (payment_method_id),
                INDEX idx_user_id (user_id),
                UNIQUE KEY unique_payment_method_user (payment_method_id, user_id),
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

        console.log('🔵 [DEBUG] Paso 2.5: Llamando a addMissingColumns()...');
        // Paso 2.5: Agregar columnas faltantes a tablas existentes
        await addMissingColumns();

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
