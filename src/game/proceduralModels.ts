import * as THREE from 'three';
import {
  BusLivery,
  UPHOLSTERY_STYLES,
  WHEEL_STYLES,
} from './constants';
import {
  createBusSideLiveryTexture,
  createLiveDashboardController,
  LiveCockpitMetrics,
} from './textures';

/**
 * Creates high-res procedural LED destination board texture
 */
export function createLedBoardTexture(tamilText: string, englishText: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#04060a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Authentic LED dot matrix pixel grid
  ctx.fillStyle = '#0c131d';
  for (let x = 0; x < canvas.width; x += 8) {
    for (let y = 0; y < canvas.height; y += 8) {
      ctx.fillRect(x, y, 5, 5);
    }
  }

  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 64px "Noto Sans Tamil", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tamilText, canvas.width / 2, 76);

  ctx.font = 'bold 50px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#0284c7';
  ctx.shadowBlur = 10;
  ctx.fillText(englishText, canvas.width / 2, 178);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createTireTreadTexture(anisotropy: number = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#191a1f';
  ctx.fillRect(0, 0, 256, 256);

  // Heavy commercial radial highway tread ribs & sipes
  ctx.fillStyle = '#09090b';
  for (let y = 0; y < 256; y += 16) {
    ctx.fillRect(14, y, 54, 9);
    ctx.fillRect(88, y + 6, 80, 7);
    ctx.fillRect(188, y, 54, 9);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 5);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/**
 * Builds a high-detail composite Coimbatore Private Bus (Ashok Leyland / BharatBenz Coach Style)
 */
export function createCoimbatoreBus(
  livery: BusLivery,
  anisotropy: number = 4,
  isSoftwareGl: boolean = false
): {
  busGroup: THREE.Group;
  frontWheels: THREE.Group[];
  rearWheels: THREE.Group[];
  steeringWheel: THREE.Object3D;
  leftHeadlight: THREE.SpotLight;
  rightHeadlight: THREE.SpotLight;
  cabinLight: THREE.PointLight;
  doorsMesh: THREE.Object3D;
  updateLivery: (
    newL: BusLivery,
    custom?: {
      bodyColorHex?: number;
      stripeColorHex?: number;
      registrationNumber?: string;
      upholsteryId?: string;
      wheelStyleId?: string;
    }
  ) => void;
  updateWheelTurn: (turnAngle: number, rollAngle: number) => void;
  setDoorOpen: (isOpen: boolean) => void;
  updateWipers: (isRaining: boolean, time: number, intensity?: number) => void;
  updateWetLook: (isWet: boolean) => void;
  setDirtLevel?: (dirtPct: number) => void;
  updateDashboard?: (metrics: LiveCockpitMetrics) => void;
  setSignalStates?: (opts: {
    headlights: boolean;
    highBeam?: boolean;
    braking: boolean;
    reverse: boolean;
    leftSignal: boolean;
    rightSignal: boolean;
    gear: string;
    gearShiftAnim?: number;
    time: number;
  }) => void;
} {
  const busGroup = new THREE.Group();

  // Calibrated PBR Materials
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: livery.bodyColorHex,
    roughness: 0.28,
    metalness: 0.35,
    clearcoat: 0.9,
    clearcoatRoughness: 0.14,
  });

  const stripeMaterial = new THREE.MeshPhysicalMaterial({
    color: livery.stripeColorHex,
    roughness: 0.25,
    metalness: 0.4,
    clearcoat: 0.85,
    clearcoatRoughness: 0.15,
  });

  const roofMaterial = new THREE.MeshStandardMaterial({
    color: livery.roofColorHex,
    roughness: 0.48,
    metalness: 0.15,
  });

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.08,
    metalness: 0.96,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.05,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: isSoftwareGl ? 0.42 : 0.48,
    depthWrite: false,
  });

  const blackTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.78,
    metalness: 0.18,
  });

  const interiorWallMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.8,
    metalness: 0.1,
  });

  // 1. Heavy Chassis Frame & Recessed Undercarriage
  const chassisMesh = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.36, 9.65), blackTrimMaterial);
  chassisMesh.position.set(0, 0.48, 0);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  busGroup.add(chassisMesh);

  // Side Diesel Fuel Tank & Battery Box (authentic under-skirt mechanical detail)
  const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.35, 14), chromeMaterial);
  fuelTank.rotation.x = Math.PI / 2;
  fuelTank.position.set(-1.18, 0.56, 0.6);
  busGroup.add(fuelTank);

  // Exhaust tailpipe (rear left)
  const exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12), chromeMaterial);
  exhaustPipe.rotation.x = Math.PI / 2;
  exhaustPipe.position.set(-0.92, 0.42, -4.75);
  busGroup.add(exhaustPipe);

  // 2. Sculpted Bus Main Cabin Lower Skirt & Pillars
  const lowerBodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.15, 9.5), bodyMaterial);
  lowerBodyMesh.position.set(0, 1.2, 0);
  lowerBodyMesh.castShadow = true;
  lowerBodyMesh.receiveShadow = true;
  busGroup.add(lowerBodyMesh);

  // Interior floor & lower side walls (visible through clear windows)
  const interiorFloor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 9.1), interiorWallMat);
  interiorFloor.position.set(0, 0.92, 0);
  busGroup.add(interiorFloor);

  // Side livery metal panels with rivet/seam bump map
  const sideTexSet = createBusSideLiveryTexture(livery, anisotropy);
  const liveryPlaneGeom = new THREE.PlaneGeometry(8.95, 1.12);
  const liveryPlaneMat = new THREE.MeshPhysicalMaterial({
    map: sideTexSet.map,
    bumpMap: sideTexSet.bumpMap,
    bumpScale: 0.015,
    roughness: 0.25,
    metalness: 0.25,
    clearcoat: 0.9,
    clearcoatRoughness: 0.14,
  });

  const leftDecal = new THREE.Mesh(liveryPlaneGeom, liveryPlaneMat);
  leftDecal.position.set(-1.26, 1.2, 0);
  leftDecal.rotation.y = -Math.PI / 2;
  busGroup.add(leftDecal);

  const rightDecal = new THREE.Mesh(liveryPlaneGeom, liveryPlaneMat);
  rightDecal.position.set(1.26, 1.2, 0);
  rightDecal.rotation.y = Math.PI / 2;
  busGroup.add(rightDecal);

  // Wheel arch rubber flares
  const archGeom = new THREE.TorusGeometry(0.66, 0.08, 8, 16, Math.PI);
  [
    [-1.24, 0.56, 3.0],
    [1.24, 0.56, 3.0],
    [-1.24, 0.56, -2.5],
    [1.24, 0.56, -2.5],
  ].forEach(([ax, ay, az]) => {
    const arch = new THREE.Mesh(archGeom, blackTrimMaterial);
    arch.position.set(ax, ay, az);
    arch.rotation.y = Math.PI / 2;
    busGroup.add(arch);
  });

  // 3. Upper Window Frame Pillars (A, B, C, D pillars + vertical sashes)
  const pillarGeom = new THREE.BoxGeometry(0.14, 1.15, 0.16);
  const pillarZCoords = [4.62, 3.4, 2.0, 0.65, -0.7, -2.05, -3.4, -4.65];
  pillarZCoords.forEach((pz) => {
    const lp = new THREE.Mesh(pillarGeom, bodyMaterial);
    lp.position.set(-1.2, 2.34, pz);
    lp.castShadow = true;
    busGroup.add(lp);

    const rp = new THREE.Mesh(pillarGeom, bodyMaterial);
    rp.position.set(1.2, 2.34, pz);
    rp.castShadow = true;
    busGroup.add(rp);
  });

  // Rear bulkhead solid panel with rear glass window
  const rearUpper = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.45, 0.15), bodyMaterial);
  rearUpper.position.set(0, 2.7, -4.68);
  busGroup.add(rearUpper);

  const rearLower = new THREE.Mesh(new THREE.BoxGeometry(2.48, 1.15, 0.15), bodyMaterial);
  rearLower.position.set(0, 1.2, -4.68);
  busGroup.add(rearLower);

  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.72, 0.06), glassMaterial);
  rearGlass.position.set(0, 2.22, -4.68);
  busGroup.add(rearGlass);

  // 4. Aerodynamic Sculpted Front Nose & Sloped Panoramic Windshield
  const frontNose = new THREE.Mesh(new THREE.BoxGeometry(2.48, 1.12, 0.35), bodyMaterial);
  frontNose.position.set(0, 1.2, 4.72);
  frontNose.castShadow = true;
  busGroup.add(frontNose);

  // Rounded front brow above windshield (holds LED board)
  const browMesh = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.42, 0.4), bodyMaterial);
  browMesh.position.set(0, 2.86, 4.62);
  browMesh.rotation.x = 0.12;
  busGroup.add(browMesh);

  // Sloped panoramic windshield glass + center split mullion
  const windshieldMesh = new THREE.Mesh(new THREE.BoxGeometry(2.26, 1.12, 0.06), glassMaterial);
  windshieldMesh.position.set(0, 2.24, 4.74);
  windshieldMesh.rotation.x = -0.14;
  windshieldMesh.renderOrder = 3;
  busGroup.add(windshieldMesh);

  const centerMullion = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.14, 0.08), blackTrimMaterial);
  centerMullion.position.set(0, 2.24, 4.75);
  centerMullion.rotation.x = -0.14;
  busGroup.add(centerMullion);

  // Side windows (continuous tinted glazing inside aluminum window frames)
  const sideWindowGeom = new THREE.BoxGeometry(0.04, 0.96, 8.9);
  const leftSideWin = new THREE.Mesh(sideWindowGeom, glassMaterial);
  leftSideWin.position.set(-1.21, 2.34, 0.05);
  leftSideWin.renderOrder = 2;
  const rightSideWin = new THREE.Mesh(sideWindowGeom, glassMaterial);
  rightSideWin.position.set(1.21, 2.34, 0.05);
  rightSideWin.renderOrder = 2;
  busGroup.add(leftSideWin, rightSideWin);

  // Horizontal aluminum sliding window sashes
  const sashGeom = new THREE.BoxGeometry(0.06, 0.04, 8.9);
  const leftSash = new THREE.Mesh(sashGeom, chromeMaterial);
  leftSash.position.set(-1.22, 2.36, 0.05);
  const rightSash = new THREE.Mesh(sashGeom, chromeMaterial);
  rightSash.position.set(1.22, 2.36, 0.05);
  busGroup.add(leftSash, rightSash);

  // Windshield wipers with realistic bottom pivot arms
  const wiperArmGeom = new THREE.BoxGeometry(0.035, 0.56, 0.035);
  wiperArmGeom.translate(0, 0.28, 0);

  const leftWiperGroup = new THREE.Group();
  leftWiperGroup.position.set(-0.55, 1.78, 4.82);
  leftWiperGroup.rotation.x = -0.14;
  leftWiperGroup.add(new THREE.Mesh(wiperArmGeom, blackTrimMaterial));
  leftWiperGroup.rotation.z = -0.38;

  const rightWiperGroup = new THREE.Group();
  rightWiperGroup.position.set(0.55, 1.78, 4.82);
  rightWiperGroup.rotation.x = -0.14;
  rightWiperGroup.add(new THREE.Mesh(wiperArmGeom, blackTrimMaterial));
  rightWiperGroup.rotation.z = -0.38;
  busGroup.add(leftWiperGroup, rightWiperGroup);

  // 5. LED Destination Boards (Front & Rear)
  const ledTexture = createLedBoardTexture(livery.ledTamil, livery.ledEnglish);
  const ledMat = new THREE.MeshStandardMaterial({
    map: ledTexture,
    emissive: 0xffffff,
    emissiveMap: ledTexture,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });
  const ledMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 0.34), ledMat);
  ledMesh.position.set(0, 2.86, 4.83);
  ledMesh.rotation.x = 0.08;
  busGroup.add(ledMesh);

  const rearLedMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.32), ledMat);
  rearLedMesh.position.set(0, 2.72, -4.77);
  rearLedMesh.rotation.y = Math.PI;
  busGroup.add(rearLedMesh);

  // 6. Sculpted Roof Dome, AC Pods & Luggage Carrier Rack
  const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 9.45), roofMaterial);
  roofMesh.position.set(0, 3.04, 0);
  roofMesh.castShadow = true;
  busGroup.add(roofMesh);

  // Curved roof crown bevel
  const roofCrown = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.24, 9.3, 12, 1, false, 0, Math.PI), roofMaterial);
  roofCrown.rotation.z = Math.PI / 2;
  roofCrown.rotation.y = Math.PI / 2;
  roofCrown.scale.set(1, 0.2, 1);
  roofCrown.position.set(0, 3.12, 0);
  busGroup.add(roofCrown);

  // Chrome Luggage Carrier Railing
  const rackGroup = new THREE.Group();
  const rackPipeGeom = new THREE.CylinderGeometry(0.03, 0.03, 5.6);
  const leftRackPipe = new THREE.Mesh(rackPipeGeom, chromeMaterial);
  leftRackPipe.rotation.x = Math.PI / 2;
  leftRackPipe.position.set(-0.98, 3.32, -1.1);
  const rightRackPipe = new THREE.Mesh(rackPipeGeom, chromeMaterial);
  rightRackPipe.rotation.x = Math.PI / 2;
  rightRackPipe.position.set(0.98, 3.32, -1.1);
  rackGroup.add(leftRackPipe, rightRackPipe);

  for (let z = -3.6; z <= 1.4; z += 0.85) {
    const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.98), chromeMaterial);
    crossBar.rotation.z = Math.PI / 2;
    crossBar.position.set(0, 3.32, z);
    rackGroup.add(crossBar);
  }
  busGroup.add(rackGroup);

  // 7. Chrome Roof Air Horn Trumpets (4-Barrel Kovai Fanfare)
  const hornGroup = new THREE.Group();
  const trumpetTubeGeom = new THREE.CylinderGeometry(0.045, 0.13, 0.72, 12);
  [-0.42, -0.16, 0.16, 0.42].forEach((hx, i) => {
    const h = new THREE.Mesh(trumpetTubeGeom, chromeMaterial);
    h.rotation.x = Math.PI / 2;
    h.position.set(hx, 3.28, i === 1 || i === 2 ? 3.45 : 3.28);
    hornGroup.add(h);
  });
  busGroup.add(hornGroup);

  // 8. Heavy Front Bumper, Slatted Chrome Grille, Lamps & Volumetric Headlight Cones
  const bumperMesh = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.36, 0.42), chromeMaterial);
  bumperMesh.position.set(0, 0.6, 4.86);
  bumperMesh.castShadow = true;
  busGroup.add(bumperMesh);

  // Radiator Grille frame + 4 horizontal chrome slats
  const grilleBacking = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.48, 0.06), blackTrimMaterial);
  grilleBacking.position.set(0, 1.18, 4.88);
  busGroup.add(grilleBacking);
  for (let gy = 1.02; gy <= 1.34; gy += 0.1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 0.08), chromeMaterial);
    slat.position.set(0, gy, 4.9);
    busGroup.add(slat);
  }

  // Headlight housings + dual glowing lenses
  const headlampMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 0.4,
    roughness: 0.1,
  });
  const lampGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16);
  lampGeom.rotateX(Math.PI / 2);

  const leftLamp = new THREE.Mesh(lampGeom, headlampMat);
  leftLamp.position.set(-0.96, 1.14, 4.9);
  const rightLamp = new THREE.Mesh(lampGeom, headlampMat);
  rightLamp.position.set(0.96, 1.14, 4.9);
  busGroup.add(leftLamp, rightLamp);

  // Volumetric headlight cone meshes (visible at night & monsoon)
  const beamGeom = new THREE.ConeGeometry(3.4, 22, 16, 1, true);
  beamGeom.translate(0, -11, 0);
  beamGeom.rotateX(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const leftBeamMesh = new THREE.Mesh(beamGeom, beamMat);
  leftBeamMesh.position.set(-0.96, 1.14, 4.95);
  leftBeamMesh.rotation.x = 0.08;
  const rightBeamMesh = new THREE.Mesh(beamGeom, beamMat);
  rightBeamMesh.position.set(0.96, 1.14, 4.95);
  rightBeamMesh.rotation.x = 0.08;
  busGroup.add(leftBeamMesh, rightBeamMesh);

  // Real Three.js SpotLights for road illumination
  const leftHeadlight = new THREE.SpotLight(0xfff5db, 0, 55, Math.PI / 5.5, 0.45, 1.1);
  leftHeadlight.position.set(-0.96, 1.14, 4.92);
  leftHeadlight.target.position.set(-0.96, 0.0, 28);
  busGroup.add(leftHeadlight, leftHeadlight.target);

  const rightHeadlight = new THREE.SpotLight(0xfff5db, 0, 55, Math.PI / 5.5, 0.45, 1.1);
  rightHeadlight.position.set(0.96, 1.14, 4.92);
  rightHeadlight.target.position.set(0.96, 0.0, 28);
  busGroup.add(rightHeadlight, rightHeadlight.target);

  // Working Brake Lamps, Reverse Lamps & Amber Corner Turn Indicators
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    emissive: 0xef4444,
    emissiveIntensity: 0.5,
  });
  const reverseLightMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0xffffff,
    emissiveIntensity: 0.0,
  });
  const leftIndicatorMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.0,
  });
  const rightIndicatorMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.0,
  });

  const tailGeom = new THREE.BoxGeometry(0.32, 0.16, 0.06);
  const leftTail = new THREE.Mesh(tailGeom, tailLightMat);
  leftTail.position.set(-0.98, 1.05, -4.76);
  const rightTail = new THREE.Mesh(tailGeom, tailLightMat);
  rightTail.position.set(0.98, 1.05, -4.76);
  busGroup.add(leftTail, rightTail);

  const revGeom = new THREE.BoxGeometry(0.18, 0.14, 0.06);
  const leftRev = new THREE.Mesh(revGeom, reverseLightMat);
  leftRev.position.set(-0.68, 1.05, -4.76);
  const rightRev = new THREE.Mesh(revGeom, reverseLightMat);
  rightRev.position.set(0.68, 1.05, -4.76);
  busGroup.add(leftRev, rightRev);

  const indGeom = new THREE.BoxGeometry(0.16, 0.14, 0.08);
  // busLeft is +X, busRight is -X when facing +Z
  const flInd = new THREE.Mesh(indGeom, leftIndicatorMat);
  flInd.position.set(1.14, 1.14, 4.9);
  const rlInd = new THREE.Mesh(indGeom, leftIndicatorMat);
  rlInd.position.set(1.18, 1.25, -4.76);
  const frInd = new THREE.Mesh(indGeom, rightIndicatorMat);
  frInd.position.set(-1.14, 1.14, 4.9);
  const rrInd = new THREE.Mesh(indGeom, rightIndicatorMat);
  rrInd.position.set(-1.18, 1.25, -4.76);
  busGroup.add(flInd, rlInd, frInd, rrInd);

  // License plates (Dynamic Tamil Nadu Plate Canvas)
  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = 256;
  plateCanvas.height = 64;
  const pctx = plateCanvas.getContext('2d')!;
  const plateTex = new THREE.CanvasTexture(plateCanvas);
  plateTex.colorSpace = THREE.SRGBColorSpace;
  const drawPlate = (reg: string) => {
    pctx.fillStyle = '#facc15';
    pctx.fillRect(0, 0, 256, 64);
    pctx.strokeStyle = '#111827';
    pctx.lineWidth = 4;
    pctx.strokeRect(2, 2, 252, 60);
    pctx.fillStyle = '#111827';
    pctx.font = 'bold 30px monospace';
    pctx.textAlign = 'center';
    pctx.fillText((reg || 'TN 38 N 1402').slice(0, 13), 128, 43);
    plateTex.needsUpdate = true;
  };
  drawPlate(livery.defaultReg);
  const plateMat = new THREE.MeshBasicMaterial({ map: plateTex });

  const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.19), plateMat);
  frontPlate.position.set(0, 0.6, 5.08);
  const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.19), plateMat);
  rearPlate.position.set(0, 0.78, -4.77);
  rearPlate.rotation.y = Math.PI;
  busGroup.add(frontPlate, rearPlate);

  // 9. Curved Side Rearview Mirrors (Tamil Nadu Coach Style)
  const mirrorStalkGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.5);
  const leftStalk = new THREE.Mesh(mirrorStalkGeom, chromeMaterial);
  leftStalk.rotation.z = Math.PI / 3;
  leftStalk.position.set(-1.38, 2.38, 4.45);
  const leftMirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.18), blackTrimMaterial);
  leftMirrorHead.position.set(-1.58, 2.46, 4.48);

  const rightStalk = new THREE.Mesh(mirrorStalkGeom, chromeMaterial);
  rightStalk.rotation.z = -Math.PI / 3;
  rightStalk.position.set(1.38, 2.38, 4.45);
  const rightMirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.18), blackTrimMaterial);
  rightMirrorHead.position.set(1.58, 2.46, 4.48);
  busGroup.add(leftStalk, leftMirrorHead, rightStalk, rightMirrorHead);

  // 10. Detailed RHD Driver Cockpit with Live Canvas Gauges & Animated Driver Hands
  const liveDash = createLiveDashboardController();
  const dashMesh = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.44, 0.72), blackTrimMaterial);
  dashMesh.position.set(0, 1.44, 4.18);
  busGroup.add(dashMesh);

  // Illuminated Driver Instrument Cowl Face (facing driver in RHD cabin)
  const dashDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(1.06, 0.36),
    new THREE.MeshStandardMaterial({
      map: liveDash.texture,
      emissive: 0xffffff,
      emissiveMap: liveDash.texture,
      emissiveIntensity: 0.9,
    })
  );
  dashDisplay.position.set(-0.56, 1.61, 3.81);
  dashDisplay.rotation.y = Math.PI;
  dashDisplay.rotation.x = 0.25;
  busGroup.add(dashDisplay);

  // RHD Steering Wheel & Column (Right Side: -X)
  const steeringGroup = new THREE.Group();
  const wheelTorus = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 10, 28), blackTrimMaterial);
  const hornPad = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 16), chromeMaterial);
  hornPad.rotation.x = Math.PI / 2;
  const spokeV = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.44, 0.02), chromeMaterial);
  const spokeH = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.036, 0.02), chromeMaterial);
  steeringGroup.add(wheelTorus, hornPad, spokeV, spokeH);
  steeringGroup.position.set(-0.66, 1.66, 3.84);
  steeringGroup.rotation.x = Math.PI / 3;
  busGroup.add(steeringGroup);

  // Driver Hand Grips attached onto the Steering Wheel Rim (animate smoothly as wheel turns!)
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.78 });
  const uniformMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.75 }); // Khaki TNSTC sleeve

  const leftHandOnWheel = new THREE.Group();
  const lhFist = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.07, 0.065), skinMat);
  const lhForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.36, 8), uniformMat);
  lhForearm.rotation.x = Math.PI / 2.2;
  lhForearm.position.set(0.06, -0.02, -0.19);
  leftHandOnWheel.add(lhFist, lhForearm);
  leftHandOnWheel.position.set(0.23, 0.03, 0.02); // 9 o'clock in cockpit (+X inside bus is driver left)

  const rightHandOnWheel = new THREE.Group();
  const rhFist = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.07, 0.065), skinMat);
  const rhForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.36, 8), uniformMat);
  rhForearm.rotation.x = Math.PI / 2.2;
  rhForearm.position.set(-0.06, -0.02, -0.19);
  rightHandOnWheel.add(rhFist, rhForearm);
  rightHandOnWheel.position.set(-0.23, 0.03, 0.02);

  steeringGroup.add(leftHandOnWheel, rightHandOnWheel);

  // Animated Gear-Shifting Hand anchored near driver seat shoulder (visible during shifts!)
  const shiftArmGroup = new THREE.Group();
  const shiftFist = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.065), skinMat);
  const shiftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.34, 8), uniformMat);
  shiftSleeve.rotation.x = Math.PI / 3;
  shiftSleeve.position.set(-0.04, 0.08, -0.16);
  shiftArmGroup.add(shiftFist, shiftSleeve);
  shiftArmGroup.position.set(-0.24, 1.70, 3.72);
  shiftArmGroup.visible = false;
  busGroup.add(shiftArmGroup);

  // Gearstick lever next to driver (-X inward toward center aisle)
  const gearStickGroup = new THREE.Group();
  gearStickGroup.position.set(-0.24, 1.25, 3.72);
  const stickShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45), chromeMaterial);
  stickShaft.position.y = 0.22;
  const stickKnob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), blackTrimMaterial);
  stickKnob.position.y = 0.45;
  gearStickGroup.add(stickShaft, stickKnob);
  busGroup.add(gearStickGroup);

  // Auspicious Tamil Nadu Marigold Flower Garland on Windshield
  const garlandGroup = new THREE.Group();
  const marigoldOrange = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7 });
  const marigoldYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7 });
  for (let gx = -0.85; gx <= 0.85; gx += 0.14) {
    const sag = Math.cos((gx / 0.9) * (Math.PI / 2)) * 0.18;
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      Math.abs(Math.round(gx * 10)) % 2 === 0 ? marigoldOrange : marigoldYellow
    );
    flower.position.set(gx, 2.55 - sag, 4.46);
    garlandGroup.add(flower);
  }
  busGroup.add(garlandGroup);

  // Interior overhead convex rearview mirror
  const intMirror = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.03), chromeMaterial);
  intMirror.position.set(-0.25, 2.56, 4.35);
  busGroup.add(intMirror);

  // Cushioned Passenger Seats + Overhead Stainless Steel Grab Rails
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.55 });
  const backrestGeom = new THREE.BoxGeometry(0.75, 0.62, 0.14);
  const cushionGeom = new THREE.BoxGeometry(0.75, 0.14, 0.44);
  for (let z = 2.4; z >= -3.8; z -= 1.05) {
    [-0.68, 0.68].forEach((sx) => {
      const cushion = new THREE.Mesh(cushionGeom, seatMat);
      cushion.position.set(sx, 1.15, z + 0.14);
      const back = new THREE.Mesh(backrestGeom, seatMat);
      back.position.set(sx, 1.45, z - 0.06);
      busGroup.add(cushion, back);
    });
  }
  const grabRailGeom = new THREE.CylinderGeometry(0.02, 0.02, 6.8, 8);
  grabRailGeom.rotateX(Math.PI / 2);
  const leftRail = new THREE.Mesh(grabRailGeom, chromeMaterial);
  leftRail.position.set(-0.55, 2.75, -0.8);
  const rightRail = new THREE.Mesh(grabRailGeom, chromeMaterial);
  rightRail.position.set(0.55, 2.75, -0.8);
  busGroup.add(leftRail, rightRail);

  // Cabin dome light
  const cabinLight = new THREE.PointLight(0xffedd5, 0.8, 8.5);
  cabinLight.position.set(0, 2.7, 0.5);
  busGroup.add(cabinLight);

  // 11. Pneumatic Passenger Door Assembly (Glass upper + painted lower)
  const doorsGroup = new THREE.Group();
  doorsGroup.position.set(1.24, 1.45, 2.7);
  const doorLower = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.92), stripeMaterial);
  doorLower.position.y = -0.35;
  const doorUpper = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.92), glassMaterial);
  doorUpper.position.y = 0.52;
  doorsGroup.add(doorLower, doorUpper);
  busGroup.add(doorsGroup);

  // 12. 6 Heavy Duty Wheels with Tread, Slotted Steel Hubs & Mudflaps
  const tireTreadTexture = createTireTreadTexture(anisotropy);
  const tireMaterial = new THREE.MeshStandardMaterial({
    map: tireTreadTexture,
    bumpMap: tireTreadTexture,
    bumpScale: 0.025,
    roughness: 0.88,
    metalness: 0.08,
  });

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: livery.stripeColorHex,
    roughness: 0.22,
    metalness: 0.85,
  });

  const createWheel = (isDualRear: boolean = false) => {
    const wheelG = new THREE.Group();
    const width = isDualRear ? 0.52 : 0.36;
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, width, 24), tireMaterial);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelG.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, width + 0.02, 16), rimMaterial);
    rim.rotation.z = Math.PI / 2;
    wheelG.add(rim);

    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, width + 0.05, 12), chromeMaterial);
    hubCap.rotation.z = Math.PI / 2;
    wheelG.add(hubCap);

    return wheelG;
  };

  const frontWheels: THREE.Group[] = [];
  const rearWheels: THREE.Group[] = [];

  const flWheel = createWheel(false);
  flWheel.position.set(-1.22, 0.55, 3.0);
  const frWheel = createWheel(false);
  frWheel.position.set(1.22, 0.55, 3.0);
  busGroup.add(flWheel, frWheel);
  frontWheels.push(flWheel, frWheel);

  const rlWheel = createWheel(true);
  rlWheel.position.set(-1.18, 0.55, -2.5);
  const rrWheel = createWheel(true);
  rrWheel.position.set(1.18, 0.55, -2.5);
  busGroup.add(rlWheel, rrWheel);
  rearWheels.push(rlWheel, rrWheel);

  // Rubber Mudflaps behind rear wheels
  const flapGeom = new THREE.BoxGeometry(0.5, 0.42, 0.04);
  const leftFlap = new THREE.Mesh(flapGeom, blackTrimMaterial);
  leftFlap.position.set(-1.18, 0.35, -3.15);
  const rightFlap = new THREE.Mesh(flapGeom, blackTrimMaterial);
  rightFlap.position.set(1.18, 0.35, -3.15);
  busGroup.add(leftFlap, rightFlap);

  // Ground Contact Shadow Plane
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(64, 64, 12, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 10.8),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, 0.025, 0);
  busGroup.add(shadowPlane);

  return {
    busGroup,
    frontWheels,
    rearWheels,
    steeringWheel: steeringGroup,
    leftHeadlight,
    rightHeadlight,
    cabinLight,
    doorsMesh: doorsGroup,
    updateLivery: (newL, custom) => {
      const bodyHex = custom?.bodyColorHex ?? newL.bodyColorHex;
      const stripeHex = custom?.stripeColorHex ?? newL.stripeColorHex;
      const rimObj = WHEEL_STYLES.find((w) => w.id === custom?.wheelStyleId);
      const uphObj = UPHOLSTERY_STYLES.find((u) => u.id === custom?.upholsteryId);

      bodyMaterial.color.setHex(bodyHex);
      stripeMaterial.color.setHex(stripeHex);
      rimMaterial.color.setHex(rimObj ? rimObj.hex : stripeHex);
      if (uphObj) seatMat.color.setHex(uphObj.hex);
      drawPlate(custom?.registrationNumber || newL.defaultReg);

      const hexToCss = (h: number) => `#${h.toString(16).padStart(6, '0')}`;
      const newTexSet = createBusSideLiveryTexture(newL, anisotropy, {
        bodyHexStr: hexToCss(bodyHex),
        stripeHexStr: hexToCss(stripeHex),
        registration: custom?.registrationNumber || newL.defaultReg,
      });
      liveryPlaneMat.map = newTexSet.map;
      liveryPlaneMat.bumpMap = newTexSet.bumpMap;
      liveryPlaneMat.needsUpdate = true;
      const newLedTex = createLedBoardTexture(newL.ledTamil, newL.ledEnglish);
      ledMat.map = newLedTex;
      ledMat.emissiveMap = newLedTex;
      ledMat.needsUpdate = true;
    },
    updateWheelTurn: (turnAngle: number, rollAngle: number) => {
      frontWheels.forEach((w) => {
        w.rotation.y = turnAngle;
        w.children[0].rotation.x += rollAngle;
        w.children[1].rotation.x += rollAngle;
      });
      rearWheels.forEach((w) => {
        w.children[0].rotation.x += rollAngle;
        w.children[1].rotation.x += rollAngle;
      });
      steeringGroup.rotation.z = -turnAngle * 2.6;
    },
    setDoorOpen: (isOpen: boolean) => {
      doorsGroup.position.x = isOpen ? 1.46 : 1.24;
      doorsGroup.scale.z = isOpen ? 0.25 : 1.0;
    },
    updateWipers: (isRaining: boolean, time: number, intensity: number = 1.0) => {
      if (isRaining) {
        const speed = intensity > 0.5 ? 9.5 : 5.8;
        const sweep = (Math.sin(time * speed) + 1) * 0.5;
        const angle = -0.38 + sweep * 1.15;
        leftWiperGroup.rotation.z = angle;
        rightWiperGroup.rotation.z = angle;
      } else {
        leftWiperGroup.rotation.z += (-0.38 - leftWiperGroup.rotation.z) * 0.2;
        rightWiperGroup.rotation.z += (-0.38 - rightWiperGroup.rotation.z) * 0.2;
      }
    },
    updateWetLook: (isWet: boolean) => {
      bodyMaterial.roughness = isWet ? 0.08 : 0.28;
      bodyMaterial.clearcoatRoughness = isWet ? 0.04 : 0.14;
      stripeMaterial.roughness = isWet ? 0.08 : 0.25;
      liveryPlaneMat.roughness = isWet ? 0.08 : 0.25;
      glassMaterial.roughness = isWet ? 0.02 : 0.05;
    },
    setDirtLevel: (dirtPct: number) => {
      const norm = Math.max(0, Math.min(1, dirtPct / 100));
      bodyMaterial.clearcoat = 0.9 - norm * 0.65;
      liveryPlaneMat.roughness = 0.25 + norm * 0.55;
    },
    updateDashboard: (metrics) => {
      liveDash.update(metrics);
    },
    setSignalStates: ({
      headlights,
      highBeam = false,
      braking,
      reverse,
      leftSignal,
      rightSignal,
      gear,
      gearShiftAnim = 0,
      time,
    }) => {
      headlampMat.emissiveIntensity = highBeam ? 3.8 : headlights ? 2.4 : 0.35;
      beamMat.opacity = highBeam ? 0.26 : headlights ? 0.14 : 0.0;
      tailLightMat.emissiveIntensity = braking ? 3.5 : headlights ? 1.1 : 0.3;
      reverseLightMat.emissiveIntensity = reverse ? 2.8 : 0.0;

      const blink = Math.sin(time * 8.5) > 0;
      leftIndicatorMat.emissiveIntensity = leftSignal && blink ? 3.0 : 0.0;
      rightIndicatorMat.emissiveIntensity = rightSignal && blink ? 3.0 : 0.0;

      const gearOffset =
        gear === 'R'
          ? -0.18
          : gear === '1' || gear === '3' || gear === '5'
          ? 0.14
          : gear === '2' || gear === '4' || gear === '6'
          ? -0.14
          : 0;
      gearStickGroup.rotation.x += (gearOffset - gearStickGroup.rotation.x) * 0.25;

      // Animate right driver hand reaching to gearstick during shifts!
      const isShifting = gearShiftAnim > 0.15;
      rightHandOnWheel.visible = !isShifting;
      shiftArmGroup.visible = isShifting;
      if (isShifting) {
        shiftArmGroup.position.z = 3.72 + gearOffset * 0.35;
      }
    },
  };
}

