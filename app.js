// app.js
// ===============================
// TAF DOG MUSEUM 3D
// 三人称視点 + ジョイスティック + アバターチェンジ
// ===============================

// ---------- 基本セットアップ ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  120
);
scene.add(camera);

const clock = new THREE.Clock();

// ---------- ライティング ----------
{
  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(10, 12, 6);
  scene.add(dir);
}

// ---------- 部屋 ----------
const ROOM_WIDTH = 26;
const ROOM_DEPTH = 16;
const ROOM_HEIGHT = 6;

function createRoom() {
  // 床
  const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.9,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xececec,
    roughness: 1.0,
  });

  const wallGeoW = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
  const wallGeoD = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);

  // 正面 Z+
  const front = new THREE.Mesh(wallGeoW, wallMat);
  front.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  front.rotation.y = Math.PI;
  scene.add(front);

  // 右 X+
  const right = new THREE.Mesh(wallGeoD, wallMat);
  right.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  right.rotation.y = -Math.PI / 2;
  scene.add(right);

  // 左 X-
  const left = new THREE.Mesh(wallGeoD, wallMat);
  left.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  left.rotation.y = Math.PI / 2;
  scene.add(left);

  return { front, right, left };
}

const walls = createRoom();

// ---------- 額縁 & 絵 ----------
const texLoader = new THREE.TextureLoader();
texLoader.crossOrigin = 'anonymous';

function loadArtworkTexture(url) {
  const tex = texLoader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  return tex;
}

function createFrameMesh(work) {
  const FRAME_W = 1.6;
  const FRAME_H = 2.2;
  const FRAME_D = 0.08;

  const frameGeo = new THREE.BoxGeometry(FRAME_W, FRAME_H, FRAME_D);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.25,
    roughness: 0.55,
  });
  const frame = new THREE.Mesh(frameGeo, frameMat);

  // 絵
  const artGeo = new THREE.PlaneGeometry(FRAME_W * 0.9, FRAME_H * 0.9);
  const artTex = loadArtworkTexture(work.image);
  const artMat = new THREE.MeshStandardMaterial({
    map: artTex,
    side: THREE.FrontSide,
  });
  const art = new THREE.Mesh(artGeo, artMat);
  art.position.z = FRAME_D / 2 + 0.002;
  frame.add(art);

  // ライト
  const spot = new THREE.SpotLight(0xffffff, 0.9, 7, Math.PI / 4, 0.5, 1.8);
  spot.position.set(0, FRAME_H / 2 + 0.7, 0.9);
  spot.target = frame;
  frame.add(spot);
  frame.add(spot.target);

  return frame;
}

function layoutArtworks() {
  if (!window.WORKS || !Array.isArray(window.WORKS)) return;

  const works = window.WORKS;
  const total = works.length;
  if (total === 0) return;

  const wallsArr = [walls.front, walls.right, walls.left];
  const perWall = Math.ceil(total / wallsArr.length);

  let idx = 0;
  for (let w = 0; w < wallsArr.length; w++) {
    const wall = wallsArr[w];
    const remaining = total - idx;
    if (remaining <= 0) break;

    const count = Math.min(perWall, remaining);

    const FRAME_W = 1.6;
    const GAP = 1.2; // 等間隔感
    const totalWidth = count * FRAME_W + (count - 1) * GAP;

    for (let i = 0; i < count; i++) {
      const work = works[idx++];
      const frame = createFrameMesh(work);

      const localX =
        -totalWidth / 2 + FRAME_W / 2 + i * (FRAME_W + GAP);
      const localY = ROOM_HEIGHT * 0.55;
      const localZ = 0.02;

      const pos = new THREE.Vector3(localX, localY, localZ);
      wall.localToWorld(pos);
      frame.position.copy(pos);
      frame.rotation.y = wall.rotation.y;

      scene.add(frame);
    }
  }
}

layoutArtworks();

// ---------- アバター ----------
const avatarGroup = new THREE.Group();
scene.add(avatarGroup);

// 人
let humanMesh;
(function createHuman() {
  const bodyGeo = new THREE.CylinderGeometry(0.55, 0.55, 2.1, 32);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x0044aa,
    roughness: 0.65,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.05;

  const headGeo = new THREE.SphereGeometry(0.6, 32, 32);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffc797,
    roughness: 0.7,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 2.2;

  const shoeGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.25, 16);
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
  });
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(-0.2, 0.13, 0);
  shoeR.position.set(0.2, 0.13, 0);

  humanMesh = new THREE.Group();
  humanMesh.add(body, head, shoeL, shoeR);
  avatarGroup.add(humanMesh);

  humanMesh.userData.bodyMat = bodyMat;
})();

