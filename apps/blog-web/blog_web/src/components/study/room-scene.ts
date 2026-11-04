import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import type { Destination } from './model'

export type RoomOptions = {
  onReady: () => void
  onPick: (target: Destination) => void
  onHover: (target: Destination | null) => void
  onError: () => void
  onSettled: (target: Destination | null) => void
}

// Original procedural interiors, with an AI-generated exterior owned by this project.
export function createRoom(host: HTMLElement, options: RoomOptions) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#302c35')
  scene.fog = new THREE.Fog('#463c40', 11, 25)
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.shadowMap.enabled = window.innerWidth > 700
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.3
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)
  const camera = new THREE.PerspectiveCamera(57, 1, 0.05, 45)
  const home = new THREE.Vector3(-.15, 1.72, .65)
  const homeLook = new THREE.Vector3(-.35, 1.8, -3.5)
  camera.position.copy(home)
  camera.lookAt(homeLook)
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  const geometries = new Set<THREE.BufferGeometry>()
  const textures = new Set<THREE.Texture>()
  const extraMaterials = new Set<THREE.Material>()
  const composer = window.innerWidth > 900 ? new EffectComposer(renderer) : null
  const ao = composer ? new SSAOPass(scene, camera, 512, 512, 16) : null
  const output = composer ? new OutputPass() : null
  const renderPass = composer ? new RenderPass(scene, camera) : null
  if (composer && ao && output && renderPass) {
    ao.kernelRadius = 9; ao.minDistance = .002; ao.maxDistance = .16
    composer.addPass(renderPass); composer.addPass(ao); composer.addPass(output)
  }
  let postprocessing = !!composer
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
  function hit(target: Destination, at: number[], size: number[]) {
    const m = box(at, size, '#ffffff')
    m.visible = false
    m.userData.target = target
    hits.push(m)
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
  function paintedTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    paint(canvas.getContext('2d')!)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.add(texture); return texture
  }
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
    mat(color).bumpMap = plaster; mat(color).bumpScale = .018; mat(color).roughness = 1
  }
  const floorTexture = wood.map!.clone(); floorTexture.center.set(.5, .5); floorTexture.rotation = Math.PI / 2; floorTexture.repeat.set(1, 4); textures.add(floorTexture)
  const floorMaterial = wood.clone(); floorMaterial.map = floorTexture; floorMaterial.color.set('#ceb899'); floorMaterial.roughness = .65; extraMaterials.add(floorMaterial)
  // Architectural shell, with a real opening to the dusk sky.
  box([0, -.08, 0], [8, .16, 12], '#573e30')
  for (let i = 0; i < 18; i++) {
    const plank = timber([-3.8 + i * .45, .005, 0], [.44, .025, 12], i % 4 === 0)
    if (i % 4) plank.material = floorMaterial
  }
  box([-4, 2.4, 0], [.16, 4.8, 12], '#b4a18a')
  box([4, 2.4, 0], [.16, 4.8, 12], '#b8a78d')
  box([-2.7, 2.4, -4], [2.6, 4.8, .15], '#b9a58e')
  box([3.3, 2.4, -4], [1.4, 4.8, .15], '#c2ae94')
  box([.6, .64, -4], [4, 1.28, .15], '#baa58c')
  box([.6, 4.35, -4], [4, .9, .15], '#bdaa93')
  // Millwork, recessed wall panels and a cornice give the room human scale.
  for (const x of [-3.9, 3.9]) timber([x, .12, -.5], [.08, .24, 7], true)
  timber([0, .12, -3.87], [8, .24, .09], true)
  timber([0, 4.05, -3.83], [8, .16, .2])
  for (const x of [-1.34, 2.54]) {
    timber([x, 2.6, -3.82], [.16, 2.7, .12])
    timber([x, 2.6, -3.71], [.035, 2.7, .025], true)
  }
  timber([.6, 1.26, -3.88], [4.25, .13, .4])
  timber([.6, 3.9, -3.96], [4.12, .12, .2])
  for (const x of [-1.4, .6, 2.6]) timber([x, 2.58, -3.95], [.08, 2.65, .18])
  timber([.6, 2.55, -3.95], [4, .07, .18])
  // Gradient sky is a small generated texture, not a remote panorama.
  const skyCanvas = document.createElement('canvas'); skyCanvas.width = 8; skyCanvas.height = 128
  const sc = skyCanvas.getContext('2d')!; const gradient = sc.createLinearGradient(0, 0, 0, 128)
  gradient.addColorStop(0, '#1e314e'); gradient.addColorStop(.55, '#80748e'); gradient.addColorStop(1, '#efa681')
  sc.fillStyle = gradient; sc.fillRect(0, 0, 8, 128)
  const sky = new THREE.CanvasTexture(skyCanvas); sky.colorSpace = THREE.SRGBColorSpace; textures.add(sky)
  const skyMat = new THREE.MeshBasicMaterial({ map: sky });
  mesh(new THREE.PlaneGeometry(14, 7), skyMat, [.5, 3, -8])
  const outsideMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  extraMaterials.add(outsideMat)
  const outside = mesh(new THREE.PlaneGeometry(11, 6.1875), outsideMat, [.5, 2.75, -6.6])
  outside.castShadow = false; outside.receiveShadow = false
  const outsideTexture = new THREE.TextureLoader().load('/study-assets/dusk-neighborhood.webp', texture => {
    if (disposed) { texture.dispose(); return }
    texture.colorSpace = THREE.SRGBColorSpace; outsideMat.map = texture; outsideMat.opacity = 1; outsideMat.needsUpdate = true
    requestFrame()
  }, undefined, () => { /* The procedural sky remains available offline. */ })
  textures.add(outsideTexture)
  for (let i = 0; i < 14; i++) {
    const x = -6 + i * .9, h = .7 + random() * 1.3
    box([x, h / 2 + .2, -7.2], [.8, h, .6], '#38424b')
    const roof = mesh(new THREE.ConeGeometry(.63, .6, 4), mat('#424451'), [x, h + .5, -7.2]); roof.rotation.y = Math.PI / 4
    for (let j = 0; j < 2; j++) mesh(new THREE.PlaneGeometry(.12, .18), mat('#e2ac69', true), [x - .18 + j * .35, h * .65, -6.88])
  }
  // Curtains are individual folds: inexpensive geometry, gently animated as a group.
  const curtains = new THREE.Group(); curtains.position.y = 4.04; scene.add(curtains)
  const curtainFabric = mat('#d4c4a9'); curtainFabric.map = woven; curtainFabric.side = THREE.DoubleSide
  for (const side of [-1.55, 2.75]) {
    const cloth = new THREE.PlaneGeometry(.8, 2.9, 28, 22)
    const positions = cloth.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i)
      positions.setZ(i, Math.sin((x + .4) * 48) * (.035 + (1.45 - y) * .013))
      positions.setY(i, y + (y < -1.4 ? Math.cos(x * 48) * .025 : 0))
    }
    cloth.computeVertexNormals()
    mesh(cloth, curtainFabric, [side, -1.45, -3.62], curtains)
    for (let ring = 0; ring < 6; ring++) {
      const loop = mesh(new THREE.TorusGeometry(.045, .009, 6, 12), brass, [side - .33 + ring * .13, 4.04, -3.65]); loop.rotation.y = Math.PI / 2
    }
  }
  timber([.6, 4.08, -3.65], [5.1, .055, .055], true)
  // Bookshelf. The semantic hitbox stays stable while the tray moves.
  const shelf = new THREE.Group(); shelf.position.set(-2.85, 0, -2.85); scene.add(shelf)
  timber([0, 1.8, -.28], [1.95, 3.6, .14], true, shelf)
  for (const x of [-1, 1]) timber([x, 1.8, .02], [.14, 3.6, .78], true, shelf)
  timber([0, 3.63, .07], [2.2, .14, .9], true, shelf)
  timber([0, 3.73, .06], [2.28, .07, .96], false, shelf)
  for (const x of [-.97, .97]) timber([x, 1.9, .445], [.08, 3.3, .035], false, shelf)
  const bookColors = ['#384c45', '#746249', '#985b41', '#b09a71', '#4d5b65', '#686347']
  const spineMaterials = bookColors.map((color, index) => {
    const material = mat(color)
    material.map = paintedTexture(128, 512, ctx => {
      ctx.fillStyle = '#ddd1ae'; ctx.fillRect(0, 0, 128, 512)
      ctx.fillStyle = '#ffffff16'; ctx.fillRect(8, 0, 8, 512)
      ctx.strokeStyle = '#edcf88'; ctx.lineWidth = 3
      for (const y of [34, 44, 400, 410, 474]) { ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(118, y); ctx.stroke() }
      ctx.fillStyle = '#f5df9e'; ctx.textAlign = 'center'; ctx.font = '18px Georgia'
      const title = ['ESSAYS', 'NOTES', 'NATURE', 'STORIES', 'DESIGN', 'LETTERS'][index]
      ctx.save(); ctx.translate(64, 240); ctx.rotate(-Math.PI / 2); ctx.fillText(title, 0, 0); ctx.restore()
      ctx.font = '13px Georgia'; ctx.fillText('VOL. ' + (index + 1), 64, 445)
      for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(24,18,8,${random() * .12})`; ctx.fillRect(random() * 128, random() * 512, 1, 1) }
    })
    return material
  })
  for (let row = 0; row < 5; row++) {
    const y = .42 + row * .63
    timber([0, y, .03], [1.95, .08, .78], true, shelf)
    let x = -.86
    while (x < .84) {
      if ((row === 0 || row === 3) && x > .05) break
      const width = .095 + random() * .075, height = .36 + random() * .16
      const book = rounded([x, y + height / 2 + .045, .12 + random() * .04], [width, height, .4], spineMaterials[Math.floor(random() * bookColors.length)], shelf, .008)
      if (row === 2 && x > .15 && x < .4) { book.position.z += .1; book.rotation.z = -.07 }
      for (const stripe of [-.32, .32]) box([x, y + height / 2 + .045 + stripe * height, .325], [width * .75, .013, .007], '#bba273', shelf)
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
  const storage = rounded([-2.36, 2.5, -2.65], [.65, .25, .43], mat('#b8a17b'))
  rounded([-2.36, 2.64, -2.65], [.69, .035, .46], mat('#c5af89'))
  box([-2.36, 2.51, -2.428], [.12, .055, .008], '#a78d58')
  void storage
  timber([0, .2, .1], [2, .4, .78], true, shelf)
  for (const x of [-.48, .48]) {
    timber([x, .22, .515], [.87, .32, .04], false, shelf)
    timber([x, .22, .54], [.73, .2, .018], true, shelf)
  }
  for (const x of [-.48, .48]) box([x, .23, .5], [.025, .06, .035], '#b99958', shelf)
  const tray = timber([-2.85, 1.45, -2.43], [1.8, .06, .6])
  hit('bookshelf', [-2.85, 1.85, -2.45], [2.1, 3.3, .65])
  // Writing desk.
  const desk = new THREE.Group(); desk.position.set(.5, 0, -2.45); scene.add(desk)
  timber([0, .94, 0], [3.7, .12, 1.35], false, desk)
  timber([0, .875, .61], [3.65, .06, .04], true, desk)
  for (const x of [-1.68, 1.68]) for (const z of [-.48, .48]) timber([x, .45, z], [.09, .9, .09], true, desk)
  timber([1.35, .65, 0], [.8, .48, 1.1], true, desk)
  for (const y of [.52, .72]) { timber([1.35, y, .58], [.7, .17, .05], false, desk); box([1.35, y, .62], [.18, .018, .035], '#bc9c59', desk) }
  const leather = mat('#596555'); leather.map = woven
  rounded([-.55, 1.006, .06], [1.65, .008, .88], leather, desk, .025)
  contact([.5, .042, -2.3], 4.3, 2.2, .7)
  contact([-2.85, .043, -2.7], 2.7, 1.7, .85)
  // Journal with a hinged cover.
  const diary = new THREE.Group(); diary.position.set(-.3, 1.035, -2.09); diary.rotation.y = .1; scene.add(diary)
  box([0, 0, 0], [.65, .045, .48], '#e2cda4', diary)
  box([0, -.027, 0], [.7, .015, .53], '#634334', diary)
  const pages = mat('#f3dfb7')
  pages.map = paintedTexture(512, 384, ctx => {
    ctx.fillStyle = '#f0dfbb'; ctx.fillRect(0, 0, 512, 384)
    ctx.fillStyle = '#817052'; ctx.font = 'italic 26px Georgia'; ctx.fillText('Notes from a quiet day', 38, 58)
    ctx.strokeStyle = '#b8a37c'; ctx.lineWidth = 1
    for (let y = 90; y < 340; y += 26) {
      ctx.globalAlpha = .35; ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(480, y); ctx.stroke(); ctx.globalAlpha = .7
      ctx.beginPath(); ctx.moveTo(42, y - 8)
      for (let x = 42; x < 440 - random() * 60; x += 4) ctx.lineTo(x, y - 8 + Math.sin(x * .6) * 3 + random() * 4)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  })
  const writing = mesh(new THREE.PlaneGeometry(.6, .44), pages, [0, .025, 0], diary); writing.rotation.x = -Math.PI / 2
  const hinge = new THREE.Group(); hinge.position.x = -.34; diary.add(hinge)
  const cover = box([.34, .04, 0], [.7, .015, .53], '#705c43', hinge)
  cover.material = leather
  const embossed = mesh(new THREE.PlaneGeometry(.42, .025), brass, [.34, .049, -.08], hinge); embossed.rotation.x = -Math.PI / 2
  hinge.rotation.z = 1.35
  box([.12, .035, .24], [.018, .007, .17], '#9f4738', diary)
  hit('diary', [-.3, 1.07, -2.09], [.85, .2, .75])
  // Laptop, pencil, mug and stationery.
  box([1.48, 1.035, -2.55], [.75, .035, .5], '#777f7e')
  const screen = box([1.48, 1.3, -2.76], [.75, .52, .035], '#303638'); screen.rotation.x = -.15
  const display = box([1.48, 1.3, -2.735], [.68, .44, .006], '#536779'); display.rotation.x = -.15
  const screenMaterial = mat('#ffffff')
  screenMaterial.map = paintedTexture(512, 320, ctx => {
    ctx.fillStyle = '#263c45'; ctx.fillRect(0, 0, 512, 320)
    const glow = ctx.createLinearGradient(0, 0, 512, 320); glow.addColorStop(0, '#37535e'); glow.addColorStop(1, '#182d35'); ctx.fillStyle = glow; ctx.fillRect(0, 0, 512, 320)
    ctx.fillStyle = '#dcbe89'; ctx.font = '18px monospace'; ctx.fillText('~/ a little corner of the internet', 24, 43)
    for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 3 ? '#8da99c' : '#c6a77b'; ctx.fillRect(30 + i % 3 * 18, 86 + i * 20, 80 + random() * 220, 5) }
  })
  screenMaterial.emissive.set('#648b96'); screenMaterial.emissiveIntensity = .25; display.material = screenMaterial
  for (let row = 0; row < 4; row++) for (let col = 0; col < 11; col++) box([1.2 + col * .052, 1.056, -2.62 + row * .06], [.039, .006, .037], '#414c50')
  for (let i = 0; i < 3; i++) box([1.4, 1.35 - i * .055, -2.69], [.32 + i * .06, .012, .008], '#a9b6b0')
  hit('computer', [1.48, 1.25, -2.55], [.85, .65, .7])
  cylinder([.65, 1.16, -1.99], .105, .09, .25, '#c2aa7f')
  cylinder([.65, 1.29, -1.99], .083, .083, .005, '#483326')
  const handle = mesh(new THREE.TorusGeometry(.08, .018, 8, 16), mat('#c2aa7f'), [.77, 1.18, -1.99]); handle.rotation.y = Math.PI / 2
  cylinder([.65, 1.015, -1.99], .145, .145, .009, '#9a7752')
  const mugLip = mesh(new THREE.TorusGeometry(.099, .009, 8, 24), mat('#dfcba7'), [.65, 1.285, -1.99]); mugLip.rotation.x = Math.PI / 2
  contact([.65, 1.009, -1.99], .43, .43, .65)
  const pencil = cylinder([.2, 1.03, -1.95], .009, .009, .32, '#c6934c'); pencil.rotation.z = 1.4
  cylinder([-.92, 1.13, -2.95], .075, .06, .24, '#d8c49d')
  for (let i = 0; i < 5; i++) {
    const pen = cylinder([-.95 + i * .013, 1.28, -2.95], .006, .006, .32, i % 2 ? '#6a604d' : '#ba965c')
    pen.rotation.z = (i - 2) * .07
  }
  for (let i = 0; i < 3; i++) {
    const volume = rounded([-1.02, 1.04 + i * .045, -2.2], [.4, .04, .28], mat(bookColors[i]))
    volume.rotation.y = (i - 1) * .09
  }
  contact([-1.02, 1.008, -2.2], .65, .5, .45)
  // Brass lamp, warm pool of light.
  cylinder([-.77, 1.03, -2.72], .16, .18, .045, '#99713d')
  cylinder([-.77, 1.38, -2.72], .017, .017, .7, '#b39452')
  const shade = mesh(new THREE.ConeGeometry(.27, .23, 24, 1, true), mat('#bb9652'), [-.65, 1.78, -2.65]); shade.rotation.z = -.22
  const bulb = mesh(new THREE.SphereGeometry(.07, 12, 8), mat('#ffd99c', true), [-.65, 1.69, -2.65]); bulb.scale.y = .35
  const lamp = new THREE.PointLight('#ffc881', 3.5, 4, 2); lamp.position.set(-.65, 1.58, -2.6); scene.add(lamp)
  shade.material = brass
  const lampRim = mesh(new THREE.TorusGeometry(.27, .012, 8, 32), brass, [-.65, 1.665, -2.65]); lampRim.rotation.x = Math.PI / 2
  contact([-.77, 1.01, -2.72], .65, .55, .5)
  // Photo: simple original geometric landscape art.
  timber([-1.92, 2.45, -3.86], [.68, .85, .075], true)
  box([-1.92, 2.45, -3.81], [.57, .74, .01], '#b5a287')
  box([-1.92, 2.45, -3.795], [.47, .6, .01], '#596a6b')
  sphere([-1.83, 2.6, -3.78], [.075, .075, .008], '#d4a269')
  box([-1.92, 2.25, -3.78], [.47, .18, .008], '#374e4a')
  const photoPaper = rounded([-1.86, 1.81, -3.82], [.36, .42, .018], mat('#e6d8b7')); photoPaper.rotation.z = -.12
  box([-1.86, 1.82, -3.803], [.29, .29, .006], '#8b9787')
  const pin = sphere([-1.85, 2.02, -3.77], [.018, .018, .012], '#c4a261'); pin.material = brass
  hit('portrait', [-1.92, 2.45, -3.75], [.75, .92, .1])
  function plant(x: number, y: number, z: number, scale: number) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); scene.add(g)
    cylinder([0, .15, 0], .18, .13, .3, '#9e7956', g)
    cylinder([0, .3, 0], .16, .16, .015, '#443b27', g)
    for (let i = 0; i < 17; i++) {
      const angle = i * 2.4, height = .4 + random() * .4
      cylinder([Math.sin(angle) * .06, height / 2 + .25, Math.cos(angle) * .06], .008, .008, height, '#535f36', g)
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.bezierCurveTo(-.16, .1, -.13, .34, 0, .46); shape.bezierCurveTo(.12, .3, .15, .1, 0, 0)
      const leafGeo = new THREE.ShapeGeometry(shape, 8)
      const leafMat = mat(i % 2 ? '#50663f' : '#6d8350'); leafMat.side = THREE.DoubleSide
      const leaf = mesh(leafGeo, leafMat, [Math.sin(angle) * .14, height + .1, Math.cos(angle) * .14], g)
      leaf.rotation.set(.3, angle, .3); leaves.push({ mesh: leaf, angle })
    }
  }
  plant(2, 1.02, -2.9, .65); plant(-3.4, 3.6, -2.8, .7); plant(-1.25, .04, -2.85, 1.1)
  // Trailing pothos: individual bent stems and leaves, not floating spheres.
  for (let strand = 0; strand < 3; strand++) {
    const points = Array.from({ length: 9 }, (_, i) => new THREE.Vector3(-3.55 + strand * .16 + Math.sin(i * .8 + strand) * .08, 3.9 - i * .17, -2.35 + Math.sin(i * .4) * .07))
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, .009, 5, false), mat('#626b42'), [0, 0, 0])
    points.slice(1).forEach((point, i) => {
      const leaf = sphere([point.x + (i % 2 ? .07 : -.07), point.y, point.z + .025], [.09, .11, .025], i % 3 ? '#6e7b4b' : '#8a9159')
      leaf.rotation.z = (i % 2 ? 1 : -1) * .45
    })
  }
  // Textiles and a modest foreground chair, below the main sightlines.
  const rug = box([0, .04, .4], [3.8, .025, 2.3], '#bda989'); rug.material = mat('#c4ae8b'); (rug.material as THREE.MeshStandardMaterial).map = woven
  for (let i = 0; i < 18; i++) box([-1.75 + i * .2, .055, .4], [.012, .004, 2.2], '#b5a48b')
  const chair = new THREE.Group(); chair.position.set(1.5, 0, .4); chair.rotation.y = -.4; scene.add(chair)
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
  const hemi = new THREE.HemisphereLight('#c3c9de', '#7e5940', 1.05); scene.add(hemi)
  const fill = new THREE.PointLight('#e2d3b3', 2, 8); fill.position.set(-1.6, 3.1, .1); scene.add(fill)
  const sun = new THREE.DirectionalLight('#ffcf98', 2.1); sun.position.set(2.2, 4, -5); sun.target.position.set(-2, .3, -.2); scene.add(sun.target); sun.castShadow = renderer.shadowMap.enabled
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.normalBias = .025; sun.shadow.radius = 3; sun.shadow.camera.left = -5; sun.shadow.camera.right = 5
  sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5; sun.shadow.bias = -.001; scene.add(sun)

  let target: Destination | null = null, active = true, disposed = false, reduced = false
  let yaw = 0, pitch = 0, drag: { x: number; y: number; lastX: number; lastY: number; moved: boolean } | null = null
  try {
    const saved = JSON.parse(sessionStorage.getItem('study-observe') || '{}')
    if (Number.isFinite(saved.yaw)) yaw = THREE.MathUtils.clamp(saved.yaw, -.32, .32)
    if (Number.isFinite(saved.pitch)) pitch = THREE.MathUtils.clamp(saved.pitch, -.17, .17)
  } catch { /* Observation state is optional. */ }
  let pointerX = 0, pointerY = 0, progress = 0, startTime = performance.now(), lastTime = performance.now()
  const fromPosition = home.clone(), fromQuaternion = camera.quaternion.clone()
  const toPosition = home.clone(), toQuaternion = camera.quaternion.clone()
  let transitioning = false, pausedAt = 0, hiddenAt = 0
  const views: Record<Destination, { position: number[]; look: number[] }> = {
    bookshelf: { position: [-1.9, 1.85, -.35], look: [-2.85, 1.7, -2.8] },
    diary: { position: [-.25, 2.35, -1.15], look: [-.3, 1.03, -2.1] },
    computer: { position: [1.45, 1.75, -.95], look: [1.48, 1.25, -2.6] },
    portrait: { position: [-1.4, 2.35, -1.5], look: [-1.92, 2.45, -3.8] },
  }
  const tmpCamera = camera.clone()
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduced = media.matches
  function resize() {
    const { width, height } = host.getBoundingClientRect()
    renderer.setSize(width, height); camera.aspect = width / Math.max(1, height)
    home.set(-.15, 1.72, width < 700 ? 3.6 : .65)
    camera.fov = width < 700 ? 68 : 57; camera.updateProjectionMatrix()
    composer?.setSize(Math.max(1, Math.floor(width * .8)), Math.max(1, Math.floor(height * .8)))
    if (!target && !transitioning) { camera.position.copy(home); camera.lookAt(homeLook) }
    requestFrame()
  }
  const observer = new ResizeObserver(resize); observer.observe(host)
  function setTarget(next: Destination | null) {
    target = next; drag = null; options.onHover(null)
    fromPosition.copy(camera.position); fromQuaternion.copy(camera.quaternion)
    const view = next ? views[next] : null
    toPosition.copy(view ? new THREE.Vector3(...view.position as [number, number, number]) : home)
    tmpCamera.position.copy(toPosition); tmpCamera.lookAt(view ? new THREE.Vector3(...view.look as [number, number, number]) : homeLook)
    if (!view) { tmpCamera.rotateY(yaw); tmpCamera.rotateX(pitch) }
    toQuaternion.copy(tmpCamera.quaternion)
    startTime = performance.now(); transitioning = true
    if (!active) pausedAt = startTime
    requestFrame()
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()
  function pick(event: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    return (raycaster.intersectObjects(hits, false)[0]?.object.userData.target as Destination | undefined) || null
  }
  function down(event: PointerEvent) {
    if (!event.isPrimary) { drag = null; return }
    if (target || transitioning || event.button !== 0 || !event.isPrimary) return
    drag = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false }
    renderer.domElement.setPointerCapture(event.pointerId)
  }
  function move(event: PointerEvent) {
    if (target || transitioning) return
    pointerX = event.clientX / window.innerWidth - .5; pointerY = event.clientY / window.innerHeight - .5
    if (drag) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 7) drag.moved = true
      if (drag.moved) {
        yaw = THREE.MathUtils.clamp(yaw - (event.clientX - drag.lastX) * .002, -.32, .32)
        pitch = THREE.MathUtils.clamp(pitch - (event.clientY - drag.lastY) * .0015, -.17, .17)
      }
      drag.lastX = event.clientX; drag.lastY = event.clientY
    }
    const hovered = pick(event); options.onHover(hovered)
    renderer.domElement.style.cursor = drag?.moved ? 'grabbing' : hovered ? 'pointer' : 'grab'
    requestFrame()
  }
  function up(event: PointerEvent) {
    if (drag && !drag.moved && !target && !transitioning) { const chosen = pick(event); if (chosen) options.onPick(chosen) }
    drag = null
    try { sessionStorage.setItem('study-observe', JSON.stringify({ yaw, pitch })) } catch { /* optional */ }
    if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId)
  }
  function cancel() { drag = null; options.onHover(null) }
  function lost(event: Event) { event.preventDefault(); active = false; options.onError() }
  function visibility() {
    const now = performance.now(); lastTime = now
    if (document.hidden) hiddenAt = now
    else { if (transitioning && hiddenAt) startTime += now - Math.max(hiddenAt, startTime); hiddenAt = 0; requestFrame() }
  }
  renderer.domElement.addEventListener('pointerdown', down)
  renderer.domElement.addEventListener('pointermove', move)
  renderer.domElement.addEventListener('pointerup', up)
  renderer.domElement.addEventListener('pointercancel', cancel)
  renderer.domElement.addEventListener('pointerleave', cancel)
  renderer.domElement.addEventListener('webglcontextlost', lost)
  document.addEventListener('visibilitychange', visibility)
  let frame = 0, frameSamples = 0, slowSamples = 0
  function requestFrame() { if (!frame && !disposed && active && !document.hidden) frame = requestAnimationFrame(render) }
  function render(now: number) {
    frame = 0
    if (disposed || !active || document.hidden) return
    const delta = now - lastTime; lastTime = now
    if (delta > 70 && delta < 500) slowSamples++
    if (++frameSamples === 180 && slowSamples > 70) { renderer.setPixelRatio(1); reduced = true; renderer.shadowMap.enabled = false; postprocessing = false }
    if (transitioning) {
      progress = reduced ? 1 : THREE.MathUtils.clamp((now - startTime) / (target === 'diary' ? 1150 : 950), 0, 1)
      const t = progress * progress * (3 - 2 * progress)
      camera.position.lerpVectors(fromPosition, toPosition, t); camera.quaternion.slerpQuaternions(fromQuaternion, toQuaternion, t)
      if (progress === 1) { transitioning = false; options.onSettled(target) }
    } else if (!target) {
      camera.position.copy(home)
      if (!reduced && window.innerWidth > 700 && !drag) { camera.position.x += pointerX * .035; camera.position.y -= pointerY * .018 }
      camera.lookAt(homeLook)
      camera.rotateY(yaw); camera.rotateX(pitch)
    }
    const desired = target === 'diary' ? 2.8 : 1.35
    hinge.rotation.z = THREE.MathUtils.lerp(hinge.rotation.z, desired, reduced ? 1 : Math.min(delta / 150, 1))
    tray.position.z = THREE.MathUtils.lerp(tray.position.z, target === 'bookshelf' ? -1.95 : -2.43, reduced ? 1 : Math.min(delta / 200, 1))
    if (!target && !reduced) {
      const time = now * .001
      curtains.rotation.z = Math.sin(time * .5) * .002
      for (const leaf of leaves) leaf.mesh.rotation.z = .3 + Math.sin(time * .7 + leaf.angle) * .035
    }
    if (composer && postprocessing) composer.render()
    else renderer.render(scene, camera)
    if (!target && !reduced || transitioning || Math.abs(hinge.rotation.z - desired) > .002 || Math.abs(tray.position.z - (target === 'bookshelf' ? -1.95 : -2.43)) > .002) requestFrame()
  }
  resize(); requestFrame(); options.onReady()
  return {
    setTarget,
    setMotion(value: boolean) { reduced = !value || media.matches; requestFrame() },
    setPaused(value: boolean) {
      const now = performance.now()
      if (value && active) pausedAt = now
      if (!value && !active && transitioning && pausedAt) startTime += now - pausedAt
      active = !value; lastTime = now; if (!value) requestFrame()
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      const canvas = renderer.domElement
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('pointerleave', cancel); canvas.removeEventListener('webglcontextlost', lost)
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); skyMat.dispose(); textures.forEach(t => t.dispose())
      extraMaterials.forEach(m => m.dispose()); ao?.dispose(); output?.dispose(); composer?.dispose()
      sun.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove()
      // Keep named objects referenced until teardown; no global renderer cache.
      void cover
    },
  }
}
