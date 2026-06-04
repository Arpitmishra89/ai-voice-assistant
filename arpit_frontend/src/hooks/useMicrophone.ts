import { useState, useCallback, useRef, useEffect } from "react";

export interface AudioAnalyzer {
  audioLevel: number;
  isActive: boolean;
  start: () => Promise<void>;
  stop: () => void;
  cleanup: () => void;
}

export function useMicrophone(
  externalTrack?: MediaStreamTrack | null,
): AudioAnalyzer {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number>(0);
  const runningRef = useRef(false);
  const smoothedRef = useRef(0);

  const analyze = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || !runningRef.current) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const val = (data[i] as number) - 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / data.length);
    const normalized = Math.min(rms / 128, 1);
    smoothedRef.current = smoothedRef.current * 0.7 + normalized * 0.3;
    setAudioLevel(smoothedRef.current);

    frameRef.current = requestAnimationFrame(analyze);
  }, []);

  const start = useCallback(async () => {
    if (runningRef.current) return;

    let stream: MediaStream;

    if (externalTrack) {
      stream = new MediaStream([externalTrack]);
    } else {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    }
    streamRef.current = stream;

    const ctx = new AudioContext();
    contextRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyserRef.current = analyser;

    runningRef.current = true;
    setIsActive(true);
    analyze();
  }, [analyze, externalTrack]);

  const stop = useCallback(() => {
    runningRef.current = false;
    setIsActive(false);
    smoothedRef.current = 0;
    setAudioLevel(0);

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
  }, []);

  const cleanup = useCallback(() => {
    stop();

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (contextRef.current && contextRef.current.state !== "closed") {
      contextRef.current.close().catch(() => {});
      contextRef.current = null;
    }

    analyserRef.current = null;
  }, [stop]);

  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return { audioLevel, isActive, start, stop, cleanup };
}
