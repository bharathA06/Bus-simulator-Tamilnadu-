import { ROAD_NETWORK, BusStop } from './constants';

export type SignalLight = 'green' | 'amber' | 'red';
export type ManeuverType = 'straight' | 'left' | 'right' | 'uturn' | 'arrive';

export interface RoadWaypoint {
  x: number;
  z: number;
}

export interface RouteDirectionStep {
  maneuver: ManeuverType;
  instruction: string;
  roadName: string;
  distanceMeters: number;
  speedLimitKmh: number;
}

export interface DetailedRoutePlan {
  totalDistanceMeters: number;
  estimatedSeconds: number;
  waypoints: RoadWaypoint[];
  steps: RouteDirectionStep[];
}

export interface NavigationAdvice {
  maneuver: ManeuverType;
  distanceMeters: number;
  totalDistanceMeters: number;
  estimatedArrivalSec: number;
  nextRoadName: string;
  waypoints: RoadWaypoint[];
  isWrongWay: boolean;
  upcomingSignal: SignalLight | null;
  upcomingSignalDistance: number;
}

export interface IntersectionSignalState {
  ns: SignalLight;
  ew: SignalLight;
  cycleTime: number;
}

export const ROAD_NAMES_VERTICAL: Record<number, string> = {
  [-240]: 'Nilgiri Ghat & Pollachi Hwy (NH-181)',
  [-80]: 'Coimbatore – Salem NH-544',
  [80]: 'Erode – Trichy – Madurai Hwy',
  [240]: 'Chennai ECR – Rameswaram Trunk',
};

export const ROAD_NAMES_HORIZONTAL: Record<number, string> = {
  [-280]: 'Northern Express NH-48 (Chennai–Salem–Ooty)',
  [-100]: 'Kongu Industrial Corridor (MTP–Kovai–Erode)',
  [100]: 'Cauvery – Madurai Heritage Hwy',
  [280]: 'Southern Coastal Hwy (Pollachi–Kanyakumari)',
};

export function getZoneSpeedLimit(x: number, z: number): number {
  if (x < -190 && z < -115) return 45; // Nilgiri Mountain Ghat speed limit
  if (
    (Math.abs(x - -80) < 35 && Math.abs(z - -155) < 40) || // Gandhipuram
    (Math.abs(x - 240) < 45 && Math.abs(z - -225) < 45) || // Chennai CMBT
    (Math.abs(x - 80) < 45 && Math.abs(z - 220) < 45) || // Madurai Periyar
    (Math.abs(x - 80) < 40 && Math.abs(z - 45) < 35) // Trichy Central
  ) {
    return 60; // Urban Terminal zone
  }
  return 80; // Open Tamil Nadu 4-Lane Highway (80 km/h limit)
}

const SIGNAL_CYCLE_SEC = 18;

/**
 * Deterministic 4-way traffic signal phase shared across 3D visuals, AI traffic, and violation enforcement.
 */
export function getSignalState(ix: number, iz: number, timeSec: number): IntersectionSignalState {
  const ixIdx = ROAD_NETWORK.verticalX.indexOf(ix);
  const izIdx = ROAD_NETWORK.horizontalZ.indexOf(iz);
  const offset = (ixIdx >= 0 ? ixIdx : 0) * 3.4 + (izIdx >= 0 ? izIdx : 0) * 5.7;
  const t = ((timeSec + offset) % SIGNAL_CYCLE_SEC + SIGNAL_CYCLE_SEC) % SIGNAL_CYCLE_SEC;

  if (t < 7.0) {
    return { ns: 'green', ew: 'red', cycleTime: t };
  }
  if (t < 9.0) {
    return { ns: 'amber', ew: 'red', cycleTime: t };
  }
  if (t < 16.0) {
    return { ns: 'red', ew: 'green', cycleTime: t };
  }
  return { ns: 'red', ew: 'amber', cycleTime: t };
}

/**
 * Checks whether coordinates fall inside an intersection box or a mid-block U-turn bay opening.
 */
