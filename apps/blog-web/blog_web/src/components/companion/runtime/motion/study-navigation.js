import { Vector3 } from 'three';
import { RoomNavigation } from './room-navigation.js';

// Coordinates below describe room-scene.ts. Convert exactly once: the room
// stage scales the unmodified cat and its navigation root together.
export const STUDY_CAT_SCALE = 1.35;
export const GROUND_Y = .06;
const local = (x, y, z) => new Vector3(x / STUDY_CAT_SCALE, (y - GROUND_Y) / STUDY_CAT_SCALE, z / STUDY_CAT_SCALE);
const floorPoint = (x, z) => Object.freeze({ x: x / STUDY_CAT_SCALE, y: 0, z: z / STUDY_CAT_SCALE });
const vector = p => new Vector3(p.x, p.y ?? 0, p.z);
export const STUDY_SPAWN = floorPoint(.30, .15);
export const STUDY_USER_POINT = floorPoint(.36, .28);
export const STUDY_WANDER_POINTS = Object.freeze([
  STUDY_SPAWN, floorPoint(1.25, .10), floorPoint(.40, .28),
  floorPoint(-2.35, .15), floorPoint(-2.35, -.85),
]);

// The first version uses the connected foreground circulation area. It does
// not send the cat behind the desk/window seat or underneath furniture.
const worldFloor = { minX: -3.55, maxX: 2.98, minZ: -2.15, maxZ: 2.70 };
const bounds = b => Object.freeze(Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v / STUDY_CAT_SCALE])));
const CHAIR = { x: -1.1, z: .74, angle: -.4 };
function chairWorld(x, z, y = .535) {
  const c = Math.cos(CHAIR.angle), s = Math.sin(CHAIR.angle);
  return local(CHAIR.x + c * x + s * z, y, CHAIR.z - s * x + c * z);
}
// Keep clear of the diary's complete drag envelope (including its -.29 yaw),
// not only its initial position. Approach slightly from the right of this pad.
const tablePad = local(-1.35, 1, -.88);
const chairPad = chairWorld(0, -.20);
const pads = { chair: chairPad, table: tablePad };
const approaches = { chair: chairWorld(0, -.85, GROUND_Y), table: local(-1.25, GROUND_Y, -.18) };

export const STUDY_SURFACES = Object.freeze([
  Object.freeze({ id: 'ground', label: '地面', height: 0, center: { x: STUDY_SPAWN.x, z: STUDY_SPAWN.z }, bounds: bounds(worldFloor) }),
  Object.freeze({ id: 'chair', label: '椅子', height: chairPad.y,
    center: { x: chairPad.x, z: chairPad.z }, bounds: bounds({ minX: -1.60, maxX: -.60, minZ: .24, maxZ: 1.24 }) }),
  Object.freeze({ id: 'table', label: '书桌', height: tablePad.y,
    center: { x: tablePad.x, z: tablePad.z }, bounds: bounds({ minX: -1.73, maxX: 1.97, minZ: -2.26, maxZ: -.54 }) }),
]);

function obstacle(id, x, z, width, depth, angle = 0) {
  return Object.freeze({ id, x: x / STUDY_CAT_SCALE, z: z / STUDY_CAT_SCALE,
    halfX: width / (2 * STUDY_CAT_SCALE), halfZ: depth / (2 * STUDY_CAT_SCALE), angle });
}
export const STUDY_OBSTACLES = Object.freeze([
  obstacle('desk', .12, -1.4, 3.7, 1.72),
  // Include arms, rear throw and backrest, not only the smaller seat cushion.
  obstacle('chair', CHAIR.x, CHAIR.z + .015, 1.00, 1.03, CHAIR.angle),
  obstacle('north-bookcase', -2.85, -2.795, 2.14, .81),
  obstacle('west-bookcase', -3.59, -.35, .80, 2.28),
  obstacle('window-seat', 2.60, -1.4, 1.13, 3.38),
]);
// Radius covers the body/paws while turning; extra space is reserved at walls.
export const STUDY_FLOOR_CLEARANCE = .20;
const WALL_CLEARANCE = .16;
const GRID_STEP = .09;
const EPS = 1e-8;
function inObstacleSpace(p, box) {
  const dx = p.x - box.x, dz = p.z - box.z, c = Math.cos(box.angle), s = Math.sin(box.angle);
  return { x: c * dx - s * dz, z: s * dx + c * dz };
}
function intersects(a, b, box, margin) {
  const p = inObstacleSpace(a, box), q = inObstacleSpace(b, box);
  let enter = 0, exit = 1;
  for (const [axis, half] of [['x', box.halfX + margin], ['z', box.halfZ + margin]]) {
    const d = q[axis] - p[axis];
    if (Math.abs(d) < EPS) { if (Math.abs(p[axis]) > half + EPS) return false; }
    else {
      const first = (-half - p[axis]) / d, last = (half - p[axis]) / d;
      enter = Math.max(enter, Math.min(first, last)); exit = Math.min(exit, Math.max(first, last));
      if (enter > exit + EPS) return false;
    }
  }
  return exit >= 0 && enter <= 1;
}

export class StudyNavigation extends RoomNavigation {
  constructor() {
    super();
    this.surfaces = STUDY_SURFACES;
    this.obstacles = STUDY_OBSTACLES;
    this.launch = approaches.chair.clone();
    this.spawn = vector(STUDY_SPAWN);
    this.userPoint = vector(STUDY_USER_POINT);
    this.wanderPoints = STUDY_WANDER_POINTS.map(vector);
    this.grid = null;
  }

