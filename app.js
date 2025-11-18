// app.js ぜんぶこれに差し替え

// =====================
// 基本セットアップ
// =====================
import * as THREE from 'https://unpkg.com/three@0.162.0/build/three.module.js';

let renderer, scene, camera;
let avatar;               // メインのアバター（人 or 犬）
let avatarType = 'human'; // 'human' | 'dog'
let moveDir = { x: 0, y: 0 }; // ジョイスティック入力
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let yaw = Math.PI;        // 左から右に歩くイメージ
let pitch = 0.25;
const CAMERA_DISTANCE = 4;

let clock;

function init() {
  // ---------- DOM 取得（ここが一番重要） ----------
  const canvas = document.querySelector('canvas');
  const btnHuman = document.querySelector('[data-avatar="human"]');
  const btnDog   = document.querySelector('[data-avatar="dog"]');

  // ジョイスティックはこの構造を前提にしている：
  // <div class="joystick">
  //   <div class="joystick__base">
  //     <div class="joystick__stick"></div>
  //   </div>
  // </div>
  const joystickBase =
    document.querySelector('.joystick__base') ||
    document.querySelector('.joystick'); // 念のためフォールバック
  const joystickStick =
    document.querySelector('.joystick__stick') ||
    (joystickBase ? joystickBase.firstElementChild : null);

  if (!canvas) {
    console.error('canvas が見つからない');
    return;
  }

  // ---------- Three.js 基本 ----------
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.6, CAMERA_DISTANCE);

  clock = new THREE.Clock();

  // ---------- ライト ----------
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  hemi.position.set(0, 10, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(3, 6, 4);
  dir.castShadow = true;
  dir.shadow.camera.near = 1;
  dir.shadow.camera.far = 20;
  dir.shadow.mapSize.set(1024, 1024);
  scene.add(dir);

  // ---------- 部屋 ----------
  createRoom();

  // ---------- アート（WORKS は data.js のグローバル） ----------
  if (Array.isArray(window.WORKS)) {
    createArtFromWorks(window.WORKS);
  } else {
    console.warn('WORKS が見つからないのでダミーを表示');
    createArtFromWorks([
      { id: 1, title: 'TAF DOG #01', image: './images/dog_01.jpg' },
      { id: 2, title: 'TAF DOG #02', image: './images/dog_02.jpg' }
    ]);
  }

  // ---------- アバター ----------
  avatar = createHumanAvatar();
  scene.add(avatar);
  setAvatarType('human', btnHuman, btnDog);

  // ---------- イベント ----------
  setupResize();
  setupCameraDrag(canvas);
  setupJoystick(joystickBase, joystickStick);
  setupAvatarToggle(btnHuman, btnDog);

  animate();
}

// =====================
// 部屋・アート
// =====================
function createRoom() {
  const room = new THREE.Group();

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.8,
    metalness: 0.0
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf3f3f3,
    roughness: 0.9,
    metalness: 0.0
  });

  // 床
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  // 壁（正方形の部屋）
  const wallGeom = new THREE.PlaneGeometry(20, 6);

  const wallZBack = new THREE.Mesh(wallGeom, wallMat);
  wallZBack.position.set(0, 3, -10);
  room.add(wallZBack);

  const wallZFront = new THREE.Mesh(wallGeom, wallMat);
  wallZFront.rotation.y = Math.PI;
  wallZFront.position.set(0, 3, 10);
  room.add(wallZFront);

  const wallXLeft = new THREE.Mesh(wallGeom, wallMat);
  wallXLeft.rotation.y = Math.PI / 2;
  wallXLeft.position.set(-10, 3, 0);
  room.add(wallXLeft);

  const wallXRight = new THREE.Mesh(wallGeom, wallMat);
  wallXRight.rotation.y = -Math.PI / 2;
  wallXRight.position.set(10, 3, 0);
  room.add(wallXRight);

  scene.add(room);
}

