import { useState } from 'react';
import { useAppStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Container } from '@mui/material';

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
        <Container component="main" maxWidth="xs">
            <Paper sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">Iniciar Sesión</Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                    <TextField margin="normal" required fullWidth label="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
                    <TextField margin="normal" required fullWidth label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                        Entrar
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};