/**
 * Detailed Coimbatore Green & Yellow Bajaj Auto-Rickshaw
 */
export function createAutoRickshaw(): THREE.Group {
  const auto = new THREE.Group();

  const yellowMat = new THREE.MeshPhysicalMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.2, clearcoat: 0.7 });
  const greenMat = new THREE.MeshPhysicalMaterial({ color: 0x15803d, roughness: 0.3, metalness: 0.15, clearcoat: 0.5 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.92, roughness: 0.12 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x1e293b, transparent: true, opacity: 0.55, roughness: 0.08 });

  // Lower body shell
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.44, 2.38), greenMat);
  lowerBody.position.y = 0.48;
  lowerBody.castShadow = true;
  auto.add(lowerBody);

  // Rounded front nose apron
  const frontNose = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 0.75, 12, 1, false, -Math.PI / 2, Math.PI), yellowMat);
  frontNose.position.set(0, 0.65, 1.0);
  frontNose.castShadow = true;
  auto.add(frontNose);

  // Passenger compartment & upper yellow sides
  const upperBody = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.58, 1.35), yellowMat);
  upperBody.position.set(0, 0.96, -0.45);
  upperBody.castShadow = true;
  auto.add(upperBody);

  // Curved canvas roof top
  const canvasTop = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.68, 2.05, 10, 1, false, 0, Math.PI), blackMat);
  canvasTop.rotation.z = Math.PI / 2;
  canvasTop.rotation.y = Math.PI / 2;
  canvasTop.scale.set(1, 0.28, 1);
  canvasTop.position.set(0, 1.44, -0.1);
  canvasTop.castShadow = true;
  auto.add(canvasTop);

  // Sloped windshield + frame
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.52, 0.05), glassMat);
  windshield.position.set(0, 1.16, 0.82);
  windshield.rotation.x = -0.25;
  auto.add(windshield);

  // Front mudguard & glowing headlamp
  const frontLamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.1, 14),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef08a, emissiveIntensity: 0.9 })
  );
  frontLamp.rotation.x = Math.PI / 2;
  frontLamp.position.set(0, 0.68, 1.36);
  auto.add(frontLamp);

  // Rear tail lamps
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.8 });
  [-0.5, 0.5].forEach((tx) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.05), tailMat);
    tl.position.set(tx, 0.58, -1.2);
    auto.add(tl);
  });

  // 3 Wheels with chrome hubs
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const createAutoWheel = () => {
    const g = new THREE.Group();
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.castShadow = true;
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 12), chromeMat);
    h.rotation.z = Math.PI / 2;
    g.add(w, h);
    return g;
  };

  const fw = createAutoWheel();
  fw.position.set(0, 0.28, 1.05);
  const rl = createAutoWheel();
  rl.position.set(-0.64, 0.28, -0.72);
  const rr = createAutoWheel();
  rr.position.set(0.64, 0.28, -0.72);
  auto.add(fw, rl, rr);

  return auto;
}

