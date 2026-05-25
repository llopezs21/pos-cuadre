Plan de Migración: Reglas de Negocio Dinámicas
🎯 Objetivo
Extraer la lógica matemática "hardcoded" (IVA 16%, Umbral 50%, Tolerancia $0.05) del código fuente y convertirla en parámetros dinámicos gestionables desde una nueva interfaz CRUD en el frontend.

⚙️ Fase 1: Backend - Endpoints de Configuración
Controlador Global: Crear backend/src/controllers/settingsController.js con métodos getSettings y updateSettings apuntando a la tabla global_settings (forzando siempre el WHERE id = 1).

Controlador Métodos de Pago: Actualizar paymentMethodsController.js para permitir actualizar las columnas triggers_iva e is_base_currency.

Rutas: Crear backend/src/routes/settings.js y registrarla en server.js bajo /api/settings.

🧠 Fase 2: Backend - Refactorización del "Cerebro"
En transactionController.js (especialmente en getClosingSummary y en el registro de transacciones):

Antes de calcular cuadros o diferencias, hacer un SELECT * FROM global_settings WHERE id = 1.

Sustituir los valores estáticos 0.50, 0.16 y 0.05 por settings.iva_threshold, settings.iva_rate y settings.reconciliation_tolerance.

La regla del IVA (Umbral): Evaluar si la suma de pagos con métodos is_base_currency = true alcanza el total_base * settings.iva_threshold.

🌐 Fase 3: Frontend - Store y Carga Inicial
En frontend/src/store.ts, agregar el estado globalSettings y una acción fetchGlobalSettings.

Ejecutar fetchGlobalSettings en la carga inicial de App.tsx o DashboardPage.tsx.

🎛️ Fase 4: Frontend - Interfaz CRUD (Reglas de Negocio)
Crear una nueva página frontend/src/pages/BusinessRulesPage.tsx.

Sección A (Parámetros Globales): Un formulario para editar la Tasa de IVA (ej. 16%), el Umbral de Exoneración (ej. 50%) y la Tolerancia de Cuadre ($).

Sección B (Comportamiento de Métodos): Una tabla que liste todos los métodos de pago con Switches (Toggles) para activar/desactivar is_base_currency y triggers_iva por cada método.

Agregar el enlace a esta página en la navegación lateral o superior bajo el nombre "Reglas de Negocio". (Nota: Diferenciar claramente de la exportación a GIE-APP).

🧮 Fase 5: Frontend - Refactorización de Formularios de Pago
En InvoicePaymentForm.tsx (y cualquier otro formulario de cobro):

Leer iva_rate e iva_threshold desde Zustand (useAppStore).

Reemplazar la lógica condicional rígida. El cálculo en tiempo real debe verificar la suma ingresada en el método is_base_currency frente al umbral dinámico, y aplicar el iva_rate dinámico a los métodos triggers_iva si la regla falla.

se aplico este comando en la base de datos para poder aplicar esta actualizacion actualiza el init.js para que sea compatible con el nuevo schema de BD -- 2. Asegurarnos de que los métodos de pago tengan las banderas correctas
ALTER TABLE payment_methods ADD COLUMN triggers_iva BOOLEAN DEFAULT FALSE;
ALTER TABLE payment_methods ADD COLUMN is_base_currency BOOLEAN DEFAULT FALSE;

-- Configurar el Efectivo USD como moneda base
UPDATE payment_methods SET is_base_currency = TRUE WHERE code = 'CASH_USD';
-- Configurar los demás para que disparen IVA (si no se cumple la regla)
UPDATE payment_methods SET triggers_iva = TRUE WHERE currency = 'VES';

