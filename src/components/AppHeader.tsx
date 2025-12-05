'use client';

import Link from 'next/link';
import { useTheme } from './ThemeProvider';
import { usePathname } from 'next/navigation';

export function AppHeader() {
  const { darkMode, toggleDarkMode } = useTheme();
  const pathname = usePathname();

  // Classes dinâmicas baseadas no tema
  const headerClass = darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200';
  const linkBase = "font-medium text-sm transition-colors";
  const linkActive = "text-orange-500 font-semibold";
  const linkInactive = darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900';

  const getLinkClass = (path: string) => 
    `${linkBase} ${pathname === path ? linkActive : linkInactive}`;

  return (
    <header className={`sticky top-0 z-30 border-b ${headerClass} backdrop-blur-md bg-opacity-95`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        <div className="flex items-center gap-2 select-none">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-orange-500">RLFITNESS</span>
            <span className={`${darkMode ? 'text-white' : 'text-gray-900'} mx-1`}>|</span>
            <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>EVOLUTION</span>
          </h1>
        </div>

        <nav className="hidden md:flex space-x-8">
          <Link href="/dashboard" className={getLinkClass('/dashboard')}>Dashboard</Link>
          <Link href="/members" className={getLinkClass('/members')}>Membros</Link>
          <Link href="/memberships" className={getLinkClass('/memberships')}>Matrículas</Link>
          <Link href="/plans" className={getLinkClass('/plans')}>Planos</Link>
          <Link href="/payments" className={getLinkClass('/payments')}>Financeiro</Link>
        </nav>

        <button
          onClick={toggleDarkMode}
          className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {darkMode ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}