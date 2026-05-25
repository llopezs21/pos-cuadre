# 🗄️ Sistema de Base de Datos - POS CUADRE

## 📋 Descripción General

El sistema utiliza MySQL 8.0 con inicialización automática de tablas al arrancar. No requiere ejecutar migraciones manualmente, todo se configura automáticamente con `docker-compose up`.

---

## 🚀 Inicialización Automática

### Proceso de Inicio

Cuando ejecutas `docker-compose up -d`, el sistema:

1. **Espera a MySQL** (hasta 10 intentos con reintentos de 3s)
2. **Crea todas las tablas** si no existen (usando `CREATE TABLE IF NOT EXISTS`)
3. **Inserta datos iniciales** (usuario admin y métodos de pago básicos)
4. **Inicia el servidor** en el puerto 4000

### Mecanismo de Tolerancia a Fallos

```javascript
// backend/src/db/init.js
- MAX_RETRIES: 10 intentos
- RETRY_DELAY: 3 segundos entre intentos
- CONNECT_TIMEOUT: 10 segundos por intento
```

Si MySQL tarda en levantar, el backend automáticamente reintentará hasta 10 veces antes de fallar.

---

## 📊 Estructura de Tablas

### 1. **users** - Usuarios del sistema
```sql
- id (PK, AUTO_INCREMENT)
- username (UNIQUE)
- password (HASHED con bcrypt)
- role (ENUM: 'user', 'admin')
- gie_app_username (VARCHAR, para integración GIE-APP)
- created_at, updated_at
```

**Usuario por defecto creado:**
- Usuario: `admin`
- Contraseña: `admin123`
- ⚠️ **CAMBIAR INMEDIATAMENTE EN PRODUCCIÓN**

---

### 2. **cashier_sessions** - Sesiones de caja
```sql
- id (PK, AUTO_INCREMENT)
- userId (FK → users.id)
- status (ENUM: 'open', 'closed')
- openedAt, closedAt
- closing_cash_usd, closing_cash_ves
- closing_pos_banesco_lote, closing_pos_banesco_total
- closing_pos_mibanco_lote, closing_pos_mibanco_total
- closing_mikrowisp_total
- system_total_usd, discrepancy
```

**Validaciones importantes:**
- Un usuario solo puede tener 1 sesión abierta a la vez
- Sesiones cerradas no pueden ser modificadas (salvo reapertura por admin)

---

### 3. **transactions** - Transacciones
```sql
- id (PK, VARCHAR UUID)
- clientName
- invoiceType (ENUM: 'service', 'support', 'installation', 'abono')
- invoiceBaseUSD
- notes
- sessionId (FK → cashier_sessions.id)
- external_reference (INT, para abonos)
- createdAt, updatedAt
```

**Tipos de transacciones:**
- `service`: Pago de facturas de servicio
- `support`: Soporte técnico
- `installation`: Instalación
- `abono`: Registro de abono (pago anticipado)

---

### 4. **payments** - Pagos (detalles de cada transacción)
```sql
- id (PK, AUTO_INCREMENT)
- transactionId (FK → transactions.id)
- method (VARCHAR, código del método)
- amount (DECIMAL 15,2)
- bcvRate (DECIMAL 10,4, tasa BCV usada)
- payment_method_id (FK → payment_methods.id)
- payment_method_code (VARCHAR)
- createdAt, updatedAt
```

**Relación:** Una transacción puede tener múltiples pagos (mixtos).

---

### 5. **payment_methods** - Métodos de pago configurables
```sql
- id (PK, AUTO_INCREMENT)
- name (VARCHAR)
- code (VARCHAR UNIQUE, ej: 'CASH_USD', 'POS_BANESCO')
- currency (ENUM: 'USD', 'VES')
- is_active (BOOLEAN)
- requires_responsable (BOOLEAN)
- generates_commission (BOOLEAN)
```

**Métodos por defecto:**
- CASH_USD (Efectivo USD)
- CASH_VES (Efectivo VES)
- POS_BANESCO (POS Banesco)
- POS_MIBANCO (POS Mi Banco)

---

### 6. **abonos** - Abonos/Pagos anticipados
```sql
- id (PK, AUTO_INCREMENT)
- client_mks_id (FK → external_clients.mks_id)
- amount, currency, bcv_rate
- notes
- status (ENUM: 'disponible', 'aplicado')
- created_at_session_id (FK → cashier_sessions.id)
- applied_at_session_id (FK → cashier_sessions.id)
- applied_to_invoice_id (FK → external_invoices.id)
- createdAt, updatedAt
```

**Flujo de abonos:**
1. Cliente paga anticipado → `status='disponible'`
2. Al pagar factura, abono se aplica → `status='aplicado'`

---

### 7. **external_clients** - Clientes externos (de MKS)
```sql
- id (PK, AUTO_INCREMENT)
- mks_id (VARCHAR UNIQUE, ID del sistema MKS)
- name (VARCHAR)
- created_at, updated_at
```

---

### 8. **external_invoices** - Facturas externas
```sql
- id (PK, VARCHAR, ID del sistema MKS)
- client_mks_id (FK → external_clients.mks_id)
- amount (DECIMAL)
- status (ENUM: 'NO PAGADO', 'PAGADO')
- our_transaction_id (FK → transactions.id)
- vencido (BOOLEAN)
- created_at, updated_at
```

---

### 9. **payment_method_configs** - Configuración de métodos por usuario
```sql
- id (PK, AUTO_INCREMENT)
- payment_method_id (FK → payment_methods.id)
- user_id (FK → users.id)
- iva_exempt (BOOLEAN)
- apply_iva_by_default (BOOLEAN)
- notes
```

