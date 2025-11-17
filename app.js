// app.js
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { WORKS } from './data.js';

const canvas = document.getElementById('scene');

// ------- three.js 基本セットアップ -------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio);
resizeRenderer();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020208);

// カメラ（人の目線くらい）
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 1.6, 6);

// コントロール（スマホスワイプで視線回転）
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 2;
controls.maxDistance = 8;
controls.target.set(0, 1.6, -10);

// ライト
const ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambient);

const spot = new THREE.SpotLight(0xffffff, 1.2, 80, Math.PI / 3, 0.4, 1);
spot.position.set(0, 10, 10);
spot.target.position.set(0, 0, -40);
scene.add(spot);
scene.add(spot.target);

// ------- 空間（床・壁だけの簡単な廊下） -------
const floorGeo = new THREE.PlaneGeometry(20, 200);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x111111,
  roughness: 1,
  metalness: 0
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const ceiling = floor.clone();
ceiling.position.y = 3.2;
ceiling.rotation.x = Math.PI / 2;
scene.add(ceiling);

const wallMat = new THREE.MeshStandardMaterial({
  color: 0x050509,
  roughness: 0.9,
  metalness: 0.1
});

const wallLeftGeo = new THREE.PlaneGeometry(200, 3.2);
const wallLeft = new THREE.Mesh(wallLeftGeo, wallMat);
wallLeft.position.set(-3, 1.6, -100);
wallLeft.rotation.y = Math.PI / 2;
scene.add(wallLeft);

const wallRight = wallLeft.clone();
wallRight.position.x = 3;
wallRight.rotation.y = -Math.PI / 2;
scene.add(wallRight);

// ------- 作品配置 -------
const textureLoader = new THREE.TextureLoader();
const clickableMeshes = [];

const frameWidth = 1.1;
const frameHeight = 1.1;
const spacingZ = 2.3; // 作品ごとの奥行き間隔

WORKS.forEach((work, index) => {
  const side = index % 2 === 0 ? -1 : 1; // 左右
  const idxOnSide = Math.floor(index / 2);
  const z = -idxOnSide * spacingZ - 4;   // 手前から奥へ

  const planeGeo = new THREE.PlaneGeometry(1.0, 1.0);
  const tex = textureLoader.load(work.image);
  tex.colorSpace = THREE.SRGBColorSpace;
  const planeMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.7,
    metalness: 0.1
  });
  const artMesh = new THREE.Mesh(planeGeo, planeMat);
  artMesh.position.set(side * 2.3, 1.6, z);
  artMesh.castShadow = true;
  artMesh.receiveShadow = false;

  // フレーム
  const frameGeo = new THREE.PlaneGeometry(frameWidth, frameHeight);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.3,
    roughness: 0.4
  });
  const frameMesh = new THREE.Mesh(frameGeo, frameMat);
  frameMesh.position.copy(artMesh.position);
  frameMesh.position.z -= side * 0.001; // 若干奥に
  scene.add(frameMesh);

  // 作品本体を前に少し浮かせる
  artMesh.position.z += side * 0.01;
  artMesh.userData.work = work;
  scene.add(artMesh);

  clickableMeshes.push(artMesh);
});

// ------- カメラ移動（← → ボタンで廊下を前後） -------
const btnForward = document.getElementById('btn-forward');
const btnBack = document.getElementById('btn-back');

btnForward.addEventListener('click', () => moveCamera(-1));
btnBack.addEventListener('click', () => moveCamera(1));

function moveCamera(direction) {
  // z方向に少しずつ移動（direction = -1:奥へ, +1:手前へ）
  const step = 2.3;
  camera.position.z += direction * step;
  controls.target.z += direction * step;

  // 移動範囲の制限
  const minZ = -spacingZ * (Math.ceil(WORKS.length / 2)) - 4;
  const maxZ = 6;
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, minZ, maxZ);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, minZ - 2, maxZ - 2);
}

// ------- タップ / クリックで作品詳細 -------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

canvas.addEventListener('click', onTap);
canvas.addEventListener('touchend', (e) => {
  if (e.changedTouches.length > 0) {
    const t = e.changedTouches[0];
    onTap(t);
  }
});

function onTap(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ( (event.clientX - rect.left) / rect.width ) * 2 - 1;
  const y = - ( (event.clientY - rect.top) / rect.height ) * 2 + 1;
  pointer.set(x, y);

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(clickableMeshes, false);
  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    const work = mesh.userData.work;
    if (work) {
      showInfo(work);
    }
  }
}

// ------- 情報パネル -------
const infoPanel = document.getElementById('info-panel');
const infoClose = document.getElementById('info-close');
const infoImage = document.getElementById('info-image');
const infoTitle = document.getElementById('info-title');
const infoDesc = document.getElementById('info-desc');
const infoLink = document.getElementById('info-link');

function showInfo(work) {
  infoImage.src = work.image;
  infoTitle.textContent = work.title || `TAF DOG #${work.id}`;
  infoDesc.textContent = work.description || "";
  if (work.opensea) {
    infoLink.href = work.opensea;
    infoLink.style.display = 'inline';
  } else {
    infoLink.style.display = 'none';
  }
  infoPanel.classList.remove('hidden');
}

infoClose.addEventListener('click', () => {
  infoPanel.classList.add('hidden');
});

infoPanel.addEventListener('click', (e) => {
  if (e.target === infoPanel) {
    infoPanel.classList.add('hidden');
  }
});

// ------- レンダリングループ -------
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ------- リサイズ対応 -------
window.addEventListener('resize', () => {
  resizeRenderer();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

function resizeRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
}
