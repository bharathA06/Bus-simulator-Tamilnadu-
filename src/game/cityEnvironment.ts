import * as THREE from 'three';
import {
  BUS_STOPS,
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
  updateEnvironment: (timeSec: number) => void;
  setAtmosphere: (timeOfDay: TimeOfDayId, weather: WeatherId, isNight: boolean) => void;
} {
  const colliders: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  const stopTrackers: StopMeshTracker[] = [];
  const buildingMaterials: THREE.MeshStandardMaterial[] = [];
  const streetLampBulbMats: THREE.MeshStandardMaterial[] = [];
  const trafficSignals: TrafficSignalUnit[] = [];
  const roadMaterials: THREE.MeshStandardMaterial[] = [];

  // 0. Atmospheric Sky Dome sized for the expanded Tamil Nadu map
  const skyDomeGeom = new THREE.SphereGeometry(680, 32, 20);
  const skyDomeMat = new THREE.MeshBasicMaterial({
    map: createSkyDomeTexture('day', 'sunny'),
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const skyDome = new THREE.Mesh(skyDomeGeom, skyDomeMat);
  scene.add(skyDome);

  // 1. Displaced Regional Tamil Nadu Terrain (Plains + Nilgiri Hill Ghat Rise)
  const terrainTex = createKonguTerrainTextures(anisotropy);
  terrainTex.map.repeat.set(36, 38);
  terrainTex.bumpMap.repeat.set(36, 38);

  const terrainGeom = new THREE.PlaneGeometry(980, 1040, 64, 64);
  const tPos = terrainGeom.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < tPos.count; i++) {
    const wx = tPos.getX(i);
    const wz = -tPos.getY(i);
    tPos.setZ(i, getTerrainHeight(wx, wz) - 0.08);
  }
  terrainGeom.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: terrainTex.map,
    bumpMap: terrainTex.bumpMap,
    bumpScale: 0.08,
    roughness: 0.94,
    metalness: 0.02,
  });
  const terrain = new THREE.Mesh(terrainGeom, terrainMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  scene.add(terrain);

  // 2. Western Ghats & Nilgiri Mountain Ridges (NW Corridor around Coonoor & Ooty)
  const mountainMatFar = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.95 });
  const mountainMatNear = new THREE.MeshStandardMaterial({ color: 0x1e4635, roughness: 0.92 });
  const mountainSpecs = [
    { x: -340, z: -360, r: 95, h: 85, far: true },
    { x: -290, z: -395, r: 82, h: 72, far: true },
    { x: -390, z: -220, r: 90, h: 80, far: true },
    { x: -380, z: -60, r: 85, h: 68, far: true },
    { x: -360, z: 120, r: 78, h: 60, far: true },
    { x: -330, z: 270, r: 72, h: 55, far: true },
    { x: -295, z: -200, r: 44, h: 36, far: false },
    { x: -175, z: -215, r: 40, h: 32, far: false },
    { x: -185, z: -340, r: 46, h: 38, far: false },
  ];
  mountainSpecs.forEach((m) => {
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(m.r, m.h, 9),
      m.far ? mountainMatFar : mountainMatNear
    );
    const groundY = getTerrainHeight(m.x, m.z);
    hill.position.set(m.x, groundY + m.h * 0.42, m.z);
    hill.scale.set(1.2, 1, 1.45);
    scene.add(hill);
  });

  // 3. Bay of Bengal / Indian Ocean Coastline (East & South) + Cauvery & Ukkadam Lakes
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x0369a1,
    roughness: 0.08,
    metalness: 0.78,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  const eastOcean = new THREE.Mesh(new THREE.PlaneGeometry(240, 1020), waterMat);
  eastOcean.rotation.x = -Math.PI / 2;
  eastOcean.position.set(420, -0.02, 0);
  scene.add(eastOcean);

  const southOcean = new THREE.Mesh(new THREE.PlaneGeometry(1020, 240), waterMat);
  southOcean.rotation.x = -Math.PI / 2;
  southOcean.position.set(0, -0.02, 460);
  scene.add(southOcean);

  // Cauvery River Channel near x = 20..140, z = 0
  const cauveryRiver = new THREE.Mesh(new THREE.PlaneGeometry(34, 460), waterMat);
  cauveryRiver.rotation.x = -Math.PI / 2;
  cauveryRiver.rotation.z = Math.PI / 2;
  cauveryRiver.position.set(125, -0.02, 0);
  scene.add(cauveryRiver);

  // 4. PBR 20m Divided 4-Lane Tamil Nadu Highways (Smoothly vertex-displaced for Ghat Climbs)
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

    const segCount = 48;
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

    const startAlong = isVertical ? centerZ - length / 2 : centerX - length / 2;
    const endAlong = isVertical ? centerZ + length / 2 : centerX + length / 2;

    for (let pos = startAlong + 5; pos < endAlong - 5; pos += 10) {
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
        isVertical ? 0.55 : 10,
        0.24,
        isVertical ? 10 : 0.55
      );
      pushBoxMatrix(
        curbMatrices,
        isVertical ? centerX + halfRoad + 0.25 : pos,
        gy + 0.12,
        isVertical ? pos : centerZ + halfRoad + 0.25,
        isVertical ? 0.55 : 10,
        0.24,
        isVertical ? 10 : 0.55
      );

      if (!isMedianGap(checkX, checkZ)) {
        // Skip median inside toll plazas so buses can enter booths smoothly
        const nearToll = HIGHWAY_FACILITIES.some(
          (f) => f.type === 'toll' && Math.hypot(checkX - f.x, checkZ - f.z) < 8
        );
        if (!nearToll) {
          pushBoxMatrix(
            medianMatrices,
            checkX,
            gy + 0.13,
            checkZ,
            isVertical ? 1.1 : 9.6,
            0.26,
            isVertical ? 9.6 : 1.1
          );

          if (Math.abs(Math.round(pos)) % 20 < 10) {
            pushBoxMatrix(bollardMatrices, checkX, gy + 0.52, checkZ, 1, 1, 1);
          } else {
            pushBoxMatrix(shrubMatrices, checkX, gy + 0.48, checkZ, 1, 0.75, 1);
          }

          colliders.push({
            minX: checkX - (isVertical ? 0.42 : 4.8),
            maxX: checkX + (isVertical ? 0.42 : 4.8),
            minZ: checkZ - (isVertical ? 4.8 : 0.42),
            maxZ: checkZ + (isVertical ? 4.8 : 0.42),
          });
        }
      }
    }
  };

  ROAD_NETWORK.verticalX.forEach((vx) => createDividedRoad(vx, 0, 760, true));
  ROAD_NETWORK.horizontalZ.forEach((hz) => createDividedRoad(0, hz, 680, false));

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
    scene.add(m);
  };

  const uturnSignTex = createUTurnSignTexture();
  const uturnSignMat = new THREE.MeshStandardMaterial({
    map: uturnSignTex,
    emissive: 0xffffff,
    emissiveMap: uturnSignTex,
    emissiveIntensity: 0.35,
  });
  const speed60Tex = createSpeedLimitSignTexture('60');
  const speed85Tex = createSpeedLimitSignTexture('85');
  const speed45Tex = createSpeedLimitSignTexture('45');
  const speed60Mat = new THREE.MeshStandardMaterial({
    map: speed60Tex,
    emissive: 0xffffff,
    emissiveMap: speed60Tex,
    emissiveIntensity: 0.25,
  });
  const speed85Mat = new THREE.MeshStandardMaterial({
    map: speed85Tex,
    emissive: 0xffffff,
    emissiveMap: speed85Tex,
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
      scene.add(post, sign);
    } else {
      placePavementArrow(x - 8, z - 2.6, -Math.PI / 2, uturnTex);
      placePavementArrow(x + 8, z + 2.6, Math.PI / 2, uturnTex);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.8, 8), poleMat);
      post.position.set(x - 7, gy + 1.4, z);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.85), uturnSignMat);
      sign.position.set(x - 7, gy + 2.6, z);
      scene.add(post, sign);
    }
  };

  ROAD_NETWORK.verticalX.forEach((vx) => {
    ROAD_NETWORK.uturnBaysVerticalZ.forEach((uz) => {
      const skip = HIGHWAY_FACILITIES.some((f) => Math.hypot(vx - f.x, uz - f.z) < 16);
      if (!skip) placeUTurnBayMarkers(vx, uz, true);
    });
  });
  ROAD_NETWORK.horizontalZ.forEach((hz) => {
    ROAD_NETWORK.uturnBaysHorizontalX.forEach((ux) => {
      const skip = HIGHWAY_FACILITIES.some((f) => Math.hypot(ux - f.x, hz - f.z) < 16);
      if (!skip) placeUTurnBayMarkers(ux, hz, false);
    });
  });

  // Tamil Nadu Regional Speed Limit Signs (45 Hill / 60 City / 85 Highway)
  [
    { x: -69.2, z: -135, rot: 0, mat: speed60Mat },
    { x: -90.8, z: -70, rot: Math.PI, mat: speed85Mat },
    { x: -229.2, z: -140, rot: Math.PI, mat: speed45Mat },
    { x: 90.8, z: -45, rot: 0, mat: speed85Mat },
    { x: 229.2, z: -195, rot: Math.PI, mat: speed60Mat },
    { x: 69.2, z: 165, rot: 0, mat: speed60Mat },
  ].forEach(({ x, z, rot, mat }) => {
    const gy = getTerrainHeight(x, z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 8), poleMat);
    post.position.set(x, gy + 1.6, z);
    const board = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.06, 20), mat);
    board.rotation.x = Math.PI / 2;
    board.rotation.z = rot;
    board.position.set(x, gy + 3.1, z);
    scene.add(post, board);
  });

  // 5. All 16 Intersections: Zebra Crossings, Stop Lines, Pavement Arrows & Synced 4-Way Signals
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
        scene.add(g);
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
    ctx.font = 'bold 46px "Plus Jakarta Sans", sans-serif';
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
    scene.add(gantry);
  };

  createHighwayGantry(-80, -135, 'NH-544  ▲  SALEM / OOTY  |  UKKADAM  ▼', 'தமிழ்நாடு நெடுஞ்சாலை • இடதுபுறம் செல்லவும்');
  createHighwayGantry(80, -35, 'ERODE  ▲  |  TRICHY  |  MADURAI  ▼', 'காவிரி பாலம் • SPEED LIMIT 80 KM/H');
  createHighwayGantry(240, -135, 'CHENNAI CMBT  ▲  |  RAMESWARAM  ▼', 'சென்னை – ராமேஸ்வரம் நெடுஞ்சாலை');
  createHighwayGantry(-155, -100, 'METTUPALAYAM  ⬅  |  OOTY GHAT ROAD ➔', 'நீலகிரி மலைப்பாதை • 45 KM/H MAX', Math.PI / 2);

  // 6. Highway Infrastructure: Tolls, Petrol Bunks, Rail Crossings, Bridges, Police & Construction
  const bridgeConcreteMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.72 });
  HIGHWAY_FACILITIES.forEach((fac) => {
    const gy = getTerrainHeight(fac.x, fac.z);
    if (fac.type === 'toll') {
      const toll = createTollPlaza();
      toll.position.set(fac.x, gy, fac.z);
      if (fac.axis === 'horizontal') toll.rotation.y = Math.PI / 2;
      scene.add(toll);
    } else if (fac.type === 'petrol') {
      const bunk = createPetrolBunk(fac.id === 'petrol_kovai' ? 'BHARAT PETROLEUM' : 'INDIANOIL KAVERI');
      bunk.position.set(fac.x + 8, gy, fac.z);
      bunk.rotation.y = -Math.PI / 2;
      scene.add(bunk);
    } else if (fac.type === 'rail_crossing') {
      const rail = createRailwayCrossing();
      rail.position.set(fac.x, gy, fac.z);
      if (fac.axis === 'vertical') rail.rotation.y = Math.PI / 2;
      scene.add(rail);
    } else if (fac.type === 'bridge') {
      [-10.6, 10.6].forEach((offset) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.35, 34), bridgeConcreteMat);
        wall.position.set(fac.x + offset, gy + 0.67, fac.z);
        wall.castShadow = true;
        scene.add(wall);
      });
    } else if (fac.type === 'rest_stop') {
      const tea = createTeaStall();
      tea.position.set(fac.x, gy, fac.z - 6.5);
      scene.add(tea);
    } else if (fac.type === 'police_check') {
      const police = createPoliceCheckpost();
      police.position.set(fac.x, gy, fac.z);
      if (fac.axis === 'horizontal') police.rotation.y = Math.PI / 2;
      scene.add(police);
    } else if (fac.type === 'construction') {
      const work = createConstructionZone();
      work.position.set(fac.x, gy, fac.z);
      if (fac.axis === 'vertical') work.rotation.y = Math.PI / 2;
      scene.add(work);
    }
  });

  // 7. Commercial Buildings, Tea Stalls & Landmarks across Tamil Nadu Cities
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
    scene.add(bldg);

    const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.75, d + 0.6), roofDetailMat);
    parapet.position.set(x, gy + h + 0.35, z);
    scene.add(parapet);

    const waterTank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.2, 12), tankMat);
    waterTank.position.set(x - w * 0.25, gy + h + 1.4, z - d * 0.2);
    scene.add(waterTank);

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
      scene.add(board);
    }
  };

  // Coimbatore Hub Blocks (around X=-80, Z=-100..+100)
  placeBuilding(-38, -155, 34, 18, 28, buildingColors[0], 0);
  placeBuilding(-122, -155, 32, 16, 26, buildingColors[1], 1);
  placeBuilding(-38, 45, 36, 19, 32, buildingColors[2], 0);
  placeBuilding(-122, 45, 34, 15, 28, buildingColors[3], 4);

  // Tiruppur / Erode / Salem Blocks
  placeBuilding(0, -145, 38, 17, 26, buildingColors[4], 1);
  placeBuilding(124, -155, 34, 16, 30, buildingColors[0], 5);
  placeBuilding(-124, -235, 34, 18, 28, buildingColors[2], 4);

  // Chennai CMBT & Tambaram Complex (NE corridor X=240, Z=-240..-150)
  placeBuilding(194, -225, 42, 26, 38, buildingColors[1], 2);
  placeBuilding(284, -225, 38, 22, 34, buildingColors[3], 2);
  placeBuilding(196, -165, 36, 18, 28, buildingColors[5], 4);

  // Trichy & Madurai Blocks
  placeBuilding(126, 48, 36, 19, 30, buildingColors[0], 5);
  placeBuilding(38, 215, 34, 16, 32, buildingColors[4], 3);
  placeBuilding(124, 215, 34, 18, 30, buildingColors[2], 3);

  // Ooty / Coonoor Hill Cottages (Sloped NW)
  placeBuilding(-196, -215, 24, 10, 20, '#fde68a');
  placeBuilding(-198, -155, 22, 9, 18, '#fed7aa');

  // Historic Coimbatore Clock Tower near Town Hall / Ukkadam
  const clockTower = createClockTower();
  clockTower.position.set(-46, getTerrainHeight(-46, -42), -42);
  scene.add(clockTower);
  colliders.push({ minX: -51, maxX: -41, minZ: -47, maxZ: -37 });

  // Stepped Madurai Meenakshi Temple Gopuram Landmark (east of Periyar Bus Stand)
  const gopuram = new THREE.Group();
  gopuram.position.set(145, 0, 232);
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
  scene.add(gopuram);
  colliders.push({ minX: 138, maxX: 152, minZ: 227, maxZ: 237 });

  // 8. All 17 Kerbside Tamil Nadu Bus Terminals & Animated Passengers
  BUS_STOPS.forEach((stop) => {
    const gy = getTerrainHeight(stop.x, stop.z);
    const sx = stop.x + stop.shelterOffsetX;
    const sz = stop.z + stop.shelterOffsetZ;
    const shelter = createBusShelter(stop.nameTa, stop.nameEn);
    shelter.position.set(sx, getTerrainHeight(sx, sz), sz);
    shelter.rotation.y = stop.shelterRotY;
    scene.add(shelter);

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
        (stop.roadAxis === 'horizontal' ? (p - 2) * 1.1 : dirToCurbX * (p % 2) * 0.8);
      const pz =
        stop.z +
        stop.shelterOffsetZ * 0.78 +
        (stop.roadAxis === 'vertical' ? (p - 2) * 1.1 : dirToCurbZ * (p % 2) * 0.8);
      const py = getTerrainHeight(px, pz);
      char.position.set(px, py, pz);
      char.rotation.y = stop.shelterRotY;
      scene.add(char);
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
    { x: -67.8, z: -120, rot: Math.PI, type: 'coco' },
    { x: -92.2, z: 20, rot: 0, type: 'tea' },
    { x: 92.2, z: 72, rot: -Math.PI / 2, type: 'coco' },
    { x: 227.8, z: -185, rot: Math.PI, type: 'tea' },
    { x: -227.8, z: 185, rot: Math.PI, type: 'coco' },
  ].forEach((s) => {
    const m = s.type === 'coco' ? createCoconutStall() : createTeaStall();
    m.position.set(s.x, getTerrainHeight(s.x, s.z), s.z);
    m.rotation.y = s.rot;
    scene.add(m);
  });

  // 10. Avenue Trees (Gulmohars, Coconut Palms & Nilgiri Pines) along Corridors
  ROAD_NETWORK.verticalX.forEach((vx) => {
    for (let z = -340; z <= 340; z += 44) {
      const nearJunction = ROAD_NETWORK.horizontalZ.some((hz) => Math.abs(z - hz) < 20);
      if (nearJunction) continue;
      const isPalm = vx >= 80 || z > 150 || vx === -240;
      const t1 = createRoadsideTree(isPalm && z > -100);
      t1.position.set(vx + 12.2, getTerrainHeight(vx + 12.2, z), z);
      scene.add(t1);

      const t2 = createRoadsideTree(!isPalm);
      t2.position.set(vx - 12.2, getTerrainHeight(vx - 12.2, z + 12), z + 12);
      scene.add(t2);
    }
  });

  // 11. Highway & City Street Lamps across Main Corridors
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

  [-80, 80, 240].forEach((vx) => {
    for (let z = -320; z <= 320; z += 58) {
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
      scene.add(pole, arm, head, pool);
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
    updateEnvironment: (timeSec: number) => {
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
  };
}
