// app.js - TAF DOG MUSEUM 3D ギャラリー（豪華版）

(() => {
‘use strict’;

const WORKS = window.WORKS || [];
console.log(‘WORKS loaded:’, WORKS.length);

const canvas = document.getElementById(‘scene’);
if (!canvas || typeof THREE === ‘undefined’) {
console.error(‘Canvas or THREE.js not found!’);
return;
}

// デバッグ表示
const dbg = document.createElement(‘div’);
dbg.id = ‘debug-info’;
dbg.style.cssText = `position: fixed; left: 8px; top: 40px; padding: 4px 8px; font-size: 10px; background: rgba(0,0,0,0.8); color: #fff; z-index: 9999;`;
document.body.appendChild(dbg);

// ====== Three.js セットアップ ======
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a20);
scene.fog = new THREE.Fog(0x1a1a20, 10, 40);

const camera = new THREE.PerspectiveCamera(
60,
window.innerWidth / window.innerHeight,
0.1,
1000
);
camera.position.set(0, 2, 8);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const clock = new THREE.Clock();

// ====== ルーム寸法 ======
const ROOM_WIDTH = 24;
const ROOM_DEPTH = 20;
const ROOM_HEIGHT = 6;

// ====== ライト ======
const ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambient);

const mainLight = new THREE.DirectionalLight(0xfff8e1, 0.5);
mainLight.position.set(10, 18, 10);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(2048, 2048);
scene.add(mainLight);

// ====== 床・壁・天井（オシャレに） ======
function createRoom() {
// 床（大理石風）
const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
const floorMat = new THREE.MeshStandardMaterial({
color: 0x2a2a2e,
roughness: 0.7,
metalness: 0.2
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

```
// 天井
const ceilGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
const ceilMat = new THREE.MeshStandardMaterial({ 
  color: 0x1a1a1e,
  roughness: 0.9
});
const ceil = new THREE.Mesh(ceilGeo, ceilMat);
ceil.rotation.x = Math.PI / 2;
ceil.position.y = ROOM_HEIGHT;
scene.add(ceil);

// 壁（上品なグレー）
const wallMat = new THREE.MeshStandardMaterial({ 
  color: 0x3a3a40,
  roughness: 0.85,
  metalness: 0.05
});
const wallGeoW = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
const wallGeoD = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);

const wallFront = new THREE.Mesh(wallGeoW, wallMat);
wallFront.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
wallFront.receiveShadow = true;
scene.add(wallFront);

const wallBack = new THREE.Mesh(wallGeoW, wallMat);
wallBack.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
wallBack.rotation.y = Math.PI;
wallBack.receiveShadow = true;
scene.add(wallBack);

const wallLeft = new THREE.Mesh(wallGeoD, wallMat);
wallLeft.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
wallLeft.rotation.y = Math.PI / 2;
wallLeft.receiveShadow = true;
scene.add(wallLeft);

const wallRight = new THREE.Mesh(wallGeoD, wallMat);
wallRight.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
wallRight.rotation.y = -Math.PI / 2;
wallRight.receiveShadow = true;
scene.add(wallRight);

// 装飾: 柱を追加
addPillars();

// 装飾: 観葉植物
addPlants();
```

}

function addPillars() {
const pillarGeo = new THREE.CylinderGeometry(0.3, 0.35, ROOM_HEIGHT, 16);
const pillarMat = new THREE.MeshStandardMaterial({
color: 0x4a4a50,
roughness: 0.6,
metalness: 0.3
});

```
const positions = [
  [-8, ROOM_HEIGHT / 2, -8],
  [8, ROOM_HEIGHT / 2, -8],
  [-8, ROOM_HEIGHT / 2, 8],
  [8, ROOM_HEIGHT / 2, 8]
];

positions.forEach(([x, y, z]) => {
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.set(x, y, z);
  pillar.castShadow = true;
  scene.add(pillar);
});
```

}

function addPlants() {
const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 8);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520 });
const leafGeo = new THREE.SphereGeometry(0.6, 8, 6);
const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d5016 });

```
const plantPositions = [
  [-9, 0, 0],
  [9, 0, 0],
  [0, 0, -9],
  [0, 0, 9]
];

plantPositions.forEach(([x, y, z]) => {
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(x, 0.6, z);
  scene.add(trunk);

  const leaves = new THREE.Mesh(leafGeo, leafMat);
  leaves.position.set(x, 1.5, z);
  scene.add(leaves);
});
```

}

