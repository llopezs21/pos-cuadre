# 🚀 Guía Rápida - Sistema de Inicialización Automática de BD

## ✅ Lo que se ha implementado

### 1. Sistema de Reintentos para MySQL
- **Archivo:** `backend/src/db/database.js`
- **Cambio:** Añadido timeout de conexión de 10s
- **Beneficio:** El pool no falla inmediatamente si MySQL tarda

### 2. Script de Inicialización Completo
- **Archivo:** `backend/src/db/init.js`
- **Funcionalidades:**
  - ✅ Espera hasta 10 intentos (3s entre cada uno) para que MySQL esté listo
  - ✅ Crea automáticamente 10 tablas con `CREATE TABLE IF NOT EXISTS`
  - ✅ Crea usuario admin por defecto (usuario: `admin`, password: `admin123`)
  - ✅ Crea 4 métodos de pago básicos (CASH_USD, CASH_VES, POS_BANESCO, POS_MIBANCO)
  - ✅ Es idempotente (puedes ejecutarlo múltiples veces sin romper nada)

### 3. Integración en el Servidor
- **Archivo:** `backend/server.js`
- **Cambio:** Ahora ejecuta `initializeDatabase()` antes de `app.listen()`
- **Beneficio:** El servidor no acepta peticiones hasta que la BD está lista

---

## 🎯 Cómo Usar

### Opción 1: Docker Compose (Recomendado)

```bash
# Desde la raíz del proyecto
docker-compose up -d

# Ver logs en tiempo real para confirmar inicialización
docker-compose logs -f backend

# Deberías ver:
# 🚀 INICIANDO CONFIGURACIÓN DE BASE DE DATOS
# 🔄 Intento 1/10: Conectando a MySQL...
# ✅ Conexión a MySQL establecida exitosamente.
# 🗄️  Inicializando esquema de base de datos...
#   ✓ Tabla users creada/verificada.
#   ✓ Tabla cashier_sessions creada/verificada.
#   ...
# ✅ BASE DE DATOS LISTA PARA USAR
# ✅ Servidor corriendo en http://localhost:4000
```

### Opción 2: Desarrollo Local (sin Docker)

```bash
# 1. Asegúrate de tener MySQL corriendo localmente
sudo systemctl start mysql

# 2. Crea la base de datos manualmente
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS cuadre_caja_db;"

# 3. Configura el .env para apuntar a localhost
cd backend
nano .env
# Cambia DB_HOST=db por DB_HOST=localhost

# 4. Instala dependencias e inicia
npm install
npm run dev

# Las tablas se crearán automáticamente
```

---

## 📋 Estructura de Tablas Creadas

| Tabla | Descripción | Registros Iniciales |
|-------|-------------|-------------------|
| `users` | Usuarios del sistema | 1 admin |
| `cashier_sessions` | Sesiones de caja | Vacía |
| `transactions` | Transacciones | Vacía |
| `payments` | Pagos (detalles de transacciones) | Vacía |
| `payment_methods` | Métodos de pago | 4 básicos |
| `abonos` | Pagos anticipados | Vacía |
| `external_clients` | Clientes externos | Vacía |
| `external_invoices` | Facturas externas | Vacía |
| `payment_method_configs` | Configuraciones por usuario | Vacía |
| `payment_commissions` | Comisiones de métodos | Vacía |

---

## 🔍 Verificación del Sistema

### Script de Verificación Automática

```bash
# Ejecuta el script de verificación
./backend/verify-db.sh

# Muestra:
# - Estado de contenedores Docker
# - Conectividad con MySQL
# - Lista de tablas creadas
# - Usuarios existentes
# - Métodos de pago configurados
```

### Verificación Manual con phpMyAdmin

```bash
# Accede desde el navegador
open http://localhost:8084

# Credenciales:
Usuario: root
Contraseña: (la de tu backend/.env en DB_PASSWORD)
Base de datos: cuadre_caja_db
```

### Verificación Manual con MySQL CLI

```bash
# Desde el contenedor Docker
docker exec -it mysql_db mysql -u root -p

# Luego dentro de MySQL:
USE cuadre_caja_db;
SHOW TABLES;
SELECT * FROM users;
SELECT * FROM payment_methods;
```

---

## 🧪 Casos de Prueba

### Prueba 1: Primera Inicialización (BD vacía)

```bash
# Limpiar todo
docker-compose down -v

# Levantar de nuevo
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Resultado esperado:
# ✅ Todas las tablas creadas
# ✅ Usuario admin creado
# ✅ 4 métodos de pago creados
```

### Prueba 2: Reinicio (BD ya existe)

