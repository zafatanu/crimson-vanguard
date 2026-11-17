// env3d.js — static environment: ground, roads, reservoir, city, trees, coolant towers.
// FIXED layout (hardcoded positions, no RNG) so the city is identical every run.
import * as THREE from 'three';

export function buildEnvironment(scene, PALETTE) {
  const group = new THREE.Group();

  // --- Ground ----------------------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(26, 64),
    new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Dry-tan clearing discs (flat, sit just above the grass).
  const clearings = [
    [-6, -4, 4], [8, 2, 3], [-18, 6, 5], [18, -14, 5], [4, -20, 4],
  ];
  for (const [cx, cz, r] of clearings) {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(r, 32),
      new THREE.MeshStandardMaterial({ color: PALETTE.tan, roughness: 1 })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(cx, 0.01, cz);
    disc.receiveShadow = true;
    group.add(disc);
  }

  // Two dark road strips crossing the map (long thin boxes, y 0.02).
  const roadMat = new THREE.MeshStandardMaterial({ color: PALETTE.road, roughness: 1 });
  const roadA = new THREE.Mesh(new THREE.BoxGeometry(52, 0.02, 2.4), roadMat);
  roadA.position.set(0, 0.02, -2);
  roadA.receiveShadow = true;
  group.add(roadA);
  const roadB = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.02, 52), roadMat);
  roadB.position.set(6, 0.02, 2);
  roadB.receiveShadow = true;
  group.add(roadB);

  // Gold trim ring around the whole ground.
  const trimRing = new THREE.Mesh(
    new THREE.TorusGeometry(14, 0.18, 8, 64),
    new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.5 })
  );
  trimRing.rotation.x = -Math.PI / 2;
  trimRing.position.y = 0.03;
  group.add(trimRing);

  // --- Reservoir -------------------------------------------------------------
  const reservoirMat = new THREE.MeshStandardMaterial({
    color: PALETTE.reservoir, roughness: 0.4, transparent: true,
  });
  const reservoirMesh = new THREE.Mesh(new THREE.CircleGeometry(4, 40), reservoirMat);
  reservoirMesh.rotation.x = -Math.PI / 2;
  reservoirMesh.position.set(16, 0.02, 10);
  reservoirMesh.receiveShadow = true;
  group.add(reservoirMesh);
  const reservoirRim = new THREE.Mesh(
    new THREE.TorusGeometry(4.1, 0.14, 8, 48),
    new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.5 })
  );
  reservoirRim.rotation.x = -Math.PI / 2;
  reservoirRim.position.set(16, 0.03, 10);
  group.add(reservoirRim);

  // --- City boxes (LOW, fixed grid, avoid centre plaza / reservoir / towers) --
  const roofColors = [PALETTE.roof, PALETTE.tan, PALETTE.grass];
  const roofMatCache = roofColors.map((c) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })
  );
  // [x, z, w, d, h, roofIndex]
  const cityBoxes = [
    [-20, -16, 3, 3, 1.6, 0], [-16, -19, 2.4, 2.4, 1.2, 1], [-20, -8, 3, 3, 2.2, 0],
    [-17, -2, 2.6, 2.6, 1.0, 1], [-12, -6, 3, 3, 1.4, 0], [-8, -14, 2.6, 2.6, 1.8, 1],
    [-4, -20, 3, 3, 1.1, 0], [-4, -12, 2.4, 2.4, 2.0, 1], [0, -8, 2.6, 2.6, 1.3, 2],
    [0, 6, 3, 3, 1.7, 0], [-6, 10, 2.6, 2.6, 1.2, 1], [-14, 8, 3, 3, 2.0, 0],
    [-20, 16, 2.6, 2.6, 1.0, 1], [4, -2, 3, 3, 1.9, 0], [10, -8, 2.6, 2.6, 1.3, 1],
    [12, -18, 3, 3, 1.5, 0], [18, -6, 2.6, 2.6, 2.0, 1], [20, 6, 3, 3, 1.1, 0],
    [12, 2, 2.6, 2.6, 1.6, 1], [6, 10, 3, 3, 1.2, 0], [14, 16, 3, 3, 1.8, 1],
    [20, 18, 2.6, 2.6, 1.0, 2], [-10, -20, 2.6, 2.6, 1.9, 2], [-22, 2, 2.4, 2.4, 1.2, 0],
    [18, 12, 2.4, 2.4, 1.5, 1], [-8, 18, 2.6, 2.6, 1.7, 0],
  ];
  for (const [bx, bz, bw, bd, bh, roofIdx] of cityBoxes) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(bw, bh, bd),
      roofMatCache[roofIdx]
    );
    box.position.set(bx, bh / 2, bz);
    box.castShadow = true;
    box.receiveShadow = true;
    group.add(box);
  }

  // Gold edge trim on the tallest 6 boxes (a slightly larger flat box on top).
  const tallestIdx = [1, 3, 7, 9, 16, 12, 14, 22, 10, 5, 20, 0];
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.5 });
  for (let k = 0; k < 6; k += 1) {
    const i = tallestIdx[k];
    const [bx, bz, bw, bd, bh] = cityBoxes[i];
    const trim = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.2, 0.06, bd + 0.2), goldTrimMat);
    trim.position.set(bx, bh + 0.03, bz);
    trim.castShadow = true;
    trim.receiveShadow = true;
    group.add(trim);
  }

  // --- Trees (sphere canopy on a dark cone trunk, along roads & clearings) ---
  const treeCanopyMat = new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 });
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: PALETTE.road, roughness: 1 });
  const treeSpots = [
    [-18, -12], [-14, -14], [-10, -16], [-5, -16], [-1, -18], [-6, -22],
    [2, -4], [8, -4], [14, -2], [20, -2], [26, -2], [-24, -4],
    [-8, 16], [-4, 22], [4, 16], [10, 22], [22, 14], [26, 10],
  ];
  for (const [tx, tz] of treeSpots) {
    const trunk = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.9, 8), treeTrunkMat);
    trunk.position.set(tx, 0.6, tz);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 10), treeCanopyMat);
    canopy.position.set(tx, 1.9, tz);
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    group.add(canopy);
  }

  // --- Coolant towers (the CHARGE targets — match world.js exactly) ----------
  const towers = [];
  const towerPos = [[-14, -8], [12, -10], [0, 12]];
  for (let i = 0; i < towerPos.length; i += 1) {
    const [tx, tz] = towerPos[i];
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 5, 24),
      new THREE.MeshStandardMaterial({ color: PALETTE.steel, roughness: 0.6 })
    );
    mesh.position.set(tx, 2.5, tz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    const ringMat = new THREE.MeshStandardMaterial({
      color: PALETTE.coolant,
      emissive: PALETTE.coolant,
      emissiveIntensity: 2,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.12, 8, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(tx, 5, tz);
    group.add(ring);
    const glow = new THREE.PointLight(PALETTE.coolant, 2, 8);
    glow.position.set(tx, 5, tz);
    group.add(glow);
    towers.push({ x: tx, z: tz, r: 3.5, ringMat, mesh });
  }

  scene.add(group);

  function update(time) {
    towers.forEach((t, i) => {
      t.ringMat.emissiveIntensity = 1.6 + Math.sin(time * 2 + i) * 0.6;
    });
    reservoirMat.opacity = 0.92 + Math.sin(time * 1.3) * 0.05;
  }

  return { towers, reservoir: { x: 16, z: 10, r: 4, mesh: reservoirMesh }, update };
}