createRoom();

// ====== 額装のバリエーション ======
const frameStyles = [
{ color: 0x8b4513, metalness: 0.1, roughness: 0.9, width: 0.15 }, // 木製
{ color: 0xdaa520, metalness: 0.8, roughness: 0.2, width: 0.12 }, // ゴールド
{ color: 0x2f4f4f, metalness: 0.6, roughness: 0.4, width: 0.1 },  // ダークメタル
{ color: 0xf5f5dc, metalness: 0.0, roughness: 0.8, width: 0.18 }, // アイボリー
{ color: 0x000000, metalness: 0.4, roughness: 0.6, width: 0.08 }  // モダンブラック
];

function createFrame(style, position, rotationY, artWidth, artHeight) {
const fw = style.width;
const w = artWidth + fw * 2;
const h = artHeight + fw * 2;

```
const frameGeo = new THREE.BoxGeometry(w, h, 0.08);
const frameMat = new THREE.MeshStandardMaterial({
  color: style.color,
  metalness: style.metalness,
  roughness: style.roughness
});
const frameMesh = new THREE.Mesh(frameGeo, frameMat);
frameMesh.position.copy(position);
frameMesh.rotation.y = rotationY;
frameMesh.castShadow = true;
scene.add(frameMesh);

// 内側の凹み
const innerGeo = new THREE.PlaneGeometry(artWidth, artHeight);
const innerMat = new THREE.MeshStandardMaterial({ 
  color: 0x1a1a1a,
  roughness: 0.95
});
const inner = new THREE.Mesh(innerGeo, innerMat);
inner.position.copy(position);
inner.position.z += Math.sin(rotationY) * 0.02;
inner.position.x += Math.cos(rotationY) * 0.02;
inner.rotation.y = rotationY;
scene.add(inner);
```

}

// ====== アート配置（スポットライト付き） ======
const textureLoader = new THREE.TextureLoader();
let loadOk = 0;
let loadNg = 0;

function updateDebug() {
dbg.textContent = `WORKS: ${WORKS.length} | loaded: ${loadOk} | failed: ${loadNg}`;
}

function createSpotlight(position, rotationY) {
const spot = new THREE.SpotLight(0xfff8e1, 1.5, 8, Math.PI / 6, 0.3, 1);
const offset = 1.2;
spot.position.set(
position.x + Math.sin(rotationY) * offset,
position.y + 1.5,
position.z + Math.cos(rotationY) * offset
);
spot.target.position.copy(position);
spot.castShadow = true;
scene.add(spot);
scene.add(spot.target);
}

function createArtworkPlane(texture, position, rotationY, frameStyle) {
const w = 2.2;
const h = 2.8;

```
const geo = new THREE.PlaneGeometry(w, h);
const mat = texture
  ? new THREE.MeshStandardMaterial({ 
      map: texture, 
      roughness: 0.8,
      metalness: 0.1
    })
  : new THREE.MeshStandardMaterial({ color: 0x888888 });

const mesh = new THREE.Mesh(geo, mat);
mesh.position.copy(position);
mesh.position.z += Math.sin(rotationY) * 0.05;
mesh.position.x += Math.cos(rotationY) * 0.05;
mesh.rotation.y = rotationY;
mesh.castShadow = true;
scene.add(mesh);

createFrame(frameStyle, position, rotationY, w, h);
createSpotlight(position, rotationY);
```

}

