import { useState } from 'react';
import { useAppStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';

export const LoginPage = () => {
    const login = useAppStore((state) => state.login);
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login({ username, password });
            navigate('/'); // Redirige al dashboard después del login
        } catch (error) {
            console.error('Fallo el login');
        }
    };

    return (
        <Box 
            sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: '100vh',  // FASE 2: Centrado vertical completo
                flexDirection: 'column',
                gap: 3,
                backgroundColor: '#0f172a',  // FASE 2: Fondo consistente con tema
                px: 2  // Padding horizontal para móviles
            }}
        >
            <Paper 
                elevation={0}
                sx={{ 
                    p: 4, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    backgroundColor: '#1e293b',  // FASE 2: Tema oscuro
                    borderRadius: 1,
                    border: '1px solid rgba(255,255,255,0.1)',
                    maxWidth: 400,
                    width: '100%'
                }}
            >
                <Typography 
                    component="h1" 
                    variant="h5" 
                    sx={{ 
                        color: '#f1f5f9',  // FASE 2: Texto claro
                        mb: 2,
                        fontWeight: 600
                    }}
                >
                    Iniciar Sesión
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                    <TextField 
                        margin="normal" 
                        required 
                        fullWidth 
                        label="Usuario" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        autoFocus 
                        sx={{
                            '& .MuiInputBase-root': {
                                backgroundColor: '#0f172a',
                                color: '#fff'
                            },
                            '& .MuiInputLabel-root': {
                                color: '#94a3b8'
                            }
                        }}
                    />
                    <TextField 
                        margin="normal" 
                        required 
                        fullWidth 
                        label="Contraseña" 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        sx={{
                            '& .MuiInputBase-root': {
                                backgroundColor: '#0f172a',
                                color: '#fff'
                            },
                            '& .MuiInputLabel-root': {
                                color: '#94a3b8'
                            }
                        }}
                    />
                    <Button 
                        type="submit" 
                        fullWidth 
                        variant="contained" 
                        sx={{ 
                            mt: 3, 
                            mb: 2,
                            backgroundColor: '#60a5fa',
                            '&:hover': {
                                backgroundColor: '#3b82f6'
                            },
                            py: 1.5,
                            fontWeight: 600
                        }}
                    >
                        ENTRAR
                    </Button>
                </Box>
            </Paper>

            {/* FASE 2: Footer con información de versión */}
            <Box sx={{ textAlign: 'center' }}>
                <Typography 
                    variant="body2" 
                    sx={{ 
                        color: '#64748b',  // FASE 2: Texto secundario sutil
                        fontWeight: 400
                    }}
                >
                    POS Cuadre Bimonetario - v1.5.0
                </Typography>
            </Box>
        </Box>
    );
};
