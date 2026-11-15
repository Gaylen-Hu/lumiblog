import * as T from 'three';

// All fur uses the same linear-light pigments, including the head imported
// from GLB. Texture brightness describes markings, not a separate fur tint.
export const silverCoatGLSL=`
  vec3 silverCoatPigment(float luminance) {
    float tone=clamp(luminance,0.0,1.0);
    vec3 charcoal=vec3(.045,.044,.043);
    vec3 silver=vec3(.46,.465,.47);
    vec3 pearl=vec3(.83,.815,.79);
    vec3 pigment=mix(charcoal,silver,clamp((tone-.025)/.405,0.0,1.0));
    return mix(pigment,pearl,clamp((tone-.43)/.42,0.0,1.0));
  }
`;

export function createCoatGradient(name='Soft cel light bands'){
  const pixels=new Uint8Array(256*4);
  for(let i=0;i<256;i++){
    const x=i/255;
    const light=.24+.24*T.MathUtils.smoothstep(x,.25,.36)
      +.26*T.MathUtils.smoothstep(x,.51,.63)+.26*T.MathUtils.smoothstep(x,.77,.89);
    for(let c=0;c<3;c++)pixels[i*4+c]=Math.round(light*255);
    pixels[i*4+3]=255;
  }
  const ramp=new T.DataTexture(pixels,256,1,T.RGBAFormat);
  ramp.name=name;ramp.minFilter=ramp.magFilter=T.LinearFilter;
  ramp.generateMipmaps=false;ramp.colorSpace=T.NoColorSpace;ramp.needsUpdate=true;
  return ramp;
}
