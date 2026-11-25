import {
  BUS_SHOP_SPECS,
  BusCustomization,
  ControlScheme,
  GameMode,
  GameSettings,
  SpeedUnit,
  TrafficDensity,
} from './gameStore';
import { TRAFFIC_SPEED_MULTS } from './trafficSystem';
import {
  BUS_LIVERIES,
  BUS_STOPS,
  CAMERA_MODES,
  CURVED_ROADS,
  HIGHWAY_FACILITIES,
  ROAD_NETWORK,
  ROUTES,
  TRAFFIC_RULES,
  BusLivery,
  RouteDefinition,
  TimeOfDayId,
  WeatherId,
  getTerrainHeight,
} from './constants';
import { BusPhysics } from './busPhysics';
import { busAudio } from '../audio/busAudio';
import { FacilityPrompt, GameTelemetry, ReplayFrame, RuleAlertEvent } from './gameEngine';
import { checkWrongWay, getZoneSpeedLimit, navigationGraph } from './navigationSystem';
import { ConvoyPeerTelemetry } from './convoySync';

interface SimpleTrafficVeh {
  x: number;
  z: number;
  type: 'auto' | 'car' | 'bike' | 'bus';
  speed: number;
  dir: 1 | -1;
  lane: 'vertical' | 'horizontal';
  color: string;
}

/**
 * 2D Canvas Engine: Fallback engine for browsers/GPUs without hardware WebGL2.
 * Shares the full 4x4 Tamil Nadu highway network, physics, navigation, audio, and telemetry.
 */
export class CanvasEngine {
  private mount: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frameId: number = 0;
  private lastTime: number = performance.now();
  private elapsedSec: number = 0;

  private physics: BusPhysics;
  private activeRoute: RouteDefinition = ROUTES[0];
  private currentStopIndex: number = 0;
  private currentLivery: BusLivery = BUS_LIVERIES[0];
  private activeCustomization?: BusCustomization;
  private cameraMode: number = 0;
  private timeOfDay: TimeOfDayId = 'day';
  private weather: WeatherId = 'sunny';
  private headlightsOn: boolean = false;
  private highBeam: boolean = false;
  private activeHornId: number = 0;

  private lightningTimer: number = 8;
  private lightningFlashDuration: number = 0;

  private passengersBoardedTotal = 0;
  private totalPassengersTarget = 18;
  private totalEarnings = 0;
  private fuelSpentTrip = 0;
  private tollsPaidTrip = 0;
  private lastTollPaidId = '';
  private lastPoliceCheckId = '';
  private nearFacilityPrompt: FacilityPrompt | null = null;
  private satisfaction = 100;
  private routeTimeLeft = 210;
  private routeCompleted = false;
  private missionFailed = false;
  private boardingTimer = 0;
  private isBoardingActive = false;

  private ruleAlert: RuleAlertEvent | null = null;
  private ruleAlertTimer = 0;
  private ruleAlertSeq = 0;
  private wrongWayCooldown = 0;
  private speedFineCooldown = 0;
  private ignitionReminderCooldown = 0;

  // Cab & Operations State
  private radioStationId = 1;
  private seatOffsetY = 0;
  private mirrorWide = false;
  private ticketsIssued = 0;
  private announcementText: string | null = null;
  private announcementTimer = 0;

  // Trip Replay Recorder & Player
  private replayFrames: ReplayFrame[] = [];
  private replayRecordTimer = 0;
  private isReplaying = false;
  private replayPaused = false;
  private replayCursor = 0;
  private replaySpeedMult: 1 | 2 = 1;
  private replayElapsed = 0;

  private gameMode: GameMode = 'career';
  private speedUnit: SpeedUnit = 'kmh';
  private controlScheme: ControlScheme = 'both';
  private fareBonusMult: number = 1.0;
  private distanceTraveledMeters: number = 0;
  private collisionCountTrip: number = 0;

  private traffic: SimpleTrafficVeh[] = [];
  private activeTrafficLimit: number = 18;
  private trafficSpeedMult: number = 1.0;
  private convoyPeers: ConvoyPeerTelemetry[] = [];
  private cameraYawOffset = 0;
  private cameraPitchOffset = 0;
  private isPaused: boolean = true;
  private keysHeld: Record<string, boolean> = {};
  private mobileInputsActive = false;

  private onTelemetryCallback?: (t: GameTelemetry) => void;
  private onRouteFinishCallback?: (
    success: boolean,
    earnings: number,
    satisfaction: number,
    expenses?: {
      fuelSpent: number;
      tollsPaid: number;
      healthPct?: number;
      dirtinessPct?: number;
      collisionsCount?: number;
    }
  ) => void;

