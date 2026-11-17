// fire3d.js — fire line + smoke + ember wisps + boss golem + coolant stream.
// Small fixed pool sizes; visuals procedural, no external assets, no DOM.
import * as THREE from 'three';

const FLAME_COUNT = 40;   // cone + inner ember cone per flame
const WISP_COUNT = 24;    // small emissive ember spheres
const SMOKE_COUNT = 6;    // soft radial-gradient sprite puffs
const STREAM_SPHERE_COUNT = 12;

export function buildFire(scene, PALETTE) {
  const group = new THREE.Group();

  // --- Flame pool ------------------------------------------------------------
  const outerMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fire, emissive: PALETTE.fire, emissiveIntensity: 2.5,
  });
  const innerMat = new THREE.MeshStandardMaterial({
    color: PALETTE.ember, emissive: PALETTE.ember, emissiveIntensity: 2.2,
  });
  const flames = [];
  for (let i = 0; i < FLAME_COUNT; i += 1) {
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 10), outerMat);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.0, 10), innerMat);
    outer.add(inner);
    inner.position.y = 0.35;
    group.add(outer);
    flames.push(outer);
  }
  const flameLight = new THREE.PointLight(PALETTE.fire, 6, 10, 1.8);
  flameLight.position.set(0, 2.4, 0);
  group.add(flameLight);

  // --- Smoke puffs (canvas radial-gradient texture, soft grey) ---------------
  const smokeCanvas = document.createElement('canvas');
  smokeCanvas.width = 64;
  smokeCanvas.height = 64;
  const sctx = smokeCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(120,120,115,0.9)');
  grad.addColorStop(0.6, 'rgba(120,120,115,0.45)');
  grad.addColorStop(1, 'rgba(120,120,115,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 64, 64);
  const smokeTex = new THREE.CanvasTexture(smokeCanvas);
  const smokeMat = new THREE.SpriteMaterial({
    map: smokeTex, transparent: true, opacity: 0.55, depthWrite: false,
  });
  const smoke = [];
  for (let i = 0; i < SMOKE_COUNT; i += 1) {
    const puff = new THREE.Sprite(smokeMat);
    puff.scale.set(3, 3, 1);
    puff.visible = false;
    group.add(puff);
    smoke.push(puff);
  }

  // --- Ember wisp pool -------------------------------------------------------
  const wispMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fire, emissive: PALETTE.ember, emissiveIntensity: 1.8,
  });
  const wisps = [];
  for (let i = 0; i < WISP_COUNT; i += 1) {
    const s = 0.08 + (i % 4) * 0.04;
    const wisp = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), wispMat);
    wisp.visible = false;
    group.add(wisp);
    wisps.push(wisp);
  }

  // setWisps(list): place pool items at (x, 0.8, z), hide extras.
  function setWisps(list) {
    for (let i = 0; i < WISP_COUNT; i += 1) {
      if (i < list.length) {
        wisps[i].visible = true;
        wisps[i].position.set(list[i].x, 0.8 + Math.sin(i) * 0.2, list[i].z);
      } else {
        wisps[i].visible = false;
      }
    }
  }

  // --- Boss golem (hidden by default, ~2x hero scale ~5.5u tall) -------------
  const boss = new THREE.Group();
  boss.visible = false;
  const rockDark = new THREE.MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.9 });
  const rockMid = new THREE.MeshStandardMaterial({ color: 0x3A3632, roughness: 0.9 });
  const crackMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fire, emissive: PALETTE.fire, emissiveIntensity: 1.5,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.ember, emissive: PALETTE.ember, emissiveIntensity: 3,
  });

  // body: dark-rock spheres + boxes forming a hulking silhouette
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), rockDark);
  body.scale.set(1.2, 1.15, 1);
  body.position.y = 2.2;
  boss.add(body);
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 1.6), rockMid);
  shoulders.position.y = 3.3;
  boss.add(shoulders);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), rockMid);
  head.position.y = 4.4;
  head.scale.set(1, 0.9, 1);
  boss.add(head);

  // orange emissive thin boxes as cracks
  const crack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.08), crackMat);
  crack.position.y = 2.2;
  crack.rotation.z = 0.4;
  boss.add(crack);
  const crack2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.1), crackMat);
  crack2.position.set(0, 3.1, 0.85);
  boss.add(crack2);

  // two glowing ember eyes
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), eyeMat);
  eyeL.position.set(-0.28, 4.5, 0.8);
  boss.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), eyeMat);
  eyeR.position.set(0.28, 4.5, 0.8);
  boss.add(eyeR);
  group.add(boss);

  // --- Coolant stream (tapered cyan cylinder + orbiting spheres) -------------
  const stream = new THREE.Group();
  stream.visible = false;
  const streamMat = new THREE.MeshStandardMaterial({
    color: PALETTE.coolant, emissive: PALETTE.coolant,
    emissiveIntensity: 2.5, transparent: true, opacity: 0.85,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.22, 1, 8, 1, true), streamMat);
  beam.rotation.x = Math.PI / 2;
  stream.add(beam);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: PALETTE.coolant, emissive: PALETTE.coolant, emissiveIntensity: 2.5,
  });
  const streamSpheres = [];
  for (let i = 0; i < STREAM_SPHERE_COUNT; i += 1) {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), sphereMat);
    stream.add(sp);
    streamSpheres.push(sp);
  }
  group.add(stream);

  // Set flame positions from the fire line (x, z + heat scale).
  function setFlames(list) {
    for (let i = 0; i < FLAME_COUNT; i += 1) {
      if (i < list.length) {
        flames[i].visible = true;
        const heat = list[i].heat != null ? list[i].heat : 1;
        flames[i].position.set(list[i].x, 0.8, list[i].z);
        flames[i].scale.set(heat, heat, heat);
      } else {
        flames[i].visible = false;
      }
    }
    // show smoke puffs above the first few visible flames; hide the rest
    for (let i = 0; i < SMOKE_COUNT; i += 1) {
      if (i < list.length && flames[i].visible) {
        smoke[i].position.set(flames[i].position.x, 2.5 + (i % 3), flames[i].position.z);
        smoke[i].visible = true;
      } else {
        smoke[i].visible = false;
      }
    }
  }

  // Show the boss golem at the first unbroken core's (x, z); '' hides it.
  function setBoss(bossName, cores) {
    if (!bossName || !cores || !cores.length) {
      boss.visible = false;
      return;
    }
    const core = cores.find((c) => c.hp > 0) || cores[0];
    boss.visible = true;
    boss.position.set(core.x, 0, core.z);
  }

  // Orient the coolant beam between two points and spread spheres along it.
  function setStream(from, to, on) {
    stream.visible = on;
    if (!on) return;
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    beam.scale.y = len;
    stream.position.copy(from);
    stream.lookAt(to);
    beam.position.z = len / 2;
    for (let i = 0; i < STREAM_SPHERE_COUNT; i += 1) {
      streamSpheres[i].position.set(0, 0, (i + 0.5) * (len / STREAM_SPHERE_COUNT));
    }
  }

  function update(time) {
    // flame flicker
    for (let i = 0; i < FLAME_COUNT; i += 1) {
      const f = flames[i];
      if (!f.visible) continue;
      f.scale.y = f.scale.x * (1 + Math.sin(time * 6 + i) * 0.15);
    }
    // smoke drift upward + wrap
    for (let i = 0; i < SMOKE_COUNT; i += 1) {
      const p = smoke[i];
      if (!p.visible) continue;
      p.position.y += 0.004;
      if (p.position.y > 6) p.position.y = 1.8;
    }
    // wisp bob
    for (let i = 0; i < WISP_COUNT; i += 1) {
      const w = wisps[i];
      if (w.visible) w.position.y += Math.sin(time * 2 + i) * 0.001;
    }
    // stream shimmer
    if (stream.visible) {
      for (let i = 0; i < STREAM_SPHERE_COUNT; i += 1) {
        streamSpheres[i].position.x = Math.sin(time * 4 + i) * 0.1;
      }
    }
    // boss emissive pulse with hp fraction
    if (boss.visible) {
      crackMat.emissiveIntensity = 1.0 + Math.sin(time * 3) * 0.8;
    }
  }

  scene.add(group);
  return { setFlames, setWisps, setBoss, setStream, update };
}