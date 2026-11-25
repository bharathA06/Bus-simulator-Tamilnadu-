import * as THREE from 'three';
import { busAudio } from '../audio/busAudio';
import { ROAD_NETWORK, WeatherId, WEATHER_PRESETS, getTerrainHeight } from './constants';

export interface BusPhysicsState {
  x: number;
  y: number;
  z: number;
  speedKmh: number;
  rpm: number;
  airPressure: number; // PSI (85-120)
  fuelPct: number; // 0..100%
  engineTempC: number; // 78..108 C
  engineRunning: boolean;
  fatiguePct: number; // 0..100%
  healthPct: number; // 0..100%
  dirtinessPct: number; // 0..100%
  steerAngle: number;
  heading: number; // radians
  gear: 'R' | 'N' | '1' | '2' | '3' | '4' | '5' | '6';
  rollTilt: number;
  pitchTilt: number;
  terrainPitch: number;
  suspensionBounce: number;
  isBraking: boolean;
  serviceBrakePedal: number; // 0..1 analog foot brake
  parkingBrake: boolean;
  clutchPressed: boolean;
  manualGearbox: boolean;
  manualGearIndex: number; // -1=R, 0=N, 1..6
  gearShiftAnim: number; // 0..1 countdown for animated hand on gearstick
  isReverse: boolean;
  leftIndicator: boolean;
  rightIndicator: boolean;
  hazardLights: boolean;
  manualWipers: boolean;
  cruiseControlSpeed: number | null;
  throttleInput: number;
  steerInput: number;
  handbrake: boolean;
  doorOpen: boolean;
  weather: WeatherId;
  gripFactor: number;
  isDrifting: boolean;
  driftAngle: number;
  passengersOnboard: number;
  totalMassKg: number;
}

export class BusPhysics {
  public state: BusPhysicsState = {
    x: -234.8,
    y: 0,
    z: -165,
    speedKmh: 0,
    rpm: 0,
    airPressure: 115,
    fuelPct: 96,
    engineTempC: 76,
    engineRunning: false,
    fatiguePct: 6,
    healthPct: 100,
    dirtinessPct: 8,
    steerAngle: 0,
    heading: 0,
    gear: 'N',
    rollTilt: 0,
    pitchTilt: 0,
    terrainPitch: 0,
    suspensionBounce: 0,
    isBraking: false,
    serviceBrakePedal: 0,
    parkingBrake: false,
    clutchPressed: false,
    manualGearbox: false,
    manualGearIndex: 0,
    gearShiftAnim: 0,
    isReverse: false,
    leftIndicator: false,
    rightIndicator: false,
    hazardLights: false,
    manualWipers: false,
    cruiseControlSpeed: null,
    throttleInput: 0,
    steerInput: 0,
    handbrake: false,
    doorOpen: false,
    weather: 'sunny',
    gripFactor: 1.0,
    isDrifting: false,
    driftAngle: 0,
    passengersOnboard: 0,
    totalMassKg: 11200,
  };

  private readonly _forward = new THREE.Vector3();
  private readonly _lateral = new THREE.Vector3();
  private _wheelbase = 6.2;
  private _busBaseMassKg = 11200;
  private readonly _maxSteerAngle = 0.58;
  private _maxForwardSpeed = 80;
  private _speedLimiter80 = true;
  private readonly _maxReverseSpeed = 24;
  private _wasBraking = false;
  private _hitCooldown = 0;
  private _indicatorPhase = 0;
  private _prevBlinkOn = false;
  private _roadPhase = 0;
  private _smoothedSteerInput = 0;
  private _indicatorEngagedTurnPeak = false;
  private _steeringSensitivity = 1.0;
  private _autoReverse = true;
  private _torqueBonus = 1.0;
  private _brakeBonus = 1.0;
  private _gripBonus = 0;
  private _fuelSaverMult = 1.0;
  private _prevGear: string = 'N';

  constructor() {
    this.reset(-234.8, -165, 0);
  }