/**
 * Historic Indo-Saracenic Coimbatore Town Hall Clock Tower (1877)
 */
export function createClockTower(): THREE.Group {
  const tower = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.78 });
  const terracottaMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.65 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.75 });
  const clockDialMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    roughness: 0.2,
    emissive: 0xfef08a,
    emissiveIntensity: 0.65,
  });

  // Multi-stepped granite plinth
  const plinth1 = new THREE.Mesh(new THREE.BoxGeometry(9.2, 1.2, 9.2), darkStoneMat);
  plinth1.position.y = 0.6;
  const plinth2 = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.0, 7.6), terracottaMat);
  plinth2.position.y = 2.2;
  tower.add(plinth1, plinth2);

  // Main Sandstone Shaft with cornice ledges
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.4, 17, 5.4), stoneMat);
  body.position.y = 11.7;
  body.castShadow = true;
  body.receiveShadow = true;
  tower.add(body);

  [7.5, 13.5, 19.8].forEach((cy) => {
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.45, 6.1), terracottaMat);
    cornice.position.y = cy;
    tower.add(cornice);
  });

  // Illuminated Clock Faces + Hour/Minute Hands on 4 sides
  const dialGeom = new THREE.CircleGeometry(1.45, 24);
  const rimGeom = new THREE.TorusGeometry(1.48, 0.12, 8, 24);
  const handMat = new THREE.MeshBasicMaterial({ color: 0x18181b });

  [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((angle) => {
    const faceGroup = new THREE.Group();
    faceGroup.position.y = 17.2;
    faceGroup.rotation.y = angle;

    const dial = new THREE.Mesh(dialGeom, clockDialMat);
    dial.position.z = 2.75;
    const rim = new THREE.Mesh(rimGeom, darkStoneMat);
    rim.position.z = 2.75;
    const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.04), handMat);
    hourHand.position.set(0, 0.25, 2.78);
    const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.0, 0.04), handMat);
    minHand.position.set(0.32, 0.15, 2.79);
    minHand.rotation.z = -Math.PI / 3;

    faceGroup.add(dial, rim, hourHand, minHand);
    tower.add(faceGroup);
  });

  // Octagonal Turret Belfry & Copper Finial Dome
  const belfry = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 3.2, 8), terracottaMat);
  belfry.position.y = 21.6;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 4.8, 8), darkStoneMat);
  crown.position.y = 25.4;
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.8, 8), clockDialMat);
  finial.position.y = 28.4;
  tower.add(belfry, crown, finial);

  return tower;
}

