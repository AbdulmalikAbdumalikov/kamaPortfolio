import * as THREE from 'three'

const canvas = document.querySelector('#webgl')
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 0, 8)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setClearColor(0x000000, 0)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05

const world = new THREE.Group()
scene.add(world)

const clayMaterial = (color) => new THREE.MeshPhysicalMaterial({
  color,
  roughness: 0.52,
  metalness: 0,
  clearcoat: 0.2,
  clearcoatRoughness: 0.65,
})

// Real 3D clay forms behind the character create depth without covering it.
const blobData = [
  { color: 0xb9abff, position: [-0.15, 0.08, -1.1], scale: [1.35, 1.4, 0.34] },
  { color: 0xa9ebcf, position: [1.58, 0.9, -0.72], scale: [0.46, 0.46, 0.22] },
  { color: 0xffc49e, position: [-1.52, 0.42, -0.76], scale: [0.35, 0.35, 0.2] },
  { color: 0xfff071, position: [1.48, -1.12, -0.7], scale: [0.25, 0.25, 0.16] },
]

const blobs = blobData.map((item) => {
  const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), clayMaterial(item.color))
  blob.position.set(...item.position)
  blob.scale.set(...item.scale)
  world.add(blob)
  return blob
})

const portrait = new THREE.Group()
portrait.position.z = 0.1
world.add(portrait)

const texture = new THREE.TextureLoader().load('assets/developer-hero-final.png')
texture.colorSpace = THREE.SRGBColorSpace
texture.anisotropy = renderer.capabilities.getMaxAnisotropy()

const portraitGeometry = new THREE.PlaneGeometry(4.15, 4.34, 1, 1)

// Stacked alpha silhouettes create a subtle extruded edge when the image tilts.
for (let index = 8; index >= 1; index--) {
  const depthLayer = new THREE.Mesh(
    portraitGeometry,
    new THREE.MeshBasicMaterial({
      map: texture,
      color: index % 2 ? 0x7966e8 : 0x4f419e,
      transparent: true,
      opacity: 0.035 + index * 0.004,
      alphaTest: 0.035,
      depthWrite: false,
      toneMapped: false,
    })
  )
  depthLayer.position.set(index * 0.012, -index * 0.008, -index * 0.026)
  depthLayer.scale.setScalar(1 + index * 0.002)
  portrait.add(depthLayer)
}

const developer = new THREE.Mesh(
  portraitGeometry,
  new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.025,
    depthWrite: true,
    toneMapped: false,
  })
)
developer.position.z = 0.04
portrait.add(developer)

const floorShadow = new THREE.Mesh(
  new THREE.CircleGeometry(1.55, 64),
  new THREE.MeshBasicMaterial({ color: 0x50449a, transparent: true, opacity: 0.14, depthWrite: false })
)
floorShadow.scale.set(1.25, 0.23, 1)
floorShadow.position.set(0.25, -2.05, -0.28)
world.add(floorShadow)

// Floating clay particles reinforce the depth while keeping the hero clean.
const particles = []
for (let index = 0; index < 9; index++) {
  const particle = new THREE.Mesh(
    new THREE.SphereGeometry(0.035 + (index % 3) * 0.015, 18, 12),
    clayMaterial([0x7966e8, 0xffc49e, 0xa9ebcf][index % 3])
  )
  const angle = (index / 9) * Math.PI * 2
  particle.position.set(Math.cos(angle) * (1.75 + (index % 2) * 0.25), Math.sin(angle) * 1.45, -0.25 + (index % 3) * 0.18)
  particle.userData = { angle, speed: 0.08 + index * 0.006, radius: 1.75 + (index % 2) * 0.25 }
  world.add(particle)
  particles.push(particle)
}

scene.add(new THREE.HemisphereLight(0xffffff, 0x7966e8, 2.5))
const keyLight = new THREE.DirectionalLight(0xffffff, 2.8)
keyLight.position.set(4, 5, 6)
scene.add(keyLight)

const pointer = new THREE.Vector2()
const glow = document.querySelector('.cursor-glow')
let baseX = 2.15
let baseY = 0.02
let sceneScale = 0.9

