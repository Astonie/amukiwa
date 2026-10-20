import * as THREE from 'three';

export function initScene3D() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'scene3d';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
  hero.style.position = 'relative';
  hero.insertBefore(canvas, hero.firstChild);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 5;

  const count = 120;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const palette = [0x6b2737, 0xd4a574, 0xfaf7f2, 0xc9a96e];
  for (let i = 0; i < count; i++) {
    pos[i*3] = (Math.random() - 0.5) * 10;
    pos[i*3+1] = (Math.random() - 0.5) * 6;
    pos[i*3+2] = (Math.random() - 0.5) * 4;
    const c = new THREE.Color(palette[Math.floor(Math.random()*palette.length)]);
    col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.8, sizeAttenuation: true });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // floating rings
  const ringGeo = new THREE.TorusGeometry(1.2, 0.02, 8, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd4a574, transparent: true, opacity: 0.35 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(2, 0.5, -1);
  scene.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.015, 8, 64), new THREE.MeshBasicMaterial({ color: 0x6b2737, transparent: true, opacity: 0.25 }));
  ring2.position.set(-2.5, -0.5, -2);
  scene.add(ring2);

  function resize() {
    const w = hero.clientWidth; const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let mx = 0, my = 0;
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width - 0.5) * 0.6;
    my = ((e.clientY - r.top) / r.height - 0.5) * 0.6;
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    points.rotation.y = t * 0.08 + mx;
    points.rotation.x = my * 0.5;
    ring.rotation.x = t * 0.3; ring.rotation.y = t * 0.2;
    ring2.rotation.x = -t * 0.25; ring2.rotation.z = t * 0.15;
    // drift particles
    const p = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      p[i*3+1] += Math.sin(t + i) * 0.0008;
    }
    geo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }
  animate();
}
