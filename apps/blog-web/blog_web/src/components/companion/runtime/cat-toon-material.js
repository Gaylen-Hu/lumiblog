import * as T from 'three';
import {createCoatGradient,silverCoatGLSL} from './coat-palette.js';

// A four-value cel ramp with small smooth transitions: the shapes remain
// readable in motion without a hard threshold flickering over fine fur.
export function createToonPalette(){
  const ramp=createCoatGradient('SoftFourBandCelRamp');
  function coat(source,{fibre=false}={}){
    const m=new T.MeshToonMaterial({
      color:source.color,map:source.map,gradientMap:ramp,
      vertexColors:source.vertexColors,side:source.side,
      transparent:source.transparent,opacity:source.opacity,
      alphaMap:source.alphaMap,alphaTest:source.alphaTest,depthWrite:source.depthWrite,
      normalMap:source.normalMap,bumpMap:source.bumpMap,bumpScale:source.bumpScale,
      emissive:source.emissive,emissiveMap:source.emissiveMap,
      emissiveIntensity:Math.min(.018,source.emissiveIntensity??0),
    });
    m.name='SilverTabbySoftCel';
    m.userData.catToon={bands:4,rimStrength:.045};
    m.onBeforeCompile=shader=>{
      shader.uniforms.catRimStrength={value:m.userData.catToon.rimStrength};
      shader.uniforms.catRimTint={value:new T.Color('#f5e6cf')};
      shader.uniforms.catRimDirection={value:new T.Vector3(-.65,.75,-.25).normalize()};
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
        '#include <common>\n'+silverCoatGLSL+'\nuniform float catRimStrength;\nuniform vec3 catRimTint;\nuniform vec3 catRimDirection;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
        #include <map_fragment>
        float coatLuminance=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
        diffuseColor.rgb=silverCoatPigment(coatLuminance);
      `);
      if(fibre)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\nnormal *= faceDirection;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        float catEdge = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
        vec3 catRimLight = normalize(mat3(viewMatrix) * catRimDirection);
        float catLitEdge = smoothstep(-0.12, 0.68, dot(normal, catRimLight));
        outgoingLight += catRimTint * catRimStrength * catEdge * catLitEdge
          * mix(vec3(0.35), diffuseColor.rgb, 0.65);
        #include <opaque_fragment>
      `);
    };
    m.customProgramCacheKey=()=>fibre?'shared-silver-cel-fibre-v2':'shared-silver-cel-coat-v2';
    return m;
  }
  return {coat,dispose(){ramp.dispose();}};
}

export function toonifyCat(root,palette){
  const converted=new Map();
  root.traverse(mesh=>{
    if(!mesh.isMesh||!(mesh.name.startsWith('Silver')&&mesh.name.endsWith('Coat')||
      mesh.name.startsWith('SilverLegCoat_')||mesh.name==='FurredEyelids'||
      mesh.name==='LeftPinna'||mesh.name==='RightPinna'))return;
    const convert=source=>{
      if(!converted.has(source))converted.set(source,palette.coat(source));
      return converted.get(source);
    };
    mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);
    mesh.receiveShadow=true;
  });
  return [...converted.values()];
}
