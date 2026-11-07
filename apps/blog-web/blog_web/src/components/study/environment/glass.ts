import * as THREE from 'three'
import { gardenShader } from './garden-shader'

// Analytic sliding beads/trails refract the existing painting. Room owns texture.
export function createRainGlass(scene: THREE.Scene, shared: { gardenBreeze: { value: THREE.Vector2 }; nightBlend: { value: number }; tint: THREE.Color }) {
  const geometry = new THREE.PlaneGeometry(4.85, 2.6)
  const uniforms = { time: { value: 0 }, wet: { value: 0 }, gardenMap: { value: null as THREE.Texture | null }, tint: { value: shared.tint }, gardenBreeze: shared.gardenBreeze, nightBlend: shared.nightBlend }
  let target = 0
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    vertexShader: `varying vec2 glassUv; varying vec3 glassWorld;
      void main(){ glassUv=uv; vec4 world=modelMatrix*vec4(position,1.0); glassWorld=world.xyz; gl_Position=projectionMatrix*viewMatrix*world; }`,
    fragmentShader: `
      varying vec2 glassUv; varying vec3 glassWorld;
      uniform float time; uniform float wet; uniform sampler2D gardenMap; uniform vec3 tint;
      ${gardenShader}
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float beads(vec2 uv, vec2 scale, float speed) {
        vec2 grid=uv*scale; grid.y+=time*speed;
        vec2 cell=floor(grid); float seed=hash(cell);
        vec2 p=fract(grid)-vec2(0.2+seed*0.6,0.5);
        p.x+=sin(time*0.25+seed*30.0)*0.03;
        float radius=0.10+seed*0.12;
        float bead=1.0-smoothstep(radius*0.25,radius,length(p*vec2(1.0,0.65)));
        float trail=(1.0-smoothstep(0.015,0.055,abs(p.x)))*smoothstep(0.0,0.18,p.y)*(1.0-smoothstep(0.25,0.5,p.y))*0.25;
        return max(bead,trail)*step(1.0-wet*0.8,seed);
      }
      float water(vec2 uv) { return max(beads(uv,vec2(24.0,13.0),0.32),beads(uv+0.17,vec2(45.0,24.0),0.08)*0.7); }
      void main(){
        float h=water(glassUv);
        // Recover the UV gradient from screen derivatives. Sampling the entire
        // bead field four more times per pixel was expensive on integrated GPUs.
        vec2 dx=dFdx(glassUv), dy=dFdy(glassUv);
        float hx=dFdx(h), hy=dFdy(h);
        float determinant=dx.x*dy.y-dx.y*dy.x;
        vec2 normal=abs(determinant)>0.0000000001
          ? clamp(vec2(hx*dy.y-hy*dx.y,hy*dx.x-hx*dy.x)/determinant*0.0012,vec2(-1.0),vec2(1.0))
          : vec2(0.0);
        if(h<0.005 || wet<0.005) discard;
        vec3 ray=glassWorld-cameraPosition;
        float distanceToPainting=(5.0-glassWorld.x)/max(ray.x,0.001);
        vec3 hit=glassWorld+ray*distanceToPainting;
        vec2 uv=vec2((hit.z+2.6)/20.0+0.5,(hit.y-3.0)/10.0+0.5);
        uv=clamp(uv+normal*vec2(0.05,0.09),0.001,0.999);
        vec3 color=gradeGarden(texture2D(gardenMap,uv).rgb*tint,uv);
        float glint=max(0.0,dot(normal,vec2(-0.6,0.8)));
        color+=vec3(0.22,0.27,0.3)*glint;
        gl_FragColor=vec4(color,smoothstep(0.0,0.16,h)*wet*0.93);
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(3.2, 2.42, -1.175); mesh.rotation.y = -Math.PI / 2
  mesh.visible = false; scene.add(mesh)
  return {
    set(wet: boolean, intensity = .55) { target = wet ? .35 + .65 * THREE.MathUtils.clamp(intensity, 0, 1) : 0 },
    setTexture(texture: THREE.Texture) { uniforms.gardenMap.value = texture },
    update(delta: number, animate: boolean) {
      const dt = Math.min(.05, Math.max(0, delta / 1000))
      uniforms.wet.value = animate ? THREE.MathUtils.damp(uniforms.wet.value, target, .8, dt) : target
      if (Math.abs(uniforms.wet.value-target)<.002) uniforms.wet.value=target
      mesh.visible = uniforms.gardenMap.value !== null && uniforms.wet.value > .005
      if (animate) uniforms.time.value += dt
      return animate && mesh.visible
    },
    dispose() { scene.remove(mesh); geometry.dispose(); material.dispose() },
  }
}
