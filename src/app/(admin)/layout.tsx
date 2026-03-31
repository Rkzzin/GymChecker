'use client';

import React from 'react';
import { useAuthGuard } from '../hooks/useAuth';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import { AppHeader } from '@/components/AppHeader';
import { Toaster } from 'sonner';

// Componente interno para acessar o contexto de tema
function AdminContent({ children }: { children: React.ReactNode }) {
  const { darkMode } = useTheme();
  
  const bgClass = darkMode ? 'bg-black text-gray-100' : 'bg-gray-50 text-gray-900';
  const headerClass = darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200';

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
      <AppHeader />
      
      {/* O conteúdo da página entra aqui */}
      {children}
      <Toaster position="top-right" richColors />

      <footer className={`border-t py-8 mt-12 ${headerClass}`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className={`text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            © 2025 RLFitness Evolution • Painel Administrativo
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // A proteção de rota acontece aqui, uma vez para todas as páginas filhas
  useAuthGuard();

  return (
    <ThemeProvider>
      <AdminContent>
        {children}
      </AdminContent>
    </ThemeProvider>
  );
}