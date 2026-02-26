import * as React from 'react';

import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import { useRouter } from 'next/router';

import { createSupabaseBrowserClient } from '~/common/supabase/client';


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    void router.push('/');
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.body',
      }}
    >
      <Sheet
        variant='outlined'
        sx={{ width: 360, p: 4, borderRadius: 'md', boxShadow: 'lg' }}
      >
        <Typography level='h4' sx={{ mb: 1 }}>teamAI</Typography>
        <Typography level='body-sm' sx={{ mb: 3 }}>
          Entre com sua conta para continuar
        </Typography>

        <form onSubmit={handleLogin}>
          <FormControl sx={{ mb: 2 }}>
            <FormLabel>Email</FormLabel>
            <Input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </FormControl>

          <FormControl sx={{ mb: 3 }}>
            <FormLabel>Senha</FormLabel>
            <Input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormControl>

          {error && (
            <Typography level='body-sm' color='danger' sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Button type='submit' fullWidth loading={loading}>
            Entrar
          </Button>
        </form>
      </Sheet>
    </Box>
  );
}