export function isMedianGap(x: number, z: number): boolean {
  for (const ix of ROAD_NETWORK.verticalX) {
    for (const iz of ROAD_NETWORK.horizontalZ) {
      if (Math.abs(x - ix) < 12.5 && Math.abs(z - iz) < 12.5) return true;
    }
  }
  // Mid-block U-turn openings on vertical roads
  for (const ix of ROAD_NETWORK.verticalX) {
    if (Math.abs(x - ix) < 10) {
      for (const uz of ROAD_NETWORK.uturnBaysVerticalZ) {
        if (Math.abs(z - uz) < 6.5) return true;
      }
    }
  }
  // Mid-block U-turn openings on horizontal roads
  for (const iz of ROAD_NETWORK.horizontalZ) {
    if (Math.abs(z - iz) < 10) {
      for (const ux of ROAD_NETWORK.uturnBaysHorizontalX) {
        if (Math.abs(x - ux) < 6.5) return true;
      }
    }
  }
  return false;
}

/**
 * Detects if the bus is driving against Indian Left-Hand Traffic (LHT) lane flow.
 */
export function checkWrongWay(x: number, z: number, heading: number, speedKmh: number): boolean {
  if (speedKmh < 7) return false;
  if (isMedianGap(x, z)) return false;

  const fx = Math.sin(heading);
  const fz = Math.cos(heading);

  // Check nearest vertical road
  for (const rx of ROAD_NETWORK.verticalX) {
    const dx = x - rx;
    if (Math.abs(dx) <= 10.2 && Math.abs(dx) >= 1.1) {
      // +X side must drive South (+Z); -X side must drive North (-Z)
      if (dx > 1.1 && fz < -0.42) return true;
      if (dx < -1.1 && fz > 0.42) return true;
      return false;
    }
  }

  // Check nearest horizontal road
  for (const rz of ROAD_NETWORK.horizontalZ) {
    const dz = z - rz;
    if (Math.abs(dz) <= 10.2 && Math.abs(dz) >= 1.1) {
      // -Z side must drive East (+X); +Z side must drive West (-X)
      if (dz < -1.1 && fx < -0.42) return true;
      if (dz > 1.1 && fx > 0.42) return true;
      return false;
    }
  }

  return false;
}

interface GraphNode {
  id: string;
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  roadName: string;
  edges: Array<{ to: string; cost: number; maneuverHint?: ManeuverType }>;
}

/**
 * Directed LHT Road-Lane Graph covering all Coimbatore boulevards, intersections, and U-turn bays.
 */
class NavigationGraph {
  private nodes: Map<string, GraphNode> = new Map();

  constructor() {
    this.buildGraph();
  }

  private addNode(node: Omit<GraphNode, 'edges'>) {
    this.nodes.set(node.id, { ...node, edges: [] });
  }

  private addEdge(fromId: string, toId: string, penalty: number = 0, maneuverHint?: ManeuverType) {
    const a = this.nodes.get(fromId);
    const b = this.nodes.get(toId);
    if (!a || !b) return;
    const dist = Math.hypot(b.x - a.x, b.z - a.z) + penalty;
    a.edges.push({ to: toId, cost: dist, maneuverHint });
  }

