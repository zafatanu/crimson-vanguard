import * as THREE from 'three';

export const HERO_HEIGHT = 2.9;

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Build the red iron sentinel as a Group rooted at the feet (y = 0).
// Caller positions the group and rotates it toward movement.
export function buildHero(PALETTE) {
  const red = new THREE.MeshStandardMaterial({ color: PALETTE.heroRed, metalness: 0.75, roughness: 0.32 });
  const redDark = new THREE.MeshStandardMaterial({ color: PALETTE.heroDark, metalness: 0.8, roughness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 0.9, roughness: 0.25, emissive: 0x442200, emissiveIntensity: 0.4 });
  const steel = new THREE.MeshStandardMaterial({ color: PALETTE.steel, metalness: 0.9, roughness: 0.28 });
  const core = new THREE.MeshStandardMaterial({ color: 0xBFEFFF, emissive: PALETTE.coolant, emissiveIntensity: 3.2, metalness: 0.2, roughness: 0.2 });

  const group = new THREE.Group();

  // ---- TORSO (tall capsule, lean into flight) ----
  const torso = new THREE.Group();
  torso.position.set(0, 1.35, 0);
  torso.rotation.x = 0.08;
  group.add(torso);
  const chest = mesh(new THREE.CapsuleGeometry(0.78, 0.7, 8, 20), red, 0, 0.62, 0);
  chest.scale.set(1.15, 1, 0.82); // height > width: tall, not chubby
  torso.add(chest);
  const abs = mesh(new THREE.CylinderGeometry(0.56, 0.64, 0.5, 20), redDark, 0, 0.06, 0);
  torso.add(abs);

  // ---- ARC REACTOR (cyan disc + gold ring, chest, brightest after fire) ----
  const reactor = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 24), core, 0, 0.66, 0.72);
  reactor.rotation.x = Math.PI / 2;
  torso.add(reactor);
  const reactorRing = mesh(new THREE.TorusGeometry(0.31, 0.05, 12, 32), gold, 0, 0.66, 0.72);
  torso.add(reactorRing);

  // ---- HEAD (clearly above the shoulders, front-facing visor + crest) ----
  const headG = new THREE.Group();
  headG.position.set(0, 2.5, 0.02);
  headG.rotation.x = -0.05;
  group.add(headG);
  const skull = mesh(new THREE.SphereGeometry(0.42, 24, 18), red, 0, 0, 0);
  skull.scale.set(0.92, 1.02, 0.95);
  headG.add(skull);
  // glowing cyan visor bar: a squat cylinder, horizontal, emissive, front-facing
  const visor = mesh(new THREE.CylinderGeometry(0.16, 0.3, 0.1, 18), core, 0, 0.02, 0.34);
  visor.rotation.z = Math.PI / 2;
  headG.add(visor);
  // gold crest on the head crown
  const crest = mesh(new THREE.ConeGeometry(0.11, 0.34, 4), gold, 0, 0.42, -0.04);
  crest.rotation.y = Math.PI / 4;
  headG.add(crest);

  // ---- SHOULDERS (big smooth spheres) ----
  const shL = mesh(new THREE.SphereGeometry(0.46, 20, 14), red, -1.05, 2.28, 0);
  shL.scale.set(1, 0.9, 0.95);
  group.add(shL);
  const shR = mesh(new THREE.SphereGeometry(0.46, 20, 14), red, 1.05, 2.28, 0);
  shR.scale.set(1, 0.9, 0.95);
  group.add(shR);

  // ---- LEFT ARM (down, fist) ----
  const armL = new THREE.Group();
  armL.position.set(-1.15, 2.18, 0);
  armL.rotation.z = 0.25;
  group.add(armL);
  armL.add(mesh(new THREE.CapsuleGeometry(0.22, 0.6, 6, 14), red, 0, -0.45, 0));
  armL.add(mesh(new THREE.SphereGeometry(0.28, 16, 12), redDark, 0, -0.95, 0));

  // ---- RIGHT ARM (RAISED, palm forward, cyan repulsor) ----
  const armR = new THREE.Group();
  armR.position.set(1.15, 2.18, 0);
  armR.rotation.z = -1.9;
  armR.rotation.y = -0.5;
  group.add(armR);
  armR.add(mesh(new THREE.CapsuleGeometry(0.22, 0.6, 6, 14), red, 0, -0.45, 0));
  armR.add(mesh(new THREE.SphereGeometry(0.28, 16, 12), redDark, 0, -0.95, 0));
  const palm = mesh(new THREE.CircleGeometry(0.17, 20), core, 0, -1.12, 0.14);
  palm.rotation.x = -0.6;
  armR.add(palm);
  const palmLight = new THREE.PointLight(0x4FD8FF, 12, 6, 1.8);
  palmLight.position.set(1.9, 3.4, 1.2);
  group.add(palmLight);

  // ---- LEGS (dynamic flight stance: one forward, one back) ----
  const legL = new THREE.Group();
  legL.position.set(-0.55, 1.0, 0.35);
  legL.rotation.x = -0.35;
  group.add(legL);
  legL.add(mesh(new THREE.CapsuleGeometry(0.3, 0.55, 6, 16), red, 0, -0.35, 0));
  const bootL = mesh(new THREE.SphereGeometry(0.34, 20, 14), redDark, 0, -0.82, 0.14);
  bootL.scale.set(1, 0.7, 1.4);
  legL.add(bootL);
  const legR = new THREE.Group();
  legR.position.set(0.55, 1.0, -0.3);
  legR.rotation.x = 0.3;
  group.add(legR);
  legR.add(mesh(new THREE.CapsuleGeometry(0.3, 0.55, 6, 16), red, 0, -0.35, 0));
  const bootR = mesh(new THREE.SphereGeometry(0.34, 20, 14), redDark, 0, -0.82, -0.12);
  bootR.scale.set(1, 0.7, 1.4);
  legR.add(bootR);

  return { group, palm, palmLight, reactor, visor };
}