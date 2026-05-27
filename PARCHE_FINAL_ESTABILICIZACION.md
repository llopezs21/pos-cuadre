PARCHE FINAL DE ESTABILIZACIÓN: Backend de Abonos, Pulido UI y Errores Residuales

Cursor, el último "Plan de Choque" resolvió el tema global y varios 404, pero las pruebas actuales revelan que los Abonos no están guardando sus métodos de pago en el backend, el diseño del Login está desfasado, el botón de Reglas de Negocio desapareció para el admin, y hay un error de React Keys en el Dashboard.

Ejecuta estrictamente estas 4 fases de estabilización final:

FASE 1: Reparación del Backend para Abonos (Fuga de Datos Crítica)
Como actualizamos el frontend (AbonoForm.tsx) para enviar un array de múltiples pagos (payments: [...]), el backend no los está guardando en la tabla payments.

Abre backend/src/controllers/transactionController.js (o el controlador que maneje createAbono).

Actualiza la lógica de createAbono. Debe iterar sobre el array req.body.payments (si existe y tiene elementos) e insertar cada pago en la tabla payments asociado a ese Abono, exactamente igual a como lo hace la función createTransaction.

Si createAbono no existe y los abonos se manejan en createTransaction, asegúrate de que el bloque que procesa el array de pagos se ejecute siempre, independientemente de si es una factura o un abono.

FASE 2: Modernización del Login (Centrado y Footer)
Abre frontend/src/pages/LoginPage.tsx.

Cambia el contenedor principal para que el cuadro de login esté perfectamente centrado vertical y horizontalmente en la pantalla (display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh').

Agrega un "Footer" sutil debajo del cuadro de login con la información de la app: POS Cuadre Bimonetario - v1.5.0 (color #64748b o texto secundario).

FASE 3: Recuperación de Botones y Logout en el Sidebar
Botón Reglas de Negocio: En DashboardPage.tsx, el botón de "Reglas de Negocio" desapareció o se ocultó erróneamente con las reglas responsive de la barra superior. Asegúrate de que sea visible para el rol admin (user?.role === 'admin').

Mudar el Logout al Sidebar: Mueve la función y el botón de "Cerrar Sesión" (logout()) al componente UserProfileSection.tsx (en el Sidebar).

Pon un <IconButton> o botón pequeño con un <LogoutIcon> elegante justo al lado o debajo del nombre del usuario.

Elimina el botón "Cerrar Sesión" de la parte inferior del Sidebar (SessionMetricsSummary.tsx o Sidebar.tsx), ya que ahora estará junto al perfil de usuario.

FASE 4: Corrección de Warnings de React Keys
Revisa DashboardPage.tsx y otros componentes que iteren listas. La consola muestra un error: Encountered two children with the same key.

Asegúrate de que cualquier .map() (ej. renderizando botones, métricas, sesiones en el dropdown, o filas de la tabla) use un key único garantizado (como item.id, session.id, o tx.id en lugar de índices de array index que puedan repetirse).

Condiciones: Trabaja con precisión. Muestra los cambios para validación. Esta fase debe asegurar que los Abonos guarden sus pagos en la BD y que la interfaz principal no tenga fallos visuales ni warnings rojos.