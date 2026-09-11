'use client';

import { useAccessLogs } from './hooks/useAccessLogs';
import { AccessLogCard } from './components/AccessLogCard';
import { useTheme } from '@/components/ThemeProvider';

export default function MonitoringPage() {
  const { logs, status } = useAccessLogs();
  const { darkMode } = useTheme();

  const statusLabel = status === 'connected'
    ? 'Sistema Ativo'
    : status === 'connecting'
      ? 'Conectando...'
      : 'Desconectado';
  const statusColorClasses = status === 'connected'
    ? { dot: 'bg-orange-500', ping: 'bg-orange-400', text: darkMode ? 'text-orange-400' : 'text-orange-700' }
    : status === 'connecting'
      ? { dot: 'bg-gray-400', ping: 'bg-gray-300', text: darkMode ? 'text-gray-400' : 'text-gray-500' }
      : { dot: 'bg-red-500', ping: 'bg-red-400', text: darkMode ? 'text-red-400' : 'text-red-700' };

  return (
    <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Cabeçalho alinhado com o padrão da Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tight">Monitor de entrada</h2>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Fluxo de acesso em tempo real da academia.
          </p>
        </div>

        {/* Badge indicativo de status — reflete o estado real da subscription Realtime */}
        <div className="flex items-center">
          <span className="relative flex h-3 w-3 mr-2">
            {status !== 'disconnected' && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusColorClasses.ping} opacity-75`}></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${statusColorClasses.dot}`}></span>
          </span>
          <span className={`text-xs font-medium ${statusColorClasses.text}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Lista de logs centralizada para melhor leitura */}
      <div className="max-w-2xl mx-auto space-y-3">
        {logs.length === 0 ? (
          <div className={`text-center py-20 italic opacity-40 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Aguardando leituras no leitor Wiegand...
          </div>
        ) : (
          logs.map((log) => (
            <AccessLogCard key={log.id} log={log} darkMode={darkMode} />
          ))
        )}
      </div>
    </main>
  );
}