  public reset(x: number, z: number, heading: number = 0) {
    this.state.x = x;
    this.state.y = getTerrainHeight(x, z);
    this.state.z = z;
    this.state.speedKmh = 0;
    this.state.rpm = 0;
    this.state.airPressure = 115;
    this.state.fuelPct = 96;
    this.state.engineTempC = 76;
    this.state.engineRunning = false;
    this.state.fatiguePct = 5;
    this.state.steerAngle = 0;
    this.state.heading = heading;
    this.state.gear = 'N';
    this.state.manualGearIndex = 0;
    this.state.gearShiftAnim = 0;
    this.state.rollTilt = 0;
    this.state.pitchTilt = 0;
    this.state.terrainPitch = 0;
    this.state.suspensionBounce = 0;
    this.state.isBraking = false;
    this.state.serviceBrakePedal = 0;
    this.state.parkingBrake = false;
    this.state.clutchPressed = false;
    this.state.handbrake = false;
    this.state.throttleInput = 0;
    this.state.steerInput = 0;
    this.state.isReverse = false;
    this.state.leftIndicator = false;
    this.state.rightIndicator = false;
    this.state.hazardLights = false;
    this.state.manualWipers = false;
    this.state.cruiseControlSpeed = null;
    this.state.doorOpen = false;
    this.state.isDrifting = false;
    this.state.driftAngle = 0;
    this.state.passengersOnboard = 0;
    this.state.totalMassKg = this._busBaseMassKg;
    this._wasBraking = false;
    this._hitCooldown = 0;
    this._indicatorPhase = 0;
    this._prevBlinkOn = false;
    this._smoothedSteerInput = 0;
    this._indicatorEngagedTurnPeak = false;
    this._prevGear = 'N';
  }

  public setBusSpecs(weightKg: number, lengthMeters: number) {
    this._busBaseMassKg = Math.max(8500, Math.min(18000, weightKg));
    this._wheelbase = Math.max(5.5, Math.min(7.8, lengthMeters * 0.54));
    this.state.totalMassKg = this._busBaseMassKg + this.state.passengersOnboard * 68;
  }

  public setPassengersCount(count: number) {
    this.state.passengersOnboard = Math.max(0, Math.min(80, Math.round(count)));
    this.state.totalMassKg = this._busBaseMassKg + this.state.passengersOnboard * 68;
  }

  public toggleIgnition(): boolean {
    this.state.engineRunning = !this.state.engineRunning;
    if (this.state.engineRunning) {
      this.state.rpm = 720;
      busAudio.playIgnitionCrank();
      busAudio.startEngine();
    } else {
      this.state.cruiseControlSpeed = null;
      this.state.rpm = 0;
    }
    return this.state.engineRunning;
  }

  public setEngineRunning(running: boolean) {
    if (running === this.state.engineRunning) return;
    this.toggleIgnition();
  }

  public setSpeedLimiter80(enabled: boolean) {
    this._speedLimiter80 = enabled;
  }

  public setCondition(healthPct: number, dirtinessPct: number) {
    this.state.healthPct = Math.max(10, Math.min(100, healthPct));
    this.state.dirtinessPct = Math.max(0, Math.min(100, dirtinessPct));
  }

  public repairBus() {
    this.state.healthPct = 100;
    this.state.engineTempC = 82;
    busAudio.playGearShift();
  }

  public washBus() {
    this.state.dirtinessPct = 0;
    busAudio.playRefuelSound();
  }

  public restBreak() {
    this.state.fatiguePct = 0;
    busAudio.playFareChime();
  }

  public setWeather(weather: WeatherId) {
    this.state.weather = weather;
    const preset = WEATHER_PRESETS.find((p) => p.id === weather);
    const baseGrip = preset ? preset.gripFactor : 1.0;
    this.state.gripFactor = Math.min(1.08, baseGrip + (weather !== 'sunny' ? this._gripBonus : 0));
    busAudio.setWeather(weather);
  }

  public setSteeringSensitivity(sensitivity: number) {
    this._steeringSensitivity = Math.max(0.4, Math.min(2.0, sensitivity));
  }

  public setAutoReverse(enabled: boolean) {
    this._autoReverse = enabled;
  }

