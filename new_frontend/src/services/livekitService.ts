import { Room, RoomEvent, type DataPacket_Kind, type RemoteTrackPublication, type RemoteTrack } from "livekit-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

export interface LiveKitConnection {
  room: Room;
  token: string;
}

export interface DataChannelPayload {
  type: string;
  content?: string;
  state?: string;
  is_final?: boolean;
}

export async function fetchToken(): Promise<string> {
  if (!BACKEND_URL) {
    throw new Error("VITE_BACKEND_URL is not configured");
  }

  const response = await fetch(`${BACKEND_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Token fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const token: string | undefined = data.token;
  if (!token) {
    throw new Error("Token response missing 'token' field");
  }

  return token;
}

export function createRoom(): Room {
  return new Room({
    adaptiveStream: true,
    dynacast: true,
    stopLocalTrackOnUnpublish: true,
  });
}

export function getRoomConnectOptions() {
  return {
    autoSubscribe: true,
    maxRetries: 5,
  } as const;
}

export async function connectRoom(
  room: Room,
  token: string,
  url?: string,
): Promise<void> {
  const targetUrl = url || LIVEKIT_URL;
  if (!targetUrl) {
    throw new Error("VITE_LIVEKIT_URL is not configured");
  }

  await room.connect(targetUrl, token, getRoomConnectOptions());

  try {
    await room.startAudio();
  } catch (e) {
    console.warn("startAudio (initial) failed, will retry on TrackSubscribed:", e);
  }
}

export function parseDataChannelPayload(payload: Uint8Array): DataChannelPayload {
  return JSON.parse(new TextDecoder().decode(payload)) as DataChannelPayload;
}

export function onDataChannel(
  room: Room,
  callback: (event: DataChannelPayload) => void,
): () => void {
  const handler = (
    payload: Uint8Array,
    _participant?: unknown,
    _kind?: DataPacket_Kind,
    _topic?: string,
  ) => {
    try {
      callback(parseDataChannelPayload(payload));
    } catch (err) {
      console.error("Failed to parse data channel event:", err);
    }
  };

  room.on(RoomEvent.DataReceived, handler);
  return () => { room.off(RoomEvent.DataReceived, handler); };
}

export function onRoomDisconnect(
  room: Room,
  callback: () => void,
): () => void {
  const handler = () => callback();
  room.on(RoomEvent.Disconnected, handler);
  return () => { room.off(RoomEvent.Disconnected, handler); };
}

export function onRoomReconnecting(
  room: Room,
  callback: () => void,
): () => void {
  const handler = () => callback();
  room.on(RoomEvent.Reconnecting, handler);
  return () => { room.off(RoomEvent.Reconnecting, handler); };
}

export function onRoomReconnected(
  room: Room,
  callback: () => void,
): () => void {
  const handler = () => callback();
  room.on(RoomEvent.Reconnected, handler);
  return () => { room.off(RoomEvent.Reconnected, handler); };
}

export function onTrackSubscribed(
  room: Room,
  callback: (track: RemoteTrack) => void,
): () => void {
  const handler = (
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    _participant: unknown,
  ) => {
    callback(track);
  };

  room.on(RoomEvent.TrackSubscribed, handler);

  return () => {
    room.off(RoomEvent.TrackSubscribed, handler);
  };
}

export function onTrackUnsubscribed(
  room: Room,
  callback: (track: MediaStreamTrack) => void,
): () => void {
  const handler = (
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    _participant: unknown,
  ) => {
    callback(track.mediaStreamTrack);
  };
  room.on(RoomEvent.TrackUnsubscribed, handler);
  return () => { room.off(RoomEvent.TrackUnsubscribed, handler); };
}

export function onSignalConnected(
  room: Room,
  callback: () => void,
): () => void {
  const handler = () => callback();
  room.on(RoomEvent.SignalConnected, handler);
  return () => { room.off(RoomEvent.SignalConnected, handler); };
}
