#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  PRUEBA DEL SISTEMA DE INICIALIZACIÓN AUTOMÁTICA
#  POS CUADRE - Base de Datos
# ═══════════════════════════════════════════════════════════════

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     SISTEMA DE INICIALIZACIÓN AUTOMÁTICA DE BASE DE DATOS    ║"
echo "║                      POS CUADRE v1.0                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Este script te guiará para probar el nuevo sistema de inicialización."
echo ""

# ────────────────────────────────────────────────────────────────
# PASO 1: Verificar Docker
# ────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 1: Verificando Docker..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado."
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo "❌ Docker no está corriendo."
    echo "   Ejecuta: sudo systemctl start docker"
    exit 1
fi

echo "✅ Docker está instalado y corriendo"
echo ""

# ────────────────────────────────────────────────────────────────
# PASO 2: Limpiar entorno anterior
# ────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 2: Limpiando entorno anterior..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "¿Deseas limpiar la base de datos existente? (s/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🗑️  Deteniendo y eliminando contenedores..."
    docker-compose down -v
    echo "✅ Entorno limpio"
else
    echo "ℹ️  Manteniendo base de datos existente"
    docker-compose down
fi

echo ""

# ────────────────────────────────────────────────────────────────
# PASO 3: Levantar servicios
# ────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 3: Levantando servicios..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "🚀 Ejecutando: docker-compose up -d"
docker-compose up -d

echo ""
echo "⏳ Esperando 5 segundos para que los contenedores inicien..."
sleep 5
echo ""

# ────────────────────────────────────────────────────────────────
# PASO 4: Ver logs de inicialización
# ────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 4: Mostrando logs de inicialización (primeros 40 seg)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Busca estos mensajes clave:"
echo "  🔄 Intento N/10: Conectando a MySQL..."
echo "  ✅ Conexión a MySQL establecida exitosamente."
echo "  🗄️  Inicializando esquema de base de datos..."
echo "    ✓ Tabla users creada/verificada."
echo "    ✓ Tabla cashier_sessions creada/verificada."
echo "    ... (más tablas)"
echo "  🌱 Verificando datos iniciales..."
echo "    ✓ Usuario admin creado"
echo "    ✓ Métodos de pago básicos creados"
echo "  ✅ BASE DE DATOS LISTA PARA USAR"
echo "  ✅ Servidor corriendo en http://localhost:4000"
echo ""
echo "Presiona Ctrl+C cuando veas '✅ Servidor corriendo'"
echo ""

timeout 40s docker-compose logs -f backend || true

echo ""
echo ""

# ────────────────────────────────────────────────────────────────
# PASO 5: Verificar estado
# ────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 5: Verificando estado de los servicios..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📊 Contenedores corriendo:"
docker-compose ps

echo ""
echo "🔍 Verificando conectividad del backend..."

# Esperar hasta 30 segundos a que el backend responda
MAX_WAIT=30
COUNT=0
while [ $COUNT -lt $MAX_WAIT ]; do
    if curl -s http://localhost:4000 > /dev/null 2>&1; then
        echo "✅ Backend respondiendo en http://localhost:4000"
        break
    fi
    COUNT=$((COUNT + 1))
    echo -n "."
    sleep 1
done

if [ $COUNT -eq $MAX_WAIT ]; then
    echo ""
    echo "⚠️  Backend no responde después de $MAX_WAIT segundos"
    echo "   Ver logs: docker-compose logs backend"
else
    echo ""
    RESPONSE=$(curl -s http://localhost:4000)
    echo "📝 Respuesta del backend: $RESPONSE"
fi

echo ""

# ────────────────────────────────────────────────────────────────
# PASO 6: Verificar base de datos
# ────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 6: Verificando base de datos..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "./backend/verify-db.sh" ]; then
    echo "🔍 Ejecutando script de verificación..."
    ./backend/verify-db.sh
else
    echo "⚠️  Script verify-db.sh no encontrado, verificación manual..."
    
    # Obtener password del .env
    DB_PASSWORD=$(grep DB_PASSWORD backend/.env | cut -d'=' -f2)
    
    echo ""
    echo "📊 Tablas en la base de datos:"
    docker exec mysql_db mysql -u root -p${DB_PASSWORD} -D cuadre_caja_db -e "SHOW TABLES;" 2>/dev/null || echo "⚠️  No se pudo conectar a MySQL"
fi

echo ""

# ────────────────────────────────────────────────────────────────
# PASO 7: Resumen y próximos pasos
# ────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 7: Resumen y Acceso"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URLs de Acceso:"
echo "   • Backend API:   http://localhost:4000"
echo "   • phpMyAdmin:    http://localhost:8084"
echo ""
echo "🔐 Credenciales por defecto:"
echo "   • Usuario admin: admin"
echo "   • Contraseña:    admin123"
echo "   ⚠️  CAMBIAR EN PRODUCCIÓN"
echo ""
echo "📚 Documentación:"
echo "   • README.md             - Guía general del proyecto"
echo "   • backend/DATABASE.md   - Documentación técnica de BD"
echo "   • backend/INIT_GUIDE.md - Guía de inicialización"
echo "   • backend/SUMMARY.md    - Resumen de implementación"
echo ""
echo "🛠️  Comandos útiles:"
echo "   • Ver logs:           docker-compose logs -f backend"
echo "   • Reiniciar backend:  docker-compose restart backend"
echo "   • Detener todo:       docker-compose down"
echo "   • Verificar BD:       ./backend/verify-db.sh"
echo ""
echo "🧪 Probar el sistema:"
echo ""
echo "   # Login como admin"
echo "   curl -X POST http://localhost:4000/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"username\": \"admin\", \"password\": \"admin123\"}'"
echo ""
echo "   # Ver métodos de pago"
echo "   curl http://localhost:4000/api/payment-methods"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ ¡Sistema de inicialización automática funcionando!"
echo ""
echo "Si todo se ve bien, tu base de datos está lista para usar."
echo "Cualquier reinicio del backend re-verificará las tablas automáticamente."
echo ""