  private buildGraph() {
    const off = ROAD_NETWORK.laneOffset; // 5.2m LHT kerb lane offset
    const vXs = ROAD_NETWORK.verticalX; // [-100, 0, 100]
    const hZs = ROAD_NETWORK.horizontalZ; // [-120, -30, 80]

    // Create directional nodes around every intersection (ix, iz) and along U-turn bays
    for (let xi = 0; xi < vXs.length; xi++) {
      const ix = vXs[xi];
      const vName = ROAD_NAMES_VERTICAL[ix] || 'City Avenue';
      for (let zi = 0; zi < hZs.length; zi++) {
        const iz = hZs[zi];
        const hName = ROAD_NAMES_HORIZONTAL[iz] || 'Cross Road';

        // 4 Approach nodes (entering intersection) & 4 Exit nodes (leaving intersection)
        // Southbound (+Z): lane x = ix + off
        this.addNode({ id: `app_S_${xi}_${zi}`, x: ix + off, z: iz - 11, dirX: 0, dirZ: 1, roadName: vName });
        this.addNode({ id: `ext_S_${xi}_${zi}`, x: ix + off, z: iz + 11, dirX: 0, dirZ: 1, roadName: vName });

        // Northbound (-Z): lane x = ix - off
        this.addNode({ id: `app_N_${xi}_${zi}`, x: ix - off, z: iz + 11, dirX: 0, dirZ: -1, roadName: vName });
        this.addNode({ id: `ext_N_${xi}_${zi}`, x: ix - off, z: iz - 11, dirX: 0, dirZ: -1, roadName: vName });

        // Eastbound (+X): lane z = iz - off
        this.addNode({ id: `app_E_${xi}_${zi}`, x: ix - 11, z: iz - off, dirX: 1, dirZ: 0, roadName: hName });
        this.addNode({ id: `ext_E_${xi}_${zi}`, x: ix + 11, z: iz - off, dirX: 1, dirZ: 0, roadName: hName });

        // Westbound (-X): lane z = iz + off
        this.addNode({ id: `app_W_${xi}_${zi}`, x: ix + 11, z: iz + off, dirX: -1, dirZ: 0, roadName: hName });
        this.addNode({ id: `ext_W_${xi}_${zi}`, x: ix - 11, z: iz + off, dirX: -1, dirZ: 0, roadName: hName });

        // Connect legal maneuvers inside intersection (ix, iz)
        // From Southbound (+Z): Straight->S, Left->E, Right->W, Uturn->N
        this.addEdge(`app_S_${xi}_${zi}`, `ext_S_${xi}_${zi}`, 0, 'straight');
        this.addEdge(`app_S_${xi}_${zi}`, `ext_E_${xi}_${zi}`, 4, 'left');
        this.addEdge(`app_S_${xi}_${zi}`, `ext_W_${xi}_${zi}`, 7, 'right');
        this.addEdge(`app_S_${xi}_${zi}`, `ext_N_${xi}_${zi}`, 14, 'uturn');

        // From Northbound (-Z): Straight->N, Left->W, Right->E, Uturn->S
        this.addEdge(`app_N_${xi}_${zi}`, `ext_N_${xi}_${zi}`, 0, 'straight');
        this.addEdge(`app_N_${xi}_${zi}`, `ext_W_${xi}_${zi}`, 4, 'left');
        this.addEdge(`app_N_${xi}_${zi}`, `ext_E_${xi}_${zi}`, 7, 'right');
        this.addEdge(`app_N_${xi}_${zi}`, `ext_S_${xi}_${zi}`, 14, 'uturn');

        // From Eastbound (+X): Straight->E, Left->N, Right->S, Uturn->W
        this.addEdge(`app_E_${xi}_${zi}`, `ext_E_${xi}_${zi}`, 0, 'straight');
        this.addEdge(`app_E_${xi}_${zi}`, `ext_N_${xi}_${zi}`, 4, 'left');
        this.addEdge(`app_E_${xi}_${zi}`, `ext_S_${xi}_${zi}`, 7, 'right');
        this.addEdge(`app_E_${xi}_${zi}`, `ext_W_${xi}_${zi}`, 14, 'uturn');

        // From Westbound (-X): Straight->W, Left->S, Right->N, Uturn->E
        this.addEdge(`app_W_${xi}_${zi}`, `ext_W_${xi}_${zi}`, 0, 'straight');
        this.addEdge(`app_W_${xi}_${zi}`, `ext_S_${xi}_${zi}`, 4, 'left');
        this.addEdge(`app_W_${xi}_${zi}`, `ext_N_${xi}_${zi}`, 7, 'right');
        this.addEdge(`app_W_${xi}_${zi}`, `ext_E_${xi}_${zi}`, 14, 'uturn');
      }
    }

    // Connect vertical road links & mid-block U-turn bays between adjacent intersections
    for (let xi = 0; xi < vXs.length; xi++) {
      const ix = vXs[xi];
      const vName = ROAD_NAMES_VERTICAL[ix] || 'City Avenue';

      // Outer north & south road extensions (with end U-turn loops)
      const nEndZ = ROAD_NETWORK.minZ + 22;
      const sEndZ = ROAD_NETWORK.maxZ - 22;
      this.addNode({ id: `end_N_in_${xi}`, x: ix - off, z: nEndZ, dirX: 0, dirZ: -1, roadName: vName });
      this.addNode({ id: `end_N_out_${xi}`, x: ix + off, z: nEndZ, dirX: 0, dirZ: 1, roadName: vName });
      this.addEdge(`ext_N_${xi}_0`, `end_N_in_${xi}`, 0, 'straight');
      this.addEdge(`end_N_in_${xi}`, `end_N_out_${xi}`, 8, 'uturn');
      this.addEdge(`end_N_out_${xi}`, `app_S_${xi}_0`, 0, 'straight');

      this.addNode({ id: `end_S_in_${xi}`, x: ix + off, z: sEndZ, dirX: 0, dirZ: 1, roadName: vName });
      this.addNode({ id: `end_S_out_${xi}`, x: ix - off, z: sEndZ, dirX: 0, dirZ: -1, roadName: vName });
      this.addEdge(`ext_S_${xi}_${hZs.length - 1}`, `end_S_in_${xi}`, 0, 'straight');
      this.addEdge(`end_S_in_${xi}`, `end_S_out_${xi}`, 8, 'uturn');
      this.addEdge(`end_S_out_${xi}`, `app_N_${xi}_${hZs.length - 1}`, 0, 'straight');

      // Mid-block U-turn bays between Z intersections
      for (let zi = 0; zi < hZs.length - 1; zi++) {
        const uz = ROAD_NETWORK.uturnBaysVerticalZ[zi];
        if (uz !== undefined) {
          this.addNode({ id: `ut_V_S_${xi}_${zi}`, x: ix + off, z: uz, dirX: 0, dirZ: 1, roadName: vName });
          this.addNode({ id: `ut_V_N_${xi}_${zi}`, x: ix - off, z: uz, dirX: 0, dirZ: -1, roadName: vName });

          this.addEdge(`ext_S_${xi}_${zi}`, `ut_V_S_${xi}_${zi}`, 0, 'straight');
          this.addEdge(`ut_V_S_${xi}_${zi}`, `app_S_${xi}_${zi + 1}`, 0, 'straight');
          this.addEdge(`ut_V_S_${xi}_${zi}`, `ut_V_N_${xi}_${zi}`, 9, 'uturn');

          this.addEdge(`ext_N_${xi}_${zi + 1}`, `ut_V_N_${xi}_${zi}`, 0, 'straight');
          this.addEdge(`ut_V_N_${xi}_${zi}`, `app_N_${xi}_${zi}`, 0, 'straight');
          this.addEdge(`ut_V_N_${xi}_${zi}`, `ut_V_S_${xi}_${zi}`, 9, 'uturn');
        } else {
          this.addEdge(`ext_S_${xi}_${zi}`, `app_S_${xi}_${zi + 1}`, 0, 'straight');
          this.addEdge(`ext_N_${xi}_${zi + 1}`, `app_N_${xi}_${zi}`, 0, 'straight');
        }
      }
    }

    // Connect horizontal road links & mid-block U-turn bays
    for (let zi = 0; zi < hZs.length; zi++) {
      const iz = hZs[zi];
      const hName = ROAD_NAMES_HORIZONTAL[iz] || 'Cross Road';

      // West & East outer road extensions
      const wEndX = ROAD_NETWORK.minX + 22;
      const eEndX = ROAD_NETWORK.maxX - 22;
      this.addNode({ id: `end_W_in_${zi}`, x: wEndX, z: iz + off, dirX: -1, dirZ: 0, roadName: hName });
      this.addNode({ id: `end_W_out_${zi}`, x: wEndX, z: iz - off, dirX: 1, dirZ: 0, roadName: hName });
      this.addEdge(`ext_W_0_${zi}`, `end_W_in_${zi}`, 0, 'straight');
      this.addEdge(`end_W_in_${zi}`, `end_W_out_${zi}`, 8, 'uturn');
      this.addEdge(`end_W_out_${zi}`, `app_E_0_${zi}`, 0, 'straight');

      this.addNode({ id: `end_E_in_${zi}`, x: eEndX, z: iz - off, dirX: 1, dirZ: 0, roadName: hName });
      this.addNode({ id: `end_E_out_${zi}`, x: eEndX, z: iz + off, dirX: -1, dirZ: 0, roadName: hName });
      this.addEdge(`ext_E_${vXs.length - 1}_${zi}`, `end_E_in_${zi}`, 0, 'straight');
      this.addEdge(`end_E_in_${zi}`, `end_E_out_${zi}`, 8, 'uturn');
      this.addEdge(`end_E_out_${zi}`, `app_W_${vXs.length - 1}_${zi}`, 0, 'straight');

      for (let xi = 0; xi < vXs.length - 1; xi++) {
        const ux = ROAD_NETWORK.uturnBaysHorizontalX[xi];
        if (ux !== undefined) {
          this.addNode({ id: `ut_H_E_${xi}_${zi}`, x: ux, z: iz - off, dirX: 1, dirZ: 0, roadName: hName });
          this.addNode({ id: `ut_H_W_${xi}_${zi}`, x: ux, z: iz + off, dirX: -1, dirZ: 0, roadName: hName });

          this.addEdge(`ext_E_${xi}_${zi}`, `ut_H_E_${xi}_${zi}`, 0, 'straight');
          this.addEdge(`ut_H_E_${xi}_${zi}`, `app_E_${xi + 1}_${zi}`, 0, 'straight');
          this.addEdge(`ut_H_E_${xi}_${zi}`, `ut_H_W_${xi}_${zi}`, 9, 'uturn');

          this.addEdge(`ext_W_${xi + 1}_${zi}`, `ut_H_W_${xi}_${zi}`, 0, 'straight');
          this.addEdge(`ut_H_W_${xi}_${zi}`, `app_W_${xi}_${zi}`, 0, 'straight');
          this.addEdge(`ut_H_W_${xi}_${zi}`, `ut_H_E_${xi}_${zi}`, 9, 'uturn');
        } else {
          this.addEdge(`ext_E_${xi}_${zi}`, `app_E_${xi + 1}_${zi}`, 0, 'straight');
          this.addEdge(`ext_W_${xi + 1}_${zi}`, `app_W_${xi}_${zi}`, 0, 'straight');
        }
      }
    }
  }