  public setManualGearbox(enabled: boolean) {
    this.state.manualGearbox = enabled;
    if (enabled) {
      const idx =
        this.state.gear === 'R'
          ? -1
          : this.state.gear === 'N'
          ? 0
          : Math.max(1, Math.min(6, Number(this.state.gear) || 1));
      this.state.manualGearIndex = idx;
    }
  }

  public setBusTopSpeed(topSpeedKmh: number) {
    this._maxForwardSpeed = Math.max(72, Math.min(102, topSpeedKmh));
  }

  public setUpgradeModifiers(mods: {
    torqueBonus: number;
    brakeBonus: number;
    gripBonus: number;
    fuelSaverMult?: number;
  }) {
    this._torqueBonus = mods.torqueBonus;
    this._brakeBonus = mods.brakeBonus;
    this._gripBonus = mods.gripBonus;
    if (mods.fuelSaverMult !== undefined) this._fuelSaverMult = mods.fuelSaverMult;
    this.setWeather(this.state.weather);
  }

  public setInputs(
    throttle: number,
    steer: number,
    brake: boolean | number,
    reverse?: boolean,
    clutch: boolean = false,
    handbrakeOverride?: boolean
  ) {
    this.state.throttleInput = Math.max(-1, Math.min(1, throttle));
    this.state.steerInput = Math.max(-1, Math.min(1, steer * this._steeringSensitivity));
    if (typeof brake === 'number') {
      this.state.serviceBrakePedal = Math.max(0, Math.min(1, brake));
      this.state.handbrake = !!handbrakeOverride;
    } else {
      this.state.serviceBrakePedal = brake ? 1 : 0;
      this.state.handbrake = handbrakeOverride !== undefined ? handbrakeOverride : brake;
    }
    if (reverse !== undefined) {
      this.state.isReverse = reverse;
    }
    this.state.clutchPressed = clutch;

    if (
      this.state.serviceBrakePedal > 0.05 ||
      this.state.handbrake ||
      this.state.isReverse ||
      this.state.throttleInput < -0.1
    ) {
      this.state.cruiseControlSpeed = null;
    }
  }

  public toggleReverse(): boolean {
    if (this.state.manualGearbox) {
      this.state.manualGearIndex = this.state.manualGearIndex === -1 ? 0 : -1;
      this.state.isReverse = this.state.manualGearIndex === -1;
      this.syncManualGearLabel();
      this.state.gearShiftAnim = 1.0;
      busAudio.playGearShift();
    } else {
      this.state.isReverse = !this.state.isReverse;
      busAudio.playAirBrakeHiss();
    }
    this.state.cruiseControlSpeed = null;
    return this.state.isReverse;
  }

  public toggleParkingBrake(): boolean {
    this.state.parkingBrake = !this.state.parkingBrake;
    this.state.cruiseControlSpeed = null;
    busAudio.playAirBrakeHiss();
    return this.state.parkingBrake;
  }

  private syncManualGearLabel() {
    const idx = this.state.manualGearIndex;
    this.state.gear = idx === -1 ? 'R' : idx === 0 ? 'N' : (String(idx) as '1' | '2' | '3' | '4' | '5' | '6');
  }

  public shiftGearUp() {
    if (!this.state.manualGearbox) return;
    if (this.state.manualGearIndex < 6) {
      this.state.manualGearIndex += 1;
      this.state.isReverse = this.state.manualGearIndex === -1;
      this.syncManualGearLabel();
      this.state.gearShiftAnim = 1.0;
      busAudio.playGearShift();
    }
  }

  public shiftGearDown() {
    if (!this.state.manualGearbox) return;
    if (this.state.manualGearIndex > -1) {
      this.state.manualGearIndex -= 1;
      this.state.isReverse = this.state.manualGearIndex === -1;
      this.syncManualGearLabel();
      this.state.gearShiftAnim = 1.0;
      busAudio.playGearShift();
    }
  }

  public refuel(amount: number = 100) {
    this.state.fuelPct = Math.min(100, this.state.fuelPct + amount);
    busAudio.playRefuelSound();
  }