// 犬
let dogMesh;
const dogColors = [0xb27a3c, 0xd9a066, 0x8b5a2b];

(function createDog() {
  const bodyGeo = new THREE.CapsuleGeometry(0.45, 0.9, 8, 16);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: dogColors[0],
    roughness: 0.85,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.7;

  const headGeo = new THREE.SphereGeometry(0.5, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({
    color: dogColors[0],
    roughness: 0.85,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 1.15, 0.38);

  const earGeo = new THREE.BoxGeometry(0.14, 0.4, 0.08);
  const earMat = new THREE.MeshStandardMaterial({
    color: 0x5b3a1a,
  });
  const earL = new THREE.Mesh(earGeo, earMat);
  const earR = new THREE.Mesh(earGeo, earMat);
  earL.position.set(-0.24, 1.32, 0.33);
  earR.position.set(0.24, 1.32, 0.33);

  const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.45, 8);
  const legMat = new THREE.MeshStandardMaterial({
    color: dogColors[0],
  });
  const legs = [];
  const offs = [
    [-0.2, 0.3, 0.18],
    [0.2, 0.3, 0.18],
    [-0.2, 0.3, -0.18],
    [0.2, 0.3, -0.18],
  ];
  offs.forEach(o => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(o[0], o[1], o[2]);
    legs.push(leg);
  });

  dogMesh = new THREE.Group();
  dogMesh.add(body, head, earL, earR, ...legs);
  dogMesh.visible = false;
  avatarGroup.add(dogMesh);

  dogMesh.userData = { bodyMat, headMat, legMat };
})();

let avatarMode = 'human';
let dogColorIndex = 0;

function randomizeHumanClothes() {
  const colors = [0x0044aa, 0x663399, 0x008866, 0xaa3333, 0x4444aa];
  const c = new THREE.Color(
    colors[Math.floor(Math.random() * colors.length)]
  );
  humanMesh.userData.bodyMat.color.copy(c);
}

function applyDogColor() {
  const c = new THREE.Color(dogColors[dogColorIndex % dogColors.length]);
  dogColorIndex++;
  const ud = dogMesh.userData;
  ud.bodyMat.color.copy(c);
  ud.headMat.color.copy(c);
  ud.legMat.color.copy(c);
}

function setAvatarMode(mode) {
  avatarMode = mode;
  if (mode === 'human') {
    humanMesh.visible = true;
    dogMesh.visible = false;
    randomizeHumanClothes();
  } else {
    humanMesh.visible = false;
    dogMesh.visible = true;
    applyDogColor();
  }
}

// 初期位置
avatarGroup.position.set(0, 0, 3);

// ---------- カメラ ----------
let yaw = Math.PI; // 左右
let pitch = 0;

const CAM_DIST = 4.3;
const HUMAN_H = 2.2;
const DOG_H = 1.2;

function updateCamera() {
  const baseH = avatarMode === 'human' ? HUMAN_H : DOG_H;
  const target = new THREE.Vector3(
    avatarGroup.position.x,
    baseH * 0.7,
    avatarGroup.position.z
  );

  const offset = new THREE.Vector3();
  offset.x = Math.sin(yaw) * CAM_DIST;
  offset.z = Math.cos(yaw) * CAM_DIST;
  offset.y = baseH * 0.6 + Math.sin(pitch) * 1.0;

  camera.position.copy(target).add(offset);
  camera.lookAt(target);
}

// ---------- ドラッグで視点 ----------
let dragging = false;
let prevX = 0;
let prevY = 0;

canvas.addEventListener('pointerdown', e => {
  dragging = true;
  prevX = e.clientX;
  prevY = e.clientY;
});

window.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - prevX;
  const dy = e.clientY - prevY;
  prevX = e.clientX;
  prevY = e.clientY;

  const ROT_X = 0.004;
  const ROT_Y = 0.003;

  yaw -= dx * ROT_X;
  pitch -= dy * ROT_Y;
  const limit = Math.PI / 4;
  if (pitch > limit) pitch = limit;
  if (pitch < -limit) pitch = -limit;
});