function createArtFromWorks(works) {
  const loader = new THREE.TextureLoader();
  loader.crossOrigin = '';

  const walls = [
    { normal: new THREE.Vector3(0, 0, 1),  origin: new THREE.Vector3(0, 2.8, -9.99) },  // 奥
    { normal: new THREE.Vector3(0, 0, -1), origin: new THREE.Vector3(0, 2.8,  9.99) },  // 手前
    { normal: new THREE.Vector3(1, 0, 0),  origin: new THREE.Vector3(-9.99, 2.8, 0) },  // 左
    { normal: new THREE.Vector3(-1, 0, 0), origin: new THREE.Vector3(9.99,  2.8, 0) }   // 右
  ];

  const perWall = Math.ceil(works.length / walls.length);
  const artWidth = 2.0;
  const spacing = 2.6;

  works.forEach((work, idx) => {
    const wallIndex = Math.floor(idx / perWall);
    const indexOnWall = idx % perWall;
    const wall = walls[wallIndex];

    const startOffset = -((perWall - 1) * spacing) / 2;
    const offset = startOffset + spacing * indexOnWall;

    const frameGroup = new THREE.Group();

    let pos = wall.origin.clone();
    if (Math.abs(wall.normal.z) > 0) {
      // Z 向きの壁 → X 方向に並べる
      pos.x += offset;
    } else {
      // X 向きの壁 → Z 方向に並べる
      pos.z += offset;
    }

    frameGroup.position.copy(pos);

    const lookAt = pos.clone().add(wall.normal);
    frameGroup.lookAt(lookAt);

    // 額縁
    const frameGeom = new THREE.BoxGeometry(artWidth + 0.3, 2.5, 0.1);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      metalness: 0.4,
      roughness: 0.4
    });
    const frameMesh = new THREE.Mesh(frameGeom, frameMat);
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    frameGroup.add(frameMesh);

    // 絵
    const artGeom = new THREE.PlaneGeometry(artWidth, 2.0);
    const tex = loader.load(work.image);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;

    const artMat = new THREE.MeshBasicMaterial({ map: tex });
    const artMesh = new THREE.Mesh(artGeom, artMat);
    artMesh.position.z = 0.06;
    artMesh.userData.work = work;
    frameGroup.add(artMesh);

    // スポットライト風のライト（点光源）
    const spot = new THREE.SpotLight(0xffffff, 1.1, 10, Math.PI / 6, 0.3, 1);
    spot.position.set(0, 1.2, 0.6);
    spot.target = artMesh;
    spot.castShadow = true;
    frameGroup.add(spot);
    frameGroup.add(spot.target);

    scene.add(frameGroup);
  });
}

// =====================
// アバター
// =====================
function createHumanAvatar() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2654ff,
    roughness: 0.7,
    metalness: 0.1
  });

  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffc9a3,
    roughness: 0.9
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.8
  });

  // 体
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 1.4, 24),
    bodyMat
  );
  body.position.y = 0.7;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 頭
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 32, 32),
    headMat
  );
  head.position.y = 1.7;
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  // 髪
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.6),
    hairMat
  );
  hair.position.copy(head.position);
  hair.castShadow = true;
  group.add(hair);

  // 足元の影っぽい円
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.25, transparent: true })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  group.position.set(0, 0, 4);

  return group;
}

// （今は犬アバターは人間と同じ形・色違いにしておく）
function createDogAvatar() {
  const group = createHumanAvatar();
  group.traverse(obj => {
    if (obj.isMesh && obj.material && obj.material.color) {
      // ざっくり茶色系に
      obj.material = obj.material.clone();
      obj.material.color.offsetHSL(-0.1, 0.0, -0.15);
    }
  });
  return group;
}

function setAvatarType(type, btnHuman, btnDog) {
  if (!avatar) return;

  const pos = avatar.position.clone();
  const rotY = avatar.rotation.y;

  scene.remove(avatar);
  avatarType = type;

  if (type === 'human') {
    avatar = createHumanAvatar();
  } else {
    avatar = createDogAvatar();
  }
  avatar.position.copy(pos);
  avatar.rotation.y = rotY;
  scene.add(avatar);

  // ボタンの見た目を更新
  if (btnHuman && btnDog) {
    if (type === 'human') {
      btnHuman.classList.add('is-active');
      btnDog.classList.remove('is-active');
    } else {
      btnDog.classList.add('is-active');
      btnHuman.classList.remove('is-active');
    }
  }
}

