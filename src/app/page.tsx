'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard'); // redireciona para o dashboard
    } catch (err: any) {
      setError('Email ou senha inválidos');
    }
  };
  
  console.log(auth);
  
  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <form
        onSubmit={handleLogin}
        className="bg-neutral-900 p-8 rounded-lg shadow-lg w-full max-w-sm space-y-4 text-white"
      >
        <h1 className="text-2xl font-bold text-orange-500 text-center">RL Fitness - Login</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full px-4 py-2 rounded bg-neutral-800 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Senha"
          className="w-full px-4 py-2 rounded bg-neutral-800 text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-2 px-4 rounded"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