  public toggleLeftIndicator() {
    this.state.leftIndicator = !this.state.leftIndicator;
    if (this.state.leftIndicator) {
      this.state.rightIndicator = false;
      this.state.hazardLights = false;
    }
    this._indicatorPhase = 0;
    this._indicatorEngagedTurnPeak = false;
  }

  public toggleRightIndicator() {
    this.state.rightIndicator = !this.state.rightIndicator;
    if (this.state.rightIndicator) {
      this.state.leftIndicator = false;
      this.state.hazardLights = false;
    }
    this._indicatorPhase = 0;
    this._indicatorEngagedTurnPeak = false;
  }

  public toggleHazardLights() {
    this.state.hazardLights = !this.state.hazardLights;
    if (this.state.hazardLights) {
      this.state.leftIndicator = false;
      this.state.rightIndicator = false;
    }
    this._indicatorPhase = 0;
  }

  public toggleWipers() {
    this.state.manualWipers = !this.state.manualWipers;
  }

  public toggleCruiseControl(): number | null {
    if (this.state.cruiseControlSpeed !== null) {
      this.state.cruiseControlSpeed = null;
      return null;
    }
    if (!this.state.isReverse && !this.state.doorOpen && !this.state.parkingBrake && this.state.speedKmh >= 15) {
      this.state.cruiseControlSpeed = Math.round(Math.min(80, this.state.speedKmh));
      return this.state.cruiseControlSpeed;
    }
    return null;
  }

  public toggleDoor(): boolean {
    if (Math.abs(this.state.speedKmh) > 3) return false;
    this.state.doorOpen = !this.state.doorOpen;
    this.state.cruiseControlSpeed = null;
    this.state.airPressure = Math.max(88, this.state.airPressure - 2.5);
    busAudio.playDoorSound();
    return true;
  }

  public handleCollisionImpact(intensity: number = 1.0) {
    if (this._hitCooldown > 0) return;
    this._hitCooldown = 0.4;
    this.state.cruiseControlSpeed = null;
    const damageTaken = Math.min(18, Math.max(4, Math.round(7 * intensity)));
    this.state.healthPct = Math.max(10, this.state.healthPct - damageTaken);
    this.state.speedKmh = -this.state.speedKmh * 0.38;
    this.state.pitchTilt = (Math.random() - 0.5) * 0.14 * intensity;
    this.state.rollTilt = (Math.random() - 0.5) * 0.18 * intensity;
    this.state.suspensionBounce = 0.08 * intensity;
    busAudio.playCrashSound();
  }