/**
 * Coimbatore Smart-City Bus Shelter
 */
export function createBusShelter(nameTamil: string, nameEnglish: string): THREE.Group {
  const shelter = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.28, metalness: 0.8 });
  const roofMat = new THREE.MeshPhysicalMaterial({ color: 0xe0f2fe, roughness: 0.18, metalness: 0.3, clearcoat: 0.6 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.7 });

  const plat = new THREE.Mesh(
    new THREE.BoxGeometry(10.4, 0.28, 4.2),
    new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.85 })
  );
  plat.position.set(0, 0.14, 0);
  plat.receiveShadow = true;
  shelter.add(plat);

  const pillarGeom = new THREE.CylinderGeometry(0.09, 0.09, 3.3, 12);
  [-4.2, 0, 4.2].forEach((x) => {
    const pillar = new THREE.Mesh(pillarGeom, steelMat);
    pillar.position.set(x, 1.65, -1.45);
    pillar.castShadow = true;
    shelter.add(pillar);
  });

  const roof = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.12, 3.8), roofMat);
  roof.position.set(0, 3.32, -0.35);
  roof.rotation.x = 0.08;
  roof.castShadow = true;
  shelter.add(roof);

  // Illuminated Shelter Signboard
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#075985';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px "Noto Sans Tamil", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(nameTamil, 256, 52);
  ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#fde047';
  ctx.fillText(nameEnglish.toUpperCase(), 256, 98);

  const signTex = new THREE.CanvasTexture(canvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 1.2),
    new THREE.MeshStandardMaterial({
      map: signTex,
      emissive: 0xffffff,
      emissiveMap: signTex,
      emissiveIntensity: 0.35,
    })
  );
  signMesh.position.set(0, 3.3, 1.48);
  shelter.add(signMesh);

  // Stainless Steel Seating Bench
  const bench = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.48, 0.65), benchMat);
  bench.position.set(0, 0.48, -1.15);
  shelter.add(bench);

  return shelter;
}

