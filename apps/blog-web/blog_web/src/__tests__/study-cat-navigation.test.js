// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { RoomDirector } from '../components/companion/runtime/room-director.js';
import {
  createStudyNavigation, STUDY_CAT_SCALE, GROUND_Y,
  STUDY_SPAWN, STUDY_USER_POINT, STUDY_WANDER_POINTS,
} from '../components/companion/runtime/motion/study-navigation.js';

const v = p => new Vector3(p.x, p.y ?? 0, p.z);
const world = p => p.clone().multiplyScalar(STUDY_CAT_SCALE).add(new Vector3(0, GROUND_Y, 0));
const local = (x, z) => new Vector3(x / STUDY_CAT_SCALE, 0, z / STUDY_CAT_SCALE);
function assertPath(nav, start, target) {
  const path = nav.floorPath(start, target);
  expect(path.length).toBeGreaterThan(0);
  let from = start;
  for (const to of path) {
    expect(to.toArray().every(Number.isFinite)).toBe(true);
    expect(nav.segmentClear(from, to)).toBe(true);
    // Independently sample the entire chord, including ends, to catch corner
    // shortcuts across a rotated chair or an offset room-stage transform.
    const samples = Math.max(1, Math.ceil(from.distanceTo(to) / .015));
    for (let i = 0; i <= samples; i++) expect(nav.floorValid(from.clone().lerp(to, i / samples))).toBe(true);
    from = to;
  }
  expect(from.distanceTo(nav.clampFloor(target))).toBeLessThan(1e-7);
  return path;
}

function makeDirector() {
  const nav = createStudyNavigation();
  const director = new RoomDirector({ navigation: nav, settings: { autonomous: false },
    gaits: { walk: { stride: .19, duration: .72 }, trot: { stride: .265, duration: .46 }, gallop: { stride: .44, duration: .36 } } });
  director.position.copy(v(STUDY_SPAWN));
  return director;
}

async function finishMotion(director, receipt, inspect = () => {}) {
  let result;
  receipt.then(value => { result = value; });
  for (let i = 0; i < 9000 && !result; i++) {
    const previous = director.position.clone(), before = director.step?.kind;
    const state = director.update(1 / 60);
    expect([...state.position, state.yaw, state.phase, state.progress].every(Number.isFinite)).toBe(true);
    expect(previous.distanceTo(director.position)).toBeLessThan(.11);
    if (before === 'move') expect(director.room.floorValid(director.position)).toBe(true);
    inspect(state);
    // Completed receipts resolve asynchronously; do not keep advancing into
    // an unrelated idle period once the command actually settled.
    if (!director.receipt) await Promise.resolve();
  }
  expect(result?.status).toBe('succeeded');
  return result;
}

