PLAN MAESTRO: Refactorización UI/UX "Clean & Flat" y Desbloqueo de Flujo de Pagos

Cursor, las últimas implementaciones visuales (AbonoForm.tsx, InvoicePaymentForm.tsx, ManualEntryForm.tsx y PaymentEntryModal.tsx) resultaron en una interfaz excesivamente grande, tosca y visualmente anticuada (con redondeados exagerados de "burbuja" y fondos grises incorrectos). Además, el Modal de Pagos tiene un bug lógico funcional que bloquea al usuario al no permitir confirmar el pago libremente.

Tu Misión es aplicar un Rediseño Moderno Completo y Desbloquear el Flujo operando en 5 Fases Estrictas:

FASE 1: Modernización Estética Global (Clean & Flat)
Abre los 3 formularios principales y el PaymentEntryModal.tsx.

Redondeado (Border Radius): Reduce drásticamente el borderRadius de todos los <Paper>, <Card> y <Dialog> a un máximo de 4px u 8px. Elimina el aspecto de 'globo'.

Sombras y Fondos: Elimina las sombras pesadas (elevation={0}). Usa bordes sutiles (border: '1px solid rgba(255,255,255,0.1)').

Colores Estrictos: Asegúrate de que el fondo del Dashboard sea #0f172a y el interior de los paneles sea #1e293b. Elimina cualquier fondo gris #f8fafc o blanco residual de Material-UI.

Compactación: Reduce los padding exagerados (cambia p={4} por p={2} o 2.5). Haz que las listas de facturas se vean compactas y modernas.

FASE 2: Rediseño Funcional del PaymentEntryModal.tsx (Input Único)
Eliminar Rejilla de Billetes Fija: Elimina la visualización permanente de la tabla de denominaciones de billetes que ocupa todo el espacio de la pantalla.

Input Inteligente Único: Implementa un solo <TextField> grande, limpio y principal para el 'Monto Entregado'.

Calculadora Opcional: Si el método es is_cash === true, coloca un pequeño icono de 'Calculadora' junto al input. Al tocarlo, despliega un <Collapse> o <Popover> con el desglose de billetes. El input principal de texto debe ser siempre el que manda.

FASE 3: Desbloqueo del Botón "Confirmar Pago" (CRÍTICO)
Cambia la lógica de desactivación del botón "Confirmar Pago" en el Modal. El botón DEBE estar habilitado siempre que:

Se haya seleccionado un método de pago.

El monto entregado sea mayor a cero.

Elimina la regla de coincidencia exacta: El modal no debe obligar a que el desglose de billetes coincida con la deuda para dejarte confirmar. Si ingreso $100 para una deuda de $80, simplemente calcula el vuelto y déjame confirmar el pago.

FASE 4: Consolidación Visual del "Carrito de Pagos"
En InvoicePaymentForm.tsx, AbonoForm.tsx y ManualEntryForm.tsx, la UI debe ser minimalista.

Muestra los pagos agregados usando el componente <PaymentCard> de forma compacta.

Usa un botón discreto (Outlined) que diga + Agregar Pago para abrir el modal.

El botón final de "Guardar Pago / Facturar" debe ser el único botón primario gigante (variant="contained", fullWidth) al fondo del formulario.

FASE 5: Limpieza del Header General (DashboardPage.tsx)
Localiza el enorme encabezado <h1> o <Typography variant="h3"> que dice "Aplicación de Cuadre de Caja".

Elimínalo de la vista principal del Dashboard para ahorrar espacio vertical crítico.

Mueve esa información a un pequeño texto de versión en el Sidebar (ej. v1.0 - POS Cuadre) o a un modal sutil de 'Acerca de' en un botón de engranaje.

Regla de Ejecución: Trabaja fase por fase. No toques la lógica matemática base de los totales, solo la UI y la lógica de validación del modal. Muestra los cambios para aprobación. No aceptaré un diseño que bloquee el flujo de cobro.