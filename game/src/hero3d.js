import * as THREE from 'three';

export const HERO_HEIGHT = 2.9;

// Red iron sentinel — a low-poly angular diving hero.
// Group is rooted at the feet: y=0 is the sole of the boots.
export function buildHero(PALETTE) {
  // --- Materials -----------------------------------------------------------
  const red = new THREE.MeshStandardMaterial({
    color: PALETTE.heroRed, metalness: 0.55, roughness: 0.45,
  });
  const redDark = new THREE.MeshStandardMaterial({
    color: PALETTE.heroDark, metalness: 0.6, roughness: 0.5,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: PALETTE.gold, metalness: 0.7, roughness: 0.4,
    emissive: 0x442200, emissiveIntensity: 0.4,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: PALETTE.steel, metalness: 0.85, roughness: 0.35,
  });
  const ink = new THREE.MeshStandardMaterial({
    color: PALETTE.ink, metalness: 0.3, roughness: 0.8,
  });
  const core = new THREE.MeshStandardMaterial({
    color: 0xBFEFFF, emissive: PALETTE.coolant, emissiveIntensity: 3.0,
    metalness: 0.2, roughness: 0.2,
  });

  const shadow = (m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  const root = new THREE.Group();

  // --- Torso ---------------------------------------------------------------
  const torso = new THREE.Group();
  torso.position.set(0, 1.15, 0);
  torso.rotation.x = 0.35;
  root.add(torso);

  const chest = shadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.42, 0.95, 4), red
  ));
  chest.position.set(0, 0.55, 0);
  chest.rotation.y = Math.PI / 4;
  torso.add(chest);

  const belly = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.5, 0.42), redDark
  ));
  belly.position.set(0, 0, 0);
  torso.add(belly);

  const waistJoint = shadow(new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 16, 12), ink
  ));
  waistJoint.position.set(0, 0.3, 0);
  torso.add(waistJoint);

  const trimBar = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.06, 0.06), gold
  ));
  trimBar.position.set(0, 0.94, 0.32);
  torso.add(trimBar);

  // Chest plate + reactor + gold ring.
  const plate = shadow(new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 12), steel
  ));
  plate.position.set(0, 0.52, 0.28);
  plate.scale.set(1, 0.75, 0.45);
  torso.add(plate);

  const reactor = shadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.06, 24), core
  ));
  reactor.position.set(0, 0.52, 0.48);
  reactor.rotation.x = Math.PI / 2;
  torso.add(reactor);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.045, 12, 28), gold
  );
  ring.position.set(0, 0.52, 0.48);
  torso.add(ring);

  // --- Head ---------------------------------------------------------------
  const head = new THREE.Group();
  head.position.set(0, 2.2, 0.05);
  head.rotation.x = -0.2;
  root.add(head);

  const neck = shadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.25, 12), ink
  ));
  neck.position.set(0, 0.12, -0.02);
  head.add(neck);

  const skull = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.5, 0.5), red
  ));
  skull.position.set(0, 0.44, 0);
  head.add(skull);

  const visor = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.1, 0.06), core
  ));
  visor.position.set(0, 0.44, 0.26);
  head.add(visor);

  const crest = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.3, 0.4), gold
  ));
  crest.position.set(0, 0.8, 0);
  head.add(crest);

  // --- Shoulders ------------------------------------------------------------
  const shoulderBuilder = (side) => {
    const pad = new THREE.Group();
    pad.position.set(side * 1.05, 2.3, 0);
    pad.rotation.z = -side * 0.12;

    const dome = shadow(new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.45, 0), red
    ));
    dome.scale.set(1, 0.7, 1);
    pad.add(dome);

    const strip = shadow(new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.08, 0.3), steel
    ));
    strip.position.set(0, 0.2, 0);
    pad.add(strip);

    return pad;
  };
  root.add(shoulderBuilder(-1));
  root.add(shoulderBuilder(1));

  // --- Left arm (dropped, swept back) ---------------------------------------
  const leftArm = new THREE.Group();
  leftArm.position.set(-1.1, 2.1, 0);
  leftArm.rotation.z = 0.3;
  leftArm.rotation.x = 0.7;
  root.add(leftArm);

  const armUpperL = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.55, 0.28), red
  ));
  armUpperL.position.set(0, -0.25, 0);
  leftArm.add(armUpperL);

  const elbowL = shadow(new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 12), ink
  ));
  elbowL.position.set(0, -0.52, 0);
  leftArm.add(elbowL);

  const armLowerL = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.5, 0.26), redDark
  ));
  armLowerL.position.set(0, -0.82, 0);
  leftArm.add(armLowerL);

  const fistL = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3), ink
  ));
  fistL.position.set(0, -1.1, 0.08);
  leftArm.add(fistL);

  // --- Right arm (raised, palm aimed forward/down at the fire) --------------
  const rightArm = new THREE.Group();
  rightArm.position.set(1.1, 2.1, 0);
  rightArm.rotation.z = -0.25;
  rightArm.rotation.y = 0.4;
  rightArm.rotation.x = 1.4;
  root.add(rightArm);

  const armUpperR = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.55, 0.28), red
  ));
  armUpperR.position.set(0, 0.12, 0);
  rightArm.add(armUpperR);

  const elbowR = shadow(new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 12), ink
  ));
  elbowR.position.set(0, 0.4, 0.12);
  rightArm.add(elbowR);

  const armLowerR = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.5, 0.26), redDark
  ));
  armLowerR.position.set(0, 0.75, 0.3);
  rightArm.add(armLowerR);

  const fistR = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3), ink
  ));
  fistR.position.set(0, 1.0, 0.4);
  rightArm.add(fistR);

  const palm = shadow(new THREE.Mesh(
    new THREE.CircleGeometry(0.17, 24), core
  ));
  palm.position.set(0, 1.0, 0.55);
  palm.rotation.x = -0.6;
  rightArm.add(palm);

  // Coolant emitter light — local position is contract-fixed, attached to ROOT.
  const palmLight = new THREE.PointLight(0x4FD8FF, 12, 6, 1.8);
  palmLight.position.set(1.1, 2.1, 1.6);
  root.add(palmLight);

  // --- Legs (dynamic dive pose, one forward one back) ------------------------
  const legBuilder = (side, zoff, bootOff) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.45, 0.95, zoff);
    leg.rotation.x = 0.85;

    const thigh = shadow(new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.55, 0.34), red
    ));
    thigh.position.set(0, -0.25, 0);
    leg.add(thigh);

    const knee = shadow(new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 16, 12), ink
    ));
    knee.position.set(0, -0.55, 0);
    leg.add(knee);

    const shin = shadow(new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.5, 0.3), redDark
    ));
    shin.position.set(0, -0.88, 0);
    leg.add(shin);

    const boot = shadow(new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.3, 0.65), ink
    ));
    boot.position.set(0, -1.22, bootOff);
    leg.add(boot);

    const thruster = shadow(new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.4, 16), core
    ));
    thruster.position.set(0, -1.45, -0.1);
    thruster.rotation.x = Math.PI + 0.5;
    leg.add(thruster);

    return leg;
  };
  root.add(legBuilder(-1, 0.35, 0.14));
  root.add(legBuilder(1, -0.3, -0.14));

  // --- Backpack (thruster pack) -----------------------------------------------
  const pack = new THREE.Group();
  pack.position.set(0, 1.55, -0.42);
  root.add(pack);

  const packBox = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.6, 0.25), redDark
  ));
  packBox.position.set(0, 0, 0);
  pack.add(packBox);

  const nozzleL = shadow(new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.6, 16), core
  ));
  nozzleL.position.set(-0.18, -0.65, 0);
  nozzleL.rotation.x = Math.PI;
  pack.add(nozzleL);

  const nozzleR = shadow(new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.6, 16), core
  ));
  nozzleR.position.set(0.18, -0.65, 0);
  nozzleR.rotation.x = Math.PI;
  pack.add(nozzleR);

  return { group: root, palm, palmLight, reactor, visor };
}