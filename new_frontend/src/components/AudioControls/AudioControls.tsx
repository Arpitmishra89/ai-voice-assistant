import { motion } from 'framer-motion';
import { Mic, MicOff, RotateCcw, Circle } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface AudioControlsProps {
  isListening: boolean;
  isMuted: boolean;
  sessionDuration: number;
  onToggleListening: () => void;
  onToggleMute: () => void;
  onReset: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function AudioControls({
  isListening,
  isMuted,
  sessionDuration,
  onToggleListening,
  onToggleMute,
  onReset,
}: AudioControlsProps) {
  const t = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="flex items-center justify-center gap-3"
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleMute}
        disabled={!isListening}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={isMuted ? t.unmuteMic : t.muteMic}
      >
        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleListening}
        className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${
          isListening
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-violet-600 text-white hover:bg-violet-500'
        }`}
        aria-label={isListening ? t.stop : t.start}
      >
        <Circle className={`h-4 w-4 ${isListening ? 'fill-red-400' : ''}`} />
        {isListening ? t.stop : t.start}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onReset}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
        aria-label={t.resetSession}
      >
        <RotateCcw className="h-4 w-4" />
      </motion.button>

      {isListening && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-mono text-zinc-400"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {formatDuration(sessionDuration)}
        </motion.div>
      )}
    </motion.div>
  );
}
