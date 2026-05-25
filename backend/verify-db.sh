#!/bin/bash
# Script de verificación de base de datos

echo "🔍 Verificando estado de la base de datos..."
echo ""

# Verificar que Docker esté corriendo
if ! docker ps &> /dev/null; then
    echo "❌ Docker no está corriendo o no tienes permisos."
    echo "   Ejecuta: sudo systemctl start docker"
    exit 1
fi

# Verificar que el contenedor MySQL exista
if ! docker ps -a | grep -q mysql_db; then
    echo "⚠️  Contenedor mysql_db no encontrado."
    echo "   Ejecuta primero: docker-compose up -d"
    exit 1
fi

# Verificar que MySQL esté corriendo
if ! docker ps | grep -q mysql_db; then
    echo "❌ Contenedor mysql_db no está corriendo."
    echo "   Ejecuta: docker-compose up -d db"
    exit 1
fi

echo "✅ Contenedor MySQL está corriendo"
echo ""

# Esperar a que MySQL esté listo
echo "⏳ Esperando a que MySQL esté listo para conexiones..."
MAX_TRIES=30
COUNT=0

while [ $COUNT -lt $MAX_TRIES ]; do
    if docker exec mysql_db mysqladmin ping -h localhost -u root -p${DB_PASSWORD:-your_strong_password} --silent 2>/dev/null; then
        echo "✅ MySQL está listo para conexiones"
        break
    fi
    COUNT=$((COUNT + 1))
    echo -n "."
    sleep 1
done

if [ $COUNT -eq $MAX_TRIES ]; then
    echo ""
    echo "❌ MySQL no respondió después de $MAX_TRIES segundos"
    exit 1
fi

echo ""
echo "📊 Verificando tablas en la base de datos..."
echo ""

# Listar tablas
TABLES=$(docker exec mysql_db mysql -u root -p${DB_PASSWORD:-your_strong_password} -D cuadre_caja_db -e "SHOW TABLES;" 2>/dev/null | tail -n +2)

if [ -z "$TABLES" ]; then
    echo "⚠️  No se encontraron tablas en la base de datos"
    echo "   Esto es normal si es la primera vez."
    echo "   El backend las creará automáticamente al iniciar."
else
    echo "✅ Tablas encontradas:"
    echo "$TABLES" | while read -r table; do
        echo "   • $table"
    done
fi

echo ""
echo "👤 Verificando usuarios..."

USERS=$(docker exec mysql_db mysql -u root -p${DB_PASSWORD:-your_strong_password} -D cuadre_caja_db -e "SELECT id, username, role FROM users;" 2>/dev/null | tail -n +2)

if [ -z "$USERS" ]; then
    echo "⚠️  No se encontraron usuarios"
    echo "   El backend creará el usuario admin automáticamente al iniciar."
else
    echo "✅ Usuarios encontrados:"
    echo "$USERS"
fi

echo ""
echo "🔍 Verificando métodos de pago..."

PAYMENT_METHODS=$(docker exec mysql_db mysql -u root -p${DB_PASSWORD:-your_strong_password} -D cuadre_caja_db -e "SELECT id, code, name, currency FROM payment_methods;" 2>/dev/null | tail -n +2)

if [ -z "$PAYMENT_METHODS" ]; then
    echo "⚠️  No se encontraron métodos de pago"
    echo "   El backend los creará automáticamente al iniciar."
else
    echo "✅ Métodos de pago encontrados:"
    echo "$PAYMENT_METHODS"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Backend: http://localhost:4000"
echo "phpMyAdmin: http://localhost:8084"
echo ""
echo "Si las tablas no existen aún, levanta el backend:"
echo "  docker-compose up backend"
echo ""
echo "O verifica los logs del backend:"
echo "  docker-compose logs -f backend"
echo ""