  constructor(
    mount: HTMLDivElement,
    initialRouteId: string = ROUTES[0].id,
    initialLiveryId: string = BUS_LIVERIES[0].id,
    onTelemetry?: (t: GameTelemetry) => void,
    onRouteFinish?: (
      success: boolean,
      earnings: number,
      satisfaction: number,
      expenses?: {
        fuelSpent: number;
        tollsPaid: number;
        healthPct?: number;
        dirtinessPct?: number;
        collisionsCount?: number;
      }
    ) => void
  ) {
    this.mount = mount;
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.mount.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d')!;
    this.physics = new BusPhysics();
    this.onTelemetryCallback = onTelemetry;
    this.onRouteFinishCallback = onRouteFinish;

    const route = ROUTES.find((r) => r.id === initialRouteId) || ROUTES[0];
    const livery = BUS_LIVERIES.find((l) => l.id === initialLiveryId) || BUS_LIVERIES[0];
    this.activeRoute = route;
    this.currentLivery = livery;
    this.activeHornId = livery.hornDefault;
    this.routeTimeLeft = route.targetSeconds;
    const spec = BUS_SHOP_SPECS.find((s) => s.liveryId === livery.id);
    if (spec) {
      this.physics.setBusTopSpeed(spec.topSpeedKmh);
      this.physics.setBusSpecs(spec.weightKg, spec.lengthMeters);
    }

    this.totalPassengersTarget = route.stops.reduce((acc, sid) => {
      const stop = BUS_STOPS.find((st) => st.id === sid);
      return acc + (stop ? stop.passengersWaiting : 5);
    }, 0);

    const firstStopId = route.stops[0];
    const firstStop = BUS_STOPS.find((s) => s.id === firstStopId) || BUS_STOPS[0];
    this.physics.reset(firstStop.x, firstStop.z, firstStop.idealHeading);

    this.initTraffic();
    this.initControls();
    this.handleResize();
    this.startLoop();
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      this.keysHeld = {};
      this.mobileInputsActive = false;
      this.physics.setInputs(0, 0, false, this.physics.state.isReverse, false);
      busAudio.stopHorn();
    }
  }

  public setGameMode(mode: GameMode) {
    this.gameMode = mode;
  }

  public setShowcaseOrbit(_active: boolean) {}

  public applySettings(settings: GameSettings) {
    this.speedUnit = settings.speedUnit;
    this.controlScheme = settings.controlScheme;
    this.cameraMode = settings.defaultCamera;
    this.physics.setSteeringSensitivity(settings.steeringSensitivity);
    this.physics.setAutoReverse(settings.autoReverse);
    this.physics.setManualGearbox(!!settings.manualGearbox);
    this.physics.setSpeedLimiter80(settings.speedLimiter80 ?? true);
    busAudio.setMasterVolume(settings.masterVolume);
    busAudio.setMusicVolume(settings.musicVolume ?? 45);
    const densityMap: Record<TrafficDensity, number> = {
      off: 0,
      light: 9,
      normal: 18,
      heavy: 27,
      rush: 36,
    };
    this.activeTrafficLimit = Math.min(
      this.traffic.length,
      densityMap[settings.trafficDensity ?? 'normal']
    );
    this.trafficSpeedMult = TRAFFIC_SPEED_MULTS[settings.trafficSpeed ?? 'normal'] ?? 1.0;
  }

  public applyUpgrades(equippedIds: string[]) {
    const torqueBonus = equippedIds.includes('engine_stage2') ? 1.16 : 1.0;
    const brakeBonus = equippedIds.includes('abs_brakes') ? 1.18 : 1.0;
    const gripBonus = equippedIds.includes('monsoon_tires') ? 0.16 : 0;
    const fuelSaverMult = equippedIds.includes('aux_fuel_tank') ? 0.7 : 1.0;
    this.fareBonusMult = equippedIds.includes('interior_comfort') ? 1.18 : 1.0;
    this.physics.setUpgradeModifiers({ torqueBonus, brakeBonus, gripBonus, fuelSaverMult });
  }

  public setCustomization(custom: BusCustomization) {
    this.activeCustomization = custom;
  }

  private initTraffic() {
    this.traffic = [
      { x: -234.8, z: -220, type: 'auto', speed: 10, dir: 1, lane: 'vertical', color: '#facc15' },
      { x: -245.2, z: 120, type: 'auto', speed: 12, dir: -1, lane: 'vertical', color: '#facc15' },
      { x: 5.2, z: -40, type: 'car', speed: 14, dir: 1, lane: 'vertical', color: '#ffffff' },
      { x: 245.2, z: -120, type: 'bus', speed: 13, dir: -1, lane: 'vertical', color: '#0284c7' },
      { x: 474.8, z: -260, type: 'bus', speed: 14, dir: 1, lane: 'vertical', color: '#dc2626' },
      { x: -474.8, z: 90, type: 'car', speed: 12, dir: -1, lane: 'vertical', color: '#e2e8f0' },
      { x: -140, z: -254.8, type: 'auto', speed: 11, dir: 1, lane: 'horizontal', color: '#facc15' },
      { x: 100, z: -5.2, type: 'car', speed: 15, dir: -1, lane: 'horizontal', color: '#3b82f6' },
      { x: -60, z: 254.8, type: 'bike', speed: 14, dir: 1, lane: 'horizontal', color: '#10b981' },
      { x: 80, z: 514.8, type: 'auto', speed: 10, dir: -1, lane: 'horizontal', color: '#facc15' },
      { x: 220, z: -514.8, type: 'car', speed: 16, dir: 1, lane: 'horizontal', color: '#f97316' },
      { x: -234.8, z: 320, type: 'bus', speed: 13, dir: 1, lane: 'vertical', color: '#0284c7' },
      { x: -5.2, z: 240, type: 'auto', speed: 11, dir: -1, lane: 'vertical', color: '#facc15' },
      { x: 234.8, z: 180, type: 'car', speed: 14, dir: 1, lane: 'vertical', color: '#f8fafc' },
      { x: 485.2, z: 140, type: 'bike', speed: 15, dir: -1, lane: 'vertical', color: '#1d4ed8' },
      { x: -485.2, z: -310, type: 'auto', speed: 10, dir: 1, lane: 'vertical', color: '#facc15' },
      { x: -310, z: 5.2, type: 'car', speed: 14, dir: 1, lane: 'horizontal', color: '#dc2626' },
      { x: 310, z: 265.2, type: 'bus', speed: 12, dir: -1, lane: 'horizontal', color: '#1e3a8a' },
      // Heavy & Peak Rush pool (18..36)
      { x: -245.2, z: -360, type: 'car', speed: 14, dir: -1, lane: 'vertical', color: '#475569' },
      { x: -234.8, z: 40, type: 'bike', speed: 15, dir: 1, lane: 'vertical', color: '#0f766e' },
      { x: 5.2, z: -340, type: 'bus', speed: 13, dir: 1, lane: 'vertical', color: '#0284c7' },
      { x: -5.2, z: 430, type: 'car', speed: 14, dir: -1, lane: 'vertical', color: '#d97706' },
      { x: 234.8, z: -390, type: 'car', speed: 15, dir: 1, lane: 'vertical', color: '#2563eb' },
      { x: 245.2, z: 355, type: 'bike', speed: 14, dir: -1, lane: 'vertical', color: '#dc2626' },
      { x: 474.8, z: 45, type: 'car', speed: 14, dir: 1, lane: 'vertical', color: '#0f766e' },
      { x: 485.2, z: -215, type: 'auto', speed: 11, dir: -1, lane: 'vertical', color: '#facc15' },
      { x: -474.8, z: -420, type: 'car', speed: 13, dir: 1, lane: 'vertical', color: '#ffffff' },
      { x: -185, z: -524.8, type: 'car', speed: 15, dir: 1, lane: 'horizontal', color: '#3b82f6' },
      { x: 215, z: -514.8, type: 'bus', speed: 12, dir: -1, lane: 'horizontal', color: '#0284c7' },
      { x: -340, z: -265.2, type: 'car', speed: 14, dir: -1, lane: 'horizontal', color: '#e2e8f0' },
      { x: 335, z: -254.8, type: 'bike', speed: 15, dir: 1, lane: 'horizontal', color: '#f59e0b' },
      { x: -180, z: 5.2, type: 'auto', speed: 11, dir: 1, lane: 'horizontal', color: '#facc15' },
      { x: 260, z: -5.2, type: 'bus', speed: 13, dir: -1, lane: 'horizontal', color: '#1e3a8a' },
      { x: -110, z: 254.8, type: 'car', speed: 14, dir: 1, lane: 'horizontal', color: '#dc2626' },
      { x: 190, z: 525.2, type: 'bike', speed: 15, dir: -1, lane: 'horizontal', color: '#10b981' },
      { x: -335, z: 514.8, type: 'car', speed: 13, dir: 1, lane: 'horizontal', color: '#f8fafc' },
    ];
  }

  private initControls() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('resize', this.handleResize);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.isPaused && !this.isReplaying) return;

    this.keysHeld[e.code] = true;
    busAudio.startAmbientMusic();

    if (this.isReplaying) {
      if (e.code === 'KeyC' && !e.repeat) this.cycleCamera();
      else if (e.code === 'Space' && !e.repeat) this.toggleReplayPause();
      return;
    }

    if (e.code === 'KeyI' && !e.repeat) {
      this.toggleIgnition();
    } else if (e.code === 'KeyH') {
      this.playAirHorn();
    } else if (e.code === 'KeyB' && !e.repeat) {
      this.playConductorWhistle();
    } else if (e.code === 'KeyC' && !e.repeat) {
      this.cycleCamera();
    } else if (e.code === 'KeyE' && !e.repeat) {
      this.toggleDoors();
    } else if (e.code === 'KeyL' && !e.repeat) {
      this.toggleHeadlights();
    } else if (e.code === 'KeyJ' && !e.repeat) {
      this.toggleHighBeam();
    } else if (e.code === 'KeyR' && !e.repeat) {
      this.toggleReverse();
    } else if (e.code === 'KeyN' && !e.repeat) {
      this.toggleParkingBrake();
    } else if (e.code === 'KeyG' && !e.repeat) {
      this.shiftGearUp();
    } else if (e.code === 'KeyF' && !e.repeat) {
      this.shiftGearDown();
    } else if (e.code === 'KeyT' && !e.repeat) {
      this.refuelBus();
    } else if (e.code === 'KeyM' && !e.repeat) {
      this.cycleRadioStation();
    } else if (e.code === 'KeyU' && !e.repeat) {
      this.restAtStop();
    } else if (e.code === 'KeyY' && !e.repeat) {
      this.toggleMirrorView();
    } else if (e.code === 'KeyO' && !e.repeat) {
      this.announceNextStop();
    } else if (e.code === 'Digit1') {
      this.setHornSound(0);
    } else if (e.code === 'Digit2') {
      this.setHornSound(1);
    } else if (e.code === 'Digit3') {
      this.setHornSound(2);
    } else if (e.code === 'Digit4') {
      this.setHornSound(3);
    } else if (e.code === 'KeyK' && !e.repeat) {
      this.cycleWeather();
    } else if (e.code === 'KeyQ' && !e.repeat) {
      this.toggleLeftIndicator();
    } else if (e.code === 'KeyZ' && !e.repeat) {
      this.toggleRightIndicator();
    } else if (e.code === 'KeyX' && !e.repeat) {
      this.toggleHazardLights();
    } else if (e.code === 'KeyV' && !e.repeat) {
      this.toggleCruiseControl();
    } else if (e.code === 'KeyP' && !e.repeat) {
      this.toggleWipers();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = false;
  };

  private handleWindowBlur = () => {
    this.keysHeld = {};
  };

  private handleResize = () => {
    if (!this.mount || !this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.mount.clientWidth * dpr;
    this.canvas.height = this.mount.clientHeight * dpr;
  };

  private triggerRuleAlert(text: string, amount: number, isFine: boolean) {
    this.ruleAlertSeq += 1;
    this.ruleAlert = { id: this.ruleAlertSeq, text, amount, isFine };
    this.ruleAlertTimer = 3.2;
    if (isFine) {
      this.totalEarnings = Math.max(0, this.totalEarnings - amount);
      this.satisfaction = Math.max(0, this.satisfaction - 5);
    } else if (amount > 0) {
      this.totalEarnings += amount;
    }
  }

  public playAirHorn() {
    busAudio.playHorn(this.activeHornId);
  }

  public startAirHorn() {
    busAudio.startHorn(this.activeHornId);
  }

  public stopAirHorn() {
    busAudio.stopHorn();
  }

  public playConductorWhistle() {
    busAudio.playWhistle();
    if (this.isBusAtActiveStop() && this.physics.state.doorOpen && !this.isBoardingActive) {
      this.startBoardingSequence();
    }
  }

  public setHornSound(hornId: number) {
    this.activeHornId = hornId;
    busAudio.playHorn(hornId);
  }

  public toggleDoors() {
    const success = this.physics.toggleDoor();
    if (success && this.physics.state.doorOpen && this.isBusAtActiveStop() && !this.isBoardingActive) {
      this.startBoardingSequence();
    }
  }

  public toggleReverse() {
    this.physics.state.isReverse = !this.physics.state.isReverse;
    busAudio.playAirBrakeHiss();
  }

  public toggleParkingBrake() {
    const engaged = this.physics.toggleParkingBrake();
    this.triggerRuleAlert(engaged ? 'PARKING BRAKE ENGAGED (P)' : 'PARKING BRAKE RELEASED', 0, false);
  }

  public shiftGearUp() {
    this.physics.shiftGearUp();
  }

  public shiftGearDown() {
    this.physics.shiftGearDown();
  }

  public toggleIgnition() {
    const on = this.physics.toggleIgnition();
    this.triggerRuleAlert(on ? 'ENGINE STARTED — SAFE JOURNEY!' : 'IGNITION KEY OFF', 0, false);
  }

  public setRadioStation(stationId: number) {
    this.radioStationId = ((stationId % 4) + 4) % 4;
    busAudio.setRadioStation(this.radioStationId);
  }

  public cycleRadioStation() {
    this.setRadioStation((this.radioStationId + 1) % 4);
  }

  public adjustSeat(deltaY: number) {
    this.seatOffsetY = Math.max(-0.18, Math.min(0.22, Number((this.seatOffsetY + deltaY).toFixed(2))));
  }

  public toggleMirrorView() {
    this.mirrorWide = !this.mirrorWide;
    this.triggerRuleAlert(this.mirrorWide ? 'WIDE HIGHWAY MIRROR ANGLE' : 'STANDARD MIRROR ANGLE', 0, false);
  }

  public setCondition(healthPct: number, dirtinessPct: number) {
    this.physics.setCondition(healthPct, dirtinessPct);
  }

  public restAtStop() {
    const nearRest = this.nearFacilityPrompt?.type === 'rest_stop';
    if (!nearRest && this.physics.state.fatiguePct < 45) return;
    const cost = TRAFFIC_RULES.teaBreakCost;
    this.fuelSpentTrip += cost;
    this.physics.restBreak();
    this.triggerRuleAlert(`FILTER COFFEE & TEA BREAK (-₹${cost}) · FATIGUE 0%`, 0, false);
  }

  public repairBusRoadside() {
    if (this.physics.state.healthPct >= 95) return;
    const cost = TRAFFIC_RULES.repairCost;
    this.fuelSpentTrip += cost;
    this.physics.repairBus();
    this.triggerRuleAlert(`MECHANIC REPAIR COMPLETE (-₹${cost})`, 0, false);
  }

  public washBusRoadside() {
    if (this.physics.state.dirtinessPct <= 5) return;
    const cost = TRAFFIC_RULES.washCost;
    this.fuelSpentTrip += cost;
    this.physics.washBus();
    this.triggerRuleAlert(`HIGH-PRESSURE BUS WASH (-₹${cost})`, 0, false);
  }

  public announceNextStop() {
    const stop = this.getActiveStop();
    if (!stop) return;
    this.announcementText = `Next Stop: ${stop.nameEn} (${stop.nameTa})`;
    this.announcementTimer = 4.5;
    busAudio.announceBusStop(stop.nameEn, false);
  }

  public startReplay() {
    if (this.replayFrames.length < 2) return;
    this.isReplaying = true;
    this.replayPaused = false;
    this.replayCursor = 0;
    this.replayElapsed = 0;
    this.isPaused = false;
  }

  public stopReplay() {
    this.isReplaying = false;
    this.replayPaused = false;
  }

  public toggleReplayPause() {
    if (this.isReplaying) this.replayPaused = !this.replayPaused;
  }

  public setReplaySpeed(mult: 1 | 2) {
    this.replaySpeedMult = mult;
  }

  public scrubReplay(pct: number) {
    if (this.replayFrames.length === 0) return;
    const clamped = Math.max(0, Math.min(100, pct));
    this.replayCursor = Math.min(
      this.replayFrames.length - 1,
      Math.floor((clamped / 100) * (this.replayFrames.length - 1))
    );
    this.replayElapsed = this.replayFrames[this.replayCursor].t;
  }

  public refuelBus() {
    const isNearPetrol = this.nearFacilityPrompt?.type === 'petrol';
    if (!isNearPetrol && this.physics.state.fuelPct > 25) return;
    if (this.physics.state.fuelPct >= 98) return;
    const cost = isNearPetrol ? 120 : 180;
    this.physics.refuel(100);
    this.fuelSpentTrip += cost;
    this.triggerRuleAlert(
      isNearPetrol ? `DIESEL TANK FULL (-₹${cost})` : `ROADSIDE EMERGENCY FUEL (-₹${cost})`,
      0,
      false
    );
  }

  public toggleLeftIndicator() {
    this.physics.toggleLeftIndicator();
    busAudio.playIndicatorClick(true);
  }

  public toggleRightIndicator() {
    this.physics.toggleRightIndicator();
    busAudio.playIndicatorClick(true);
  }

  public toggleHazardLights() {
    this.physics.toggleHazardLights();
    busAudio.playIndicatorClick(true);
  }

  public toggleCruiseControl() {
    const target = this.physics.toggleCruiseControl();
    if (target !== null) {
      this.triggerRuleAlert(`CRUISE SET: ${target} KM/H`, 0, false);
    }
  }

  public toggleWipers() {
    this.physics.toggleWipers();
  }

  public toggleHeadlights() {
    this.headlightsOn = !this.headlightsOn;
    if (!this.headlightsOn) this.highBeam = false;
  }

  public toggleHighBeam() {
    if (!this.headlightsOn) {
      this.headlightsOn = true;
      this.highBeam = true;
    } else {
      this.highBeam = !this.highBeam;
    }
  }

  public cycleCamera() {
    this.cameraMode = (this.cameraMode + 1) % CAMERA_MODES.length;
    this.resetCameraLook();
  }

  public setCameraMode(mode: number) {
    this.cameraMode = Math.max(0, Math.min(CAMERA_MODES.length - 1, mode));
    this.resetCameraLook();
  }

  public setCameraLookDelta(dxNorm: number, dyNorm: number) {
    this.cameraYawOffset = Math.max(-1.6, Math.min(1.6, this.cameraYawOffset - dxNorm * 1.8));
    this.cameraPitchOffset = Math.max(-0.5, Math.min(0.5, this.cameraPitchOffset - dyNorm));
  }

  public resetCameraLook() {
    this.cameraYawOffset = 0;
    this.cameraPitchOffset = 0;
  }

  public setConvoyPeers(peers: ConvoyPeerTelemetry[]) {
    this.convoyPeers = peers;
  }

  public setLivery(livery: BusLivery) {
    this.currentLivery = livery;
    const spec = BUS_SHOP_SPECS.find((s) => s.liveryId === livery.id);
    if (spec) {
      this.physics.setBusTopSpeed(spec.topSpeedKmh);
      this.physics.setBusSpecs(spec.weightKg, spec.lengthMeters);
    }
    this.activeHornId = livery.hornDefault;
  }

  public setTimeOfDay(id: TimeOfDayId) {
    this.timeOfDay = id;
    if (id === 'night' || this.weather === 'rain' || this.weather === 'fog') this.headlightsOn = true;
  }

  public setWeather(weather: WeatherId) {
    this.weather = weather;
    this.physics.setWeather(weather);
    if (weather === 'rain' || weather === 'fog') this.headlightsOn = true;
  }

  public cycleWeather() {
    const list: WeatherId[] = ['sunny', 'cloudy', 'fog', 'rain'];
    const nextIdx = (list.indexOf(this.weather) + 1) % list.length;
    this.setWeather(list[nextIdx]);
  }

  public setRoute(route: RouteDefinition) {
    this.activeRoute = route;
    this.currentStopIndex = 0;
    this.passengersBoardedTotal = 0;
    this.ticketsIssued = 0;
    this.totalPassengersTarget = route.stops.reduce((acc, sid) => {
      const stop = BUS_STOPS.find((st) => st.id === sid);
      return acc + (stop ? stop.passengersWaiting : 5);
    }, 0);
    this.totalEarnings = 0;
    this.fuelSpentTrip = 0;
    this.tollsPaidTrip = 0;
    this.lastTollPaidId = '';
    this.lastPoliceCheckId = '';
    this.replayFrames = [];
    this.replayRecordTimer = 0;
    this.isReplaying = false;
    this.satisfaction = 100;
    this.distanceTraveledMeters = 0;
    this.collisionCountTrip = 0;
    this.routeTimeLeft = route.targetSeconds;
    this.routeCompleted = false;
    this.missionFailed = false;
    this.ruleAlert = null;
    this.announcementText = null;
    this.isBoardingActive = false;
    this.boardingTimer = 0;

    const firstStopId = route.stops[0];
    const firstStop = BUS_STOPS.find((s) => s.id === firstStopId) || BUS_STOPS[0];
    this.physics.reset(firstStop.x, firstStop.z, firstStop.idealHeading);
  }

  public setMobileInput(
    throttle: number,
    steer: number,
    brake: boolean | number,
    reverse: boolean,
    clutch: boolean = false,
    handbrake?: boolean
  ) {
    const brakeActive = typeof brake === 'number' ? brake > 0.02 : brake;
    this.mobileInputsActive = throttle !== 0 || steer !== 0 || brakeActive || clutch || !!handbrake;
    this.physics.setInputs(throttle, steer, brake, reverse, clutch, handbrake);
    busAudio.startEngine();
    busAudio.startAmbientMusic();
  }

  private isBusAtActiveStop(): boolean {
    const activeStop = this.getActiveStop();
    if (!activeStop) return false;
    const dist = Math.hypot(this.physics.state.x - activeStop.x, this.physics.state.z - activeStop.z);
    return dist <= activeStop.radius + 2;
  }

  private getActiveStop() {
    const stopId = this.activeRoute.stops[this.currentStopIndex];
    return BUS_STOPS.find((s) => s.id === stopId) || BUS_STOPS[0];
  }

  private startBoardingSequence() {
    this.isBoardingActive = true;
    this.boardingTimer = 2.0;
  }

  private completeStopBoarding() {
    this.isBoardingActive = false;
    const stop = this.getActiveStop();
    const count = stop ? stop.passengersWaiting : 4;
    const rate = stop ? stop.ticketRate : 25;
    this.passengersBoardedTotal += count;
    this.physics.setPassengersCount(this.passengersBoardedTotal);
    this.ticketsIssued += count;
    this.totalEarnings += Math.round(count * rate * this.fareBonusMult);
    busAudio.playTicketPunch();
    setTimeout(() => busAudio.playFareChime(), 160);

    if (this.currentStopIndex < this.activeRoute.stops.length - 1) {
      this.currentStopIndex++;
      const nextStop = this.getActiveStop();
      if (nextStop) {
        this.announcementText = `Departing for ${nextStop.nameEn} (${nextStop.nameTa})`;
        this.announcementTimer = 4.5;
        busAudio.announceBusStop(nextStop.nameEn, true);
      }
    } else if (this.gameMode === 'career') {
      this.routeCompleted = true;
      this.totalEarnings += Math.round(this.activeRoute.baseReward * this.fareBonusMult);
      if (this.onRouteFinishCallback) {
        this.onRouteFinishCallback(true, this.totalEarnings, this.satisfaction, {
          fuelSpent: this.fuelSpentTrip,
          tollsPaid: this.tollsPaidTrip,
          healthPct: this.physics.state.healthPct,
          dirtinessPct: this.physics.state.dirtinessPct,
          collisionsCount: this.collisionCountTrip,
        });
      }
    } else {
      this.triggerRuleAlert('FREE ROAM DESTINATION REACHED!', 50, false);
    }
  }

  private startLoop() {
    const tick = (now: number) => {
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      this.elapsedSec += dt;

      this.update(dt);
      this.render();

      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private emitTelemetry(
    gearStr: string,
    isWrongWay: boolean,
    isSpeeding: boolean,
    zoneLimit: number
  ) {
    if (!this.onTelemetryCallback) return;
    const s = this.physics.state;
    const activeStop = this.getActiveStop();
    const dist = Math.hypot(s.x - activeStop.x, s.z - activeStop.z);
    const advice = navigationGraph.computeAdvice(s.x, s.z, s.heading, activeStop, this.elapsedSec);
    const replayPct =
      this.replayFrames.length > 1
        ? Math.round((this.replayCursor / (this.replayFrames.length - 1)) * 100)
        : 0;

    this.onTelemetryCallback({
      speedKmh: Math.round(Math.abs(s.speedKmh)),
      rpm: Math.round(s.rpm),
      airPressure: Math.round(s.airPressure),
      fuelPct: Math.round(s.fuelPct),
      engineTempC: Math.round(s.engineTempC),
      engineRunning: s.engineRunning,
      fatiguePct: Math.round(s.fatiguePct),
      healthPct: Math.round(s.healthPct),
      dirtinessPct: Math.round(s.dirtinessPct),
      ticketsIssued: this.ticketsIssued,
      radioStationId: this.radioStationId,
      seatOffsetY: this.seatOffsetY,
      mirrorWide: this.mirrorWide,
      announcementText: this.announcementText,
      gear: gearStr,
      currentStopName: activeStop.nameEn,
      currentStopTamil: activeStop.nameTa,
      passengerGroup: activeStop.passengerGroup,
      nextStopDistanceMeters: Math.round(dist),
      isAtStop: this.isBusAtActiveStop(),
      canOpenDoors: this.isBusAtActiveStop() && Math.abs(s.speedKmh) < 2,
      doorsOpen: s.doorOpen,
      parkingBrake: s.parkingBrake,
      clutchPressed: s.clutchPressed,
      manualGearbox: s.manualGearbox,
      passengersBoarded: this.passengersBoardedTotal,
      passengersOnboard: s.passengersOnboard,
      totalMassKg: s.totalMassKg,
      totalPassengers: this.totalPassengersTarget,
      totalEarnings: this.totalEarnings,
      fuelSpentTrip: this.fuelSpentTrip,
      tollsPaidTrip: this.tollsPaidTrip,
      passengerSatisfaction: Math.round(this.satisfaction),
      timeRemaining: Math.max(0, Math.round(this.routeTimeLeft)),
      routeCompleted: this.routeCompleted,
      missionFailed: this.missionFailed,
      activeRoute: this.activeRoute,
      cameraMode: this.cameraMode,
      timeOfDay: this.timeOfDay,
      weather: this.weather,
      gripFactor: s.gripFactor,
      isDrifting: s.isDrifting,
      isBraking: s.isBraking,
      leftIndicator: s.leftIndicator,
      rightIndicator: s.rightIndicator,
      hazardLights: s.hazardLights,
      wipersOn: this.weather === 'rain' || s.manualWipers,
      cruiseSpeed: s.cruiseControlSpeed,
      headlightsOn: this.headlightsOn,
      highBeam: this.highBeam,
      activeHornId: this.activeHornId,
      livery: this.currentLivery,
      busX: s.x,
      busZ: s.z,
      busHeading: s.heading,
      nextStopX: activeStop.x,
      nextStopZ: activeStop.z,
      nextManeuver: advice.maneuver,
      maneuverDistance: advice.distanceMeters,
      nextRoadName: advice.nextRoadName,
      routePolyline: advice.waypoints,
      trafficDots: this.traffic.slice(0, this.activeTrafficLimit).map((v) => ({ x: v.x, z: v.z })),
      convoyPeers: this.convoyPeers.map((p) => ({
        peerId: p.peerId,
        driverName: p.driverName,
        x: p.x,
        z: p.z,
        speedKmh: p.speedKmh,
      })),
      isWrongWay,
      isSpeeding,
      zoneSpeedLimitKmh: zoneLimit,
      upcomingSignal: advice.upcomingSignal,
      upcomingSignalDistance: advice.upcomingSignalDistance,
      ruleAlert: this.ruleAlert,
      nearFacilityPrompt: this.nearFacilityPrompt,
      gameMode: this.gameMode,
      speedUnit: this.speedUnit,
      estimatedArrivalSec: advice.estimatedArrivalSec,
      totalDistanceTraveledM: Math.round(this.distanceTraveledMeters),
      isReplaying: this.isReplaying,
      replayPaused: this.replayPaused,
      replayProgressPct: replayPct,
      replayFrameCount: this.replayFrames.length,
      replaySpeedMult: this.replaySpeedMult,
      collisionsCountTrip: this.collisionCountTrip,
    });
  }

  private update(dt: number) {
    if (this.isReplaying && this.replayFrames.length > 1) {
      if (!this.replayPaused) {
        this.replayElapsed += dt * this.replaySpeedMult;
        const maxT = this.replayFrames[this.replayFrames.length - 1].t;
        if (this.replayElapsed >= maxT) {
          this.replayElapsed = 0;
          this.replayCursor = 0;
        }
        while (
          this.replayCursor < this.replayFrames.length - 1 &&
          this.replayFrames[this.replayCursor + 1].t <= this.replayElapsed
        ) {
          this.replayCursor++;
        }
      }
      const f = this.replayFrames[this.replayCursor];
      this.physics.state.x = f.x;
      this.physics.state.y = f.y;
      this.physics.state.z = f.z;
      this.physics.state.heading = f.heading;
      this.physics.state.speedKmh = f.speedKmh;
      this.emitTelemetry(f.gear, false, false, 80);
      return;
    }

    if (this.isPaused) return;

    let throttle = 0;
    let steer = 0;
    let brake = false;
    const clutch = !!(this.keysHeld['ShiftLeft'] || this.keysHeld['ShiftRight']);

    const allowWasd = this.controlScheme === 'wasd' || this.controlScheme === 'both';
    const allowArrows = this.controlScheme === 'arrows' || this.controlScheme === 'both';

    if ((allowWasd && this.keysHeld['KeyW']) || (allowArrows && this.keysHeld['ArrowUp'])) throttle += 1;
    if ((allowWasd && this.keysHeld['KeyS']) || (allowArrows && this.keysHeld['ArrowDown'])) throttle -= 1;
    if ((allowWasd && this.keysHeld['KeyA']) || (allowArrows && this.keysHeld['ArrowLeft'])) steer += 1;
    if ((allowWasd && this.keysHeld['KeyD']) || (allowArrows && this.keysHeld['ArrowRight'])) steer -= 1;
    if (this.keysHeld['Space']) brake = true;

    if (this.ignitionReminderCooldown > 0) this.ignitionReminderCooldown -= dt;
    if (throttle > 0 && !this.physics.state.engineRunning && this.ignitionReminderCooldown <= 0) {
      this.ignitionReminderCooldown = 3.0;
      this.triggerRuleAlert('PRESS [I] TO TURN IGNITION KEY & START ENGINE!', 0, false);
    }

    if (!this.mobileInputsActive) {
      this.physics.setInputs(throttle, steer, brake, this.physics.state.isReverse, clutch);
    }

    const { hitObstacle } = this.physics.update(dt, []);
    if (hitObstacle) {
      this.collisionCountTrip += 1;
      this.satisfaction = Math.max(0, this.satisfaction - 5);
      this.triggerRuleAlert('COLLISION DAMAGE & PENALTY', TRAFFIC_RULES.collisionFine, true);
    }

    for (let i = 0; i < this.activeTrafficLimit; i++) {
      const veh = this.traffic[i];
      const distToBus = Math.hypot(this.physics.state.x - veh.x, this.physics.state.z - veh.z);
      if (distToBus < 3.2) {
        this.collisionCountTrip += 1;
        this.physics.handleCollisionImpact(1.0);
        this.satisfaction = Math.max(0, this.satisfaction - 8);
      }

      const effSpeed = veh.speed * this.trafficSpeedMult;
      if (veh.lane === 'vertical') {
        veh.z += veh.dir * effSpeed * dt;
        if (veh.dir === 1 && veh.z > 620) veh.z = -620;
        else if (veh.dir === -1 && veh.z < -620) veh.z = 620;
      } else {
        veh.x += veh.dir * effSpeed * dt;
        if (veh.dir === 1 && veh.x > 580) veh.x = -580;
        else if (veh.dir === -1 && veh.x < -580) veh.x = 580;
      }
    }

    if (this.wrongWayCooldown > 0) this.wrongWayCooldown -= dt;
    if (this.speedFineCooldown > 0) this.speedFineCooldown -= dt;
    if (this.ruleAlertTimer > 0) {
      this.ruleAlertTimer -= dt;
      if (this.ruleAlertTimer <= 0) this.ruleAlert = null;
    }
    if (this.announcementTimer > 0) {
      this.announcementTimer -= dt;
      if (this.announcementTimer <= 0) this.announcementText = null;
    }

    const s = this.physics.state;
    const isWrongWay = checkWrongWay(s.x, s.z, s.heading, s.speedKmh);
    if (isWrongWay && this.wrongWayCooldown <= 0) {
      this.wrongWayCooldown = 4.5;
      this.triggerRuleAlert('WRONG WAY! KEEP LEFT', TRAFFIC_RULES.wrongWayFine, true);
    }

    let foundFacility: FacilityPrompt | null = null;
    for (const fac of HIGHWAY_FACILITIES) {
      if (Math.hypot(s.x - fac.x, s.z - fac.z) <= fac.radius) {
        foundFacility = { type: fac.type, name: fac.name };
        if (fac.type === 'toll' && this.lastTollPaidId !== fac.id) {
          this.lastTollPaidId = fac.id;
          const fee = fac.fee || 35;
          this.tollsPaidTrip += fee;
          busAudio.playTollBeep();
          this.triggerRuleAlert(`FASTag TOLL PAID: ₹${fee}`, 0, false);
        } else if (fac.type === 'police_check' && this.lastPoliceCheckId !== fac.id) {
          this.lastPoliceCheckId = fac.id;
          const nightLightsMissing = this.timeOfDay === 'night' && !this.headlightsOn;
          if (s.speedKmh > 65 || nightLightsMissing || s.healthPct < 35) {
            this.triggerRuleAlert(
              nightLightsMissing ? 'POLICE CHALLAN: NO HEADLIGHTS AT NIGHT!' : 'POLICE CHECK: SPEED/SAFETY FINE!',
              TRAFFIC_RULES.policeCheckFine,
              true
            );
          } else {
            this.triggerRuleAlert('TN POLICE INSPECTION PASSED (+₹50)', TRAFFIC_RULES.policeCleanBonus, false);
          }
        }
        break;
      }
    }
    this.nearFacilityPrompt = foundFacility;

    const baseZoneLimit = getZoneSpeedLimit(s.x, s.z);
    const activeZoneLimit =
      foundFacility?.type === 'construction' ? Math.min(baseZoneLimit, 40) : baseZoneLimit;
    const isSpeeding = s.speedKmh > activeZoneLimit + 5;
    if (isSpeeding && this.speedFineCooldown <= 0) {
      this.speedFineCooldown = 6.0;
      this.triggerRuleAlert(`OVERSPEEDING (>${activeZoneLimit} KM/H)`, 25, true);
    }

    this.replayRecordTimer += dt;
    if (this.replayRecordTimer >= 0.16 && this.replayFrames.length < 2400) {
      this.replayRecordTimer = 0;
      const baseT = this.replayFrames.length === 0 ? 0 : this.replayFrames[this.replayFrames.length - 1].t + 0.16;
      this.replayFrames.push({
        t: baseT,
        x: s.x,
        y: getTerrainHeight(s.x, s.z),
        z: s.z,
        heading: s.heading,
        speedKmh: Math.round(Math.abs(s.speedKmh)),
        gear: s.gear,
      });
    }

    if (this.isBoardingActive) {
      this.boardingTimer -= dt;
      if (this.boardingTimer <= 0) {
        this.completeStopBoarding();
      }
    }

    this.distanceTraveledMeters += Math.abs(s.speedKmh) * (1000 / 3600) * dt;

    if (this.gameMode === 'career' && !this.routeCompleted && !this.missionFailed) {
      this.routeTimeLeft -= dt;
      if (this.routeTimeLeft <= 0) {
        this.missionFailed = true;
        if (this.onRouteFinishCallback) {
          this.onRouteFinishCallback(false, this.totalEarnings, this.satisfaction, {
            fuelSpent: this.fuelSpentTrip,
            tollsPaid: this.tollsPaidTrip,
            healthPct: s.healthPct,
            dirtinessPct: s.dirtinessPct,
            collisionsCount: this.collisionCountTrip,
          });
        }
      }
    }

    if (this.weather === 'rain') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 9 + Math.random() * 8;
        this.lightningFlashDuration = 0.08;
        setTimeout(() => busAudio.playThunder(), 250);
      }
      if (this.lightningFlashDuration > 0) {
        this.lightningFlashDuration -= dt;
      }
    }

    this.emitTelemetry(s.gear, isWrongWay, isSpeeding, activeZoneLimit);
  }

  private render() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    if (width === 0 || height === 0) return;

    ctx.clearRect(0, 0, width, height);

    if (this.timeOfDay === 'night') {
      ctx.fillStyle = '#090d16';
    } else if (this.timeOfDay === 'sunset') {
      ctx.fillStyle = '#3f1d24';
    } else {
      ctx.fillStyle = '#14532d';
    }
    ctx.fillRect(0, 0, width, height);

    const s = this.physics.state;
    ctx.save();
    ctx.translate(width / 2, height / 2);

    const scale = 5.5;
    ctx.scale(scale, scale);

    if (this.cameraMode !== 6) {
      ctx.rotate(s.heading + this.cameraYawOffset * 0.45);
    }
    ctx.translate(-s.x, -s.z);

    // Coastal Ocean
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(580, -760, 320, 1520);
    ctx.fillRect(-760, 620, 1520, 320);

    // Divided 20m Road Network (5x5 Tamil Nadu Trunk Highways)
    ctx.fillStyle = '#27272a';
    ROAD_NETWORK.verticalX.forEach((vx) => ctx.fillRect(vx - 10, -660, 20, 1320));
    ROAD_NETWORK.horizontalZ.forEach((hz) => ctx.fillRect(-620, hz - 10, 1240, 20));

    // Curved Mountain Hairpins
    CURVED_ROADS.forEach((seg) => {
      if (seg.points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = seg.width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.points[0].x, seg.points[0].z);
      for (let i = 1; i < seg.points.length; i++) {
        ctx.lineTo(seg.points[i].x, seg.points[i].z);
      }
      ctx.stroke();
      ctx.restore();
    });

    // Highway Facilities (Police Checkpost, Construction Zones, Tolls, Bunks, Rest Stops)
    HIGHWAY_FACILITIES.forEach((fac) => {
      ctx.save();
      ctx.translate(fac.x, fac.z);
      ctx.fillStyle =
        fac.type === 'police_check'
          ? '#1d4ed8'
          : fac.type === 'construction'
            ? '#ea580c'
            : fac.type === 'petrol'
              ? '#eab308'
              : fac.type === 'rest_stop'
                ? '#10b981'
                : '#64748b';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 2.6px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fac.type === 'police_check' ? 'POLICE' : fac.type === 'construction' ? 'WORK 40' : fac.type.toUpperCase(), 0, -5.5);
      ctx.restore();
    });

    // Bus Stops
    BUS_STOPS.forEach((stop) => {
      const isActive = this.getActiveStop().id === stop.id;
      ctx.beginPath();
      ctx.arc(stop.x, stop.z, stop.radius, 0, Math.PI * 2);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = isActive ? '#10b981' : '#64748b';
      ctx.stroke();
      if (isActive) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.fill();
      }
      ctx.fillStyle = isActive ? '#fbbf24' : '#cbd5e1';
      ctx.font = 'bold 3.2px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(stop.nameEn, stop.x, stop.z - stop.radius - 1);
    });

    // AI Traffic
    for (let i = 0; i < this.activeTrafficLimit; i++) {
      const v = this.traffic[i];
      ctx.save();
      ctx.translate(v.x, v.z);
      ctx.rotate(v.lane === 'vertical' ? (v.dir === 1 ? 0 : Math.PI) : v.dir === 1 ? Math.PI / 2 : -Math.PI / 2);
      ctx.fillStyle = v.type === 'auto' ? '#facc15' : v.color;
      const w = v.type === 'bike' ? 0.8 : v.type === 'bus' ? 2.3 : 1.7;
      const len = v.type === 'bike' ? 1.8 : v.type === 'bus' ? 8.5 : 3.2;
      ctx.fillRect(-w / 2, -len / 2, w, len);
      ctx.restore();
    }

    // Convoy Peer Buses
    this.convoyPeers.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.z);
      ctx.rotate(-p.heading);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-1.25, -4.7, 2.5, 9.4);
      ctx.restore();
      ctx.fillStyle = '#bae6fd';
      ctx.font = 'bold 2.8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.driverName.split(' ')[0], p.x, p.z - 6.5);
    });

    // Player Bus
    const bodyHex = this.activeCustomization
      ? `#${this.activeCustomization.bodyColorHex.toString(16).padStart(6, '0')}`
      : this.currentLivery.primaryColor;
    const stripeHex = this.activeCustomization
      ? `#${this.activeCustomization.stripeColorHex.toString(16).padStart(6, '0')}`
      : this.currentLivery.secondaryColor;

    ctx.save();
    ctx.translate(s.x, s.z);
    ctx.rotate(-s.heading);
    ctx.fillStyle = bodyHex;
    ctx.fillRect(-1.25, -4.7, 2.5, 9.4);
    ctx.fillStyle = stripeHex;
    ctx.fillRect(-1.25, -2.5, 2.5, 3.5);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-1.15, 3.5, 2.3, 1.1);

    const blink = Math.sin(performance.now() * 0.0085) > 0;
    if ((s.leftIndicator || s.hazardLights) && blink) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(1.04, 4.5, 0.25, 0.25);
      ctx.fillRect(1.04, -4.7, 0.25, 0.25);
    }
    if ((s.rightIndicator || s.hazardLights) && blink) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-1.28, 4.5, 0.25, 0.25);
      ctx.fillRect(-1.28, -4.7, 0.25, 0.25);
    }
    if (s.doorOpen) {
      ctx.fillStyle = '#10b981';
      ctx.fillRect(1.25, 2.2, 0.4, 1.0);
    }
    ctx.restore();
    ctx.restore();

    if (this.weather === 'rain') {
      ctx.save();
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
      ctx.lineWidth = 1.6;
      const now = performance.now() * 0.001;
      ctx.beginPath();
      for (let i = 0; i < 160; i++) {
        const rx = ((i * 47 + now * 120) % (width + 60)) - 30;
        const ry = (i * 31 + now * 980) % height;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 7, ry + 26);
      }
      ctx.stroke();
      ctx.restore();
    } else if (this.weather === 'fog') {
      ctx.save();
      ctx.fillStyle = 'rgba(203, 213, 225, 0.28)';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (this.lightningFlashDuration > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(240, 249, 255, 0.45)';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  public dispose() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('resize', this.handleResize);
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
