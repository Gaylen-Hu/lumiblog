import type { Weather } from './state'

// Shade, aerial haze and the amount of pale snow caught on the canopy.
export const gardenWeather: Record<Weather, [number, number, number]> = {
  clear: [0, 0, 0],
  cloudy: [.18, .08, 0],
  overcast: [.42, .18, 0],
  fog: [.18, .82, 0],
  rain: [.48, .28, 0],
  thunderstorm: [.76, .36, 0],
  snow: [.16, .32, .8],
}

// Shared by the exterior painting and its refracted samples on the window.
export const gardenShader = `
uniform vec2 gardenBreeze;
uniform float nightBlend;
uniform vec3 gardenWeather;
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
  vec3 exterior = mix(graded, moonlight, nightBlend);
  exterior *= vec3(1.0) - gardenWeather.x * vec3(0.65, 0.53, 0.40);
  vec3 skyLight = mix(vec3(0.70, 0.77, 0.79), vec3(0.044, 0.067, 0.09), nightBlend);
  float canopySnow = smoothstep(0.10, 0.58, luminance) * foliage;
  exterior = mix(exterior, skyLight, canopySnow * gardenWeather.z);
  return mix(exterior, skyLight, gardenWeather.y * mix(0.24, 0.90, distanceHint));
}`
