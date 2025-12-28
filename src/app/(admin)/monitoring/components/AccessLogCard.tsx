import { AccessLog } from '../types';
import { formatTime } from '../utils';

interface Props {
  log: AccessLog;
  darkMode: boolean;
}

export function AccessLogCard({ log, darkMode }: Props) {
  const statusColor = log.allowed ? 'border-green-500 bg-green-50/30' : 'border-red-500 bg-red-50/30';
  const textTitle = darkMode ? 'text-white' : 'text-gray-800';

  return (
    <div className={`p-4 rounded-xl border-l-4 shadow-sm flex items-center justify-between animate-in slide-in-from-right-5 duration-300 ${statusColor} ${darkMode ? 'bg-opacity-10' : ''}`}>
      <div className="flex flex-col">
        <span className="text-[10px] font-mono opacity-60 uppercase">
          {formatTime(log.created_at)}
        </span>
        <h3 className={`text-lg font-bold ${textTitle}`}>
          {log.customer_name}
        </h3>
        <span className={`text-xs font-medium ${log.allowed ? 'text-green-500' : 'text-red-500'}`}>
          {log.reason}
        </span>
      </div>
      <div className="text-2xl">
        {log.allowed ? '🔓' : '🔒'}
      </div>
    </div>
  );
}