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

  // --- City kit (26 deterministic buildings from fixed cells) ------------------
  const fract = (v) => v - Math.floor(v);
  const hash = (n) => fract(Math.sin(n) * 43758.5453);
  const facadeMat = [
    PALETTE.facadeCream, PALETTE.facadeBrick, PALETTE.facadeOchre,
    PALETTE.facadeSage, PALETTE.facadeSlate, PALETTE.facadeWarmWhite,
  ].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
  const roofMat = [PALETTE.roofTerra, PALETTE.roofDark, PALETTE.roofGreen]
    .map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
  const windowDarkMat = new THREE.MeshStandardMaterial({
    color: PALETTE.windowDark, roughness: 0.6,
  });
  const windowWarmMat = new THREE.MeshStandardMaterial({
    color: PALETTE.windowWarm, emissive: PALETTE.windowWarm, emissiveIntensity: 1.6,
  });
  const charcoalMat = new THREE.MeshStandardMaterial({ color: PALETTE.charcoal, roughness: 0.9 });
  const fireMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fire, emissive: PALETTE.fire, emissiveIntensity: 2.0,
  });
  const winGeo = new THREE.BoxGeometry(0.35, 0.5, 0.06);
  // Same 26 cells as before so gameplay/cameras don't shift.
  const cityPos = [
    [-20, -16], [-16, -19], [-20, -8], [-17, -2], [-12, -6], [-8, -14],
    [-4, -20], [-4, -12], [0, -8], [0, 6], [-6, 10], [-14, 8],
    [-20, 16], [4, -2], [10, -8], [12, -18], [18, -6], [20, 6],
    [12, 2], [6, 10], [14, 16], [20, 18], [-10, -20], [-22, 2],
    [18, 12], [-8, 18],
  ];
  const burntIdx = [2, 11, 19];
  const winWarmRow = [false, true, false, false]; // 1 in 4 windows warm.
  for (let i = 0; i < cityPos.length; i += 1) {
    const [bx, bz] = cityPos[i];
    const h = 1.2 + ((i * 37) % 23) / 10 + (bz < -8 ? 0.6 : 0);
    const size = 2.2 + ((i * 17) % 13) / 10;
    const jx = (hash(i * 12.9898) - 0.5) * 0.8;
    const jz = (hash(i * 78.233) - 0.5) * 0.8;
    const rot = (hash(i * 39.346) - 0.5) * 0.16;
    const burnt = burntIdx.includes(i);
    const type = i % 4;
    const fi = i % 6;
    const facade = burnt ? charcoalMat : facadeMat[fi];
    const roof = burnt ? roofMat[1]
      : (fi === 1 || fi === 2) ? [roofMat[1], roofMat[2]][i % 2]
      : (fi === 3 || fi === 4) ? [roofMat[0], roofMat[1]][i % 2]
      : roofMat[i % 3];
    const mk = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    };
    const b = new THREE.Group();
    b.position.set(bx + jx, 0, bz + jz);
    b.rotation.y = rot;
    b.add(mk(new THREE.BoxGeometry(size, h, size), facade, 0, h / 2, 0));
    if (type === 0) {
      b.add(mk(new THREE.BoxGeometry(size + 0.3, 0.12, size + 0.3), roof, 0, h + 0.06, 0));
    } else if (type === 1) {
      const pyr = mk(new THREE.ConeGeometry(size * 0.75, 0.8, 4), roof, 0, h + 0.4, 0);
      pyr.rotation.y = Math.PI / 4;
      b.add(pyr);
    } else if (type === 2) {
      b.add(mk(new THREE.BoxGeometry(size * 0.6, 0.7, size * 0.6), facade, 0, h + 0.35, 0));
      b.add(mk(new THREE.BoxGeometry(size * 0.6 + 0.15, 0.1, size * 0.6 + 0.15), roof, 0, h + 0.75, 0));
    } else {
      b.add(mk(new THREE.BoxGeometry(size + 0.3, 0.12, size + 0.3), roof, 0, h + 0.06, 0));
      b.add(mk(new THREE.BoxGeometry(0.25, 0.8, 0.25), roofMat[1], 0, h + 0.4, 0));
    }
    const winCount = 2 + (i % 3);
    const winRows = h > 2.2 ? [h * 0.55, h * 0.8] : [h * 0.55];
    for (const wy of winRows) {
      for (let k = 0; k < winCount; k += 1) {
        const wx = (k - (winCount - 1) / 2) * (size * 0.28);
        const warm = burnt || winWarmRow[k % 4];
        b.add(mk(winGeo, warm ? windowWarmMat : windowDarkMat, wx, wy, size / 2 + 0.03));
      }
    }
    if (burnt) {
      b.add(mk(new THREE.ConeGeometry(0.3, 0.7, 8), fireMat, 0, h + 0.35, 0));
    }
    group.add(b);
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