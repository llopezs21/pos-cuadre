import pool from '../db/database.js';

// Busca clientes por nombre, id_number (cédula) o mks_id
export const searchClients = async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.json([]);
  }
  try {
    const searchQuery = `
      SELECT mks_id, name, id_number FROM external_clients 
      WHERE name LIKE ? OR id_number LIKE ? OR mks_id LIKE ?
      LIMIT 10
    `;
    const searchTerm = `%${query}%`;
    const [clients] = await pool.query(searchQuery, [searchTerm, searchTerm, searchTerm]);
    res.json(clients);
  } catch (error) {
    console.error('searchClients error', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Obtiene las facturas no pagadas O VENCIDAS de un cliente específico
export const getUnpaidInvoices = async (req, res) => {
  const { clientMksId } = req.params;
  try {
    // Buscar facturas con estado NO PAGADO o VENCIDO
    const [invoices] = await pool.query(
      "SELECT * FROM external_invoices WHERE client_mks_id = ? AND status IN ('NO PAGADO', 'VENCIDO')",
      [clientMksId]
    );

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ message: 'El cliente no tiene facturas pendientes de pago o vencidas.' });
    }

    res.json(invoices);
  } catch (error) {
    console.error('getUnpaidInvoices error', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};
