import * as THREE from 'three';
import { BusLivery, TimeOfDayId, WeatherId } from './constants';

/**
 * Procedural PBR Texture Generator for Coimbatore Bus Simulator
 * Zero external image dependencies — all maps generated on HTML5 2D Canvas
 * with proper SRGBColorSpace (albedo/emissive) vs NoColorSpace (bump/roughness).
 */

function configureRepeatTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  isColor: boolean,
  anisotropy: number
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createAsphaltTextures(anisotropy: number = 4): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;

  // 1. Albedo Map
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  ctx.fillStyle = '#24262b';
  ctx.fillRect(0, 0, size, size);

  // Subtle worn tire wheel-path tracks along lanes
  const drawLaneTrack = (cx: number) => {
    const grad = ctx.createLinearGradient(cx - 42, 0, cx + 42, 0);
    grad.addColorStop(0, 'rgba(12, 14, 18, 0)');
    grad.addColorStop(0.5, 'rgba(12, 14, 18, 0.35)');
    grad.addColorStop(1, 'rgba(12, 14, 18, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - 42, 0, 84, size);
  };
  drawLaneTrack(110);
  drawLaneTrack(180);
  drawLaneTrack(332);
  drawLaneTrack(402);

  // Aggregate mineral grit speckles
  for (let i = 0; i < 16000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 24 + Math.floor(Math.random() * 44);
    const s = Math.random() > 0.85 ? 2 : 1;
    ctx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
    ctx.fillRect(x, y, s, s);
  }

  // Subtle asphalt hairlines / patched tar seams
  ctx.strokeStyle = 'rgba(12, 12, 15, 0.55)';
  ctx.lineWidth = 1.2;
  for (let c = 0; c < 6; c++) {
    ctx.beginPath();
    let cx = Math.random() * size;
    let cy = Math.random() * size;
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += (Math.random() - 0.5) * 45;
      cy += (Math.random() - 0.5) * 45;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Yellow shoulder edge lines & subtle center double-yellow / dashed guide
  ctx.fillStyle = '#eab308';
  ctx.fillRect(10, 0, 7, size);
  ctx.fillRect(size - 17, 0, 7, size);

  // 2. Bump & Roughness Map
  const dataCanvas = document.createElement('canvas');
  dataCanvas.width = size;
  dataCanvas.height = size;
  const dctx = dataCanvas.getContext('2d')!;
  dctx.fillStyle = '#c8c8c8';
  dctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const g = 140 + Math.floor(Math.random() * 110);
    dctx.fillStyle = `rgb(${g},${g},${g})`;
    dctx.fillRect(x, y, 2, 2);
  }

  // Tire tracks are slightly smoother (darker in roughness map)
  const trackGrad = dctx.createLinearGradient(0, 0, size, 0);
  trackGrad.addColorStop(0.2, 'rgba(90,90,90,0.3)');
  trackGrad.addColorStop(0.5, 'rgba(200,200,200,0)');
  trackGrad.addColorStop(0.8, 'rgba(90,90,90,0.3)');
  dctx.fillStyle = trackGrad;
  dctx.fillRect(0, 0, size, size);

  return {
    map: configureRepeatTexture(colorCanvas, 1, 1, true, anisotropy),
    bumpMap: configureRepeatTexture(dataCanvas, 1, 1, false, anisotropy),
    roughnessMap: configureRepeatTexture(dataCanvas, 1, 1, false, anisotropy),
  };
}

