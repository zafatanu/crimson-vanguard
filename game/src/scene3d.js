// scene3d.js — renderer + camera + lights + update() wiring.
// Wires the static builders (hero3d, env3d, fire3d) to the simulation state.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PALETTE } from './config.js';
import { buildHero } from './hero3d.js';
import { buildEnvironment } from './env3d.js';
import { buildFire } from './fire3d.js';

// Fixed logical viewport; CSS scales the canvas for the page layout.
const VIEW_W = 1280;
const VIEW_H = 800;

export function createScene(canvas) {
  // --- Renderer (fixed logical 1280x800, dawn gradient sky shows through) ---
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(VIEW_W, VIEW_H, false);
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xC8DCE8, 35, 95);

  // PMREM RoomEnvironment for metal reflections.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, VIEW_W / VIEW_H, 0.1, 100);

  // --- Lights: ONE warm shadow directional + cool rim + fire-line warm point ---
  const sun = new THREE.DirectionalLight(0xFFE7C2, 2.6);
  sun.position.set(5, 9, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x7fb4ff, 0.4);
  rim.position.set(-6, 4, -6);
  scene.add(rim);

  const warm = new THREE.PointLight(0xff7733, 30, 18, 1.8);
  warm.position.set(0, 1.2, 3.2);
  scene.add(warm);

  scene.add(new THREE.HemisphereLight(0xBFE3F2, 0x6B7F5E, 0.8));

  // --- Build once: hero sentinel + environment + fire system ---
  const hero = buildHero(PALETTE);
  scene.add(hero.group);
  const env = buildEnvironment(scene, PALETTE);
  const fire = buildFire(scene, PALETTE);

  // Palm world offset (matches hero3d palmLight local position).
  const palmLocal = new THREE.Vector3(1.9, 3.4, 1.2);

  // Aim point for the coolant stream: nearest unbroken core, else ahead.
  const aimFrom = new THREE.Vector3();
  const aimTo = new THREE.Vector3();

  let renderedOnce = false;
  let doneTimer = 0;

  function update(state, time, view) {
    // --- Hero ---
    hero.group.position.set(
      state.hero.x,
      1.6 + Math.sin(time * 2) * 0.08,
      state.hero.z
    );
    // Lean / rotate toward movement when moving; keep facing +z when idle.
    const vx = state.hero.vx || 0;
    const vz = state.hero.vz || 0;
    const speed = Math.hypot(vx, vz);
    if (speed > 0.01) {
      hero.group.rotation.y = Math.atan2(vx, vz);
      hero.group.rotation.z = 0.06;
    } else {
      hero.group.rotation.y = 0;
      hero.group.rotation.z = 0;
    }
    hero.palmLight.intensity = state.blasting ? 18 : 8;
    hero.group.visible = (view === 'play');

    // --- Camera per view ---
    if (view === 'play') {
      camera.position.set(state.hero.x + 6.5, 5.2, state.hero.z + 10.5);
      camera.lookAt(state.hero.x, 1.2, state.hero.z);
    } else if (view === 'title') {
      camera.position.set(0, 14, 26);
      camera.lookAt(0, 0, 6);
    } else if (view === 'draft') {
      camera.position.set(0, 11, 25);
      camera.lookAt(0, 1, 2);
    } else {
      // 'over' — dawn wide shot.
      camera.position.set(-8, 10, 22);
      camera.lookAt(0, 1, 4);
    }

    // --- Fire line / wisps / boss ---
    fire.setFlames(state.flames || []);
    fire.setWisps(state.wisps || []);
    fire.setBoss(state.bossName || '', state.cores || []);

    // --- Coolant stream (palm -> aim point) ---
    if (state.blasting) {
      aimFrom.copy(hero.group.position).add(palmLocal);
      const unbroken = (state.cores || []).filter((c) => !c.broken);
      if (unbroken.length) {
        const core = unbroken[0];
        aimTo.set(core.x, 2.5, core.z);
      } else {
        aimTo.set(state.hero.x, 0, state.hero.z + 9);
      }
      fire.setStream(aimFrom, aimTo, true);
    } else {
      fire.setStream(null, null, false);
    }

    // --- Advance the sim visuals and draw ---
    env.update(time);
    fire.update(time);
    renderer.render(scene, camera);

    // Signal capture once after the first stable render + grace delay.
    if (!renderedOnce) {
      renderedOnce = true;
      doneTimer = 0;
    } else {
      doneTimer += 16;
    }
    if (doneTimer >= 500) window.__done = true;
  }

  function resize() {
    renderer.setSize(VIEW_W, VIEW_H, false);
  }

  return { update, resize };
}