/**
 * Roadside Tender Coconut Stall (Elaneer Vandi)
 */
export function createCoconutStall(): THREE.Group {
  const stall = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const coconutMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.55 });
  const umbrellaMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65 });

  const table = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.88, 1.4), woodMat);
  table.position.y = 0.44;
  table.castShadow = true;
  stall.add(table);

  // Wheels on cart
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
  [-1.0, 1.0].forEach((wx) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 14), wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.3, 0.72);
    stall.add(w);
  });

  const cocoGeom = new THREE.SphereGeometry(0.18, 10, 10);
  for (let i = 0; i < 10; i++) {
    const coco = new THREE.Mesh(cocoGeom, coconutMat);
    coco.position.set(-0.8 + (i % 4) * 0.35, 0.96 + Math.floor(i / 8) * 0.22, -0.3 + Math.floor((i % 8) / 4) * 0.36);
    coco.scale.set(0.9, 1.2, 0.9);
    stall.add(coco);
  }

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.7), woodMat);
  pole.position.set(0.85, 1.35, 0);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.65, 12), umbrellaMat);
  canopy.position.set(0.85, 2.65, 0);
  canopy.castShadow = true;
  stall.add(pole, canopy);

  return stall;
}

/**
 * Multi-tier Organic Gulmohar or Coconut Palm Tree
 */