function layoutArtworks() {
if (!WORKS.length) return;

```
const total = WORKS.length;
const perWall = Math.ceil(total / 4);

const frontZ = -ROOM_DEPTH / 2 + 0.5;
const backZ = ROOM_DEPTH / 2 - 0.5;
const leftX = -ROOM_WIDTH / 2 + 0.5;
const rightX = ROOM_WIDTH / 2 - 0.5;

const frontLen = ROOM_WIDTH - 6;
const sideLen = ROOM_DEPTH - 6;

const frontStep = perWall > 1 ? frontLen / (perWall - 1) : 0;
const sideStep = perWall > 1 ? sideLen / (perWall - 1) : 0;

WORKS.forEach((work, i) => {
  const imgPath = work.img || work.image || work.src || work.url || work.path;
  if (!imgPath) return;

  const wallIndex = Math.floor(i / perWall);
  const indexOnWall = i % perWall;
  const frameStyle = frameStyles[i % frameStyles.length];

  const h = 2.5;
  let pos = new THREE.Vector3();
  let rotY = 0;

  switch (wallIndex) {
    case 0: {
      const startX = -frontLen / 2;
      pos.set(startX + frontStep * indexOnWall, h, frontZ);
      rotY = 0;
      break;
    }
    case 1: {
      const startZ = -sideLen / 2;
      pos.set(rightX, h, startZ + sideStep * indexOnWall);
      rotY = -Math.PI / 2;
      break;
    }
    case 2: {
      const startX = frontLen / 2;
      pos.set(startX - frontStep * indexOnWall, h, backZ);
      rotY = Math.PI;
      break;
    }
    default: {
      const startZ = sideLen / 2;
      pos.set(leftX, h, startZ - sideStep * indexOnWall);
      rotY = Math.PI / 2;
      break;
    }
  }

  textureLoader.load(
    imgPath,
    (tex) => {
      loadOk++;
      updateDebug();
      createArtworkPlane(tex, pos, rotY, frameStyle);
    },
    undefined,
    () => {
      loadNg++;
      updateDebug();
      createArtworkPlane(null, pos, rotY, frameStyle);
    }
  );
});
```

}

layoutArtworks();

// ====== アバター（犬のバリエーション追加） ======
let avatarGroup = null;
let avatarType = ‘human’;
let dogVariant = 0; // 0: 柴犬, 1: ダルメシアン, 2: ゴールデン

const dogColors = [
{ body: 0xd4a574, ear: 0x8b6f47 }, // 柴犬
{ body: 0xffffff, ear: 0x2f4f4f, spots: 0x000000 }, // ダルメシアン
{ body: 0xdaa520, ear: 0xb8860b }  // ゴールデン
];

function clearAvatar() {
if (!avatarGroup) return;
scene.remove(avatarGroup);
avatarGroup.traverse((obj) => {
if (obj.isMesh) {
obj.geometry.dispose();
if (Array.isArray(obj.material)) {
obj.material.forEach((m) => m.dispose && m.dispose());
} else if (obj.material && obj.material.dispose) {
obj.material.dispose();
}
}
});
avatarGroup = null;
}

function createHumanAvatar() {
const group = new THREE.Group();

```
const bodyGeo = new THREE.CylinderGeometry(0.6, 0.6, 2.0, 24);
const colors = [0x2166ac, 0x8c510a, 0x5c3566, 0x1a9850];
const bodyMat = new THREE.MeshStandardMaterial({
  color: colors[Math.floor(Math.random() * colors.length)],
  roughness: 0.7
});
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.castShadow = true;
body.position.y = 1.0;
group.add(body);

const headGeo = new THREE.SphereGeometry(0.7, 24, 16);
const headMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d });
const head = new THREE.Mesh(headGeo, headMat);
head.castShadow = true;
head.position.y = 2.1;
group.add(head);

const footGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
const footMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

const leftFoot = new THREE.Mesh(footGeo, footMat);
leftFoot.position.set(-0.25, 0.1, 0.2);
leftFoot.castShadow = true;
group.add(leftFoot);

const rightFoot = new THREE.Mesh(footGeo, footMat);
rightFoot.position.set(0.25, 0.1, 0.2);
rightFoot.castShadow = true;
group.add(rightFoot);

group.position.set(0, 0, 4);
group.rotation.y = Math.PI;

return group;
```

}

