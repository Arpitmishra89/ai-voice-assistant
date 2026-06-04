import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface WaveformProps {
  isActive: boolean;
  audioLevel: number;
}

const RING_COUNT = 4;

export function Waveform({ isActive, audioLevel }: WaveformProps) {
  const rings = useMemo(
    () =>
      Array.from({ length: RING_COUNT }, (_, i) => ({
        id: i,
        baseScale: 1 + (i + 1) * 0.3,
        baseOpacity: 0.2 - i * 0.04,
        delay: i * 0.15,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      {rings.map((ring) => {
        const scale = isActive ? ring.baseScale + audioLevel * 0.5 : ring.baseScale;
        const opacity = isActive ? ring.baseOpacity + audioLevel * 0.3 : ring.baseOpacity;

        return (
          <motion.div
            key={ring.id}
            className="absolute rounded-full border"
            style={{
              width: 120,
              height: 120,
              borderColor: `rgba(139, 92, 246, ${opacity})`,
            }}
            animate={{
              scale: [scale, scale + 0.08, scale],
              opacity: [opacity, opacity + 0.1, opacity],
            }}
            transition={{
              duration: 2 + ring.id * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: ring.delay,
            }}
          />
        );
      })}
    </div>
  );
}