export function createRoadsideTree(isPalm: boolean = false): THREE.Group {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x45220b, roughness: 0.92 });

  if (isPalm) {
    // Segmented curving Coconut Palm trunk
    for (let seg = 0; seg < 6; seg++) {
      const rBot = 0.28 - seg * 0.025;
      const rTop = 0.25 - seg * 0.025;
      const piece = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, 1.25, 8), trunkMat);
      piece.position.set(seg * 0.08, 0.6 + seg * 1.15, 0);
      piece.rotation.z = -0.07;
      piece.castShadow = true;
      tree.add(piece);
    }

    const frondMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.68, side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) {
      const frondGroup = new THREE.Group();
      frondGroup.position.set(0.45, 7.1, 0);
      frondGroup.rotation.y = (i * Math.PI * 2) / 9;

      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 1.5), frondMat);
      inner.position.set(0, 0.12, 0.75);
      inner.rotation.x = -0.18;
      const outer = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 1.4), frondMat);
      outer.position.set(0, -0.08, 2.0);
      outer.rotation.x = 0.35;

      frondGroup.add(inner, outer);
      tree.add(frondGroup);
    }
  } else {
    // Multi-branching Kovai Gulmohar Tree
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.46, 4.4, 8), trunkMat);
    trunk.position.y = 2.2;
    trunk.castShadow = true;
    tree.add(trunk);

    const branch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.4, 6), trunkMat);
    branch1.position.set(-0.7, 4.0, 0.3);
    branch1.rotation.z = 0.55;
    const branch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.4, 6), trunkMat);
    branch2.position.set(0.7, 4.1, -0.3);
    branch2.rotation.z = -0.55;
    tree.add(branch1, branch2);

    const flameMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.8 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.82 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });

    const clusters = [
      { pos: [0, 5.2, 0], r: 2.1, mat: flameMat, scale: [1.35, 0.72, 1.35] },
      { pos: [-1.1, 4.6, 0.6], r: 1.5, mat: greenMat, scale: [1.2, 0.75, 1.2] },
      { pos: [1.1, 4.7, -0.5], r: 1.6, mat: orangeMat, scale: [1.25, 0.72, 1.25] },
      { pos: [0.3, 5.5, 0.9], r: 1.3, mat: flameMat, scale: [1.2, 0.7, 1.2] },
    ];
    clusters.forEach((c) => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(c.r, 1), c.mat);
      m.position.set(c.pos[0], c.pos[1], c.pos[2]);
      m.scale.set(c.scale[0], c.scale[1], c.scale[2]);
      m.castShadow = true;
      tree.add(m);
    });
  }

  return tree;
}