  public update(
    dt: number,
    colliders: { minX: number; maxX: number; minZ: number; maxZ: number }[] = []
  ): { hitObstacle: boolean } {
    if (this._hitCooldown > 0) this._hitCooldown -= dt;

    const s = this.state;
    if (s.gearShiftAnim > 0) {
      s.gearShiftAnim = Math.max(0, s.gearShiftAnim - dt * 2.2);
    }

    // Cruise control gentle throttle
    let rawThrottle = s.throttleInput;
    if (s.cruiseControlSpeed !== null && !s.doorOpen && !s.handbrake && !s.parkingBrake && !s.isReverse) {
      const speedErr = s.cruiseControlSpeed - s.speedKmh;
      if (rawThrottle <= 0) {
        rawThrottle = Math.max(0, Math.min(0.65, speedErr * 0.08 + 0.14));
      }
    }

    const outOfFuel = s.fuelPct <= 0.1;
    const driveDisengaged = s.doorOpen || s.parkingBrake || s.clutchPressed || outOfFuel || !s.engineRunning;
    const effectiveThrottle = driveDisengaged
      ? rawThrottle < 0
        ? rawThrottle
        : 0
      : rawThrottle;

    // Smooth steering wheel ramp & speed-dependent caster self-centering
    const inputRampRate = s.steerInput !== 0 ? 3.2 : 4.6;
    if (s.steerInput !== 0) {
      const delta = s.steerInput - this._smoothedSteerInput;
      const step = Math.sign(delta) * Math.min(Math.abs(delta), inputRampRate * dt);
      this._smoothedSteerInput += step;
    } else {
      const centerRate = 3.2 + Math.min(Math.abs(s.speedKmh) / 20, 3.0);
      this._smoothedSteerInput += (0 - this._smoothedSteerInput) * Math.min(1, centerRate * dt);
      if (Math.abs(this._smoothedSteerInput) < 0.01) this._smoothedSteerInput = 0;
    }

    const speedSteerFactor = 1.0 - Math.min(Math.abs(s.speedKmh) / 122, 0.52);
    const targetSteer = this._smoothedSteerInput * this._maxSteerAngle * speedSteerFactor;
    s.steerAngle += (targetSteer - s.steerAngle) * Math.min(1, 11 * dt);

    // Indicator relay audio & auto-cancel
    if (s.leftIndicator || s.rightIndicator || s.hazardLights) {
      this._indicatorPhase += dt;
      const blinkOn = Math.sin(this._indicatorPhase * 8.5) > 0;
      if (blinkOn !== this._prevBlinkOn) {
        this._prevBlinkOn = blinkOn;
        busAudio.playIndicatorClick(blinkOn);
      }

      if (!s.hazardLights && Math.abs(s.speedKmh) > 5) {
        if ((s.leftIndicator && s.steerAngle > 0.22) || (s.rightIndicator && s.steerAngle < -0.22)) {
          this._indicatorEngagedTurnPeak = true;
        } else if (this._indicatorEngagedTurnPeak && Math.abs(s.steerAngle) < 0.07) {
          s.leftIndicator = false;
          s.rightIndicator = false;
          this._indicatorEngagedTurnPeak = false;
          busAudio.playIndicatorClick(false);
        }
      }
    }

    // Terrain slope calculation (climb resistance on Nilgiri ghats)
    const fxTmp = Math.sin(s.heading);
    const fzTmp = Math.cos(s.heading);
    const yFront = getTerrainHeight(s.x + fxTmp * 2.5, s.z + fzTmp * 2.5);
    const yBack = getTerrainHeight(s.x - fxTmp * 2.5, s.z - fzTmp * 2.5);
    const slope = (yFront - yBack) / 5.0; // tangent of hill grade
    s.terrainPitch += (Math.atan(slope) - s.terrainPitch) * Math.min(1, 8 * dt);

    const massRatio = 11500 / Math.max(8500, s.totalMassKg);
    const footBrake = s.serviceBrakePedal > 0.05;

    let acceleration = 0;
    const manualAllowsForward = !s.manualGearbox || s.manualGearIndex > 0;
    const manualAllowsReverse = !s.manualGearbox ? s.isReverse : s.manualGearIndex === -1;

    const isManualReverseAccel = manualAllowsReverse && effectiveThrottle > 0 && !s.clutchPressed && !s.parkingBrake && !footBrake;
    const isAutoReverseAccel =
      !driveDisengaged &&
      !s.manualGearbox &&
      this._autoReverse &&
      !s.isReverse &&
      effectiveThrottle < 0 &&
      s.speedKmh <= 0.6 &&
      !s.handbrake &&
      !s.parkingBrake &&
      !footBrake;

    s.isBraking =
      s.handbrake ||
      s.parkingBrake ||
      footBrake ||
      (!s.isReverse && effectiveThrottle < 0 && s.speedKmh > 0.6) ||
      (s.isReverse && effectiveThrottle > 0 && s.speedKmh > 0.6) ||
      (s.isReverse && effectiveThrottle < 0 && s.speedKmh < -0.6);

    if (isManualReverseAccel) {
      acceleration = -12.0 * effectiveThrottle * s.gripFactor * this._torqueBonus * massRatio;
    } else if (isAutoReverseAccel) {
      acceleration = 12.0 * effectiveThrottle * s.gripFactor * this._torqueBonus * massRatio;
    } else if (!s.isReverse && manualAllowsForward && effectiveThrottle > 0 && !s.handbrake && !s.parkingBrake && !footBrake) {
      const highGearLaunchBog =
        s.manualGearbox && s.manualGearIndex >= 3 && s.speedKmh < 7 ? 0.34 : 1.0;
      const gearCapFactor = s.manualGearbox
        ? s.manualGearIndex === 1
          ? Math.max(0.1, 1 - s.speedKmh / 16)
          : s.manualGearIndex === 2
          ? Math.max(0.14, 1 - Math.max(0, s.speedKmh - 16) / 14)
          : s.manualGearIndex === 3
          ? Math.max(0.18, 1 - Math.max(0, s.speedKmh - 30) / 15)
          : s.manualGearIndex === 4
          ? Math.max(0.22, 1 - Math.max(0, s.speedKmh - 46) / 16)
          : s.manualGearIndex === 5
          ? Math.max(0.25, 1 - Math.max(0, s.speedKmh - 62) / 16)
          : 1.0
        : 1.0;

      const healthScale = s.healthPct < 35 ? 0.65 : 1.0;
      const torqueMultiplier =
        s.speedKmh < 14 ? 1.75 : s.speedKmh < 28 ? 1.48 : s.speedKmh < 44 ? 1.24 : s.speedKmh < 64 ? 1.02 : 0.84;
      const tractionMod = s.speedKmh < 22 ? 0.58 + 0.42 * s.gripFactor : 0.82 + 0.18 * s.gripFactor;
      acceleration =
        19.2 *
        effectiveThrottle *
        torqueMultiplier *
        tractionMod *
        this._torqueBonus *
        gearCapFactor *
        highGearLaunchBog *
        healthScale *
        massRatio;
    }

    // Slope gravity effect (heavier bus feels steeper climb / descent!) + aerodynamic drag
    const slopeGravity = -slope * (22.0 / Math.max(0.72, massRatio));
    const drag = s.speedKmh * 0.13;
    const rollingResistance = s.speedKmh > 0 ? 1.9 : s.speedKmh < 0 ? -1.9 : 0;

    let brakeDecel = 0;
    if (s.parkingBrake || s.handbrake) {
      brakeDecel = 36 * s.gripFactor * this._brakeBonus * (0.88 + 0.12 * massRatio);
    } else if (s.isBraking) {
      const brakeIntensity = Math.max(s.serviceBrakePedal, Math.abs(effectiveThrottle));
      brakeDecel = 31 * brakeIntensity * s.gripFactor * this._brakeBonus * (0.84 + 0.16 * massRatio);
    }

    if (s.isBraking && !this._wasBraking && Math.abs(s.speedKmh) > 8) {
      busAudio.playAirBrakeHiss();
      s.airPressure = Math.max(85, s.airPressure - 3.0);
    }
    this._wasBraking = s.isBraking;
    s.airPressure = Math.min(118, s.airPressure + 2.6 * this._brakeBonus * dt);

    if (s.isBraking) {
      if (s.speedKmh > 0) s.speedKmh = Math.max(0, s.speedKmh - brakeDecel * dt);
      else if (s.speedKmh < 0) s.speedKmh = Math.min(0, s.speedKmh + brakeDecel * dt);
    } else {
      s.speedKmh += (acceleration + slopeGravity - drag - rollingResistance) * dt;
    }

    const activeTopSpeed = this._speedLimiter80 ? Math.min(80, this._maxForwardSpeed) : this._maxForwardSpeed;
    const damagedTopCap = s.healthPct < 35 ? Math.min(activeTopSpeed, 52) : activeTopSpeed;
    s.speedKmh = Math.max(-this._maxReverseSpeed, Math.min(damagedTopCap, s.speedKmh));
    if (Math.abs(s.speedKmh) < 0.2 && effectiveThrottle === 0 && Math.abs(slope) < 0.01) {
      s.speedKmh = 0;
    }

    // 6-Speed Front + 1 Rear + 1 Neutral Transmission
    const absSpd = Math.abs(s.speedKmh);
    let gearMin = 0;
    let gearMax = 16;

    if (s.manualGearbox) {
      const idx = s.manualGearIndex;
      if (idx === -1) {
        s.gear = 'R';
        gearMin = 0;
        gearMax = 24;
      } else if (idx === 0) {
        s.gear = 'N';
      } else {
        s.gear = String(idx) as '1' | '2' | '3' | '4' | '5' | '6';
        const bands = [
          [0, 16],
          [11, 28],
          [22, 42],
          [36, 58],
          [50, 72],
          [64, 92],
        ];
        gearMin = bands[idx - 1][0];
        gearMax = bands[idx - 1][1];
      }
    } else {
      if (s.speedKmh < -0.4 || s.isReverse) {
        s.gear = 'R';
        gearMin = 0;
        gearMax = 24;
      } else if (absSpd < 0.4 && effectiveThrottle <= 0) {
        s.gear = 'N';
        gearMin = 0;
        gearMax = 12;
      } else if (absSpd < 13) {
        s.gear = '1';
        gearMin = 0;
        gearMax = 15;
      } else if (absSpd < 25) {
        s.gear = '2';
        gearMin = 10;
        gearMax = 27;
      } else if (absSpd < 39) {
        s.gear = '3';
        gearMin = 21;
        gearMax = 41;
      } else if (absSpd < 54) {
        s.gear = '4';
        gearMin = 35;
        gearMax = 56;
      } else if (absSpd < 68) {
        s.gear = '5';
        gearMin = 49;
        gearMax = 70;
      } else {
        s.gear = '6';
        gearMin = 63;
        gearMax = 88;
      }
    }

    if (s.gear !== this._prevGear) {
      this._prevGear = s.gear;
      s.gearShiftAnim = 1.0;
      if (s.engineRunning) busAudio.playGearShift();
    }

    if (!s.engineRunning) {
      s.rpm += (0 - s.rpm) * Math.min(1, 6 * dt);
      s.engineTempC += (68 - s.engineTempC) * Math.min(1, 0.15 * dt);
    } else {
      const gearRatioNorm =
        s.gear === 'N' ? 0 : Math.max(0, Math.min(1, (absSpd - gearMin) / Math.max(10, gearMax - gearMin)));
      const revClutch = s.clutchPressed || s.gear === 'N' ? Math.max(0, rawThrottle) * 1100 : 0;
      const targetRpm =
        s.gear === 'N' || s.clutchPressed
          ? 680 + revClutch
          : 820 + gearRatioNorm * 1620 + Math.abs(effectiveThrottle) * 160;
      s.rpm += (targetRpm - s.rpm) * Math.min(1, 9 * dt);

      const loadFactor = 1.0 + Math.max(0, (s.totalMassKg - 11000) / 14000);
      const fuelBurn =
        (0.015 + Math.max(0, effectiveThrottle) * 0.085 + (s.rpm / 2600) * 0.04) *
        loadFactor *
        this._fuelSaverMult *
        dt;
      s.fuelPct = Math.max(0, s.fuelPct - fuelBurn);
      const targetTemp = 79 + (s.rpm - 680) / 140 + (slope > 0.01 ? 5 : 0) + (s.healthPct < 45 ? 12 : 0);
      s.engineTempC += (targetTemp - s.engineTempC) * Math.min(1, 0.35 * dt);
    }

    // Driver fatigue & coach mud accumulation while rolling
    if (absSpd > 4) {
      s.fatiguePct = Math.min(100, s.fatiguePct + dt * 0.14);
      const mudRate = s.weather === 'rain' ? 0.35 : 0.08;
      s.dirtinessPct = Math.min(100, s.dirtinessPct + dt * mudRate);
    }

    const speedMs = (s.speedKmh * 1000) / 3600;

    // Ackermann steering
    if (Math.abs(s.steerAngle) > 0.001 && Math.abs(speedMs) > 0.05) {
      const turnRate = (speedMs / this._wheelbase) * Math.sin(s.steerAngle);
      s.heading += turnRate * dt;
    }

    // Wet drift / lateral slip
    const lateralDemand = Math.abs(speedMs * Math.sin(s.steerAngle));
    const gripThreshold = 3.5 * s.gripFactor;
    if (lateralDemand > gripThreshold && Math.abs(speedMs) > 3.5) {
      const slipExcess = (lateralDemand - gripThreshold) / 3.0;
      const targetDrift = s.steerAngle * slipExcess * 0.42;
      s.driftAngle += (targetDrift - s.driftAngle) * Math.min(1, 4.2 * dt);
      s.isDrifting = Math.abs(s.driftAngle) > 0.035;
      if (s.isDrifting) busAudio.playTireSkid();
    } else {
      s.driftAngle += (0 - s.driftAngle) * Math.min(1, 7 * dt);
      s.isDrifting = false;
    }

    this._forward.set(Math.sin(s.heading), 0, Math.cos(s.heading));
    this._lateral.set(Math.cos(s.heading), 0, -Math.sin(s.heading));

    let nextX = s.x + this._forward.x * speedMs * dt + this._lateral.x * s.driftAngle * speedMs * dt * 0.6;
    let nextZ = s.z + this._forward.z * speedMs * dt + this._lateral.z * s.driftAngle * speedMs * dt * 0.6;

    // 3-Sphere Full-Chassis Collision
    let hitObstacle = false;
    const sphereRadius = 1.28;
    const spineOffsets = [3.1, 0, -2.9];

    for (const c of colliders) {
      for (const offset of spineOffsets) {
        const sx = nextX + this._forward.x * offset;
        const sz = nextZ + this._forward.z * offset;
        const closestX = Math.max(c.minX, Math.min(sx, c.maxX));
        const closestZ = Math.max(c.minZ, Math.min(sz, c.maxZ));
        const dx = sx - closestX;
        const dz = sz - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < sphereRadius * sphereRadius) {
          hitObstacle = true;
          if (distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const push = sphereRadius - dist + 0.03;
            nextX += (dx / dist) * push;
            nextZ += (dz / dist) * push;
          } else {
            const dLeft = Math.abs(sx - c.minX);
            const dRight = Math.abs(c.maxX - sx);
            const dTop = Math.abs(sz - c.minZ);
            const dBot = Math.abs(c.maxZ - sz);
            const minD = Math.min(dLeft, dRight, dTop, dBot);
            if (minD === dLeft) nextX -= dLeft + sphereRadius;
            else if (minD === dRight) nextX += dRight + sphereRadius;
            else if (minD === dTop) nextZ -= dTop + sphereRadius;
            else nextZ += dBot + sphereRadius;
          }
          break;
        }
      }
    }