  public computeAdvice(
    busX: number,
    busZ: number,
    busHeading: number,
    targetStop: BusStop,
    timeSec: number
  ): NavigationAdvice {
    const fx = Math.sin(busHeading);
    const fz = Math.cos(busHeading);
    const stopDist = Math.hypot(targetStop.x - busX, targetStop.z - busZ);

    // Find closest ahead graph node matching bus direction
    let startNode: GraphNode | null = null;
    let bestStartScore = Infinity;

    for (const node of this.nodes.values()) {
      const dx = node.x - busX;
      const dz = node.z - busZ;
      const dist = Math.hypot(dx, dz);
      const forwardDot = dist > 0.5 ? (dx * fx + dz * fz) / dist : 1;
      const dirDot = node.dirX * fx + node.dirZ * fz;

      // Prefer nodes generally ahead and aligned with current lane direction
      if (dirDot > 0.35 && forwardDot > -0.25) {
        const score = dist + (forwardDot < 0.2 ? 30 : 0);
        if (score < bestStartScore) {
          bestStartScore = score;
          startNode = node;
        }
      }
    }

    // Fallback to nearest node if off-road or sideways
    if (!startNode) {
      for (const node of this.nodes.values()) {
        const dist = Math.hypot(node.x - busX, node.z - busZ);
        if (dist < bestStartScore) {
          bestStartScore = dist;
          startNode = node;
        }
      }
    }

    // Find closest node aligned with targetStop arrival heading (preferring nodes BEFORE stop)
    const sx = Math.sin(targetStop.idealHeading);
    const sz = Math.cos(targetStop.idealHeading);
    let goalNode: GraphNode | null = null;
    let bestGoalScore = Infinity;

    for (const node of this.nodes.values()) {
      const dirDot = node.dirX * sx + node.dirZ * sz;
      if (dirDot > 0.6) {
        const dx = targetStop.x - node.x;
        const dz = targetStop.z - node.z;
        const aheadOfGoal = dx * sx + dz * sz;
        if (aheadOfGoal >= 0) {
          const dist = Math.hypot(dx, dz);
          if (dist < bestGoalScore) {
            bestGoalScore = dist;
            goalNode = node;
          }
        }
      }
    }

    // Fallback if no node strictly before stop
    if (!goalNode) {
      for (const node of this.nodes.values()) {
        const dirDot = node.dirX * sx + node.dirZ * sz;
        if (dirDot > 0.6) {
          const dist = Math.hypot(targetStop.x - node.x, targetStop.z - node.z);
          if (dist < bestGoalScore) {
            bestGoalScore = dist;
            goalNode = node;
          }
        }
      }
    }

    // Check upcoming traffic signal ahead along bus heading
    let upcomingSignal: SignalLight | null = null;
    let bestRawSigDist = 999;
    for (const ix of ROAD_NETWORK.verticalX) {
      for (const iz of ROAD_NETWORK.horizontalZ) {
        const dx = ix - busX;
        const dz = iz - busZ;
        const dist = Math.hypot(dx, dz);
        if (dist > 10 && dist < 90) {
          const forwardDot = (dx * fx + dz * fz) / dist;
          const lateralDist = Math.abs(dx * fz - dz * fx);
          if (forwardDot > 0.85 && lateralDist < 9.5 && dist < bestRawSigDist) {
            const sig = getSignalState(ix, iz, timeSec);
            upcomingSignal = Math.abs(fz) > Math.abs(fx) ? sig.ns : sig.ew;
            bestRawSigDist = dist;
          }
        }
      }
    }
    const upcomingSignalDistance = bestRawSigDist < 999 ? Math.max(0, Math.round(bestRawSigDist - 10)) : 999;

    const waypoints: RoadWaypoint[] = [{ x: busX, z: busZ }];

    // If bus is already on the same final stretch as targetStop and facing it
    const toStopX = targetStop.x - busX;
    const toStopZ = targetStop.z - busZ;
    const alignedWithStop = stopDist > 0.1 ? (toStopX * sx + toStopZ * sz) / stopDist : 1;
    const headingMatchStop = fx * sx + fz * sz;
    if (stopDist < 52 && alignedWithStop > 0.82 && headingMatchStop > 0.65) {
      waypoints.push({ x: targetStop.x, z: targetStop.z });
      return {
        maneuver: 'arrive',
        distanceMeters: Math.round(stopDist),
        totalDistanceMeters: Math.round(stopDist),
        estimatedArrivalSec: Math.max(3, Math.round(stopDist / 10)),
        nextRoadName: targetStop.nameEn,
        waypoints,
        isWrongWay: false,
        upcomingSignal,
        upcomingSignalDistance: Math.max(0, upcomingSignalDistance),
      };
    }

    if (!startNode || !goalNode) {
      waypoints.push({ x: targetStop.x, z: targetStop.z });
      return {
        maneuver: 'straight',
        distanceMeters: Math.round(stopDist),
        totalDistanceMeters: Math.round(stopDist),
        estimatedArrivalSec: Math.max(5, Math.round(stopDist / 11)),
        nextRoadName: targetStop.nameEn,
        waypoints,
        isWrongWay: false,
        upcomingSignal,
        upcomingSignalDistance: Math.max(0, upcomingSignalDistance),
      };
    }

    // Dijkstra shortest path from startNode to goalNode
    const distMap = new Map<string, number>();
    const prevMap = new Map<string, { nodeId: string; hint?: ManeuverType }>();
    const unvisited = new Set<string>(this.nodes.keys());

    distMap.set(startNode.id, 0);

    while (unvisited.size > 0) {
      let currentId: string | null = null;
      let minDist = Infinity;
      for (const id of unvisited) {
        const d = distMap.get(id) ?? Infinity;
        if (d < minDist) {
          minDist = d;
          currentId = id;
        }
      }

      if (!currentId || minDist === Infinity || currentId === goalNode.id) break;
      unvisited.delete(currentId);

      const currentNode = this.nodes.get(currentId);
      if (!currentNode) continue;

      for (const edge of currentNode.edges) {
        if (!unvisited.has(edge.to)) continue;
        const alt = minDist + edge.cost;
        if (alt < (distMap.get(edge.to) ?? Infinity)) {
          distMap.set(edge.to, alt);
          prevMap.set(edge.to, { nodeId: currentId, hint: edge.maneuverHint });
        }
      }
    }

    // Reconstruct path
    const pathIds: string[] = [];
    const hints: Array<ManeuverType | undefined> = [];
    let curr: string | undefined = goalNode.id;
    while (curr) {
      pathIds.unshift(curr);
      const prev = prevMap.get(curr);
      if (prev) {
        hints.unshift(prev.hint);
        curr = prev.nodeId;
      } else {
        curr = undefined;
      }
    }

    for (let i = 0; i < pathIds.length; i++) {
      const n = this.nodes.get(pathIds[i]);
      if (!n) continue;
      waypoints.push({ x: n.x, z: n.z });
      const hint = hints[i];
      const nextNode = i + 1 < pathIds.length ? this.nodes.get(pathIds[i + 1]) : undefined;
      if (nextNode && (hint === 'left' || hint === 'right')) {
        const cornerX = n.dirX === 0 ? n.x : nextNode.x;
        const cornerZ = n.dirZ === 0 ? n.z : nextNode.z;
        waypoints.push({
          x: (n.x + 2 * cornerX + nextNode.x) / 4,
          z: (n.z + 2 * cornerZ + nextNode.z) / 4,
        });
      } else if (nextNode && hint === 'uturn') {
        waypoints.push({
          x: (n.x + nextNode.x) / 2 + n.dirX * 5.5,
          z: (n.z + nextNode.z) / 2 + n.dirZ * 5.5,
        });
      }
    }
    waypoints.push({ x: targetStop.x, z: targetStop.z });

    // Determine next non-straight maneuver ahead
    let nextManeuver: ManeuverType = 'arrive';
    let maneuverDist = stopDist;
    let nextRoadName = targetStop.nameEn;

    for (let i = 0; i < hints.length; i++) {
      const h = hints[i];
      if (h === 'left' || h === 'right' || h === 'uturn') {
        const nodeAtTurn = this.nodes.get(pathIds[i]);
        const targetNode = this.nodes.get(pathIds[i + 1]);
        if (nodeAtTurn) {
          nextManeuver = h;
          maneuverDist = Math.hypot(nodeAtTurn.x - busX, nodeAtTurn.z - busZ);
          nextRoadName = targetNode ? targetNode.roadName : nodeAtTurn.roadName;
          break;
        }
      }
    }

    let totalPathDist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalPathDist += Math.hypot(waypoints[i + 1].x - waypoints[i].x, waypoints[i + 1].z - waypoints[i].z);
    }