function createDogAvatar(variant) {
const group = new THREE.Group();
const colors = dogColors[variant % dogColors.length];

```
const bodyGeo = new THREE.BoxGeometry(1.4, 0.8, 2.0);
const bodyMat = new THREE.MeshStandardMaterial({ color: colors.body });
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.castShadow = true;
body.position.y = 0.6;
group.add(body);

// ダルメシアンの斑点
if (variant === 1) {
  for (let i = 0; i < 8; i++) {
    const spotGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const spotMat = new THREE.MeshStandardMaterial({ color: colors.spots });
    const spot = new THREE.Mesh(spotGeo, spotMat);
    spot.position.set(
      (Math.random() - 0.5) * 1.2,
      0.6 + (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 1.8
    );
    group.add(spot);
  }
}

const headGeo = new THREE.SphereGeometry(0.6, 20, 16);
const headMat = new THREE.MeshStandardMaterial({ color: colors.body });
const head = new THREE.Mesh(headGeo, headMat);
head.castShadow = true;
head.position.set(0, 1.1, 0.9);
group.add(head);

const earGeo = new THREE.BoxGeometry(0.2, 0.4, 0.1);
const earMat = new THREE.MeshStandardMaterial({ color: colors.ear });
const earL = new THREE.Mesh(earGeo, earMat);
earL.position.set(-0.35, 1.4, 0.8);
earL.castShadow = true;
group.add(earL);
const earR = earL.clone();
earR.position.x *= -1;
group.add(earR);

const legGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 12);
const legMat = new THREE.MeshStandardMaterial({ color: colors.ear });

const legPositions = [
  [-0.4, 0.3, 0.7],
  [0.4, 0.3, 0.7],
  [-0.4, 0.3, -0.7],
  [0.4, 0.3, -0.7]
];

legPositions.forEach(([x, y, z]) => {
  const leg = new THREE.Mesh(legGeo, legMat);
  leg.castShadow = true;
  leg.position.set(x, y, z);
  group.add(leg);
});

group.position.set(0, 0, 4);
group.rotation.y = Math.PI;

return group;
```

}

function getCameraOffset() {
if (avatarType === ‘dog’) {
return new THREE.Vector3(-2.5, 1.8, 2.5); // 横から見やすく
}
return new THREE.Vector3(-3.0, 2.2, 3.0); // 横から見やすく
}

function setAvatar(type) {
if (type === ‘dog’) {
dogVariant = (dogVariant + 1) % dogColors.length; // 犬種切り替え
}
avatarType = type;
clearAvatar();
avatarGroup = type === ‘dog’ ? createDogAvatar(dogVariant) : createHumanAvatar();
scene.add(avatarGroup);
updateAvatarButtons();
}

const btnHuman = document.getElementById(‘btn-human’);
const btnDog = document.getElementById(‘btn-dog’);

function updateAvatarButtons() {
if (!btnHuman || !btnDog) return;
if (avatarType === ‘human’) {
btnHuman.classList.add(‘active’);
btnDog.classList.remove(‘active’);
} else {
btnDog.classList.add(‘active’);
btnHuman.classList.remove(‘active’);
// 犬種表示
const dogNames = [‘柴犬’, ‘ダルメシアン’, ‘ゴールデン’];
btnDog.textContent = dogNames[dogVariant];
}
}

if (btnHuman) btnHuman.addEventListener(‘click’, () => setAvatar(‘human’));
if (btnDog) btnDog.addEventListener(‘click’, () => setAvatar(‘dog’));

setAvatar(‘human’);

// ====== 視線操作（上下追加） ======
let isDraggingView = false;
let lastPointerX = 0;
let lastPointerY = 0;
let verticalAngle = 0; // 上下角度

function onPointerDownView(e) {
isDraggingView = true;
lastPointerX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
lastPointerY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
}

function onPointerMoveView(e) {
if (!isDraggingView || !avatarGroup) return;
const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
const y = e.clientY || (e.touches && e.touches[0].clientY) || 0;

```
const dx = x - lastPointerX;
const dy = y - lastPointerY;
lastPointerX = x;
lastPointerY = y;

const rotateSpeed = 0.004;
avatarGroup.rotation.y -= dx * rotateSpeed;

// 上下視点
verticalAngle += dy * rotateSpeed;
verticalAngle = Math.max(-0.5, Math.min(0.5, verticalAngle)); // 制限
```

}

function onPointerUpView() {
isDraggingView = false;
}

canvas.addEventListener(‘mousedown’, onPointerDownView);
canvas.addEventListener(‘mousemove’, onPointerMoveView);
canvas.addEventListener(‘mouseup’, onPointerUpView);
canvas.addEventListener(‘mouseleave’, onPointerUpView);

canvas.addEventListener(‘touchstart’, onPointerDownView, { passive: false });
canvas.addEventListener(‘touchmove’, onPointerMoveView, { passive: false });
canvas.addEventListener(‘touchend’, onPointerUpView);
canvas.addEventListener(‘touchcancel’, onPointerUpView);

// ====== ジョイスティック（左右修正） ======
const joyBg = document.getElementById(‘joy-bg’);
const joyStick = document.getElementById(‘joy-stick’);