window.addEventListener('pointerup', () => (dragging = false));
window.addEventListener('pointerleave', () => (dragging = false));

// ---------- ジョイスティック ----------
const joyBg = document.getElementById('joy-bg');
const joyStick = document.getElementById('joy-stick');

let joyActive = false;
let joyVec = { x: 0, y: 0 }; // -1〜1

function updateJoyVector(clientX, clientY) {
  const rect = joyBg.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const dx = clientX - cx;
  const dy = clientY - cy;
  const maxR = rect.width / 2;

  let nx = dx / maxR;
  let ny = dy / maxR;
  const len = Math.hypot(nx, ny);
  if (len > 1) {
    nx /= len;
    ny /= len;
  }

  joyVec.x = nx;
  joyVec.y = ny;

  joyStick.style.transform = `translate(${nx * maxR * 0.6}px, ${ny * maxR * 0.6}px)`;
}

function resetJoy() {
  joyVec.x = 0;
  joyVec.y = 0;
  joyStick.style.transform = 'translate(0px, 0px)';
}

function joyStart(e) {
  e.preventDefault();
  joyActive = true;
  const p = e.touches ? e.touches[0] : e;
  updateJoyVector(p.clientX, p.clientY);
}

function joyMove(e) {
  if (!joyActive) return;
  e.preventDefault();
  const p = e.touches ? e.touches[0] : e;
  updateJoyVector(p.clientX, p.clientY);
}

function joyEnd(e) {
  e && e.preventDefault();
  joyActive = false;
  resetJoy();
}

joyBg.addEventListener('mousedown', joyStart);
window.addEventListener('mousemove', joyMove);
window.addEventListener('mouseup', joyEnd);

joyBg.addEventListener('touchstart', joyStart, { passive: false });
window.addEventListener('touchmove', joyMove, { passive: false });
window.addEventListener('touchend', joyEnd, { passive: false });
window.addEventListener('touchcancel', joyEnd, { passive: false });

// ---------- アバターチェンジ UI ----------
const avatarUI = document.getElementById('avatar-ui');
const btnHuman = document.getElementById('btn-human');
const btnDog = document.getElementById('btn-dog');

function updateAvatarButtons() {
  if (!btnHuman || !btnDog) return;
  if (avatarMode === 'human') {
    btnHuman.classList.add('active');
    btnDog.classList.remove('active');
  } else {
    btnDog.classList.add('active');
    btnHuman.classList.remove('active');
  }
}

if (avatarUI) {
  avatarUI.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'btn-human') {
      setAvatarMode('human');
    } else if (btn.id === 'btn-dog') {
      setAvatarMode('dog');
    }
    updateAvatarButtons();
  });
}

// キーボード保険（PCで確認する用）
window.addEventListener('keydown', e => {
  if (e.key === '1') {
    setAvatarMode('human');
    updateAvatarButtons();
  } else if (e.key === '2') {
    setAvatarMode('dog');
    updateAvatarButtons();
  }
});

// 初期
setAvatarMode('human');
updateAvatarButtons();

// ---------- 移動 ----------
function updateAvatarMovement(dt) {
  const x = joyVec.x;
  const y = joyVec.y;
  if (x === 0 && y === 0) return;

  // 上に倒すと前進になるように：forward = -y
  const forward = -y;
  const strafe = x;

  const speed = avatarMode === 'human' ? 3.0 : 4.0;

  const angle = yaw;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);

  // カメラ向き基準の移動
  const vx = (strafe * cos + forward * sin) * speed * dt;
  const vz = (strafe * -sin + forward * cos) * speed * dt;

  avatarGroup.position.x += vx;
  avatarGroup.position.z += vz;

  // 壁外に出ないよう制限
  const margin = 1.2;
  const maxX = ROOM_WIDTH / 2 - margin;
  const maxZ = ROOM_DEPTH / 2 - margin;
  avatarGroup.position.x = Math.max(-maxX, Math.min(maxX, avatarGroup.position.x));
  avatarGroup.position.z = Math.max(-maxZ, Math.min(maxZ, avatarGroup.position.z));

  // 進行方向を向かせる
  if (Math.abs(vx) + Math.abs(vz) > 0.0001) {
    avatarGroup.rotation.y = Math.atan2(vx, vz);
  }
}

// ---------- ループ ----------
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  updateAvatarMovement(dt);
  updateCamera();

  renderer.render(scene, camera);
}
animate();

// ---------- リサイズ ----------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});
