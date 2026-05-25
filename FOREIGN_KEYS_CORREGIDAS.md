# ✅ FOREIGN KEYS CORREGIDAS - Verificación Exhaustiva

## 🎯 Problema Resuelto

Error al crear la tabla `abonos`:
```
ER_FK_INCOMPATIBLE_COLUMNS
```

**Causa:** La columna `abonos.applied_to_invoice_id` estaba definida como `VARCHAR(100)`, pero intentaba referenciar a `external_invoices.id` que recientemente fue cambiada a `INT AUTO_INCREMENT`.

## ✅ Solución Aplicada

### Cambio en `init.js`

**Archivo:** `backend/src/db/init.js`

```javascript
// ANTES:
applied_to_invoice_id VARCHAR(100) DEFAULT NULL,

// DESPUÉS:
applied_to_invoice_id INT DEFAULT NULL,
```

### Auto-Corrección Agregada

Se agregó verificación automática en `addMissingColumns()` que:

1. ✅ Detecta si `applied_to_invoice_id` es VARCHAR
2. ✅ Desactiva temporalmente FOREIGN_KEY_CHECKS
3. ✅ Elimina la FK existente si existe
4. ✅ Modifica la columna a `INT DEFAULT NULL`
5. ✅ Recrea la FK con la referencia correcta
6. ✅ Reactiva FOREIGN_KEY_CHECKS

```javascript
// Verificar abonos.applied_to_invoice_id
if (abonosRefType[0].DATA_TYPE === 'varchar') {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('ALTER TABLE abonos DROP FOREIGN KEY abonos_ibfk_3');
    await connection.query('ALTER TABLE abonos MODIFY COLUMN applied_to_invoice_id INT DEFAULT NULL');
    await connection.query('ALTER TABLE abonos ADD CONSTRAINT abonos_ibfk_3 FOREIGN KEY (applied_to_invoice_id) REFERENCES external_invoices(id) ON DELETE SET NULL');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}
```

## 📊 Verificación Exhaustiva de TODAS las Foreign Keys

### ✅ Tabla: `abonos`

| Columna FK | Tipo | Referencia | Tipo Referencia | Estado |
|------------|------|------------|-----------------|--------|
| `client_mks_id` | VARCHAR(50) | `external_clients.mks_id` | VARCHAR(50) | ✅ |
| `created_at_session_id` | INT | `cashier_sessions.id` | INT | ✅ |
| `applied_at_session_id` | INT | `cashier_sessions.id` | INT | ✅ |
| `applied_to_invoice_id` | INT | `external_invoices.id` | INT | ✅ **CORREGIDA** |

### ✅ Tabla: `cashier_sessions`

| Columna FK | Tipo | Referencia | Tipo Referencia | Estado |
|------------|------|------------|-----------------|--------|
| `userId` | INT | `users.id` | INT | ✅ |

### ✅ Tabla: `external_invoices`

| Columna FK | Tipo | Referencia | Tipo Referencia | Estado |
|------------|------|------------|-----------------|--------|
| `client_mks_id` | VARCHAR(50) | `external_clients.mks_id` | VARCHAR(50) | ✅ |

### ✅ Tabla: `transactions`

| Columna FK | Tipo | Referencia | Tipo Referencia | Estado |
|------------|------|------------|-----------------|--------|
| `sessionId` | INT | `cashier_sessions.id` | INT | ✅ |

### ✅ Tabla: `payments`

| Columna FK | Tipo | Referencia | Tipo Referencia | Estado |
|------------|------|------------|-----------------|--------|
| `transactionId` | VARCHAR(100) | `transactions.id` | VARCHAR(100) | ✅ |
| `payment_method_id` | INT UNSIGNED | `payment_methods.id` | INT UNSIGNED | ✅ |

### ✅ Tabla: `payment_method_configs`

| Columna FK | Tipo | Referencia | Tipo Referencia | Estado |
|------------|------|------------|-----------------|--------|
| `payment_method_id` | INT UNSIGNED | `payment_methods.id` | INT UNSIGNED | ✅ |
| `user_id` | INT | `users.id` | INT | ✅ |

### ✅ Tabla: `payment_commissions`

| Columna FK | Tipo | Referencia | Tipo Referencia | Estado |
|------------|------|------------|-----------------|--------|
| `payment_method_id` | INT UNSIGNED | `payment_methods.id` | INT UNSIGNED | ✅ |

## 📋 Resumen de Tipos de Columnas ID

### Tablas con INT AUTO_INCREMENT

| Tabla | Columna | Tipo | Estado |
|-------|---------|------|--------|
| `users` | `id` | INT | ✅ |
| `cashier_sessions` | `id` | INT | ✅ |
| `external_clients` | `id` | INT | ✅ |
| `external_invoices` | `id` | INT | ✅ |
| `payments` | `id` | INT | ✅ |
| `abonos` | `id` | INT | ✅ |
| `payment_methods` | `id` | INT UNSIGNED | ✅ |
| `payment_method_configs` | `id` | INT UNSIGNED | ✅ |
| `payment_commissions` | `id` | INT UNSIGNED | ✅ |

### Tablas con VARCHAR (UUID)

