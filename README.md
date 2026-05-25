# 💰 POS CUADRE - Sistema de Punto de Venta y Cuadre de Caja

Sistema completo de gestión de punto de venta con cuadre de caja, desarrollado con Node.js, React y MySQL.

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose instalados
- Git
- Node.js 16+ (solo para desarrollo local sin Docker)

### Instalación

1. **Clonar el repositorio:**
```bash
git clone https://github.com/TU_USUARIO/pos-cuadre.git
cd pos-cuadre
```

2. **Configurar variables de entorno:**
```bash
# Backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales

# Frontend
cp frontend/.env.development.example frontend/.env.development
cp frontend/.env.production.example frontend/.env.production
```

3. **Levantar entorno de desarrollo:**
```bash
docker-compose up -d
```

4. **Acceder a la aplicación:**
- Frontend: `http://localhost:5173` (Vite dev server)
- Backend API: `http://localhost:4000`
- phpMyAdmin: `http://localhost:8084`

---

## 📁 Estructura del Proyecto

```
POS CUADRE/
├── backend/              # API REST con Node.js + Express + Sequelize
│   ├── src/              # Código fuente
│   ├── config/           # Configuración de Sequelize
│   ├── models/           # Modelos de datos
│   ├── migrations/       # Migraciones de BD
│   ├── seeders/          # Datos iniciales
│   └── server.js         # Punto de entrada
│
├── frontend/             # Aplicación React + TypeScript + Vite
│   ├── src/              # Código fuente
│   ├── public/           # Archivos estáticos
│   └── dist/             # Build de producción (generado)
│
├── docker-compose.yml             # Configuración Docker para desarrollo
├── docker-compose.prod.yml        # Configuración Docker para producción
├── .gitignore                     # Archivos ignorados por Git
├── GIT_STRATEGY.md                # Guía de flujo de trabajo Git
└── cleanup.sh                     # Script de limpieza del proyecto
```

---

## 🐳 Docker

### Desarrollo

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f backend

# Detener servicios
docker-compose down

# Reconstruir después de cambios en Dockerfile
docker-compose up -d --build
```

**Servicios incluidos:**
- `db`: MySQL 8.0 (puerto 3309)
- `backend`: Node.js API (puerto 4000)
- `phpmyadmin`: Gestor de BD (puerto 8084)

### Producción

```bash
# Iniciar en producción
docker-compose -f docker-compose.prod.yml up -d --build

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Detener
docker-compose -f docker-compose.prod.yml down
```

**Diferencias en producción:**
- Backend en puerto `4010`
- Sin phpMyAdmin
- Datos persistentes en `/opt/mysql_data`
- Dockerfiles optimizados (`.prod`)

---

## 🛠️ Desarrollo Local (sin Docker)

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔄 Flujo de Trabajo Git

### Ramas principales:

- `main` - Código en producción (protegido)
- `develop` - Código en desarrollo activo

### Crear nueva característica:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-caracteristica

# Trabajar en tu código...
git add .
git commit -m "feat: descripción del cambio"
git push -u origin feature/nombre-caracteristica

# Crear Pull Request en GitHub: feature/nombre → develop
```

### Desplegar a producción:

```bash
git checkout main
git merge develop
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --tags
```

📖 **Ver más detalles en:** [GIT_STRATEGY.md](./GIT_STRATEGY.md)

---

## 🗃️ Base de Datos

### Inicialización Automática ✨

El sistema incluye **inicialización automática de base de datos**. No necesitas ejecutar migraciones manualmente.

```bash
# Solo levanta Docker y todo se configura automáticamente
docker-compose up -d
```

**El sistema automáticamente:**
1. ✅ Espera a que MySQL esté disponible (con reintentos)
2. ✅ Crea todas las tablas necesarias
3. ✅ Inserta datos iniciales (usuario admin + métodos de pago)
4. ✅ Inicia el servidor backend

### Datos de Acceso Iniciales

**Usuario admin creado automáticamente:**
- Usuario: `admin`
- Contraseña: `admin123`
- ⚠️ **Cambia esta contraseña inmediatamente en producción**

### Tablas Principales

- `users` - Usuarios y roles
- `cashier_sessions` - Sesiones de caja (abiertas/cerradas)
- `transactions` - Transacciones registradas
- `payments` - Detalles de pagos (método, monto, tasa BCV)
- `payment_methods` - Métodos de pago configurables
- `abonos` - Pagos anticipados de clientes
- `external_clients` - Clientes del sistema externo
- `external_invoices` - Facturas externas sincronizadas

📖 **Ver documentación completa:** [backend/DATABASE.md](./backend/DATABASE.md)

### phpMyAdmin

Accede a la base de datos visualmente:
```
http://localhost:8084
Usuario: root
Contraseña: (la de tu .env)
```

## 🗃️ Base de Datos (Comandos Avanzados)

### Migraciones

```bash
cd backend

# Crear nueva migración
npx sequelize-cli migration:generate --name nombre-migracion

# Ejecutar migraciones pendientes
npx sequelize-cli db:migrate

# Revertir última migración
npx sequelize-cli db:migrate:undo
```

### Seeders

```bash
# Ejecutar todos los seeders
npx sequelize-cli db:seed:all

# Ejecutar seeder específico
npx sequelize-cli db:seed --seed 20230101000000-demo-user.js

# Revertir seeders
npx sequelize-cli db:seed:undo:all
```

---

## 🧪 Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

---

## 📦 Build de Producción

### Backend

```bash
cd backend
docker build -f Dockerfile.prod -t pos-backend:prod .
```

### Frontend

```bash
cd frontend
npm run build
# Los archivos estarán en frontend/dist/
```

---

## 🔒 Variables de Entorno

### Backend (`backend/.env`)

```env
PORT=4000
DB_HOST=db
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=cuadre_caja_db
JWT_SECRET=tu_secreto
DEFAULT_BCV_RATE=36.5
IVA_RATE=0.16
GIE_API_HOST=http://host.docker.internal:4002
GIE_CLIENT_ID=pos_cuadre
GIE_CLIENT_SECRET=tu_secret
```

### Frontend (`frontend/.env.development`)

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### Frontend (`frontend/.env.production`)

```env
VITE_API_BASE_URL=https://tu-dominio.com/api
```

---

## 🚨 Solución de Problemas

### Error: "Cannot connect to database"

```bash
# Verificar que el contenedor de MySQL esté corriendo
docker ps

# Ver logs del contenedor de base de datos
docker-compose logs db

# Reiniciar servicios
docker-compose restart db backend
```

### Error: "Port 4000 already in use"

```bash
# Ver qué proceso está usando el puerto
lsof -i :4000

# Detener el proceso o cambiar el puerto en .env
```

### Frontend no se conecta al backend

1. Verificar que `VITE_API_BASE_URL` en `.env.development` apunte a `http://localhost:4000/api`
2. Verificar que el backend esté corriendo en el puerto 4000
3. Revisar CORS en el backend

---

## 📚 Tecnologías Utilizadas

### Backend
- Node.js + Express
- Sequelize ORM
- MySQL 8.0
- JWT para autenticación
- Docker

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- Axios
- TailwindCSS / Material-UI (según tu implementación)

---

## 👥 Contribuir

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto es privado y confidencial.

---

## 📞 Soporte

Para dudas o problemas, contacta al equipo de desarrollo.

---

## 🎯 Roadmap

- [ ] Implementar sistema de reportes avanzados
- [ ] Agregar notificaciones en tiempo real
- [ ] Integración con sistemas de facturación
- [ ] App móvil

---

**Desarrollado con ❤️ por el equipo de MineT System**
