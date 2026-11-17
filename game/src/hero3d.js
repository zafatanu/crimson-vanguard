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
  // 4 armor materials (doc §5.2) — no bare shiny capsule. Joints are matte ink.
  const red = new THREE.MeshStandardMaterial({ color: PALETTE.heroRed, metalness: 0.55, roughness: 0.45 });
  const redDark = new THREE.MeshStandardMaterial({ color: PALETTE.heroDark, metalness: 0.6, roughness: 0.5 });
  const gold = new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 0.7, roughness: 0.4, emissive: 0x442200, emissiveIntensity: 0.4 });
  const steel = new THREE.MeshStandardMaterial({ color: PALETTE.steel, metalness: 0.85, roughness: 0.35 });
  const ink = new THREE.MeshStandardMaterial({ color: PALETTE.ink, metalness: 0.3, roughness: 0.8 });
  const core = new THREE.MeshStandardMaterial({ color: 0xBFEFFF, emissive: PALETTE.coolant, emissiveIntensity: 3.0, metalness: 0.2, roughness: 0.2 });

  const group = new THREE.Group();

  // ---- TORSO (two boxes, lean into flight; chest plate on front) ----
  const torso = new THREE.Group();
  torso.position.set(0, 1.15, 0);
  torso.rotation.x = 0.08; // slight forward lean
  group.add(torso);
  const chest = mesh(new THREE.BoxGeometry(1.15, 0.75, 0.62), red, 0, 0.55, 0);
  torso.add(chest);
  const abs = mesh(new THREE.BoxGeometry(0.85, 0.55, 0.5), redDark, 0, 0, 0);
  torso.add(abs);
  // ink waist joint between chest and abdomen
  torso.add(mesh(new THREE.SphereGeometry(0.32, 14, 10), ink, 0, 0.3, 0));
  // gold trim bar across the chest top edge
  torso.add(mesh(new THREE.BoxGeometry(1.02, 0.06, 0.06), gold, 0, 0.94, 0.32));

  // ---- CHEST PLATE (proud steel-framed box with the reactor on it) ----
  const plate = mesh(new THREE.BoxGeometry(0.9, 0.55, 0.1), steel, 0, 0.52, 0.32);
  torso.add(plate);
  // ARC REACTOR (cyan disc + gold ring mounted on the plate)
  const reactor = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 24), core, 0, 0.52, 0.4);
  reactor.rotation.x = Math.PI / 2;
  torso.add(reactor);
  const reactorRing = mesh(new THREE.TorusGeometry(0.3, 0.045, 12, 32), gold, 0, 0.52, 0.4);
  torso.add(reactorRing);

  // ---- HEAD (clearly above shoulders: neck + box skull + wide visor + crest) ----
  const headG = new THREE.Group();
  headG.position.set(0, 2.2, 0.05);
  headG.rotation.x = -0.05;
  group.add(headG);
  // neck cylinder (ink) up to the skull
  headG.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.25, 16), ink, 0, 0.12, -0.02));
  // box skull (heroRed), reads as a separate shape from the torso at 128x80
  headG.add(mesh(new THREE.BoxGeometry(0.55, 0.5, 0.5), red, 0, 0.44, 0));
  // wide glowing cyan visor bar across the face front
  const visor = mesh(new THREE.BoxGeometry(0.42, 0.1, 0.06), core, 0, 0.44, 0.26);
  headG.add(visor);
  // gold crest: thin vertical fin box on the crown
  headG.add(mesh(new THREE.BoxGeometry(0.06, 0.3, 0.4), gold, 0, 0.8, 0));

  // ---- SHOULDERS (angular pauldrons: flattened boxes + steel edge) ----
  const shL = new THREE.Group();
  shL.position.set(-1.0, 2.25, 0);
  shL.rotation.z = 0.12;
  group.add(shL);
  shL.add(mesh(new THREE.BoxGeometry(0.55, 0.35, 0.55), red, 0, 0, 0));
  shL.add(mesh(new THREE.BoxGeometry(0.55, 0.08, 0.3), steel, 0, 0.22, 0));
  const shR = new THREE.Group();
  shR.position.set(1.0, 2.25, 0);
  shR.rotation.z = -0.12;
  group.add(shR);
  shR.add(mesh(new THREE.BoxGeometry(0.55, 0.35, 0.55), red, 0, 0, 0));
  shR.add(mesh(new THREE.BoxGeometry(0.55, 0.08, 0.3), steel, 0, 0.22, 0));

  // ---- LEFT ARM (down, box segments, fist) ----
  const armL = new THREE.Group();
  armL.position.set(-1.1, 2.1, 0);
  armL.rotation.z = 0.22;
  group.add(armL);
  armL.add(mesh(new THREE.BoxGeometry(0.28, 0.55, 0.28), red, 0, -0.25, 0));
  armL.add(mesh(new THREE.SphereGeometry(0.16, 12, 10), ink, 0, -0.52, 0)); // elbow joint
  armL.add(mesh(new THREE.BoxGeometry(0.26, 0.5, 0.26), redDark, 0, -0.82, 0));
  armL.add(mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), ink, 0, -1.1, 0.08)); // fist

  // ---- RIGHT ARM (RAISED, palm forward, cyan repulsor) ----
  const armR = new THREE.Group();
  armR.position.set(1.1, 2.1, 0);
  armR.rotation.z = -1.9;
  armR.rotation.y = 0.4; // palm faces forward (+z)
  group.add(armR);
  armR.add(mesh(new THREE.BoxGeometry(0.28, 0.55, 0.28), red, 0, 0.12, 0));
  armR.add(mesh(new THREE.SphereGeometry(0.16, 12, 10), ink, 0, 0.4, 0.12)); // shoulder joint
  armR.add(mesh(new THREE.BoxGeometry(0.26, 0.5, 0.26), redDark, 0, 0.75, 0.3));
  armR.add(mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), ink, 0, 1.0, 0.4)); // fist
  const palm = mesh(new THREE.CircleGeometry(0.17, 20), core, 0, 1.0, 0.55);
  palm.rotation.x = -0.6;
  armR.add(palm);
  const palmLight = new THREE.PointLight(0x4FD8FF, 12, 6, 1.8);
  palmLight.position.set(1.9, 3.4, 1.2);
  group.add(palmLight);

  // ---- LEGS (dynamic flight stance: one forward, one back) ----
  const legL = new THREE.Group();
  legL.position.set(-0.45, 0.95, 0.35);
  legL.rotation.x = -0.35;
  group.add(legL);
  legL.add(mesh(new THREE.BoxGeometry(0.34, 0.55, 0.34), red, 0, -0.25, 0));
  legL.add(mesh(new THREE.SphereGeometry(0.17, 12, 10), ink, 0, -0.55, 0)); // knee joint
  legL.add(mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), redDark, 0, -0.88, 0));
  legL.add(mesh(new THREE.BoxGeometry(0.36, 0.25, 0.55), ink, 0, -1.22, 0.14)); // boot, toe forward
  const legR = new THREE.Group();
  legR.position.set(0.45, 0.95, -0.3);
  legR.rotation.x = 0.3;
  group.add(legR);
  legR.add(mesh(new THREE.BoxGeometry(0.34, 0.55, 0.34), red, 0, -0.25, 0));
  legR.add(mesh(new THREE.SphereGeometry(0.17, 12, 10), ink, 0, -0.55, 0)); // knee joint
  legR.add(mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), redDark, 0, -0.88, 0));
  legR.add(mesh(new THREE.BoxGeometry(0.36, 0.25, 0.55), ink, 0, -1.22, -0.14)); // boot, toe forward

  // ---- BACKPACK (thruster pack + down-pointing cyan thrusters) ----
  const pack = new THREE.Group();
  pack.position.set(0, 1.55, -0.42);
  group.add(pack);
  pack.add(mesh(new THREE.BoxGeometry(0.7, 0.6, 0.25), redDark, 0, 0, 0));
  const thrL = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.15, 14), core, -0.18, -0.4, 0);
  thrL.rotation.x = Math.PI;
  pack.add(thrL);
  const thrR = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.15, 14), core, 0.18, -0.4, 0);
  thrR.rotation.x = Math.PI;
  pack.add(thrR);

  return { group, palm, palmLight, reactor, visor };
}