export function createKonguTerrainTextures(anisotropy: number = 4): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Rich Kongu soil + tropical green turf base
  ctx.fillStyle = '#254222';
  ctx.fillRect(0, 0, size, size);

  // Organic soil & grass mottling
  for (let i = 0; i < 450; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 8 + Math.random() * 26;
    const isRedSoil = Math.random() > 0.65;
    ctx.fillStyle = isRedSoil
      ? `rgba(110, 68, 42, ${0.14 + Math.random() * 0.16})`
      : `rgba(38, 86, 36, ${0.18 + Math.random() * 0.22})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine blade & pebble grain
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(22, 48, 22, 0.35)' : 'rgba(134, 158, 85, 0.2)';
    ctx.fillRect(x, y, 2, 3);
  }

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const v = 90 + Math.floor(Math.random() * 80);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  return {
    map: configureRepeatTexture(canvas, 32, 32, true, anisotropy),
    bumpMap: configureRepeatTexture(bumpCanvas, 32, 32, false, anisotropy),
  };
}

export function createCurbTexture(anisotropy: number = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Alternating Coimbatore yellow & charcoal concrete safety kerb blocks
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#eab308' : '#27272a';
    ctx.fillRect(i * 64, 0, 64, 64);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(i * 64, 0, 3, 64);
  }

  // Concrete weathering speckle
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(Math.random() * 256, Math.random() * 64, 2, 2);
  }

  return configureRepeatTexture(canvas, 1, 1, true, anisotropy);
}

export function createSidewalkTexture(anisotropy: number = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#6b7280';
  ctx.fillRect(0, 0, size, size);

  // Interlocking paver tile grid
  const tile = 32;
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 2;
  for (let y = 0; y < size; y += tile) {
    const offset = (y / tile) % 2 === 0 ? 0 : tile / 2;
    for (let x = -tile; x < size + tile; x += tile) {
      const shade = 95 + Math.floor(Math.random() * 24);
      ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 5})`;
      ctx.fillRect(x + offset + 1, y + 1, tile - 2, tile - 2);
    }
  }

  return configureRepeatTexture(canvas, 1, 1, true, anisotropy);
}

