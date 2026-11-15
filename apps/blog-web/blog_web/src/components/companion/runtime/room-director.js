import { Vector3 } from 'three';
import { RoomNavigation } from './motion/room-navigation.js';
import { approachPath } from './motion/platform-approach.js';
import { groundSections } from './motion/ground-route.js';
import { steeringPath, pathHeadings } from './motion/steering-path.js';
import { COMPANION_MOTIONS } from './motion/motions.js';

export const DEFAULT_SETTINGS = Object.freeze({
  idleInterval: 24, approachInterval: 240, clickWindow: 1500, clickCooldown: 8000,
  transition: .65, actionDuration: 6, walkSpeed: 1, autonomous: true, furQuality: 'high',
});
const ranges = {
  idleInterval: [5, 300], approachInterval: [10, 600], clickWindow: [300, 5000],
  clickCooldown: [1000, 60000], transition: [.2, 2], actionDuration: [2, 20], walkSpeed: [.5, 2],
};
export function validateSettings(input = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...input };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (!Number.isFinite(settings[key]) || settings[key] < min || settings[key] > max)
      throw new RangeError(key + ' 超出允许范围');
  }
  if (typeof settings.autonomous !== 'boolean') throw new TypeError('自主行为设置无效');
  if (!['high', 'medium', 'low'].includes(settings.furQuality)) throw new RangeError('毛发细节设置无效');
  return Object.freeze(settings);
}

// Displacement and frame counts from the source tabby's walk, trot and run at 30 fps.
const GAITS = {
  walk: { stride: .35, duration: 20 / 30 },
  trot: { stride: .40, duration: 12 / 30 },
  gallop: { stride: 2 * 16 / 30, duration: 16 / 30 },
};
const motionDefs = new Map(COMPANION_MOTIONS.map(m => [m.id, m]));
const angleDiff = (to, from) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = t => t * t * (3 - 2 * t);
const vector = p => new Vector3(p.x, 0, p.z);
const heading = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const holdFor = { standing: 'idle', sitting: 'sitHold', lying: 'lieHold' };
const restful = new Set(['sleep','lie','idle']);

export class RoomDirector {
  constructor({ settings, onChange = () => {}, onInteract = () => {}, random = Math.random, supports = () => true, gaits = GAITS, navigation } = {}) {
    this.settings = validateSettings(settings);
    this.onChange = onChange;
    this.onInteract = onInteract;
    this.random = random;
    this.supports = supports;
    for (const id of Object.keys(GAITS)) {
      if (!(gaits[id]?.stride > 0 && Number.isFinite(gaits[id].stride) && gaits[id].duration > 0 && Number.isFinite(gaits[id].duration))) throw new RangeError('无效的步幅或步频');
    }
    this.gaits = gaits;
    this.room = navigation || new RoomNavigation();
    this.surfaces = this.room.surfaces;
    this.position = new Vector3(0, 0, .61);
    this.yaw = 0;
    this.surface = this.support = 'ground';
    this.motion = 'idle';
    this.stage = 'holding';
    this.posture = 'standing';
    this.visible = true;
    this.paused = this.destroyed = this.sleeping = false;
    this.mode = 'room';
    this.clock = this.phase = this.speed = this.holdTime = 0;
    this.progress = 1;
    this.lastClick = -Infinity;
    this.cooldownUntil = this.clickCount = 0;
    this.serial = 0;
    this.queue = [];
    this.deferAutonomy();
  }

  get state() {
    return {
      position: this.position.toArray(), yaw: this.yaw, heading: this.yaw, speed: this.speed,
      motion: this.motion, stage: this.stage, phase: this.phase, progress: this.progress,
      posture: this.posture, surface: this.surface, support: this.support,
      mode: this.mode, visible: this.visible, paused: this.paused, moving: this.speed > .001 || this.stage === 'flight',
      currentCommand: this.receipt?.id ?? null, settings: this.settings,
    };
  }