```bash
# Reiniciar solo el backend
docker-compose restart backend

# Ver logs
docker-compose logs -f backend

# Resultado esperado:
# ✅ Tablas verificadas (no recreadas)
# ⚠️  Usuario admin ya existe (normal)
# ⚠️  Métodos de pago ya existen (normal)
```

### Prueba 3: MySQL tarda en levantar

```bash
# Limpiar todo
docker-compose down -v

# Levantar backend primero (antes que MySQL)
docker-compose up backend

# Resultado esperado:
# 🔄 Intento 1/10: Conectando a MySQL...
# ⚠️  Intento 1 fallido: connect ECONNREFUSED
# ⏳ Esperando 3s antes del siguiente intento...
# 🔄 Intento 2/10: Conectando a MySQL...
# ... (reintenta hasta que MySQL esté listo)
# ✅ Conexión exitosa
```

---

## 🔧 Troubleshooting

### Problema: Backend no inicia, error de conexión MySQL

**Síntomas:**
```
❌ No se pudo conectar a MySQL después de múltiples intentos.
```

**Soluciones:**
```bash
# 1. Verificar que MySQL esté corriendo
docker ps | grep mysql

# 2. Ver logs de MySQL
docker-compose logs db

# 3. Verificar credenciales en .env
cat backend/.env | grep DB_

# 4. Reintentar con más logs
docker-compose up backend
```

---

### Problema: Tablas duplicadas o errores de constraints

**Síntomas:**
```
Error: Duplicate column name 'xxx'
Error: Cannot add foreign key constraint
```

**Solución:** Resetear base de datos
```bash
# Opción 1: Eliminar solo datos
docker exec -it mysql_db mysql -u root -p -e "DROP DATABASE cuadre_caja_db; CREATE DATABASE cuadre_caja_db;"
docker-compose restart backend

# Opción 2: Eliminar todo (incluye volumen)
docker-compose down -v
docker-compose up -d
```

---

### Problema: No se crea usuario admin

**Síntomas:**
```
⚠️  No se encontró usuario admin. Creando usuario por defecto...
Error: Cannot read properties of undefined (reading 'hash')
```

**Causa:** Falta instalar bcryptjs

**Solución:**
```bash
cd backend
npm install bcryptjs
docker-compose restart backend
```

---

### Problema: phpMyAdmin no conecta

**Síntomas:**
```
Cannot connect to MySQL server
mysqli_real_connect(): (HY000/2002): Connection refused
```

**Solución:**
```bash
# 1. Verificar que ambos contenedores estén en la misma red
docker network ls
docker network inspect pos-cuadre_default

# 2. Reiniciar phpMyAdmin
docker-compose restart phpmyadmin

# 3. Verificar variables de entorno
docker-compose config | grep -A5 phpmyadmin
```

---

## 📚 Archivos Modificados/Creados

### Archivos Nuevos:
- ✅ `backend/src/db/init.js` - Sistema de inicialización
- ✅ `backend/DATABASE.md` - Documentación completa
- ✅ `backend/verify-db.sh` - Script de verificación
- ✅ `backend/INIT_GUIDE.md` - Esta guía

### Archivos Modificados:
- ✅ `backend/src/db/database.js` - Añadido timeout
- ✅ `backend/server.js` - Integración de initializeDatabase()
- ✅ `README.md` - Actualizada sección de BD

---

## 🎓 Conceptos Importantes

### ¿Por qué usar CREATE TABLE IF NOT EXISTS?

```sql
-- En lugar de:
CREATE TABLE users (...);  -- Falla si ya existe

-- Usamos:
CREATE TABLE IF NOT EXISTS users (...);  -- Idempotente
```

**Ventajas:**
- ✅ No falla si la tabla ya existe
- ✅ Permite reiniciar el backend sin romper nada
- ✅ Perfecto para Docker (contenedores efímeros)

### ¿Por qué esperar con reintentos?

Docker Compose levanta todos los contenedores en paralelo. MySQL tarda ~10-30s en estar listo para aceptar conexiones. Sin reintentos, el backend fallaría inmediatamente.

**Con reintentos:**
```
Backend intenta → MySQL no está listo → Espera 3s → Reintenta → Éxito
```

---

## 🚀 Siguiente Paso

Tu base de datos ahora se inicializa automáticamente. Solo ejecuta:

```bash
docker-compose up -d
```

Y verifica que todo funcione:

```bash
# Verificar backend
curl http://localhost:4000

# Debe responder:
# 🚀 API de Cuadre de Caja funcionando!

# Verificar phpMyAdmin
open http://localhost:8084

# Login y ver las tablas creadas
```

---

**🎉 ¡Sistema de inicialización automática funcionando!**

Si tienes algún problema, revisa:
1. `docker-compose logs backend`
2. `docker-compose logs db`
3. `./backend/verify-db.sh`
