import * as THREE from 'three';
import {
  BUS_STOPS,
  CURVED_ROADS,
  HIGHWAY_FACILITIES,
  ROAD_NETWORK,
  TimeOfDayId,
  WeatherId,
  getTerrainHeight,
} from './constants';
import {
  createBusShelter,
  createClockTower,
  createCoconutStall,
  createConstructionZone,
  createPassengerCharacter,
  createPetrolBunk,
  createPoliceCheckpost,
  createRailwayCrossing,
  createRoadsideTree,
  createTeaStall,
  createTollPlaza,
} from './proceduralModels';
import {
  createAsphaltTextures,
  createBuildingFacadeTextures,
  createCurbTexture,
  createKonguTerrainTextures,
  createSkyDomeTexture,
} from './textures';
import { getSignalState, isMedianGap } from './navigationSystem';

export interface StopMeshTracker {
  stopId: string;
  group: THREE.Group;
  passengers: THREE.Group[];
  baseY: number[];
  markerRing: THREE.Mesh;
}

interface TrafficSignalUnit {
  ix: number;
  iz: number;
  nsRed: THREE.MeshStandardMaterial;
  nsAmber: THREE.MeshStandardMaterial;
  nsGreen: THREE.MeshStandardMaterial;
  ewRed: THREE.MeshStandardMaterial;
  ewAmber: THREE.MeshStandardMaterial;
  ewGreen: THREE.MeshStandardMaterial;
}

interface WorldChunk {
  cx: number;
  cz: number;
  centerX: number;
  centerZ: number;
  group: THREE.Group;
}

