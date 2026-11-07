import { logoPaths } from '../logo-paths'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { ClockView, Destination, RoomItem } from './model'
import { clockHandAnglesFromParts } from './wall-clock'
import type { DeskNote } from './desk-notes'
import { cityTime, resolveEnvironment, type Environment } from './environment/state'
import { createPrecipitation } from './environment/precipitation'
import { createRainGlass } from './environment/glass'
import { gardenBackdrop, gardenShader, gardenWeather } from './environment/garden-shader'
import { CurtainMotion, createCurtainPanel } from './curtain'
import { ScreenFlight } from './screen-flight'
import { paintPortfolioCover } from './portfolio-print'
import { RoomFrameBudget, roomPixelRatio, type RoomQuality } from './room-quality'
import { roomDiagnostics } from './room-diagnostics'
import { batchStaticScene } from './batch-static-scene'

type PickedItem = { target: RoomItem; columnSlug?: string; categoryId?: string; shelfIndex?: number; tier?: number; drawerIndex?: number }
export type RoomOptions = {
  note?: DeskNote
  categories: readonly { id: string; name: string }[]
  columns: readonly { title: string; slug: string }[]
  seriesLabel: string
  projects: readonly { title: string }[]
  siteName: string
  en: boolean
  onPortfolioFrame: (ink: number, scale: number) => void
  onShelfFrame: (x: number, y: number) => void
  onReady: () => void
  onPick: (target: RoomItem, columnSlug?: string) => void
  onHover: (target: RoomItem | null, columnSlug?: string) => void
  onError: () => void
  onContextLost: () => void
  onQuality: (light: boolean) => void
  onReveal: (target: 'diary' | 'bookshelf') => void
  onSettled: (target: Destination | null) => void
  onClockView: (view: ClockView) => void
  onNight: (night: boolean) => void
  onLamp?: (on: boolean) => void
}

