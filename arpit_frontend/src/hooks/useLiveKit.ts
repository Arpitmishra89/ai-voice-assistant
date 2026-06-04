import { useState, useCallback, useRef, useEffect } from "react";
import { Track, type Room } from "livekit-client";
import {
  createRoom,
  connectRoom,
  fetchToken,
  onDataChannel,
  onRoomDisconnect,
  onRoomReconnecting,
  onRoomReconnected,
  onTrackSubscribed,
  type DataChannelPayload,
} from "../services/livekitService";
import type { ConnectionStatus } from "../types/state";

export interface LiveKitState {
  room: Room | null;
  connectionStatus: ConnectionStatus;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setMicEnabled: (enabled: boolean) => Promise<void>;
  isMicEnabled: boolean;
  localAudioTrack: MediaStreamTrack | null;
}

export function useLiveKit(
  onDataEvent: (event: DataChannelPayload) => void,
): LiveKitState {
  const [room, setRoom] = useState<Room | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
  const roomRef = useRef<Room | null>(null);
  const cleanupFnsRef = useRef<Array<() => void>>([]);
  const onDataEventRef = useRef(onDataEvent);
  onDataEventRef.current = onDataEvent;
  const destroyedRef = useRef(false);

  const clearCleanups = useCallback(() => {
    for (const fn of cleanupFnsRef.current) {
      fn();
    }
    cleanupFnsRef.current = [];
  }, []);

  const refreshLocalTrack = useCallback((r: Room) => {
    try {
      const pub = r.localParticipant.getTrackPublication(Track.Source.Microphone);
      const track = pub?.track?.mediaStreamTrack ?? null;
      setLocalAudioTrack(track);
    } catch {
      setLocalAudioTrack(null);
    }
  }, []);

  const connect = useCallback(async () => {
    if (roomRef.current?.state === "connected") return;
    destroyedRef.current = false;

    setError(null);
    setConnectionStatus("connecting");

    try {
      const token = await fetchToken();
      const r = createRoom();
      roomRef.current = r;

      cleanupFnsRef.current.push(
        onDataChannel(r, (ev) => {
          onDataEventRef.current(ev);
        }),
      );

      cleanupFnsRef.current.push(
        onRoomDisconnect(r, () => {
          setConnectionStatus("disconnected");
          setIsMicEnabled(false);
          setLocalAudioTrack(null);
        }),
      );

      cleanupFnsRef.current.push(
        onRoomReconnecting(r, () => {
          setConnectionStatus("reconnecting");
        }),
      );

      cleanupFnsRef.current.push(
        onRoomReconnected(r, () => {
          setConnectionStatus("connected");
          refreshLocalTrack(r);
        }),
      );

      await connectRoom(r, token);

      cleanupFnsRef.current.push(
        onTrackSubscribed(r, (track) => {
  console.log("Track subscribed:", track.kind);

  if (track.kind === Track.Kind.Audio) {
    const element = track.attach();

    element.autoplay = true;
    document.body.appendChild(element);

    element.play()
      .then(() => console.log("Audio playing"))
      .catch(console.error);
  }
  }),
      );

      if (destroyedRef.current) {
        await r.disconnect();
        return;
      }

      setRoom(r);
      setConnectionStatus("connected");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect";
      setError(message);
      setConnectionStatus("disconnected");
      roomRef.current = null;
    }
  }, [refreshLocalTrack]);

  const disconnect = useCallback(async () => {
    clearCleanups();
    const r = roomRef.current;
    if (r) {
      if (r.state === "connected") {
        await r.disconnect();
      }
      roomRef.current = null;
    }
    setRoom(null);
    setConnectionStatus("disconnected");
    setIsMicEnabled(false);
    setLocalAudioTrack(null);
    setError(null);
  }, [clearCleanups]);

  const setMicEnabled = useCallback(async (enabled: boolean) => {
    const r = roomRef.current;
    if (!r) return;
    try {
      await r.localParticipant.setMicrophoneEnabled(enabled);
      setIsMicEnabled(enabled);
      if (enabled) {
        refreshLocalTrack(r);
      } else {
        setLocalAudioTrack(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle microphone";
      setError(message);
    }
  }, [refreshLocalTrack]);

  useEffect(() => {
    return () => {
      destroyedRef.current = true;
      clearCleanups();
      const r = roomRef.current;
      if (r && r.state === "connected") {
        r.disconnect().catch(() => {});
      }
      roomRef.current = null;
    };
  }, [clearCleanups]);

  return {
    room,
    connectionStatus,
    error,
    connect,
    disconnect,
    setMicEnabled,
    isMicEnabled,
    localAudioTrack,
  };
}