function updateLayout() {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  const compact = innerWidth <= 1024
  const mobile = innerWidth <= 540
  const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z
  const viewWidth = viewHeight * camera.aspect
  baseX = compact ? 0 : viewWidth * 0.23
  baseY = compact ? (mobile ? -0.88 : -0.72) : 0.02
  sceneScale = mobile ? 0.59 : compact ? 0.72 : Math.min(0.9, viewWidth * 0.11)
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.4 : 1.75))
}

addEventListener('pointermove', (event) => {
  pointer.set(event.clientX / innerWidth - 0.5, event.clientY / innerHeight - 0.5)
  document.documentElement.style.setProperty('--mx', `${pointer.x * 28}px`)
  document.documentElement.style.setProperty('--my', `${pointer.y * 22}px`)
  if (glow) {
    glow.style.left = `${event.clientX}px`
    glow.style.top = `${event.clientY}px`
  }
})
addEventListener('resize', updateLayout)
updateLayout()

const clock = new THREE.Clock()
const heroElement = document.querySelector('.hero')
let heroVisible = true
new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting }, { threshold: 0.01 }).observe(heroElement)

function render() {
  const time = clock.getElapsedTime()
  const heroProgress = Math.min(1, Math.max(0, scrollY / Math.max(1, innerHeight)))

  world.rotation.y += (pointer.x * 0.18 - world.rotation.y) * 0.045
  world.rotation.x += (-pointer.y * 0.07 - world.rotation.x) * 0.045
  portrait.rotation.y += (pointer.x * 0.055 - portrait.rotation.y) * 0.05
  portrait.rotation.x += (-pointer.y * 0.028 - portrait.rotation.x) * 0.05
  portrait.position.y = Math.sin(time * 1.25) * 0.035

  world.position.x = baseX + Math.sin(heroProgress * Math.PI) * 0.24
  world.position.y = baseY - heroProgress * 4.6
  world.scale.setScalar(sceneScale * (1 - heroProgress * 0.12))

  blobs[1].position.y = 0.9 + Math.sin(time * 1.1) * 0.08
  blobs[2].position.y = 0.42 + Math.cos(time * 1.35) * 0.06
  const pulse = Math.sin(time * 1.7) * 0.018
  blobs[3].scale.set(0.25 + pulse, 0.25 + pulse, 0.16 + pulse * 0.65)
  particles.forEach((particle, index) => {
    const data = particle.userData
    const angle = data.angle + time * data.speed
    particle.position.x = Math.cos(angle) * data.radius
    particle.position.y = Math.sin(angle) * 1.45 + Math.sin(time * 1.8 + index) * 0.035
  })

  if (heroVisible && !document.hidden) renderer.render(scene, camera)
  requestAnimationFrame(render)
}
render()

const nav = document.querySelector('header')
const navLinks = [...document.querySelectorAll('header nav a')]
const revealItems = document.querySelectorAll('.section-title, .about-text, .clay-card, .project-card, .path article, .contact-row')
revealItems.forEach((item, index) => {
  item.classList.add('reveal-item')
  item.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`
})
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible')
      revealObserver.unobserve(entry.target)
    }
  })
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
revealItems.forEach((item) => revealObserver.observe(item))

addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 36), { passive: true })
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`))
  })
}, { rootMargin: '-35% 0px -55% 0px' })
document.querySelectorAll('section[id]').forEach((section) => sectionObserver.observe(section))

if (matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      card.style.setProperty('--card-x', `${(x + 0.5) * 100}%`)
      card.style.setProperty('--card-y', `${(y + 0.5) * 100}%`)
      card.style.transform = `perspective(900px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-8px)`
    })
    card.addEventListener('pointerleave', () => { card.style.transform = '' })
  })
}

const form = document.querySelector('#contact-form')
const status = document.querySelector('.form-status')
if (form && status) {
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(form)
    status.textContent = 'Opening your email app...'
    location.href = `mailto:quvondiqovperaska@gmail.com?subject=${encodeURIComponent(`New project from ${data.get('name')}`)}&body=${encodeURIComponent(`${data.get('message')}\n\nReply to: ${data.get('email')}`)}`
  })
}