**Uso:** Permite configurar excepciones de IVA por usuario/método.

---

### 10. **payment_commissions** - Comisiones de métodos de pago
```sql
- id (PK, AUTO_INCREMENT)
- payment_method_id (FK → payment_methods.id)
- commission_type (ENUM: 'percentage', 'fixed')
- commission_value (DECIMAL)
- min_amount, max_amount
- is_active (BOOLEAN)
```

**Uso:** Define comisiones bancarias (ej: POS cobra 2% de comisión).

---

## 🔧 Comandos Útiles

### Verificar estado de la base de datos

```bash
# Acceder a phpMyAdmin
open http://localhost:8084

# Conectar via MySQL CLI desde el contenedor
docker exec -it mysql_db mysql -u root -p
```

### Inspeccionar tablas

```sql
-- Listar todas las tablas
SHOW TABLES;

-- Ver estructura de una tabla
DESCRIBE users;
DESCRIBE transactions;

-- Ver usuarios existentes
SELECT id, username, role FROM users;

-- Ver sesiones abiertas
SELECT * FROM cashier_sessions WHERE status = 'open';

-- Ver transacciones de hoy
SELECT * FROM transactions WHERE DATE(createdAt) = CURDATE();
```

### Resetear base de datos (CUIDADO)

```bash
# Detener contenedores
docker-compose down

# Eliminar volumen de datos
docker volume rm pos-cuadre_db_data

# Volver a levantar (se creará todo de nuevo)
docker-compose up -d
```

---

## 🔄 Migraciones vs Inicialización

### Sistema Actual: Inicialización Automática

✅ **Ventajas:**
- Zero-config: funciona con `docker-compose up`
- Tolerante a fallos (reintentos automáticos)
- Idempotente (puedes reiniciar sin romper nada)
- Perfecto para desarrollo y despliegues limpios

❌ **Limitaciones:**
- No mantiene historial de cambios en esquema
- Para cambios complejos, mejor usar migraciones Sequelize

### Cuándo usar Sequelize Migrations

Si necesitas **modificar** tablas existentes en producción (agregar columnas, cambiar tipos, etc.), usa:

```bash
cd backend
npx sequelize-cli migration:generate --name add-new-column
# Editar el archivo de migración
npx sequelize-cli db:migrate
```

**Nota:** Las migraciones actuales en `backend/migrations/` fueron usadas previamente pero ahora el sistema usa inicialización automática.

---

## 🛠️ Troubleshooting

### Error: "Cannot connect to MySQL"

```bash
# Verificar que el contenedor MySQL esté corriendo
docker ps | grep mysql

# Ver logs de MySQL
docker-compose logs db

# Verificar que el backend está intentando conectar
docker-compose logs backend
```

**Solución:** Espera 30-40 segundos. MySQL tarda en estar listo. El backend reintentará automáticamente.

---

### Error: "User admin already exists"

Es normal, significa que ya ejecutaste el sistema antes. El usuario admin ya fue creado.

---

### Error: "Table already exists"

No es un error, es información. El sistema detectó que las tablas ya existen y no las recrea.

---

### Quiero empezar de cero

```bash
# Opción 1: Solo eliminar datos (mantener estructura)
docker exec -it mysql_db mysql -u root -p -e "
  USE cuadre_caja_db;
  SET FOREIGN_KEY_CHECKS = 0;
  TRUNCATE TABLE payments;
  TRUNCATE TABLE transactions;
  TRUNCATE TABLE cashier_sessions;
  TRUNCATE TABLE abonos;
  TRUNCATE TABLE external_invoices;
  SET FOREIGN_KEY_CHECKS = 1;
"

# Opción 2: Eliminar y recrear todo
docker-compose down -v
docker-compose up -d
```

---

## 📚 Archivos Relacionados

- `backend/src/db/init.js` - Lógica de inicialización
- `backend/src/db/database.js` - Pool de conexiones MySQL
- `backend/server.js` - Punto de entrada (llama a initializeDatabase())
- `docker-compose.yml` - Configuración de MySQL
- `.env` - Credenciales de base de datos

---

## 🔐 Seguridad

### Credenciales por defecto

⚠️ **CAMBIAR EN PRODUCCIÓN:**

```env
# backend/.env
DB_PASSWORD=your_strong_password  # Cambiar esto
JWT_SECRET=generate_random_secret # Cambiar esto
```

### Usuario admin

```bash
# Cambiar contraseña del admin vía API
curl -X POST http://localhost:4000/api/admin/users/1/change-password \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "nueva_contraseña_segura"}'
```

O directamente en MySQL:

```sql
-- Generar hash con bcrypt online o en Node.js
UPDATE users 
SET password = '$2a$10$...' 
WHERE username = 'admin';
```

---

## 📈 Monitoreo y Logs

### Ver logs en tiempo real

```bash
# Backend
docker-compose logs -f backend

# MySQL
docker-compose logs -f db

# Todo junto
docker-compose logs -f
```

### Ver inicialización de tablas

Busca en los logs:
```
🗄️  Inicializando esquema de base de datos...
  ✓ Tabla users creada/verificada.
  ✓ Tabla cashier_sessions creada/verificada.
  ...
✅ BASE DE DATOS LISTA PARA USAR
```

---

## 🎯 Próximos Pasos

1. ✅ Sistema de inicialización automática funcionando
2. ✅ Datos iniciales (admin + métodos de pago)
3. 🔄 Configurar backups automáticos de MySQL
4. 🔄 Implementar vistas de base de datos para reportes
5. 🔄 Agregar índices adicionales según métricas de performance

---

**🚀 ¡Tu base de datos está lista para funcionar! Solo ejecuta `docker-compose up -d`**
