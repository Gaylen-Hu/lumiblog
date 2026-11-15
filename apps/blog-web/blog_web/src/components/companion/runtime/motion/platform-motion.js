// Model-space pose guides for this cat, authored against its shoulder, ankle
// and hip lengths. Height/forward offsets are metres, angles are radians.
// The world's flight path is applied separately by RoomNavigation.
const profiles = {
  chairAscent: {duration: 1.12, preparation: .36, landing: .34, crouch: .047,
    pitch: -.105, reach: .043, fold: .056, rearFold: .070, impact: .035, clearance: .175},
  tableBound: {duration: 1.20, preparation: .43, landing: .39, crouch: .057,
    pitch: -.135, reach: .057, fold: .049, rearFold: .079, impact: .043, clearance: .195},
  platformDrop: {duration: 1.02, preparation: .25, landing: .46, crouch: .025,
    pitch: .072, reach: .047, fold: .034, rearFold: .057, impact: .053, clearance: .125},
};

export const platformClips = Object.entries(profiles).map(([id,p]) => ({id,duration:p.duration}));
export function platformProfile(id) { return profiles[id]; }

// Between each pair of marked poses preserve the local slope, with a flat
// tangent at a reversal or hold. This avoids overshoot through a support plane.
function curve(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys.length - 1;
  if (t >= keys[last][0]) return keys[last][1];
  const slope = i => {
    if (i === 0 || i === last) return 0;
    const before = (keys[i][1]-keys[i-1][1])/(keys[i][0]-keys[i-1][0]);
    const after = (keys[i+1][1]-keys[i][1])/(keys[i+1][0]-keys[i][0]);
    return before*after > 0 ? 2*before*after/(before+after) : 0;
  };
  let i = 0;
  while (keys[i+1][0] < t) i++;
  const [a,y] = keys[i], [b,z] = keys[i+1], span = b-a, u=(t-a)/span;
  return (1+2*u)*(1-u)**2*y + u*(1-u)**2*span*slope(i)
       + u*u*(3-2*u)*z + u*u*(u-1)*span*slope(i+1);
}

// Lift-off and first forepaw contact are at .26 and .76 of the clip.
// The hind paws stay loaded after the forepaws release, and settle later.
export function platformPose(id,t) {
  const p = profiles[id];
  if (!p) return null;
  const drop = id === 'platformDrop';
  const compression = curve(t,[[0,0],[.09,.22],[.17,1],[.26,0],[1,0]]);
  const absorption = curve(t,[[0,0],[.74,0],[.82,1],[.89,.60],[1,0]]);
  const airborne = curve(t,[[0,0],[.18,.3],[.30,1],[.57,.38],[.75,0],[1,0]]);
  const reach = curve(t,[[0,0],[.24,0],[.52,.40],[.65,1],[.76,0],[1,0]]);
  const legs = [0,1,2,3].map(index => {
    const front=index<2, lag=(index%2)*.017;
    if(front) return {
      lift: p.fold*curve(t,[[0,0],[.177+lag,0],[.275+lag,.76],[.44,1],[.65,.26],[.76+lag,0],[1,0]]),
      forward: p.reach*reach, hock:0,
    };
    return {
      lift: p.rearFold*curve(t,[[0,0],[.26,0],[.36,.27],[.52,1],[.70,.91],[.76,.68],[.854+lag,0],[1,0]]),
      forward: curve(t,[[0,0],[.26,0],[.36,-.025],[.53,.008],[.71,drop?.017:.028],[.854+lag,0],[1,0]]),
      hock: curve(t,[[0,0],[.17,-.15],[.28,.06],[.52,-.30],[.76,-.17],[.88,0],[1,0]]),
    };
  });
  return {
    lower: -p.crouch*compression-p.impact*absorption,
    pitch: p.pitch*airborne + (drop?.11:.065)*absorption,
    neck: (drop?.16:-.15)*compression - .48*p.pitch*airborne - .085*absorption,
    tail: .085*compression + (drop?.115:.065)*airborne + .045*absorption+
      (drop?.28*curve(t,[[0,0],[.26,.05],[.5,.55],[.68,1],[.80,.91],[.91,.28],[1,0]]):0),
    legs,
  };
}