export function createBuildingFacadeTextures(
  baseHex: string,
  anisotropy: number = 4
): {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 512;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = w;
  colorCanvas.height = h;
  const ctx = colorCanvas.getContext('2d')!;

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = w;
  emissiveCanvas.height = h;
  const ectx = emissiveCanvas.getContext('2d')!;
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, w, h);

  // Stucco/concrete exterior wall
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, w, h);

  // Subtle vertical weathering & floor slab bands
  for (let y = 0; y < h; y += 64) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.fillRect(0, y, w, 6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, y + 6, w, 2);
  }

  // Multi-story recessed windows
  const cols = 6;
  const rows = 7;
  const padX = 20;
  const colW = (w - padX * 2) / cols;
  const rowH = (h - 90) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = padX + c * colW + 10;
      const wy = 22 + r * rowH + 10;
      const ww = colW - 20;
      const wh = rowH - 22;

      // Window concrete sill & frame
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);

      // Tinted reflective window pane
      const winGrad = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
      winGrad.addColorStop(0, '#334155');
      winGrad.addColorStop(0.5, '#1e3a5f');
      winGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = winGrad;
      ctx.fillRect(wx, wy, ww, wh);

      // Window mullion
      ctx.fillStyle = '#475569';
      ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);

      // Warm lit interior rooms (for night/dusk emissiveMap)
      if (Math.random() > 0.35) {
        const warm = Math.random() > 0.3 ? '#fde68a' : '#bae6fd';
        ectx.fillStyle = warm;
        ectx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
        ectx.fillStyle = '#000000';
        ectx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
      }
    }
  }

  // Ground floor commercial shutter / arcade storefront
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, h - 78, w, 78);
  for (let sx = 16; sx < w - 24; sx += 96) {
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(sx, h - 68, 76, 62);
    // Corrugated shutter ribs
    ctx.fillStyle = '#27272a';
    for (let sy = h - 64; sy < h - 8; sy += 6) {
      ctx.fillRect(sx + 2, sy, 72, 2);
    }
    // Shop doorway light
    if (Math.random() > 0.4) {
      ectx.fillStyle = '#fef3c7';
      ectx.fillRect(sx + 8, h - 58, 60, 44);
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = anisotropy;

  return { map, emissiveMap };
}

export function createBusSideLiveryTexture(
  livery: BusLivery,
  anisotropy: number = 4,
  custom?: { bodyHexStr?: string; stripeHexStr?: string; registration?: string }
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const primaryHex = custom?.bodyHexStr || livery.primaryColor;
  const secondaryHex = custom?.stripeHexStr || livery.secondaryColor;
  const regText = custom?.registration || livery.defaultReg;

  // Metallic gradient base coat
  const baseGrad = ctx.createLinearGradient(0, 0, 0, 512);
  baseGrad.addColorStop(0, primaryHex);
  baseGrad.addColorStop(0.55, primaryHex);
  baseGrad.addColorStop(1, '#09090b');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sweeping TNSTC / SETC / Private coach speed ribbons
  ctx.fillStyle = secondaryHex;
  ctx.beginPath();
  ctx.moveTo(0, 310);
  ctx.bezierCurveTo(280, 355, 620, 210, 1024, 270);
  ctx.lineTo(1024, 385);
  ctx.bezierCurveTo(620, 325, 280, 445, 0, 415);
  ctx.closePath();
  ctx.fill();

  // Secondary crisp white/gold pinstripe
  ctx.fillStyle = livery.accentColor;
  ctx.beginPath();
  ctx.moveTo(0, 286);
  ctx.bezierCurveTo(280, 330, 620, 188, 1024, 248);
  ctx.lineTo(1024, 263);
  ctx.bezierCurveTo(620, 203, 280, 345, 0, 301);
  ctx.closePath();
  ctx.fill();

  // Lower skirt dark metallic band + reflective conspicuity tape
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(0, 430, 1024, 82);
  for (let x = 20; x < 1000; x += 64) {
    ctx.fillStyle = x % 128 === 20 ? '#facc15' : '#ef4444';
    ctx.fillRect(x, 445, 42, 10);
  }

  // Fleet branding typography with subtle drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 8;
  ctx.font = 'bold 52px "Teko", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(livery.name.toUpperCase(), 525, 165);

  ctx.font = 'bold 28px "Noto Sans Tamil", sans-serif';
  ctx.fillStyle = secondaryHex;
  ctx.fillText(livery.tagline, 525, 215);
  ctx.shadowBlur = 0;

  // Commercial Tamil Nadu registration badge on body side
  ctx.fillStyle = '#09090b';
  ctx.fillRect(64, 130, 178, 52);
  ctx.strokeStyle = secondaryHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(64, 130, 178, 52);
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(regText.slice(0, 13), 153, 165);

  // Sheet-metal panel seams & louver vents
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.lineWidth = 2;
  for (let px = 128; px < 1024; px += 128) {
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, 512);
    ctx.stroke();
  }

  // Rear engine radiator air louvers
  ctx.fillStyle = '#111827';
  for (let ly = 320; ly < 420; ly += 14) {
    ctx.fillRect(36, ly, 78, 7);
  }

  // Matching Bump Map for sheet metal seams & rivets
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 1024;
  bumpCanvas.height = 512;
  const bctx = bumpCanvas.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 1024, 512);
  bctx.strokeStyle = '#303030';
  bctx.lineWidth = 3;
  for (let px = 128; px < 1024; px += 128) {
    bctx.beginPath();
    bctx.moveTo(px, 0);
    bctx.lineTo(px, 512);
    bctx.stroke();
    // Rivets
    bctx.fillStyle = '#c0c0c0';
    for (let ry = 24; ry < 490; ry += 48) {
      bctx.fillRect(px - 6, ry, 3, 3);
      bctx.fillRect(px + 3, ry, 3, 3);
    }
  }
  bctx.fillStyle = '#202020';
  for (let ly = 320; ly < 420; ly += 14) {
    bctx.fillRect(36, ly, 78, 7);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.anisotropy = anisotropy;

  return { map, bumpMap };
}

