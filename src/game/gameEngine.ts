import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BUS_LIVERIES,
  BUS_STOPS,
  CAMERA_MODES,
  HIGHWAY_FACILITIES,
  ROAD_NETWORK,
  ROUTES,
  TIME_OF_DAY_PRESETS,
  TRAFFIC_RULES,
  WEATHER_PRESETS,
  BusLivery,
  RouteDefinition,
  TimeOfDayId,
  WeatherId,
  getTerrainHeight,
} from './constants';
import {
  BUS_SHOP_SPECS,
  BusCustomization,
  ControlScheme,
  GameMode,
  GameSettings,
  SpeedUnit,
} from './gameStore';
import { createCoimbatoreBus } from './proceduralModels';
import { buildCoimbatoreCity } from './cityEnvironment';
import { createTrafficSystem } from './trafficSystem';
import { BusPhysics } from './busPhysics';
import { busAudio } from '../audio/busAudio';
import {
  ManeuverType,
  SignalLight,
  checkWrongWay,
  getSignalState,
  getZoneSpeedLimit,
  navigationGraph,
} from './navigationSystem';

export interface RuleAlertEvent {
  id: number;
  text: string;
  amount: number;
  isFine: boolean;
}

export interface FacilityPrompt {
  type: 'toll' | 'petrol' | 'rail_crossing' | 'bridge' | 'rest_stop' | 'police_check' | 'construction';
  name: string;
}

export interface ReplayFrame {
  t: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  speedKmh: number;
  gear: string;
}

export interface GameTelemetry {
  speedKmh: number;
  rpm: number;
  airPressure: number;
  fuelPct: number;
  engineTempC: number;
  engineRunning: boolean;
  fatiguePct: number;
  healthPct: number;
  dirtinessPct: number;
  ticketsIssued: number;
  radioStationId: number;
  seatOffsetY: number;
  mirrorWide: boolean;
  announcementText: string | null;
  gear: string;
  currentStopName: string;
  currentStopTamil: string;
  passengerGroup: string;
  nextStopDistanceMeters: number;
  isAtStop: boolean;
  canOpenDoors: boolean;
  doorsOpen: boolean;
  parkingBrake: boolean;
  clutchPressed: boolean;
  manualGearbox: boolean;
  passengersBoarded: number;
  totalPassengers: number;
  totalEarnings: number;
  fuelSpentTrip: number;
  tollsPaidTrip: number;
  passengerSatisfaction: number;
  timeRemaining: number;
  routeCompleted: boolean;
  missionFailed: boolean;
  activeRoute: RouteDefinition;
  cameraMode: number;
  timeOfDay: TimeOfDayId;
  weather: WeatherId;
  gripFactor: number;
  isDrifting: boolean;
  isBraking: boolean;
  leftIndicator: boolean;
  rightIndicator: boolean;
  hazardLights: boolean;
  wipersOn: boolean;
  cruiseSpeed: number | null;
  headlightsOn: boolean;
  highBeam: boolean;
  activeHornId: number;
  livery: BusLivery;
  busX: number;
  busZ: number;
  busHeading: number;
  nextStopX: number;
  nextStopZ: number;
  nextManeuver: ManeuverType;
  maneuverDistance: number;
  nextRoadName: string;
  routePolyline: Array<{ x: number; z: number }>;
  trafficDots: Array<{ x: number; z: number }>;
  isWrongWay: boolean;
  isSpeeding: boolean;
  zoneSpeedLimitKmh: number;
  upcomingSignal: SignalLight | null;
  upcomingSignalDistance: number;
  ruleAlert: RuleAlertEvent | null;
  nearFacilityPrompt: FacilityPrompt | null;
  gameMode: 'free' | 'career';
  speedUnit: 'kmh' | 'mph';
  estimatedArrivalSec: number;
  totalDistanceTraveledM: number;
  isReplaying: boolean;
  replayPaused: boolean;
  replayProgressPct: number;
  replayFrameCount: number;
  replaySpeedMult: 1 | 2;
}

export class GameEngine {
  private mount: HTMLDivElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean = false;
  private frameId: number = 0;
  private clock = new THREE.Clock();
  private targetFps: 30 | 60 | 0 = 60;
  private lastRenderMs = 0;

  // Lighting
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private ambientLight!: THREE.AmbientLight;

  // Subsystems
  private physics: BusPhysics;
  private busModel!: ReturnType<typeof createCoimbatoreBus>;
  private cityEnvironment!: ReturnType<typeof buildCoimbatoreCity>;
  private trafficSystem!: ReturnType<typeof createTrafficSystem>;

  // 3D GPS Holographic Path Guide
  private gpsGuideLine!: THREE.Line;
  private gpsGuideGeom!: THREE.BufferGeometry;
  private gpsChevrons: THREE.Mesh[] = [];
  private navRefreshTimer = 0;
  private dashRefreshTimer = 0;
  private cachedAdvice = navigationGraph.computeAdvice(-74.8, -155, 0, BUS_STOPS[0], 0);

  // Game Route State
  private activeRoute: RouteDefinition = ROUTES[0];
  private currentStopIndex: number = 0;
  private currentLivery: BusLivery = BUS_LIVERIES[0];
  private activeCustomization?: BusCustomization;
  private cameraMode: number = 0; // Default 0: Driver Cockpit
  private timeOfDay: TimeOfDayId = 'day';
  private weather: WeatherId = 'sunny';
  private headlightsOn: boolean = false;
  private highBeam: boolean = false;
  private activeHornId: number = 0;