  floorValid(p) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) return false;
    const b = this.surface('ground').bounds;
    return p.x >= b.minX + WALL_CLEARANCE && p.x <= b.maxX - WALL_CLEARANCE &&
      p.z >= b.minZ + WALL_CLEARANCE && p.z <= b.maxZ - WALL_CLEARANCE &&
      !this.obstacles.some(box => intersects(p, p, box, STUDY_FLOOR_CLEARANCE));
  }

  segmentClear(a, b) {
    return this.floorValid(a) && this.floorValid(b) &&
      !this.obstacles.some(box => intersects(a, b, box, STUDY_FLOOR_CLEARANCE));
  }

  floorGrid() {
    if (this.grid) return this.grid;
    const b = this.surface('ground').bounds, nodes = [], map = new Map();
    for (let x = 0; b.minX + x * GRID_STEP <= b.maxX; x++) {
      for (let z = 0; b.minZ + z * GRID_STEP <= b.maxZ; z++) {
        const p = new Vector3(b.minX + x * GRID_STEP, 0, b.minZ + z * GRID_STEP);
        if (this.floorValid(p)) { const n = { key: x + ':' + z, x, z, p, neighbors: [] }; nodes.push(n); map.set(n.key, n); }
      }
    }
    for (const node of nodes) for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) {
      if (!dx && !dz) continue;
      const next = map.get((node.x + dx) + ':' + (node.z + dz));
      if (next && this.segmentClear(node.p, next.p)) node.neighbors.push(next);
    }
    // Keep only nodes reachable from the birth area. A click in an isolated
    // corner must not create an apparently valid but unreachable destination.
    const seed = nodes.reduce((best, n) => !best || n.p.distanceToSquared(this.spawn) < best.p.distanceToSquared(this.spawn) ? n : best, null);
    const reachable = new Set(seed ? [seed] : []), queue = seed ? [seed] : [];
    for (let i = 0; i < queue.length; i++) for (const next of queue[i].neighbors) {
      if (!reachable.has(next)) { reachable.add(next); queue.push(next); }
    }
    this.grid = { nodes: nodes.filter(n => reachable.has(n)) };
    return this.grid;
  }

  nearestNode(p, visible = false) {
    let best = null, distance = Infinity;
    for (const node of this.floorGrid().nodes) {
      const d = node.p.distanceToSquared(p);
      if (d < distance && (!visible || this.segmentClear(p, node.p))) { best = node; distance = d; }
    }
    if (!best) throw new Error('该位置暂时无法绕行到达');
    return best;
  }

  clampFloor(p) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) throw new RangeError('地面坐标无效');
    const at = new Vector3(p.x, 0, p.z), node = this.nearestNode(at);
    return this.segmentClear(at, node.p) ? at : node.p.clone();
  }

  floorPath(start, target) {
    if (!this.floorValid(start)) throw new Error('起点不在可行走地面');
    const destination = this.clampFloor(target);
    if (this.segmentClear(start, destination)) return [destination];
    const from = this.nearestNode(start, true), goal = this.nearestNode(destination, true);
    const open = new Set([from]), costs = new Map([[from, 0]]), came = new Map();
    while (open.size) {
      let current = null, score = Infinity;
      for (const n of open) { const s = costs.get(n) + n.p.distanceTo(goal.p); if (s < score) { current = n; score = s; } }
      if (current === goal) break;
      open.delete(current);
      for (const next of current.neighbors) {
        const cost = costs.get(current) + current.p.distanceTo(next.p);
        if (cost < (costs.get(next) ?? Infinity)) { costs.set(next, cost); came.set(next, current); open.add(next); }
      }
    }
    if (from !== goal && !came.has(goal)) throw new Error('该位置暂时无法绕行到达');
    const raw = [destination];
    for (let n = goal; n; n = came.get(n)) raw.unshift(n.p.clone());
    const path = []; let anchor = vector(start);
    while (raw.length) {
      let last = raw.length - 1;
      while (last >= 0 && !this.segmentClear(anchor, raw[last])) last--;
      if (last < 0) throw new Error('地面路径不连续');
      anchor = raw[last]; if (anchor.distanceTo(path.at(-1) ?? start) > EPS) path.push(anchor);
      raw.splice(0, last + 1);
    }
    return path.length ? path : [destination];
  }

  route(source, target) {
    this.surface(source); this.surface(target);
    if (source === target) return [];
    if (source === 'ground' || target === 'ground') return [target];
    return ['ground', target];
  }

  landing(id) { return id === 'ground' ? this.spawn.clone() : vector(this.surface(id).center).setY(this.surface(id).height); }

  jumpSites(from, source, target) {
    this.surface(source); this.surface(target);
    if (source === 'ground' && pads[target]) return { takeoff: approaches[target].clone(), landing: pads[target].clone() };
    if (target === 'ground' && pads[source]) return { takeoff: from.clone(), landing: approaches[source].clone() };
    throw new Error('家具之间需要先回到地面');
  }

  leap(from, to, id) {
    const step = super.leap(from, to, id);
    // The taller real desk needs more clearance than the standalone dollhouse.
    // In a drop, keep the trailing pads above the board until they clear it.
    const drop = to.y < from.y;
    const clearance = drop ? (from.y > .5 ? .27 : .16) : id === 'table' ? .35 : .20;
    const gravity = 9.8 / STUDY_CAT_SCALE, apex = Math.max(from.y, to.y) + clearance;
    const rise = Math.sqrt(2 * (apex - from.y) / gravity), fall = Math.sqrt(2 * (apex - to.y) / gravity);
    return { ...step, flight: rise + fall, verticalVelocity: gravity * rise, gravity };
  }
}

export function createStudyNavigation() { return new StudyNavigation(); }