export interface LiveCockpitMetrics {
  speedKmh: number;
  rpm: number;
  fuelPct: number;
  engineTempC: number;
  gear: string;
  leftInd: boolean;
  rightInd: boolean;
  highBeam: boolean;
  parkingBrake: boolean;
  blinkOn: boolean;
}

export function createLiveDashboardController(): {
  texture: THREE.CanvasTexture;
  update: (m: LiveCockpitMetrics) => void;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const drawGauge = (
    cx: number,
    cy: number,
    r: number,
    color: string,
    label: string,
    valNorm: number,
    digitalText: string
  ) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#090d16';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    const startA = Math.PI * 0.75;
    const endA = Math.PI * 2.25;
    for (let i = 0; i <= 10; i++) {
      const a = startA + ((endA - startA) * i) / 10;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 11), cy + Math.sin(a) * (r - 11));
      ctx.lineTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
      ctx.strokeStyle = i >= 8 ? '#ef4444' : color;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // Active sweep needle
    const clamped = Math.max(0, Math.min(1, valNorm));
    const needleA = startA + (endA - startA) * clamped;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleA) * (r - 12), cy + Math.sin(needleA) * (r - 12));
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(digitalText, cx, cy + 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(label, cx, cy + 38);
  };

  const update = (m: LiveCockpitMetrics) => {
    ctx.fillStyle = '#111317';
    ctx.fillRect(0, 0, 512, 192);

    ctx.fillStyle = '#05070a';
    ctx.fillRect(14, 14, 344, 164);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, 344, 164);

    // Speedometer (0..120 km/h)
    drawGauge(80, 96, 52, '#34d399', 'KM/H', m.speedKmh / 110, String(Math.round(m.speedKmh)));
    // RPM Dial (600..2600)
    drawGauge(202, 96, 52, '#fbbf24', 'RPM', (m.rpm - 600) / 2000, String(Math.round(m.rpm)));

    // Center Gear & Tell-Tale Strip
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(272, 24, 76, 144);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(272, 24, 76, 144);

    // Gear Indicator
    ctx.fillStyle = m.gear === 'R' ? '#fb7185' : m.gear === 'N' ? '#94a3b8' : '#34d399';
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(m.gear, 310, 62);

    // Fuel Gauge bar
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`FUEL ${Math.round(m.fuelPct)}%`, 278, 84);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(278, 88, 64, 8);
    ctx.fillStyle = m.fuelPct < 20 ? '#ef4444' : '#38bdf8';
    ctx.fillRect(278, 88, Math.max(2, (64 * Math.max(0, Math.min(100, m.fuelPct))) / 100), 8);

    // Temp Gauge bar
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`TEMP ${Math.round(m.engineTempC)}C`, 278, 114);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(278, 118, 64, 8);
    const tempNorm = Math.max(0, Math.min(1, (m.engineTempC - 60) / 55));
    ctx.fillStyle = m.engineTempC > 99 ? '#ef4444' : '#f59e0b';
    ctx.fillRect(278, 118, Math.max(4, 64 * tempNorm), 8);

    // Turn & Status Icons
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = m.leftInd && m.blinkOn ? '#10b981' : '#334155';
    ctx.fillText('◀', 284, 152);
    ctx.fillStyle = m.highBeam ? '#38bdf8' : '#334155';
    ctx.fillText('≡D', 303, 152);
    ctx.fillStyle = m.parkingBrake ? '#ef4444' : '#334155';
    ctx.fillText('(P)', 322, 152);
    ctx.fillStyle = m.rightInd && m.blinkOn ? '#10b981' : '#334155';
    ctx.fillText('▶', 340, 152);

    // Right AC Vents & Switch Panel
    for (let vx = 374; vx < 495; vx += 38) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(vx, 28, 30, 44);
      ctx.fillStyle = '#0f172a';
      for (let vy = 34; vy < 68; vy += 8) ctx.fillRect(vx + 3, vy, 24, 3);
    }
    const switchColors = ['#10b981', '#f59e0b', '#ef4444', '#38bdf8'];
    switchColors.forEach((sc, i) => {
      ctx.fillStyle = sc;
      ctx.fillRect(374 + i * 32, 102, 20, 30);
    });

    tex.needsUpdate = true;
  };

  update({
    speedKmh: 0,
    rpm: 680,
    fuelPct: 92,
    engineTempC: 82,
    gear: 'N',
    leftInd: false,
    rightInd: false,
    highBeam: false,
    parkingBrake: false,
    blinkOn: false,
  });

  return { texture: tex, update };
}

