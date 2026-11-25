/**
 * A state-driven GLB adapter for the existing RoomDirector. Pass a uniquely
 * owned, freshly loaded GLTF
 * scene; dispose() releases its meshes, materials, textures and skeletons.
 *
 * THREE is injected so a host and this asset always share one Three instance.
 * World translation/yaw and the jump arc belong to RoomDirector/the host.
 * Clips must be in-place; never key the outer cat.root placement group.
 */
const releasedAssets = new WeakSet();
const BLINK_INTERVALS = Object.freeze([3.8, 5.1, 4.2, 6.2]);
const RESTING_MOTIONS = new Set(['sit', 'sitHold', 'lie', 'lieHold', 'sleep']);

function createSpring(rate) {
  let angle = 0, velocity = 0;
  return {
    step(target, dt) {
      const offset = angle - target;
      const drift = velocity + rate * offset;
      const decay = Math.exp(-rate * dt);
      angle = target + (offset + drift * dt) * decay;
      velocity = (velocity - rate * drift * dt) * decay;
      return angle;
    },
    reset() { angle = velocity = 0; },
  };
}

function smoothstep(value, min, max) {
  if (value <= min) return 0;
  if (value >= max) return 1;
  const t = (value - min) / (max - min);
  return t * t * (3 - 2 * t);
}

/** Release an owned GLTF even when loading was aborted before construction. */
export function disposeWholeCatAsset(model) {
  if (!model?.isObject3D || releasedAssets.has(model)) return;
  releasedAssets.add(model);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const skeletons = new Set(), images = new Set();
  model.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.skeleton) skeletons.add(node.skeleton);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  model.removeFromParent();
  textures.forEach(texture => {
    if (texture.source?.data?.close) images.add(texture.source.data);
    texture.dispose();
  });
  images.forEach(image => image.close());
  skeletons.forEach(skeleton => skeleton.dispose());
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

const SOURCE_JUMP = Object.freeze({takeoff: .24, landing: .76});
const HOST_JUMP = Object.freeze({takeoff: .26, landing: .76});
const jumpPhase = phase => phase < HOST_JUMP.takeoff
  ? phase * SOURCE_JUMP.takeoff / HOST_JUMP.takeoff
  : phase < HOST_JUMP.landing
    ? SOURCE_JUMP.takeoff + (phase - HOST_JUMP.takeoff) *
      (SOURCE_JUMP.landing - SOURCE_JUMP.takeoff) / (HOST_JUMP.landing - HOST_JUMP.takeoff)
    : phase;

function calibratedGaits(THREE, model, mixer, clips, scale) {
  const foot = model.getObjectByName('Paw_Hind_L');
  if (!foot) return null;
  const point = new THREE.Vector3(), result = {};
  try {
    for (const id of ['walk', 'trot', 'gallop']) {
      const clip = clips.get(id);
      if (!clip) return null;
      // Complete-cycle distance is stance displacement / phase interval,
      // not the shorter backward travel during the stance fraction alone.
      const action = mixer.clipAction(clip);
      action.reset().play();action.paused = true;
      const samples = [];
      for (const phase of [.05, .15, .25]) {
        action.time = clip.duration * phase;mixer.update(0);
        model.updateWorldMatrix(true, true);
        foot.getWorldPosition(point);model.worldToLocal(point);
        samples.push(point.z);
      }
      action.stop();mixer.uncacheAction(clip);
      const stride = (samples[0] - samples[2]) / .2 * scale;
      const curvature = Math.abs(samples[1] - (samples[0] + samples[2]) * .5) * scale;
      if (!(Number.isFinite(stride) && stride > 0 && curvature < stride * .05)) return null;
      result[id] = Object.freeze({stride, duration: clip.duration});
    }
    return Object.freeze(result);
  } finally {
    mixer.stopAllAction();model.updateWorldMatrix(true, true);
  }
}

