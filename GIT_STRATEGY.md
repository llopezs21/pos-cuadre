# 🚀 Estrategia Git para POS CUADRE

## Modelo de Ramas (Git Flow Simplificado)

```
main (producción)
  └─ develop (desarrollo)
       └─ feature/* (características nuevas)
       └─ fix/* (correcciones)
```

### Flujo de Trabajo

1. **main** - Código en producción (protegido)
2. **develop** - Código en desarrollo activo
3. **feature/nombre** - Nuevas características
4. **fix/nombre** - Correcciones de bugs

---

## 📋 Inicialización del Repositorio

### Paso 1: Guardar .env de producción (antes de limpiar)

```bash
# Guardar credenciales de producción de forma segura
cp "Archivos de produccion actuales/backend/.env" backend/.env.production.backup
```

### Paso 2: Ejecutar script de limpieza

```bash
./cleanup.sh
```

### Paso 3: Inicializar Git

```bash
# Inicializar repositorio
git init

# Configurar información del usuario (si no lo has hecho)
git config user.name "Tu Nombre"
git config user.email "tu@email.com"

# Crear rama develop
git checkout -b develop

# Añadir todos los archivos
git add .

# Primer commit
git commit -m "feat: Initial commit - Proyecto limpio y estructurado

- Estructura backend/ y frontend/ estandarizada
- .gitignore configurado
- Docker Compose para dev y prod
- Archivos de respaldo movidos a _respaldos_locales/"

# Crear rama main desde develop
git branch main

# Volver a develop (trabajarás aquí)
git checkout develop
```

### Paso 4: Conectar con GitHub

```bash
# En GitHub, crea un nuevo repositorio vacío (sin README, sin .gitignore, sin licencia)
# Luego ejecuta:

git remote add origin https://github.com/TU_USUARIO/pos-cuadre.git

# Subir ambas ramas
git push -u origin main
git push -u origin develop
```

### Paso 5: Proteger rama main en GitHub

1. Ve a: `Settings` → `Branches` → `Add rule`
2. Branch name pattern: `main`
3. Activar:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Do not allow bypassing the above settings

---

## 🔄 Flujo de Trabajo Diario

### Para nuevas características:

```bash
# Asegúrate de estar en develop y actualizado
git checkout develop
git pull origin develop

# Crear rama de feature
git checkout -b feature/nombre-descriptivo

# Trabajar en tu código...
git add .
git commit -m "feat: descripción del cambio"

# Cuando termines, sube la rama
git push -u origin feature/nombre-descriptivo

# Crear Pull Request en GitHub: feature/nombre → develop
# Después de aprobar y merge, elimina la rama
git checkout develop
git pull origin develop
git branch -d feature/nombre-descriptivo
```

### Para desplegar a producción:

```bash
# Cuando develop esté listo para producción
git checkout main
git pull origin main

# Merge desde develop (o hacer PR en GitHub)
git merge develop

# Etiquetar versión
git tag -a v1.0.0 -m "Release v1.0.0"

# Subir a producción
git push origin main
git push origin v1.0.0
```

---

## 🐳 Gestión de Entornos con Docker

### Desarrollo Local (docker-compose.yml)

```bash
# Levantar entorno de desarrollo
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Detener
docker-compose down
```

**Características:**
- Puerto backend: `4000`
- Puerto DB: `3309`
- Incluye phpMyAdmin en `8084`
- Variables desde `backend/.env`

### Producción (docker-compose.prod.yml)

```bash
# Levantar entorno de producción
docker-compose -f docker-compose.prod.yml up -d --build

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Detener
docker-compose -f docker-compose.prod.yml down
```

**Características:**
- Puerto backend: `4010`
- Puerto DB: `3309`
- Datos persistentes en `/opt/mysql_data`
- Variables desde `backend/.env`

---

## 📁 Estructura Final del Proyecto

```
POS CUADRE/
├── backend/                    # API Node.js + Sequelize
│   ├── src/
│   ├── config/
│   ├── models/
│   ├── migrations/
│   ├── seeders/
│   ├── .env                    # Desarrollo (gitignore)
│   ├── .env.example            # Template (versionar)
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── package.json
│
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   ├── public/
│   ├── .env.development        # Desarrollo (gitignore)
│   ├── .env.production         # Producción (gitignore)
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── package.json
│
├── _respaldos_locales/         # Respaldos (gitignore)
│   ├── Archivos de produccion actuales/
│   ├── Backups/
│   ├── *.sql
│   └── *.rar
│
├── .gitignore
├── docker-compose.yml          # Desarrollo
├── docker-compose.prod.yml     # Producción
├── README.md
└── cleanup.sh
```

---

## 🔒 Variables de Entorno (.env)

### Crear plantillas versionables:

```bash
# Backend
cp backend/.env backend/.env.example

# Editar .env.example y quitar valores sensibles
# Ejemplo:
# DB_PASSWORD=your_password_here
# JWT_SECRET=your_secret_here
```

### En .env.example (versionar):
```bash
DB_HOST=db
DB_USER=root
DB_PASSWORD=CHANGE_ME
DB_NAME=cuadre_caja_db
DB_PORT=3306
PORT=4000
JWT_SECRET=CHANGE_ME
```

### En .env (NO versionar):
```bash
DB_HOST=db
DB_USER=root
DB_PASSWORD=21241617
DB_NAME=cuadre_caja_db
DB_PORT=3306
PORT=4000
JWT_SECRET=tu_secreto_real_aqui
```

---

## 🎯 Convenciones de Commits

Usa [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nueva característica
- `fix:` - Corrección de bug
- `docs:` - Documentación
- `style:` - Formato de código
- `refactor:` - Refactorización
- `test:` - Tests
- `chore:` - Tareas de mantenimiento

**Ejemplos:**
```bash
git commit -m "feat: agregar endpoint de reportes diarios"
git commit -m "fix: corregir cálculo de totales en cuadre"
git commit -m "docs: actualizar README con instrucciones Docker"
```

---

## 🚨 Comandos de Emergencia

### Deshacer último commit (no pusheado):
```bash
git reset --soft HEAD~1
```

### Descartar cambios locales:
```bash
git checkout -- .
```

### Ver diferencias antes de commit:
```bash
git diff
```

### Ver estado del repositorio:
```bash
git status
```

---

## 📚 Recursos

- [Git Flow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Docker Compose](https://docs.docker.com/compose/)