  // Context changes never keep an airborne pose or replay a partially issued
  // command. Preserve the landing surface, rather than dropping a table cat.
  safeLocation() {
    const landing = this.support === null && this.step?.kind === 'leap' ? this.step : null;
    return {
      position: (landing ? landing.point : this.position).toArray(),
      surface: landing ? landing.surface : this.surface,
      yaw: landing ? landing.heading : this.yaw,
      posture: this.posture,
    };
  }
  restoreLocation({ position, surface = 'ground', yaw = 0, posture = 'standing' }) {
    if (this.destroyed) return;
    this.finish('cancelled', '陪伴场景已切换');
    this.queue = []; this.pending = this.step = null;
    this.position.fromArray(position); this.surface = this.support = surface;
    this.yaw = yaw; this.posture = posture;
    this.sleeping = this.mode === 'reading' && posture === 'lying';
    this.motion = this.sleeping ? 'sleep' : holdFor[posture] || 'idle';
    this.stage = 'holding'; this.speed = this.phase = this.holdTime = 0; this.progress = 1;
    this.resetClicks(); this.deferAutonomy(); this.emit();
  }

  emit() { this.onChange(this.state); }
  configure(update) {
    this.settings = validateSettings({ ...this.settings, ...update });
    this.deferAutonomy();
    this.emit();
    return this.settings;
  }
  deferAutonomy() {
    this.nextIdle = this.clock + this.settings.idleInterval;
    this.nextApproach = this.clock + this.settings.approachInterval;
  }
  resetClicks(){this.clickCount=0;this.lastClick=-Infinity;}
  setPaused(value) { if(Boolean(value)!==this.paused)this.resetClicks();this.paused = Boolean(value); this.emit(); }
  pause(value = true) { this.setPaused(value); }
  setVisible(value) { if(Boolean(value)!==this.visible)this.resetClicks();this.visible = Boolean(value); this.emit(); }
  setMode(value) {
    if (value !== 'reading' && value !== 'room') throw new RangeError('未知陪伴模式');
    if (value === this.mode) return;
    this.mode = value;
    this.lastClick = -Infinity;
    this.clickCount = 0;
    const result=this.requestPose(value === 'reading' ? this.readingPose() : 'idle', { system: true });
    this.emit();
    return result;
  }
  readingPose() { return this.supports('sleep')&&this.supports('lie')?'sleep':'sit'; }

  finish(status, reason) {
    if (!this.receipt) return;
    const { resolve, id, commandId } = this.receipt;
    this.receipt = null;
    resolve({ id, commandId, status, ...(reason ? { reason } : {}) });
  }
  blocked(id, reason) {
    return Promise.resolve({ id, commandId: 'gray-' + ++this.serial, status: 'blocked', reason });
  }
  command(id, build, { system = false, automatic = false } = {}) {
    if (this.destroyed) return this.blocked(id, '这次陪伴已经结束');
    if (!system && (!this.visible || this.paused)) return this.blocked(id, '小灰已隐藏或暂停');
    if (!system && this.mode === 'reading' && !restful.has(id) && id!==this.readingPose()) return this.blocked(id, '小灰正在安静陪读');
    this.finish('cancelled');
    this.queue = [];
    this.nextIdle = this.clock + this.settings.idleInterval;
    if (!automatic) this.nextApproach = this.clock + this.settings.approachInterval;
    const result = new Promise(resolve => { this.receipt = { id, commandId: 'gray-' + ++this.serial, resolve }; });
    // A queued replacement starts from the actual landing/settled pose, even if
    // it arrives just after lift-off or halfway into a sitting transition.
    this.pending = build;
    if (this.step?.kind !== 'leap' && this.step?.kind !== 'posture') this.startPending();
    return result;
  }
  startPending() {
    const build = this.pending;
    this.pending = null;
    try {
      const { steps, sleep = false } = build();
      this.queue = steps;
      this.sleeping = sleep;
      this.next();
    } catch (error) {
      this.finish('blocked', error.message);
      this.queue = [];
      this.next();
    }
  }

