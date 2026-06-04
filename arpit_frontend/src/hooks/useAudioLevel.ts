import { useState, useCallback, useRef } from 'react';

export function useAudioLevel() {
  const [audioLevel, setAudioLevel] = useState(0);
  const smoothedLevel = useRef(0);

  const updateLevel = useCallback((rawLevel: number) => {
    smoothedLevel.current = smoothedLevel.current * 0.7 + rawLevel * 0.3;
    setAudioLevel(smoothedLevel.current);
  }, []);

  const resetLevel = useCallback(() => {
    smoothedLevel.current = 0;
    setAudioLevel(0);
  }, []);

  return { audioLevel, updateLevel, resetLevel };
}
