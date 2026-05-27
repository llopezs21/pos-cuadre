PLAN DE CHOQUE: Corrección de Errores 404, Lógica de IVA y Globalización del Tema

Cursor, la UI ha mejorado, pero las pruebas de integración revelan fallos críticos de red (404) y desconexiones lógicas entre los componentes. Además, el fondo gris por defecto sigue apareciendo porque no hemos globalizado el tema.

Ejecuta estrictamente estas 4 fases de corrección:

FASE 1: Exorcismo del Fondo Gris (Global Theme en App.tsx)
Abre frontend/src/App.tsx (o main.tsx/index.tsx, donde esté el root).

Implementa un ThemeProvider de Material-UI que envuelva toda la aplicación.

Configura el tema oscuro (Dark Theme) explícitamente:

palette.mode: 'dark'

palette.background.default: '#0f172a'

palette.background.paper: '#1e293b'

Asegúrate de incluir el componente <CssBaseline /> de MUI justo debajo del ThemeProvider. Esto forzará el CSS global y destruirá el fondo gris nativo en toda la app.

FASE 2: Extracción y Modernización del Buscador de Clientes
El <Autocomplete> actual de clientes es feo y repite código. Extrae esa lógica a un nuevo componente: frontend/src/components/shared/ClientSearch.tsx.

Dale un estilo 'Clean & Flat' (fondo #1e293b, borde sutil, sin fondo gris de input).

CRÍTICO - Corrige el Error 404: Revisa en frontend/src/services/api.ts o donde se haga el fetch de clientes. La consola arroja 404 Not Found en rutas extrañas como /api/search/clients/14937/unpaid-invoice. Corrige la interpolación de URLs; asegúrate de que el endpoint de búsqueda de clientes y el de búsqueda de facturas estén llamando a los endpoints correctos definidos en tu backend.

FASE 3: Corrección del Error 404 de la Tasa BCV
La consola muestra un error masivo: Error fetching daily BCV rate: Request failed with status code 404 apuntando a /api/bcv/by-date?date=....

Revisa el endpoint en el backend (backend/src/routes/bcv.js o similar) y compáralo con el frontend (api.ts).

Arregla la ruta para que la aplicación vuelva a descargar la tasa exitosamente y deje de inundar la consola con errores.

FASE 4: Inyección de Lógica de Negocio (IVA) en el Modal y Formularios
En InvoicePaymentForm.tsx y AbonoForm.tsx, el PaymentEntryModal no está respetando la lógica de IVA.

Asegúrate de pasar el Monto Total CON IVA (calculado por el hook usePaymentCalculations) como la prop que el modal usa para saber cuánto falta por pagar.

El Modal no debe calcular si lleva IVA o no; debe recibir un prop explícito amountDue (que ya incluye el IVA si las reglas de negocio dictan que aplica) y totalBase. Muestra visualmente en el Modal un mensaje sutil si el monto incluye IVA, para que el cajero sepa por qué se le cobra esa cantidad.

Condiciones: Aplica las correcciones a los archivos api.ts, rutas de backend (si es necesario), App.tsx y el nuevo ClientSearch.tsx. Muestra los cambios para validación.