describe('the website room navigation', () => {
  it('uses actual furniture heights with the stage transform applied only once', () => {
    const nav = createStudyNavigation();
    expect(world(nav.landing('chair')).y).toBeCloseTo(.535, 9);
    expect(world(nav.landing('table')).toArray()).toEqual([-1.35, 1, -.88]);
    expect(world(v(STUDY_SPAWN)).z).toBeCloseTo(.15, 9);
    for (const p of [STUDY_SPAWN, STUDY_USER_POINT, ...STUDY_WANDER_POINTS]) {
      expect(nav.floorValid(p)).toBe(true);
      expect(world(v(p)).z).toBeLessThanOrEqual(.281);
    }
  });

  it('rejects occupied floor and projects clicks onto connected safe ground', () => {
    const nav = createStudyNavigation(), start = v(STUDY_SPAWN);
    // Desk cabinet, chair/backrest, west shelves, window seat, outside walls.
    for (const [x, z] of [[1.47, -1.4], [-1.1, .74], [-3.5, 0], [2.6, -1.4], [8, 8]]) {
      const clicked = local(x, z);
      expect(nav.floorValid(clicked)).toBe(false);
      expect(nav.floorValid(nav.clampFloor(clicked))).toBe(true);
      assertPath(nav, start, clicked);
    }
    expect(nav.floorValid({ x: NaN, z: 0 })).toBe(false);
    expect(() => nav.clampFloor({ x: Infinity, z: 0 })).toThrow();
    expect(() => nav.floorPath(local(-1.1, .74), start)).toThrow(/起点/);
  });

  it('keeps floor routes continuous around the rotated chair in both directions', () => {
    const nav = createStudyNavigation();
    const destinations = [v(STUDY_SPAWN), ...STUDY_WANDER_POINTS.map(v), local(-2.3, 1.8), local(1.3, 1.6)];
    for (const start of destinations) for (const goal of destinations) assertPath(nav, start, goal);
    expect(nav.segmentClear(local(-2.3, .74), local(.4, .74))).toBe(false);
    expect(nav.floorPath(local(-2.3, .74), local(.4, .74)).length).toBeGreaterThan(1);
  });

  it('approaches the open chair front and keeps four pads clear of edges, arms and pillow', () => {
    const nav = createStudyNavigation(), site = nav.jumpSites(nav.spawn, 'ground', 'chair');
    assertPath(nav, nav.spawn, site.takeoff);
    const toChair = p => {
      const w = world(p), dx = w.x + 1.1, dz = w.z - .74;
      return { x: Math.cos(-.4) * dx - Math.sin(-.4) * dz, z: Math.sin(-.4) * dx + Math.cos(-.4) * dz };
    };
    expect(toChair(site.takeoff).z).toBeLessThan(-.75);
    const center = toChair(site.landing);
    expect(center.x).toBeCloseTo(0, 8);
    expect(center.z).toBeCloseTo(-.165, 8);
    // Measured skinned low-paw envelope of d8883406b6aa at .348 normalized
    // height, after settling idle. This includes sole radii, unlike bone anchors.
    // Apply the room stage scale once, then preserve a .025 recovery margin.
    for (const x of [-.06890, .06890]) for (const z of [-.13435, .09801]) {
      const pad = { x: center.x + x * STUDY_CAT_SCALE, z: center.z + z * STUDY_CAT_SCALE };
      expect(Math.abs(pad.x)).toBeLessThan(.375 - .025);
      expect(pad.z).toBeGreaterThan(-.375 + .025);
      expect(pad.z).toBeLessThan(.045 - .025); // pillow starts here
    }
  });

  it('keeps table landing pads on the board and away from movable diary and electronics', () => {
    const nav = createStudyNavigation(), site = nav.jumpSites(nav.spawn, 'ground', 'table');
    assertPath(nav, nav.spawn, site.takeoff);
    const center = world(site.landing), radius = .035 * STUDY_CAT_SCALE;
    const yaw = Math.atan2(site.landing.x - site.takeoff.x, site.landing.z - site.takeoff.z);
    // Include recovery and the actual approach angle, not only root origin.
    for (const [x, z] of [[.032, .101], [-.032, .101], [.058, -.071], [-.058, -.071]]) {
      const px = center.x + (Math.cos(yaw) * x + Math.sin(yaw) * z) * STUDY_CAT_SCALE;
      const pz = center.z + (-Math.sin(yaw) * x + Math.cos(yaw) * z) * STUDY_CAT_SCALE;
      expect(px - radius).toBeGreaterThan(-1.73 + .04);
      expect(px + radius).toBeLessThan(1.97 - .04);
      expect(pz - radius).toBeGreaterThan(-2.26 + .04);
      expect(pz + radius).toBeLessThan(-.54 - .04);
      // The diary's entire allowed drag envelope begins east of this strip.
      const diaryLeft = -.72 - .325 * Math.cos(.29) - .42 * Math.sin(.29);
      expect(px + radius).toBeLessThan(diaryLeft - .025);
    }
  });

  it('routes between furniture through ground and produces finite complete ballistic arcs', () => {
    const nav = createStudyNavigation();
    expect(nav.route('ground', 'table')).toEqual(['table']);
    expect(nav.route('chair', 'table')).toEqual(['ground', 'table']);
    expect(nav.route('table', 'chair')).toEqual(['ground', 'chair']);
    expect(nav.route('table', 'table')).toEqual([]);
    expect(() => nav.route('window', 'table')).toThrow();
    for (const id of ['chair', 'table']) {
      for (const [source, target, at] of [['ground', id, nav.spawn], [id, 'ground', nav.landing(id)]]) {
        const { takeoff, landing } = nav.jumpSites(at, source, target);
        const step = nav.leap(takeoff, landing, target);
        expect(nav.leapPoint(step, 0).distanceTo(takeoff)).toBeLessThan(1e-8);
        expect(nav.leapPoint(step, 1).distanceTo(landing)).toBeLessThan(1e-8);
        for (let i = 0; i <= 100; i++) {
          const p = nav.leapPoint(step, i / 100);
          expect(p.toArray().every(Number.isFinite)).toBe(true);
          expect(p.y).toBeGreaterThanOrEqual(-1e-8);
        }
        expect(nav.floorValid(target === 'ground' ? landing : takeoff)).toBe(true);
      }
    }
  });

  it('clears the desktop before leading pads enter and until trailing pads leave', () => {
    const nav = createStudyNavigation();
    for (const [source, target] of [['ground', 'table'], ['table', 'ground']]) {
      const { takeoff, landing } = nav.jumpSites(source === 'ground' ? nav.spawn : nav.landing(source), source, target);
      const step = nav.leap(takeoff, landing, target);
      for (let i = 0; i <= 200; i++) {
        const p = nav.leapPoint(step, i / 200);
        for (const [x, z] of [[.032, .101], [-.032, .101], [.058, -.071], [-.058, -.071]]) {
          const px = (p.x + Math.cos(step.heading) * x + Math.sin(step.heading) * z) * STUDY_CAT_SCALE;
          const pz = (p.z - Math.sin(step.heading) * x + Math.cos(step.heading) * z) * STUDY_CAT_SCALE;
          if (px > -1.73 && px < 1.97 && pz > -2.26 && pz < -.54) {
            expect(world(p).y).toBeGreaterThanOrEqual(1 - 1e-8);
          }
        }
      }
    }
  });

  it('completes real director walk, chair/table/ground round trip without cancellation or teleport', async () => {
    const director = makeDirector(), seen = new Set();
    await finishMotion(director, director.walkTo(local(-2.35, -.85)));
    await finishMotion(director, director.explore(), state => { if (state.support) seen.add(state.support); });
    expect([...seen]).toEqual(expect.arrayContaining(['ground', 'chair', 'table']));
    expect(director.surface).toBe('ground');
    expect(director.room.floorValid(director.position)).toBe(true);
    await finishMotion(director, director.walkTo(v(STUDY_USER_POINT)));
    expect(director.position.distanceTo(v(STUDY_USER_POINT))).toBeLessThan(1e-6);
    director.destroy();
  }, 15000);

  it('settles an airborne command before replacing it with a walk', async () => {
    const director = makeDirector();
    const interrupted = director.jumpTo('table');
    for (let i = 0; i < 5000 && director.stage !== 'flight'; i++) director.update(1 / 60);
    expect(director.stage).toBe('flight');
    const replacement = director.walkTo(v(STUDY_USER_POINT));
    expect((await interrupted).status).toBe('cancelled');
    await finishMotion(director, replacement);
    expect(director.surface).toBe('ground');
    director.destroy();
  }, 15000);
});
