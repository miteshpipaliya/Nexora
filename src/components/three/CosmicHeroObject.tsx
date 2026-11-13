import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Procedural THREE-DIMENSIONAL phoenix for the isolated 3D preview branch.
 * The bird is constructed from layered, curved feather meshes, actual 3D
 * torso/head geometry, articulated wings and tail. This is not a texture plane
 * or a CSS-transformed logo. The logo PNG is only a graceful WebGL fallback.
 */
const PALETTES = [
  { primary: '#A855F7', highlight: '#D8B4FE' },
  { primary: '#38BDF8', highlight: '#BAE6FD' },
  { primary: '#EC4899', highlight: '#FBCFE8' },
  { primary: '#FBBF24', highlight: '#FEF3C7' },
];
const CYCLE_SECONDS = 9;
const TRANSITION_SECONDS = 1.6;
const BASE_FEATHER = 0x9956ef;

const createFeatherGeometry = (length: number, width: number, curl: number): THREE.BufferGeometry => {
  const segments = 10;
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  // A feather's elliptical, tapered section has a curved central ridge in Z,
  // so it is an actual 3D surface rather than a flat rectangle.
  const tint = new THREE.Color('#b785f8');
  for (let row = 0; row <= segments; row++) {
    const t = row / segments;
    const lateral = width * Math.pow(Math.sin(Math.PI * t), 0.72) * (1 - 0.22 * t);
    const centerX = Math.sin(t * Math.PI) * curl * 0.12;
    const z = Math.sin(t * Math.PI) * curl + 0.11 * t * t;
    for (const side of [-1, 0, 1]) {
      positions.push(centerX + lateral * side, -length * t, z + (side === 0 ? 0.075 : -0.025));
      const tone = tint.clone().lerp(new THREE.Color('#e4d7ff'), 0.12 + 0.27 * (1 - t) + (side === 0 ? 0.24 : 0));
      colors.push(tone.r, tone.g, tone.b);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < 2; j++) {
      const a = i * 3 + j, b = a + 3;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

const makeOrbit = (radiusX: number, radiusY: number, tilt: [number, number, number], color: THREE.Color) => {
  const group = new THREE.Group();
  group.rotation.set(...tilt);
  const curve = new THREE.CatmullRomCurve3(
    Array.from({ length: 80 }, (_, i) => {
      const a = i / 80 * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * radiusX, Math.sin(a) * radiusY, 0);
    }), true, 'centripetal'
  );
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 180, 0.012, 5, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  group.add(tube);
  const sparkle = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xf8efff, blending: THREE.AdditiveBlending })
  );
  group.add(sparkle);
  return { group, sparkle, curve, material: tube.material as THREE.MeshBasicMaterial };
};