  poseSteps(target) {
    if (target === this.posture) return [];
    const steps = [];
    if (this.posture !== 'standing')
      steps.push(this.poseStep(this.posture === 'sitting' ? 'sitUp' : 'lieUp', 'standing'));
    if (target !== 'standing') steps.push(this.poseStep(target === 'sitting' ? 'sit' : 'lie', target));
    return steps;
  }
  poseStep(id, posture) {
    return { kind: 'posture', id, posture, duration: motionDefs.get(id).duration * this.settings.transition / .65 };
  }
  requestPose(id, options) {
    return this.command(id, () => {
      const target = id==='sit' ? 'sitting' : ['lie','sleep'].includes(id) ? 'lying' : 'standing';
      const steps = this.poseSteps(target);
      if (!['idle','sit','lie','sleep','sitUp','lieUp'].includes(id)) {
        if (id === 'turn') steps.push({ kind: 'turn', id, angle: this.yaw + Math.PI, duration: 1.2 });
        else steps.push({ kind: 'gesture', id, duration: motionDefs.get(id).duration * this.settings.actionDuration / 6 });
      }
      return { steps, sleep: id === 'sleep' };
    }, options);
  }
  play(id) {
    if (id === 'run') id = 'gallop';
    if (!motionDefs.has(id)) return this.blocked(id, '没有这个动作');
    if (!this.supports(id)) return this.blocked(id,'这个动作的原作画面尚未就绪');
    if (id === 'jump') return this.visit('jump', [this.surface === 'ground' ? 'chair' : this.surface === 'chair' ? 'table' : 'ground']);
    if (GAITS[id]) return this.move(id, { x: this.position.x > .02 ? -1.16 : 1.16, z: .77 });
    if (this.mode === 'reading' && id === 'idle') return this.requestPose(this.readingPose());
    return this.requestPose(id);
  }
  walkTo(p, trot = false) { return this.move(trot ? 'trot' : 'walk', p); }
  runTo(p) { return this.move('gallop', p); }
  move(id, p, options) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) return this.blocked(id, '地面坐标无效');
    const destination = this.room.clampFloor(vector(p));
    return this.command(id, () => {
      const plan = this.platformPlan(['ground']);
      this.appendMove(plan, destination, id);
      return { steps: [...this.poseSteps('standing'), ...plan.steps] };
    }, options);
  }
  jumpTo(surface) { return this.visit('jumpTo', [surface]); }
  explore() { return this.visit('explore', ['chair','table','ground']); }
  visit(id, surfaces, options) {
    if (surfaces.some(s => !this.surfaces.some(x => x.id === s))) return this.blocked(id, '未知落脚区域');
    return this.command(id, () => ({
      steps: [...this.poseSteps('standing'), ...this.platformPlan(surfaces).steps],
    }), options);
  }

  appendPath(plan, id, points) {
    const path = points.filter((p, i) => p.distanceTo(i ? points[i - 1] : plan.at) > .000001);
    if (!path.length) return;
    const headings = pathHeadings(plan.at, path, plan.yaw);
    const pointsWithStart = [plan.at, ...path], lengths = [0];
    for (let i = 1; i < pointsWithStart.length; i++)
      lengths.push(lengths[i-1] + pointsWithStart[i].distanceTo(pointsWithStart[i-1]));
    plan.steps.push({ kind: 'move', id, points: pointsWithStart, headings, lengths, length: lengths.at(-1) });
    plan.at = path.at(-1);
    plan.yaw = headings.at(-1);
  }
  appendMove(plan, target, id, finalYaw) {
    const floor = this.room.floorPath(plan.at, target);
    const goal = floor.at(-1);
    if (plan.at.distanceTo(goal) < .002) return;
    const aligned = Number.isFinite(finalYaw) && approachPath(plan.at, plan.yaw, goal, finalYaw, this.room);
    const steered = aligned || steeringPath(plan.at, plan.yaw, goal, this.room, id)?.path;
    if (steered?.length) this.appendPath(plan, id, steered);
    else {
      for (const path of groundSections(plan.at, floor, this.room)) this.appendPath(plan, id, path);
    }
  }
  platformPlan(surfaces) {
    const plan = { steps: [], at: this.position.clone(), yaw: this.yaw };
    let surface = this.surface;
    for (const target of surfaces) {
      for (const next of this.room.route(surface, target)) {
        const { takeoff, landing } = this.room.jumpSites(plan.at, surface, next);
        const direction = heading(takeoff, landing);
        if (surface === 'ground')
          this.appendMove(plan, takeoff, plan.at.distanceTo(takeoff) > .7 && this.supports('trot') ? 'trot' : 'walk', direction);
        const leap = this.room.leap(plan.at, landing, next);
        plan.steps.push({ ...leap, startYaw: plan.yaw, duration: leap.preparation + leap.flight + leap.landing });
        plan.at = landing;
        plan.yaw = direction;
        surface = next;
      }
    }
    return plan;
  }

  pet() {
    if (this.destroyed || !this.visible || this.paused) return null;
    this.deferAutonomy();
    if (this.mode === 'reading') return this.interact({ type: 'rest-touch', level: 0, count: 0 });
    if (this.clock < this.cooldownUntil) return this.interact({ type: 'cooldown', level: 4, count: 0 });
    const withinWindow = (this.clock - this.lastClick) * 1000 <= this.settings.clickWindow;
    this.clickCount = withinWindow ? this.clickCount + 1 : 1;
    this.lastClick = this.clock;
    const count = this.clickCount, action = ['look','tail','nuzzle','paw'][count - 1];
    this.play(action);
    const event = this.interact({ type: 'pet', level: count, count, action, discovery: count === 4 ? 'friendly-paw' : null });
    if (count === 4) {
      this.cooldownUntil = this.clock + this.settings.clickCooldown / 1000;
      this.clickCount = 0;
      this.interact({ type: 'discovery', eggId: 'friendly-paw', occurrenceId: globalThis.crypto.randomUUID() });
    }
    return event;
  }
  interact(event) { this.onInteract(event); return event; }

  next() {
    const prior = this.step;
    this.step = this.queue.shift();
    const s = this.step;
    this.progress = 0;
    this.speed = 0;
    if (!s) {
      this.stage = 'holding';
      this.motion = this.sleeping ? 'sleep' : holdFor[this.posture];
      this.progress = 1;
      this.phase = this.holdTime = 0;
      this.nextIdle = this.clock + this.settings.idleInterval;
      this.finish('succeeded');
    } else {
      s.elapsed = 0;
      this.stage = s.kind === 'leap' ? 'preparation' : s.kind;
      if (s.kind === 'move') {
        s.offset = prior?.kind === 'move' && prior.id === s.id ? this.phase : 0;
        s.segment = 0;
        s.cruise = this.gaits[s.id].stride / this.gaits[s.id].duration;
        s.ramp = Math.min(this.settings.transition * .4, s.length / s.cruise);
        s.duration = s.length / s.cruise + s.ramp;
      }
      if (s.kind === 'turn') s.startYaw = this.yaw;
      this.motion = s.id;
      this.phase = s.offset || 0;
    }
    this.emit();
  }
  moveFrame(s) {
    const t = s.elapsed, left = s.duration - t, ramp = s.ramp;
    const distance = t < ramp ? s.cruise * t*t / (2*ramp)
      : left < ramp ? s.length - s.cruise * left*left / (2*ramp)
      : s.cruise * (t - ramp/2);
    this.speed = s.cruise * this.settings.walkSpeed * Math.min(1, t/ramp, left/ramp);
    while (s.segment < s.points.length - 2 && s.lengths[s.segment+1] < distance) s.segment++;
    const i = s.segment;
    const fraction = clamp((distance - s.lengths[i]) / (s.lengths[i+1] - s.lengths[i]), 0, 1);
    this.position.copy(s.points[i]).lerp(s.points[i+1], fraction);
    this.yaw = s.headings[i] + angleDiff(s.headings[i+1], s.headings[i]) * fraction;
    this.phase = (s.offset + distance / this.gaits[s.id].stride) % 1;
  }
  leapFrame(s) {
    const t = s.elapsed - s.preparation;
    this.yaw = s.startYaw + angleDiff(s.heading, s.startYaw) * smooth(clamp(s.elapsed / s.preparation, 0, 1));
    if (t <= 0) {
      this.stage = 'preparation';
      this.phase = .26 * s.elapsed / s.preparation;
    } else if (t < s.flight) {
      this.stage = 'flight';
      this.support = null;
      this.position.copy(this.room.leapPoint(s, t / s.flight));
      this.phase = .26 + .50 * t / s.flight;
    } else {
      this.stage = 'landing';
      this.support = this.surface = s.surface;
      this.position.copy(s.point);
      this.phase = .76 + .24 * (t - s.flight) / s.landing;
    }
  }
  autonomy() {
    if (!this.settings.autonomous || this.mode !== 'room') return;
    if (this.clock >= this.nextApproach) {
      this.nextApproach = this.clock + this.settings.approachInterval;
      this.interact({ type: 'approach' });
      this.move('walk', { x: .04, z: .90 }, { automatic: true });
    } else if (this.clock >= this.nextIdle) {
      const options = this.posture === 'standing' ? ['look','sniff','tail','stretch','sit','yawn']
        : this.posture === 'sitting' ? ['look','tail','groom','lie'] : ['look','yawn','knead'];
      if (this.random() < .23) {
        const next = this.surface === 'ground' ? 'chair' : this.surface === 'chair' ? 'table' : 'ground';
        this.visit('jump', [next], { automatic: true });
      } else {
        const available=options.filter(id=>this.supports(id));
        this.requestPose(available[Math.floor(this.random()*available.length)]||'idle', { automatic: true });
      }
    }
  }

  advance(dt) {
    let left = dt;
    this.clock += dt;
    while (left > 1e-9) {
      const s = this.step;
      if (!s) {
        this.holdTime += left;
        this.phase = (this.holdTime / 4) % 1;
        this.autonomy();
        break;
      }
      const scale = s.kind === 'move' ? this.settings.walkSpeed : 1;
      const consumed = Math.min(left, (s.duration - s.elapsed) / scale);
      s.elapsed = Math.min(s.duration, s.elapsed + consumed * scale);
      this.progress = s.elapsed / s.duration;
      this.phase = this.progress;
      if (s.kind === 'move') this.moveFrame(s);
      if (s.kind === 'leap') this.leapFrame(s);
      if (s.kind === 'turn') this.yaw = s.startYaw + angleDiff(s.angle, s.startYaw) * smooth(this.progress);
      left -= consumed;
      if (s.elapsed + 1e-9 < s.duration) break;
      if (s.kind === 'posture') this.posture = s.posture;
      if (this.pending) this.startPending();
      else this.next();
    }
    return this.state;
  }
  update(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('帧时间无效');
    return this.destroyed || !this.visible || this.paused ? this.state : this.advance(dt);
  }
  stepFrame(seconds = 1/60) {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > .1) throw new RangeError('单帧时长应在 0 到 0.1 秒之间');
    if (this.destroyed || !this.visible || !this.paused) return false;
    this.advance(seconds);
    return true;
  }
  destroy() {
    this.destroyed = true;
    this.queue = [];
    this.pending = this.step = null;
    this.finish('cancelled');
  }
}