// =====================
// カメラ操作（ドラッグ）
// =====================
function setupCameraDrag(canvas) {
  const onDown = (e) => {
    isDragging = true;
    dragStart.x = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
    dragStart.y = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const x = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
    const y = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);

    const dx = (x - dragStart.x) * 0.005;
    const dy = (y - dragStart.y) * 0.005;

    yaw -= dx;           // 左ドラッグで左を見る
    pitch -= dy;
    pitch = Math.max(-0.3, Math.min(0.8, pitch));

    dragStart.x = x;
    dragStart.y = y;
  };

  const endDrag = () => {
    isDragging = false;
  };

  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', endDrag);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(e); }, { passive: false });
  window.addEventListener('touchmove', (e) => { e.preventDefault(); onMove(e); }, { passive: false });
  window.addEventListener('touchend', endDrag);
}

// =====================
// ジョイスティック
// =====================
function setupJoystick(base, stick) {
  if (!base || !stick) {
    console.warn('ジョイスティック要素が見つからない');
    return;
  }

  let active = false;
  let center = { x: 0, y: 0 };
  const maxDist = base.offsetWidth / 2;

  const start = (x, y) => {
    active = true;
    const rect = base.getBoundingClientRect();
    center.x = rect.left + rect.width / 2;
    center.y = rect.top + rect.height / 2;
    moveStick(x, y);
  };

  const move = (x, y) => {
    if (!active) return;
    moveStick(x, y);
  };

  const end = () => {
    active = false;
    moveDir.x = 0;
    moveDir.y = 0;
    stick.style.transform = 'translate(0px, 0px)';
  };

  const moveStick = (x, y) => {
    const dx = x - center.x;
    const dy = y - center.y;

    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
    const angle = Math.atan2(dy, dx);

    const sx = Math.cos(angle) * dist;
    const sy = Math.sin(angle) * dist;
    stick.style.transform = `translate(${sx}px, ${sy}px)`;

    // 上方向（画面の上）を「前進」にする
    const nx = sx / maxDist;
    const ny = sy / maxDist;
    moveDir.x = nx;
    moveDir.y = -ny; // ここが前進
  };

  // Pointer
  base.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    start(e.clientX, e.clientY);
  });
  window.addEventListener('pointermove', (e) => {
    if (!active) return;
    move(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', () => {
    if (!active) return;
    end();
  });

  // Touch（念のため）
  base.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    start(t.clientX, t.clientY);
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (!active) return;
    e.preventDefault();
    const t = e.touches[0];
    move(t.clientX, t.clientY);
  }, { passive: false });

  window.addEventListener('touchend', () => {
    if (!active) return;
    end();
  });
}

// =====================
// アバターチェンジボタン
// =====================
function setupAvatarToggle(btnHuman, btnDog) {
  if (btnHuman) {
    btnHuman.addEventListener('click', (e) => {
      e.preventDefault();
      if (avatarType !== 'human') {
        setAvatarType('human', btnHuman, btnDog);
      }
    });
  }
  if (btnDog) {
    btnDog.addEventListener('click', (e) => {
      e.preventDefault();
      if (avatarType !== 'dog') {
        setAvatarType('dog', btnHuman, btnDog);
      }
    });
  }
}

// =====================
// リサイズ & アニメーション
// =====================
function setupResize() {
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
}

function updateAvatar(delta) {
  if (!avatar) return;

  const speed = 2.0; // m/s
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).negate();

  const moveVec = new THREE.Vector3();
  moveVec.addScaledVector(forward, moveDir.y);
  moveVec.addScaledVector(right, moveDir.x);

  if (moveVec.lengthSq() > 0.0001) {
    moveVec.normalize().multiplyScalar(speed * delta);
    avatar.position.add(moveVec);

    // アバターの向き：進行方向を向く
    const targetYaw = Math.atan2(moveVec.x, moveVec.z);
    avatar.rotation.y = targetYaw;
  }
}

function updateCamera() {
  if (!avatar) return;
  const target = avatar.position.clone();
  target.y += 1.3;

  const offset = new THREE.Vector3(
    Math.sin(yaw) * CAMERA_DISTANCE,
    1.5 + CAMERA_DISTANCE * Math.sin(pitch) * 0.5,
    Math.cos(yaw) * CAMERA_DISTANCE
  );
  const camPos = target.clone().add(offset);
  camera.position.copy(camPos);
  camera.lookAt(target);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  updateAvatar(delta);
  updateCamera();

  renderer.render(scene, camera);
}

// =====================
// 起動
// =====================
window.addEventListener('load', init);