export const CosmicHeroObject: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.innerWidth < 768;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !mobile, powerPreference: 'high-performance' });
    } catch (err) {
      console.warn('[Phoenix 3D] WebGL not available; showing original NEXORA logo', err);
      setFallback(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.65;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 50);
    camera.position.set(0, 0, 10.6);
    const phoenix = new THREE.Group();
    phoenix.position.y = -0.10;
    scene.add(phoenix);

    // Living body silhouette: tapered chest, smaller head, crown and beak.
    const featherMaterial = new THREE.MeshPhysicalMaterial({
      vertexColors: true, side: THREE.DoubleSide, roughness: 0.36,
      metalness: 0.25, emissive: BASE_FEATHER, emissiveIntensity: 0.15,
      clearcoat: 0.62, clearcoatRoughness: 0.25,
    });
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xb393ff, metalness: 0.35, roughness: 0.29,
      emissive: 0x4d168d, emissiveIntensity: 0.30, clearcoat: 0.85,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.37, 24, 18), bodyMaterial);
    body.scale.set(0.82, 1.55, 0.73);
    body.position.y = -0.25;
    phoenix.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.235, 20, 16), bodyMaterial);
    head.position.set(0, 0.54, 0.035);
    phoenix.add(head);

    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.105, 0.31, 6),
      new THREE.MeshStandardMaterial({ color: 0xe7dcff, metalness: 0.35, roughness: 0.32 })
    );
    beak.position.set(0, 0.45, 0.245);
    beak.rotation.x = Math.PI * 0.49;
    phoenix.add(beak);

    const faceEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    faceEye.position.set(-0.105, 0.56, 0.22);
    phoenix.add(faceEye);

    const wings: THREE.Group[] = [];
    const decorativeMaterials: THREE.Material[] = [];
    for (const sign of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(sign * 0.30, 0.34, 0);
      phoenix.add(wing);
      wings.push(wing);

      // Feathers fan outward and upward in nested rows; each has volume,
      // individual geometry, a highlight ridge and its own depth offset.
      const layers = mobile ? 2 : 3;
      for (let layer = 0; layer < layers; layer++) {
        const count = mobile ? 14 : 23;
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          const length = (1.10 + 1.45 * Math.sin(t * Math.PI * 0.83)) * (1 - layer * 0.17);
          const geo = createFeatherGeometry(length, (0.16 + 0.08 * (1 - t)) * (1 - layer * 0.09), 0.17 + 0.1 * t);
          const mesh = new THREE.Mesh(geo, featherMaterial);
          // Feather starts from the shoulder and fans toward the outer wingtip.
          const angle = sign * (0.43 + t * 1.02);
          mesh.rotation.z = angle + (sign < 0 ? -Math.PI / 2 : Math.PI / 2);
          mesh.position.set(sign * (0.10 + 0.88 * t), 0.16 + 0.77 * t - layer * 0.05, -layer * 0.065);
          mesh.rotation.x = 0.12 + layer * 0.05;
          wing.add(mesh);
        }
      }

      // Delicate leading-edge wing contour in real 3D.
      const edgeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0.08),
        new THREE.Vector3(sign * 0.65, 0.66, 0.12),
        new THREE.Vector3(sign * 1.45, 1.45, 0.08),
        new THREE.Vector3(sign * 2.05, 2.55, 0.02),
      ]);
      const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xd5bbff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending });
      decorativeMaterials.push(edgeMaterial);
      wing.add(new THREE.Mesh(new THREE.TubeGeometry(edgeCurve, 48, 0.014, 6, false), edgeMaterial));
    }

    // Layered tail feathers trail beneath the phoenix rather than a 2D plane.
    const tail = new THREE.Group();
    tail.position.y = -0.77;
    phoenix.add(tail);
    for (let i = 0; i < (mobile ? 9 : 15); i++) {
      const t = i / (mobile ? 8 : 14);
      const length = 1.05 + Math.cos((t - 0.5) * Math.PI) * 1.1;
      const feather = new THREE.Mesh(createFeatherGeometry(length, 0.10 + 0.05 * (1 - Math.abs(2*t - 1)), 0.28), featherMaterial);
      feather.rotation.z = (t - 0.5) * 0.59;
      feather.position.set((t - 0.5) * 0.55, 0, -0.08 + (i % 3) * 0.045);
      tail.add(feather);
    }

    const color = new THREE.Color(PALETTES[0].primary);
    const highlight = new THREE.Color(PALETTES[0].highlight);
    const orbits = [
      makeOrbit(2.22, 0.89, [0.36, 0.16, -0.34], color),
      makeOrbit(1.94, 1.18, [0.78, 0.48, 0.56], color),
    ];
    for (const orbit of orbits) phoenix.add(orbit.group);

    // Shared lightweight particle geometry; no individual-mesh star explosion.
    const count = mobile ? 46 : 105;
    const points = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = i * 2.399963, r = 1.4 + (i % 17) / 17 * 1.95;
      points[i * 3] = Math.cos(a) * r;
      points[i * 3 + 1] = Math.sin(a) * r * 0.7;
      points[i * 3 + 2] = -0.5 + (i % 11) / 11;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const dustMat = new THREE.PointsMaterial({
      color: '#b88bff', size: mobile ? 0.028 : 0.033,
      transparent: true, opacity: 0.60, sizeAttenuation: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    const ambient = new THREE.AmbientLight(0xd9b9ff, 1.2);
    scene.add(ambient);
    const key = new THREE.PointLight(0xddc2ff, 19, 10);
    key.position.set(-2, 3, 4);
    scene.add(key);
    const rim = new THREE.PointLight(0x9333ea, 12, 10);
    rim.position.set(2, -1, -3);
    scene.add(rim);

    let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
    const pointer = (e: PointerEvent) => {
      if (mobile || reducedMotion) return;
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetY = THREE.MathUtils.clamp(((e.clientX - rect.left) / rect.width - 0.5) * 0.35, -0.18, 0.18);
      targetX = THREE.MathUtils.clamp(((e.clientY - rect.top) / rect.height - 0.5) * -0.25, -0.13, 0.13);
    };
    window.addEventListener('pointermove', pointer, { passive: true });

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.position.z = w < h ? 10.6 * h / w : 10.6;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    let visible = !document.hidden;
    let intersecting = true;
    const intersection = new IntersectionObserver(entries => {
      intersecting = entries[0]?.isIntersecting ?? true;
    }, { threshold: 0.01 });
    intersection.observe(host);
    const visibility = () => { visible = !document.hidden; };
    document.addEventListener('visibilitychange', visibility);

    let raf = 0, elapsed = 0, last = performance.now();
    const baseColor = new THREE.Color(BASE_FEATHER);
    const currentColor = new THREE.Color();
    const currentHighlight = new THREE.Color();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const delta = Math.min((now - last) / 1000, 0.045);
      last = now;
      if (!visible || !intersecting) return;
      if (!reducedMotion) elapsed += delta;

      currentX = THREE.MathUtils.damp(currentX, targetX, 2.8, delta);
      currentY = THREE.MathUtils.damp(currentY, targetY, 2.8, delta);
      phoenix.rotation.x = currentX;
      phoenix.rotation.y = currentY;

      // Fixed violet identity; only reflections and surrounding energy shift.
      body.position.y = -0.25 + Math.sin(elapsed * 0.9) * 0.015;
      phoenix.position.y = -0.10 + Math.sin(elapsed * 0.85) * 0.065;
      wings[0].rotation.z = Math.sin(elapsed * 0.68) * 0.042;
      wings[1].rotation.z = -Math.sin(elapsed * 0.68) * 0.042;
      tail.rotation.y = Math.sin(elapsed * 0.5) * 0.035;
      dust.rotation.y = elapsed * 0.012;

      const cycle = elapsed / CYCLE_SECONDS;
      const index = Math.floor(cycle) % PALETTES.length;
      const next = (index + 1) % PALETTES.length;
      const fraction = cycle - Math.floor(cycle);
      const mix = THREE.MathUtils.smoothstep(fraction, 1 - TRANSITION_SECONDS / CYCLE_SECONDS, 1);
      currentColor.set(PALETTES[index].primary).lerp(new THREE.Color(PALETTES[next].primary), mix);
      currentHighlight.set(PALETTES[index].highlight).lerp(new THREE.Color(PALETTES[next].highlight), mix);
      rim.color.copy(currentColor);
      key.color.copy(currentHighlight);
      dustMat.color.copy(currentColor);
      orbits.forEach((orbit, i) => {
        orbit.group.rotation.z = (i ? 0.56 : -0.34) + elapsed * (i ? -0.055 : 0.075);
        orbit.material.color.copy(currentColor);
        orbit.sparkle.position.copy(orbit.curve.getPointAt((elapsed * (i ? 0.13 : 0.18) + i * 0.4) % 1));
      });
      featherMaterial.emissive.copy(baseColor);
      featherMaterial.emissiveIntensity = 0.12 + 0.035 * Math.sin(elapsed * 1.1);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    const contextLost = (event: Event) => {
      event.preventDefault();
      setFallback(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', pointer);
      document.removeEventListener('visibilitychange', visibility);
      intersection.disconnect();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      decorativeMaterials.forEach(material => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  if (fallback) return (
    <div className="w-full h-full min-h-[320px] flex items-center justify-center" role="img" aria-label="NEXORA phoenix emblem">
      <img src="/images/intro/NEXORA%20LOGO.png?v=3" alt="" className="w-[115%] max-w-none object-contain drop-shadow-[0_0_25px_rgba(155,85,240,0.55)]" />
    </div>
  );

  return (
    <div
      ref={mountRef}
      className="w-full h-full min-h-[320px] sm:min-h-[400px] md:min-h-[480px] lg:min-h-[540px] overflow-visible pointer-events-none"
      role="img"
      aria-label="Interactive three-dimensional violet phoenix with articulated wings, layered feather geometry and slowly orbiting energy rings"
    />
  );
};
