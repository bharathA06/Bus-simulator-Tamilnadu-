import * as THREE from 'three';
import { ROAD_NETWORK, getTerrainHeight } from './constants';
import { TrafficDensity, TrafficSpeedMode } from './gameStore';
import { getSignalState } from './navigationSystem';
import { createAiBus, createAutoRickshaw, createMotorbike } from './proceduralModels';

export const TRAFFIC_DENSITY_COUNTS: Record<TrafficDensity, number> = {
  off: 0,
  light: 16,
  normal: 33,
  heavy: 50,
  rush: 66,
};

export const TRAFFIC_SPEED_MULTS: Record<TrafficSpeedMode, number> = {
  calm: 0.72,
  normal: 1.0,
  fast: 1.28,
};

type TurnPhase = {
  p0x: number;
  p0z: number;
  p1x: number;
  p1z: number;
  p2x: number;
  p2z: number;
  t: number;
  duration: number;
  nextLane: 'vertical' | 'horizontal';
  nextDir: 1 | -1;
  nextRoadCoord: number;
  signalSide: 'left' | 'right';
};

export interface TrafficVehicle {
  mesh: THREE.Group;
  type: 'auto' | 'car' | 'bike' | 'lorry' | 'bus';
  x: number;
  z: number;
  speed: number;
  baseTargetSpeed: number;
  targetSpeed: number;
  heading: number;
  lane: 'vertical' | 'horizontal';
  roadCoord: number;
  laneOffset: number;
  direction: 1 | -1;
  boundsRadius: number;
  wheels: THREE.Object3D[];
  leftIndMat?: THREE.MeshStandardMaterial;
  rightIndMat?: THREE.MeshStandardMaterial;
  turnPhase: TurnPhase | null;
  plannedTurn: 'straight' | 'left' | 'right' | 'uturn';
  lastDecisionCoord: number;
}

function getLanePosition(
  lane: 'vertical' | 'horizontal',
  roadCoord: number,
  direction: 1 | -1,
  offset: number
): number {
  if (lane === 'vertical') {
    return direction === 1 ? roadCoord + offset : roadCoord - offset;
  }
  return direction === 1 ? roadCoord - offset : roadCoord + offset;
}

