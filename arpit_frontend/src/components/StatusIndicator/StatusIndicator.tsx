import { motion } from 'framer-motion';
import type { ConnectionStatus, ListeningStatus } from '../../types/voice';

interface StatusIndicatorProps {
  connectionStatus: ConnectionStatus;
  listeningStatus: ListeningStatus;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  connected: { color: 'bg-emerald-500', label: 'Connected' },
  connecting: { color: 'bg-amber-500', label: 'Connecting' },
  disconnected: { color: 'bg-red-500', label: 'Disconnected' },
  reconnecting: { color: 'bg-amber-500', label: 'Reconnecting' },
};

const listeningConfig = {
  idle: { color: 'bg-zinc-500', label: 'Idle' },
  listening: { color: 'bg-emerald-500', label: 'Listening' },
  processing: { color: 'bg-amber-500', label: 'Processing' },
};

export function StatusIndicator({ connectionStatus, listeningStatus }: StatusIndicatorProps) {
  const conn = statusConfig[connectionStatus] ?? { color: 'bg-zinc-500', label: 'Unknown' };
  const listen = listeningConfig[listeningStatus] ?? { color: 'bg-zinc-500', label: 'Unknown' };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <motion.span
          className={`inline-block h-2 w-2 rounded-full ${conn.color}`}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="text-xs text-zinc-400">{conn.label}</span>
      </div>
      <span className="text-zinc-600">|</span>
      <motion.span
        key={listen.label}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-zinc-300"
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${listen.color}`} />
        {listen.label}
      </motion.span>
    </div>
  );
}