| Tabla | Columna | Tipo | Razón |
|-------|---------|------|-------|
| `transactions` | `id` | VARCHAR(100) | UUID generado por aplicación |

### Claves Alternativas (No ID)

| Tabla | Columna | Tipo | Uso |
|-------|---------|------|-----|
| `external_clients` | `mks_id` | VARCHAR(50) UNIQUE | ID del sistema MKS |

## 🚀 Estado Actual

```
✅ Servidor corriendo en http://localhost:4000
✅ abonos.applied_to_invoice_id ahora es INT
✅ Todas las Foreign Keys verificadas y funcionando
✅ Sistema listo para operaciones CRUD
```

## 🔍 Comandos de Verificación

### Ver todas las FKs del sistema:
```sql
SELECT 
    TABLE_NAME, 
    COLUMN_NAME, 
    REFERENCED_TABLE_NAME, 
    REFERENCED_COLUMN_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA='cuadre_caja_db' 
  AND REFERENCED_TABLE_NAME IS NOT NULL 
ORDER BY TABLE_NAME, COLUMN_NAME;
```

### Ver tipos de columnas involucradas en FKs:
```sql
SELECT 
    TABLE_NAME, 
    COLUMN_NAME, 
    DATA_TYPE, 
    COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA='cuadre_caja_db' 
  AND COLUMN_NAME IN (
    'id', 'userId', 'sessionId', 'transactionId', 
    'payment_method_id', 'user_id', 'applied_to_invoice_id', 
    'created_at_session_id', 'applied_at_session_id', 'client_mks_id'
  )
ORDER BY TABLE_NAME, COLUMN_NAME;
```

### Verificar tabla específica:
```bash
docker exec mysql_db mysql -u root -pyour_strong_password \
  -D cuadre_caja_db -e "DESCRIBE abonos;"
```

## 🎯 Puntos Clave de la Corrección

### 1. Compatibilidad de Tipos en FKs

**Regla:** La columna FK debe tener **exactamente** el mismo tipo que la columna referenciada.

✅ **Correcto:**
```sql
-- Tabla referenciada
external_invoices.id INT AUTO_INCREMENT

-- FK
abonos.applied_to_invoice_id INT DEFAULT NULL
```

❌ **Incorrecto:**
```sql
-- Tabla referenciada
external_invoices.id INT AUTO_INCREMENT

-- FK
abonos.applied_to_invoice_id VARCHAR(100) DEFAULT NULL
```

### 2. UNSIGNED en FKs

Si la tabla referenciada usa `INT UNSIGNED`, la FK también debe ser `INT UNSIGNED`:

```sql
-- payment_methods.id es INT UNSIGNED
payment_methods.id INT UNSIGNED AUTO_INCREMENT

-- Entonces todas sus FKs deben ser INT UNSIGNED
payments.payment_method_id INT UNSIGNED
payment_method_configs.payment_method_id INT UNSIGNED
payment_commissions.payment_method_id INT UNSIGNED
```

### 3. VARCHAR para UUIDs

Las transacciones usan UUID como PK, por lo tanto:

```sql
-- transactions usa VARCHAR para UUID
transactions.id VARCHAR(100) PRIMARY KEY

-- Su FK también debe ser VARCHAR
payments.transactionId VARCHAR(100)
```

## 🛠️ Cambios Realizados en `init.js`

1. ✅ Modificada definición de `CREATE TABLE abonos` (línea 367)
2. ✅ Agregada auto-corrección en `addMissingColumns()` para detectar y corregir tipos incompatibles
3. ✅ Manejo seguro de FOREIGN_KEY_CHECKS durante migraciones

## 📝 Logs de Corrección

```
🔧 Verificando tipos de columna id en tablas críticas...
✅ Verificación de tipos de columna completada.
  ⚠️  abonos.applied_to_invoice_id es VARCHAR, cambiando a INT...
    - FK abonos_ibfk_3 eliminada temporalmente
    - Columna applied_to_invoice_id modificada a INT
  ✓ abonos.applied_to_invoice_id cambiada a INT con FK recreada
✅ Verificación exhaustiva de FKs completada.
```

Si todas las columnas ya están correctas:
```
🔧 Verificando tipos de columna id en tablas críticas...
✅ Verificación de tipos de columna completada.
✅ Verificación exhaustiva de FKs completada.
```

## 🎉 Beneficios

1. ✅ **Auto-reparación de FKs** - Detecta y corrige incompatibilidades automáticamente
2. ✅ **Idempotente** - Seguro ejecutar múltiples veces
3. ✅ **Sin intervención manual** - Todo se corrige al iniciar el servidor
4. ✅ **Integridad referencial** - Todas las FKs ahora funcionan correctamente
5. ✅ **Prevención de errores** - No más `ER_FK_INCOMPATIBLE_COLUMNS`

## 📚 Referencias

- `backend/src/db/init.js` - Script de inicialización con auto-corrección de FKs
- `backend/DATABASE.md` - Documentación completa del esquema
- `AUTO_INCREMENT_CORREGIDO.md` - Corrección anterior de columnas ID

---

**✅ Sistema completamente funcional con todas las Foreign Keys correctamente configuradas**

*Mayo 25, 2026 - v1.3.0*