function createRoadArrowTexture(type: 'straight' | 'left' | 'right' | 'uturn'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 256);

  ctx.fillStyle = 'rgba(248, 250, 252, 0.88)';
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.88)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'straight') {
    ctx.beginPath();
    ctx.moveTo(64, 224);
    ctx.lineTo(64, 36);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(64, 20);
    ctx.lineTo(34, 72);
    ctx.lineTo(94, 72);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'left') {
    ctx.beginPath();
    ctx.moveTo(46, 224);
    ctx.lineTo(46, 98);
    ctx.quadraticCurveTo(46, 62, 92, 62);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(114, 62);
    ctx.lineTo(74, 36);
    ctx.lineTo(74, 88);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'right') {
    ctx.beginPath();
    ctx.moveTo(82, 224);
    ctx.lineTo(82, 98);
    ctx.quadraticCurveTo(82, 62, 36, 62);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, 62);
    ctx.lineTo(54, 36);
    ctx.lineTo(54, 88);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(84, 215);
    ctx.lineTo(84, 92);
    ctx.arc(60, 92, 24, 0, Math.PI, true);
    ctx.lineTo(36, 152);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(36, 174);
    ctx.lineTo(14, 134);
    ctx.lineTo(58, 134);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSpeedLimitSignTexture(limit: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#dc2626';
  ctx.stroke();
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 54px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(limit, 64, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createUTurnSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 120, 120);

  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(82, 98);
  ctx.lineTo(82, 48);
  ctx.arc(60, 48, 22, 0, Math.PI, true);
  ctx.lineTo(38, 72);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(38, 92);
  ctx.lineTo(22, 66);
  ctx.lineTo(54, 66);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCoimbatoreCity(
  scene: THREE.Scene,
  anisotropy: number = 4
): {
  colliders: { minX: number; maxX: number; minZ: number; maxZ: number }[];
  stopTrackers: StopMeshTracker[];
  updatePassengers: (activeStopId: string, isBusStopped: boolean) => void;
  updateEnvironment: (timeSec: number, busX?: number, busZ?: number, viewRadius?: number) => void;
  setAtmosphere: (timeOfDay: TimeOfDayId, weather: WeatherId, isNight: boolean) => void;
  dispose: () => void;
} {
  const colliders: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  const stopTrackers: StopMeshTracker[] = [];
  const buildingMaterials: THREE.MeshStandardMaterial[] = [];
  const streetLampBulbMats: THREE.MeshStandardMaterial[] = [];
  const trafficSignals: TrafficSignalUnit[] = [];
  const roadMaterials: THREE.MeshStandardMaterial[] = [];
  const disposableRootObjects: THREE.Object3D[] = [];

  // Spatial chunk registry for open-world mobile FPS culling
  const CHUNK_SIZE = 280;
  const chunksMap = new Map<string, WorldChunk>();
  const addToChunk = (obj: THREE.Object3D, wx: number, wz: number) => {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const key = `${cx}_${cz}`;
    let chunk = chunksMap.get(key);
    if (!chunk) {
      const group = new THREE.Group();
      scene.add(group);
      disposableRootObjects.push(group);
      chunk = {
        cx,
        cz,
        centerX: (cx + 0.5) * CHUNK_SIZE,
        centerZ: (cz + 0.5) * CHUNK_SIZE,
        group,
      };
      chunksMap.set(key, chunk);
    }
    chunk.group.add(obj);
  };

  // 0. Atmospheric Sky Dome sized for the expanded 1560x1640 Tamil Nadu open world
  const skyDomeGeom = new THREE.SphereGeometry(1180, 32, 20);
  const skyDomeMat = new THREE.MeshBasicMaterial({
    map: createSkyDomeTexture('day', 'sunny'),
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const skyDome = new THREE.Mesh(skyDomeGeom, skyDomeMat);
  scene.add(skyDome);
  disposableRootObjects.push(skyDome);

  // 1. Displaced Multi-Biome Tamil Nadu Terrain (1560 x 1640)
  const terrainTex = createKonguTerrainTextures(anisotropy);
  terrainTex.map.repeat.set(56, 58);
  terrainTex.bumpMap.repeat.set(56, 58);

  const terrainGeom = new THREE.PlaneGeometry(1560, 1640, 96, 96);
  const tPos = terrainGeom.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(tPos.count * 3);
  const colPlain = new THREE.Color(0xcbd5b1);
  const colGhat = new THREE.Color(0x6b9e78);
  const colCoast = new THREE.Color(0xe7d8b1);
  const colTemp = new THREE.Color();

  for (let i = 0; i < tPos.count; i++) {
    const wx = tPos.getX(i);
    const wz = -tPos.getY(i);
    const h = getTerrainHeight(wx, wz);
    tPos.setZ(i, h - 0.08);

    const hillBlend = Math.min(1, h / 11.5);
    const coastBlend = Math.max(
      0,
      Math.min(1, Math.max((wx - 430) / 170, (wz - 470) / 170))
    );
    colTemp.copy(colPlain).lerp(colGhat, hillBlend).lerp(colCoast, coastBlend * 0.72);
    colors[i * 3 + 0] = colTemp.r;
    colors[i * 3 + 1] = colTemp.g;
    colors[i * 3 + 2] = colTemp.b;
  }
  terrainGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeom.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: terrainTex.map,
    bumpMap: terrainTex.bumpMap,
    bumpScale: 0.08,
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
  });
  const terrain = new THREE.Mesh(terrainGeom, terrainMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  scene.add(terrain);
  disposableRootObjects.push(terrain);

  // 2. Western Ghats, Nilgiris, Anaimalai/Valparai & Palani-Kodaikanal Mountain Ridges
  const mountainMatFar = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.95 });
  const mountainMatNear = new THREE.MeshStandardMaterial({ color: 0x1e4635, roughness: 0.92 });
  const mountainSpecs = [
    { x: -640, z: -600, r: 125, h: 110, far: true },
    { x: -570, z: -645, r: 105, h: 92, far: true },
    { x: -655, z: -380, r: 112, h: 96, far: true },
    { x: -650, z: -90, r: 95, h: 78, far: true },
    { x: -645, z: 220, r: 105, h: 88, far: true },
    { x: -655, z: 440, r: 110, h: 95, far: true },
    { x: -555, z: -395, r: 52, h: 42, far: false },
    { x: -375, z: -430, r: 48, h: 38, far: false },
    { x: -590, z: 365, r: 44, h: 36, far: false },
    { x: -135, z: 375, r: 46, h: 34, far: false },
  ];
  mountainSpecs.forEach((m) => {
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(m.r, m.h, 9),
      m.far ? mountainMatFar : mountainMatNear
    );
    const groundY = getTerrainHeight(m.x, m.z);
    hill.position.set(m.x, groundY + m.h * 0.42, m.z);
    hill.scale.set(1.2, 1, 1.45);
    addToChunk(hill, m.x, m.z);
  });

  // 3. Bay of Bengal / Indian Ocean Coastline (East & South) + Cauvery & Vaigai Rivers
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x0369a1,
    roughness: 0.08,
    metalness: 0.78,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  const eastOcean = new THREE.Mesh(new THREE.PlaneGeometry(340, 1680), waterMat);
  eastOcean.rotation.x = -Math.PI / 2;
  eastOcean.position.set(710, -0.02, 0);
  scene.add(eastOcean);
  disposableRootObjects.push(eastOcean);

  const southOcean = new THREE.Mesh(new THREE.PlaneGeometry(1680, 340), waterMat);
  southOcean.rotation.x = -Math.PI / 2;
  southOcean.position.set(0, -0.02, 730);
  scene.add(southOcean);
  disposableRootObjects.push(southOcean);

  // Cauvery River Channel near Z = 0, X = -80..420
  const cauveryRiver = new THREE.Mesh(new THREE.PlaneGeometry(36, 520), waterMat);
  cauveryRiver.rotation.x = -Math.PI / 2;
  cauveryRiver.rotation.z = Math.PI / 2;
  cauveryRiver.position.set(140, -0.02, 42);
  scene.add(cauveryRiver);
  disposableRootObjects.push(cauveryRiver);

  // Pamban Sea Channel crossing under Rameswaram bridge (X=480, Z=130)
  const pambanChannel = new THREE.Mesh(new THREE.PlaneGeometry(160, 44), waterMat);
  pambanChannel.rotation.x = -Math.PI / 2;
  pambanChannel.position.set(510, -0.02, 130);
  scene.add(pambanChannel);
  disposableRootObjects.push(pambanChannel);

  // 4. PBR 20m Divided 4-Lane Tamil Nadu Highways (5x5 Network)
  const asphaltTex = createAsphaltTextures(anisotropy);
  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex.map,
    bumpMap: asphaltTex.bumpMap,
    bumpScale: 0.035,
    roughnessMap: asphaltTex.roughnessMap,
    roughness: 0.84,
    metalness: 0.08,
    envMapIntensity: 0.65,
  });

  const curbTex = createCurbTexture(anisotropy);
  curbTex.repeat.set(2, 1);
  const sharedCurbMat = new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.72 });

  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const ghatEdgeLineMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const medianBodyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
  const bollardMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.35,
    roughness: 0.35,
  });
  const medianBushMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });

  const roadW = ROAD_NETWORK.roadWidth;
  const halfRoad = roadW / 2;

  const dashMatrices: THREE.Matrix4[] = [];
  const curbMatrices: THREE.Matrix4[] = [];
  const medianMatrices: THREE.Matrix4[] = [];
  const bollardMatrices: THREE.Matrix4[] = [];
  const shrubMatrices: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();

  const pushBoxMatrix = (
    target: THREE.Matrix4[],
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rx: number = 0
  ) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(rx, 0, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    target.push(dummy.matrix.clone());
  };

  const createDividedRoad = (
    centerX: number,
    centerZ: number,
    length: number,
    isVertical: boolean
  ) => {
    const segTexMap = asphaltTex.map.clone();
    segTexMap.needsUpdate = true;
    const repeatAlong = Math.max(1, Math.round(length / 18));
    if (isVertical) {
      segTexMap.repeat.set(1.25, repeatAlong);
    } else {
      segTexMap.repeat.set(repeatAlong, 1.25);
    }

    const segMat = roadMat.clone();
    segMat.map = segTexMap;
    roadMaterials.push(segMat);

    const segCount = 80;
    const roadGeom = isVertical
      ? new THREE.PlaneGeometry(roadW, length, 4, segCount)
      : new THREE.PlaneGeometry(length, roadW, segCount, 4);

    const posAttr = roadGeom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const wx = centerX + posAttr.getX(i);
      const wz = centerZ - posAttr.getY(i);
      posAttr.setZ(i, getTerrainHeight(wx, wz) + 0.02);
    }
    roadGeom.computeVertexNormals();

    const road = new THREE.Mesh(roadGeom, segMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(centerX, 0, centerZ);
    road.receiveShadow = true;
    scene.add(road);
    disposableRootObjects.push(road);

    const startAlong = isVertical ? centerZ - length / 2 : centerX - length / 2;
    const endAlong = isVertical ? centerZ + length / 2 : centerX + length / 2;

    for (let pos = startAlong + 5; pos < endAlong - 5; pos += 12) {
      const checkX = isVertical ? centerX : pos;
      const checkZ = isVertical ? pos : centerZ;
      const inIntersection =
        ROAD_NETWORK.verticalX.some((vx) => Math.abs(checkX - vx) < 11.5) &&
        ROAD_NETWORK.horizontalZ.some((hz) => Math.abs(checkZ - hz) < 11.5);

      if (inIntersection) continue;

      const gy = getTerrainHeight(checkX, checkZ);

      [-4.0, 4.0].forEach((laneDiv) => {
        pushBoxMatrix(
          dashMatrices,
          isVertical ? centerX + laneDiv : pos,
          gy + 0.036,
          isVertical ? pos : centerZ + laneDiv,
          isVertical ? 0.22 : 4.2,
          isVertical ? 4.2 : 0.22,
          1,
          -Math.PI / 2
        );
      });

      pushBoxMatrix(
        curbMatrices,
        isVertical ? centerX - halfRoad - 0.25 : pos,
        gy + 0.12,
        isVertical ? pos : centerZ - halfRoad - 0.25,
        isVertical ? 0.55 : 12,
        0.24,
        isVertical ? 12 : 0.55
      );
      pushBoxMatrix(
        curbMatrices,
        isVertical ? centerX + halfRoad + 0.25 : pos,
        gy + 0.12,
        isVertical ? pos : centerZ + halfRoad + 0.25,
        isVertical ? 0.55 : 12,
        0.24,
        isVertical ? 12 : 0.55
      );

      if (!isMedianGap(checkX, checkZ)) {
        const nearToll = HIGHWAY_FACILITIES.some(
          (f) => f.type === 'toll' && Math.hypot(checkX - f.x, checkZ - f.z) < 8
        );
        if (!nearToll) {
          pushBoxMatrix(
            medianMatrices,
            checkX,
            gy + 0.13,
            checkZ,
            isVertical ? 1.1 : 11.6,
            0.26,
            isVertical ? 11.6 : 1.1
          );

          if (Math.abs(Math.round(pos)) % 24 < 12) {
            pushBoxMatrix(bollardMatrices, checkX, gy + 0.52, checkZ, 1, 1, 1);
          } else {
            pushBoxMatrix(shrubMatrices, checkX, gy + 0.48, checkZ, 1, 0.75, 1);
          }

          colliders.push({
            minX: checkX - (isVertical ? 0.42 : 5.8),
            maxX: checkX + (isVertical ? 0.42 : 5.8),
            minZ: checkZ - (isVertical ? 5.8 : 0.42),
            maxZ: checkZ + (isVertical ? 5.8 : 0.42),
          });
        }
      }
    }
  };

  ROAD_NETWORK.verticalX.forEach((vx) => createDividedRoad(vx, 0, 1280, true));
  ROAD_NETWORK.horizontalZ.forEach((hz) => createDividedRoad(0, hz, 1200, false));

  // 4B. Scenic Curved Mountain Hairpin Roads (Ooty, Valparai, Kodaikanal)
  const guardrailMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.65, roughness: 0.4 });
  const guardrailPostMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.45 });

  CURVED_ROADS.forEach((cr) => {
    const curvePts = cr.points.map((p) => new THREE.Vector3(p.x, 0, p.z));
    const curve = new THREE.CatmullRomCurve3(curvePts, false, 'catmullrom', 0.42);
    const totalSamples = Math.max(48, cr.points.length * 14);
    const halfW = cr.width / 2;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const edgeLeftPts: THREE.Vector3[] = [];
    const edgeRightPts: THREE.Vector3[] = [];
    let accumLen = 0;
    let prevCenter: THREE.Vector3 | null = null;

    for (let i = 0; i <= totalSamples; i++) {
      const t = i / totalSamples;
      const pt = curve.getPoint(t);
      const tan = curve.getTangent(t).normalize();
      if (prevCenter) accumLen += pt.distanceTo(prevCenter);
      prevCenter = pt.clone();

      // Perpendicular right vector in XZ plane
      const perpX = -tan.z;
      const perpZ = tan.x;

      const lx = pt.x - perpX * halfW;
      const lz = pt.z - perpZ * halfW;
      const rx = pt.x + perpX * halfW;
      const rz = pt.z + perpZ * halfW;

      const ly = getTerrainHeight(lx, lz) + 0.038;
      const ry = getTerrainHeight(rx, rz) + 0.038;

      positions.push(lx, ly, lz, rx, ry, rz);
      uvs.push(0, accumLen / 12, 1, accumLen / 12);

      edgeLeftPts.push(new THREE.Vector3(lx, ly, lz));
      edgeRightPts.push(new THREE.Vector3(rx, ry, rz));

      if (i < totalSamples) {
        const base = i * 2;
        indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      }
    }

    const ribbonGeom = new THREE.BufferGeometry();
    ribbonGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    ribbonGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    ribbonGeom.setIndex(indices);
    ribbonGeom.computeVertexNormals();

    const ghatTexMap = asphaltTex.map.clone();
    ghatTexMap.needsUpdate = true;
    ghatTexMap.repeat.set(0.9, 1);
    const ghatMat = roadMat.clone();
    ghatMat.map = ghatTexMap;
    ghatMat.side = THREE.DoubleSide;
    roadMaterials.push(ghatMat);

    const ghatMesh = new THREE.Mesh(ribbonGeom, ghatMat);
    ghatMesh.receiveShadow = true;
    scene.add(ghatMesh);
    disposableRootObjects.push(ghatMesh);

    // Ghat dashed centerlines & yellow guardrail posts
    for (let i = 2; i < totalSamples - 2; i += 4) {
      const pL = edgeLeftPts[i];
      const pR = edgeRightPts[i];
      const pNextL = edgeLeftPts[i + 1];
      const pNextR = edgeRightPts[i + 1];
      const midX = (pL.x + pR.x) * 0.5;
      const midZ = (pL.z + pR.z) * 0.5;
      const nextMidX = (pNextL.x + pNextR.x) * 0.5;
      const nextMidZ = (pNextL.z + pNextR.z) * 0.5;
      const yaw = Math.atan2(nextMidX - midX, nextMidZ - midZ);
      const midY = getTerrainHeight(midX, midZ) + 0.055;

      const centerDash = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 3.0), ghatEdgeLineMat);
      centerDash.rotation.x = -Math.PI / 2;
      centerDash.rotation.z = -yaw;
      centerDash.position.set(midX, midY, midZ);
      addToChunk(centerDash, midX, midZ);

      if (i % 8 === 2) {
        [pL, pR].forEach((edgePt) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.18), guardrailPostMat);
          post.position.set(edgePt.x, edgePt.y + 0.36, edgePt.z);
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 3.4), guardrailMat);
          rail.position.set(edgePt.x, edgePt.y + 0.58, edgePt.z);
          rail.rotation.y = yaw;
          addToChunk(post, edgePt.x, edgePt.z);
          addToChunk(rail, edgePt.x, edgePt.z);
        });
      }
    }
  });

  const addInstancedBatch = (
    geom: THREE.BufferGeometry,
    mat: THREE.Material,
    matrices: THREE.Matrix4[],
    castShadow = false,
    receiveShadow = false
  ) => {
    if (matrices.length === 0) return;
    const im = new THREE.InstancedMesh(geom, mat, matrices.length);
    for (let i = 0; i < matrices.length; i++) {
      im.setMatrixAt(i, matrices[i]);
    }
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = castShadow;
    im.receiveShadow = receiveShadow;
    scene.add(im);
    disposableRootObjects.push(im);
  };

  addInstancedBatch(new THREE.PlaneGeometry(1, 1), lineMat, dashMatrices);
  addInstancedBatch(new THREE.BoxGeometry(1, 1, 1), sharedCurbMat, curbMatrices);
  addInstancedBatch(new THREE.BoxGeometry(1, 1, 1), medianBodyMat, medianMatrices, true, true);
  addInstancedBatch(new THREE.CylinderGeometry(0.1, 0.12, 0.75, 8), bollardMat, bollardMatrices);
  addInstancedBatch(new THREE.DodecahedronGeometry(0.45, 0), medianBushMat, shrubMatrices);

  // Pavement Markings & Traffic Signs
  const straightTex = createRoadArrowTexture('straight');
  const leftTex = createRoadArrowTexture('left');
  const rightTex = createRoadArrowTexture('right');
  const uturnTex = createRoadArrowTexture('uturn');

  const placePavementArrow = (x: number, z: number, rotY: number, tex: THREE.CanvasTexture) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 3.8),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rotY;
    m.position.set(x, getTerrainHeight(x, z) + 0.04, z);
    addToChunk(m, x, z);
  };

  const uturnSignTex = createUTurnSignTexture();
  const uturnSignMat = new THREE.MeshStandardMaterial({
    map: uturnSignTex,
    emissive: 0xffffff,
    emissiveMap: uturnSignTex,
    emissiveIntensity: 0.35,
  });
  const speed60Tex = createSpeedLimitSignTexture('60');
  const speed80Tex = createSpeedLimitSignTexture('80');
  const speed45Tex = createSpeedLimitSignTexture('45');
  const speed60Mat = new THREE.MeshStandardMaterial({
    map: speed60Tex,
    emissive: 0xffffff,
    emissiveMap: speed60Tex,
    emissiveIntensity: 0.25,
  });
  const speed80Mat = new THREE.MeshStandardMaterial({
    map: speed80Tex,
    emissive: 0xffffff,
    emissiveMap: speed80Tex,
    emissiveIntensity: 0.25,
  });
  const speed45Mat = new THREE.MeshStandardMaterial({
    map: speed45Tex,
    emissive: 0xffffff,
    emissiveMap: speed45Tex,
    emissiveIntensity: 0.25,
  });

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.35 });
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });

  const placeUTurnBayMarkers = (x: number, z: number, isVertical: boolean) => {
    const gy = getTerrainHeight(x, z);
    if (isVertical) {
      placePavementArrow(x + 2.6, z - 8, Math.PI, uturnTex);
      placePavementArrow(x - 2.6, z + 8, 0, uturnTex);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.8, 8), poleMat);
      post.position.set(x, gy + 1.4, z - 7);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.08), uturnSignMat);
      sign.position.set(x, gy + 2.6, z - 7);
      addToChunk(post, x, z);
      addToChunk(sign, x, z);
    } else {
      placePavementArrow(x - 8, z - 2.6, -Math.PI / 2, uturnTex);
      placePavementArrow(x + 8, z + 2.6, Math.PI / 2, uturnTex);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.8, 8), poleMat);
      post.position.set(x - 7, gy + 1.4, z);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.85), uturnSignMat);
      sign.position.set(x - 7, gy + 2.6, z);
      addToChunk(post, x, z);
      addToChunk(sign, x, z);
    }
  };

  ROAD_NETWORK.verticalX.forEach((vx) => {
    ROAD_NETWORK.uturnBaysVerticalZ.forEach((uz) => {
      const skip = HIGHWAY_FACILITIES.some((f) => Math.hypot(vx - f.x, uz - f.z) < 18);
      if (!skip) placeUTurnBayMarkers(vx, uz, true);
    });
  });
  ROAD_NETWORK.horizontalZ.forEach((hz) => {
    ROAD_NETWORK.uturnBaysHorizontalX.forEach((ux) => {
      const skip = HIGHWAY_FACILITIES.some((f) => Math.hypot(ux - f.x, hz - f.z) < 18);
      if (!skip) placeUTurnBayMarkers(ux, hz, false);
    });
  });

  // Tamil Nadu Regional Speed Limit Signs (45 Hill / 60 City / 80 Highway)
  [
    { x: -229.2, z: -135, rot: 0, mat: speed60Mat },
    { x: -250.8, z: -310, rot: Math.PI, mat: speed80Mat },
    { x: -469.2, z: -315, rot: Math.PI, mat: speed45Mat },
    { x: 10.8, z: -45, rot: 0, mat: speed80Mat },
    { x: 469.2, z: -395, rot: Math.PI, mat: speed60Mat },
    { x: 229.2, z: 290, rot: 0, mat: speed60Mat },
    { x: -469.2, z: 295, rot: 0, mat: speed45Mat },
    { x: 10.8, z: 340, rot: 0, mat: speed80Mat },
  ].forEach(({ x, z, rot, mat }) => {
    const gy = getTerrainHeight(x, z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 8), poleMat);
    post.position.set(x, gy + 1.6, z);
    const board = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.06, 20), mat);
    board.rotation.x = Math.PI / 2;
    board.rotation.z = rot;
    board.position.set(x, gy + 3.1, z);
    addToChunk(post, x, z);
    addToChunk(board, x, z);
  });

  // 5. All 25 Intersections: Zebra Crossings, Stop Lines, Pavement Arrows & Synced 4-Way Signals
  const zebraMatrices: THREE.Matrix4[] = [];
  const lensGeom = new THREE.SphereGeometry(0.16, 10, 10);

  ROAD_NETWORK.verticalX.forEach((ix) => {
    ROAD_NETWORK.horizontalZ.forEach((iz) => {
      const gy = getTerrainHeight(ix, iz);

      for (let s = -8; s <= 8; s += 1.6) {
        pushBoxMatrix(zebraMatrices, ix + s, gy + 0.038, iz - 11.4, 0.75, 2.6, 1, -Math.PI / 2);
        pushBoxMatrix(zebraMatrices, ix + s, gy + 0.038, iz + 11.4, 0.75, 2.6, 1, -Math.PI / 2);
        pushBoxMatrix(zebraMatrices, ix - 11.4, gy + 0.038, iz + s, 2.6, 0.75, 1, -Math.PI / 2);
        pushBoxMatrix(zebraMatrices, ix + 11.4, gy + 0.038, iz + s, 2.6, 0.75, 1, -Math.PI / 2);
      }

      pushBoxMatrix(zebraMatrices, ix + 5.0, gy + 0.039, iz - 13.4, 9.2, 0.45, 1, -Math.PI / 2);
      pushBoxMatrix(zebraMatrices, ix - 5.0, gy + 0.039, iz + 13.4, 9.2, 0.45, 1, -Math.PI / 2);
      pushBoxMatrix(zebraMatrices, ix - 13.4, gy + 0.039, iz - 5.0, 0.45, 9.2, 1, -Math.PI / 2);
      pushBoxMatrix(zebraMatrices, ix + 13.4, gy + 0.039, iz + 5.0, 0.45, 9.2, 1, -Math.PI / 2);

      placePavementArrow(ix + 5.4, iz - 18, Math.PI, leftTex);
      placePavementArrow(ix + 2.6, iz - 18, Math.PI, straightTex);
      placePavementArrow(ix - 5.4, iz + 18, 0, leftTex);
      placePavementArrow(ix - 2.6, iz + 18, 0, rightTex);
      placePavementArrow(ix - 18, iz - 5.4, -Math.PI / 2, leftTex);
      placePavementArrow(ix - 18, iz - 2.6, -Math.PI / 2, straightTex);
      placePavementArrow(ix + 18, iz + 5.4, Math.PI / 2, leftTex);
      placePavementArrow(ix + 18, iz + 2.6, Math.PI / 2, rightTex);

      const nsRed = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.05 });
      const nsAmber = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.05 });
      const nsGreen = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 2.4 });
      const ewRed = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.4 });
      const ewAmber = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.05 });
      const ewGreen = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.05 });

      const createSignalPole = (
        px: number,
        pz: number,
        rotY: number,
        rMat: THREE.MeshStandardMaterial,
        aMat: THREE.MeshStandardMaterial,
        gMat: THREE.MeshStandardMaterial
      ) => {
        const g = new THREE.Group();
        g.position.set(px, getTerrainHeight(px, pz), pz);
        g.rotation.y = rotY;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 5.2, 8), poleMat);
        post.position.y = 2.6;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8), poleMat);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(-1.7, 5.0, 0);
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.45, 0.45), housingMat);
        box.position.set(-3.2, 4.6, 0);

        const rL = new THREE.Mesh(lensGeom, rMat);
        rL.position.set(-3.2, 5.05, 0.22);
        const aL = new THREE.Mesh(lensGeom, aMat);
        aL.position.set(-3.2, 4.6, 0.22);
        const gL = new THREE.Mesh(lensGeom, gMat);
        gL.position.set(-3.2, 4.15, 0.22);

        const rL2 = new THREE.Mesh(lensGeom, rMat);
        rL2.position.set(-3.2, 5.05, -0.22);
        const aL2 = new THREE.Mesh(lensGeom, aMat);
        aL2.position.set(-3.2, 4.6, -0.22);
        const gL2 = new THREE.Mesh(lensGeom, gMat);
        gL2.position.set(-3.2, 4.15, -0.22);

        g.add(post, arm, box, rL, aL, gL, rL2, aL2, gL2);
        addToChunk(g, px, pz);
      };

      createSignalPole(ix + 11.2, iz - 11.2, 0, nsRed, nsAmber, nsGreen);
      createSignalPole(ix - 11.2, iz + 11.2, Math.PI, nsRed, nsAmber, nsGreen);
      createSignalPole(ix - 11.2, iz - 11.2, Math.PI / 2, ewRed, ewAmber, ewGreen);
      createSignalPole(ix + 11.2, iz + 11.2, -Math.PI / 2, ewRed, ewAmber, ewGreen);

      trafficSignals.push({ ix, iz, nsRed, nsAmber, nsGreen, ewRed, ewAmber, ewGreen });
    });
  });
  addInstancedBatch(new THREE.PlaneGeometry(1, 1), lineMat, zebraMatrices);

  // Highway Directional Gantries across Tamil Nadu Corridors
  const createHighwayGantry = (gx: number, gz: number, signText: string, subText: string, rotY: number = 0) => {
    const gantry = new THREE.Group();
    gantry.position.set(gx, getTerrainHeight(gx, gz), gz);
    gantry.rotation.y = rotY;

    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.8, 10), poleMat);
    leftPost.position.set(-10.8, 3.4, 0);
    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.8, 10), poleMat);
    rightPost.position.set(10.8, 3.4, 0);
    const truss = new THREE.Mesh(new THREE.BoxGeometry(22.2, 0.35, 0.35), poleMat);
    truss.position.set(0, 6.5, 0);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 1004, 236);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(signText, 512, 105);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 34px "Noto Sans Tamil", sans-serif';
    ctx.fillText(subText, 512, 185);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;

    const boardMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.3,
      roughness: 0.4,
    });
    const boardFront = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 2.6), boardMat);
    boardFront.position.set(0, 6.5, 0.22);
    const boardBack = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 2.6), boardMat);
    boardBack.position.set(0, 6.5, -0.22);
    boardBack.rotation.y = Math.PI;

    gantry.add(leftPost, rightPost, truss, boardFront, boardBack);
    addToChunk(gantry, gx, gz);
  };

  createHighwayGantry(-240, -195, 'NH-544  ▲  SALEM / OOTY  |  COIMBATORE  ▼', 'தமிழ்நாடு நெடுஞ்சாலை • இடதுபுறம் செல்லவும்');
  createHighwayGantry(0, -195, 'ERODE  ▲  |  DINDIGUL  |  TIRUNELVELI  ▼', 'காவிரி பாலம் • SPEED LIMIT 80 KM/H');
  createHighwayGantry(480, -370, 'CHENNAI CMBT  ▲  |  RAMESWARAM  ▼', 'சென்னை – ராமேஸ்வரம் நெடுஞ்சாலை');
  createHighwayGantry(-275, -260, 'METTUPALAYAM  ⬅  |  OOTY 36-HAIRPIN GHAT ➔', 'நீலகிரி மலைப்பாதை • 40 KM/H MAX', Math.PI / 2);
  createHighwayGantry(240, 220, 'TRICHY  ▲  |  MADURAI MEENAKSHI  ▼', 'மதுரை மாட்டுத்தாவணி • பெரியார் நிலையம்');

  // 6. Highway Infrastructure: Tolls, Petrol Bunks, Rail Crossings, Bridges, Police & Construction
  const bridgeConcreteMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.72 });
  HIGHWAY_FACILITIES.forEach((fac) => {
    const gy = getTerrainHeight(fac.x, fac.z);
    if (fac.type === 'toll') {
      const toll = createTollPlaza();
      toll.position.set(fac.x, gy, fac.z);
      if (fac.axis === 'horizontal') toll.rotation.y = Math.PI / 2;
      addToChunk(toll, fac.x, fac.z);
    } else if (fac.type === 'petrol') {
      const bunk = createPetrolBunk(
        fac.id === 'petrol_kovai'
          ? 'BHARAT PETROLEUM'
          : fac.id === 'petrol_trichy'
          ? 'INDIANOIL KAVERI'
          : 'HP HIGHWAY DIESEL'
      );
      bunk.position.set(fac.x + 8, gy, fac.z);
      bunk.rotation.y = -Math.PI / 2;
      addToChunk(bunk, fac.x, fac.z);
    } else if (fac.type === 'rail_crossing') {
      const rail = createRailwayCrossing();
      rail.position.set(fac.x, gy, fac.z);
      if (fac.axis === 'vertical') rail.rotation.y = Math.PI / 2;
      addToChunk(rail, fac.x, fac.z);
    } else if (fac.type === 'bridge') {
      [-10.6, 10.6].forEach((offset) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.35, 42), bridgeConcreteMat);
        wall.position.set(fac.x + offset, gy + 0.67, fac.z);
        wall.castShadow = true;
        addToChunk(wall, fac.x, fac.z);
      });
    } else if (fac.type === 'rest_stop') {
      const tea = createTeaStall();
      tea.position.set(fac.x, gy, fac.z - 6.5);
      addToChunk(tea, fac.x, fac.z);
    } else if (fac.type === 'police_check') {
      const police = createPoliceCheckpost();
      police.position.set(fac.x, gy, fac.z);
      if (fac.axis === 'horizontal') police.rotation.y = Math.PI / 2;
      addToChunk(police, fac.x, fac.z);
    } else if (fac.type === 'construction') {
      const work = createConstructionZone();
      work.position.set(fac.x, gy, fac.z);
      if (fac.axis === 'vertical') work.rotation.y = Math.PI / 2;
      addToChunk(work, fac.x, fac.z);
    }
  });

  // 7. Commercial Buildings, Tea Stalls & Iconic Landmarks across Tamil Nadu Cities
  const buildingColors = ['#cbd5e1', '#e2e8f0', '#d6c7b2', '#94a3b8', '#e5d3b3', '#cbd5e1'];
  const shopNames = [
    'ஸ்ரீ அன்னபூர்ணா • SREE ANNAPOORNA',
    'கோவை சில்க்ஸ் • KOVAI SILKS',
    'சென்னை CMBT பிளாசா • CHENNAI PLAZA',
    'மதுரை முனியாண்டி விலாஸ் • MUNIYANDI VILAS',
    'ஏ2பி நெடுஞ்சாலை உணவகம் • A2B PLAZA',
    'திருச்சி ராக்ஃபோர்ட் டவர் • ROCKFORT ARCADE',
  ];

  const roofDetailMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

  const placeBuilding = (
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    colorStr: string,
    nameIdx?: number
  ) => {
    const gy = getTerrainHeight(x, z);
    const facade = createBuildingFacadeTextures(colorStr, anisotropy);
    const mat = new THREE.MeshStandardMaterial({
      map: facade.map,
      emissive: 0xffffff,
      emissiveMap: facade.emissiveMap,
      emissiveIntensity: 0.08,
      roughness: 0.72,
      metalness: 0.08,
    });
    buildingMaterials.push(mat);

    const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    bldg.position.set(x, gy + h / 2, z);
    bldg.castShadow = true;
    bldg.receiveShadow = true;
    addToChunk(bldg, x, z);

    const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.75, d + 0.6), roofDetailMat);
    parapet.position.set(x, gy + h + 0.35, z);
    addToChunk(parapet, x, z);

    const waterTank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.2, 12), tankMat);
    waterTank.position.set(x - w * 0.25, gy + h + 1.4, z - d * 0.2);
    addToChunk(waterTank, x, z);

    colliders.push({
      minX: x - w / 2 - 0.5,
      maxX: x + w / 2 + 0.5,
      minZ: z - d / 2 - 0.5,
      maxZ: z + d / 2 + 0.5,
    });

    if (nameIdx !== undefined) {
      const bCanvas = document.createElement('canvas');
      bCanvas.width = 512;
      bCanvas.height = 128;
      const bctx = bCanvas.getContext('2d')!;
      bctx.fillStyle = '#0f172a';
      bctx.fillRect(0, 0, 512, 128);
      bctx.strokeStyle = '#facc15';
      bctx.lineWidth = 6;
      bctx.strokeRect(4, 4, 504, 120);
      bctx.fillStyle = '#fef08a';
      bctx.font = 'bold 23px "Noto Sans Tamil", sans-serif';
      bctx.textAlign = 'center';
      bctx.fillText(shopNames[nameIdx % shopNames.length], 256, 72);

      const bTex = new THREE.CanvasTexture(bCanvas);
      bTex.colorSpace = THREE.SRGBColorSpace;
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.72, 2.4),
        new THREE.MeshStandardMaterial({
          map: bTex,
          emissive: 0xffffff,
          emissiveMap: bTex,
          emissiveIntensity: 0.45,
        })
      );
      board.position.set(x, gy + 3.8, z + d / 2 + 0.08);
      addToChunk(board, x, z);
    }
  };

  // Coimbatore Hub Blocks (X=-240, Z=-200..+120)
  placeBuilding(-196, -165, 34, 18, 28, buildingColors[0], 0);
  placeBuilding(-284, -165, 32, 16, 26, buildingColors[1], 1);
  placeBuilding(-196, 65, 36, 19, 32, buildingColors[2], 0);
  placeBuilding(-284, 65, 34, 15, 28, buildingColors[3], 4);

  // Tiruppur / Erode / Salem Blocks
  placeBuilding(-75, -296, 36, 17, 26, buildingColors[4], 1);
  placeBuilding(44, -165, 34, 16, 30, buildingColors[0], 5);
  placeBuilding(-286, -425, 36, 18, 28, buildingColors[2], 4);

  // Chennai CMBT & Tambaram Complex (X=480, Z=-460..-320)
  placeBuilding(434, -440, 42, 26, 38, buildingColors[1], 2);
  placeBuilding(526, -440, 38, 22, 34, buildingColors[3], 2);
  placeBuilding(436, -335, 36, 18, 28, buildingColors[5], 4);

  // Trichy, Dindigul, Madurai & Tirunelveli Blocks
  placeBuilding(286, -165, 36, 19, 30, buildingColors[0], 5);
  placeBuilding(46, 115, 32, 15, 28, buildingColors[4], 4);
  placeBuilding(115, 220, 36, 18, 30, buildingColors[4], 3);
  placeBuilding(194, 335, 34, 18, 30, buildingColors[2], 3);
  placeBuilding(48, 455, 34, 16, 28, buildingColors[1], 5);

  // Ooty / Coonoor / Valparai / Kodaikanal Hill Cottages
  placeBuilding(-436, -445, 24, 10, 20, '#fde68a');
  placeBuilding(-526, -345, 22, 9, 18, '#fed7aa');
  placeBuilding(-555, 560, 24, 10, 18, '#fde68a');
  placeBuilding(-115, 255, 24, 9, 18, '#fed7aa');

  // Historic Coimbatore Clock Tower near Town Hall / Ukkadam
  const clockTower = createClockTower();
  clockTower.position.set(-206, getTerrainHeight(-206, -45), -45);
  addToChunk(clockTower, -206, -45);
  colliders.push({ minX: -211, maxX: -201, minZ: -50, maxZ: -40 });

  // Stepped Madurai Meenakshi Temple Gopuram Landmark (East of Periyar Bus Stand)
  const gopuram = new THREE.Group();
  gopuram.position.set(285, getTerrainHeight(285, 335), 335);
  const gopTierColors = [0xd97706, 0x059669, 0xdc2626, 0x0284c7, 0xfacc15];
  for (let tier = 0; tier < 5; tier++) {
    const tw = 12 - tier * 1.9;
    const td = 7 - tier * 1.1;
    const th = 3.4;
    const tMesh = new THREE.Mesh(
      new THREE.BoxGeometry(tw, th, td),
      new THREE.MeshStandardMaterial({ color: gopTierColors[tier], roughness: 0.65 })
    );
    tMesh.position.y = 1.7 + tier * 3.35;
    tMesh.castShadow = true;
    gopuram.add(tMesh);
  }
  addToChunk(gopuram, 285, 335);
  colliders.push({ minX: 278, maxX: 292, minZ: 330, maxZ: 340 });

  // Kanyakumari Vivekananda Rock Memorial Silhouette offshore
  const rockMemorial = new THREE.Group();
  rockMemorial.position.set(165, 0, 625);
  const rockBase = new THREE.Mesh(
    new THREE.CylinderGeometry(16, 22, 5, 8),
    new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.92 })
  );
  rockBase.position.y = 2.0;
  const domeBase = new THREE.Mesh(
    new THREE.BoxGeometry(8, 5, 8),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 })
  );
  domeBase.position.y = 6.5;
  const domeTop = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 4.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.65 })
  );
  domeTop.position.y = 11.2;
  rockMemorial.add(rockBase, domeBase, domeTop);
  addToChunk(rockMemorial, 165, 625);

  // 8. All 23 Kerbside Tamil Nadu Bus Terminals & Animated Passengers
  BUS_STOPS.forEach((stop) => {
    const gy = getTerrainHeight(stop.x, stop.z);
    const sx = stop.x + stop.shelterOffsetX;
    const sz = stop.z + stop.shelterOffsetZ;
    const shelter = createBusShelter(stop.nameTa, stop.nameEn);
    shelter.position.set(sx, getTerrainHeight(sx, sz), sz);
    shelter.rotation.y = stop.shelterRotY;
    scene.add(shelter);
    disposableRootObjects.push(shelter);

    const bayBox = new THREE.Mesh(
      stop.roadAxis === 'vertical'
        ? new THREE.PlaneGeometry(3.8, 14)
        : new THREE.PlaneGeometry(14, 3.8),
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      })
    );
    bayBox.rotation.x = -Math.PI / 2;
    bayBox.position.set(stop.x, gy + 0.042, stop.z);
    scene.add(bayBox);
    disposableRootObjects.push(bayBox);

    const ringGeom = new THREE.RingGeometry(stop.radius * 0.74, stop.radius, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(stop.x, gy + 0.055, stop.z);
    scene.add(ringMesh);
    disposableRootObjects.push(ringMesh);

    const passengerColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899];
    const passengers: THREE.Group[] = [];
    const baseY: number[] = [];
    const dirToCurbX = Math.sign(stop.shelterOffsetX);
    const dirToCurbZ = Math.sign(stop.shelterOffsetZ);

    for (let p = 0; p < stop.passengersWaiting; p++) {
      const char = createPassengerCharacter(passengerColors[p % passengerColors.length]);
      const px =
        stop.x +
        stop.shelterOffsetX * 0.78 +
        (stop.roadAxis !== 'vertical' ? (p - 2) * 1.1 : dirToCurbX * (p % 2) * 0.8);
      const pz =
        stop.z +
        stop.shelterOffsetZ * 0.78 +
        (stop.roadAxis === 'vertical' ? (p - 2) * 1.1 : dirToCurbZ * (p % 2) * 0.8);
      const py = getTerrainHeight(px, pz);
      char.position.set(px, py, pz);
      char.rotation.y = stop.shelterRotY;
      scene.add(char);
      disposableRootObjects.push(char);
      passengers.push(char);
      baseY.push(py);
    }

    stopTrackers.push({
      stopId: stop.id,
      group: shelter,
      passengers,
      baseY,
      markerRing: ringMesh,
    });
  });

  // 9. Roadside Coconut Stalls & Tea Shops
  [
    { x: -227.8, z: -120, rot: Math.PI, type: 'coco' },
    { x: -252.2, z: 20, rot: 0, type: 'tea' },
    { x: 12.2, z: 72, rot: -Math.PI / 2, type: 'coco' },
    { x: 467.8, z: -385, rot: Math.PI, type: 'tea' },
    { x: -467.8, z: 135, rot: Math.PI, type: 'coco' },
    { x: 227.8, z: 295, rot: 0, type: 'tea' },
  ].forEach((s) => {
    const m = s.type === 'coco' ? createCoconutStall() : createTeaStall();
    m.position.set(s.x, getTerrainHeight(s.x, s.z), s.z);
    m.rotation.y = s.rot;
    addToChunk(m, s.x, s.z);
  });

  // 10. Avenue Trees (Gulmohars, Coconut Palms & Nilgiri Pines) along Corridors (Chunked)
  ROAD_NETWORK.verticalX.forEach((vx) => {
    for (let z = -580; z <= 580; z += 56) {
      const nearJunction = ROAD_NETWORK.horizontalZ.some((hz) => Math.abs(z - hz) < 22);
      if (nearJunction) continue;
      const isPalm = vx >= 240 || z > 180 || vx === -480;
      const t1 = createRoadsideTree(isPalm && z > -200);
      t1.position.set(vx + 12.5, getTerrainHeight(vx + 12.5, z), z);
      addToChunk(t1, vx + 12.5, z);

      const t2 = createRoadsideTree(!isPalm);
      t2.position.set(vx - 12.5, getTerrainHeight(vx - 12.5, z + 14), z + 14);
      addToChunk(t2, vx - 12.5, z + 14);
    }
  });

  // 11. Highway & City Street Lamps across Main Corridors (Chunked)
  const lampPoleGeom = new THREE.CylinderGeometry(0.08, 0.11, 6.4, 8);
  const lampArmGeom = new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6);
  const lampHeadGeom = new THREE.BoxGeometry(0.75, 0.16, 0.38);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });

  const poolCanvas = document.createElement('canvas');
  poolCanvas.width = 128;
  poolCanvas.height = 128;
  const pctx = poolCanvas.getContext('2d')!;
  const pgrad = pctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  pgrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
  pgrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  pctx.fillStyle = pgrad;
  pctx.fillRect(0, 0, 128, 128);
  const poolTex = new THREE.CanvasTexture(poolCanvas);
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  [-240, 0, 240, 480].forEach((vx) => {
    for (let z = -540; z <= 540; z += 76) {
      const gy = getTerrainHeight(vx + 11.0, z);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: 0xfef08a,
        emissiveIntensity: 0.2,
      });
      streetLampBulbMats.push(bulbMat);

      const pole = new THREE.Mesh(lampPoleGeom, lampMat);
      pole.position.set(vx + 11.0, gy + 3.2, z);
      const arm = new THREE.Mesh(lampArmGeom, lampMat);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(vx + 9.9, gy + 6.3, z);
      const head = new THREE.Mesh(lampHeadGeom, bulbMat);
      head.position.set(vx + 9.0, gy + 6.22, z);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), poolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(vx + 8.2, gy + 0.04, z);
      addToChunk(pole, vx + 11.0, z);
      addToChunk(arm, vx + 11.0, z);
      addToChunk(head, vx + 11.0, z);
      addToChunk(pool, vx + 11.0, z);
    }
  });

  return {
    colliders,
    stopTrackers,
    updatePassengers: (activeStopId: string, isBusStopped: boolean) => {
      const now = Date.now();
      stopTrackers.forEach((tracker) => {
        const isActive = tracker.stopId === activeStopId;
        if (isActive) {
          tracker.markerRing.visible = true;
          const mat = tracker.markerRing.material as THREE.MeshBasicMaterial;
          mat.color.setHex(0x10b981);
          mat.opacity = 0.5 + Math.sin(now * 0.005) * 0.3;
        } else {
          tracker.markerRing.visible = false;
        }

        if (isActive && isBusStopped) {
          tracker.passengers.forEach((char, idx) => {
            if (char.position.y > tracker.baseY[idx] - 2) {
              char.position.y -= 0.015;
              char.rotation.x = Math.sin(now * 0.02 + idx) * 0.3;
            }
          });
        } else {
          tracker.passengers.forEach((char, idx) => {
            char.rotation.z = Math.sin(now * 0.002 + idx * 1.4) * 0.03;
          });
        }
      });
    },
    updateEnvironment: (timeSec: number, busX: number = -234.8, busZ: number = -165, viewRadius: number = 420) => {
      // Chunk distance visibility culling
      const effectiveRadius = viewRadius + 210;
      const radSq = effectiveRadius * effectiveRadius;
      chunksMap.forEach((chunk) => {
        const dx = chunk.centerX - busX;
        const dz = chunk.centerZ - busZ;
        chunk.group.visible = dx * dx + dz * dz <= radSq;
      });

      trafficSignals.forEach((sig) => {
        const state = getSignalState(sig.ix, sig.iz, timeSec);
        sig.nsGreen.emissiveIntensity = state.ns === 'green' ? 2.5 : 0.05;
        sig.nsAmber.emissiveIntensity = state.ns === 'amber' ? 2.5 : 0.05;
        sig.nsRed.emissiveIntensity = state.ns === 'red' ? 2.5 : 0.05;

        sig.ewGreen.emissiveIntensity = state.ew === 'green' ? 2.5 : 0.05;
        sig.ewAmber.emissiveIntensity = state.ew === 'amber' ? 2.5 : 0.05;
        sig.ewRed.emissiveIntensity = state.ew === 'red' ? 2.5 : 0.05;
      });
    },
    setAtmosphere: (timeOfDay: TimeOfDayId, weather: WeatherId, isNight: boolean) => {
      const oldTex = skyDomeMat.map;
      skyDomeMat.map = createSkyDomeTexture(timeOfDay, weather);
      skyDomeMat.needsUpdate = true;
      if (oldTex) oldTex.dispose();

      const isRain = weather === 'rain';
      const isFog = weather === 'fog';
      const isCloudy = weather === 'cloudy';
      const targetRoughness = isRain ? 0.16 : isFog ? 0.55 : isCloudy ? 0.65 : 0.84;
      const targetEnv = isRain ? 1.85 : isFog ? 1.05 : isCloudy ? 0.9 : 0.65;
      const roadTint = isRain ? 0x181a1f : isFog ? 0x334155 : isCloudy ? 0x94a3b8 : 0xffffff;
      roadMaterials.forEach((rm) => {
        rm.roughness = targetRoughness;
        rm.envMapIntensity = targetEnv;
        rm.color.setHex(roadTint);
      });

      const windowGlow = isNight ? 1.15 : timeOfDay === 'sunset' ? 0.55 : isRain || isFog ? 0.45 : 0.05;
      buildingMaterials.forEach((bm) => {
        bm.emissiveIntensity = windowGlow;
      });

      const lampOn = isNight || isRain || isFog || timeOfDay === 'sunset';
      streetLampBulbMats.forEach((lm) => {
        lm.emissiveIntensity = lampOn ? 2.4 : 0.15;
      });
      poolMat.opacity = isNight ? 0.55 : isRain ? 0.3 : 0.0;
    },
    dispose: () => {
      disposableRootObjects.forEach((obj) => {
        scene.remove(obj);
        obj.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        });
      });
      poolTex.dispose();
    },
  };
}