export function createTrafficSystem(scene: THREE.Scene): {
  vehicles: TrafficVehicle[];
  getActiveVehicles: () => TrafficVehicle[];
  setTrafficSettings: (
    density: TrafficDensity,
    speedMode: TrafficSpeedMode,
    busX?: number,
    busZ?: number
  ) => void;
  updateTraffic: (
    delta: number,
    busX: number,
    busZ: number,
    busHeading?: number,
    timeSec?: number,
    viewRadius?: number
  ) => { collided: boolean; vehicle?: TrafficVehicle };
  setTrafficLights: (lightsOn: boolean) => void;
  dispose: () => void;
} {
  const vehicles: TrafficVehicle[] = [];
  const headLampMats: THREE.MeshStandardMaterial[] = [];
  const tailLampMats: THREE.MeshStandardMaterial[] = [];
  let activeLimit = TRAFFIC_DENSITY_COUNTS.normal;
  let speedMult = TRAFFIC_SPEED_MULTS.normal;

  const createCityCar = (
    colorHex: number
  ): {
    group: THREE.Group;
    wheels: THREE.Object3D[];
    leftIndMat: THREE.MeshStandardMaterial;
    rightIndMat: THREE.MeshStandardMaterial;
  } => {
    const car = new THREE.Group();
    const wheels: THREE.Object3D[] = [];

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      roughness: 0.25,
      metalness: 0.35,
      clearcoat: 0.85,
      clearcoatRoughness: 0.14,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.65,
    });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.85, roughness: 0.2 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef08a, emissiveIntensity: 0.3 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xef4444, emissiveIntensity: 0.5 });
    const leftIndMat = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xf59e0b, emissiveIntensity: 0 });
    const rightIndMat = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xf59e0b, emissiveIntensity: 0 });
    headLampMats.push(headMat);
    tailLampMats.push(tailMat);

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.58, 3.95), bodyMat);
    body.position.y = 0.54;
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);

    const cabinShell = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.58, 2.05), bodyMat);
    cabinShell.position.set(0, 1.08, -0.25);
    cabinShell.castShadow = true;
    car.add(cabinShell);

    const glassBand = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.44, 1.85), glassMat);
    glassBand.position.set(0, 1.06, -0.25);
    car.add(glassBand);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.48, 0.06), glassMat);
    windshield.position.set(0, 1.05, 0.78);
    windshield.rotation.x = -0.55;
    car.add(windshield);

    [-0.65, 0.65].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.06), headMat);
      hl.position.set(lx, 0.62, 1.98);
      car.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.06), tailMat);
      tl.position.set(lx, 0.65, -1.98);
      car.add(tl);
    });

    const indGeom = new THREE.BoxGeometry(0.14, 0.12, 0.08);
    const fl = new THREE.Mesh(indGeom, leftIndMat);
    fl.position.set(0.84, 0.62, 1.98);
    const rl = new THREE.Mesh(indGeom, leftIndMat);
    rl.position.set(0.84, 0.65, -1.98);
    const fr = new THREE.Mesh(indGeom, rightIndMat);
    fr.position.set(-0.84, 0.62, 1.98);
    const rr = new THREE.Mesh(indGeom, rightIndMat);
    rr.position.set(-0.84, 0.65, -1.98);
    car.add(fl, rl, fr, rr);

    const makeWheel = (wx: number, wz: number) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16), wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.24, 12), rimMat);
      rim.rotation.z = Math.PI / 2;
      wg.add(tire, rim);
      wg.position.set(wx, 0.32, wz);
      car.add(wg);
      wheels.push(wg);
    };
    makeWheel(-0.92, 1.18);
    makeWheel(0.92, 1.18);
    makeWheel(-0.92, -1.18);
    makeWheel(0.92, -1.18);

    return { group: car, wheels, leftIndMat, rightIndMat };
  };

  const createCityLorry = (): {
    group: THREE.Group;
    wheels: THREE.Object3D[];
    leftIndMat: THREE.MeshStandardMaterial;
    rightIndMat: THREE.MeshStandardMaterial;
  } => {
    const lorry = new THREE.Group();
    const wheels: THREE.Object3D[] = [];

    const cabMat = new THREE.MeshPhysicalMaterial({ color: 0xb91c1c, roughness: 0.35, clearcoat: 0.6 });
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.75 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef08a, emissiveIntensity: 0.3 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xef4444, emissiveIntensity: 0.5 });
    const leftIndMat = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xf59e0b, emissiveIntensity: 0 });
    const rightIndMat = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xf59e0b, emissiveIntensity: 0 });
    headLampMats.push(headMat);
    tailLampMats.push(tailMat);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.75, 1.7), cabMat);
    cab.position.set(0, 1.35, 1.85);
    cab.castShadow = true;
    lorry.add(cab);

    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 0.06), glassMat);
    wind.position.set(0, 1.75, 2.71);
    lorry.add(wind);

    const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.7, 3.9), cargoMat);
    cargo.position.set(0, 1.45, -1.0);
    cargo.castShadow = true;
    lorry.add(cargo);

    [-0.78, 0.78].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.06), headMat);
      hl.position.set(lx, 0.85, 2.72);
      lorry.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.06), tailMat);
      tl.position.set(lx, 0.8, -2.96);
      lorry.add(tl);
    });

    const indGeom = new THREE.BoxGeometry(0.16, 0.14, 0.08);
    const fl = new THREE.Mesh(indGeom, leftIndMat);
    fl.position.set(0.98, 0.85, 2.72);
    const fr = new THREE.Mesh(indGeom, rightIndMat);
    fr.position.set(-0.98, 0.85, 2.72);
    lorry.add(fl, fr);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    [
      [-1.05, 1.7],
      [1.05, 1.7],
      [-1.05, -1.8],
      [1.05, -1.8],
    ].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.42, wz);
      w.castShadow = true;
      lorry.add(w);
      wheels.push(w);
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.28, 5.4), frameMat);
    chassis.position.set(0, 0.48, -0.2);
    lorry.add(chassis);

    return { group: lorry, wheels, leftIndMat, rightIndMat };
  };

  const carColors = [0xf8fafc, 0xd97706, 0x2563eb, 0xdc2626, 0x475569, 0x0f766e];
  const bikeColors = [0xdc2626, 0x1d4ed8, 0x0f766e, 0xf59e0b];

  const spawnConfigs: Array<{
    roadCoord: number;
    along: number;
    offset: number;
    type: 'auto' | 'car' | 'bike' | 'lorry' | 'bus';
    lane: 'vertical' | 'horizontal';
    dir: 1 | -1;
  }> = [
    // Coimbatore – Salem NH-544 (X=-240)
    { roadCoord: -240, along: -410, offset: 5.2, type: 'auto', lane: 'vertical', dir: 1 },
    { roadCoord: -240, along: -210, offset: 2.8, type: 'car', lane: 'vertical', dir: 1 },
    { roadCoord: -240, along: -110, offset: 5.2, type: 'bike', lane: 'vertical', dir: -1 },
    { roadCoord: -240, along: 35, offset: 2.8, type: 'bus', lane: 'vertical', dir: -1 },
    { roadCoord: -240, along: 220, offset: 2.8, type: 'lorry', lane: 'vertical', dir: 1 },
    { roadCoord: -240, along: 380, offset: 5.2, type: 'auto', lane: 'vertical', dir: -1 },

    // Nilgiri Ghat & Pollachi Hwy (X=-480)
    { roadCoord: -480, along: -430, offset: 5.2, type: 'car', lane: 'vertical', dir: 1 },
    { roadCoord: -480, along: -210, offset: 5.2, type: 'bike', lane: 'vertical', dir: -1 },
    { roadCoord: -480, along: 140, offset: 2.8, type: 'lorry', lane: 'vertical', dir: 1 },
    { roadCoord: -480, along: 360, offset: 5.2, type: 'auto', lane: 'vertical', dir: -1 },

    // Erode – Dindigul – Tirunelveli NH-44 (X=0)
    { roadCoord: 0, along: -340, offset: 2.8, type: 'bus', lane: 'vertical', dir: 1 },
    { roadCoord: 0, along: -115, offset: 5.2, type: 'auto', lane: 'vertical', dir: -1 },
    { roadCoord: 0, along: 140, offset: 2.8, type: 'car', lane: 'vertical', dir: 1 },
    { roadCoord: 0, along: 430, offset: 5.2, type: 'bike', lane: 'vertical', dir: -1 },

    // Trichy – Madurai Heritage Hwy (X=240)
    { roadCoord: 240, along: -390, offset: 2.8, type: 'car', lane: 'vertical', dir: 1 },
    { roadCoord: 240, along: -135, offset: 5.2, type: 'auto', lane: 'vertical', dir: -1 },
    { roadCoord: 240, along: 165, offset: 2.8, type: 'bus', lane: 'vertical', dir: 1 },
    { roadCoord: 240, along: 355, offset: 5.2, type: 'bike', lane: 'vertical', dir: -1 },

    // Chennai CMBT – ECR – Rameswaram Trunk (X=480)
    { roadCoord: 480, along: -420, offset: 2.8, type: 'bus', lane: 'vertical', dir: 1 },
    { roadCoord: 480, along: -215, offset: 5.2, type: 'auto', lane: 'vertical', dir: -1 },
    { roadCoord: 480, along: 45, offset: 2.8, type: 'car', lane: 'vertical', dir: 1 },
    { roadCoord: 480, along: 245, offset: 2.8, type: 'lorry', lane: 'vertical', dir: -1 },

    // Northern Express NH-48 (Z=-520)
    { roadCoord: -520, along: -185, offset: 2.8, type: 'car', lane: 'horizontal', dir: 1 },
    { roadCoord: -520, along: 215, offset: 2.8, type: 'lorry', lane: 'horizontal', dir: -1 },

    // Kongu – Trichy Industrial Corridor (Z=-260)
    { roadCoord: -260, along: -175, offset: 5.2, type: 'auto', lane: 'horizontal', dir: 1 },
    { roadCoord: -260, along: 65, offset: 2.8, type: 'car', lane: 'horizontal', dir: -1 },
    { roadCoord: -260, along: 335, offset: 5.2, type: 'bike', lane: 'horizontal', dir: 1 },

    // Singanallur – Cauvery Cross Hwy (Z=0)
    { roadCoord: 0, along: -180, offset: 5.2, type: 'auto', lane: 'horizontal', dir: 1 },
    { roadCoord: 0, along: 130, offset: 2.8, type: 'bus', lane: 'horizontal', dir: -1 },

    // Madurai – Palani Hwy (Z=260)
    { roadCoord: 260, along: -110, offset: 2.8, type: 'car', lane: 'horizontal', dir: 1 },
    { roadCoord: 260, along: 190, offset: 5.2, type: 'auto', lane: 'horizontal', dir: -1 },

    // Southern Coastal Hwy (Z=520)
    { roadCoord: 520, along: -80, offset: 2.8, type: 'car', lane: 'horizontal', dir: 1 },
    { roadCoord: 520, along: 190, offset: 5.2, type: 'bike', lane: 'horizontal', dir: -1 },

    // Heavy / Peak Rush Additional Tamil Nadu Fleet (34..66)
    { roadCoord: -240, along: -315, offset: 2.8, type: 'car', lane: 'vertical', dir: -1 },
    { roadCoord: -240, along: -65, offset: 2.8, type: 'bus', lane: 'vertical', dir: 1 },
    { roadCoord: -240, along: 120, offset: 5.2, type: 'bike', lane: 'vertical', dir: 1 },
    { roadCoord: -240, along: 295, offset: 2.8, type: 'car', lane: 'vertical', dir: -1 },
    { roadCoord: -240, along: 465, offset: 5.2, type: 'auto', lane: 'vertical', dir: 1 },

    { roadCoord: -480, along: -325, offset: 5.2, type: 'auto', lane: 'vertical', dir: -1 },
    { roadCoord: -480, along: -60, offset: 2.8, type: 'bus', lane: 'vertical', dir: 1 },
    { roadCoord: -480, along: 255, offset: 2.8, type: 'car', lane: 'vertical', dir: -1 },

    { roadCoord: 0, along: -460, offset: 2.8, type: 'lorry', lane: 'vertical', dir: 1 },
    { roadCoord: 0, along: -215, offset: 5.2, type: 'bike', lane: 'vertical', dir: 1 },
    { roadCoord: 0, along: 35, offset: 2.8, type: 'car', lane: 'vertical', dir: -1 },
    { roadCoord: 0, along: 285, offset: 5.2, type: 'auto', lane: 'vertical', dir: 1 },

    { roadCoord: 240, along: -480, offset: 5.2, type: 'bike', lane: 'vertical', dir: -1 },
    { roadCoord: 240, along: -245, offset: 2.8, type: 'lorry', lane: 'vertical', dir: 1 },
    { roadCoord: 240, along: 40, offset: 5.2, type: 'auto', lane: 'vertical', dir: -1 },
    { roadCoord: 240, along: 265, offset: 2.8, type: 'car', lane: 'vertical', dir: 1 },

    { roadCoord: 480, along: -325, offset: 5.2, type: 'bike', lane: 'vertical', dir: 1 },
    { roadCoord: 480, along: -95, offset: 2.8, type: 'bus', lane: 'vertical', dir: -1 },
    { roadCoord: 480, along: 145, offset: 5.2, type: 'auto', lane: 'vertical', dir: 1 },
    { roadCoord: 480, along: 375, offset: 2.8, type: 'car', lane: 'vertical', dir: -1 },

    { roadCoord: -520, along: -365, offset: 5.2, type: 'auto', lane: 'horizontal', dir: 1 },
    { roadCoord: -520, along: -45, offset: 2.8, type: 'bus', lane: 'horizontal', dir: -1 },
    { roadCoord: -520, along: 360, offset: 5.2, type: 'bike', lane: 'horizontal', dir: 1 },

    { roadCoord: -260, along: -380, offset: 2.8, type: 'lorry', lane: 'horizontal', dir: -1 },
    { roadCoord: -260, along: -55, offset: 5.2, type: 'auto', lane: 'horizontal', dir: 1 },
    { roadCoord: -260, along: 185, offset: 2.8, type: 'car', lane: 'horizontal', dir: -1 },

    { roadCoord: 0, along: -365, offset: 2.8, type: 'car', lane: 'horizontal', dir: 1 },
    { roadCoord: 0, along: -65, offset: 5.2, type: 'bike', lane: 'horizontal', dir: -1 },
    { roadCoord: 0, along: 310, offset: 2.8, type: 'lorry', lane: 'horizontal', dir: 1 },

    { roadCoord: 260, along: -355, offset: 5.2, type: 'bike', lane: 'horizontal', dir: -1 },
    { roadCoord: 260, along: 45, offset: 2.8, type: 'bus', lane: 'horizontal', dir: 1 },
    { roadCoord: 260, along: 355, offset: 5.2, type: 'auto', lane: 'horizontal', dir: -1 },

    { roadCoord: 520, along: -335, offset: 2.8, type: 'lorry', lane: 'horizontal', dir: 1 },
    { roadCoord: 520, along: 45, offset: 5.2, type: 'auto', lane: 'horizontal', dir: -1 },
  ];

  const pickNextTurn = (): 'straight' | 'left' | 'right' | 'uturn' => {
    const r = Math.random();
    if (r < 0.54) return 'straight';
    if (r < 0.76) return 'left';
    if (r < 0.94) return 'right';
    return 'uturn';
  };

  spawnConfigs.forEach((cfg, idx) => {
    let mesh: THREE.Group;
    let wheels: THREE.Object3D[] = [];
    let leftIndMat: THREE.MeshStandardMaterial | undefined;
    let rightIndMat: THREE.MeshStandardMaterial | undefined;

    if (cfg.type === 'auto') {
      mesh = createAutoRickshaw();
    } else if (cfg.type === 'bike') {
      const built = createMotorbike(bikeColors[idx % bikeColors.length]);
      mesh = built.group;
      wheels = built.wheels;
    } else if (cfg.type === 'lorry') {
      const built = createCityLorry();
      mesh = built.group;
      wheels = built.wheels;
      leftIndMat = built.leftIndMat;
      rightIndMat = built.rightIndMat;
    } else if (cfg.type === 'bus') {
      const built = createAiBus(idx % 2 === 0 ? 0x0284c7 : 0x1e3a8a, 0xf8fafc);
      mesh = built.group;
      wheels = built.wheels;
    } else {
      const built = createCityCar(carColors[idx % carColors.length]);
      mesh = built.group;
      wheels = built.wheels;
      leftIndMat = built.leftIndMat;
      rightIndMat = built.rightIndMat;
    }

    const x = cfg.lane === 'vertical' ? getLanePosition('vertical', cfg.roadCoord, cfg.dir, cfg.offset) : cfg.along;
    const z = cfg.lane === 'horizontal' ? getLanePosition('horizontal', cfg.roadCoord, cfg.dir, cfg.offset) : cfg.along;
    mesh.position.set(x, getTerrainHeight(x, z), z);

    const heading =
      cfg.lane === 'vertical'
        ? cfg.dir === 1
          ? 0
          : Math.PI
        : cfg.dir === 1
        ? Math.PI / 2
        : -Math.PI / 2;
    mesh.rotation.y = heading;
    mesh.visible = idx < activeLimit;
    scene.add(mesh);

    const baseTargetSpeed =
      cfg.type === 'lorry'
        ? 10.5
        : cfg.type === 'bus'
        ? 13.0
        : cfg.type === 'bike'
        ? 14.5
        : 12.0 + Math.random() * 6;

    vehicles.push({
      mesh,
      type: cfg.type,
      x,
      z,
      speed: cfg.type === 'bike' ? 13 : 10 + Math.random() * 5,
      baseTargetSpeed,
      targetSpeed: baseTargetSpeed * speedMult,
      heading,
      lane: cfg.lane,
      roadCoord: cfg.roadCoord,
      laneOffset: cfg.offset,
      direction: cfg.dir,
      boundsRadius:
        cfg.type === 'bike'
          ? 1.05
          : cfg.type === 'auto'
          ? 1.55
          : cfg.type === 'lorry'
          ? 2.8
          : cfg.type === 'bus'
          ? 3.8
          : 2.1,
      wheels,
      leftIndMat,
      rightIndMat,
      turnPhase: null,
      plannedTurn: pickNextTurn(),
      lastDecisionCoord: -9999,
    });
  });

  const buildIntersectionTurn = (
    veh: TrafficVehicle,
    ix: number,
    iz: number,
    turn: 'left' | 'right' | 'uturn'
  ): TurnPhase | null => {
    const off = veh.laneOffset;
    if (veh.lane === 'vertical') {
      if (turn === 'uturn') {
        const exitX = getLanePosition('vertical', ix, (veh.direction === 1 ? -1 : 1) as 1 | -1, off);
        return {
          p0x: veh.x,
          p0z: veh.z,
          p1x: ix,
          p1z: iz,
          p2x: exitX,
          p2z: veh.z,
          t: 0,
          duration: 1.7,
          nextLane: 'vertical',
          nextDir: (veh.direction === 1 ? -1 : 1) as 1 | -1,
          nextRoadCoord: ix,
          signalSide: 'right',
        };
      }
      const nextDir: 1 | -1 =
        turn === 'left'
          ? (veh.direction === 1 ? 1 : -1)
          : (veh.direction === 1 ? -1 : 1);
      const exitX = ix + nextDir * 12;
      const exitZ = getLanePosition('horizontal', iz, nextDir, off);
      return {
        p0x: veh.x,
        p0z: veh.z,
        p1x: veh.x,
        p1z: exitZ,
        p2x: exitX,
        p2z: exitZ,
        t: 0,
        duration: turn === 'left' ? 1.15 : 1.55,
        nextLane: 'horizontal',
        nextDir,
        nextRoadCoord: iz,
        signalSide: turn,
      };
    } else {
      if (turn === 'uturn') {
        const exitZ = getLanePosition('horizontal', iz, (veh.direction === 1 ? -1 : 1) as 1 | -1, off);
        return {
          p0x: veh.x,
          p0z: veh.z,
          p1x: ix,
          p1z: iz,
          p2x: veh.x,
          p2z: exitZ,
          t: 0,
          duration: 1.7,
          nextLane: 'horizontal',
          nextDir: (veh.direction === 1 ? -1 : 1) as 1 | -1,
          nextRoadCoord: iz,
          signalSide: 'right',
        };
      }
      const nextDir: 1 | -1 =
        turn === 'left'
          ? (veh.direction === 1 ? -1 : 1)
          : (veh.direction === 1 ? 1 : -1);
      const exitX = getLanePosition('vertical', ix, nextDir, off);
      const exitZ = iz + nextDir * 12;
      return {
        p0x: veh.x,
        p0z: veh.z,
        p1x: exitX,
        p1z: veh.z,
        p2x: exitX,
        p2z: exitZ,
        t: 0,
        duration: turn === 'left' ? 1.15 : 1.55,
        nextLane: 'vertical',
        nextDir,
        nextRoadCoord: ix,
        signalSide: turn,
      };
    }
  };

  const minZLoop = ROAD_NETWORK.minZ + 20;
  const maxZLoop = ROAD_NETWORK.maxZ - 20;
  const minXLoop = ROAD_NETWORK.minX + 20;
  const maxXLoop = ROAD_NETWORK.maxX - 20;

  return {
    vehicles,
    getActiveVehicles: () => vehicles.slice(0, activeLimit),
    setTrafficSettings: (
      density: TrafficDensity,
      speedMode: TrafficSpeedMode,
      busX?: number,
      busZ?: number
    ) => {
      const prevLimit = activeLimit;
      activeLimit = Math.min(vehicles.length, TRAFFIC_DENSITY_COUNTS[density] ?? 33);
      speedMult = TRAFFIC_SPEED_MULTS[speedMode] ?? 1.0;

      vehicles.forEach((veh, idx) => {
        veh.targetSpeed = veh.baseTargetSpeed * speedMult;
        if (idx >= activeLimit) {
          veh.mesh.visible = false;
          veh.turnPhase = null;
        } else if (idx >= prevLimit && busX !== undefined && busZ !== undefined) {
          // Avoid spawning newly activated traffic directly on top of the player bus
          if (Math.hypot(veh.x - busX, veh.z - busZ) < 26) {
            if (veh.lane === 'vertical') {
              veh.z += veh.direction * 48;
              if (veh.z > maxZLoop) veh.z = minZLoop + 10;
              if (veh.z < minZLoop) veh.z = maxZLoop - 10;
            } else {
              veh.x += veh.direction * 48;
              if (veh.x > maxXLoop) veh.x = minXLoop + 10;
              if (veh.x < minXLoop) veh.x = maxXLoop - 10;
            }
            veh.mesh.position.set(veh.x, getTerrainHeight(veh.x, veh.z), veh.z);
          }
        }
      });
    },
    updateTraffic: (
      delta: number,
      busX: number,
      busZ: number,
      busHeading: number = 0,
      timeSec: number = 0,
      viewRadius: number = 420
    ) => {
      let collided = false;
      let hitVeh: TrafficVehicle | undefined;
      if (activeLimit <= 0) {
        return { collided: false, vehicle: undefined };
      }

      const blinkOn = Math.sin(timeSec * 8.5) > 0;
      const busSin = Math.sin(busHeading);
      const busCos = Math.cos(busHeading);
      const busSpineOffsets = [3.1, 0, -2.9];

      for (let selfIdx = 0; selfIdx < activeLimit; selfIdx++) {
        const veh = vehicles[selfIdx];
        let minBusDist = Infinity;
        let nearestSpineDx = busX - veh.x;
        let nearestSpineDz = busZ - veh.z;
        for (const off of busSpineOffsets) {
          const bx = busX + busSin * off;
          const bz = busZ + busCos * off;
          const ddx = bx - veh.x;
          const ddz = bz - veh.z;
          const dist = Math.hypot(ddx, ddz);
          if (dist < minBusDist) {
            minBusDist = dist;
            nearestSpineDx = ddx;
            nearestSpineDz = ddz;
          }
        }

        if (minBusDist < veh.boundsRadius + 1.25) {
          collided = true;
          hitVeh = veh;
        }

        const fx = Math.sin(veh.heading);
        const fz = Math.cos(veh.heading);
        let mustStop = false;
        let mustSlow = false;

        if (minBusDist < 15.0) {
          const forwardBus = nearestSpineDx * fx + nearestSpineDz * fz;
          const lateralBus = Math.abs(nearestSpineDx * fz - nearestSpineDz * fx);
          if (forwardBus > 0 && forwardBus < 14 && lateralBus < 2.9) {
            mustStop = forwardBus < 7.0;
            mustSlow = true;
          }
        }

        for (let j = 0; j < activeLimit; j++) {
          if (j === selfIdx) continue;
          const other = vehicles[j];
          const dxO = other.x - veh.x;
          const dzO = other.z - veh.z;
          const distO = Math.hypot(dxO, dzO);
          if (distO < 14) {
            const fwdO = dxO * fx + dzO * fz;
            const latO = Math.abs(dxO * fz - dzO * fx);
            if (fwdO > 0 && fwdO < 12 && latO < 2.2) {
              mustStop = fwdO < 6.8;
              mustSlow = true;
              break;
            }
          }
        }

        if (veh.turnPhase) {
          const tp = veh.turnPhase;
          const speedScale = mustStop ? 0 : mustSlow ? 0.45 : Math.max(0.45, veh.speed / 10);
          tp.t += (delta * speedScale) / tp.duration;

          if (tp.t >= 1) {
            veh.x = tp.p2x;
            veh.z = tp.p2z;
            veh.lane = tp.nextLane;
            veh.direction = tp.nextDir;
            veh.roadCoord = tp.nextRoadCoord;
            veh.heading =
              veh.lane === 'vertical'
                ? veh.direction === 1
                  ? 0
                  : Math.PI
                : veh.direction === 1
                ? Math.PI / 2
                : -Math.PI / 2;
            veh.turnPhase = null;
            veh.plannedTurn = pickNextTurn();
          } else {
            const u = 1 - tp.t;
            veh.x = u * u * tp.p0x + 2 * u * tp.t * tp.p1x + tp.t * tp.t * tp.p2x;
            veh.z = u * u * tp.p0z + 2 * u * tp.t * tp.p1z + tp.t * tp.t * tp.p2z;
            const dxdt = 2 * u * (tp.p1x - tp.p0x) + 2 * tp.t * (tp.p2x - tp.p1x);
            const dzdt = 2 * u * (tp.p1z - tp.p0z) + 2 * tp.t * (tp.p2z - tp.p1z);
            veh.heading = Math.atan2(dxdt, dzdt);
          }

          if (veh.leftIndMat) {
            veh.leftIndMat.emissiveIntensity = tp.signalSide === 'left' && blinkOn ? 2.8 : 0;
          }
          if (veh.rightIndMat) {
            veh.rightIndMat.emissiveIntensity = tp.signalSide === 'right' && blinkOn ? 2.8 : 0;
          }
        } else {
          const axisPos = veh.lane === 'vertical' ? veh.z : veh.x;
          const crossCoords = veh.lane === 'vertical' ? ROAD_NETWORK.horizontalZ : ROAD_NETWORK.verticalX;
          let approachingSignalStop = false;
          let approachingIndicator: 'left' | 'right' | null = null;

          for (const cCoord of crossCoords) {
            const distToCenter = (cCoord - axisPos) * veh.direction;
            if (distToCenter > 10 && distToCenter < 24) {
              const ix = veh.lane === 'vertical' ? veh.roadCoord : cCoord;
              const iz = veh.lane === 'vertical' ? cCoord : veh.roadCoord;
              const sig = getSignalState(ix, iz, timeSec);
              const myLight = veh.lane === 'vertical' ? sig.ns : sig.ew;

              if (myLight === 'red' || (myLight === 'amber' && distToCenter > 13.5)) {
                approachingSignalStop = true;
              }
              if (veh.plannedTurn === 'left') approachingIndicator = 'left';
              else if (veh.plannedTurn === 'right' || veh.plannedTurn === 'uturn') approachingIndicator = 'right';
            }

            if (distToCenter > 9.5 && distToCenter < 12.5 && veh.lastDecisionCoord !== cCoord) {
              veh.lastDecisionCoord = cCoord;
              const ix = veh.lane === 'vertical' ? veh.roadCoord : cCoord;
              const iz = veh.lane === 'vertical' ? cCoord : veh.roadCoord;
              const sig = getSignalState(ix, iz, timeSec);
              const myLight = veh.lane === 'vertical' ? sig.ns : sig.ew;

              if (myLight !== 'red' && veh.plannedTurn !== 'straight') {
                veh.turnPhase = buildIntersectionTurn(veh, ix, iz, veh.plannedTurn);
              }
            }
          }

          if (!veh.turnPhase && veh.plannedTurn === 'uturn') {
            const uturnBays =
              veh.lane === 'vertical' ? ROAD_NETWORK.uturnBaysVerticalZ : ROAD_NETWORK.uturnBaysHorizontalX;
            for (const bayCoord of uturnBays) {
              const distToBay = (bayCoord - axisPos) * veh.direction;
              if (distToBay > 6 && distToBay < 18) {
                approachingIndicator = 'right';
              }
              if (distToBay > 3.5 && distToBay < 7.5 && veh.lastDecisionCoord !== bayCoord) {
                veh.lastDecisionCoord = bayCoord;
                const nextDir = (veh.direction === 1 ? -1 : 1) as 1 | -1;
                if (veh.lane === 'vertical') {
                  const exitX = getLanePosition('vertical', veh.roadCoord, nextDir, veh.laneOffset);
                  veh.turnPhase = {
                    p0x: veh.x,
                    p0z: veh.z,
                    p1x: veh.roadCoord,
                    p1z: bayCoord + veh.direction * 3.5,
                    p2x: exitX,
                    p2z: veh.z,
                    t: 0,
                    duration: 1.65,
                    nextLane: 'vertical',
                    nextDir,
                    nextRoadCoord: veh.roadCoord,
                    signalSide: 'right',
                  };
                } else {
                  const exitZ = getLanePosition('horizontal', veh.roadCoord, nextDir, veh.laneOffset);
                  veh.turnPhase = {
                    p0x: veh.x,
                    p0z: veh.z,
                    p1x: bayCoord + veh.direction * 3.5,
                    p1z: veh.roadCoord,
                    p2x: veh.x,
                    p2z: exitZ,
                    t: 0,
                    duration: 1.65,
                    nextLane: 'horizontal',
                    nextDir,
                    nextRoadCoord: veh.roadCoord,
                    signalSide: 'right',
                  };
                }
                break;
              }
            }
          }

          if (veh.leftIndMat) {
            veh.leftIndMat.emissiveIntensity = approachingIndicator === 'left' && blinkOn ? 2.6 : 0;
          }
          if (veh.rightIndMat) {
            veh.rightIndMat.emissiveIntensity = approachingIndicator === 'right' && blinkOn ? 2.6 : 0;
          }

          if (mustStop || approachingSignalStop) {
            veh.speed = Math.max(0, veh.speed - 22 * delta);
          } else if (mustSlow) {
            veh.speed = Math.max(3, veh.speed - 10 * delta);
          } else {
            veh.speed += (veh.targetSpeed - veh.speed) * 0.9 * delta;
          }

          if (veh.lane === 'vertical') {
            veh.z += veh.direction * veh.speed * delta;
            if (veh.direction === 1 && veh.z > maxZLoop) {
              veh.z = minZLoop;
              veh.lastDecisionCoord = -9999;
            } else if (veh.direction === -1 && veh.z < minZLoop) {
              veh.z = maxZLoop;
              veh.lastDecisionCoord = -9999;
            }
          } else {
            veh.x += veh.direction * veh.speed * delta;
            if (veh.direction === 1 && veh.x > maxXLoop) {
              veh.x = minXLoop;
              veh.lastDecisionCoord = -9999;
            } else if (veh.direction === -1 && veh.x < minXLoop) {
              veh.x = maxXLoop;
              veh.lastDecisionCoord = -9999;
            }
          }
        }

        veh.mesh.visible = minBusDist <= viewRadius + 90;
        if (veh.mesh.visible) {
          const wheelSpin = (veh.speed * delta) / 0.32;
          veh.wheels.forEach((w) => {
            w.rotation.x += wheelSpin;
          });
          veh.mesh.position.set(veh.x, getTerrainHeight(veh.x, veh.z), veh.z);
          veh.mesh.rotation.y = veh.heading;
        }
      }

      return { collided, vehicle: hitVeh };
    },
    setTrafficLights: (lightsOn: boolean) => {
      headLampMats.forEach((m) => {
        m.emissiveIntensity = lightsOn ? 2.4 : 0.25;
      });
      tailLampMats.forEach((m) => {
        m.emissiveIntensity = lightsOn ? 1.8 : 0.45;
      });
    },
    dispose: () => {
      vehicles.forEach((v) => scene.remove(v.mesh));
      vehicles.length = 0;
    },
  };
}
