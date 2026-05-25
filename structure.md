# POS-CUADRE — Estructura del proyecto

Resumen
- POS-CUADRE es una aplicación full-stack para gestionar cobros, sesiones de caja y conciliación.
- Backend: Node.js + MySQL (controladores, rutas, lógica de sesión/transacciones).
- Frontend: React + Vite + MUI (componentes de UI, formularios de pago, modal de cierre y resumen).

Árbol de alto nivel (resumen)
- c:\POS CUADRE
  - backend
    - src
      - controllers
        - transactionController.js    # lógica de transacciones, resumen de cierre, CRUD
        - sessionController.js        # inicio/cierre/reapertura de sesiones
      - routes
        - transactions.js
        - sessions.js
      - db
        - database.js                 # pool de MySQL
      - server.js                     # punto de entrada servidor
      - middlewares
        - auth.js                     # protect / authorize
  - frontend
    - frontend
      - src
        - components
          - InvoicePaymentForm.tsx    # pago de facturas y cálculos de múltiples métodos
          - ManualEntryForm.tsx       # registro manual de transacción (mismo cálculo de pagos)
          - EditTransactionModal.tsx  # modal para editar fecha de transacción
          - TransactionsTable.tsx     # tabla con botón editar/eliminar
          - TransactionsByMethodModal.tsx  # modal para ver transacciones por método
          - DifferencesModal.tsx      # modal para diferencias detectadas
          - CloseSessionModal.tsx     # modal de cierre de caja (muestra sistemas esperados)
          - SummaryView.tsx           # vista resumen del cierre (totales, enlaces)
        - services
          - api.ts                    # cliente axios / endpoints (addTransaction, getClosingSummary, update...)
        - store.ts                    # Zustand store (acciones: fetchData, addTransaction, updateTransactionDate, open/close modals)
        - App.tsx / main.tsx
      - package.json
  - README.md / (otros)

Puntos clave (backend)
- transactionController.getClosingSummary:
  - Obtiene transacciones y pagos del día.
  - Suma totales por método (solo una vez) y calcula diferencias por transacción.
  - Considera abonos aplicados para ajustar monto esperado.
  - Conversión VES→USD usando BCV y regla IVA (aplica IVA a pagos en VES cuando corresponde).
- transactionController.updateTransaction (PATCH /transactions/:id):
  - Actualiza createdAt de la transacción y ahora también actualiza createdAt en payments asociados para mantener consistencia.
- transactionController.deleteTransaction:
  - Antes de eliminar verifica el estado de la sesión asociada; si la sesión está cerrada retorna 403.
- sessionController.reopenSession:
  - Permite reabrir sesión cerrada (solo propietario o admin).

Puntos clave (frontend)
- Cálculos de pagos:
  - Helpers `parseAmount` y `computePaidAndTotals` se usan para convertir montos, manejar comas/puntos y convertir VES→USD usando bcvRate.
  - Regla IVA: si los pagos en USD cubren < 50% del monto base, se aplica IVA (16%) para determinar total esperado; VES/POS se ajustan en consecuencia.
- EditTransactionModal:
  - Permite editar la fecha; envía PATCH con newDate; backend actualiza transacción y pagos.
- TransactionsByMethodModal:
  - Muestra transacciones filtradas por método; usa la fecha seleccionada del store si no recibe prop `date`.
  - Añadido botón eliminar que muestra mensaje del backend (403 si sesión cerrada).
- CloseSessionModal:
  - Muestra los montos esperados por el sistema (Punto Banesco, Mi Banco, Mikrowisp) y permite conteo manual por billetes.
- SummaryView:
  - Muestra totales por método y categoría; enlaces a modales para transacciones y diferencias.

Comandos comunes
- Backend:
  - Instalar: npm install
  - Ejecutar en desarrollo: npm run dev  (nodemon server.js)
- Frontend:
  - Instalar: npm install
  - Ejecutar: npm run dev (Vite)

Variables de entorno importantes
- DEFAULT_BCV_RATE: tasa por defecto usada si payments.bcvRate no está presente.
- IVA_RATE: 0.16 (valor por defecto si no está definido).
- Base de datos: configuración en backend/src/db/database.js (host, user, password, database).

Notas de integración y debugging
- Evitar doble conteo: sumar totales por método solo a partir de todos los pagos del día (transacciones + abonos) y calcular diferencias por transacción por separado.
- Al cambiar fecha en una transacción, actualizar también createdAt en payments para mantener consistencia temporal.
- Acciones que modifican datos de transacción (DELETE/PATCH) están protegidas si la sesión está cerrada; hay que reabrir sesión para permitir modificaciones.
- Mensajes de backend (como 403 con explicación) se muestran via toast en frontend; en los modales se maneja y muestra al usuario.

Sugerencias y próximos pasos
- Extraer helpers de pagos (parseAmount, computePaidAndTotals) a `frontend/src/utils/payments.ts` y reutilizar en todos los formularios.
- Añadir tests unitarios para:
  - Cálculos de conversión (VES → USD con/without IVA).
  - getClosingSummary: casos con abonos aplicados y pagos mixtos.
- Añadir logging temporal en backend para verificar cálculos en cierres problemáticos (después remover).
- Revisar integridad de datos históricos (transacciones con sessionId NULL) y decidir migración si es necesario.

Contacto
- Este documento es un resumen operativo. Para cambios de comportamiento (reglas IVA, tolerancias), coordinar ajuste conjunto entre frontend y backend.

