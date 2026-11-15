import * as T from 'three';
import {createCoatGradient,silverCoatGLSL} from '../coat-palette.js';

let gradient;
function toonGradient(){
  if(gradient)return gradient;
  gradient=createCoatGradient();
  return gradient;
}

export function createToonCoat(source,{separateNose=false,vertexPigment=false,artistCoordinates=false}={}){
  const material=new T.MeshToonMaterial({name:vertexPigment?'Ivory muzzle · soft cel':'Silver tabby · soft cel',
    map:vertexPigment?null:source.map,vertexColors:vertexPigment,color:'#ffffff',gradientMap:toonGradient(),side:source.side});
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCoatRest;\nvarying vec3 vCoatNormal;'+(artistCoordinates?'\nattribute vec3 _coat_rest;\nattribute vec3 _coat_normal;':''));
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+(artistCoordinates?'vCoatRest=_coat_rest;vCoatNormal=_coat_normal;':'vCoatRest=position;vCoatNormal=normal;'));
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+silverCoatGLSL+'\nvarying vec3 vCoatRest;\nvarying vec3 vCoatNormal;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      #if defined(USE_MAP) || defined(USE_COLOR)
        // Filter the fine photographic fur detail, retain the artist's UV
        // and low-frequency tabby markings, then paint in a small palette.
        vec3 pigment=${vertexPigment?'vColor.rgb':'texture2D(map,vMapUv,.5).rgb'};
        float grey=dot(pigment,vec3(0.2126,0.7152,0.0722));
        // The photographic head atlas is darker than the painted body atlas.
        // Calibrate its pigment range, then use the same silver/pearl palette.
        // COLOR_0 on the muzzle was sampled from the same atlas. Its shared
        // boundary must use this exact curve too; brightening that primitive
        // independently would expose its mesh outline as a white face patch.
        float headTone=mix(.045,.43,clamp((grey-.025)/.120,0.0,1.0))
          +.40*clamp((grey-.145)/.095,0.0,1.0);
        vec3 coat=silverCoatPigment(headTone);
        // The source nape atlas carries much darker baked pigment than the
        // shoulder. Calibrate just the rear skull, fading before the ears and
        // face, so turning around does not reveal a dark cap on a silver body.
        float nape=(1.0-smoothstep(-.018,-.002,vCoatRest.z))
          *(1.0-smoothstep(.022,.040,vCoatRest.y));
        vec3 napeCoat=silverCoatPigment(.22+.60*smoothstep(.015,.24,grey));
        coat=mix(coat,napeCoat,nape*.90);
        // Remove baked photographic eye bags and isolated eyebrow patches;
        // the geometric eyelid margin remains the eye's clean contour.
        float facing=smoothstep(.12,.64,vCoatNormal.z)*smoothstep(.008,.021,vCoatRest.z);
        float foreheadFacing=smoothstep(.12,.5,vCoatNormal.z)*smoothstep(-.005,.006,vCoatRest.z);
        float forehead=foreheadFacing*smoothstep(.010,.018,vCoatRest.y)*(1.0-smoothstep(.028,.038,abs(vCoatRest.x)));
        vec3 foreheadCoat=silverCoatPigment(headTone);
        coat=mix(coat,foreheadCoat,forehead*.82);
        float temple=foreheadFacing*smoothstep(.019,.027,abs(vCoatRest.x))
          *(1.0-smoothstep(.040,.047,abs(vCoatRest.x)))
          *smoothstep(.010,.018,vCoatRest.y)*(1.0-smoothstep(.029,.041,vCoatRest.y));
        coat=mix(coat,silverCoatPigment(.48),temple*.96);
        float browPatch=1.0-smoothstep(.55,1.12,length(vec2((abs(vCoatRest.x)-.0195)/.0075,(vCoatRest.y-.010)/.0067)));
        float lowerOrbit=1.0-smoothstep(.35,1.1,length(vec2((abs(vCoatRest.x)-.016)/.0085,(vCoatRest.y+.0068)/.0045)));
        float bridgePatch=1.0-smoothstep(.45,1.08,length(vec2(vCoatRest.x/.011,(vCoatRest.y+.0078)/.012)));
        coat=mix(coat,silverCoatPigment(.48),facing*max(max(browPatch*.97,lowerOrbit*.97),bridgePatch*.96));
        // A photographic eye socket must not remain as a second, painted
        // crease after the actual socket has been softened in the mesh.
        float eyeSurround=1.0-smoothstep(.72,1.24,length(vec2((abs(vCoatRest.x)-.0164)/.0115,(vCoatRest.y-.0012)/.010)));
        float eyeFront=smoothstep(.013,.022,vCoatRest.z);
        vec3 eyeCoat=silverCoatPigment(mix(.48,.66,(1.0-smoothstep(-.007,.002,vCoatRest.y))*.45));
        coat=mix(coat,eyeCoat,eyeSurround*eyeFront*.98);
        float nose=smoothstep(.055,.22,pigment.r-pigment.g)*smoothstep(.075,.24,pigment.r-pigment.b);
        coat=mix(coat,vec3(.36,.16,.145),nose*${separateNose?'0.0':'.94'});
        vec2 earUV=vec2((abs(vCoatRest.x)-.030)/.012,(vCoatRest.y-.032)/.019);
        float innerEar=(1.0-smoothstep(.52,1.03,length(earUV)))
          *smoothstep(.02,.7,vCoatNormal.z)*smoothstep(-.028,-.010,vCoatRest.z);
        coat=mix(coat,vec3(.39,.245,.22),innerEar*.82);
        diffuseColor.rgb*=coat;
      #endif
    `);
    if(vertexPigment)shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','');
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      float edge=pow(1.0-abs(dot(normal,normalize(vViewPosition))),3.0);
      vec3 lightDirection=normalize(mat3(viewMatrix)*vec3(-.55,.7,-.3));
      float litEdge=smoothstep(-.1,.65,dot(normal,lightDirection));
      outgoingLight+=vec3(.91,.79,.62)*edge*litEdge*.045
        *mix(vec3(.35),diffuseColor.rgb,.65);
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey=()=> 'shared-silver-head-cel-v5-'+separateNose+'-'+vertexPigment+'-'+artistCoordinates;
  return material;
}

export function createToonEyeMargin(source,tear=false){
  const material=new T.MeshToonMaterial({name:tear?'Soft warm tear corner':'Clean cel lid margin',
    color:tear?'#a79a87':'#ffffff',gradientMap:toonGradient(),side:source.side});
  if(!tear){
    material.onBeforeCompile=shader=>{
      shader.uniforms.upperLidTint={value:new T.Color('#6c6253')};
      shader.uniforms.lowerLidTint={value:new T.Color('#c4bead')};
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vLidRestHeight;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLidRestHeight=position.y;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vLidRestHeight;\nuniform vec3 upperLidTint;\nuniform vec3 lowerLidTint;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        diffuseColor.rgb*=mix(lowerLidTint,upperLidTint,smoothstep(-.0015,.004,vLidRestHeight));`);
    };
    material.customProgramCacheKey=()=> 'soft-upper-lid-light-lower-lid-v1';
  }
  return material;
}

export function createToonMouth(source,name){
  const tongue=name==='Tongue';
  const color=name.startsWith('Teeth')?'#f7eee1':tongue?'#e2a1aa':'#805562';
  return new T.MeshToonMaterial({name:'Soft cel '+name,color,gradientMap:toonGradient(),side:source.side,
    emissive:tongue?'#64323a':'#572d39',emissiveIntensity:.12});
}

export function createKittenNose(source){
  // The rebuilt nasal leather is a separate mesh. Its small, rounded
  // contour supplies the shape; a restrained wet highlight supplies depth.
  return new T.MeshPhysicalMaterial({name:'Soft pink nasal leather',
    color:'#c68f85',roughness:.43,metalness:0,clearcoat:.12,
    clearcoatRoughness:.42,side:source.side});
}
