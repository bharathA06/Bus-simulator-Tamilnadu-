import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bus,
  LogOut,
  MessageSquare,
  Play,
  Plus,
  Radio,
  Send,
  Users,
} from 'lucide-react';
import {
  BUS_LIVERIES,
  ROUTES,
  RouteDefinition,
  TimeOfDayId,
  WeatherId,
} from '../game/constants';
import { PlayerProgress } from '../game/gameStore';
import { ConvoyChatMessage, ConvoyPeerTelemetry, convoySync } from '../game/convoySync';

interface MultiplayerScreenProps {
  progress: PlayerProgress;
  onBack: () => void;
  onLaunchConvoy: (
    route: RouteDefinition,
    timeOfDay: TimeOfDayId,
    weather: WeatherId
  ) => void;
}

export function MultiplayerScreen({
  progress,
  onBack,
  onLaunchConvoy,
}: MultiplayerScreenProps) {
  const [roomCode, setRoomCode] = useState<string | null>(() => convoySync.getRoomCode());
  const [joinInput, setJoinInput] = useState('');
  const [peers, setPeers] = useState<ConvoyPeerTelemetry[]>(() => convoySync.getPeers());
  const [messages, setMessages] = useState<ConvoyChatMessage[]>(() => convoySync.getMessages());
  const [chatText, setChatText] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState(ROUTES[0].id);

  const activeBus =
    BUS_LIVERIES.find((b) => b.id === progress.selectedBusId) || BUS_LIVERIES[0];
  const selectedRoute = ROUTES.find((r) => r.id === selectedRouteId) || ROUTES[0];

  useEffect(() => {
    const unsub = convoySync.subscribe(() => {
      setRoomCode(convoySync.getRoomCode());
      setPeers(convoySync.getPeers());
      setMessages(convoySync.getMessages());
    });
    return unsub;
  }, []);

  // Heartbeat while sitting in lobby so peer browser tabs see us
  useEffect(() => {
    if (!roomCode) return;
    const publish = () => {
      convoySync.publishTelemetry({
        driverName: progress.driverName,
        liveryId: activeBus.id,
        routeId: selectedRoute.id,
        x: -234.8,
        z: -165,
        heading: 0,
        speedKmh: 0,
        activeStopName: 'Lobby Staging',
      });
    };
    publish();
    const id = window.setInterval(publish, 1500);
    return () => window.clearInterval(id);
  }, [roomCode, progress.driverName, activeBus.id, selectedRoute.id]);

  const handleHost = () => {
    const code = convoySync.hostRoom();
    setRoomCode(code);
  };

  const handleJoin = () => {
    const cleaned = joinInput.trim().toUpperCase();
    if (!cleaned) return;
    convoySync.joinRoom(cleaned);
    setJoinInput('');
  };

  const handleSendChat = () => {
    if (!chatText.trim()) return;
    convoySync.sendChat(progress.driverName, chatText);
    setChatText('');
  };

  return (
    <div className="fixed inset-0 z-30 bg-neutral-950/96 text-white flex flex-col overflow-hidden select-none">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-neutral-900">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Main Menu
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              Convoy Multiplayer Lobby
            </h1>
            <p className="text-[11px] text-neutral-400">
              Live browser-tab convoy sync — open another window with the same room code to drive side-by-side
            </p>
          </div>
        </div>

        {roomCode && (
          <div className="flex items-center gap-2">
            <div className="px-3.5 py-2 rounded-xl bg-sky-500/15 border border-sky-400/40 font-mono text-xs font-black text-sky-300">
              ROOM: {roomCode}
            </div>
            <button
              onClick={() => convoySync.leaveRoom()}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/35 border border-red-500/40 text-red-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Leave
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto ets-scroll p-4 sm:p-6 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Room Connection & Convoy Route */}
        <div className="lg:col-span-5 space-y-4">
          {!roomCode ? (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400">
                Create or Join Convoy
              </h2>
              <button
                onClick={handleHost}
                className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Host New Tamil Nadu Convoy Room
              </button>

              <div className="pt-3 border-t border-white/10 space-y-2">
                <label className="block text-xs font-bold text-neutral-300">
                  Join Existing Room Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                    placeholder="e.g. TN-4821"
                    className="flex-1 min-h-[44px] px-3 rounded-xl bg-neutral-950 border border-white/15 font-mono text-xs text-white uppercase focus:outline-none focus:border-sky-400"
                  />
                  <button
                    onClick={handleJoin}
                    className="min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-black cursor-pointer"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Radio className="w-4 h-4" /> Convoy Sync Active
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  {peers.length + 1} Driver{peers.length > 0 ? 's' : ''}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Select Convoy Route
                </label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-neutral-950 border border-white/15 text-xs text-white"
                >
                  {ROUTES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.titleEn}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() =>
                  onLaunchConvoy(
                    selectedRoute,
                    progress.settings.preferredTimeOfDay,
                    progress.settings.preferredWeather
                  )
                }
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Launch Convoy Drive
              </button>
            </div>
          )}

          {/* Active Drivers */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Drivers in Convoy
            </h3>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-emerald-950/35 border border-emerald-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Bus className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">
                      {progress.driverName} (You)
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate">{activeBus.name}</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400">READY</span>
              </div>

              {peers.map((p) => (
                <div
                  key={p.peerId}
                  className="p-3 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Bus className="w-4 h-4 text-sky-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{p.driverName}</div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {p.activeStopName}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-sky-300 tabular-nums">
                    {p.speedKmh} km/h
                  </span>
                </div>
              ))}

              {roomCode && peers.length === 0 && (
                <p className="text-xs text-neutral-400 leading-relaxed pt-1">
                  Share room code <strong className="text-sky-300 font-mono">{roomCode}</strong> with another tab in this browser to see live 3D convoy buses and minimap markers.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Convoy Radio Dispatch Chat */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-neutral-900 border border-white/10 flex flex-col min-h-[280px]">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-neutral-300">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            Convoy VHF Radio Chat
          </div>

          <div className="flex-1 overflow-y-auto ets-scroll py-3 space-y-2 min-h-[160px]">
            {messages.length === 0 ? (
              <div className="text-xs text-neutral-500 text-center py-8">
                {roomCode
                  ? 'No radio transmissions yet. Say Vanakkam to your convoy!'
                  : 'Host or join a room to open Convoy VHF Radio.'}
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs"
                >
                  <span className="font-bold text-amber-400 mr-2">{m.sender}:</span>
                  <span className="text-neutral-200">{m.text}</span>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-white/10 flex gap-2">
            <input
              type="text"
              disabled={!roomCode}
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder={roomCode ? 'Transmit message to convoy...' : 'Join a room first'}
              className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-neutral-950 border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400 disabled:opacity-40"
            />
            <button
              disabled={!roomCode || !chatText.trim()}
              onClick={handleSendChat}
              className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
