import React from 'react';

// Interfaz para las props que el drawer recibirá en el futuro
interface TransactionDrawerProps {
    open: boolean;
    onClose: () => void;
    transaction: any;
    onSuccess?: () => void;
}

// El componente funcional. Acepta las props pero no las usa (por eso el guion bajo).
export const TransactionDrawer: React.FC<TransactionDrawerProps> = ({ 
    open: _open, 
    onClose: _onClose, 
    transaction: _transaction 
}) => {
    
    // TODO: Implementar la lógica del drawer en el futuro.
    
    // Devolvemos null para que no renderice nada por ahora.
    return null; 
};
