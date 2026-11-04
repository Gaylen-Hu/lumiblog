import * as THREE from 'three'
import type { Destination } from './model'

export type RoomOptions = {
  onReady: () => void
  onPick: (target: Destination) => void
  onHover: (target: Destination | null) => void
  onError: () => void
  onSettled: (target: Destination | null) => void
}

// All assets are generated locally. No external textures, fonts or licensed models.
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
  renderer.toneMappingExposure = 1.15
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)
  const camera = new THREE.PerspectiveCamera(57, 1, 0.05, 45)
  const home = new THREE.Vector3(0.2, 1.9, 3.5)
  const homeLook = new THREE.Vector3(-0.3, 1.6, -2.5)
  camera.position.copy(home)
  camera.lookAt(homeLook)
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  const geometries = new Set<THREE.BufferGeometry>()
  const textures = new Set<THREE.Texture>()
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
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#795037'; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 350; i++) {
      ctx.strokeStyle = `rgba(${random() > .5 ? '37,20,12' : '203,155,99'},${random() * .16})`
      ctx.beginPath(); const y = random() * 256
      ctx.moveTo(0, y); ctx.bezierCurveTo(85, y + random() * 6, 170, y - random() * 5, 256, y); ctx.stroke()
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; textures.add(texture)
    return texture
  }
  const wood = mat('#c49b70'); wood.map = woodTexture()
  const darkWood = mat('#936645'); darkWood.map = wood.map
  function timber(at: number[], size: number[], dark = false, parent: THREE.Object3D = scene) {
    return mesh(new THREE.BoxGeometry(...size as [number, number, number]), dark ? darkWood : wood, at, parent)
  }
  // Architectural shell, with a real opening to the dusk sky.
  box([0, -.08, 0], [8, .16, 12], '#573e30')
  for (let i = 0; i < 18; i++) timber([-3.8 + i * .45, .005, 0], [.44, .025, 12], i % 4 === 0)
  box([-4, 2.4, 0], [.16, 4.8, 12], '#b4a18a')
  box([4, 2.4, 0], [.16, 4.8, 12], '#b8a78d')
  box([-2.7, 2.4, -4], [2.6, 4.8, .15], '#b9a58e')
  box([3.3, 2.4, -4], [1.4, 4.8, .15], '#c2ae94')
  box([.6, .64, -4], [4, 1.28, .15], '#baa58c')
  box([.6, 4.35, -4], [4, .9, .15], '#bdaa93')
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
  for (let i = 0; i < 14; i++) {
    const x = -6 + i * .9, h = .7 + random() * 1.3
    box([x, h / 2 + .2, -7.2], [.8, h, .6], '#38424b')
    const roof = mesh(new THREE.ConeGeometry(.63, .6, 4), mat('#424451'), [x, h + .5, -7.2]); roof.rotation.y = Math.PI / 4
    for (let j = 0; j < 2; j++) mesh(new THREE.PlaneGeometry(.12, .18), mat('#e2ac69', true), [x - .18 + j * .35, h * .65, -6.88])
  }
  // Curtains are individual folds: inexpensive geometry, gently animated as a group.
  const curtains = new THREE.Group(); curtains.position.y = 4.04; scene.add(curtains)
  for (const side of [-1.6, 2.8]) for (let i = 0; i < 6; i++) {
    const fold = cylinder([side + (i - 2.5) * .105, -1.4, -3.65], .085, .11, 2.8, i % 2 ? '#aa9579' : '#c7b18d', curtains)
    fold.scale.z = .65
  }
  timber([.6, 4.08, -3.65], [5.1, .055, .055], true)
  // Bookshelf. The semantic hitbox stays stable while the tray moves.
  const shelf = new THREE.Group(); shelf.position.set(-2.85, 0, -2.85); scene.add(shelf)
  timber([0, 1.8, -.28], [1.95, 3.6, .14], true, shelf)
  for (const x of [-1, 1]) timber([x, 1.8, .02], [.14, 3.6, .78], true, shelf)
  const bookColors = ['#384c45', '#746249', '#985b41', '#b09a71', '#4d5b65', '#686347']
  for (let row = 0; row < 5; row++) {
    const y = .42 + row * .63
    timber([0, y, .03], [1.95, .08, .78], true, shelf)
    let x = -.86
    while (x < .84) {
      const width = .095 + random() * .075, height = .36 + random() * .16
      const book = box([x, y + height / 2 + .045, .12 + random() * .04], [width, height, .4], bookColors[Math.floor(random() * bookColors.length)], shelf)
      if (row === 2 && x > .15 && x < .4) { book.position.z += .1; book.rotation.z = -.07 }
      for (const stripe of [-.32, .32]) box([x, y + height / 2 + .045 + stripe * height, .325], [width * .75, .013, .007], '#bba273', shelf)
      x += width + .025
    }
  }
  timber([0, .2, .1], [2, .4, .78], true, shelf)
  for (const x of [-.48, .48]) box([x, .23, .5], [.025, .06, .035], '#b99958', shelf)
  const tray = timber([-2.85, 1.45, -2.43], [1.8, .06, .6])
  hit('bookshelf', [-2.85, 1.85, -2.45], [2.1, 3.3, .65])
  // Writing desk.
  const desk = new THREE.Group(); desk.position.set(.5, 0, -2.45); scene.add(desk)
  timber([0, .94, 0], [3.7, .12, 1.35], false, desk)
  for (const x of [-1.68, 1.68]) for (const z of [-.48, .48]) timber([x, .45, z], [.09, .9, .09], true, desk)
  timber([1.35, .65, 0], [.8, .48, 1.1], true, desk)
  for (const y of [.52, .72]) { timber([1.35, y, .58], [.7, .17, .05], false, desk); box([1.35, y, .62], [.18, .018, .035], '#bc9c59', desk) }
  // Journal with a hinged cover.
  const diary = new THREE.Group(); diary.position.set(-.3, 1.035, -2.09); diary.rotation.y = .1; scene.add(diary)
  box([0, 0, 0], [.65, .045, .48], '#e2cda4', diary)
  box([0, -.027, 0], [.7, .015, .53], '#634334', diary)
  for (let i = 0; i < 9; i++) box([0, .024, -.18 + i * .04], [.42 - random() * .12, .002, .004], '#ad9574', diary)
  const hinge = new THREE.Group(); hinge.position.x = -.34; diary.add(hinge)
  const cover = box([.34, .04, 0], [.7, .015, .53], '#705c43', hinge)
  hinge.rotation.z = .15
  box([.12, .035, .24], [.018, .007, .17], '#9f4738', diary)
  hit('diary', [-.3, 1.07, -2.09], [.85, .2, .75])
  // Laptop, pencil, mug and stationery.
  box([1.48, 1.035, -2.55], [.75, .035, .5], '#777f7e')
  const screen = box([1.48, 1.3, -2.76], [.75, .52, .035], '#303638'); screen.rotation.x = -.15
  const display = box([1.48, 1.3, -2.735], [.68, .44, .006], '#536779'); display.rotation.x = -.15
  for (let i = 0; i < 3; i++) box([1.4, 1.35 - i * .055, -2.69], [.32 + i * .06, .012, .008], '#a9b6b0')
  hit('computer', [1.48, 1.25, -2.55], [.85, .65, .7])
  cylinder([.65, 1.16, -1.99], .105, .09, .25, '#c2aa7f')
  cylinder([.65, 1.29, -1.99], .083, .083, .005, '#483326')
  const handle = mesh(new THREE.TorusGeometry(.08, .018, 8, 16), mat('#c2aa7f'), [.77, 1.18, -1.99]); handle.rotation.y = Math.PI / 2
  const pencil = cylinder([.2, 1.03, -1.95], .009, .009, .32, '#c6934c'); pencil.rotation.z = 1.4
  // Brass lamp, warm pool of light.
  cylinder([-.77, 1.03, -2.72], .16, .18, .045, '#99713d')
  cylinder([-.77, 1.38, -2.72], .017, .017, .7, '#b39452')
  const shade = mesh(new THREE.ConeGeometry(.27, .23, 24, 1, true), mat('#bb9652'), [-.65, 1.78, -2.65]); shade.rotation.z = -.22
  const bulb = mesh(new THREE.SphereGeometry(.07, 12, 8), mat('#ffd99c', true), [-.65, 1.69, -2.65]); bulb.scale.y = .35
  const lamp = new THREE.PointLight('#ffc881', 3.5, 4, 2); lamp.position.set(-.65, 1.58, -2.6); scene.add(lamp)
  // Photo: simple original geometric landscape art.
  timber([-1.92, 2.45, -3.86], [.68, .85, .075], true)
  box([-1.92, 2.45, -3.81], [.57, .74, .01], '#b5a287')
  box([-1.92, 2.45, -3.795], [.47, .6, .01], '#596a6b')
  sphere([-1.83, 2.6, -3.78], [.075, .075, .008], '#d4a269')
  box([-1.92, 2.25, -3.78], [.47, .18, .008], '#374e4a')
  hit('portrait', [-1.92, 2.45, -3.75], [.75, .92, .1])
  function plant(x: number, y: number, z: number, scale: number) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); scene.add(g)
    cylinder([0, .15, 0], .18, .13, .3, '#9e7956', g)
    cylinder([0, .3, 0], .16, .16, .015, '#443b27', g)
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.4, height = .4 + random() * .4
      cylinder([Math.sin(angle) * .06, height / 2 + .25, Math.cos(angle) * .06], .008, .008, height, '#535f36', g)
      const leaf = sphere([Math.sin(angle) * .18, height + .15, Math.cos(angle) * .18], [.13, .055, .24], i % 2 ? '#5b7044' : '#768653', g)
      leaf.rotation.set(.3, angle, .3); leaves.push({ mesh: leaf, angle })
    }
  }
  plant(2, 1.02, -2.9, .65); plant(-3.4, 3.6, -2.8, .7); plant(-1.25, .04, -2.85, 1.1)
  // Textiles and a modest foreground chair, below the main sightlines.
  box([0, .04, .4], [3.8, .025, 2.3], '#9c8e76')
  for (let i = 0; i < 18; i++) box([-1.75 + i * .2, .055, .4], [.012, .004, 2.2], '#b5a48b')
  const chair = new THREE.Group(); chair.position.set(1.5, 0, .4); chair.rotation.y = -.4; scene.add(chair)
  box([0, .45, 0], [.7, .13, .7], '#7d8370', chair)
  box([0, .8, .3], [.73, .6, .13], '#848875', chair)
  for (const x of [-.3, .3]) for (const z of [-.25, .25]) timber([x, .23, z], [.045, .46, .045], true, chair)
  const hemi = new THREE.HemisphereLight('#b1b5c5', '#73513a', 2); scene.add(hemi)
  const sun = new THREE.DirectionalLight('#ffce99', 2.7); sun.position.set(2, 4, -2); sun.castShadow = renderer.shadowMap.enabled
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -5; sun.shadow.camera.right = 5
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
    home.set(width < 700 ? -.2 : .2, 1.9, width < 700 ? 5.3 : 3.5)
    camera.fov = width < 700 ? 72 : 57; camera.updateProjectionMatrix()
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
    if (++frameSamples === 180 && slowSamples > 70) { renderer.setPixelRatio(1); reduced = true; renderer.shadowMap.enabled = false }
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
    const desired = target === 'diary' ? 2.8 : .15
    hinge.rotation.z = THREE.MathUtils.lerp(hinge.rotation.z, desired, reduced ? 1 : Math.min(delta / 150, 1))
    tray.position.z = THREE.MathUtils.lerp(tray.position.z, target === 'bookshelf' ? -1.95 : -2.43, reduced ? 1 : Math.min(delta / 200, 1))
    if (!target && !reduced) {
      const time = now * .001
      curtains.rotation.z = Math.sin(time * .5) * .002
      for (const leaf of leaves) leaf.mesh.rotation.z = .3 + Math.sin(time * .7 + leaf.angle) * .035
    }
    renderer.render(scene, camera)
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
      sun.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove()
      // Keep named objects referenced until teardown; no global renderer cache.
      void cover
    },
  }
}