    // Clamp to expanded Tamil Nadu regional bounds
    nextX = Math.max(ROAD_NETWORK.minX - 6, Math.min(ROAD_NETWORK.maxX + 6, nextX));
    nextZ = Math.max(ROAD_NETWORK.minZ - 6, Math.min(ROAD_NETWORK.maxZ + 6, nextZ));

    s.x = nextX;
    s.z = nextZ;

    if (hitObstacle && Math.abs(s.speedKmh) > 3.5) {
      this.handleCollisionImpact(1.0);
    } else if (hitObstacle) {
      s.speedKmh *= 0.4;
    }

    this._roadPhase += Math.abs(speedMs) * dt * 1.4;
    const roadRipple =
      Math.abs(speedMs) > 1.5 ? Math.sin(this._roadPhase) * 0.018 * Math.min(1, Math.abs(speedMs) / 14) : 0;
    const loadSag = -Math.min(0.05, (s.passengersOnboard / 60) * 0.035);
    s.suspensionBounce += (roadRipple + loadSag - s.suspensionBounce) * Math.min(1, 14 * dt);
    s.y = getTerrainHeight(s.x, s.z) + s.suspensionBounce;

    const loadRollMult = 1.0 + Math.min(0.32, (s.passengersOnboard / 60) * 0.25);
    const targetRoll = (-s.steerAngle * (speedMs / 11.5) * 0.13 + s.driftAngle * 0.09) * loadRollMult;
    s.rollTilt += (targetRoll - s.rollTilt) * Math.min(1, 7.5 * dt);

    const targetPitch = s.isBraking && absSpd > 2 ? 0.052 : -Math.max(0, effectiveThrottle) * 0.024;
    s.pitchTilt += (targetPitch - s.pitchTilt) * Math.min(1, 9.5 * dt);

    busAudio.updateEngine(s.speedKmh, effectiveThrottle, s.rpm);
    return { hitObstacle };
  }
}
