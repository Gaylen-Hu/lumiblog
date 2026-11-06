// Shared by the exterior painting and its refracted samples on the window.
export const gardenShader = `
uniform vec2 gardenBreeze;
uniform float nightBlend;
vec3 gradeGarden(vec3 garden, vec2 uv) {
  float luminance = dot(garden, vec3(0.2126, 0.7152, 0.0722));
  float foliage = smoothstep(0.012, 0.095, garden.g - garden.b);
  float distanceHint = smoothstep(-0.22, 0.42, uv.x - uv.y + 0.51);
  vec3 graded = mix(garden, vec3(luminance), foliage * distanceHint * 0.13);
  graded = mix(graded, vec3(0.66, 0.76, 0.77), 0.016 + distanceHint * 0.087);
  vec2 canopy = (uv - vec2(0.38, 0.62) - gardenBreeze) * vec2(1.8, 1.0);
  float softLight = 1.0 - smoothstep(0.02, 0.19, length(canopy));
  graded = mix(graded, vec3(0.91, 0.86, 0.66), foliage * softLight * 0.095);
  vec3 moonlight = vec3(0.006, 0.013, 0.025) + luminance * vec3(0.055, 0.090, 0.155);
  return mix(graded, moonlight, nightBlend);
}`
