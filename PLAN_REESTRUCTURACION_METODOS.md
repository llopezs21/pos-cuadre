El layout general ha quedado muy bien, pero la experiencia de usuario (UX) al agregar pagos en línea (inline) sigue causando bugs de estado y visualmente el formulario InvoicePaymentForm y sus hermanos (Abono y Cobro Manual) se ven desactualizados frente al nuevo Sidebar oscuro.

NUEVO REQUERIMIENTO ARQUITECTÓNICO:
Vamos a migrar de un modelo de 'inputs inline' a un 'Modelo de Modal de Pagos' (Payment Entry Modal) típico de sistemas POS modernos, y añadiremos soporte para desglose de billetes y números de referencia.

Por favor, ejecuta este plan en 5 Fases Estrictas:

FASE 1: Actualización del Backend (Base de Datos)
Tabla payment_methods: Modifica el script de inicialización (init.js) y el modelo para agregar una columna booleana is_cash (default false). Actualiza los métodos existentes: CASH_USD y CASH_VES deben tener is_cash: true.

Tabla payments: Añade una columna reference (VARCHAR/String, nullable) para guardar el número de referencia de transferencias o puntos de venta.

FASE 2: Creación del PaymentEntryModal.tsx (Frontend)
Crea un nuevo componente en frontend/src/components/payment/PaymentEntryModal.tsx que reciba el montoFaltante, la monedaBase, y los métodos de pago.

Si el método seleccionado es is_cash === true: Muestra una "Calculadora de Billetes" (inputs para cantidades de billetes de 100, 50, 20, 10, 5, 1). Muestra el "Total Entregado" y calcula el "Vuelto" automáticamente si entregan más de lo que deben.

Si el método seleccionado es is_cash === false: Muestra un input de texto obligatorio/opcional para la "REF:" (Referencia).

Salida: Al confirmar, el modal debe devolver un objeto limpio: { method, amount, currency, bcvRate, reference, tenderedAmount, changeAmount }.

FASE 3: Modernización de Formularios (UI/UX)
Refactoriza visualmente InvoicePaymentForm.tsx, el componente de Abono y el de Cobro Manual.

Elimina la lista de inputs inline feos.

Usa Cards o Papers oscuros y limpios con bordes redondeados.

Muestra los pagos agregados como una "Lista de resumen" (con iconos, botón para eliminar, e indicando si hay vuelto o REF).

Coloca un botón grande y atractivo: + Agregar Pago que abra el nuevo PaymentEntryModal.

FASE 4: Unificación de Lógica en Abonos
En la vista de Abonos, implementa el input de "Monto Base" igual que en el Cobro Manual.

Aplica exactamente la misma lógica de negocio (reglas de IVA dinámico usando globalSettings, cálculo de tasas BCV) de modo que ingresar un abono funcione matemática y visualmente igual que pagar una factura.

FASE 5: Limpieza de Código (Depuración final)
Elimina todas las funciones viejas de handlePaymentChange y sus cálculos propensos a errores de "stale closures" en los 3 formularios. Ahora la suma se hace simplemente iterando el array de pagos limpios devueltos por el Modal.

Reglas de Diseño: Utiliza la paleta oscura actual (#0f172a fondo, #1e293b papers, acentos en verde para USD, naranja para VES y azul para transferencias/Puntos). Asegúrate de que el modal sea responsive. ¡Trabaja fase por fase y pide confirmación!