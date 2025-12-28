'use client';
import { useAccessLogs } from './hooks/useAccessLogs';
import { AccessLogCard } from './components/AccessLogCard';
import { useState } from 'react';

export default function MonitoringPage() {
  const { logs } = useAccessLogs();
  const [darkMode, setDarkMode] = useState(true);

  return (
    <main className={`min-h-screen p-6 transition-colors duration-500 ${darkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Live Monitor</h1>
            <p className="text-xs opacity-50">Fluxo de acesso em tempo real - Academia</p>
          </div>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full border border-gray-700 hover:bg-gray-800 transition-colors"
          >
            {darkMode ? '🌙' : '☀️'}
          </button>
        </header>

        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-20 opacity-20 italic">Aguardando leituras no leitor Wiegand...</div>
          ) : (
            logs.map((log) => (
              <AccessLogCard key={log.id} log={log} darkMode={darkMode} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}