/**
 * 3D Animated Passenger Character
 */
export function createPassengerCharacter(colorHex: number): THREE.Group {
  const passenger = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const clothMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.72 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), skinMat);
  head.position.y = 1.62;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.position.y = 1.63;
  passenger.add(head, hair);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.66, 10), clothMat);
  torso.position.y = 1.18;
  torso.castShadow = true;
  passenger.add(torso);

  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.82), darkMat);
  leftLeg.position.set(-0.1, 0.41, 0);
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.82), darkMat);
  rightLeg.position.set(0.1, 0.41, 0);
  passenger.add(leftLeg, rightLeg);

  return passenger;
}

/**
 * Tamil Nadu Indian Commuter Motorbike + Helmeted Rider
 */
export function createMotorbike(colorHex: number = 0xdc2626): { group: THREE.Group; wheels: THREE.Object3D[] } {
  const bike = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const metalMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.5 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.8 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 1.35), metalMat);
  frame.position.set(0, 0.62, 0);
  frame.castShadow = true;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.65), blackMat);
  seat.position.set(0, 0.82, -0.18);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.68, 8), blackMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, 0.98, 0.52);

  const headlamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef08a, emissiveIntensity: 1.0 })
  );
  headlamp.position.set(0, 0.88, 0.68);

  // Helmeted Rider
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.24), jacketMat);
  torso.position.set(0, 1.15, -0.05);
  torso.rotation.x = 0.18;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), metalMat);
  helmet.position.set(0, 1.52, 0.04);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.1), skinMat);
  visor.position.set(0, 1.50, 0.15);

  const wheelGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 14);
  wheelGeom.rotateZ(Math.PI / 2);
  [0.64, -0.62].forEach((wz) => {
    const w = new THREE.Mesh(wheelGeom, blackMat);
    w.position.set(0, 0.3, wz);
    w.castShadow = true;
    bike.add(w);
    wheels.push(w);
  });

  bike.add(frame, seat, handle, headlamp, torso, helmet, visor);
  return { group: bike, wheels };
}

/**
 * AI Intercity TNSTC / SETC Highway Bus
 */
export function createAiBus(bodyHex: number = 0x0284c7, stripeHex: number = 0xf8fafc): {
  group: THREE.Group;
  wheels: THREE.Object3D[];
} {
  const g = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: bodyHex, roughness: 0.3, metalness: 0.28, clearcoat: 0.7 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: stripeHex, roughness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.08 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.42, 2.35, 9.1), bodyMat);
  body.position.set(0, 1.62, 0);
  body.castShadow = true;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.32, 9.12), stripeMat);
  stripe.position.set(0, 1.35, 0);
  const winBand = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.86, 8.6), glassMat);
  winBand.position.set(0, 2.25, 0.05);
  const headL = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.16, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef08a, emissiveIntensity: 0.9 })
  );
  headL.position.set(-0.85, 0.9, 4.56);
  const headR = headL.clone();
  headR.position.x = 0.85;

  const wg = new THREE.CylinderGeometry(0.5, 0.5, 0.34, 14);
  wg.rotateZ(Math.PI / 2);
  [
    [-1.14, 0.5, 2.8],
    [1.14, 0.5, 2.8],
    [-1.14, 0.5, -2.5],
    [1.14, 0.5, -2.5],
  ].forEach(([wx, wy, wz]) => {
    const w = new THREE.Mesh(wg, tireMat);
    w.position.set(wx, wy, wz);
    g.add(w);
    wheels.push(w);
  });

  g.add(body, stripe, winBand, headL, headR);
  return { group: g, wheels };
}