    return {
      maneuver: nextManeuver,
      distanceMeters: Math.round(maneuverDist),
      totalDistanceMeters: Math.round(totalPathDist),
      estimatedArrivalSec: Math.max(5, Math.round(totalPathDist / 11.2)),
      nextRoadName,
      waypoints,
      isWrongWay: false,
      upcomingSignal,
      upcomingSignalDistance: Math.max(0, upcomingSignalDistance),
    };
  }

  /**
   * Generates a complete ETS-style Route Planner breakdown (waypoints, exact distance, ETA, speed limits, left/right/U-turns)
   * for any user-selected start stop -> optional intermediates -> destination stop.
   */
  public computeMultiStopPlan(stopSequence: BusStop[]): DetailedRoutePlan {
    if (stopSequence.length === 0) {
      return { totalDistanceMeters: 0, estimatedSeconds: 0, waypoints: [], steps: [] };
    }
    if (stopSequence.length === 1) {
      const only = stopSequence[0];
      return {
        totalDistanceMeters: 0,
        estimatedSeconds: 0,
        waypoints: [{ x: only.x, z: only.z }],
        steps: [
          {
            maneuver: 'arrive',
            instruction: `Explore Coimbatore starting from ${only.nameEn}`,
            roadName: only.landmark,
            distanceMeters: 0,
            speedLimitKmh: 60,
          },
        ],
      };
    }

    const allWaypoints: RoadWaypoint[] = [{ x: stopSequence[0].x, z: stopSequence[0].z }];
    const steps: RouteDirectionStep[] = [];
    let totalDistanceMeters = 0;

    for (let sIdx = 0; sIdx < stopSequence.length - 1; sIdx++) {
      const origin = stopSequence[sIdx];
      const dest = stopSequence[sIdx + 1];
      const seg = this.computeLegDetailed(origin, dest);
      totalDistanceMeters += seg.legDistanceMeters;
      for (let w = 1; w < seg.waypoints.length; w++) {
        allWaypoints.push(seg.waypoints[w]);
      }
      steps.push(...seg.steps);
    }

    // Avg city bus operating speed (~42 km/h = 11.6 m/s) + 12s per stop dwell & signal delay
    const estimatedSeconds = Math.round(totalDistanceMeters / 11.6) + (stopSequence.length - 1) * 14;

    return {
      totalDistanceMeters: Math.round(totalDistanceMeters),
      estimatedSeconds,
      waypoints: allWaypoints,
      steps,
    };
  }

  private computeLegDetailed(
    origin: BusStop,
    dest: BusStop
  ): { legDistanceMeters: number; waypoints: RoadWaypoint[]; steps: RouteDirectionStep[] } {
    const advice = this.computeAdvice(origin.x, origin.z, origin.idealHeading, dest, 0);
    const fx = Math.sin(origin.idealHeading);
    const fz = Math.cos(origin.idealHeading);

    // Build readable step-by-step instructions by inspecting direction shifts along advice.waypoints
    const wps = advice.waypoints;
    let legDistanceMeters = 0;
    for (let i = 0; i < wps.length - 1; i++) {
      legDistanceMeters += Math.hypot(wps[i + 1].x - wps[i].x, wps[i + 1].z - wps[i].z);
    }

    const steps: RouteDirectionStep[] = [];
    let prevDirX = fx;
    let prevDirZ = fz;
    let accumDist = 0;

    const getRoadNameAt = (px: number, pz: number): string => {
      for (const vx of ROAD_NETWORK.verticalX) {
        if (Math.abs(px - vx) < 11) return ROAD_NAMES_VERTICAL[vx] || 'Coimbatore Main Rd';
      }
      for (const hz of ROAD_NETWORK.horizontalZ) {
        if (Math.abs(pz - hz) < 11) return ROAD_NAMES_HORIZONTAL[hz] || 'Coimbatore Boulevard';
      }
      return dest.nameEn;
    };

    for (let i = 0; i < wps.length - 1; i++) {
      const dx = wps[i + 1].x - wps[i].x;
      const dz = wps[i + 1].z - wps[i].z;
      const segLen = Math.hypot(dx, dz);
      if (segLen < 1.5) continue;

      const nx = dx / segLen;
      const nz = dz / segLen;
      const dot = prevDirX * nx + prevDirZ * nz;
      const cross = prevDirX * nz - prevDirZ * nx; // Note: +Z/+X right-handed Y-up check
      // In our world heading (+Z=0, +X=+pi/2): Turning left increases heading (positive delta angle);
      // sin(theta) = dirX, cos(theta) = dirZ => cross(prev, next) = prevX*nextZ - prevZ*nextX:
      // from +Z (0,1) to +X (1,0): 0*0 - 1*1 = -1 -> LEFT turn; to -X (-1,0): 0*0 - 1*(-1) = +1 -> RIGHT turn!

      if (dot < -0.55) {
        if (accumDist > 5) {
          steps.push({
            maneuver: 'straight',
            instruction: `Drive along ${getRoadNameAt(wps[i].x, wps[i].z)}`,
            roadName: getRoadNameAt(wps[i].x, wps[i].z),
            distanceMeters: Math.round(accumDist),
            speedLimitKmh: 60,
          });
          accumDist = 0;
        }
        steps.push({
          maneuver: 'uturn',
          instruction: `Make U-Turn via median bay onto ${getRoadNameAt(wps[i + 1].x, wps[i + 1].z)}`,
          roadName: getRoadNameAt(wps[i + 1].x, wps[i + 1].z),
          distanceMeters: Math.round(segLen),
          speedLimitKmh: 30,
        });
      } else if (dot < 0.45 && Math.abs(cross) > 0.35) {
        if (accumDist > 5) {
          steps.push({
            maneuver: 'straight',
            instruction: `Continue straight along ${getRoadNameAt(wps[i].x, wps[i].z)}`,
            roadName: getRoadNameAt(wps[i].x, wps[i].z),
            distanceMeters: Math.round(accumDist),
            speedLimitKmh: 60,
          });
          accumDist = 0;
        }
        const turn: ManeuverType = cross < 0 ? 'left' : 'right';
        const roadName = getRoadNameAt(wps[i + 1].x, wps[i + 1].z);
        steps.push({
          maneuver: turn,
          instruction: turn === 'left' ? `Turn Left onto ${roadName}` : `Turn Right onto ${roadName}`,
          roadName,
          distanceMeters: Math.round(segLen),
          speedLimitKmh: 40,
        });
      } else {
        accumDist += segLen;
      }

      prevDirX = nx;
      prevDirZ = nz;
    }

    if (accumDist > 5) {
      steps.push({
        maneuver: 'straight',
        instruction: `Stay left & approach ${dest.nameEn}`,
        roadName: dest.nameEn,
        distanceMeters: Math.round(accumDist),
        speedLimitKmh: 50,
      });
    }

    steps.push({
      maneuver: 'arrive',
      instruction: `Pull into Kerb Bus Bay: ${dest.nameEn}`,
      roadName: dest.nameTa,
      distanceMeters: Math.round(dest.radius),
      speedLimitKmh: 20,
    });

    return { legDistanceMeters, waypoints: wps, steps };
  }
}

export const navigationGraph = new NavigationGraph();