export function createWholeCatRuntime(THREE, gltf, options = {}) {
  const model = gltf?.scene;
  if (!model?.isObject3D) throw new TypeError('A loaded GLTF scene is required');
  const height = options.height ?? .348;
  if (!(height > 0 && Number.isFinite(height))) throw new RangeError('Invalid target height');
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model, true);
  const size = box.getSize(new THREE.Vector3());
  if (!(size.y > 0 && Number.isFinite(size.y))) throw new Error('The model has no measurable geometry');
  const head = model.getObjectByName('Head');
  if (!head) throw new Error('The asset must provide a Head node');
  const root = new THREE.Group();
  root.name = 'XiaohuiPlacement';
  const normalized = new THREE.Group();
  normalized.name = 'XiaohuiAssetScale';
  const scale = height / size.y;
  normalized.scale.setScalar(scale);
  // Asset authoring origin stays at the body center in X/Z. Only the floor
  // height is normalized: centering the tail would shift the navigation pivot.
  normalized.position.y = -box.min.y * scale;
  normalized.add(model);root.add(normalized);
  root.updateMatrixWorld(true);
  const speechAnchor = new THREE.Object3D();
  speechAnchor.name = 'BubbleAnchor';
  const headWorld = head.getWorldPosition(new THREE.Vector3());
  const front = box.max.z * scale;
  speechAnchor.position.copy(head.worldToLocal(new THREE.Vector3(headWorld.x, height * .88, front + height * .03)));
  head.add(speechAnchor);

  const face = new Map(), seenMorphArrays = new Set();
  const faceNames = ['blinkLeft', 'blinkRight', 'mouthOpen', 'smile'];
  const eyes = ['Eye_L', 'Eye_R'].map(name => model.getObjectByName(name)).filter(Boolean);
  const ears = ['Ear_L', 'Ear_R'].map((name, index) => {
    const node = model.getObjectByName(name);
    return node ? {node, direction: index === 0 ? 1 : -1, pitch: createSpring(21), yaw: createSpring(18)} : null;
  }).filter(Boolean);
  const chest = model.getObjectByName('Chest');
  model.traverse(node => {
    if (node.isMesh && options.configureShadows !== false) {
      const delicate = /Whisker|Catchlight|Iris|EyeRim|EyeSclera|SoftMouth|PinkTongue/i.test(node.name);
      node.castShadow = !delicate;
      node.receiveShadow = !/Catchlight|Iris|EyeRim/i.test(node.name);
      if (node.isSkinnedMesh) node.frustumCulled = false;
    }
    const values = node.morphTargetInfluences, dictionary = node.morphTargetDictionary;
    if (!values || !dictionary || seenMorphArrays.has(values)) return;
    seenMorphArrays.add(values);
    for (const name of faceNames) {
      if (dictionary[name] === undefined) continue;
      const entry = {values, index: dictionary[name], base: values[dictionary[name]]};
      if (!face.has(name)) face.set(name, []);
      face.get(name).push(entry);
    }
  });
  // The present authoring rig uses Root translation for sitting, lying and
  // local gait bob. Preserve those: they are body articulation, not navigation.
  // Jump's positive vertical arc duplicates the director-owned trajectory.
  // Preserve its negative preparation/landing compression and planar pose.
  const motionRoot = model.getObjectByName('Root');
  const strippedRootTracks = [];
  const adaptedJumpTracks = [], adaptedJumps = new Set();
  const clips = new Map();
  for (const source of gltf.animations ?? []) {
    if (!(source.duration > 0)) continue;
    const clip = source.clone();
    clip.tracks = clip.tracks.filter(track => {
      const binding = THREE.PropertyBinding.parseTrackName(track.name);
      const rootTarget = binding.nodeName === 'Root' || (motionRoot && binding.nodeName === motionRoot.uuid)
        || (binding.objectName === 'bones' && binding.objectIndex === 'Root');
      if (source.name === 'jump' && rootTarget && binding.propertyName === 'position') {
        const restY = motionRoot?.position.y ?? 0;
        const values = track.values, width = track.getValueSize();
        const compression = width === 3 && track.times.some((time, index) =>
          (time / source.duration < SOURCE_JUMP.takeoff || time / source.duration > SOURCE_JUMP.landing)
          && values[index * 3 + 1] < restY - 1e-5);
        if (!compression || width !== 3) {
          // Unrecognized positive-only trajectories have no compression to
          // retain. Keep their existing safe fallback explicit in readiness.
          strippedRootTracks.push({clip: source.name, track: track.name});return false;
        }
        const interpolate = track.createInterpolant(new Float32Array(3));
        const boundaries = [source.duration * SOURCE_JUMP.takeoff, source.duration * SOURCE_JUMP.landing];
        const times = [...new Set([...track.times, ...boundaries])].sort((a, b) => a - b);
        const output = new Float32Array(times.length * 3);
        for (let index = 0; index < times.length; index++) {
          const position = interpolate.evaluate(times[index]);
          output.set(position, index * 3);
          const airborne = times[index] >= boundaries[0] && times[index] <= boundaries[1];
          output[index * 3 + 1] = airborne ? restY : Math.min(restY, position[1]);
        }
        track.times = new Float32Array(times);track.values = output;
        track.setInterpolation(THREE.InterpolateLinear);
        adaptedJumpTracks.push({clip: source.name, track: track.name,
          policy: 'retain compression; remove only upward flight translation',
          source: SOURCE_JUMP, director: HOST_JUMP});
        adaptedJumps.add(source.name);
      }
      return true;
    });
    if (clip.tracks.length) clips.set(clip.name, clip);
  }
  const mixer = new THREE.AnimationMixer(model);
  const gaits = options.gaits ?? calibratedGaits(THREE, model, mixer, clips, scale);
  const loopIds = new Set(['idle', 'sleep', 'walk', 'trot', 'gallop', 'sitHold', 'lieHold']);
  const gaitIds = new Set(['walk', 'trot', 'gallop']);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, Number.isFinite(v) ? v : 0));
  const records = new Map();
  const overlays = [head, ...eyes, ...ears.map(ear => ear.node)].map(node => ({
    node,
    base: node.quaternion.clone(),
    basePosition: eyes.includes(node) ? node.position.clone() : null,
  }));
  let chestBaseScaleX = chest ? chest.scale.x : 1;
  let chestModified = false;
  const axis = new THREE.Euler(0, 0, 0, 'YXZ');
  const delta = new THREE.Quaternion(), modelQ = new THREE.Quaternion(), parentQ = new THREE.Quaternion();
  const worldDelta = new THREE.Quaternion(), localDelta = new THREE.Quaternion(), inverseModelQ = new THREE.Quaternion();
  const inverseParentQ = new THREE.Quaternion(), eyeRetreat = new THREE.Vector3();
  let active = null, outgoing = null, age = 0, clock = 0, winkAge = 99, petAge = 99;
  let nextBlink = 1.75, blinkIndex = 0;
  let gazeX = 0, gazeY = 0, disposed = false, initial = true, lastMissing = null;

  function resolve(id) {
    if (clips.has(id)) return {clip: clips.get(id), hold: false, reverse: false};
    const alternatives = {sitHold: ['sit', true, false], lieHold: ['lie', true, false],
      sitUp: ['sit', false, true], lieUp: ['lie', false, true]};
    const alternative = alternatives[id];
    return alternative && clips.has(alternative[0])
      ? {clip: clips.get(alternative[0]), hold: alternative[1], reverse: alternative[2]} : null;
  }
  function supports(id) {
    if (disposed) return false;
    // The current action bridge calls animator.wink(), not director.play().
    if (id === 'wink') return face.has('blinkRight');
    return Boolean(resolve(id));
  }
  function record(id) {
    if (records.has(id)) return records.get(id);
    const spec = resolve(id);
    if (!spec) return null;
    const clip = spec.clip.clone();clip.name = `Director:${id}`;
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);action.clampWhenFinished = true;
    const value = {id, ...spec, clip, action};records.set(id, value);
    return value;
  }
  function restoreOverlays() {
    for (const item of overlays) {
      item.node.quaternion.copy(item.base);
      if (item.basePosition) item.node.position.copy(item.basePosition);
    }
    if (chest && chestModified) {
      chest.scale.x = chestBaseScaleX;
      chestModified = false;
    }
    for (const entries of face.values()) for (const entry of entries) entry.values[entry.index] = entry.base;
  }
  function rememberAnimatedValues() {
    for (const item of overlays) {
      item.base.copy(item.node.quaternion);
      if (item.basePosition) item.basePosition.copy(item.node.position);
    }
    if (chest) chestBaseScaleX = chest.scale.x;
    for (const entries of face.values()) for (const entry of entries) entry.base = entry.values[entry.index];
  }
  function writeFace(name, value) {
    for (const entry of face.get(name) ?? []) entry.values[entry.index] = Math.max(entry.base, clamp(value));
  }
  function rotateBone(node, pitch, yaw, roll = 0, retreat = 0) {
    if (Math.abs(pitch) + Math.abs(yaw) + Math.abs(roll) + Math.abs(retreat) < 1e-6) return;
    // Convert a model-space rotation into the actual bone parent frame.
    // Blender bone local axes are not assumed to be +Y up / +Z forward.
    normalized.getWorldQuaternion(modelQ);
    if (node.parent) node.parent.getWorldQuaternion(parentQ);
    else parentQ.identity();
    inverseParentQ.copy(parentQ).invert();
    delta.setFromEuler(axis.set(pitch, yaw, roll, 'YXZ'));
    worldDelta.copy(modelQ).multiply(delta).multiply(inverseModelQ.copy(modelQ).invert());
    localDelta.copy(inverseParentQ).multiply(worldDelta).multiply(parentQ);
    node.quaternion.premultiply(localDelta).normalize();
    if (retreat > 0) {
      // Recess the shallow eye surface slightly as it turns so its edge stays
      // behind the eyelid instead of clipping forward.
      eyeRetreat.set(0, 0, -retreat).applyQuaternion(modelQ).applyQuaternion(inverseParentQ);
      node.position.add(eyeRetreat);
    }
    node.updateWorldMatrix(false, false);
  }
  function setFace({blink = 0, wink = 0, mouth = 0, smile = 0} = {}) {
    if (disposed) return;
    writeFace('blinkLeft', blink);writeFace('blinkRight', Math.max(blink, wink));
    writeFace('mouthOpen', mouth);writeFace('smile', smile);
  }
  function reset() {
    if (disposed) return;
    restoreOverlays();mixer.stopAllAction();
    clock = age = gazeX = gazeY = blinkIndex = 0;
    nextBlink = 1.75;winkAge = petAge = 99;
    active = outgoing = null;initial = true;lastMissing = null;
    for (const ear of ears) { ear.pitch.reset(); ear.yaw.reset(); }
    rememberAnimatedValues();
  }
  function update(state = {}, seconds = 1/60, attention = {}) {
    if (disposed || (!initial && (state.paused || state.visible === false || seconds === 0))) return;
    const dt = clamp(seconds, 0, .1);
    const requested = state.motion ?? 'idle';
    let next = record(requested);
    if (!next) {
      if (lastMissing !== requested) options.onUnsupported?.(requested);
      lastMissing = requested;
      // Visually settle to idle, but report the missing action and keep it out
      // of capabilities. This fallback must never count as command success.
      next = record('idle');
    } else lastMissing = null;
    if (!next) return;
    restoreOverlays();
    if (active !== next) {
      outgoing?.action.stop();outgoing = active;active = next;age = 0;
      active.action.reset().play();active.action.paused = true;
    }
    clock += dt;age += dt;petAge += dt;winkAge += dt;
    const blendDuration = gaitIds.has(requested) ? .13 : .19;
    const blend = initial || !outgoing ? 1 : clamp(age / blendDuration);
    active.action.enabled = true;active.action.setEffectiveWeight(blend);
    if (active.hold) active.action.time = active.clip.duration;
    else if (loopIds.has(active.id) && !gaitIds.has(active.id)) active.action.time = clock % active.clip.duration;
    else {
      const phase = clamp(state.phase);
      const sampled = adaptedJumps.has(active.id) ? jumpPhase(phase) : phase;
      active.action.time = active.clip.duration * (active.reverse ? 1 - sampled : sampled);
    }
    if (outgoing) {
      outgoing.action.setEffectiveWeight(1 - blend);
      if (blend === 1) {outgoing.action.stop();outgoing = null;}
    }
    mixer.update(0);rememberAnimatedValues();
    const quiet = state.mode === 'reading' || requested === 'sleep';
    const resting = RESTING_MOTIONS.has(requested);
    const engaged = !quiet && attention.active;
    const damp = 1 - Math.exp(-5.6 * dt);
    gazeX += ((engaged ? clamp(attention.x, -1, 1) : 0) - gazeX) * damp;
    gazeY += ((engaged ? clamp(attention.y, -1, 1) : 0) - gazeY) * damp;

    // Gentle living chest breath while idle, sitting, lying or sleeping.
    if (chest && dt > 0 && (requested === 'idle' || resting || gaitIds.has(requested))) {
      const breath = .5 - .5 * Math.cos(clock * (resting || quiet ? 1.9 : 2.9));
      const gain = resting || quiet ? .015 : (gaitIds.has(requested) ? .008 : .013);
      chest.scale.x = chestBaseScaleX * (1 + breath * gain);
      chestModified = true;
    }

    model.updateWorldMatrix(true, true);
    if (!state.moving && (Math.abs(gazeX) > 1e-4 || Math.abs(gazeY) > 1e-4)) {
      // Head carries most of the look; eyes stay shallow and recess cleanly behind lids.
      rotateBone(head, -gazeY * .11, gazeX * .15, gazeX * -.018);
      const retreat = Math.hypot(gazeX, gazeY) * .008;
      for (const eye of eyes) rotateBone(eye, -gazeY * .022, gazeX * .032, 0, retreat);
    }

    // Subtle ear twitches and pointer attentiveness when awake.
    const earLive = !quiet && !resting && !state.moving;
    for (const ear of ears) {
      const cycle = (clock + (ear.direction > 0 ? .9 : 3.2)) % 6.4;
      const flick = cycle < .32 ? Math.sin(Math.PI * cycle / .32) ** 2 : 0;
      const targetPitch = earLive ? flick * .055 - gazeY * .035 : 0;
      const targetYaw = earLive ? gazeX * .065 + ear.direction * flick * .095 : 0;
      const pitchAngle = ear.pitch.step(targetPitch, dt);
      const yawAngle = ear.yaw.step(targetYaw, dt);
      if (earLive || Math.abs(pitchAngle) + Math.abs(yawAngle) > 1e-4) {
        rotateBone(ear.node, pitchAngle, yawAngle);
      }
    }

    // Organic irregular blinking + touch/wink expression overlays.
    const pulse = (t, length) => t > 0 && t < length ? Math.sin(Math.PI * t / length) ** 2 : 0;
    let naturalBlink = 0;
    if (quiet) {
      naturalBlink = requested === 'sleep' ? 1 : .18;
    } else {
      const closeTime = blinkIndex % 3 === 0 ? .28 : .105;
      const openTime = closeTime > .2 ? .24 : .17;
      const reopen = closeTime + .045;
      const elapsed = clock - nextBlink;
      if (elapsed > reopen + openTime) {
        nextBlink = clock + BLINK_INTERVALS[blinkIndex % BLINK_INTERVALS.length];
        blinkIndex++;
      } else if (elapsed > 0) {
        naturalBlink = smoothstep(elapsed, 0, closeTime) * (1 - smoothstep(elapsed, reopen, reopen + openTime));
      }
    }
    setFace({
      blink: Math.max(naturalBlink, .45 * pulse(petAge, .9)),
      wink: quiet ? 0 : pulse(winkAge, .65),
      smile: .32 * pulse(petAge, 1.0),
    });
    initial = false;
  }
  function dispose() {
    if (disposed) return;
    reset();disposed = true;
    mixer.uncacheRoot(model);root.removeFromParent();
    disposeWholeCatAsset(model);
    records.clear();face.clear();
  }
  const animator = {update, reset, touch() {petAge = 0;}, wink() {if (face.has('blinkRight')) winkAge = 0;}, dispose};
  const cat = {root, model, bones: {head}, setFace, dispose, get isDisposed() {return disposed;},
    getSpeechAnchor(target = new THREE.Vector3()) {return speechAnchor.getWorldPosition(target);}};
  const missingPublicActions = PUBLIC_ACTIONS.filter(id => !supports(id));
  return {cat, animator, supports, clips: [...clips.keys()], scale, sourceSize: size.toArray(),
    gaits,
    getAnimationState() {return {active: active?.id ?? null, outgoing: outgoing?.id ?? null,
      sampledTime: active?.action.time ?? 0, duration: active?.clip.duration ?? 0,
      weight: active?.action.getEffectiveWeight() ?? 0, disposed};},
    readiness: {productionIntegrated: Boolean(gaits) && missingPublicActions.length === 0,
      needsGaitCalibration: !gaits,
      gaitCalibration: options.gaits ? 'host supplied' : gaits ? 'left hind stance phase .05/.15/.25' : 'unavailable',
      missingPublicActions,
      missingMorphs: faceNames.filter(name => !face.has(name)), strippedRootTracks,
      adaptedJumpTracks, jumpNeedsContactValidation: adaptedJumpTracks.length > 0,
      jumpNeedsSeparatedTrajectory: strippedRootTracks.some(item => item.clip === 'jump')}};
}

export const PUBLIC_ACTIONS = Object.freeze(['idle', 'look', 'sniff', 'tail', 'sit', 'lie', 'sleep',
  'stretch', 'paw', 'groom', 'knead', 'meow', 'yawn', 'nuzzle', 'shake', 'alert', 'walk', 'trot',
  'gallop', 'jump', 'sitUp', 'lieUp', 'turn', 'wink']);
