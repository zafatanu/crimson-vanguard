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

  // SIDEWALKS: thin roof-colored boxes flanking both road strips (4 strips).
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: PALETTE.roof, roughness: 1 });
  const swBox = new THREE.BoxGeometry(52, 0.06, 1.2);
  const swBox2 = new THREE.BoxGeometry(1.2, 0.06, 52);
  const sidewalks = [
    [0, -2, swBox, 0, -3.3], [0, -2, swBox, 0, -0.7],
    [0, 2, swBox, 0, 0.7], [0, 2, swBox, 0, 3.3],
    [6, 2, swBox2, 4.6, 0], [6, 2, swBox2, 7.4, 0],
  ];
  for (const [rx, rz, geo, ox, oz] of sidewalks) {
    const s = new THREE.Mesh(geo, sidewalkMat);
    s.position.set(rx + ox, 0.03, rz + oz);
    s.receiveShadow = true;
    group.add(s);
  }

  // ZEBRA CROSSINGS at intersections (6, -2) and (0, 2).
  const zebraMat = new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 1 });
  const zebraGeo = new THREE.BoxGeometry(0.5, 0.06, 0.28);
  const zebraSpots = [
    [6, -2], [0, 2],
  ];
  for (const [zx, zz] of zebraSpots) {
    for (let k = 0; k < 5; k += 1) {
      const off = (k - 2) * 0.55;
      const z1 = new THREE.Mesh(zebraGeo, zebraMat);
      z1.position.set(zx + off, 0.04, zz);
      z1.receiveShadow = true;
      group.add(z1);
      const z2 = new THREE.Mesh(zebraGeo, zebraMat);
      z2.position.set(zx, 0.04, zz + off);
      z2.rotation.y = Math.PI / 2;
      z2.receiveShadow = true;
      group.add(z2);
    }
  }

  // CENTER LINES: dashed gold boxes along both roads (8 dashes each).
  const dashMat = new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.6 });
  const dashGeo = new THREE.BoxGeometry(0.16, 0.04, 0.7);
  const dashGeo2 = new THREE.BoxGeometry(0.7, 0.04, 0.16);
  for (let k = 0; k < 8; k += 1) {
    const o = -21 + k * 6;
    const d1 = new THREE.Mesh(dashGeo, dashMat);
    d1.position.set(o, 0.04, -2);
    d1.receiveShadow = true;
    group.add(d1);
    const d2 = new THREE.Mesh(dashGeo2, dashMat);
    d2.position.set(6, 0.04, o);
    d2.receiveShadow = true;
    group.add(d2);
  }

  // PUDDLES: 3 flat circles near the reservoir.
  const puddleMat = new THREE.MeshStandardMaterial({
    color: PALETTE.reservoir, roughness: 0.15, metalness: 0.4, transparent: true,
  });
  const puddles = [[12, 8, 0.9], [19, 7, 0.7], [14, 14, 0.6]];
  for (const [px, pz, pr] of puddles) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(pr, 24), puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(px, 0.03, pz);
    p.receiveShadow = true;
    group.add(p);
  }

  // DEBRIS: 8 small dark boxes near the burnt buildings.
  const debrisMat = new THREE.MeshStandardMaterial({ color: PALETTE.road, roughness: 1 });
  const debrisPos = [
    [-17, -4, 0.3, 0.2, 0.5], [-22, 4, 0.2, 0.4, 0.8],
    [-18, 2, 0.4, 0.3, 1.2], [-21, -6, 0.25, 0.35, 0.3],
    [8, 4, 0.35, 0.3, 2.0], [5, 12, 0.3, 0.4, 0.9],
    [4, 14, 0.2, 0.25, 1.5], [7, 10, 0.4, 0.3, 2.0],
  ];
  for (const [dx, dz, dw, dh, r] of debrisPos) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(dw, dh, dw), debrisMat);
    d.position.set(dx, dh / 2, dz);
    d.rotation.y = r;
    d.castShadow = true;
    d.receiveShadow = true;
    group.add(d);
  }

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

  // --- Trees (3 species by spot index, deterministic, NO Math.random) --------
  const mk = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const canopyA = new THREE.MeshStandardMaterial({ color: '#8FA968', roughness: 1 });
  const canopyB = new THREE.MeshStandardMaterial({ color: '#7A9A58', roughness: 1 });
  const canopyC = new THREE.MeshStandardMaterial({ color: '#A3BC78', roughness: 1 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: PALETTE.road, roughness: 1 });
  const charcoalMat2 = new THREE.MeshStandardMaterial({ color: PALETTE.charcoal, roughness: 1 });
  const emberMat = new THREE.MeshStandardMaterial({
    color: PALETTE.ember, emissive: PALETTE.ember, emissiveIntensity: 2,
  });
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.8, 8);
  const coneGeoA = new THREE.ConeGeometry(1.0, 0.9, 10);
  const coneGeoB = new THREE.ConeGeometry(0.75, 0.9, 10);
  const coneGeoC = new THREE.ConeGeometry(0.5, 0.9, 10);
  const icoGeoA = new THREE.IcosahedronGeometry(0.7, 0);
  const icoGeoB = new THREE.IcosahedronGeometry(0.55, 0);
  const icoGeoC = new THREE.IcosahedronGeometry(0.5, 0);
  const sphereGeoA = new THREE.SphereGeometry(1.1, 12, 10);
  const sphereGeoC = new THREE.SphereGeometry(0.8, 12, 10);
  const treeSpots = [
    [-18, -12], [-14, -14], [-10, -16], [-5, -16], [-1, -18], [-6, -22],
    [2, -4], [8, -4], [14, -2], [20, -2], [26, -2], [-24, -4],
    [-8, 16], [-4, 22], [4, 16], [10, 22], [22, 14], [26, 10],
  ];
  // 3 burnt tree spots nearest the burnt buildings (city boxes 2, 11, 19).
  const burntTreeIdx = [2, 9, 15];
  for (let i = 0; i < treeSpots.length; i += 1) {
    const [tx, tz] = treeSpots[i];
    const burnt = burntTreeIdx.includes(i);
    if (burnt) {
      const bt = mk(trunkGeo, charcoalMat2, tx, 0.5, tz);
      bt.rotation.z = 0.18;
      bt.rotation.x = -0.12;
      group.add(bt);
      const bc = mk(coneGeoA, charcoalMat2, tx, 1.35, tz);
      group.add(bc);
      const bf = mk(new THREE.SphereGeometry(0.1, 8, 6), emberMat, tx, 1.75, tz);
      group.add(bf);
    } else {
      group.add(mk(trunkGeo, trunkMat, tx, 0.4, tz));
      const kind = i % 3;
      if (kind === 0) {
        // CONE STACK: 3 stacked cones, tones A/B/C top-to-bottom.
        group.add(mk(coneGeoA, canopyA, tx, 1.35, tz));
        group.add(mk(coneGeoB, canopyB, tx, 2.15, tz));
        group.add(mk(coneGeoC, canopyC, tx, 2.85, tz));
      } else if (kind === 1) {
        // POLYHEDRON CLUSTER: 3 icosahedra clustered as one irregular crown.
        const g = new THREE.Group();
        g.position.set(tx, 0, tz);
        g.rotation.y = (i * 47) % 360;
        const o1 = mk(icoGeoA, canopyA, 0, 1.6, 0);
        const o2 = mk(icoGeoB, canopyB, 0.4, 2.1, 0.2);
        const o3 = mk(icoGeoC, canopyC, -0.3, 1.9, 0.4);
        g.add(o1); g.add(o2); g.add(o3);
        group.add(g);
      } else {
        // AGGREGATED SPHERE (far spots only): 2 overlapping spheres.
        const g = new THREE.Group();
        g.position.set(tx, 0, tz);
        const s1 = mk(sphereGeoA, canopyA, 0, 1.5, 0);
        const s2 = mk(sphereGeoC, canopyC, 0.3, 1.7, 0.2);
        g.add(s1); g.add(s2);
        group.add(g);
      }
    }
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