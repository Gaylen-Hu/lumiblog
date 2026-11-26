// Authored for this rig at room scale. Touchdown phase is measured from the
// trailing hind paw. Front and hind pairs run on different beats.
export const GALLOP = Object.freeze({
  id: 'gallop', label: '舒展飞奔', category: '活动',
  duration: .50, strideLength: .56, loop: true,
});

const touchdown = [.49, .58, 0, .10]; // left fore, right fore, left hind, right hind
const stance = [.232, .235, .24, .245];
const circle = Math.PI * 2;

export function gallopBody(phase) {
  const collection = Math.cos(circle * (phase - .92));
  // Raise the centre of mass between the fore/hind support windows.
  const suspension = (.5 + .5 * Math.cos(2 * circle * (phase - .405)));
  return {
    lower: -.030 + .014 * suspension + .003 * collection,
    pelvis: -.22 * collection + .025 * Math.sin(circle * phase),
    lumbar: .245 * collection,
    thoracic: .168 * collection,
    neck: -.172 * collection - .032 * Math.sin(circle * phase),
    tail: .21 * Math.cos(circle * (phase - .99)),
  };
}

export function gallopPaw(phase, index) {
  const local = ((phase - touchdown[index]) % 1 + 1) % 1;
  const duty = stance[index], forwardAtTouch = GALLOP.strideLength * duty * .5;
  let forward = forwardAtTouch - GALLOP.strideLength * local;
  if (local < duty) return { forward, lift: 0, wrist: 0, hock: -.08 * Math.sin(Math.PI * local / duty) };
  const swing = (local - duty) / (1 - duty);
  const blend = swing * swing * (3 - 2 * swing);
  forward += GALLOP.strideLength * blend;
  const arch = Math.sin(Math.PI * swing) ** 1.55;
  const hind = index >= 2;
  return {
    forward: forward + (hind ? .012 : .023) * arch,
    lift: (hind ? .044 : .034) * arch,
    wrist: (hind ? .22 : .28) * arch,
    hock: (hind ? .17 : 0) * arch,
  };
}