let joyActive = false;
let joyVector = { x: 0, y: 0 };

function setJoyStickPosition(dx, dy) {
if (!joyBg || !joyStick) return;
const r = joyBg.clientWidth / 2;
const len = Math.sqrt(dx * dx + dy * dy);
const max = r;
const scale = len > max ? max / len : 1;
const px = dx * scale;
const py = dy * scale;
joyStick.style.transform = `translate(${px}px, ${py}px)`;
}

function handleJoyPointerDown(e) {
if (!joyBg || !joyStick) return;
joyActive = true;

```
const rect = joyBg.getBoundingClientRect();
const cx = rect.left + rect.width / 2;
const cy = rect.top + rect.height / 2;

const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

const dx = clientX - cx;
const dy = clientY - cy;

const r = rect.width / 2;
joyVector.x = -dx / r; // 左右反転修正
joyVector.y = dy / r;

setJoyStickPosition(dx, dy);
e.preventDefault();
```

}

function handleJoyPointerMove(e) {
if (!joyActive || !joyBg || !joyStick) return;

```
const rect = joyBg.getBoundingClientRect();
const cx = rect.left + rect.width / 2;
const cy = rect.top + rect.height / 2;

const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

const dx = clientX - cx;
const dy = clientY - cy;

const r = rect.width / 2;
joyVector.x = -dx / r; // 左右反転修正
joyVector.y = dy / r;

setJoyStickPosition(dx, dy);
e.preventDefault();
```

}

function handleJoyPointerUp() {
joyActive = false;
joyVector.x = 0;
joyVector.y = 0;
setJoyStickPosition(0, 0);
}

if (joyBg) {
joyBg.addEventListener(‘mousedown’, handleJoyPointerDown);
window.addEventListener(‘mousemove’, handleJoyPointerMove);
window.addEventListener(‘mouseup’, handleJoyPointerUp);

```
joyBg.addEventListener('touchstart', handleJoyPointerDown, { passive: false });
window.addEventListener('touchmove', handleJoyPointerMove, { passive: false });
window.addEventListener('touchend', handleJoyPointerUp);
window.addEventListener('touchcancel', handleJoyPointerUp);
```

}

// ====== 移動処理 ======
function updateMovement(delta) {
if (!avatarGroup) return;

```
const speed = 5.0;
const forward = -joyVector.y;
const strafe = joyVector.x;

if (Math.abs(forward) < 0.01 && Math.abs(strafe) < 0.01) return;

const yaw = avatarGroup.rotation.y;
const cos = Math.cos(yaw);
const sin = Math.sin(yaw);

const worldX = strafe * cos - forward * sin;
const worldZ = strafe * sin + forward * cos;

avatarGroup.position.x += worldX * speed * delta;
avatarGroup.position.z += worldZ * speed * delta;

const margin = 2.0;
const limitX = ROOM_WIDTH / 2 - margin;
const limitZ = ROOM_DEPTH / 2 - margin;
avatarGroup.position.x = Math.max(-limitX, Math.min(limitX, avatarGroup.position.x));
avatarGroup.position.z = Math.max(-limitZ, Math.min(limitZ, avatarGroup.position.z));
```

}

// ====== カメラ追従（上下視点対応） ======
function updateCamera() {
if (!avatarGroup) return;

```
const offset = getCameraOffset();
const yaw = avatarGroup.rotation.y;

const cos = Math.cos(yaw);
const sin = Math.sin(yaw);

const ox = offset.x * cos - offset.z * sin;
const oz = offset.x * sin + offset.z * cos;

camera.position.set(
  avatarGroup.position.x - ox,
  avatarGroup.position.y + offset.y + verticalAngle * 2,
  avatarGroup.position.z - oz
);

const lookTarget = new THREE.Vector3(
  avatarGroup.position.x,
  avatarGroup.position.y + (avatarType === 'dog' ? 0.8 : 1.6) + verticalAngle * 2,
  avatarGroup.position.z
);
camera.lookAt(lookTarget);
```

}

// ====== リサイズ ======
window.addEventListener(‘resize’, () => {
const w = window.innerWidth;
const h = window.innerHeight;
camera.aspect = w / h;
camera.updateProjectionMatrix();
renderer.setSize(w, h);
});

// ====