// Original procedural interiors, with an AI-generated exterior owned by this project.
export function createRoom(host: HTMLElement, options: RoomOptions) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#dce6e8')
  scene.fog = new THREE.Fog('#e5e4dc', 16, 32)
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: window.innerWidth > 700 ? 'high-performance' : 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = window.innerWidth > 700
  renderer.shadowMap.type = THREE.PCFShadowMap
  // Static furniture shadows are reused until a light or an object moves.
  renderer.shadowMap.autoUpdate = false
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.09
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)
  const diagnostics = roomDiagnostics(host, renderer)
  let previousContinuous = false
  const camera = new THREE.PerspectiveCamera(57, 1, 0.05, 45)
  const home = new THREE.Vector3(-.15, 1.72, .65)
  const homeLook = new THREE.Vector3(.05, 1.51, -2.5)
  camera.position.copy(home)
  camera.lookAt(homeLook)
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  const geometries = new Set<THREE.BufferGeometry>()
  const textures = new Set<THREE.Texture>()
  const extraMaterials = new Set<THREE.Material>()
  const hits: THREE.Object3D[] = []
  const leaves: { mesh: THREE.Object3D; angle: number }[] = []
  let seed = 71
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  function mat(color: string, glow = false) {
    const key = color + glow
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
      color, roughness: 0.85, metalness: 0.03,
      ...(glow ? { emissive: color, emissiveIntensity: 1.4 } : {}),
    }))
    return materials.get(key)!
  }
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, at: number[], parent: THREE.Object3D = scene) {
    geometries.add(geometry)
    const item = new THREE.Mesh(geometry, material)
    item.position.set(at[0], at[1], at[2])
    item.castShadow = true
    item.receiveShadow = true
    parent.add(item)
    return item
  }
  function box(at: number[], size: number[], color: string, parent: THREE.Object3D = scene) {
    return mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat(color), at, parent)
  }
  function sphere(at: number[], size: number[], color: string, parent: THREE.Object3D = scene) {
    const m = mesh(new THREE.SphereGeometry(1, 12, 8), mat(color), at, parent)
    m.scale.set(size[0], size[1], size[2]); return m
  }
  function cylinder(at: number[], r1: number, r2: number, height: number, color: string, parent: THREE.Object3D = scene) {
    return mesh(new THREE.CylinderGeometry(r1, r2, height, 20), mat(color), at, parent)
  }
  function hit(target: RoomItem, at: number[], size: number[], parent: THREE.Object3D = scene) {
    const m = box(at, size, '#ffffff', parent)
    m.visible = false
    m.userData.target = target
    hits.push(m)
    return m
  }
  function woodTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ba916b'; ctx.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 1600; i++) {
      ctx.strokeStyle = `rgba(${random() > .5 ? '63,35,19' : '238,198,140'},${random() * .14})`
      ctx.lineWidth = .35 + random() * 1.8
      ctx.beginPath(); const y = random() * 512
      ctx.moveTo(0, y); ctx.bezierCurveTo(160, y + Math.sin(y * .045) * 12, 340, y - Math.cos(y * .025) * 10, 512, y); ctx.stroke()
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; textures.add(texture)
    return texture
  }
  const wood = mat('#e0bb92'); wood.map = woodTexture(); wood.roughness = .48
  const darkWood = mat('#af8866'); darkWood.map = wood.map; darkWood.roughness = .53
  function rounded(at: number[], size: number[], material: THREE.Material, parent: THREE.Object3D = scene, radius = .025) {
    return mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(radius, Math.min(...size) * .38)), material, at, parent)
  }
  function timber(at: number[], size: number[], dark = false, parent: THREE.Object3D = scene) {
    return rounded(at, size, dark ? darkWood : wood, parent, .012)
  }
  // The same clipped artwork as the site's SVG, printed into the two existing textures.
  function printImprint(ctx: CanvasRenderingContext2D, centerX: number, top: number, height: number) {
    ctx.save()
    ctx.font = `600 ${height * .78}px Georgia, "Songti SC", serif`
    const scale = height / 205
    const logoWidth = 284 * scale
    const gap = height * .3
    const left = centerX - (logoWidth + gap + ctx.measureText(options.siteName).width) / 2
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(options.siteName, left + logoWidth + gap, top + height * .55)
    ctx.translate(left, top)
    ctx.beginPath()
    ctx.rect(0, 0, logoWidth, height)
    ctx.clip()
    ctx.scale(scale, scale)
    ctx.translate(-138, 640 - 201)
    ctx.scale(.1, -.1)
    for (const d of logoPaths) ctx.fill(new Path2D(d))
    ctx.restore()
  }
  function paintedTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    paint(canvas.getContext('2d')!)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.add(texture); return texture
  }
  const reflections=paintedTexture(256,128,ctx=>{
    const ambient=ctx.createLinearGradient(0,0,0,128)
    ambient.addColorStop(0,'#f3eee2');ambient.addColorStop(.53,'#c1b59c');ambient.addColorStop(1,'#736049')
    ctx.fillStyle=ambient;ctx.fillRect(0,0,256,128)
    ctx.fillStyle='#fff9e9';ctx.fillRect(113,26,43,43)
    ctx.fillStyle='#6c5a47';ctx.fillRect(203,37,36,34)
  })
  reflections.mapping=THREE.EquirectangularReflectionMapping
  scene.environment=reflections;scene.environmentIntensity=.29
  const woven = paintedTexture(256, 256, ctx => {
    ctx.fillStyle = '#c4b59a'; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 256; i += 2) {
      ctx.strokeStyle = i % 4 ? '#b6a488' : '#d8ccb5'; ctx.lineWidth = .7
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke()
      ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke(); ctx.globalAlpha = 1
    }
  })
  const fabric = mat('#b4b69c'); fabric.map = woven; fabric.roughness = 1
  const brass = mat('#b59957'); brass.metalness = .65; brass.roughness = .32
  const shadowTexture = paintedTexture(64, 64, ctx => {
    const gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 32)
    gradient.addColorStop(0, '#00000080'); gradient.addColorStop(.45, '#00000040'); gradient.addColorStop(1, '#00000000')
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64)
  })
  function contact(at: number[], width: number, depth: number, opacity = .5) {
    const material = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity, depthWrite: false })
    extraMaterials.add(material)
    const plane = mesh(new THREE.PlaneGeometry(width, depth), material, at)
    plane.rotation.x = -Math.PI / 2; plane.castShadow = false; plane.receiveShadow = false
  }
  const plaster = paintedTexture(256, 256, ctx => {
    ctx.fillStyle = '#929292'; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 13000; i++) { const gray = 95 + Math.floor(random() * 65); ctx.fillStyle = `rgb(${gray},${gray},${gray})`; ctx.fillRect(random() * 256, random() * 256, 1, 1) }
  })
  plaster.colorSpace = THREE.NoColorSpace
  for (const color of ['#b4a18a', '#b8a78d', '#b9a58e', '#c2ae94', '#baa58c', '#bdaa93']) {
    mat(color).color.set('#e5e6dd'); mat(color).bumpMap = plaster; mat(color).bumpScale = .003; mat(color).roughness = 1
  }
  const floorTexture = wood.map!.clone(); floorTexture.center.set(.5, .5); floorTexture.rotation = Math.PI / 2; floorTexture.repeat.set(1, 4); textures.add(floorTexture)
  const floorMaterial = wood.clone(); floorMaterial.map = floorTexture; floorMaterial.color.set('#ceb899'); floorMaterial.roughness = .65; extraMaterials.add(floorMaterial)
  // Architectural shell, with an east-facing garden window.
  box([0, -.08, 0], [8, .16, 12], '#573e30')
  for (let i = 0; i < 18; i++) {
    const plank = timber([-3.8 + i * .45, .005, 0], [.44, .025, 12], i % 4 === 0)
    plank.material = floorMaterial
  }
  box([-4, 2.4, 0], [.16, 4.8, 12], '#b4a18a')
  // North is the picture wall; the east bay opens directly above the bench.
  const eastX = 3.18, windowStart = -3.6, windowEnd = 1.25, sill = 1.12, lintel = 3.72
  box([(eastX - 4) / 2, 2.4, -4], [eastX + 4, 4.8, .16], '#b9a58e')
  box([eastX, sill / 2, -.5], [.16, sill, 7], '#b8a78d')
  box([eastX, (4.8 + lintel) / 2, -.5], [.16, 4.8 - lintel, 7], '#b8a78d')
  for (const [start, end] of [[-4, windowStart], [windowEnd, 6]]) {
    box([eastX, 2.4, (start + end) / 2], [.16, 4.8, end - start], '#b8a78d')
  }
  box([0, 4.83, 0], [8, .08, 12], '#eee9dc')
  for (const x of [-3.9, eastX - .09]) timber([x, .12, -.5], [.08, .24, 7])
  timber([0, .12, -3.87], [8, .24, .09])
  for (let y = .48; y < 4.8; y += .38) box([(eastX - 4) / 2, y, -3.914], [eastX + 4, .009, .009], '#cbbda8')
  const windowMid = (windowStart + windowEnd) / 2
  for (const z of [windowStart, windowStart + (windowEnd-windowStart)/3, windowEnd - (windowEnd-windowStart)/3, windowEnd]) {
    timber([eastX - .09, (lintel + sill) / 2, z], [.15, lintel - sill, .08])
  }
  for (const y of [sill, 2.47, lintel]) timber([eastX - .09, y, windowMid], [.15, .085, windowEnd - windowStart + .15])
  timber([eastX - .18, sill, windowMid], [.4, .09, windowEnd-windowStart+.3])
  const outsideMat = new THREE.MeshBasicMaterial({ color: '#e0e9dd', fog: false, toneMapped: false })
  // Only outdoor pixels receive the weather grade.
  const gardenBreeze = { value: new THREE.Vector2() }
  const weatherGrade = { value: new THREE.Vector3(...gardenWeather.cloudy) }
  const nightBlend = {value:0}
  outsideMat.onBeforeCompile = shader => {
    shader.uniforms.gardenBreeze = gardenBreeze
    shader.uniforms.gardenWeather = weatherGrade
    shader.uniforms.nightBlend = nightBlend
    shader.fragmentShader = gardenShader + shader.fragmentShader.replace('#include <map_fragment>',
      '#include <map_fragment>\n#ifdef USE_MAP\n diffuseColor.rgb = gradeGarden(diffuseColor.rgb, vMapUv);\n#endif')
  }
  extraMaterials.add(outsideMat)
  const outside = mesh(new THREE.PlaneGeometry(gardenBackdrop.width, gardenBackdrop.height), outsideMat,
    [gardenBackdrop.x, gardenBackdrop.y, gardenBackdrop.z])
  outside.rotation.y = -Math.PI / 2; outside.castShadow = outside.receiveShadow = false
  const curtains = new THREE.Group()
  const railX = eastX - .56
  curtains.position.set(railX, lintel + .09, windowMid)
  curtains.rotation.y = -Math.PI / 2
  scene.add(curtains)
  const curtainFabric = mat('#d4c4a9')
  const curtainWeave = woven.clone()
  curtainWeave.wrapS = curtainWeave.wrapT = THREE.RepeatWrapping
  curtainWeave.repeat.set(4, 4)
  textures.add(curtainWeave)
  curtainFabric.map = curtainWeave
  curtainFabric.color.set('#fff8eb')
  curtainFabric.vertexColors = true
  curtainFabric.side = THREE.DoubleSide
  curtainFabric.roughness = 1
  const curtainSpan = (windowEnd - windowStart) / 2 + .28
  const curtainMotion = new CurtainMotion()
  let lastCurtainShadow = 0
  const loopGeometry = new THREE.TorusGeometry(.045, .009, 6, 12)
  const curtainPanels = [-1, 1].map(side => {
    const panel = new THREE.Group()
    panel.position.x = side * curtainSpan
    curtains.add(panel)
    const cloth = createCurtainPanel(side, curtainSpan, 2.82)
    mesh(cloth.geometry, curtainFabric, [0, 0, 0], panel)
    const loops = Array.from({ length: cloth.folds + 1 }, (_, index) => {
      const loop = mesh(loopGeometry, brass, [-side * cloth.headingWidth(0) * index / cloth.folds, 0, 0], panel)
      loop.rotation.y = Math.PI / 2
      return loop
    })
    return () => {
      const heading = curtainMotion.heading.position
      cloth.shape(heading, curtainMotion.hem.position)
      const width = cloth.headingWidth(heading)
      loops.forEach((loop, index) => { loop.position.x = -side * width * index / cloth.folds })
    }
  })
  timber([railX, lintel + .1, windowMid], [.055, .055, windowEnd-windowStart+.55], true)
  for (const z of [windowStart - .21, windowEnd + .21]) {
    const bracketDepth = eastX - .08 - railX
    mesh(new THREE.BoxGeometry(bracketDepth, .028, .03), brass, [railX + bracketDepth / 2, lintel + .12, z])
  }
  hit('curtains', [0, -1.45, 0], [curtainSpan * 2, 2.9, .10], curtains)
  // Bookshelf. The semantic hitbox stays stable while the spines move.
  const shelf = new THREE.Group(); shelf.position.set(-2.85, 0, -2.85); scene.add(shelf)
  timber([0, 1.8, -.28], [1.95, 3.6, .14], true, shelf)
  for (const x of [-1, 1]) timber([x, 1.8, .02], [.14, 3.6, .78], true, shelf)
  timber([0, 3.63, .07], [2.2, .14, .9], true, shelf)
  timber([0, 3.73, .06], [2.28, .07, .96], false, shelf)
  for (const x of [-.97, .97]) timber([x, 1.9, .445], [.08, 3.3, .035], false, shelf)
  const bookColors = ['#728779', '#c1a285', '#b77961', '#eee1bd', '#82959b', '#aaa988']
  // Each family has its own binding, paper label and imprint. The spine is
  // legible from the shelf camera without loading a separate bitmap per book.
  const bookTitles = ['FIELD NOTES', 'ON PAPER', 'BOTANICA', '小园手记', 'COLLECTED ESSAYS', '观察日记']
  const spineMaterials = bookColors.map((color, index) => {
    const material = mat(color)
    material.map = paintedTexture(160, 512, ctx => {
      ctx.fillStyle = '#fbf5e7'; ctx.fillRect(0, 0, 160, 512)
      const shade = ctx.createLinearGradient(0,0,160,0)
      shade.addColorStop(0,'#2d281b52'); shade.addColorStop(.18,'#ffffff35')
      shade.addColorStop(.75,'#ffffff00'); shade.addColorStop(1,'#46331b34')
      ctx.fillStyle=shade;ctx.fillRect(0,0,160,512)
      const dark=index===0 || index===2 || index===4
      ctx.fillStyle=dark?'#e7d8a0':'#685d46'
      for(const y of [24,32,440,448]) ctx.fillRect(14,y,132,index%2?2:4)
      if(index%2===0){ctx.fillStyle='#f1e4bf';ctx.fillRect(14,65,132,62)}
      ctx.fillStyle='#443e32';ctx.font='19px Georgia';ctx.textAlign='center';ctx.fillText('VOL. 0'+(index+1),80,103)
      ctx.save();ctx.translate(80,277);ctx.rotate(-Math.PI/2)
      ctx.font=(index%2?'bold 31px':'26px')+' Georgia, serif'
      ctx.fillText(bookTitles[index],0,8,250);ctx.restore()
      ctx.font='17px Georgia';ctx.fillText(options.siteName,80,485,120)
    })
    return material
  })
  const jacketGeo = new THREE.PlaneGeometry(1,1)
  const rowBooks: THREE.Mesh[][] = []
  for (let row = 0; row < 5; row++) {
    const pullable: THREE.Mesh[] = []
    rowBooks.push(pullable)
    const y = .42 + row * .63
    timber([0, y, .03], [1.95, .08, .78], true, shelf)
    let x = -.86
    while (x < .84) {
      if ((row === 0 || row === 3) && x > .05) break
      const width = .095 + random() * .075, height = .36 + random() * .16
      const book = rounded([x, y + height / 2 + .045, .12 + random() * .04], [width, height, .4], spineMaterials[Math.floor(random() * bookColors.length)], shelf, .008)
      if (x + width > .72 && row % 2) { book.position.x += .05; book.rotation.z = -.14 }
      const jacket = mesh(jacketGeo, book.material, [0, 0, .201], book)
      jacket.scale.set(width * .94, height * .97, 1); jacket.castShadow = false
      if (!pullable.length || (pullable.length < 3 && x - pullable[pullable.length - 1].position.x > .28)) pullable.push(book)
      x += width + .025
    }
  }
  // A few imperfectly arranged objects break the repeated book rows.
  const globe = new THREE.Group(); globe.position.set(-2.35, .83, -2.6); scene.add(globe)
  cylinder([0, -.34, 0], .12, .16, .035, '#a58b50', globe)
  cylinder([0, -.22, 0], .016, .016, .23, '#a58b50', globe)
  const orbit = mesh(new THREE.TorusGeometry(.19, .009, 8, 36), brass, [0, 0, 0], globe); orbit.rotation.z = -.35
  sphere([0, 0, 0], [.155, .155, .155], '#718277', globe)
  for (const latitude of [-.07, .07]) {
    const ring = mesh(new THREE.TorusGeometry(.14, .003, 4, 28), brass, [0, latitude, 0], globe); ring.rotation.x = Math.PI / 2
  }
  // Build a hollow case. Slide it beyond the shelf lip before lifting the lid.
  const caseTray = timber([-2.36,2.365,-2.73],[.75,.03,.80],true)
  const readingCase = new THREE.Group(); readingCase.position.set(-2.36,2.381,-2.65); scene.add(readingCase)
  const caseCloth = mat('#ad9470'), caseLining = mat('#635847')
  rounded([0,.015,0],[.66,.03,.43],caseLining,readingCase)
  for (const x of [-.316,.316]) rounded([x,.14,0],[.028,.26,.43],caseCloth,readingCase)
  for (const z of [-.205,.205]) rounded([0,.14,z],[.65,.26,.022],caseCloth,readingCase)
  const caseLid = new THREE.Group(); caseLid.position.set(0,.28,-.217); readingCase.add(caseLid)
  rounded([0,0,.217],[.695,.044,.465],mat('#c8b493'),caseLid)
  rounded([0,-.021,.217],[.60,.017,.38],caseLining,caseLid)
  const bookplate = new THREE.MeshStandardMaterial({roughness:.95,map:paintedTexture(600,360,ctx=>{
    ctx.fillStyle='#c0b08e';ctx.fillRect(0,0,600,360)
    ctx.strokeStyle='#6e6855';ctx.lineWidth=2;ctx.strokeRect(18,18,564,324);ctx.strokeRect(25,25,550,310)
    ctx.fillStyle='#545642';ctx.textAlign='center';ctx.font='21px Georgia';ctx.fillText('E X   L I B R I S',300,90)
    ctx.beginPath();ctx.moveTo(286,180);ctx.quadraticCurveTo(303,157,319,115);ctx.stroke()
    for (let i=0;i<3;i++) {
      ctx.beginPath();ctx.ellipse(293+8*i,158-15*i,12,5,.76,0,Math.PI*2);ctx.fill()
      ctx.beginPath();ctx.ellipse(311+6*i,151-15*i,11,4,-.76,0,Math.PI*2);ctx.fill()
    }
    ctx.font='34px Georgia,"SimSun",serif';ctx.fillText(options.en?'For a quiet hour':'留 待 闲 时',300,232)
    printImprint(ctx,300,261,28)
  })});extraMaterials.add(bookplate)
  mesh(new THREE.PlaneGeometry(.48,.27),bookplate,[0,-.032,.217],caseLid).rotation.x=Math.PI/2
  const plate = mat('#ffedcc').clone(); extraMaterials.add(plate)
  plate.map = paintedTexture(512,144,ctx => {
    ctx.fillStyle='#faf0d5';ctx.fillRect(0,0,512,144);ctx.fillStyle='#514d39'
    ctx.textAlign='center';ctx.font='62px Georgia,"SimSun",serif';ctx.fillText(options.en?'READ LATER':'待 阅 匣',256,92)
  })
  rounded([0,.143,.22],[.33,.108,.014],brass,readingCase)
  mesh(new THREE.PlaneGeometry(.283,.081),plate,[0,.143,.229],readingCase)
  const indexCards = new THREE.Group(); readingCase.add(indexCards)
  const ruledCard = new THREE.MeshStandardMaterial({roughness:1,map:paintedTexture(320,160,ctx=>{
    ctx.fillStyle='#f0e5ca';ctx.fillRect(0,0,320,160);ctx.fillStyle='#a19172'
    for(const y of [58,79,100,121])ctx.fillRect(18,y,284,1)
    ctx.fillStyle='#735f44';ctx.font='14px Georgia';ctx.fillText('READING  /  FILE',18,33)
  })});extraMaterials.add(ruledCard)
  for(let i=0;i<3;i++) {
    const card=rounded([-.018+.014*i,.185+.016*i,.014*i],[.52,.012,.27],mat(['#baab8d','#ddd0a9','#efe0bb'][i]),indexCards)
    card.rotation.y=.065*(i-1);card.rotation.x=.29
    mesh(new THREE.PlaneGeometry(.51,.26),ruledCard,[0,.0065,0],card).rotation.x=-Math.PI/2
  }
  hit('readingBox',[0,.15,0],[.70,.32,.46],readingCase).userData.shelfIndex=0
  timber([0, .2, .1], [2, .4, .78], true, shelf)
  for (const x of [-.48, .48]) {
    timber([x, .22, .515], [.87, .32, .04], false, shelf)
    timber([x, .22, .54], [.73, .2, .018], true, shelf)
  }
  for (const x of [-.48, .48]) box([x, .23, .5], [.025, .06, .035], '#b99958', shelf)
  hit('bookshelf', [-2.85, 1.85, -2.45], [2.22, 3.74, .68]).userData.shelfIndex=0
  // Writing desk.
  const deskStart = scene.children.length
  const desk = new THREE.Group(); desk.position.set(.5, 0, -2.45); scene.add(desk)
  const deskSurfaceY = 1
  {
    const excerpt = options.note?.excerpt ?? (options.en ? 'From the study' : '书房手记')
    const date = options.note?.date ?? ''
    const paperArt = paintedTexture(512,412, ctx => {
      const stock = ctx.createLinearGradient(0,0,440,412)
      stock.addColorStop(0,'#fff2c2'); stock.addColorStop(1,'#ebce83')
      ctx.fillStyle = stock; ctx.fillRect(0,0,512,412)
      ctx.fillStyle='#7d6949'; ctx.font='22px Georgia'; ctx.fillText(date,34,58)
      ctx.fillStyle='#4c4234'; ctx.font='46px "KaiTi","STKaiti",Georgia,serif'
      const lines: string[] = []
      let line = ''
      for (const character of excerpt) {
        if (line && ctx.measureText(line + character).width > 430) { lines.push(line); line = '' }
        line += character
      }
      if (line) lines.push(line)
      lines.slice(0,4).forEach((text,index) => ctx.fillText(index === 3 && lines.length > 4 ? text.slice(0,-1)+'…' : text,34,145 + index*57))
      ctx.fillStyle='#866045'; printImprint(ctx,330,341,38)
      ctx.fillStyle='#d6b87a'; ctx.beginPath(); ctx.moveTo(512,351); ctx.lineTo(512,412); ctx.lineTo(451,412); ctx.fill()
    })
    const paper = new THREE.MeshStandardMaterial({map:paperArt,side:THREE.DoubleSide,roughness:1})
    extraMaterials.add(paper)
    const noteStand = new THREE.Group()
    noteStand.position.set(-1.34,deskSurfaceY,-.36)
    noteStand.rotation.y=.14
    desk.add(noteStand)
    rounded([0,.024,0],[.38,.048,.12],darkWood,noteStand,.009)
    const slip = mesh(new THREE.PlaneGeometry(.46,.37),paper,[0,.218,0],noteStand)
    slip.rotation.set(-.16,0,-.045)
    hit('note',[0,0,0],[.47,.38,.035],slip)
  }
  timber([0, deskSurfaceY - .06, 0], [3.7, .12, 1.72], false, desk)
  timber([0, .875, .83], [3.65, .06, .04], true, desk)
  for (const x of [-1.68, 1.76]) for (const z of [-.48, .48]) timber([x, .45, z], [.09, .9, .09], true, desk)
  const cabinetX = 1.35
  for (const side of [-1, 1]) timber([cabinetX + side * .38, .64, 0], [.04, .46, 1.1], true, desk)
  timber([cabinetX, .64, -.53], [.73,.46,.04], true, desk)
  for (const y of [.41, .623, .855]) timber([cabinetX, y, 0], [.76,.024,1.1], true, desk)

  const drawerTravel = .76
  const drawers = [.735, .52].map((y, index) => {
    const drawer = new THREE.Group()
    drawer.position.set(cabinetX, y, 0); desk.add(drawer)
    timber([0, 0, .58], [.746,.183,.05], false, drawer)
    timber([0,-.074,.065], [.69,.022,.98], false, drawer)
    for (const side of [-1, 1]) timber([side * .336,-.004,.064], [.024,.15,.98], false, drawer)
    timber([0,-.004,-.416], [.68,.15,.026], false, drawer)
    rounded([0,-.060,.067], [.645,.006,.93], mat('#76725b'), drawer)
    for (const x of [-.105, .105]) {
      const rose = cylinder([x,0,.612],.024,.024,.012,'#ab8e60',drawer)
      rose.rotation.x = Math.PI / 2
    }
    const pull = new THREE.CatmullRomCurve3([[-.105,0,.616],[-.105,-.016,.648],[0,-.023,.655],[.105,-.016,.648],[.105,0,.616]].map(([x,h,z]) => new THREE.Vector3(x,h,z)))
    mesh(new THREE.TubeGeometry(pull,16,.009,8,false),brass,[0,0,0],drawer)
    // Index cards lie inside the box and travel with it.
    const cards = new THREE.Group()
    cards.position.set(index ? .07 : -.06,-.056,.30)
    cards.rotation.y = index ? .13 : -.10; drawer.add(cards)
    rounded([-.028,.007,-.014],[.39,.014,.23],mat('#cdbb93'),cards)
    rounded([0,.017,0],[.39,.013,.23],mat('#f4e6ce'),cards)
    box([-.10,.0245,-.047],[.115,.002,.012],index ? '#936a51' : '#607965',cards)
    for (const [line, length] of [.27,.21,.24].entries()) {
      box([-.155 + length / 2,.0245,-.013 + line * .027],[length,.002,.003],'#baa88a',cards)
    }
    hit('drawer', [0,0,.6], [.76,.205,.16], drawer).userData.drawerIndex = index
    return drawer
  })
  const leather = mat('#406650'); leather.map = woven
  leather.roughness = .68
  leather.emissive.set('#305841')
  leather.emissiveIntensity = .13

  contact([.5, .042, -2.3], 4.3, 2.2, .7)
  // One loose clothbound journal. The page block stays on the table while
  // the cover and its facing page rotate together around the bound edge.
  const diary = new THREE.Group()
  diary.position.set(-.19, 1.003, -2.27); diary.rotation.y = -.29; scene.add(diary)
  const diaryKey = 'study-notebook-position-v1'
  function placeDiary(x: number, z: number) {
    // Leave room to unfold the cover on the left and for the mug on the right.
    diary.position.x = THREE.MathUtils.clamp(x, -.34, .54)
    diary.position.z = THREE.MathUtils.clamp(z, -2.78, -2.16)
    diary.updateWorldMatrix(true, true)
  }
  try {
    const saved = JSON.parse(sessionStorage.getItem(diaryKey) || 'null')
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.z)) placeDiary(saved.x, saved.z)
  } catch { /* A fresh notebook position is fine without storage. */ }
  function journalBoard(parent: THREE.Object3D, x: number, y: number) {
    const shape = new THREE.Shape(), w = .31, h = .405, r = .032
    shape.moveTo(-w+r,-h); shape.lineTo(w-r,-h); shape.quadraticCurveTo(w,-h,w,-h+r)
    shape.lineTo(w,h-r); shape.quadraticCurveTo(w,h,w-r,h); shape.lineTo(-w+r,h)
    shape.quadraticCurveTo(-w,h,-w,h-r); shape.lineTo(-w,-h+r); shape.quadraticCurveTo(-w,-h,-w+r,-h)
    const geo = new THREE.ExtrudeGeometry(shape, {depth:.012, bevelEnabled:true, bevelThickness:.003, bevelSize:.003, bevelSegments:2, curveSegments:8})
    geo.rotateX(-Math.PI/2); mesh(geo, leather, [x,y,0], parent)
  }
  journalBoard(diary, 0, .003)
  rounded([0,.047,0], [.59,.061,.785], mat('#e4d6b8'), diary, .008)
  rounded([-.3,.050,0], [.031,.090,.806], leather, diary, .014)
  const hinge = new THREE.Group(); hinge.position.set(-.30,.084,0); diary.add(hinge)
  journalBoard(hinge, .30, 0)
  const foil = new THREE.MeshStandardMaterial({transparent:true, roughness:.62, depthWrite:false,
    map:paintedTexture(384,512,ctx => {
      ctx.strokeStyle='#d6c394';ctx.lineWidth=2;ctx.strokeRect(22,19,343,473)
      ctx.strokeStyle='#bbad83';ctx.lineWidth=1;ctx.strokeRect(27,24,333,463)
      ctx.fillStyle='#eee2c5';ctx.textAlign='center';ctx.font='38px Georgia, serif';ctx.fillText('日 记',192,233)
      ctx.font='italic 19px Georgia';ctx.fillText('Everyday notes',192,270)
      ctx.strokeStyle='#d7c292';ctx.beginPath();ctx.moveTo(164,298);ctx.lineTo(220,298);ctx.stroke()
      ctx.fillStyle='#d6c394';printImprint(ctx,192,395,38)
    })})
  extraMaterials.add(foil)
  const stamp = mesh(new THREE.PlaneGeometry(.61,.80),foil,[.30,.016,0],hinge)
  stamp.rotation.x=-Math.PI/2; stamp.castShadow=false
  const pages = mat('#f7ecd6')
  pages.map = paintedTexture(512,384,ctx => {
    ctx.fillStyle='#ede2ca';ctx.fillRect(0,0,512,384);ctx.strokeStyle='#baad96'
    for(let y=60;y<350;y+=24){ctx.beginPath();ctx.moveTo(20,y);ctx.lineTo(235,y);ctx.moveTo(280,y);ctx.lineTo(493,y);ctx.stroke()}
  })
  function journalPage(parent: THREE.Object3D, underside: boolean) {
    const geo = new THREE.PlaneGeometry(.578,.767,20,4)
    const pos=geo.attributes.position, uv=geo.attributes.uv
    for(let i=0;i<pos.count;i++){
      const u=uv.getX(i), v=uv.getY(i)
      pos.setXYZ(i,pos.getX(i), (underside ? -1 : 1)*.004*Math.sin(u*Math.PI),(.5-v)*.767)
      uv.setX(i,underside ? .5*(1-u) : .5+.5*u)
    }
    if(underside){const indices=geo.index!;for(let i=0;i<indices.count;i+=3){const a=indices.getX(i);indices.setX(i,indices.getX(i+1));indices.setX(i+1,a)}}
    geo.computeVertexNormals()
    mesh(geo,pages,[underside ? .298 : 0, underside ? -.004 : .079, 0],parent)
  }
  journalPage(diary,false); journalPage(hinge,true)
  const edgeMat = new THREE.MeshStandardMaterial({roughness:.98,map:paintedTexture(64,64,ctx=>{
    ctx.fillStyle='#e6d9be';ctx.fillRect(0,0,64,64)
    for(let y=5;y<64;y+=7){ctx.fillStyle=y%2?'#cbbfa8':'#d7cbb1';ctx.fillRect(0,y,64,1)}
  })}); extraMaterials.add(edgeMat)
  mesh(new THREE.PlaneGeometry(.574,.054),edgeMat,[0,.047,.393],diary)
  const fore=mesh(new THREE.PlaneGeometry(.77,.054),edgeMat,[.296,.047,0],diary);fore.rotation.y=Math.PI/2
  const ribbonGeo=new THREE.PlaneGeometry(.027,.16,1,12), ribbonPos=ribbonGeo.attributes.position
  for(let i=0;i<ribbonPos.count;i++){
    const t=.08-ribbonPos.getY(i)
    ribbonPos.setXYZ(i,ribbonPos.getX(i)+.07+t*.18,.052-.049*THREE.MathUtils.smoothstep(t,.033,.095),.366+t)
  }
  ribbonGeo.computeVertexNormals()
  const ribbon=mat('#945447');ribbon.side=THREE.DoubleSide
  mesh(ribbonGeo,ribbon,[0,0,0],diary)
  hit('diary', [0,.06,0], [.65,.13,.84], diary)
  // Laptop, pencil, mug and stationery.
  const laptop = new THREE.Group()
  laptop.position.set(.94, deskSurfaceY, -.09)
  laptop.rotation.y = -.14
  desk.add(laptop)

  // The lower shell rests at local y=0. Keep its contact shadow in the same
  // frame so it stays attached even when real-time shadows are disabled.
  const footprint = paintedTexture(256, 192, ctx => {
    ctx.fillStyle = '#44382e'
    ctx.shadowColor = 'rgba(54,40,27,.44)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetX = -5
    ctx.shadowOffsetY = 2
    ctx.beginPath()
    ctx.roundRect(32, 30, 192, 132, 7)
    ctx.fill()
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.fill()
  })
  const contactMaterial = new THREE.MeshBasicMaterial({
    map: footprint, transparent: true, opacity: .72, depthWrite: false, toneMapped: false,
  })
  extraMaterials.add(contactMaterial)
  const baseShadow = mesh(new THREE.PlaneGeometry(1.12, .82), contactMaterial, [0, .001, 0], laptop)
  baseShadow.rotation.x = -Math.PI / 2
  baseShadow.castShadow = baseShadow.receiveShadow = false
  const alloy = mat('#929995')
  alloy.metalness = .38
  alloy.roughness = .48
  rounded([0, .011, 0], [.83, .022, .56], mat('#474e4e'), laptop, .009)
  rounded([0, .033, 0], [.84, .032, .57], alloy, laptop, .012)

  const lid = new THREE.Group()
  lid.position.set(0, .057, -.25)
  lid.rotation.x = -.24
  laptop.add(lid)
  const barrel = cylinder([0, .057, -.25], .021, .021, .67, '#4b5050', laptop)
  barrel.rotation.z = Math.PI / 2
  rounded([0, .246, 0], [.84, .498, .031], mat('#313838'), lid, .012)
  const screenMaterial = new THREE.MeshStandardMaterial({ roughness:.42, metalness:.06 })
  extraMaterials.add(screenMaterial)
  screenMaterial.map = paintedTexture(768,424,ctx => paintPortfolioCover(ctx, options.projects.map(p=>p.title), options.en, options.siteName))
  screenMaterial.emissive.set('#cbe5ff'); screenMaterial.emissiveMap = screenMaterial.map; screenMaterial.emissiveIntensity = .52
  const screenGlass = new THREE.PlaneGeometry(.79,.435)
  const display = mesh(screenGlass, screenMaterial, [0,.248,.0165], lid)
  display.castShadow = false
  display.receiveShadow = false
  const screenFlight = new ScreenFlight(display,screenGlass.parameters.width,screenGlass.parameters.height)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 11; col++) {
      box([(col - 5) * .064, .052, -.18 + row * .052], [.054, .006, .039], '#414c50', laptop)
    }
  }
  rounded([0,.050,.144], [.24,.002,.114], mat('#7c8583'), laptop, .001)
  hit('computer', [0, .275, -.04], [.87, .55, .71], laptop)
  const mugStart = scene.children.length
  cylinder([.65, 1.16, -1.99], .105, .09, .25, '#c2aa7f')
  cylinder([.65, 1.29, -1.99], .083, .083, .005, '#483326')
  const handle = mesh(new THREE.TorusGeometry(.08, .018, 8, 16), mat('#c2aa7f'), [.77, 1.18, -1.99]); handle.rotation.y = Math.PI / 2
  cylinder([.65, 1.015, -1.99], .145, .145, .009, '#9a7752')
  const mugLip = mesh(new THREE.TorusGeometry(.099, .009, 8, 24), mat('#dfcba7'), [.65, 1.285, -1.99]); mugLip.rotation.x = Math.PI / 2
  contact([.65, 1.009, -1.99], .43, .43, .65)
  const mug = new THREE.Group(); mug.add(...scene.children.slice(mugStart))
  mug.position.set(1.36,0,.07); scene.add(mug)
  hit('tea', [.69, 1.16, -1.99], [.34, .32, .28], mug)
  const vapour = paintedTexture(80,128,ctx => {
    for (let y = 9; y < 122; y += 4) {
      const x = 40 + Math.sin(y / 22) * 9
      const mist = ctx.createRadialGradient(x,y,0,x,y,9)
      mist.addColorStop(0,'rgba(255,248,231,.32)')
      mist.addColorStop(1,'rgba(255,248,231,0)')
      ctx.fillStyle = mist
      ctx.fillRect(x-9,y-9,18,18)
    }
  })
  const steam = [0,1].map(() => {
    const material = new THREE.SpriteMaterial({map:vapour,transparent:true,depthWrite:false,opacity:0})
    extraMaterials.add(material)
    const wisp = new THREE.Sprite(material)
    mug.add(wisp)
    return wisp
  })
  const pencil = cylinder([1.05, 1.012, -1.82], .009, .009, .32, '#c6934c')
  pencil.rotation.x = Math.PI/2; pencil.rotation.y = .32
  cylinder([1.11, 1.13, -3.10], .075, .06, .24, '#d8c49d')
  for (let i = 0; i < 5; i++) {
    const pen = cylinder([1.08 + i * .013, 1.28, -3.10], .006, .006, .32, i % 2 ? '#6a604d' : '#ba965c')
    pen.rotation.z = (i - 2) * .07
  }
  const lampStart = scene.children.length
  // Brass reading lamp, at the rear right of the desktop.
  cylinder([-.77, 1.03, -2.72], .16, .18, .045, '#99713d')
  cylinder([-.77, 1.38, -2.72], .017, .017, .7, '#b39452')
  const neck = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.77,1.70,-2.72), new THREE.Vector3(-.765,1.87,-2.72),
    new THREE.Vector3(-.69,2.005,-2.70), new THREE.Vector3(-.54,2.03,-2.68),
    new THREE.Vector3(-.47,1.97,-2.66)])
  mesh(new THREE.TubeGeometry(neck,24,.018,10,false),brass,[0,0,0])
  cylinder([-.77,1.13,-2.72],.042,.055,.14,'#ab895b')
  const hood = new THREE.Group();hood.position.set(-.47,1.71,-2.66);hood.rotation.z = -.17; scene.add(hood)
  const profile=[[.275,0],[.278,.015],[.262,.058],[.197,.169],[.098,.219],[.035,.231]]
  mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),48),brass,[0,0,0],hood)
  const lining=mat('#fff1d3');lining.side=THREE.BackSide;lining.emissive.set('#ffc480');lining.emissiveIntensity=.20
  mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r*.975,y)),48),lining,[0,.002,0],hood)
  cylinder([0,.24,0],.035,.043,.065,'#a38253',hood)
  const rim=mesh(new THREE.TorusGeometry(.276,.008,8,48),brass,[0,.004,0],hood);rim.rotation.x=Math.PI/2
  const bulbMaterial = mat('#ffdaad', true)
  const bulb=mesh(new THREE.SphereGeometry(.065,18,12),bulbMaterial,[0,.016,0],hood);bulb.scale.y=.67
  const lamp=new THREE.PointLight('#ffcf94',2.8,3.4,2);lamp.position.set(0,-.10,0);hood.add(lamp)
  contact([-.77, 1.01, -2.72], .65, .55, .5)
  const lampGroup = new THREE.Group(); lampGroup.add(...scene.children.slice(lampStart))
  lampGroup.position.set(2.82, 0, -.18); scene.add(lampGroup)
  hit('lamp', [0,.14,0], [.57,.34,.56], hood)
  hit('lamp', [-.77,1.49,-2.72], [.14,1,.16], lampGroup)
  hit('lamp', [-.77,1.05,-2.72], [.38,.15,.38], lampGroup)
  // Move the writing island as a unit, including its picking meshes.
  const deskShift = new THREE.Vector3(-.38, 0, 1.05)
  const island = new THREE.Group(); island.add(...scene.children.slice(deskStart))
  island.position.copy(deskShift); scene.add(island)
  // Framed print on the solid north wall.
  timber([-.95, 2.45, -3.86], [.68, .85, .075], true)
  box([-.95, 2.45, -3.81], [.57, .74, .01], '#b5a287')
  box([-.95, 2.45, -3.795], [.47, .6, .01], '#596a6b')
  sphere([-.86, 2.6, -3.78], [.075, .075, .008], '#d4a269')
  box([-.95, 2.25, -3.78], [.47, .18, .008], '#374e4a')
  const photoPaper = rounded([-1.86, 1.81, -3.82], [.36, .42, .018], mat('#e6d8b7')); photoPaper.rotation.z = -.12
  box([-1.86, 1.82, -3.803], [.29, .29, .006], '#8b9787')
  const pin = sphere([-1.85, 2.02, -3.77], [.018, .018, .012], '#c4a261'); pin.material = brass
  hit('portrait', [-.95, 2.45, -3.75], [.75, .92, .1])
  hit('portrait', [-1.86, 1.81, -3.79], [.40,.47,.08])
  // A ceramic rocker on the picture wall, just above desk height.
  const wallSwitch = new THREE.Group()
  wallSwitch.position.set(-.86, 1.54, -3.903)
  scene.add(wallSwitch)
  rounded([0, 0, .014], [.17, .22, .028], brass, wallSwitch, .012)
  rounded([0, 0, .031], [.154, .203, .021], mat('#e1d3b6'), wallSwitch, .009)
  const rocker = rounded([0, 0, .053], [.105, .148, .027], mat('#f1e8d7'), wallSwitch, .009)
  rounded([0, .041, .015], [.031, .008, .003], mat('#e6b26b', true), rocker, .001)
  hit('ceilingLight', [0, 0, .061], [.30, .33, .075], wallSwitch)

  cylinder([-.25, 4.74, -2.25], .32, .34, .10, '#8b704d')
  const opal = new THREE.MeshStandardMaterial({color: '#eee4d2', emissive: '#fff0d9', roughness: .68})
  extraMaterials.add(opal)
  const diffuser = mesh(new THREE.SphereGeometry(1, 32, 12), opal, [-.25, 4.69, -2.25])
  diffuser.scale.set(.315, .093, .315)
  // Textured, curled foliage with stems rooted in glazed pots. One shared
  // leaf mesh bends at its midrib; cutout materials avoid alpha sort issues.
  const foliage = [mat('#c4d5aa'), mat('#e6e6b9')]
  for(const m of foliage){m.side=THREE.DoubleSide;m.alphaTest=.48;m.roughness=.72}
  const leafGeo=new THREE.PlaneGeometry(.30,.43,6,8)
  const lv=leafGeo.attributes.position
  for(let i=0;i<lv.count;i++){
    const x=lv.getX(i),t=lv.getY(i)/.43+.5
    lv.setXYZ(i,x,t*.43, .10*Math.sin(t*Math.PI*.85)-.30*x*x)
  }
  leafGeo.computeVertexNormals()
  function plant(x: number,y: number,z: number,scale: number) {
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);scene.add(g)
    const profile=[[.11,0],[.14,.02],[.185,.23],[.176,.29],[.162,.305],[.149,.302]]
    mesh(new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),32),mat('#d6c8b4'),[0,0,0],g)
    cylinder([0,.283,0],.151,.151,.012,'#564a37',g)
    for(let i=0;i<11;i++){
      const a=i*2.40, r=.09+.20*random(), h=.41+.30*random()
      const end=new THREE.Vector3(Math.sin(a)*r,h,Math.cos(a)*r)
      const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,.277,0),new THREE.Vector3(end.x*.40,h+.02,end.z*.40),end)
      mesh(new THREE.TubeGeometry(curve,5,.006,4,false),mat('#788455'),[0,0,0],g)
      const l=mesh(leafGeo,foliage[i%2],end.toArray(),g)
      l.rotation.set(.35+(i%4)*.31,a,.3,'YXZ');l.scale.set(.63+random()*.29,.77+random()*.34,1)
      leaves.push({mesh:l,angle:a})
    }
  }
  plant(-3.4,3.78,-2.8,.78);plant(2.68,.03,-3.18,1.95)
  for(let strand=0;strand<3;strand++){
    const points=Array.from({length:10},(_,i)=>new THREE.Vector3(-3.4+strand*.12+.09*Math.sin(i*.8+strand),3.95-i*.14,-2.35+.07*Math.sin(i*.4)))
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),18,.008,4,false),mat('#788455'),[0,0,0])
    points.slice(1).forEach((v,i)=>{const l=mesh(leafGeo,foliage[i%2],v.toArray());l.rotation.set(.13,.3*(i%3-1),(i%2?1:-1)*2.45);l.scale.setScalar(.58)})
  }
  // Textiles and a modest foreground chair, below the main sightlines.
  const rug = box([0, .04, .4], [3.8, .025, 2.3], '#bda989'); rug.material = mat('#c4ae8b'); (rug.material as THREE.MeshStandardMaterial).map = woven
  for (let i = 0; i < 18; i++) box([-1.75 + i * .2, .055, .4], [.012, .004, 2.2], '#b5a48b')
  const chair = new THREE.Group(); chair.position.set(-1.1, 0, .74); chair.rotation.y = -.4; scene.add(chair)
  rounded([0, .45, 0], [.75, .17, .75], fabric, chair, .07)
  rounded([0, .8, .3], [.76, .64, .16], fabric, chair, .06)
  for (const x of [-.43, .43]) {
    timber([x, .64, -.03], [.07, .07, .84], true, chair)
    timber([x, .4, -.32], [.045, .52, .045], true, chair)
  }
  const cushion = rounded([.05, .66, .12], [.48, .35, .15], mat('#7d8768'), chair, .08); cushion.rotation.z = -.13
  const throwMaterial = mat('#c8b694'); throwMaterial.map = woven; throwMaterial.side = THREE.DoubleSide
  const throwGeo = new THREE.PlaneGeometry(.36, 1.05, 12, 28)
  const throwVertices = throwGeo.attributes.position
  for (let i = 0; i < throwVertices.count; i++) {
    const y = throwVertices.getY(i)
    throwVertices.setZ(i, .025 * Math.sin(throwVertices.getX(i) * 70) + .1 * Math.cos(y * 4))
  }
  throwGeo.computeVertexNormals()
  const throwCloth = mesh(throwGeo, throwMaterial, [-.25, .65, .44], chair); throwCloth.rotation.x = -.1
  for (let i = 0; i < 12; i++) cylinder([-.42 + i * .03, .11, .44], .004, .004, .07, '#c8b694', chair)
  for (const x of [-.3, .3]) for (const z of [-.25, .25]) timber([x, .23, z], [.045, .46, .045], true, chair)
  // West book wall continues the existing corner bookcase into the room.
  // Leave a few spines per row free to move; the rest share static batches.
  function batchBookcase(group: THREE.Group) {
    group.updateWorldMatrix(true,true)
    const inverse=group.matrixWorld.clone().invert()
    const parts = new Map<string,{ material: THREE.Material; cast: boolean; geometries: THREE.BufferGeometry[] }>()
    group.traverse(object=>{
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return
      const key=object.material.uuid+object.castShadow
      let part=parts.get(key)
      if(!part){part={material:object.material,cast:object.castShadow,geometries:[]};parts.set(key,part)}
      const copy=object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()
      copy.applyMatrix4(inverse.clone().multiply(object.matrixWorld));part.geometries.push(copy)
    })
    const batches=[...parts.values()].map(part=>({part,geometry:mergeGeometries(part.geometries)}))
    for(const {part} of batches) part.geometries.forEach(g=>g.dispose())
    if(batches.some(b=>!b.geometry)){batches.forEach(b=>b.geometry?.dispose());return}
    group.clear()
    for(const {part,geometry} of batches){
      const batch=mesh(geometry!,part.material,[0,0,0],group);batch.castShadow=part.cast
    }
  }
  shelf.remove(...rowBooks.flat())
  batchBookcase(shelf)
  const westShelf = shelf.clone(true)
  westShelf.position.set(-3.65, 0, -.35); westShelf.rotation.y = Math.PI / 2
  scene.add(westShelf)
  const markedVolumes: {book:THREE.Mesh; rest:number; binding:THREE.MeshStandardMaterial; shelfIndex:number; tier:number; start:number}[]=[]
  let chosenVolume: typeof markedVolumes[number] | undefined
  const caseShelves = [shelf,westShelf]
  for (const [side,group] of caseShelves.entries()) {
    for (const [row,volumes] of rowBooks.entries()) for (const original of volumes) {
      const book = side ? original.clone(true) : original
      const binding = (book.material as THREE.MeshStandardMaterial).clone();extraMaterials.add(binding)
      book.material = (book.children[0] as THREE.Mesh).material = binding
      group.add(book)
      markedVolumes.push({book,rest:book.position.z,binding,shelfIndex:side,tier:row,start:0})
    }
  }
  // Match plates to live categories. Unlabelled wood still opens the full index.
  const labelMaterials = new Map<string,THREE.MeshStandardMaterial>()
  const plates: {name?: string; tier: number; side: number; holder: THREE.Group; label: THREE.Mesh; metal: THREE.MeshStandardMaterial}[] = []
  const rails: THREE.Group[] = []
  function categoryLabel(name: string) {
    const cached = labelMaterials.get(name)
    if (cached) return cached
    const material = new THREE.MeshStandardMaterial({roughness:.92,map:paintedTexture(512,112,ctx=>{
      ctx.fillStyle='#e3d4b6';ctx.fillRect(0,0,512,112)
      ctx.fillStyle='#4c483c';ctx.textAlign='center';ctx.font='56px Georgia,"SimSun",serif'
      ctx.fillText(name,256,76,460)
    })})
    labelMaterials.set(name,material);extraMaterials.add(material)
    return material
  }
  const indexPaper = new THREE.MeshStandardMaterial({roughness:.88, map:paintedTexture(640,88,ctx => {
    ctx.fillStyle='#eee3c9';ctx.fillRect(0,0,640,88)
    ctx.textAlign='center';ctx.fillStyle='#4d4937';ctx.font='43px Georgia,"SimSun",serif'
    ctx.fillText(options.en ? 'Library catalog' : '馆 藏 目 录',320,59)
  })})
  extraMaterials.add(indexPaper)
  for (const [side,group] of caseShelves.entries()) {
    const rail = new THREE.Group()
    rails.push(rail); group.add(rail); rail.visible = side === 0
    rounded([.43,1.68,.447],[.83,.115,.028],brass,rail,.012)
    mesh(new THREE.PlaneGeometry(.77,.082),indexPaper,[.43,1.68,.463],rail)
    const categoryList = options.categories
    for (const [i,row] of [2,3,1,4,0].entries()) {
      const category=i < categoryList.length ? categoryList[(i+(side ? Math.min(5,Math.ceil(categoryList.length/2)) : 0))%categoryList.length] : null
      const y=.42+row*.63, halfRow=row===0||row===3
      const metal = brass.clone()
      metal.emissive.set('#e4ab5f'); metal.emissiveIntensity = 0
      extraMaterials.add(metal)
      const holder = new THREE.Group()
      group.add(holder); holder.visible = !!category
      rounded([-.37,y,.443],[.53,.09,.018],metal,holder)
      const label = mesh(new THREE.PlaneGeometry(.48,.068),categoryLabel(category?.name || ''),[-.37,y,.454],holder)
      plates.push({name:category?.name,tier:row,side,metal,holder,label})
      if (!category) continue
      const zone=hit('bookshelf',[halfRow ? -.44 : 0,y+.24,.375],[halfRow ? 1 : 1.89,.58,.15],group)
      Object.assign(zone.userData,{categoryId:category.id,shelfIndex:side,tier:row})
    }
  }
  // A ribbon comes from beneath a book, lies across the lip and hangs down.
  // Add it after batching so the adjoining bookcase does not clone the ribbon.
  const bookRibbon = new THREE.Group()
  bookRibbon.position.set(.27,1.094,.435)
  shelf.add(bookRibbon)
  const ribbonCloth = mat('#a34f3e')
  mesh(new THREE.BoxGeometry(.137,.007,.157),ribbonCloth,[0,.001,-.076],bookRibbon)
  const tail = new THREE.Shape()
  tail.moveTo(-.069,0); tail.lineTo(.069,0); tail.lineTo(.069,-.30)
  tail.lineTo(0,-.248); tail.lineTo(-.069,-.30); tail.closePath()
  const ribbonTail = mesh(new THREE.ShapeGeometry(tail),ribbonCloth,[0,0,.005],bookRibbon)
  ribbonTail.rotation.x = -.075
  const stitch = mat('#d7b684')
  for (const x of [-.053,.053]) mesh(new THREE.BoxGeometry(.003,.238,.002),stitch,[x,-.135,.003],ribbonTail)
  const diamond = mesh(new THREE.PlaneGeometry(.028,.028),stitch,[0,-.206,.004],ribbonTail)
  diamond.rotation.z=Math.PI/4
  hit('bookmark',[0,-.14,.014],[.22,.35,.045],bookRibbon).userData.shelfIndex=0
  hit('bookshelf', [-3.35, 1.85, -.35], [.7, 3.74, 2.22]).userData.shelfIndex=1
  const bench = new THREE.Group(); bench.position.set(2.60, 0, -1.4); scene.add(bench)
  // Open window seat. Baskets sit inside the bays rather than on the facade.
  for (const z of [-1.65,-.55,.55,1.65]) timber([0,.34,z],[1.05,.64,.055],false,bench)
  for (const y of [.08,.67]) timber([0,y,0],[1.13,.085,3.38],false,bench)
  const cushionCloth = mat('#f2e8d6')
  rounded([0,.80,0],[1.10,.20,3.32],cushionCloth,bench,.09)
  const wicker = paintedTexture(256,192,ctx=>{
    ctx.fillStyle='#9e7954';ctx.fillRect(0,0,256,192)
    for(let y=0;y<192;y+=9) for(let x=-18;x<256;x+=36){
      const xx=x+((y/9)%2)*18
      const grad=ctx.createLinearGradient(0,y,0,y+8)
      grad.addColorStop(0,'#ad8b64');grad.addColorStop(.38,'#d3b28b');grad.addColorStop(1,'#ac8b67')
      ctx.fillStyle=grad;ctx.fillRect(xx,y,34,7)
    }
  })
  const basketMaterial=mat('#e9d3b0');basketMaterial.map=wicker
  for(const z of [-1.10,0,1.10]){
    rounded([-.03,.34,z],[.94,.45,.90],basketMaterial,bench,.045)
    rounded([-.51,.41,z],[.014,.048,.22],mat('#695342'),bench,.02)
  }
  const pillowFabric=[mat('#87997d'),mat('#d4c0a5')]
  for(const [i,z] of [-.95,.23].entries()){
    // Two plump faces taper into a sewn perimeter instead of a box bevel.
    const geo=new THREE.SphereGeometry(1,40,24), v=geo.attributes.position
    const power=(n:number,e:number)=>Math.sign(n)*Math.pow(Math.abs(n),e)
    for(let j=0;j<v.count;j++){
      const x=v.getX(j),y=v.getY(j),w=v.getZ(j)
      v.setXYZ(j,.164*power(x,.89),.32*power(y,.56),.38*power(w,.55))
    }
    geo.computeVertexNormals()
    const pillow=mesh(geo,pillowFabric[i],[-.30,1.17,z],bench)
    pillow.rotation.set(i?-.10:.15,.06,-.24)
    const seam=Array.from({length:48},(_,k)=>{
      const t=k/48*Math.PI*2
      return new THREE.Vector3(0,.32*power(Math.sin(t),.56),.38*power(Math.cos(t),.55))
    })
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seam,true),64,.007,5,true),pillowFabric[i],[0,0,0],pillow)
  }
  const blanketGeo=new THREE.PlaneGeometry(.64,1.45,20,40)
  const bv=blanketGeo.attributes.position
  for(let i=0;i<bv.count;i++){
    const u=bv.getX(i), t=bv.getY(i)+.725, fold=.014*Math.cos(u*47)+.009*Math.sin(u*23+t)
    bv.setXYZ(i, .31-Math.min(t,.90), .916 - Math.max(t-.9,0) + fold, 1.07+u)
  }
  blanketGeo.computeVertexNormals()
  mesh(blanketGeo,throwMaterial,[0,0,0],bench)
  // Wall-mounted display on the right of the personal print, above the island.
  for (const y of [2.1, 2.95]) timber([1.57, y, -3.68], [1.78, .065, .44])
  plant(1.24, 2.99, -3.65, .65)
  // Face-out editions on the clock shelf. Its plaque always opens the full catalog.
  const shelfTop = 2.1 + .065 / 2
  rounded([.96, shelfTop + .077, -3.60], [.36,.154,.045], darkWood)
  const plaque = new THREE.MeshStandardMaterial({roughness: .9, map: paintedTexture(256, 96, ctx => {
    ctx.fillStyle = '#e6d7b6'; ctx.fillRect(0, 0, 256, 96)
    ctx.fillStyle = '#463c30'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = '42px Georgia, serif'; ctx.fillText(options.seriesLabel, 128, 50, 220)
  })})
  extraMaterials.add(plaque)
  mesh(new THREE.PlaneGeometry(.335,.13), plaque, [.96, shelfTop + .077, -3.575])
  hit('columns', [.96, shelfTop + .077, -3.58], [.40,.20,.10])
  hit('columns', [1.57,2.10,-3.68], [1.78,.09,.44])

  const editions = options.columns.slice(0, 5)
  const coverWidth = Math.min(.35, 1.25 / Math.max(1, editions.length) - .025)
  const inks = ['#365857', '#875845', '#4d5b72', '#6e6747', '#77535d']
  const editionModels: THREE.Group[] = []
  editions.forEach((column, index) => {
    const height = .47 + index % 3 * .027
    const y = shelfTop + height / 2
    const x = 1.77 + (index - (editions.length - 1) / 2) * (coverWidth + .025)
    const ink = inks[index]
    const edition = new THREE.Group(); edition.position.set(x,y,-3.65); scene.add(edition); editionModels.push(edition)
    rounded([0,0,0], [coverWidth,height,.16], mat(ink),edition)
    const cover = new THREE.MeshStandardMaterial({roughness: .92, map: paintedTexture(256,384,ctx => {
      ctx.fillStyle = ink; ctx.fillRect(0,0,256,384)
      ctx.strokeStyle = '#c4af82'; ctx.lineWidth = 2; ctx.strokeRect(15,13,226,358)
      ctx.fillStyle = '#deca9e'; ctx.font = '18px Georgia'; ctx.fillText('VOL. ' + String(index + 1).padStart(2, '0'),30,54)
      const title = column.title.trim().match(/[a-z0-9][a-z0-9.+#/-]*|[\p{Script=Han}]{1,5}|\s+|./giu) ?? []
      ctx.fillStyle = '#fff2d6'; ctx.font = '36px Georgia, serif'
      let line = '', row = 0
      for (const word of title) {
        if (line && ctx.measureText(line + word).width > 193) {
          ctx.fillText(row === 2 ? line.trimEnd() + '…' : line.trimEnd(),30,144 + row * 46,195)
          if (++row === 3) break
          line = ''
        }
        line = (line + word).trimStart()
      }
      if (row < 3 && line) ctx.fillText(line,30,144 + row * 46,195)
      ctx.fillStyle = '#c4af82'; ctx.fillRect(30,312,48,2)
    })})
    extraMaterials.add(cover)
    mesh(new THREE.PlaneGeometry(coverWidth - .009,height - .009), cover, [0,0,.082],edition)
    hit('columns', [0,0,.01], [coverWidth+.018,height+.02,.19],edition).userData.columnSlug = column.slug
  })
  for (const z of [-2.6, -.24]) plant(2.99, sill + .05, z, z < -1 ? .72 : .48)
  // A small edition print in a walnut frame, with a little more mat below the sheet.
  const printFrame = new THREE.Group()
  printFrame.position.set(.02, 2.62, -3.86)
  scene.add(printFrame)
  const walnut = mat('#906e55')
  walnut.map = wood.map
  const rail = .034, frameWidth = 1.04, frameHeight = 1.30
  for (const side of [-1, 1]) {
    rounded([0, side * (frameHeight - rail) / 2, 0], [frameWidth, rail, .09], walnut, printFrame, .006)
    rounded([side * (frameWidth - rail) / 2, 0, 0], [rail, frameHeight - 2 * rail, .09], walnut, printFrame, .006)
  }
  const mount = mesh(new THREE.PlaneGeometry(frameWidth - rail, frameHeight - rail),
    mat('#f5eedf'), [0, 0, .032], printFrame)
  mount.castShadow = false
  const printPaper = new THREE.MeshStandardMaterial({color: '#fffaf3', roughness: 1})
  extraMaterials.add(printPaper)
  const print = mesh(new THREE.PlaneGeometry(.82, 1.025), printPaper, [0, .018, .034], printFrame)
  print.castShadow = false
  hit('album', [0,0,.045], [frameWidth,frameHeight,.12], printFrame)
  const clockFace = paintedTexture(1024,1024, ctx => {
    ctx.scale(4,4)
    ctx.fillStyle='#eee6d0'; ctx.fillRect(0,0,256,256); ctx.translate(128,128); ctx.strokeStyle='#463f33'
    for (let tick = 0; tick < 60; tick++) {
      const hourMark = tick % 5 === 0
      ctx.lineWidth = hourMark ? 3.5 : 1.3
      ctx.beginPath(); ctx.moveTo(0, -113); ctx.lineTo(0, hourMark ? -99 : -108); ctx.stroke()
      ctx.rotate(Math.PI / 30)
    }
    ctx.fillStyle = '#534732'
    ctx.font = '20px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    for (let hour = 1; hour <= 12; hour++) {
      const angle = hour * Math.PI / 6
      ctx.fillText(String(hour), Math.sin(angle) * 82, -Math.cos(angle) * 82)
    }
  })
  const cm=new THREE.MeshStandardMaterial({map:clockFace});extraMaterials.add(cm)
  const clockRadius = .29
  const clock = mesh(new THREE.CylinderGeometry(clockRadius,clockRadius,.08,96),mat('#9f855c'),[1.95,3.27,-3.71])
  clock.rotation.x = Math.PI / 2
  const dial = mesh(new THREE.CircleGeometry(.268,96),cm,[1.95,3.27,-3.66])
  const bezel = mesh(new THREE.TorusGeometry(.276,.008,10,96),brass,[0,0,0],dial)
  bezel.castShadow = false
  for (const surface of [clock,dial]) {
    surface.userData.target = 'clock'
    hits.push(surface)
  }
  function clockHand(length: number, width: number, tail: number, z: number, color: string) {
    const shape = new THREE.Shape()
    shape.moveTo(-width / 2, -tail); shape.lineTo(width / 2, -tail)
    shape.lineTo(width / 2, length * .78); shape.lineTo(0, length)
    shape.lineTo(-width / 2, length * .78); shape.closePath()
    const hand = mesh(new THREE.ShapeGeometry(shape), mat(color), [0, 0, z], dial)
    hand.castShadow = hand.receiveShadow = false
    return hand
  }
  const hourHand = clockHand(.136, .022, .023, .003, '#352e27')
  const minuteHand = clockHand(.198, .016, .026, .006, '#40392e')
  const secondHand = clockHand(.220, .009, .045, .009, '#a24d38')
  const pivot = mesh(new THREE.CircleGeometry(.016, 16), brass, [0, 0, .012], dial)
  pivot.castShadow = false
  const hemi = new THREE.HemisphereLight('#e9f1f4', '#af9c87', .99); scene.add(hemi)
  const fill = new THREE.PointLight('#fff3df', 2.8, 10); fill.position.set(-1.6, 3.1, .1); scene.add(fill)
  const sun = new THREE.DirectionalLight('#ffebc6', 3.65); sun.position.set(6, 4.65, .55); sun.target.position.set(-2, .2, -2.5); scene.add(sun.target); sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.normalBias = .025; sun.shadow.radius = 3; sun.shadow.camera.left = -5; sun.shadow.camera.right = 5
  sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5; sun.shadow.bias = -.001; scene.add(sun)

  const daySun = sun.color.clone(), moon = new THREE.Color('#a8cafa')
  const daySky = hemi.color.clone(), nightSky = new THREE.Color('#a8bfe1')
  let environment = resolveEnvironment(Date.now(), 'auto')
  let night = environment.phase === 'night', lampOverride: boolean | null = null
  let ceilingLightOn = false
  const precipitation = createPrecipitation(scene)
  const rainGlass = createRainGlass(scene, { gardenBreeze, gardenWeather: weatherGrade, nightBlend, tint: outsideMat.color })
  const solarPosition = new THREE.Vector3(environment.solar.east, environment.solar.up, -environment.solar.north)
  const solarTarget = solarPosition.clone()
  let weatherDim = 1, targetDim = 1
  const lampOn = () => lampOverride ?? (environment.phase === 'night' || environment.phase === 'dusk')
  function applyWindowLight(mix: number) {
    const cover = (curtainMotion.heading.position + curtainMotion.hem.position) * .5
    const direct = Math.max(0, solarPosition.x) * Math.max(0, solarPosition.y)
    const openSun = THREE.MathUtils.lerp(3.65, .19, mix)
    const screenedSun = THREE.MathUtils.lerp(1.05, .08, mix)
    sun.intensity = THREE.MathUtils.lerp(openSun, screenedSun, cover) * weatherDim *
      (.04 + Math.min(1, direct * 3) * (1 - environment.cloudCover * .8))
    hemi.intensity = THREE.MathUtils.lerp(.99, .52, mix) * (1 - .13 * cover) + (ceilingLightOn ? .68 : 0)
    fill.intensity = ceilingLightOn ? 30 : THREE.MathUtils.lerp(2.8, .65, mix) * (1 - .18 * cover)
  }
  function applyLight(mix: number) {
    renderer.shadowMap.needsUpdate = true
    nightBlend.value = mix
    sun.color.lerpColors(daySun,moon,mix)
    hemi.color.lerpColors(daySky,nightSky,mix)
    scene.environmentIntensity = THREE.MathUtils.lerp(.29,.10,mix)
    sun.position.copy(sun.target.position).addScaledVector(solarPosition, 10)
    applyWindowLight(mix)
    if (mix < .8 && solarPosition.y < .3) sun.color.lerp(new THREE.Color('#ffbc81'), .6)
    outsideMat.color.set(environment.weather === 'snow' ? '#f1f5fa' : environment.season === 'autumn' ? '#e5ceb0' : environment.season === 'winter' ? '#cbd6dc' : '#e0e9dd')
    lamp.intensity = lampOn() ? 4.2 : 0
    bulbMaterial.emissiveIntensity = lampOn() ? 1.4 : 0
    lining.emissiveIntensity = lampOn() ? .32 : 0
  }
  applyLight(1-environment.solar.daylight)
  options.onNight(night)

  let target: Destination | 'clock' | null = null, active = true, disposed = false, reduced = false
  let clockView: ClockView = 'room'
  function changeClockView(view: ClockView) {
    if (clockView === view) return
    clockView = view
    options.onClockView(view)
  }
  let yaw = 0, pitch = 0, hingeFrom = 0, ambientMotion = true
  let previewWindow = false, windowViewMix = 0
  let quality: RoomQuality = 'auto', autoLight = false
  let presented = false
  const frameBudget = new RoomFrameBudget()
  const resolutionBudget = new RoomFrameBudget(50)
  let resolutionCap = 2
  type Gesture = { id:number; x:number; y:number; lastX:number; lastY:number; moved:boolean; pressed:PickedItem|null; grab:THREE.Vector3|null }
  let drag: Gesture | null = null
  let observationKey = ''
  function restoreObservation(narrow: boolean) {
    const key = 'study-daylight-' + (narrow ? 'narrow' : 'wide')
    if (key === observationKey) return
    observationKey = key; yaw = 0; pitch = 0
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || '{}')
      if (Number.isFinite(saved.yaw)) yaw=THREE.MathUtils.clamp(saved.yaw,-.65,.65)
      if (Number.isFinite(saved.pitch)) pitch=THREE.MathUtils.clamp(saved.pitch,-.22,.22)
    } catch { /* Optional observation memory. */ }
  }
  let pointerX = 0, pointerY = 0, progress = 0, startTime = performance.now(), lastTime = performance.now()
  const fromPosition = home.clone(), fromQuaternion = camera.quaternion.clone()
  const toPosition = home.clone(), toQuaternion = camera.quaternion.clone()
  const clockCenter = new THREE.Vector3()
  const closeupFov = 36
  let roomFov = camera.fov, fromFov = camera.fov, toFov = camera.fov
  let clockReturnMs = 1050
  function frameClock() {
    dial.getWorldPosition(clockCenter)
    dial.getWorldQuaternion(toQuaternion)
    // Frame the entire case within 70% of the viewport's shorter edge.
    const distance = clockRadius / (.70 * Math.min(1,camera.aspect) * Math.tan(THREE.MathUtils.degToRad(closeupFov / 2)))
    toPosition.set(0,0,distance).applyQuaternion(toQuaternion).add(clockCenter)
    toFov = closeupFov
  }
  function setFov(value: number) {
    if (camera.fov === value) return
    camera.fov = value
    camera.updateProjectionMatrix()
  }
  let revealPlayed = false
  let transitioning = false, pausedAt = 0, hiddenAt = 0
  let onScreenTrack = false, screenU = 0, screenStart = 0
  const drawerStarts = drawers.map(() => 0)
  let pickedDrawer = 0, openingDrawer = 0
  let pickedEdition = 0, openingEdition = 0
  // Capture every moving part at the interruption point, so closing never snaps.
  const objectStarts = { caseZ:readingCase.position.z, lid:0, screen:.52, albumZ:-3.86, albumY:0, editions:editionModels.map(() => -3.65) }
  let pickedTier: PickedItem | undefined
  const views: Record<Exclude<Destination,'diary'|'drawer'|'computer'>, { position: number[]; look: number[] }> = {
    bookshelf: { position: [-1.9, 1.85, -.35], look: [-2.85, 1.7, -2.8] },
    readingBox: { position: [-1.83,2.95,-.89], look: [-2.08,2.53,-2.22] },
    columns: { position: [1.52, 2.48, -1.99], look: [1.99, 2.46, -3.67] },
    portrait: { position: [-1.4, 2.35, -1.5], look: [-.95, 2.45, -3.8] },
    album: { position: [.06, 2.42, -1.95], look: [.02, 2.62, -3.86] },
  }
  const tmpCamera = camera.clone()
  let catalogSide = 0
  const railAnchor = new THREE.Vector3()
  function publishRailPosition() {
    // The editable paper takes the place of the printed insert at this pose.
    rails[catalogSide].visible = false
    camera.updateMatrixWorld()
    railAnchor.set(.025,1.68,.47)
    caseShelves[catalogSide].localToWorld(railAnchor).project(camera)
    options.onShelfFrame((railAnchor.x + 1) * 50, (1 - railAnchor.y) * 50)
  }
  function frameCatalog(narrow: boolean) {
    const group = caseShelves[catalogSide]
    toPosition.copy(group.localToWorld(new THREE.Vector3(narrow ? .12 : .62, 2.04, narrow ? 2.95 : 2.85)))
    tmpCamera.position.copy(toPosition)
    tmpCamera.lookAt(group.localToWorld(new THREE.Vector3(narrow ? -.16 : .10, narrow ? .98 : 1.27, .25)))
    toQuaternion.copy(tmpCamera.quaternion)
  }
  let catalogAnimating = false
  let previewBook: typeof chosenVolume
  let pullDistance = 0
  function setCatalogCue(names: string[], selected?: {slug:string;category:string|null}, open = false) {
    if (target !== 'bookshelf' || disposed || transitioning) return
    const local = plates.filter(p => p.side === catalogSide)
    const selectedName = selected?.category || (options.en ? 'Writing' : '随笔')
    // Borrow an unmatched tier for categories outside the home feed. Reserve a
    // tier for the active card even when a page spans more than five categories.
    const visible = names.slice(0,local.length)
    if (selected && !visible.includes(selectedName)) visible[Math.min(visible.length,local.length - 1)] = selectedName
    const pending = visible.filter(name => !local.some(plate => plate.name === name))
    let tier = 2
    for (const plate of local) {
      const name = plate.name && visible.includes(plate.name) ? plate.name : pending.shift() || plate.name
      plate.holder.visible = !!name
      if (name) plate.label.material = categoryLabel(name)
      plate.metal.emissiveIntensity = name && visible.includes(name) ? (selected && name === selectedName ? .68 : .38) : 0
      if (selected && name === selectedName) tier = plate.tier
    }
    previewBook = undefined
    if (selected) {
      const books = markedVolumes.filter(v => v.shelfIndex === catalogSide && v.tier === tier)
      // Each entry consistently picks the same spine in its own row.
      let hash = 0
      for (const c of selected.slug) hash = (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0
      previewBook = books[hash % books.length]
    }
    pullDistance = open ? .48 : .22
    catalogAnimating = true
    requestFrame()
  }
  function drawCatalogCue(delta: number) {
    let moving = false
    for (const volume of markedVolumes) {
      const goal = volume.rest + (volume === previewBook ? pullDistance : 0)
      const current = volume.book.position.z
      const z = reduced || Math.abs(current - goal) < .002 ? goal : THREE.MathUtils.damp(current, goal, 15, Math.min(Math.max(delta, 12) / 1000, .1))
      volume.book.position.z = z
      volume.book.rotation.y = -(z - volume.rest) * .46
      moving ||= z !== goal
      if (current !== z) renderer.shadowMap.needsUpdate = true
    }
    catalogAnimating = moving
  }
  function frameReadingCase(narrow:boolean) {
    const pose=views.readingBox
    toPosition.fromArray(narrow ? [-2.18,3.02,-.47] : pose.position)
    tmpCamera.position.copy(toPosition);tmpCamera.lookAt(new THREE.Vector3().fromArray(narrow ? [-2.36,2.10,-2.22] : pose.look))
    toQuaternion.copy(tmpCamera.quaternion)
  }
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduced = media.matches
  function resize() {
    const { width, height } = host.getBoundingClientRect()
    renderer.setSize(width, height); camera.aspect = width / Math.max(1, height)
    const narrow = width < 700
    const oldObservation = observationKey
    restoreObservation(narrow)
    const light = quality === 'light' || autoLight
    renderer.setPixelRatio(Math.min(resolutionCap, roomPixelRatio(window.devicePixelRatio, narrow, light)))
    if (renderer.shadowMap.enabled !== (!narrow && !light)) {
      renderer.shadowMap.enabled = !narrow && !light; renderer.shadowMap.needsUpdate = true
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.needsUpdate = true
      })
    }
    home.set(narrow ? -.13 : -.42, narrow ? 1.98 : 1.85, narrow ? 5.25 : 2.65)
    homeLook.set(narrow ? -.49 : .22, narrow ? 1.57 : 1.5, -2.5)
    roomFov = narrow ? 66 : 54
    if (target === 'clock') {
      frameClock()
      if (!transitioning) camera.position.copy(toPosition)
    } else {
      toFov = roomFov
      if (clockView === 'returning') {
        toPosition.copy(home)
        tmpCamera.position.copy(home); tmpCamera.lookAt(homeLook)
        tmpCamera.rotateY(yaw); tmpCamera.rotateX(pitch); toQuaternion.copy(tmpCamera.quaternion)
      } else {
        fromFov = roomFov
        camera.fov = roomFov
      }
    }
    camera.updateProjectionMatrix()

    if (target === 'readingBox') {
      frameReadingCase(narrow)
      if (!transitioning) { camera.position.copy(toPosition);camera.quaternion.copy(toQuaternion) }
    }
    if (target === 'bookshelf') {
      frameCatalog(narrow)
      if (!transitioning) {
        camera.position.copy(toPosition); camera.quaternion.copy(toQuaternion); publishRailPosition()
      }
    }
    if (!target && !transitioning) { camera.position.copy(home); camera.lookAt(homeLook) }
    if (onScreenTrack) {
      // After rotation the room has a different home pose. Retrace into the
      // new composition instead of jumping there on the last return frame.
      if (oldObservation !== observationKey) {
        tmpCamera.position.copy(home); tmpCamera.lookAt(homeLook)
        tmpCamera.rotateY(yaw); tmpCamera.rotateX(pitch); screenFlight.capture(tmpCamera)
      }
      screenFlight.sample(camera,screenU,options.onPortfolioFrame)
    }
    // setSize clears the drawing buffer even when a paper panel has paused RAF.
    if (!active && !disposed && !document.hidden) drawScene()
    else requestFrame()
  }
  const observer = new ResizeObserver(resize); observer.observe(host)
  function setTarget(next: Destination | 'clock' | null, columnSlug?: string) {
    if (next === 'columns' && columnSlug) pickedEdition = Math.max(0, editions.findIndex(column => column.slug === columnSlug))
    if (next === target && !columnSlug) {
      if (!transitioning && next !== 'clock') options.onSettled(next)
      return
    }
    if (next === 'clock') changeClockView('approaching')
    else if (clockView !== 'room') {
      clockReturnMs = clockView === 'approaching' ? THREE.MathUtils.lerp(160,1050,progress) : 1050
      changeClockView(next ? 'room' : 'returning')
    }
    if (next === 'computer' && !onScreenTrack) {
      screenFlight.capture(camera); screenU = 0; onScreenTrack = true
    } else if (next && next !== 'computer' && onScreenTrack) {
      onScreenTrack = false; options.onPortfolioFrame(0,1)
    }
    screenStart = screenU
    catalogAnimating = false
    for (const plate of plates) {
      plate.metal.emissiveIntensity = 0; plate.holder.visible = !!plate.name
      if (plate.name) plate.label.material = categoryLabel(plate.name)
    }
    rails.forEach((rail, side) => { rail.visible = side === (next === 'bookshelf' ? pickedTier?.shelfIndex ?? 0 : 0) })
    target = next; revealPlayed = false; hingeFrom = hinge.rotation.z; cancel()
    drawers.forEach((drawer, index) => { drawerStarts[index] = drawer.position.z })
    markedVolumes.forEach(v => { v.start = v.book.position.z - v.rest })
    chosenVolume = next === 'bookshelf' ? markedVolumes.find(v => v.shelfIndex === (pickedTier?.shelfIndex ?? 0) && v.tier === (pickedTier?.tier ?? 2)) : undefined
    pickedTier = undefined
    objectStarts.caseZ = readingCase.position.z; objectStarts.lid = caseLid.rotation.x
    objectStarts.screen = screenMaterial.emissiveIntensity
    objectStarts.albumZ = printFrame.position.z; objectStarts.albumY = printFrame.rotation.y
    editionModels.forEach((edition,index) => { objectStarts.editions[index] = edition.position.z })
    if (next === 'columns') openingEdition = pickedEdition
    pickedEdition = 0
    if (next === 'drawer') openingDrawer = pickedDrawer
    pickedDrawer = 0 // Navigation and direct links open the upper drawer.
    fromPosition.copy(camera.position); fromQuaternion.copy(camera.quaternion)
    fromFov = camera.fov
    toFov = roomFov
    const view = next && next !== 'diary' && next !== 'drawer' && next !== 'computer' && next !== 'clock' ? views[next] : null
    toPosition.copy(view ? new THREE.Vector3(...view.position as [number, number, number]) : home)
    tmpCamera.position.copy(toPosition); tmpCamera.lookAt(view ? new THREE.Vector3(...view.look as [number, number, number]) : homeLook)
    if (next === 'bookshelf' && chosenVolume) {
      catalogSide = chosenVolume.shelfIndex
      frameCatalog(host.clientWidth <= 700)
    } else if (next === 'readingBox') {
      frameReadingCase(host.clientWidth < 700)
    } else if (next === 'diary') {
      const narrow = host.clientWidth <= 700
      const focus = diary.localToWorld(new THREE.Vector3(-.30,.08,0))
      // Compose the real spread beside the desktop reader or above its mobile sheet.
      const aim = focus.clone().add(new THREE.Vector3(narrow ? 0 : .48,0,narrow ? .58 : 0))
      toPosition.copy(aim).add(new THREE.Vector3(.05,narrow ? 1.75 : 1.22,narrow ? 1.36 : .95))
      tmpCamera.position.copy(toPosition); tmpCamera.lookAt(aim)
    } else if (next === 'drawer') {
      const narrow = host.clientWidth <= 700
      const aim = desk.localToWorld(new THREE.Vector3(cabinetX, drawers[openingDrawer].position.y, 1.04))
      if (narrow) aim.y -= .24
      else aim.x += .42
      toPosition.copy(aim).add(new THREE.Vector3(-.20, narrow ? 1.0 : .85, narrow ? 1.55 : 1.16))
      tmpCamera.position.copy(toPosition); tmpCamera.lookAt(aim)
    } else if (next === 'columns' && host.clientWidth <= 700) {
      toPosition.set(1.58, 2.43, -.60)
      tmpCamera.position.copy(toPosition); tmpCamera.lookAt(1.57, 2.02, -3.65)
    }
    if (!next) { tmpCamera.rotateY(yaw); tmpCamera.rotateX(pitch) }
    toQuaternion.copy(tmpCamera.quaternion)
    if (next === 'clock') frameClock()
    startTime = performance.now(); progress = 0; transitioning = true
    if (!active) pausedAt = startTime
    requestFrame()
  }
  function inspectClock() {
    if (active && !target && !transitioning && clockView === 'room') setTarget('clock')
  }
  function leaveClock() {
    if (target === 'clock') setTarget(null)
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()
  const tablePlane = new THREE.Plane(new THREE.Vector3(0,1,0), -(diary.position.y+.10))
  const tablePoint = new THREE.Vector3()
  let clockPress: {id: number; x: number; y: number} | null = null
  let clockBlankReleased = false
  function aimRay(event: PointerEvent, offsetX = 0, offsetY = 0) {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.set((event.clientX + offsetX - rect.left) / rect.width * 2 - 1, -(event.clientY + offsetY - rect.top) / rect.height * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
  }
  function pick(event: PointerEvent) {
    aimRay(event)
    const firstHit = () => {
      const intersections = raycaster.intersectObjects(hits,false)
      const first = intersections[0]?.object.userData as PickedItem | undefined
      // The library's broad hitbox extends in front of its actual shelves.
      if (first?.target === 'bookshelf') {
        const local = intersections.map(hit => hit.object.userData as PickedItem).filter(item => item.shelfIndex === first.shelfIndex)
        return local.find(item => item.target === 'bookmark' || item.target === 'readingBox') ?? local.find(item => item.categoryId) ?? first
      }
      return first
    }
    const exact = firstHit()
    if (exact || event.pointerType !== 'touch') return exact ?? null
    // Give small silhouettes a finger-sized margin without displacing an exact hit.
    for (const [dx, dy] of [[0, -10], [0, 10], [-10, 0], [10, 0]]) {
      aimRay(event, dx, dy)
      const nearby = firstHit()
      if (nearby) { aimRay(event); return nearby }
    }
    return null
  }
  function down(event: PointerEvent) {
    clockBlankReleased = false
    if (!event.isPrimary) { cancel(); return }
    if (target === 'clock' && active && event.button === 0) {
      clockPress = pick(event) ? null : { id:event.pointerId, x:event.clientX, y:event.clientY }
      return
    }
    if (!active || target || transitioning || event.button !== 0 || drag) return
    const item = pick(event)
    const grab = item?.target === 'diary' && raycaster.ray.intersectPlane(tablePlane,tablePoint)
      ? diary.getWorldPosition(new THREE.Vector3()).sub(tablePoint) : null
    drag = { id:event.pointerId, x:event.clientX, y:event.clientY, lastX:event.clientX, lastY:event.clientY, moved:false, pressed:item ?? null, grab }
    renderer.domElement.setPointerCapture(event.pointerId)
  }
  let highlighted: RoomItem | null = null
  let highlightedBook: typeof markedVolumes[number] | undefined
  function highlight(item: RoomItem | null, zone?: PickedItem | null) {
    const volume = item === 'bookshelf' ? markedVolumes.find(v => v.shelfIndex === (zone?.shelfIndex ?? 0) && v.tier === (zone?.tier ?? 2)) : undefined
    if (item === highlighted && volume === highlightedBook) return
    highlighted = item
    if (highlightedBook) highlightedBook.binding.emissiveIntensity = 0
    highlightedBook=volume
    if (volume) {volume.binding.emissive.set('#b89c72');volume.binding.emissiveIntensity=.20}
    plate.emissive.set('#d8ba7b');plate.emissiveIntensity=item === 'readingBox' ? .18 : 0
    leather.emissiveIntensity = item === 'diary' ? .38 : .13
    foil.roughness = item === 'diary' ? .32 : .62
    if (!target && !transitioning) screenMaterial.emissiveIntensity = item === 'computer' ? .82 : .52
    requestFrame()
  }
  function move(event: PointerEvent) {
    if (clockPress?.id === event.pointerId && Math.hypot(event.clientX-clockPress.x,event.clientY-clockPress.y) > 7) clockPress = null
    if (!active || target || transitioning || !event.isPrimary || (drag && drag.id !== event.pointerId)) return
    if (!drag?.grab) { pointerX = event.clientX / window.innerWidth - .5; pointerY = event.clientY / window.innerHeight - .5 }
    if (drag) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 7) drag.moved = true
      if (drag.moved && drag.pressed?.target === 'diary') {
        aimRay(event)
        if (drag.grab && raycaster.ray.intersectPlane(tablePlane,tablePoint)) {
          const local = island.worldToLocal(tablePoint.add(drag.grab))
          placeDiary(local.x,local.z); renderer.shadowMap.needsUpdate = true
        }
      } else if (drag.moved) {
        yaw = THREE.MathUtils.clamp(yaw - (event.clientX - drag.lastX) * .002, -.65, .65)
        pitch = THREE.MathUtils.clamp(pitch - (event.clientY - drag.lastY) * .0015, -.22, .22)
      }
      drag.lastX = event.clientX; drag.lastY = event.clientY
    }
    const hovered = drag?.moved || event.pointerType === 'touch' ? null : pick(event)
    highlight(hovered?.target ?? null,hovered)
    options.onHover(hovered?.target ?? null, hovered?.categoryId ?? hovered?.columnSlug)
    renderer.domElement.style.cursor = drag?.moved ? 'grabbing' : hovered && hovered.target !== 'diary' ? 'pointer' : 'grab'
    requestFrame()
  }
  function up(event: PointerEvent) {
    if (clockPress?.id === event.pointerId) {
      clockBlankReleased = target === 'clock' && Math.hypot(event.clientX-clockPress.x,event.clientY-clockPress.y) <= 7 && !pick(event)
      clockPress = null
      return
    }
    if (!drag || drag.id !== event.pointerId) return
    if (Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>7) move(event)
    const chosen = drag.pressed
    const tapped = !drag.moved && active && !target && !transitioning
    try {
      if (drag.moved && chosen?.target === 'diary') sessionStorage.setItem(diaryKey,JSON.stringify({x:diary.position.x,z:diary.position.z}))
      else if (drag.moved) sessionStorage.setItem(observationKey, JSON.stringify({yaw,pitch}))
    } catch { /* optional */ }
    drag = null
    if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId)
    renderer.domElement.style.cursor = 'grab'
    if (tapped && chosen) {
      if (chosen.target === 'bookshelf') pickedTier = chosen
      if (chosen.target === 'drawer') pickedDrawer = chosen.drawerIndex ?? 0
      if (chosen.target === 'columns') pickedEdition = Math.max(0, editions.findIndex(column => column.slug === chosen.columnSlug))
      options.onPick(chosen.target, chosen.categoryId ?? chosen.columnSlug)
    }
  }
  function cancel(event?: PointerEvent) {
    if (event && drag && drag.id !== event.pointerId) return
    if (event?.type === 'pointerleave' && drag && renderer.domElement.hasPointerCapture(drag.id)) return
    if (drag && renderer.domElement.hasPointerCapture(drag.id)) renderer.domElement.releasePointerCapture(drag.id)
    clockPress = null
    drag = null; highlight(null); options.onHover(null); renderer.domElement.style.cursor = target === 'clock' || clockView === 'returning' ? 'default' : 'grab'
  }
  function backgroundClick(event: MouseEvent) {
    // A double-click at the old screen position must not turn into an exit
    // as the clock moves under the pointer. Ignore drags and object hits.
    if (clockBlankReleased && event.detail <= 1) leaveClock()
    clockBlankReleased = false
  }
  function lost(event: Event) {
    event.preventDefault(); active = false
    cancel(); clearClockTimer(); cancelAnimationFrame(frame); frame = 0
    options.onContextLost()
  }
  function visibility() {
    const now = performance.now(); lastTime = now; frameBudget.reset()
    resolutionBudget.reset()
    previousContinuous = false
    diagnostics?.mode(document.hidden ? 'hidden' : 'resuming')
    if (document.hidden) { hiddenAt = now; clearClockTimer() }
    else { if (transitioning && hiddenAt) startTime += now - Math.max(hiddenAt, startTime); hiddenAt = 0; requestFrame() }
  }
  renderer.domElement.addEventListener('pointerdown', down)
  renderer.domElement.addEventListener('click', backgroundClick)
  renderer.domElement.addEventListener('pointermove', move)
  renderer.domElement.addEventListener('pointerup', up)
  renderer.domElement.addEventListener('lostpointercapture', cancel)
  renderer.domElement.addEventListener('pointercancel', cancel)
  renderer.domElement.addEventListener('pointerleave', cancel)
  renderer.domElement.addEventListener('webglcontextlost', lost)
  document.addEventListener('visibilitychange', visibility)
  let frame = 0
  let clockTimer: number | undefined
  function clearClockTimer() {
    window.clearTimeout(clockTimer)
    clockTimer = undefined
  }
  function syncWallClock() {
    // Read wall time anew on each tick so returning from sleep or a hidden
    // tab never replays missed seconds. An idle room needs just one frame.
    const local = new Date(Date.now() + (environment.clockOffsetMs ?? 0))
    const angles = clockHandAnglesFromParts(cityTime(local.getTime(), environment.timezone))
    hourHand.rotation.z = angles.hour
    minuteHand.rotation.z = angles.minute
    secondHand.rotation.z = angles.second
    secondHand.visible = !reduced
    const period = reduced && target !== 'clock' ? 60_000 : 1000
    clockTimer = window.setTimeout(() => {
      clockTimer = undefined
      requestFrame()
    }, period - local.getTime() % period)
  }
  function requestFrame() { if (!frame && !disposed && (active || catalogAnimating) && !document.hidden) frame = requestAnimationFrame(render) }
  function drawScene() {
    if (disposed) return false
    try {
      const drawStart = performance.now()
      renderer.render(scene, camera)
      diagnostics?.draw(performance.now() - drawStart)
      if (disposed) return false // A context-lost listener may have disposed it during drawing.
      if (!presented) { presented = true; options.onReady() }
      return true
    } catch {
      active = false; catalogAnimating = false
      clearClockTimer(); cancelAnimationFrame(frame); frame = 0
      options.onError()
      return false
    }
  }
  function render(now: number) {
    frame = 0
    if (disposed || document.hidden) return
    if (diagnostics?.baselineFrame(now)) { lastTime = now; previousContinuous = false; requestFrame(); return }
    if (!active) {
      // A paused room only redraws while a catalog spine is moving.
      if (catalogAnimating) {
        drawCatalogCue(now - lastTime); lastTime = now
        if (drawScene() && catalogAnimating) requestFrame()
      }
      return
    }
    if (clockTimer === undefined) syncWallClock()
    const delta = now - lastTime; lastTime = now
    const previewGoal = previewWindow ? 1 : 0
    const previewStep = reduced || !ambientMotion ? 1 : Math.min(delta / 420, 1)
    windowViewMix += THREE.MathUtils.clamp(previewGoal - windowViewMix, -previewStep, previewStep)
    diagnostics?.frame(delta, previousContinuous)
    // Drawing the curtains is a deliberate gesture, independent of idle parallax.
    const curtainsMoving = curtainMotion.step(delta, media.matches)
    if (curtainsMoving) {
      for (const updatePanel of curtainPanels) updatePanel()
      applyWindowLight(nightBlend.value)
      const hem = curtainMotion.hem.position
      if (Math.abs(hem - lastCurtainShadow) >= .08 || hem === Number(curtainMotion.drawn)) {
        renderer.shadowMap.needsUpdate = true
        lastCurtainShadow = hem
      }
    }
    const windowVisible = curtainMotion.hem.position < .99
    const glassMoving = rainGlass.update(delta, !reduced && !target && windowVisible && quality !== 'light' && !autoLight)
    const weatherMoving = precipitation.update(delta, !reduced && !target && windowVisible, quality === 'light' || autoLight)
    const targetNight = 1-environment.solar.daylight
    const lightMoving = Math.abs(nightBlend.value - targetNight) > .001 || Math.abs(weatherDim-targetDim) > .001 || solarPosition.distanceToSquared(solarTarget) > .000001
    if (lightMoving) {
      weatherDim = reduced ? targetDim : THREE.MathUtils.damp(weatherDim,targetDim,1.4,Math.min(delta/1000,.15))
      solarPosition.lerp(solarTarget, reduced ? 1 : 1-Math.exp(-Math.min(delta/1000,.15)*1.4))
      const next = THREE.MathUtils.damp(nightBlend.value,targetNight,1.4,Math.min(delta/1000,.15))
      applyLight(reduced || Math.abs(next-targetNight) <= .001 ? targetNight : next)
    }
    steam.forEach((wisp,index) => {
      wisp.visible = !night && !reduced && ambientMotion && !target
      if (!wisp.visible) return
      const phase = (now / 3200 + index / steam.length) % 1
      wisp.position.set(.65 + .024*Math.sin(phase*5+index),1.32+.22*phase,-1.99)
      wisp.scale.set(.09+.05*phase,.13+.06*phase,1)
      wisp.material.opacity = .46 * Math.sin(phase * Math.PI)
    })
    const animated = (!target && !reduced && ambientMotion) || transitioning || curtainsMoving || lightMoving || weatherMoving || glassMoving
    if (quality === 'auto' && !autoLight && resolutionCap > 1 && resolutionBudget.sample(delta, animated)) {
      resolutionCap = Math.max(1, Math.min(resolutionCap, renderer.getPixelRatio()) - .5)
      resolutionBudget.reset(); frameBudget.reset(); resize()
    }
    if (quality === 'auto' && !autoLight && frameBudget.sample(delta, animated)) {
      autoLight = true; ambientMotion = false
      resize(); options.onQuality(true)
    }
    if (transitioning) {
      const duration = onScreenTrack ? Math.max(1, (target ? 1550*(1-screenStart) : 1200*screenStart))
        : clockView === 'returning' ? clockReturnMs : target === 'clock' ? 1250
        : target === 'diary' ? 1500 : target === 'drawer' ? 1350 : target === 'bookshelf' ? 1250 : 1050
      progress = reduced ? 1 : THREE.MathUtils.clamp((now - startTime) / duration, 0, 1)
      const t = progress * progress * (3 - 2 * progress)
      if (onScreenTrack) {
        screenU = THREE.MathUtils.lerp(screenStart,target ? 1 : 0,progress)
        screenFlight.sample(camera,screenU,options.onPortfolioFrame)
      } else {
        camera.position.lerpVectors(fromPosition, toPosition, t); camera.quaternion.slerpQuaternions(fromQuaternion, toQuaternion, t)
      }
      setFov(THREE.MathUtils.lerp(fromFov, toFov, t))
      // Finish sliding before the panel opens. An interrupted opening reverses
      // from its current position on the camera's return trip.
      const slide = target === 'drawer' ? THREE.MathUtils.smoothstep(progress,.15,.83) : THREE.MathUtils.smoothstep(progress,0,.65)
      drawers.forEach((drawer, index) => {
        const end = target === 'drawer' && openingDrawer === index ? drawerTravel : 0
        const z = THREE.MathUtils.lerp(drawerStarts[index], end, slide)
        if (drawer.position.z !== z) { drawer.position.z = z; renderer.shadowMap.needsUpdate = true }
      })
      const gesture = THREE.MathUtils.smoothstep(progress, target ? .28 : 0, target ? .90 : .7)
      for (const volume of markedVolumes) {
        const distance = THREE.MathUtils.lerp(volume.start,volume === chosenVolume ? .44 : 0,gesture)
        volume.book.position.z=volume.rest+distance
        volume.book.rotation.y=-distance*.45
      }
      const openingBox = target === 'readingBox'
      readingCase.position.z=THREE.MathUtils.lerp(objectStarts.caseZ,openingBox ? -2.05 : -2.65,THREE.MathUtils.smoothstep(progress,openingBox ? .08 : .46,openingBox ? .53 : .96))
      caseTray.position.z=-2.73+(readingCase.position.z+2.65)*.94
      caseLid.rotation.x=THREE.MathUtils.lerp(objectStarts.lid,openingBox ? -1.37 : 0,THREE.MathUtils.smoothstep(progress,openingBox ? .48 : 0,openingBox ? .93 : .51))
      screenMaterial.emissiveIntensity = THREE.MathUtils.lerp(objectStarts.screen, target === 'computer' ? .72 : .52, gesture)
      printFrame.position.z = THREE.MathUtils.lerp(objectStarts.albumZ, target === 'album' ? -3.56 : -3.86, gesture)
      printFrame.rotation.y = THREE.MathUtils.lerp(objectStarts.albumY, target === 'album' ? -.09 : 0, gesture)
      editionModels.forEach((edition,index) => {
        edition.position.z = THREE.MathUtils.lerp(objectStarts.editions[index], target === 'columns' && index === openingEdition ? -3.36 : -3.65, gesture)
        edition.rotation.y = (edition.position.z + 3.65) * -.45
      })
      renderer.shadowMap.needsUpdate = true
      if (progress === 1) {
        transitioning = false
        if (!target) onScreenTrack = false
        if (target === 'clock') {
          changeClockView('observing')
          clearClockTimer()
          syncWallClock()
        } else {
          changeClockView('room')
          if (target === 'bookshelf') publishRailPosition()
          options.onSettled(target)
        }
      }
    } else if (!target) {
      camera.position.copy(home)
      if (!reduced && ambientMotion && window.innerWidth > 700 && (!drag || drag.grab)) { camera.position.x += pointerX * .035; camera.position.y -= pointerY * .018 }
      camera.lookAt(homeLook)
      const blend = THREE.MathUtils.smoothstep(windowViewMix, 0, 1)
      camera.rotateY(THREE.MathUtils.lerp(yaw, -.68, blend))
      camera.rotateX(THREE.MathUtils.lerp(pitch, .035, blend))
    }
    const reveal = reduced || !transitioning ? 1 : target === 'diary'
      ? THREE.MathUtils.smoothstep(progress,.12,.81) : THREE.MathUtils.smoothstep(progress,.65,1)
    if (!revealPlayed && reveal > 0 && (target === 'diary' || target === 'bookshelf')) {
      revealPlayed = true; options.onReveal(target)
    }
    const coverProgress = target === 'diary' ? reveal : reduced || !transitioning ? 1 : THREE.MathUtils.smoothstep(progress,0,.62)
    const angle = THREE.MathUtils.lerp(hingeFrom, target === 'diary' ? Math.PI*1.03 : 0, coverProgress)
    if (hinge.rotation.z !== angle) { hinge.rotation.z = angle; renderer.shadowMap.needsUpdate = true }
    if (!target && !reduced && ambientMotion) {
      const time = now * .001
      if (windowVisible) gardenBreeze.value.set(Math.sin(time * .28) * .009, Math.sin(time * .19) * .004)
      for (const leaf of leaves) leaf.mesh.rotation.z = .3 + Math.sin(time * .7 + leaf.angle) * .035
    }
    if (reduced || !ambientMotion) gardenBreeze.value.set(0, 0)
    if (catalogAnimating) drawCatalogCue(delta)
    previousContinuous = !!((!target && !reduced && ambientMotion) || transitioning || curtainsMoving || lightMoving || weatherMoving || glassMoving || catalogAnimating)
    diagnostics?.mode(`${quality === 'light' || autoLight ? 'light' : 'auto'}:${previousContinuous ? 'animated' : 'idle'}:${environment.preset}`)
    if (!drawScene()) return
    if (catalogAnimating || windowViewMix !== previewGoal) requestFrame()
    if (!target && !reduced && ambientMotion || transitioning || curtainsMoving || lightMoving || weatherMoving || glassMoving) requestFrame()
  }
  // Generated albedo assets progressively replace procedural fallbacks.
  // Track every texture for teardown, including late completion after navigation.
  function loadArt(name: string, apply: (texture: THREE.Texture) => void, repeat = false, series = 'v1', onError?: () => void) {
    const texture = new THREE.TextureLoader().load(`/study-assets/${series}/${name}.webp`, loaded => {
      if (disposed) { loaded.dispose(); return }
      loaded.colorSpace = THREE.SRGBColorSpace
      loaded.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
      if (repeat) loaded.wrapS = loaded.wrapT = THREE.RepeatWrapping
      apply(loaded); requestFrame()
    }, undefined, () => {
      textures.delete(texture)
      texture.dispose()
      if (!disposed) onError?.()
    })
    textures.add(texture)
  }
  loadArt('kingfisher', texture => {
    printPaper.map = texture; printPaper.needsUpdate = true
  }, false, 'daylight')
  loadArt('leaf', texture => {
    for(const m of foliage){m.map=texture;m.needsUpdate=true}
  }, false, 'daylight')
  let garden: THREE.Texture | null = null
  let snowyGarden: THREE.Texture | null = null
  let snowRequested = false
  function updateGarden() {
    const snow = environment.weather === 'snow'
    const texture = snow && snowyGarden ? snowyGarden : garden
    weatherGrade.value.set(...gardenWeather[environment.weather])
    if (snow && snowyGarden) weatherGrade.value.z = 0 // The photograph contains the settled snow.
    if (texture !== outsideMat.map) {
      const mapPresenceChanged = Boolean(texture) !== Boolean(outsideMat.map)
      outsideMat.map = texture
      rainGlass.setTexture(texture)
      if (mapPresenceChanged) outsideMat.needsUpdate = true
    }
    if (snow && !snowRequested) {
      snowRequested = true
      loadArt('garden-snow', loaded => {
        snowyGarden = loaded
        updateGarden() // The visitor may already have switched back to clear weather.
      }, false, 'daylight', () => { snowRequested = false })
    }
  }
  loadArt('garden', loaded => { garden = loaded; updateGarden() }, false, 'daylight')
  loadArt('oak', texture => {
    wood.map = darkWood.map = texture
    wood.color.set('#f1e5d2'); darkWood.color.set('#b59a7c')
    wood.needsUpdate = darkWood.needsUpdate = true
    floorTexture.image = texture.image; floorTexture.needsUpdate = true; floorMaterial.color.set('#baada1')
  }, true, 'daylight')
  wood.color.set('#ead4af'); darkWood.color.set('#c7ad87'); floorMaterial.color.set('#dbc7a7')
  loadArt('linen', texture => {
    for(const m of [throwMaterial,cushionCloth,fabric,...pillowFabric]) { m.map=texture; m.needsUpdate=true }
  }, true)
  loadArt('bookcloth', texture => {
    leather.map = texture; leather.color.set('#79a890'); leather.needsUpdate = true
  }, true)
  loadArt('paper', texture => { pages.map=texture; pages.color.set('#fffaf0'); pages.needsUpdate=true })
  const pictureMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .9 })
  extraMaterials.add(pictureMaterial)
  const picture = mesh(new THREE.PlaneGeometry(.46, .59), pictureMaterial, [-.95, 2.45, -3.76])
  picture.castShadow = false
  loadArt('landscape', texture => { pictureMaterial.map = texture; pictureMaterial.needsUpdate = true })
  batchStaticScene(scene, new Set<THREE.Object3D>([
    ...hits, rocker, curtains, diary, readingCase, caseTray, display,
    ...drawers, ...markedVolumes.map(value => value.book), ...rails,
    ...plates.map(value => value.holder), printFrame, ...editionModels,
    hourHand, minuteHand, secondHand, ...leaves.map(value => value.mesh), ...steam,
  ]), geometries)
  resize(); requestFrame()
  return {
    setTarget,
    setQuality(value: RoomQuality) {
      quality = value; autoLight = false; frameBudget.reset()
      resolutionCap = 2; resolutionBudget.reset()
      ambientMotion = value !== 'light'
      resize(); requestFrame(); options.onQuality(value === 'light')
    },
    setCatalogCue,
    setBoxCount(count:number) {
      indexCards.children.forEach((card,i) => {card.visible=i<Math.min(count,3)})
      renderer.shadowMap.needsUpdate = true
      if (!active && !disposed && !document.hidden && target === 'readingBox') drawScene()
      else requestFrame()
    },
    inspectClock,
    leaveClock,
    setEnvironment(value: Environment) {
      environment = value; night = value.phase === 'night'
      updateGarden()
      solarTarget.set(value.solar.east, value.solar.up, -value.solar.north)
      precipitation.set(value); rainGlass.set(value.weather === 'rain' || value.weather === 'thunderstorm', value.intensity);
      targetDim = ['overcast','rain','snow','fog','thunderstorm'].includes(value.weather) ? .15 : value.weather === 'cloudy' ? .65 : 1
      applyLight(nightBlend.value); options.onNight(night)
      options.onLamp?.(lampOn()); requestFrame()
    },
    resetLamp() {
      lampOverride = null; applyLight(nightBlend.value)
      options.onLamp?.(lampOn()); requestFrame()
    },
    setCeilingLight(on: boolean) {
      ceilingLightOn = on
      rocker.rotation.x = on ? -.13 : .13
      opal.emissiveIntensity = on ? 1.2 : 0
      if (on) fill.position.set(diffuser.position.x, 4.48, diffuser.position.z)
      else fill.position.set(-1.6, 3.1, .1)
      applyWindowLight(nightBlend.value)
      requestFrame()
    },
    toggleLamp() {
      lampOverride = !lampOn(); applyLight(nightBlend.value)
      options.onLamp?.(lampOn()); requestFrame(); return lampOn()
    },
    toggleCurtains() {
      curtainMotion.drawn = !curtainMotion.drawn
      requestFrame()
      return curtainMotion.drawn
    },
    setWindowPreview(value: boolean) { previewWindow = value; requestFrame() },
    setMotion(value: boolean) { reduced = !value || media.matches; clearClockTimer(); requestFrame() },
    setPaused(value: boolean) {
      const now = performance.now(); frameBudget.reset()
      resolutionBudget.reset()
      previousContinuous = false
      diagnostics?.mode(value ? 'paused' : 'resuming')
      if (value) { cancel(); cancelAnimationFrame(frame); frame = 0 }
      if (value && active) { pausedAt = now; clearClockTimer() }
      if (!value && !active && transitioning && pausedAt) startTime += now - pausedAt
      active = !value; lastTime = now; if (!value || catalogAnimating) requestFrame()
    },
    dispose() {
      if (disposed) return
      disposed = true; clearClockTimer(); cancelAnimationFrame(frame); observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      const canvas = renderer.domElement
      canvas.removeEventListener('click', backgroundClick)
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('lostpointercapture', cancel)
      canvas.removeEventListener('pointerleave', cancel); canvas.removeEventListener('webglcontextlost', lost)
      precipitation.dispose(); rainGlass.dispose()
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose())
      extraMaterials.forEach(m => m.dispose())
      sun.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove()
      diagnostics?.dispose()
    },
  }
}
