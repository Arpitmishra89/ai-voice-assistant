import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { Waveform } from '../Waveform/Waveform';

interface MicButtonProps {
  isListening: boolean;
  isMuted: boolean;
  audioLevel: number;
  onClick: () => void;
}

export function MicButton({ isListening, isMuted, audioLevel, onClick }: MicButtonProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  const glowIntensity = isListening ? 0.6 + audioLevel * 0.4 : 0.15;
  const scale = isListening ? 1 + audioLevel * 0.04 : 1;

  return (
    <div className="relative flex items-center justify-center">
      <Waveform isActive={isListening} audioLevel={audioLevel} />

      <motion.button
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
        aria-pressed={isListening}
        className="relative z-10 flex h-20 w-20 cursor-pointer items-center justify-center rounded-full outline-none sm:h-24 sm:w-24"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(139, 92, 246, ${glowIntensity * 0.3}), transparent 70%)`,
        }}
        animate={{
          scale,
          boxShadow: isListening
            ? [
                `0 0 ${20 + audioLevel * 30}px rgba(139, 92, 246, ${glowIntensity})`,
                `0 0 ${30 + audioLevel * 40}px rgba(139, 92, 246, ${glowIntensity * 0.8})`,
                `0 0 ${20 + audioLevel * 30}px rgba(139, 92, 246, ${glowIntensity})`,
              ]
            : '0 0 20px rgba(139, 92, 246, 0.15)',
        }}
        transition={{
          scale: { duration: 0.2, ease: 'easeOut' },
          boxShadow: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
      >
        <motion.div
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}
          animate={
            isListening
              ? {
                  borderColor: [
                    'rgba(139, 92, 246, 0.4)',
                    'rgba(139, 92, 246, 0.6)',
                    'rgba(139, 92, 246, 0.4)',
                  ],
                }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600"
          animate={
            isListening
              ? {
                  background: [
                    'linear-gradient(135deg, rgb(124, 58, 237), rgb(192, 38, 211))',
                    'linear-gradient(135deg, rgb(139, 92, 246), rgb(217, 70, 239))',
                    'linear-gradient(135deg, rgb(124, 58, 237), rgb(192, 38, 211))',
                  ],
                }
              : {}
          }
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="relative z-10"
          animate={{ rotate: isListening ? [0, -10, 10, -10, 0] : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {isMuted ? (
            <MicOff className="h-8 w-8 text-white/60 sm:h-9 sm:w-9" />
          ) : (
            <Mic className="h-8 w-8 text-white sm:h-9 sm:w-9" />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
}
