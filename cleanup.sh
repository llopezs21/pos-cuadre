#!/bin/bash
# ===================================
# Script de limpieza POS CUADRE
# ===================================

set -e  # Detener si hay errores

echo "🧹 Iniciando limpieza del proyecto POS CUADRE..."
echo ""

# Crear carpeta de respaldos
echo "📁 Creando carpeta _respaldos_locales..."
mkdir -p _respaldos_locales

# Preservar .env de producción si existe
echo "🔒 Preservando credenciales de producción..."
if [ -f "Archivos de produccion actuales/backend/.env" ]; then
    cp -v "Archivos de produccion actuales/backend/.env" "backend/.env.production.backup"
    echo "  ✓ Credenciales guardadas en: backend/.env.production.backup"
else
    echo "  ℹ No se encontró .env de producción"
fi
echo ""

# Mover archivos de respaldo en raíz
echo "📦 Moviendo archivos de respaldo (.sql, .csv, .rar)..."
mv -v "Archivos Backend antes de upgrade.rar" _respaldos_locales/ 2>/dev/null || true
mv -v payments.sql _respaldos_locales/ 2>/dev/null || true
mv -v respaldo.csv _respaldos_locales/ 2>/dev/null || true
mv -v restore_data.sql _respaldos_locales/ 2>/dev/null || true
mv -v transacciones.sql _respaldos_locales/ 2>/dev/null || true

# Mover carpetas de respaldo
echo "📂 Moviendo carpetas de respaldo..."
mv -v "Archivos de produccion backup" _respaldos_locales/ 2>/dev/null || true
mv -v "Archivos de produccion actuales" _respaldos_locales/ 2>/dev/null || true
mv -v Backups _respaldos_locales/ 2>/dev/null || true
mv -v posbeta _respaldos_locales/ 2>/dev/null || true

# Mover carpetas duplicadas en raíz (seeders y scripts parecen estar también en backend)
echo "🔄 Verificando carpetas duplicadas..."
if [ -d "seeders" ] && [ -d "backend/seeders" ]; then
    echo "  → Moviendo seeders/ raíz (existe en backend)"
    mv -v seeders _respaldos_locales/seeders_raiz 2>/dev/null || true
fi

if [ -d "scripts" ] && [ -d "backend/scripts" ]; then
    echo "  → Moviendo scripts/ raíz (existe en backend)"
    mv -v scripts _respaldos_locales/scripts_raiz 2>/dev/null || true
fi

# Limpiar estructura anidada de frontend
echo "🎨 Corrigiendo estructura anidada de frontend..."
if [ -d "frontend/frontend" ]; then
    echo "  → Moviendo contenido de frontend/frontend/ un nivel arriba..."
    # Crear temporal
    mv frontend frontend_old
    mv frontend_old/frontend frontend
    rm -rf frontend_old
    echo "  ✓ Frontend ahora está en /frontend/ directamente"
fi

# Limpiar archivos de build y dependencias (opcional)
echo "🧼 ¿Deseas limpiar node_modules y dist? (s/N)"
read -r respuesta
if [[ "$respuesta" =~ ^[Ss]$ ]]; then
    echo "  → Limpiando node_modules y dist..."
    rm -rf backend/node_modules backend/package-lock.json
    rm -rf frontend/node_modules frontend/package-lock.json frontend/dist
    echo "  ✓ Limpieza completada (deberás ejecutar npm install después)"
fi

echo ""
echo "✅ ¡Limpieza completada!"
echo ""
echo "📋 Resumen:"
echo "  • Archivos movidos a: _respaldos_locales/"
echo "  • Estructura frontend corregida"
echo "  • Proyecto listo para Git"
echo ""
echo "🚀 Próximos pasos:"
echo "  1. Revisar que todo esté correcto"
echo "  2. Ejecutar: git init"
echo "  3. Ejecutar: git add ."
echo "  4. Ejecutar: git commit -m 'Initial commit: Proyecto limpio'"
echo ""