  // Rule Enforcement & Facilities Cooldowns
  private ruleAlert: RuleAlertEvent | null = null;
  private ruleAlertTimer = 0;
  private ruleAlertSeq = 0;
  private wrongWayCooldown = 0;
  private speedFineCooldown = 0;
  private lastRedLightJunction = '';
  private redLightCooldown = 0;
  private lastTollPaidId = '';
  private lastPoliceCheckId = '';
  private nearFacilityPrompt: FacilityPrompt | null = null;
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

  // Particles
  private rainLines!: THREE.LineSegments;
  private rainGeom!: THREE.BufferGeometry;
  private rainMat!: THREE.LineBasicMaterial;
  private rainCount = 1800;
  private sprayPoints!: THREE.Points;
  private sprayGeom!: THREE.BufferGeometry;
  private sprayMat!: THREE.PointsMaterial;
  private sprayCount = 70;
  private exhaustPoints!: THREE.Points;
  private exhaustGeom!: THREE.BufferGeometry;
  private exhaustMat!: THREE.PointsMaterial;
  private exhaustCount = 24;
  private exhaustPositions!: Float32Array;
  private exhaustAges!: Float32Array;
  private lightningTimer = 8;
  private lightningFlashDuration = 0;

  // Scores & Telemetry
  private passengersBoardedTotal = 0;
  private totalPassengersTarget = 18;
  private totalEarnings = 0;
  private fuelSpentTrip = 0;
  private tollsPaidTrip = 0;
  private satisfaction = 100;
  private routeTimeLeft = 210;
  private routeCompleted = false;
  private missionFailed = false;
  private boardingTimer = 0;
  private isBoardingActive = false;

  // Camera vectors
  private readonly _camCurrent = new THREE.Vector3(-74.8, 5, -168);
  private readonly _camLookAt = new THREE.Vector3(-74.8, 2, -148);
  private cinematicAngle = 0.55;

  // Settings & Upgrades
  private gameMode: GameMode = 'career';
  private speedUnit: SpeedUnit = 'kmh';
  private controlScheme: ControlScheme = 'both';
  private fareBonusMult: number = 1.0;
  private isShowcaseOrbit: boolean = false;
  private orbitAngle: number = 0.65;
  private distanceTraveledMeters: number = 0;