/**
 * Tamil Nadu Highway Petrol Bunk Station (Bharat Petroleum / IndianOil Style)
 */
export function createPetrolBunk(brandName: string = 'BHARAT PETROLEUM'): THREE.Group {
  const bunk = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.85 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.35 });
  const fasciaMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
  const pumpMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 });

  const pad = new THREE.Mesh(new THREE.BoxGeometry(16, 0.18, 12), concreteMat);
  pad.position.set(0, 0.09, 0);
  pad.receiveShadow = true;
  bunk.add(pad);

  [
    [-5.5, -3.5],
    [5.5, -3.5],
    [-5.5, 3.5],
    [5.5, 3.5],
  ].forEach(([px, pz]) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.2, 0.45), pillarMat);
    col.position.set(px, 2.6, pz);
    col.castShadow = true;
    bunk.add(col);
  });

  const roof = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.75, 11.5), canopyMat);
  roof.position.set(0, 5.3, 0);
  roof.castShadow = true;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(15.65, 0.25, 11.65), fasciaMat);
  trim.position.set(0, 5.05, 0);
  bunk.add(roof, trim);

  [-2.5, 2.5].forEach((px) => {
    const island = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.24, 3.6), concreteMat);
    island.position.set(px, 0.24, 0);
    const disp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.65, 0.9), pumpMat);
    disp.position.set(px, 1.1, 0);
    bunk.add(island, disp);
  });

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#075985';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${brandName} · DIESEL`, 256, 62);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 1.4),
    new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 })
  );
  sign.position.set(0, 5.35, 5.84);
  bunk.add(sign);

  return bunk;
}

/**
 * FASTag National Highway Toll Gate Plaza
 */
export function createTollPlaza(): THREE.Group {
  const toll = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
  const boothMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.45 });
  const amberMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.8 });

  // Center & outer divider toll booths
  [-9.5, 0, 9.5].forEach((bx) => {
    const island = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 7.5), concreteMat);
    island.position.set(bx, 0.17, 0);
    const booth = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.2, 3.6), boothMat);
    booth.position.set(bx, 1.8, 0);
    booth.castShadow = true;
    toll.add(island, booth);
  });

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(22.5, 1.1, 7.2), canopyMat);
  canopy.position.set(0, 5.8, 0);
  canopy.castShadow = true;
  toll.add(canopy);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FASTag · NHAI TAMIL NADU TOLL', 256, 60);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 1.8),
    new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.45 })
  );
  board.position.set(0, 5.8, 3.65);
  const boardBack = board.clone();
  boardBack.position.z = -3.65;
  boardBack.rotation.y = Math.PI;
  toll.add(board, boardBack);

  const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), amberMat);
  beacon.position.set(0, 4.9, 3.2);
  toll.add(beacon);

  return toll;
}

/**
 * Southern Railway Level Crossing Track & Warning Crossbuck
 */
export function createRailwayCrossing(): THREE.Group {
  const rail = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
  const warnMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xd97706, emissiveIntensity: 0.25 });

  // Twin steel rails spanning across 20m highway
  [-0.85, 0.85].forEach((rx) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 34), steelMat);
    r.position.set(rx, 0.08, 0);
    rail.add(r);
  });

  // Wooden railway sleepers
  for (let z = -15; z <= 15; z += 1.2) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.09, 0.28), woodMat);
    tie.position.set(0, 0.04, z);
    rail.add(tie);
  }

  // Yellow-black warning gate posts on road shoulders
  [-11.5, 11.5].forEach((pz) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3.2, 8), warnMat);
    post.position.set(-1.6, 1.6, pz);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 5.2), warnMat);
    arm.rotation.x = Math.PI / 5; // Raised open gate arm
    arm.position.set(-1.6, 3.0, pz);
    rail.add(post, arm);
  });

  return rail;
}

/**
 * Highway Chai / Tea Kadai Stall (Tamil Nadu Roadside Classic)
 */
export function createTeaStall(): THREE.Group {
  const stall = new THREE.Group();
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.78 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.65 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.0, 2.1), counterMat);
  base.position.set(0, 0.5, 0);
  base.castShadow = true;
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.65, 12), steelMat);
  boiler.position.set(-0.9, 1.32, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.15, 2.9), roofMat);
  roof.position.set(0, 2.75, 0);
  roof.castShadow = true;

  [-1.7, 1.7].forEach((px) => {
    [-0.9, 0.9].forEach((pz) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.7, 6), steelMat);
      p.position.set(px, 1.35, pz);
      stall.add(p);
    });
  });

  stall.add(base, boiler, roof);
  return stall;
}

/**
 * Tamil Nadu Traffic Police Checkpost Booth & Barricades
 */
export function createPoliceCheckpost(): THREE.Group {
  const grp = new THREE.Group();
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const beaconRed = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 2.0,
  });
  const beaconBlue = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x3b82f6,
    emissiveIntensity: 2.0,
  });

  // Roadside police kiosk
  const booth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.7, 2.6), whiteMat);
  booth.position.set(11.6, 1.35, 0);
  booth.castShadow = true;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.45, 3.0), blueMat);
  roof.position.set(11.6, 2.85, 0);
  const beaconR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.28, 10), beaconRed);
  beaconR.position.set(11.3, 3.22, 0);
  const beaconB = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.28, 10), beaconBlue);
  beaconB.position.set(11.9, 3.22, 0);

  // Checkpost steel barricade on shoulder
  [-8.2, 8.2].forEach((bx) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 0.35), blueMat);
    bar.position.set(bx, 0.5, 2.2);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.24, 0.38), whiteMat);
    strip.position.set(bx, 0.72, 2.2);
    grp.add(bar, strip);
  });

  grp.add(booth, roof, beaconR, beaconB);
  return grp;
}

/**
 * Highway Roadwork Construction Cones & Diversion Barriers
 */
export function createConstructionZone(): THREE.Group {
  const grp = new THREE.Group();
  const orangeMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

  // Place traffic cones along shoulder / edge lane without blocking passable lane
  for (let i = -10; i <= 10; i += 4) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.78, 10), orangeMat);
    cone.position.set(i, 0.39, -7.8);
    cone.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.16, 10), whiteMat);
    band.position.set(i, 0.42, -7.8);
    grp.add(cone, band);
  }

  const barrier = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.95, 0.55), orangeMat);
  barrier.position.set(0, 0.48, -8.5);
  barrier.castShadow = true;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(6.55, 0.22, 0.58), whiteMat);
  stripe.position.set(0, 0.65, -8.5);
  grp.add(barrier, stripe);

  return grp;
}

