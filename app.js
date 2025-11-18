// app.js（全部差し替え）
// - import は一切使わない（<script src="three.min.js"> のグローバル THREE 前提）
// - ジョイスティック＆アバターチェンジもこの中で完結

(function () {
  'use strict';

  let renderer, scene, camera;
  let avatar;                 // アバターの 3D オブジェクト
  let avatarType = 'human';   // 'human' or 'dog'
  let moveDir = { x: 0, y: 0 }; // ジョイスティック入力
  let yaw = Math.PI;          // 左←→右を見る向き
  let pitch = 0.25;
  const CAMERA_DISTANCE = 4;

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  let clock;

  // =====================
  // 初期化
  // =====================
  function init() {
    if (typeof THREE === 'undefined') {
      console.error('THREE.js が読み込まれていません。index.html で three.min.js を先に読み込んでください。');
      return;
    }

    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.error('canvas 要素が見つかりません。');
      return;
    }

    // ボタン・ジョイスティック DOM を拾う
    const btnHuman =
      document.querySelector('[data-avatar="human"]') ||
      Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('人間'));
    const btnDog =
      document.querySelector('[data-avatar="dog"]') ||
      Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('犬'));

    const joystickBase =
      document.querySelector('.joystick__base') ||
      document.querySelector('.joystick') ||
      document.querySelector('[data-joystick]');

    const joystickStick =
      document.querySelector('.joystick__stick') ||
      document.querySelector('.joystick__knob') ||
      (joystickBase ? joystickBase.firstElementChild : null);

    // ---------- Three.js 基本 ----------
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (renderer.outputEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

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
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    hemi.position.set(0, 10, 0);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(4, 8, 4);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(dir);

    // ---------- 部屋＆アート ----------
    createRoom();
    const works =
      (typeof WORKS !== 'undefined' && Array.isArray(WORKS) && WORKS.length > 0)
        ? WORKS
        : [
            { id: 1, title: 'TAF DOG #01', image: './images/dog_01.jpg' },
            { id: 2, title: 'TAF DOG #02', image: './images/dog_02.jpg' },
            { id: 3, title: 'TAF DOG #03', image: './images/dog_03.jpg' }
          ];
    createArtFromWorks(works);

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
  // 部屋
  // =====================
  function createRoom() {
    const room = new THREE.Group();

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.8,
      metalness: 0.0
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
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

    // 壁（4 面）
    const wallGeom = new THREE.PlaneGeometry(20, 6);

    const back = new THREE.Mesh(wallGeom, wallMat);
    back.position.set(0, 3, -10);
    room.add(back);

    const front = new THREE.Mesh(wallGeom, wallMat);
    front.rotation.y = Math.PI;
    front.position.set(0, 3, 10);
    room.add(front);

    const left = new THREE.Mesh(wallGeom, wallMat);
    left.rotation.y = Math.PI / 2;
    left.position.set(-10, 3, 0);
    room.add(left);

    const right = new THREE.Mesh(wallGeom, wallMat);
    right.rotation.y = -Math.PI / 2;
    right.position.set(10, 3, 0);
    room.add(right);

    scene.add(room);
  }

  // =====================
  // 絵（WORKS から生成）
  // =====================
  function createArtFromWorks(works) {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = '';

    const walls = [
      { normal: new THREE.Vector3(0, 0, 1),  origin: new THREE.Vector3(0, 2.8, -9.9) }, // 奥
      { normal: new THREE.Vector3(0, 0, -1), origin: new THREE.Vector3(0, 2.8,  9.9) }, // 手前
      { normal: new THREE.Vector3(1, 0, 0),  origin: new THREE.Vector3(-9.9, 2.8, 0) }, // 左
      { normal: new THREE.Vector3(-1, 0, 0), origin: new THREE.Vector3(9.9,  2.8, 0) }  // 右
    ];

    const perWall = Math.ceil(works.length / walls.length);
    const artWidth = 2.0;
    const spacing = 2.6;

    works.forEach((work, idx) => {
      const wallIdx = Math.floor(idx / perWall);
      const indexOnWall = idx % perWall;
      const wall = walls[wallIdx];

      const startOffset = -((perWall - 1) * spacing) / 2;
      const offset = startOffset + spacing * indexOnWall;

      const group = new THREE.Group();
      let pos = wall.origin.clone();

      if (Math.abs(wall.normal.z) > 0) {
        pos.x += offset;
      } else {
        pos.z += offset;
      }
      group.position.copy(pos);

      const lookAt = pos.clone().add(wall.normal);
      group.lookAt(lookAt);

      // 額縁
      const frameGeom = new THREE.BoxGeometry(artWidth + 0.35, 2.5, 0.12);
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.35,
        roughness: 0.45
      });
      const frameMesh = new THREE.Mesh(frameGeom, frameMat);
      frameMesh.castShadow = true;
      frameMesh.receiveShadow = true;
      group.add(frameMesh);

      // 絵
      const artGeom = new THREE.PlaneGeometry(artWidth, 2.0);
      const tex = loader.load(work.image);
      tex.encoding = THREE.sRGBEncoding;
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter || THREE.LinearMipmapLinearFilter;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy
        ? renderer.capabilities.getMaxAnisotropy()
        : 8;

      const artMat = new THREE.MeshBasicMaterial({ map: tex });
      const artMesh = new THREE.Mesh(artGeom, artMat);
      artMesh.position.z = 0.07;
      group.add(artMesh);

      // スポットライト
      const spot = new THREE.SpotLight(0xffffff, 1.1, 10, Math.PI / 6, 0.4, 1);
      spot.position.set(0, 1.2, 0.6);
      spot.castShadow = true;
      spot.target = artMesh;
      group.add(spot);
      group.add(spot.target);

      scene.add(group);
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

    // 影っぽい円
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 32),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        opacity: 0.25,
        transparent: true
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    group.add(shadow);

    group.position.set(0, 0, 4);

    return group;
  }

  function createDogAvatar() {
    // 今は人間と同じ形で色だけ変える簡易版
    const group = createHumanAvatar();
    group.traverse(function (obj) {
      if (obj.isMesh && obj.material && obj.material.color) {
        obj.material = obj.material.clone();
        obj.material.color.offsetHSL(-0.12, -0.1, -0.15);
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

    avatar = (type === 'dog') ? createDogAvatar() : createHumanAvatar();
    avatar.position.copy(pos);
    avatar.rotation.y = rotY;
    scene.add(avatar);

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
  // カメラのドラッグ操作
  // =====================
  function setupCameraDrag(canvas) {
    const start = function (x, y) {
      isDragging = true;
      dragStartX = x;
      dragStartY = y;
    };

    const move = function (x, y) {
      if (!isDragging) return;
      const dx = (x - dragStartX) * 0.005;
      const dy = (y - dragStartY) * 0.005;

      yaw -= dx;      // 左へドラッグで左を見る
      pitch -= dy;    // 上下
      pitch = Math.max(-0.3, Math.min(0.8, pitch));

      dragStartX = x;
      dragStartY = y;
    };

    const end = function () {
      isDragging = false;
    };

    canvas.addEventListener('pointerdown', function (e) {
      start(e.clientX, e.clientY);
    });

    window.addEventListener('pointermove', function (e) {
      if (!isDragging) return;
      move(e.clientX, e.clientY);
    });

    window.addEventListener('pointerup', end);

    // スマホ向け（念のため）
    canvas.addEventListener('touchstart', function (e) {
      if (!e.touches || !e.touches[0]) return;
      const t = e.touches[0];
      start(t.clientX, t.clientY);
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (!isDragging || !e.touches || !e.touches[0]) return;
      const t = e.touches[0];
      move(t.clientX, t.clientY);
    }, { passive: true });

    window.addEventListener('touchend', end);
  }

  // =====================
  // ジョイスティック操作
  // =====================
  function setupJoystick(base, stick) {
    if (!base || !stick) {
      console.warn('ジョイスティックの DOM が見つからなかったので無効化します。');
      return;
    }

    let active = false;
    let centerX = 0;
    let centerY = 0;
    const maxDist = (base.offsetWidth || 80) / 2;

    function start(x, y) {
      active = true;
      const rect = base.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
      move(x, y);
    }

    function move(x, y) {
      if (!active) return;

      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
      const angle = Math.atan2(dy, dx);

      const sx = Math.cos(angle) * dist;
      const sy = Math.sin(angle) * dist;

      stick.style.transform = 'translate(' + sx + 'px,' + sy + 'px)';

      // 正規化（-1〜1）
      const nx = sx / maxDist;
      const ny = sy / maxDist;

      // 画面上方向 = 前進（Z マイナス方向）
      moveDir.x = nx;       // 左右
      moveDir.y = -ny;      // 前後（上ドラッグで前進）
    }

    function end() {
      active = false;
      moveDir.x = 0;
      moveDir.y = 0;
      stick.style.transform = 'translate(0px,0px)';
    }

    base.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      start(e.clientX, e.clientY);
    });

    window.addEventListener('pointermove', function (e) {
      if (!active) return;
      e.preventDefault();
      move(e.clientX, e.clientY);
    });

    window.addEventListener('pointerup', function () {
      if (!active) return;
      end();
    });

    base.addEventListener('touchstart', function (e) {
      if (!e.touches || !e.touches[0]) return;
      const t = e.touches[0];
      start(t.clientX, t.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', function (e) {
      if (!active || !e.touches || !e.touches[0]) return;
      const t = e.touches[0];
      move(t.clientX, t.clientY);
    }, { passive: false });

    window.addEventListener('touchend', function () {
      if (!active) return;
      end();
    });
  }

  // =====================
  // アバターチェンジボタン
  // =====================
  function setupAvatarToggle(btnHuman, btnDog) {
    if (btnHuman) {
      btnHuman.addEventListener('click', function (e) {
        e.preventDefault();
        if (avatarType !== 'human') {
          setAvatarType('human', btnHuman, btnDog);
        }
      });
    }
    if (btnDog) {
      btnDog.addEventListener('click', function (e) {
        e.preventDefault();
        if (avatarType !== 'dog') {
          setAvatarType('dog', btnHuman, btnDog);
        }
      });
    }
  }

  // =====================
  // リサイズ＆アニメーション
  // =====================
  function setupResize() {
    window.addEventListener('resize', function () {
      if (!renderer || !camera) return;
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
})();