  // Input & pause
  private isPaused: boolean = true;
  private keysHeld: Record<string, boolean> = {};
  private mobileInputsActive = false;
  private onTelemetryCallback?: (t: GameTelemetry) => void;
  private onRouteFinishCallback?: (
    success: boolean,
    earnings: number,
    satisfaction: number,
    expenses?: { fuelSpent: number; tollsPaid: number; healthPct?: number; dirtinessPct?: number }
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
      expenses?: { fuelSpent: number; tollsPaid: number; healthPct?: number; dirtinessPct?: number }
    ) => void
  ) {
    this.mount = mount;
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
    if (spec) this.physics.setBusTopSpeed(spec.topSpeedKmh);

    this.totalPassengersTarget = route.stops.reduce((acc, sid) => {
      const stop = BUS_STOPS.find((st) => st.id === sid);
      return acc + (stop ? stop.passengersWaiting : 5);
    }, 0);

    this.initWebGL();
    this.initScene();
    this.initControls();
    this.startLoop();
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      this.keysHeld = {};
      this.mobileInputsActive = false;
      this.physics.setInputs(0, 0, false, this.physics.state.isReverse, false);
    }
  }

  public setGameMode(mode: GameMode) {
    this.gameMode = mode;
  }

  public setShowcaseOrbit(active: boolean) {
    this.isShowcaseOrbit = active;
  }

  public applySettings(settings: GameSettings) {
    this.speedUnit = settings.speedUnit;
    this.controlScheme = settings.controlScheme;
    this.cameraMode = settings.defaultCamera;
    this.targetFps = settings.targetFps ?? 60;
    this.physics.setSteeringSensitivity(settings.steeringSensitivity);
    this.physics.setAutoReverse(settings.autoReverse);
    this.physics.setManualGearbox(!!settings.manualGearbox);
    this.physics.setSpeedLimiter80(settings.speedLimiter80 ?? true);
    busAudio.setMasterVolume(settings.masterVolume);
    busAudio.setMusicVolume(settings.musicVolume ?? 45);

    if (this.renderer && !this.isSoftwareGl) {
      if (settings.graphicsQuality === 'low') {
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
      } else if (settings.graphicsQuality === 'medium') {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
        this.renderer.shadowMap.enabled = true;
      } else {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
      }
      this.dirLight.castShadow = this.renderer.shadowMap.enabled;
    }
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
    this.busModel.updateLivery(this.currentLivery, custom);
  }

  public static isWebGLSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', { powerPreference: 'default', failIfMajorPerformanceCaveat: false });
      return !!gl;
    } catch {
      return false;
    }
  }

  private initWebGL() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
      alpha: false,
    });

    this.isSoftwareGl = (() => {
      try {
        const gl = this.renderer.getContext();
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.setSize(this.mount.clientWidth, this.mount.clientHeight);
    this.mount.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.mount.clientWidth / this.mount.clientHeight,
      0.16,
      1150
    );
  }

  private initScene() {
    this.scene = new THREE.Scene();

    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch (e) {
      console.warn('RoomEnvironment reflection skipped on fallback GPU:', e);
    }

    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    this.dirLight.position.set(80, 120, 60);
    this.dirLight.castShadow = !this.isSoftwareGl;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 340;
    const d = 160;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x166534, 0.7);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(this.ambientLight);

    const maxAniso = this.isSoftwareGl ? 1 : Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.cityEnvironment = buildCoimbatoreCity(this.scene, maxAniso);
    this.trafficSystem = createTrafficSystem(this.scene);

    this.busModel = createCoimbatoreBus(this.currentLivery, maxAniso, this.isSoftwareGl);
    this.busModel.busGroup.rotation.order = 'YXZ';
    this.scene.add(this.busModel.busGroup);

    // 3D Holographic GPS Path Ribbon & Waypoint Chevrons
    this.gpsGuideGeom = new THREE.BufferGeometry();
    const initPts = new Float32Array(72 * 3);
    this.gpsGuideGeom.setAttribute('position', new THREE.BufferAttribute(initPts, 3));
    const gpsMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.78,
    });
    this.gpsGuideLine = new THREE.Line(this.gpsGuideGeom, gpsMat);
    this.gpsGuideLine.frustumCulled = false;
    this.scene.add(this.gpsGuideLine);

    const chevGeom = new THREE.ConeGeometry(0.42, 1.1, 3);
    chevGeom.rotateX(Math.PI / 2);
    const chevMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.72,
    });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(chevGeom, chevMat);
      m.visible = false;
      this.scene.add(m);
      this.gpsChevrons.push(m);
    }

    this.setTimeOfDay('day');
    this.positionBusAtRouteStart(this.activeRoute);
    this.setHeadlights(false);

    // 3D Rain LineSegments
    this.rainCount = 1800;
    this.rainGeom = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(this.rainCount * 2 * 3);
    for (let i = 0; i < this.rainCount; i++) {
      const rx = (Math.random() - 0.5) * 85;
      const ry = Math.random() * 26;
      const rz = (Math.random() - 0.5) * 85;
      rainPositions[i * 6 + 0] = rx;
      rainPositions[i * 6 + 1] = ry;
      rainPositions[i * 6 + 2] = rz;
      rainPositions[i * 6 + 3] = rx + 0.12;
      rainPositions[i * 6 + 4] = ry - 0.7;
      rainPositions[i * 6 + 5] = rz;
    }
    this.rainGeom.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(this.rainGeom, this.rainMat);
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);

    // Wheel Spray Particles
    this.sprayCount = 70;
    this.sprayGeom = new THREE.BufferGeometry();
    this.sprayGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.sprayCount * 3), 3));
    this.sprayMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.85,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.sprayPoints = new THREE.Points(this.sprayGeom, this.sprayMat);
    this.sprayPoints.visible = false;
    this.scene.add(this.sprayPoints);

    // Diesel Exhaust Particles
    this.exhaustGeom = new THREE.BufferGeometry();
    this.exhaustPositions = new Float32Array(this.exhaustCount * 3);
    this.exhaustAges = new Float32Array(this.exhaustCount);
    for (let i = 0; i < this.exhaustCount; i++) {
      this.exhaustAges[i] = i / this.exhaustCount;
    }
    this.exhaustGeom.setAttribute('position', new THREE.BufferAttribute(this.exhaustPositions, 3));
    this.exhaustMat = new THREE.PointsMaterial({
      color: 0x64748b,
      size: 0.65,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.exhaustPoints = new THREE.Points(this.exhaustGeom, this.exhaustMat);
    this.scene.add(this.exhaustPoints);
  }

  private positionBusAtRouteStart(route: RouteDefinition) {
    const firstStopId = route.stops[0];
    const firstStop = BUS_STOPS.find((s) => s.id === firstStopId) || BUS_STOPS[0];
    this.physics.reset(firstStop.x, firstStop.z, firstStop.idealHeading);
    this.busModel.setDoorOpen(false);
    this.isBoardingActive = false;
    this.boardingTimer = 0;

    const gy = getTerrainHeight(firstStop.x, firstStop.z);
    const fx = Math.sin(firstStop.idealHeading);
    const fz = Math.cos(firstStop.idealHeading);
    this._camCurrent.set(firstStop.x - fx * 13.5, gy + 4.65, firstStop.z - fz * 13.5);
    this._camLookAt.set(firstStop.x + fx * 6.5, gy + 2.25, firstStop.z + fz * 6.5);
    this.refreshNavigation(0);
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
    if (!this.mount || !this.renderer || !this.camera) return;
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
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
    if (success) {
      this.busModel.setDoorOpen(this.physics.state.doorOpen);
      if (this.physics.state.doorOpen && this.isBusAtActiveStop() && !this.isBoardingActive) {
        this.startBoardingSequence();
      }
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
    this.busModel.setDirtLevel?.(dirtinessPct);
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
    this.busModel.setDirtLevel?.(0);
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
    this.setHeadlights(!this.headlightsOn);
  }

  public toggleHighBeam() {
    if (!this.headlightsOn) {
      this.setHeadlights(true);
      this.highBeam = true;
    } else {
      this.highBeam = !this.highBeam;
    }
    this.busModel.leftHeadlight.intensity = this.headlightsOn ? (this.highBeam ? 6.5 : 4.0) : 0;
    this.busModel.rightHeadlight.intensity = this.headlightsOn ? (this.highBeam ? 6.5 : 4.0) : 0;
  }

  public setHeadlights(on: boolean) {
    this.headlightsOn = on;
    if (!on) this.highBeam = false;
    this.busModel.leftHeadlight.intensity = on ? (this.highBeam ? 6.5 : 4.0) : 0;
    this.busModel.rightHeadlight.intensity = on ? (this.highBeam ? 6.5 : 4.0) : 0;
    this.busModel.cabinLight.intensity = on ? 1.5 : 0.6;
  }

  public cycleCamera() {
    this.cameraMode = (this.cameraMode + 1) % CAMERA_MODES.length;
  }

  public setCameraMode(mode: number) {
    this.cameraMode = Math.max(0, Math.min(CAMERA_MODES.length - 1, mode));
  }

  public setLivery(livery: BusLivery) {
    this.currentLivery = livery;
    const spec = BUS_SHOP_SPECS.find((s) => s.liveryId === livery.id);
    if (spec) this.physics.setBusTopSpeed(spec.topSpeedKmh);
    this.busModel.updateLivery(livery, this.activeCustomization);
    this.activeHornId = livery.hornDefault;
  }

  public setTimeOfDay(id: TimeOfDayId) {
    this.timeOfDay = id;
    this.applyEnvironmentLighting();
  }

  public setWeather(weather: WeatherId) {
    this.weather = weather;
    this.physics.setWeather(weather);
    this.applyEnvironmentLighting();
  }

  public cycleWeather() {
    const list: WeatherId[] = ['sunny', 'cloudy', 'fog', 'rain'];
    const nextIdx = (list.indexOf(this.weather) + 1) % list.length;
    this.setWeather(list[nextIdx]);
  }

  private applyEnvironmentLighting() {
    const timePreset = TIME_OF_DAY_PRESETS.find((p) => p.id === this.timeOfDay) || TIME_OF_DAY_PRESETS[0];
    const weatherPreset = WEATHER_PRESETS.find((p) => p.id === this.weather) || WEATHER_PRESETS[0];

    let skyHex: number = timePreset.skyColor;
    let fogHex: number = timePreset.fogColor;

    if (this.weather === 'rain') {
      skyHex = timePreset.isNight ? 0x05070d : 0x1e293b;
      fogHex = timePreset.isNight ? 0x05070d : 0x273549;
    } else if (this.weather === 'fog') {
      skyHex = timePreset.isNight ? 0x0f172a : 0x94a3b8;
      fogHex = timePreset.isNight ? 0x1e293b : 0xcbd5e1;
    } else if (this.weather === 'cloudy') {
      skyHex = timePreset.isNight ? 0x070b14 : 0x64748b;
      fogHex = timePreset.isNight ? 0x070b14 : 0x94a3b8;
    }

    this.scene.background = new THREE.Color(skyHex);
    const baseDensity = 0.0026;
    this.scene.fog = new THREE.FogExp2(fogHex, baseDensity * weatherPreset.fogDensityMult);

    this.dirLight.color.setHex(timePreset.sunColor);
    this.dirLight.intensity = timePreset.sunIntensity * weatherPreset.skyDarken;
    this.hemiLight.color.setHex(timePreset.ambientColor);

    const shouldHeadlights = timePreset.isNight || this.weather === 'rain' || this.weather === 'fog';
    this.setHeadlights(shouldHeadlights);

    if (timePreset.isNight) {
      this.dirLight.position.set(-20, 40, -30);
    } else {
      this.dirLight.position.set(80, 120, 60);
    }

    this.busModel.updateWetLook(this.weather === 'rain' || this.weather === 'fog');
    this.cityEnvironment.setAtmosphere(this.timeOfDay, this.weather, timePreset.isNight);
    this.trafficSystem.setTrafficLights(shouldHeadlights);
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
    this.routeTimeLeft = route.targetSeconds;
    this.routeCompleted = false;
    this.missionFailed = false;
    this.ruleAlert = null;
    this.announcementText = null;
    this.positionBusAtRouteStart(route);
  }

  public setMobileInput(throttle: number, steer: number, brake: boolean, reverse: boolean) {
    this.mobileInputsActive = throttle !== 0 || steer !== 0 || brake;
    this.physics.setInputs(throttle, steer, brake, reverse);
    busAudio.startEngine();
    busAudio.startAmbientMusic();
  }

  private isBusAtActiveStop(): boolean {
    const activeStop = this.getActiveStop();
    if (!activeStop) return false;
    const dist = Math.hypot(this.physics.state.x - activeStop.x, this.physics.state.z - activeStop.z);
    return dist <= activeStop.radius + 1.5;
  }

  private getActiveStop() {
    const stopId = this.activeRoute.stops[this.currentStopIndex];
    return BUS_STOPS.find((s) => s.id === stopId) || BUS_STOPS[0];
  }

  private refreshNavigation(timeSec: number) {
    const s = this.physics.state;
    const activeStop = this.getActiveStop();
    this.cachedAdvice = navigationGraph.computeAdvice(s.x, s.z, s.heading, activeStop, timeSec);

    const pts = this.cachedAdvice.waypoints;
    const posAttr = this.gpsGuideGeom.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const maxPts = 72;
    const count = Math.min(pts.length, maxPts);
    for (let i = 0; i < count; i++) {
      const px = pts[i].x;
      const pz = pts[i].z;
      arr[i * 3 + 0] = px;
      arr[i * 3 + 1] = getTerrainHeight(px, pz) + 0.08;
      arr[i * 3 + 2] = pz;
    }
    this.gpsGuideGeom.setDrawRange(0, count);
    posAttr.needsUpdate = true;

    let chevIdx = 0;
    for (let i = 0; i < count - 1 && chevIdx < this.gpsChevrons.length; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const segLen = Math.hypot(p1.x - p0.x, p1.z - p0.z);
      if (segLen < 4) continue;
      const yaw = Math.atan2(p1.x - p0.x, p1.z - p0.z);
      const steps = Math.max(1, Math.min(3, Math.floor(segLen / 22)));
      for (let st = 1; st <= steps && chevIdx < this.gpsChevrons.length; st++) {
        const frac = st / (steps + 1);
        const cx = p0.x + (p1.x - p0.x) * frac;
        const cz = p0.z + (p1.z - p0.z) * frac;
        const m = this.gpsChevrons[chevIdx++];
        m.visible = true;
        m.position.set(cx, getTerrainHeight(cx, cz) + 0.14, cz);
        m.rotation.y = yaw;
      }
    }
    for (let k = chevIdx; k < this.gpsChevrons.length; k++) {
      this.gpsChevrons[k].visible = false;
    }
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
    this.ticketsIssued += count;
    const earned = Math.round(count * rate * this.fareBonusMult);
    this.totalEarnings += earned;
    busAudio.playTicketPunch();
    setTimeout(() => busAudio.playFareChime(), 160);

    const s = this.physics.state;
    const fx = Math.sin(s.heading);
    const fz = Math.cos(s.heading);
    const idealMatch = fx * Math.sin(stop.idealHeading) + fz * Math.cos(stop.idealHeading);
    if (idealMatch > 0.72) {
      this.triggerRuleAlert(`SAFE KERB STOP + ${count} TICKETS ISSUED`, TRAFFIC_RULES.safeStopBonus, false);
    }

    if (this.currentStopIndex < this.activeRoute.stops.length - 1) {
      this.currentStopIndex++;
      const nextStop = this.getActiveStop();
      if (nextStop) {
        this.announcementText = `Departing for ${nextStop.nameEn} (${nextStop.nameTa})`;
        this.announcementTimer = 4.5;
        busAudio.announceBusStop(nextStop.nameEn, true);
      }
      this.refreshNavigation(this.clock.getElapsedTime());
    } else if (this.gameMode === 'career') {
      this.routeCompleted = true;
      this.totalEarnings += Math.round(this.activeRoute.baseReward * this.fareBonusMult);
      if (this.onRouteFinishCallback) {
        this.onRouteFinishCallback(true, this.totalEarnings, this.satisfaction, {
          fuelSpent: this.fuelSpentTrip,
          tollsPaid: this.tollsPaidTrip,
          healthPct: this.physics.state.healthPct,
          dirtinessPct: this.physics.state.dirtinessPct,
        });
      }
    } else {
      this.triggerRuleAlert('FREE ROAM DESTINATION REACHED!', 50, false);
    }
  }

  private startLoop() {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = (nowMs: number = performance.now()) => {
      if (!this.isSoftwareGl && this.targetFps > 0) {
        const minDeltaMs = 1000 / this.targetFps - 1.5;
        if (nowMs - this.lastRenderMs < minDeltaMs) {
          this.frameId = requestAnimationFrame(tick);
          return;
        }
        this.lastRenderMs = nowMs;
      }

      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);

      this.updateSimulation(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        afterDraw(() => tick(performance.now()));
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      afterDraw(() => tick(performance.now()));
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private updateSimulation(dt: number) {
    const elapsedTime = this.clock.getElapsedTime();

    // Replay Playback Mode
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
      this.busModel.busGroup.position.set(f.x, f.y, f.z);
      this.busModel.busGroup.rotation.y = f.heading;
      this.busModel.busGroup.rotation.x = 0;
      this.busModel.busGroup.rotation.z = 0;
      this.updateCamera(dt);
      this.emitTelemetrySnapshot(f.gear, false, false, 80, elapsedTime);
      return;
    }

    if (this.isPaused) {
      const s = this.physics.state;
      this.busModel.busGroup.position.set(s.x, s.y, s.z);
      this.busModel.busGroup.rotation.y = s.heading;
      this.busModel.busGroup.rotation.x = s.pitchTilt - s.terrainPitch;
      this.busModel.busGroup.rotation.z = s.rollTilt;

      if (this.isShowcaseOrbit) {
        this.orbitAngle += dt * 0.22;
        const radius = 12.2;
        this.camera.position.set(
          s.x + Math.sin(this.orbitAngle) * radius,
          s.y + 3.6,
          s.z + Math.cos(this.orbitAngle) * radius
        );
        this.camera.lookAt(s.x, s.y + 1.5, s.z);
      } else {
        this.updateCamera(dt);
      }
      return;
    }

    // 1. Process Keyboard Inputs + Clutch
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

    // 2. Step Bus Physics
    const { hitObstacle } = this.physics.update(dt, this.cityEnvironment.colliders);
    if (hitObstacle) {
      this.satisfaction = Math.max(0, this.satisfaction - 6);
      this.triggerRuleAlert('COLLISION DAMAGE & PENALTY', TRAFFIC_RULES.collisionFine, true);
    }

    // 3. Step Traffic Subsystem
    const trafficRes = this.trafficSystem.updateTraffic(
      dt,
      this.physics.state.x,
      this.physics.state.z,
      this.physics.state.heading,
      elapsedTime
    );
    if (trafficRes.collided) {
      this.physics.handleCollisionImpact(1.2);
      this.satisfaction = Math.max(0, this.satisfaction - 10);
      this.triggerRuleAlert('TRAFFIC COLLISION', TRAFFIC_RULES.collisionFine, true);
    }

    // 4. Update Bus 3D Transform (YXZ slope-aware)
    const s = this.physics.state;
    this.busModel.busGroup.position.set(s.x, s.y, s.z);
    this.busModel.busGroup.rotation.y = s.heading;
    this.busModel.busGroup.rotation.x = s.pitchTilt - s.terrainPitch;
    this.busModel.busGroup.rotation.z = s.rollTilt;

    const rollAngle = (s.speedKmh * 1000 * dt) / (3600 * 0.55);
    this.busModel.updateWheelTurn(s.steerAngle, rollAngle);

    // 5. Rule Enforcement & Zone Speed Limits
    if (this.wrongWayCooldown > 0) this.wrongWayCooldown -= dt;
    if (this.speedFineCooldown > 0) this.speedFineCooldown -= dt;
    if (this.redLightCooldown > 0) this.redLightCooldown -= dt;
    if (this.ruleAlertTimer > 0) {
      this.ruleAlertTimer -= dt;
      if (this.ruleAlertTimer <= 0) this.ruleAlert = null;
    }

    const isWrongWay = checkWrongWay(s.x, s.z, s.heading, s.speedKmh);
    if (isWrongWay && this.wrongWayCooldown <= 0) {
      this.wrongWayCooldown = 4.5;
      this.triggerRuleAlert('WRONG WAY! KEEP LEFT', TRAFFIC_RULES.wrongWayFine, true);
    }

    const zoneLimit = getZoneSpeedLimit(s.x, s.z);
    const isSpeeding = s.speedKmh > zoneLimit + 5;
    if (isSpeeding && this.speedFineCooldown <= 0) {
      this.speedFineCooldown = 6.0;
      this.triggerRuleAlert(`OVERSPEEDING (>${zoneLimit} KM/H)`, 25, true);
    }

    if (s.speedKmh > 12 && this.redLightCooldown <= 0) {
      const fx = Math.sin(s.heading);
      const fz = Math.cos(s.heading);
      for (const ix of ROAD_NETWORK.verticalX) {
        for (const iz of ROAD_NETWORK.horizontalZ) {
          if (Math.abs(s.x - ix) < 9.5 && Math.abs(s.z - iz) < 9.5) {
            const jKey = `${ix}_${iz}`;
            if (this.lastRedLightJunction !== jKey) {
              const sig = getSignalState(ix, iz, elapsedTime);
              const myLight = Math.abs(fz) > Math.abs(fx) ? sig.ns : sig.ew;
              if (myLight === 'red') {
                this.lastRedLightJunction = jKey;
                this.redLightCooldown = 5.0;
                this.triggerRuleAlert('RED LIGHT VIOLATION!', TRAFFIC_RULES.redLightFine, true);
              }
            }
          }
        }
      }
    }

    if (this.announcementTimer > 0) {
      this.announcementTimer -= dt;
      if (this.announcementTimer <= 0) this.announcementText = null;
    }

    // Highway Facility Interactions (Tolls, Petrol Bunks, Rail Gates, Bridges, Rest Stops, Police, Construction)
    let foundFacility: FacilityPrompt | null = null;
    for (const fac of HIGHWAY_FACILITIES) {
      const distF = Math.hypot(s.x - fac.x, s.z - fac.z);
      if (distF <= fac.radius) {
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

    const activeZoneLimit =
      foundFacility?.type === 'construction' ? Math.min(zoneLimit, 40) : zoneLimit;

    // Sync Mud/Dirtiness Visual & Record Replay Keyframes
    this.busModel.setDirtLevel?.(s.dirtinessPct);
    this.replayRecordTimer += dt;
    if (this.replayRecordTimer >= 0.16 && this.replayFrames.length < 2400) {
      this.replayRecordTimer = 0;
      const baseT = this.replayFrames.length === 0 ? 0 : this.replayFrames[this.replayFrames.length - 1].t + 0.16;
      this.replayFrames.push({
        t: baseT,
        x: s.x,
        y: s.y,
        z: s.z,
        heading: s.heading,
        speedKmh: Math.round(Math.abs(s.speedKmh)),
        gear: s.gear,
      });
    }

    // 6. Stop, GPS & Passengers
    const activeStop = this.getActiveStop();
    const isAtStop = this.isBusAtActiveStop();
    this.cityEnvironment.updatePassengers(activeStop.id, isAtStop && s.doorOpen);

    this.navRefreshTimer -= dt;
    if (this.navRefreshTimer <= 0) {
      this.navRefreshTimer = 0.14;
      this.refreshNavigation(elapsedTime);
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
          });
        }
      }
    } else if (this.gameMode === 'free') {
      this.routeTimeLeft = Math.max(0, this.routeTimeLeft);
    }

    // 7. Weather Particles & Lightning (Sunny / Cloudy / Fog / Rain)
    const isRaining = this.weather === 'rain' || this.weather === 'cloudy';
    if (!isRaining) {
      if (this.rainLines) this.rainLines.visible = false;
      if (this.sprayPoints) this.sprayPoints.visible = false;
    } else {
      const isMonsoon = this.weather === 'rain';
      if (this.rainLines) {
        this.rainLines.visible = isMonsoon; // Cloudy has light mist without streaks
        if (isMonsoon) {
          const fallSpeed = 44;
          const posAttr = this.rainGeom.attributes.position as THREE.BufferAttribute;
          const arr = posAttr.array as Float32Array;
          for (let i = 0; i < this.rainCount; i++) {
            arr[i * 6 + 1] -= fallSpeed * dt;
            arr[i * 6 + 4] -= fallSpeed * dt;
            if (arr[i * 6 + 4] < s.y) {
              const newX = s.x + (Math.random() - 0.5) * 85;
              const newZ = s.z + (Math.random() - 0.5) * 85;
              const newY = s.y + 24 + Math.random() * 4;
              arr[i * 6 + 0] = newX;
              arr[i * 6 + 1] = newY;
              arr[i * 6 + 2] = newZ;
              arr[i * 6 + 3] = newX + 0.22;
              arr[i * 6 + 4] = newY - 0.95;
              arr[i * 6 + 5] = newZ;
            }
          }
          posAttr.needsUpdate = true;
          this.rainMat.opacity = 0.72;
        }
      }

      if (this.sprayPoints) {
        if (isMonsoon && Math.abs(s.speedKmh) > 10) {
          this.sprayPoints.visible = true;
          const sprayAttr = this.sprayGeom.attributes.position as THREE.BufferAttribute;
          const sprayArr = sprayAttr.array as Float32Array;
          const forwardX = Math.sin(s.heading);
          const forwardZ = Math.cos(s.heading);
          const lateralX = Math.cos(s.heading);
          const lateralZ = -Math.sin(s.heading);

          for (let p = 0; p < this.sprayCount; p++) {
            const side = p % 2 === 0 ? -1.2 : 1.2;
            const spread = (Math.random() - 0.5) * 0.9;
            const backDist = 2.6 + Math.random() * 4.2 * (Math.abs(s.speedKmh) / 60);
            sprayArr[p * 3 + 0] = s.x - forwardX * backDist + lateralX * (side + spread);
            sprayArr[p * 3 + 1] = s.y + 0.2 + Math.random() * 0.9;
            sprayArr[p * 3 + 2] = s.z - forwardZ * backDist + lateralZ * (side + spread);
          }
          sprayAttr.needsUpdate = true;
          this.sprayMat.opacity = 0.45;
        } else {
          this.sprayPoints.visible = false;
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
        this.dirLight.intensity = 3.6;
        this.hemiLight.color.setHex(0xe0f2fe);
      } else {
        const timePreset = TIME_OF_DAY_PRESETS.find((p) => p.id === this.timeOfDay) || TIME_OF_DAY_PRESETS[0];
        this.dirLight.intensity = timePreset.sunIntensity * 0.48;
        this.hemiLight.color.setHex(0x334155);
      }
    }

    const wipersActive = this.weather === 'rain' || s.manualWipers;
    this.busModel.updateWipers(wipersActive, elapsedTime, this.weather === 'rain' ? 1.0 : 0.45);
    this.busModel.setSignalStates?.({
      headlights: this.headlightsOn,
      highBeam: this.highBeam,
      braking: s.isBraking,
      reverse: s.gear === 'R',
      leftSignal: s.leftIndicator || s.hazardLights,
      rightSignal: s.rightIndicator || s.hazardLights,
      gear: s.gear,
      gearShiftAnim: s.gearShiftAnim,
      time: elapsedTime,
    });

    // Live 3D Cockpit Instrument Cluster Refresh (~15 Hz)
    this.dashRefreshTimer -= dt;
    if (this.dashRefreshTimer <= 0) {
      this.dashRefreshTimer = 0.065;
      const blinkPhase = Math.sin(elapsedTime * 8.5) > 0;
      this.busModel.updateDashboard?.({
        speedKmh: Math.round(Math.abs(s.speedKmh)),
        rpm: Math.round(s.rpm),
        fuelPct: s.fuelPct,
        engineTempC: s.engineTempC,
        gear: s.gear,
        leftInd: s.leftIndicator || s.hazardLights,
        rightInd: s.rightIndicator || s.hazardLights,
        highBeam: this.highBeam,
        parkingBrake: s.parkingBrake,
        blinkOn: blinkPhase,
      });
    }

    this.cityEnvironment.updateEnvironment(elapsedTime);

    // Exhaust smoke puffs from rear-right tailpipe
    const exForwardX = Math.sin(s.heading);
    const exForwardZ = Math.cos(s.heading);
    const exLatX = Math.cos(s.heading);
    const exLatZ = -Math.sin(s.heading);
    const pipeX = s.x - exForwardX * 4.95 - exLatX * 0.92;
    const pipeZ = s.z - exForwardZ * 4.95 - exLatZ * 0.92;
    const isAccelerating = s.throttleInput > 0.2 && !s.doorOpen;
    this.exhaustMat.opacity = isAccelerating ? 0.34 : 0.14;

    for (let i = 0; i < this.exhaustCount; i++) {
      this.exhaustAges[i] += dt * (isAccelerating ? 1.5 : 0.75);
      if (this.exhaustAges[i] >= 1) {
        this.exhaustAges[i] = 0;
        this.exhaustPositions[i * 3 + 0] = pipeX + (Math.random() - 0.5) * 0.15;
        this.exhaustPositions[i * 3 + 1] = s.y + 0.44;
        this.exhaustPositions[i * 3 + 2] = pipeZ + (Math.random() - 0.5) * 0.15;
      } else {
        this.exhaustPositions[i * 3 + 0] -= exForwardX * dt * 2.2 + (Math.random() - 0.5) * 0.04;
        this.exhaustPositions[i * 3 + 1] += dt * (0.5 + this.exhaustAges[i] * 0.8);
        this.exhaustPositions[i * 3 + 2] -= exForwardZ * dt * 2.2 + (Math.random() - 0.5) * 0.04;
      }
    }
    this.exhaustGeom.attributes.position.needsUpdate = true;

    // 8. Update Camera
    this.updateCamera(dt);

    // 9. Emit Telemetry
    this.emitTelemetrySnapshot(s.gear, isWrongWay, isSpeeding, activeZoneLimit, elapsedTime);
  }

  private emitTelemetrySnapshot(
    gearStr: string,
    isWrongWay: boolean,
    isSpeeding: boolean,
    zoneLimit: number,
    _elapsedTime: number
  ) {
    if (!this.onTelemetryCallback) return;
    const s = this.physics.state;
    const activeStop = this.getActiveStop();
    const isAtStop = this.isBusAtActiveStop();
    const dist = Math.hypot(s.x - activeStop.x, s.z - activeStop.z);
    const wipersActive = this.weather === 'rain' || s.manualWipers;
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
      isAtStop,
      canOpenDoors: isAtStop && Math.abs(s.speedKmh) < 2,
      doorsOpen: s.doorOpen,
      parkingBrake: s.parkingBrake,
      clutchPressed: s.clutchPressed,
      manualGearbox: s.manualGearbox,
      passengersBoarded: this.passengersBoardedTotal,
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
      wipersOn: wipersActive,
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
      nextManeuver: this.cachedAdvice.maneuver,
      maneuverDistance: this.cachedAdvice.distanceMeters,
      nextRoadName: this.cachedAdvice.nextRoadName,
      routePolyline: this.cachedAdvice.waypoints,
      trafficDots: this.trafficSystem.vehicles.map((v) => ({ x: v.x, z: v.z })),
      isWrongWay,
      isSpeeding,
      zoneSpeedLimitKmh: zoneLimit,
      upcomingSignal: this.cachedAdvice.upcomingSignal,
      upcomingSignalDistance: this.cachedAdvice.upcomingSignalDistance,
      ruleAlert: this.ruleAlert,
      nearFacilityPrompt: this.nearFacilityPrompt,
      gameMode: this.gameMode,
      speedUnit: this.speedUnit,
      estimatedArrivalSec: this.cachedAdvice.estimatedArrivalSec,
      totalDistanceTraveledM: Math.round(this.distanceTraveledMeters),
      isReplaying: this.isReplaying,
      replayPaused: this.replayPaused,
      replayProgressPct: replayPct,
      replayFrameCount: this.replayFrames.length,
      replaySpeedMult: this.replaySpeedMult,
    });
  }

  private updateCamera(dt: number) {
    const s = this.physics.state;
    const forwardX = Math.sin(s.heading);
    const forwardZ = Math.cos(s.heading);
    const cosH = Math.cos(s.heading);
    const sinH = Math.sin(s.heading);
    const speedRatio = Math.min(Math.abs(s.speedKmh) / 85, 1);

    const targetFov =
      this.cameraMode === 0
        ? this.mirrorWide
          ? 76
          : 68
        : this.cameraMode === 1
        ? 64
        : this.cameraMode === 4
        ? 64
        : 58 + speedRatio * 9;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, 5 * dt);
      this.camera.updateProjectionMatrix();
    }

    if (this.cameraMode === 0) {
      // 0: Driver Cockpit View (1st-person RHD eye behind steering wheel & live gauges, with adjustable seat height!)
      const localX = -0.66;
      const localZ = 3.36;
      const cabinX = s.x + localX * cosH + localZ * sinH;
      const cabinZ = s.z - localX * sinH + localZ * cosH;
      const lookHeading = s.heading + s.steerAngle * 0.35;
      const eyeY = s.y + 2.08 + this.seatOffsetY + s.suspensionBounce * 0.6;
      this.camera.position.set(cabinX, eyeY, cabinZ);
      this.camera.lookAt(
        cabinX + Math.sin(lookHeading) * 26,
        eyeY - 0.35 - (s.pitchTilt - s.terrainPitch) * 14,
        cabinZ + Math.cos(lookHeading) * 26
      );
    } else if (this.cameraMode === 1) {
      // 1: Front Camera (Low Front Bumper Highway View)
      const frontX = s.x + forwardX * 5.05;
      const frontZ = s.z + forwardZ * 5.05;
      this.camera.position.set(frontX, s.y + 1.15, frontZ);
      this.camera.lookAt(
        frontX + forwardX * 32,
        s.y + 1.05 - (s.pitchTilt - s.terrainPitch) * 18,
        frontZ + forwardZ * 32
      );
    } else if (this.cameraMode === 2) {
      // 2: Rear Camera (Reverse & Tail Mirror)
      const rearX = s.x - forwardX * 4.88;
      const rearZ = s.z - forwardZ * 4.88;
      this.camera.position.set(rearX, s.y + 2.45, rearZ);
      this.camera.lookAt(rearX - forwardX * 24, s.y + 1.35, rearZ - forwardZ * 24);
    } else if (this.cameraMode === 3) {
      // 3: Exterior Third-Person Chase
      const camDist = 13.5 + speedRatio * 1.2;
      const targetCamX = s.x - forwardX * camDist;
      const targetCamZ = s.z - forwardZ * camDist;
      const targetCamY = s.y + 4.75;

      this._camCurrent.x += (targetCamX - this._camCurrent.x) * Math.min(1, 8 * dt);
      this._camCurrent.y += (targetCamY - this._camCurrent.y) * Math.min(1, 8 * dt);
      this._camCurrent.z += (targetCamZ - this._camCurrent.z) * Math.min(1, 8 * dt);

      this.camera.position.copy(this._camCurrent);
      this._camLookAt.set(s.x + forwardX * 6.5, s.y + 2.25, s.z + forwardZ * 6.5);
      this.camera.lookAt(this._camLookAt);
    } else if (this.cameraMode === 4) {
      // 4: Passenger View (Inside Left-Row Window Seat)
      const localX = 0.65;
      const localZ = -0.35;
      const paxX = s.x + localX * cosH + localZ * sinH;
      const paxZ = s.z - localX * sinH + localZ * cosH;
      this.camera.position.set(paxX, s.y + 1.92 + s.suspensionBounce * 0.5, paxZ);
      this.camera.lookAt(
        s.x + forwardX * 16 + 0.1 * cosH,
        s.y + 1.85,
        s.z + forwardZ * 16 - 0.1 * sinH
      );
    } else {
      // 5: Cinematic Cam (Smooth orbiting tracking angle)
      this.cinematicAngle += dt * 0.25;
      const radius = 14.5;
      const orbitAngle = s.heading + Math.PI * 0.72 + Math.sin(this.cinematicAngle) * 0.45;
      this.camera.position.set(
        s.x + Math.sin(orbitAngle) * radius,
        s.y + 4.2 + Math.sin(this.cinematicAngle * 0.7) * 0.8,
        s.z + Math.cos(orbitAngle) * radius
      );
      this.camera.lookAt(s.x + forwardX * 2.5, s.y + 1.75, s.z + forwardZ * 2.5);
    }
  }

  public dispose() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('resize', this.handleResize);
    this.trafficSystem.dispose();
    this.renderer.dispose();
  }
}
