export interface ConvoyPeerTelemetry {
  peerId: string;
  roomCode: string;
  driverName: string;
  liveryId: string;
  routeId: string;
  x: number;
  z: number;
  heading: number;
  speedKmh: number;
  activeStopName: string;
  lastSeenMs: number;
}

export interface ConvoyChatMessage {
  id: string;
  roomCode: string;
  sender: string;
  text: string;
  timestamp: number;
}

type Packet =
  | { type: 'telemetry'; payload: ConvoyPeerTelemetry }
  | { type: 'leave'; peerId: string; roomCode: string }
  | { type: 'chat'; payload: ConvoyChatMessage };

const CHANNEL_NAME = 'tn_bus_convoy_sync_v1';
const STORAGE_PREFIX = 'tn_convoy_peer_';

function generateId(len = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export class ConvoySyncService {
  public readonly selfPeerId: string;
  private channel: BroadcastChannel | null = null;
  private roomCode: string | null = null;
  private peers = new Map<string, ConvoyPeerTelemetry>();
  private messages: ConvoyChatMessage[] = [];
  private listeners = new Set<() => void>();
  private pruneIntervalId: number | null = null;

  constructor() {
    this.selfPeerId = `DRV-${generateId(5)}`;
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        try {
          this.channel = new BroadcastChannel(CHANNEL_NAME);
          this.channel.onmessage = (ev: MessageEvent<Packet>) => {
            this.handlePacket(ev.data);
          };
        } catch {
          this.channel = null;
        }
      }
      window.addEventListener('storage', this.handleStorageEvent);
      this.pruneIntervalId = window.setInterval(() => this.pruneStalePeers(), 2000);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getRoomCode(): string | null {
    return this.roomCode;
  }

  public getPeers(): ConvoyPeerTelemetry[] {
    if (!this.roomCode) return [];
    const now = Date.now();
    const list: ConvoyPeerTelemetry[] = [];
    this.peers.forEach((p) => {
      if (p.roomCode === this.roomCode && now - p.lastSeenMs < 7000) {
        list.push(p);
      }
    });
    return list;
  }

  public getMessages(): ConvoyChatMessage[] {
    if (!this.roomCode) return [];
    return this.messages.filter((m) => m.roomCode === this.roomCode).slice(-25);
  }

  public hostRoom(customCode?: string): string {
    const code = (customCode || `TN-${generateId(4)}`).toUpperCase().trim();
    this.joinRoom(code);
    return code;
  }

  public joinRoom(code: string) {
    const normalized = code.toUpperCase().trim();
    if (!normalized) return;
    if (this.roomCode && this.roomCode !== normalized) {
      this.leaveRoom();
    }
    this.roomCode = normalized;
    this.loadExistingFromStorage(normalized);
    this.notify();
  }

  public leaveRoom() {
    if (!this.roomCode) return;
    const oldRoom = this.roomCode;
    this.broadcast({ type: 'leave', peerId: this.selfPeerId, roomCode: oldRoom });
    try {
      window.localStorage?.removeItem(`${STORAGE_PREFIX}${oldRoom}_${this.selfPeerId}`);
    } catch {
      // Ignore storage error
    }
    this.roomCode = null;
    this.peers.clear();
    this.messages = [];
    this.notify();
  }

  public publishTelemetry(data: Omit<ConvoyPeerTelemetry, 'peerId' | 'roomCode' | 'lastSeenMs'>) {
    if (!this.roomCode) return;
    const payload: ConvoyPeerTelemetry = {
      ...data,
      peerId: this.selfPeerId,
      roomCode: this.roomCode,
      lastSeenMs: Date.now(),
    };
    this.broadcast({ type: 'telemetry', payload });
    try {
      window.localStorage?.setItem(
        `${STORAGE_PREFIX}${this.roomCode}_${this.selfPeerId}`,
        JSON.stringify(payload)
      );
    } catch {
      // Ignore storage error
    }
  }

  public sendChat(sender: string, text: string) {
    if (!this.roomCode || !text.trim()) return;
    const payload: ConvoyChatMessage = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      roomCode: this.roomCode,
      sender,
      text: text.trim().slice(0, 120),
      timestamp: Date.now(),
    };
    this.messages.push(payload);
    this.broadcast({ type: 'chat', payload });
    this.notify();
  }

  private broadcast(packet: Packet) {
    try {
      this.channel?.postMessage(packet);
    } catch {
      // Ignore channel error
    }
  }

  private handleStorageEvent = (e: StorageEvent) => {
    if (!e.key || !e.key.startsWith(STORAGE_PREFIX) || !this.roomCode) return;
    if (!e.key.startsWith(`${STORAGE_PREFIX}${this.roomCode}_`)) return;
    if (!e.newValue) {
      const peerId = e.key.replace(`${STORAGE_PREFIX}${this.roomCode}_`, '');
      this.peers.delete(peerId);
      this.notify();
      return;
    }
    try {
      const parsed = JSON.parse(e.newValue) as ConvoyPeerTelemetry;
      if (parsed.peerId !== this.selfPeerId) {
        this.peers.set(parsed.peerId, parsed);
        this.notify();
      }
    } catch {
      // Ignore malformed storage entry
    }
  };

  private loadExistingFromStorage(roomCode: string) {
    try {
      if (!window.localStorage) return;
      const prefix = `${STORAGE_PREFIX}${roomCode}_`;
      const now = Date.now();
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const raw = window.localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw) as ConvoyPeerTelemetry;
          if (parsed.peerId !== this.selfPeerId && now - parsed.lastSeenMs < 7000) {
            this.peers.set(parsed.peerId, parsed);
          }
        }
      }
    } catch {
      // Ignore storage scan error
    }
  }

  private handlePacket(packet: Packet) {
    if (!packet || !this.roomCode) return;
    if (packet.type === 'telemetry') {
      const p = packet.payload;
      if (p.peerId === this.selfPeerId || p.roomCode !== this.roomCode) return;
      this.peers.set(p.peerId, p);
      this.notify();
    } else if (packet.type === 'leave') {
      if (packet.roomCode === this.roomCode) {
        this.peers.delete(packet.peerId);
        this.notify();
      }
    } else if (packet.type === 'chat') {
      if (packet.payload.roomCode === this.roomCode) {
        this.messages.push(packet.payload);
        if (this.messages.length > 50) this.messages.shift();
        this.notify();
      }
    }
  }

  private pruneStalePeers() {
    if (!this.roomCode) return;
    const now = Date.now();
    let changed = false;
    this.peers.forEach((p, id) => {
      if (now - p.lastSeenMs >= 7000) {
        this.peers.delete(id);
        changed = true;
      }
    });
    if (changed) this.notify();
  }

  public dispose() {
    this.leaveRoom();
    if (this.pruneIntervalId) clearInterval(this.pruneIntervalId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
    this.channel?.close();
  }
}

export const convoySync = new ConvoySyncService();