export function createDashboardTexture(): THREE.CanvasTexture {
  return createLiveDashboardController().texture;
}

export function createSkyDomeTexture(
  timeOfDay: TimeOfDayId,
  weather: WeatherId
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 256);

  if (weather === 'rain') {
    if (timeOfDay === 'night') {
      grad.addColorStop(0, '#02040a');
      grad.addColorStop(0.55, '#0b1220');
      grad.addColorStop(1, '#162032');
    } else {
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.5, '#334155');
      grad.addColorStop(1, '#475569');
    }
  } else if (weather === 'fog') {
    if (timeOfDay === 'night') {
      grad.addColorStop(0, '#0b1320');
      grad.addColorStop(0.55, '#1e293b');
      grad.addColorStop(1, '#334155');
    } else {
      grad.addColorStop(0, '#94a3b8');
      grad.addColorStop(0.55, '#cbd5e1');
      grad.addColorStop(1, '#e2e8f0');
    }
  } else if (weather === 'cloudy') {
    if (timeOfDay === 'night') {
      grad.addColorStop(0, '#050812');
      grad.addColorStop(0.55, '#111827');
      grad.addColorStop(1, '#1e293b');
    } else if (timeOfDay === 'sunset') {
      grad.addColorStop(0, '#3b3252');
      grad.addColorStop(0.55, '#64546b');
      grad.addColorStop(1, '#9a7b78');
    } else {
      grad.addColorStop(0, '#475569');
      grad.addColorStop(0.55, '#64748b');
      grad.addColorStop(1, '#94a3b8');
    }
  } else {
    if (timeOfDay === 'night') {
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.55, '#0f172a');
      grad.addColorStop(1, '#1e293b');
    } else if (timeOfDay === 'sunset') {
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.35, '#9a3412');
      grad.addColorStop(0.65, '#f97316');
      grad.addColorStop(1, '#fed7aa');
    } else {
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.45, '#38bdf8');
      grad.addColorStop(0.8, '#bae6fd');
      grad.addColorStop(1, '#e0f2fe');
    }
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  if (timeOfDay === 'night' && weather !== 'rain' && weather !== 'fog') {
    for (let i = 0; i < 180; i++) {
      const sx = Math.random() * 512;
      const sy = Math.random() * 125;
      const alpha = 0.25 + Math.random() * 0.7;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(sx, sy, 1.3, 1.3);
    }
  }

  const cloudCount = weather === 'rain' ? 45 : weather === 'cloudy' ? 38 : weather === 'fog' ? 28 : 16;
  for (let i = 0; i < cloudCount; i++) {
    const cx = Math.random() * 512;
    const cy = 30 + Math.random() * 100;
    const rx = 25 + Math.random() * 55;
    const ry = 6 + Math.random() * 14;
    ctx.fillStyle =
      weather === 'rain'
        ? 'rgba(15, 23, 42, 0.45)'
        : weather === 'fog'
        ? 'rgba(226, 232, 240, 0.35)'
        : timeOfDay === 'night'
        ? 'rgba(30, 41, 59, 0.3)'
        : timeOfDay === 'sunset'
        ? 'rgba(254, 215, 170, 0.25)'
        : 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
