import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const CosmicHeroObject: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);

  useEffect(() => {
    // Check reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setWebGlSupported(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch {
      setWebGlSupported(false);
      return;
    }

    const initialWidth = container.clientWidth || 500;
    const initialHeight = container.clientHeight || 500;

    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Max outer radius of the entire orbital system (ring3 radius 3.1 + tube thickness 0.02)
    const MAX_ORBITAL_RADIUS = 3.14;
    // 16% visual padding around the maximum projected extent
    const PADDING_FACTOR = 1.16;
    const TARGET_EXTENT = MAX_ORBITAL_RADIUS * PADDING_FACTOR; // ~3.64 units

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 100);

    // Compute camera distance ensuring zero clipping across both horizontal and vertical frustum
    const updateCameraDistance = (aspect: number) => {
      const vFovRad = (camera.fov * Math.PI) / 180;
      const vTan = Math.tan(vFovRad / 2);
      // If aspect >= 1.0, vertical FOV limits extent; if aspect < 1.0, horizontal FOV limits extent
      const effectiveTan = aspect >= 1.0 ? vTan : vTan * aspect;
      const targetZ = TARGET_EXTENT / effectiveTan;
      camera.position.set(0, 0, Math.max(targetZ, 9.2));
    };

    updateCameraDistance(initialWidth / initialHeight);

    // Root Group centered at origin
    const rootGroup = new THREE.Group();
    rootGroup.position.set(0, 0, 0);
    scene.add(rootGroup);

    // 1. Central Core Sphere with luminous glow
    const sphereGeo = new THREE.SphereGeometry(1.15, 48, 48);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x160f2e,
      roughness: 0.22,
      metalness: 0.88,
      emissive: 0x4c1d95,
      emissiveIntensity: 0.58
    });
    const coreSphere = new THREE.Mesh(sphereGeo, sphereMat);
    rootGroup.add(coreSphere);

    // Inner wireframe geodesic sphere
    const wireGeo = new THREE.IcosahedronGeometry(1.32, 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      wireframe: true,
      transparent: true,
      opacity: 0.32
    });
    const wireSphere = new THREE.Mesh(wireGeo, wireMat);
    rootGroup.add(wireSphere);

    // 2. Three Elegant Orbital Rings (Torus)
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      roughness: 0.12,
      metalness: 0.9,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.38
    });
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      roughness: 0.15,
      metalness: 0.85,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.42
    });
    const ringMat3 = new THREE.MeshStandardMaterial({
      color: 0xc4b5fd,
      roughness: 0.2,
      metalness: 0.72,
      transparent: true,
      opacity: 0.88
    });

    // Inner ring (r = 2.05)
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.022, 24, 120), ringMat1);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    rootGroup.add(ring1);

    // Middle ring (r = 2.58)
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.58, 0.018, 24, 120), ringMat2);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 4;
    rootGroup.add(ring2);

    // Outer ring (r = 3.1)
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.015, 24, 120), ringMat3);
    ring3.rotation.x = Math.PI / 6;
    ring3.rotation.z = Math.PI / 5;
    rootGroup.add(ring3);

    // 3. Close orbital micro-nodes hugging the ring trajectories
    const nodeCount = 36;
    const nodePositions = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const r = i % 2 === 0 ? 2.05 : 2.58;
      nodePositions[i * 3] = r * Math.cos(angle);
      nodePositions[i * 3 + 1] = r * Math.sin(angle) * 0.42;
      nodePositions[i * 3 + 2] = r * Math.sin(angle) * 0.88;
    }
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    const nodeMat = new THREE.PointsMaterial({
      color: 0xc4b5fd,
      size: 0.042,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const orbitalNodes = new THREE.Points(nodeGeo, nodeMat);
    rootGroup.add(orbitalNodes);

    // 4. Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xd8b4fe, 2.6);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7c3aed, 2.3);
    rimLight.position.set(-5, -3, -4);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x181028, 1.25);
    scene.add(ambientLight);

    // Mouse Parallax Trackers
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = x * 0.35;
      targetRotX = -y * 0.35;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Responsive Resize with ResizeObserver
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        const aspect = w / h;
        camera.aspect = aspect;
        updateCameraDistance(aspect);
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Exponential damping for silky smooth parallax
      currentRotX = THREE.MathUtils.damp(currentRotX, targetRotX, 4, delta);
      currentRotY = THREE.MathUtils.damp(currentRotY, targetRotY, 4, delta);

      rootGroup.rotation.x = currentRotX;
      rootGroup.rotation.y = currentRotY;

      // Continuous gentle orbital revolutions (all rings remain within bounding bounds)
      ring1.rotation.z += 0.007;
      ring2.rotation.z -= 0.005;
      ring3.rotation.x += 0.0035;
      wireSphere.rotation.y += 0.0025;
      orbitalNodes.rotation.y += 0.004;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      sphereGeo.dispose();
      sphereMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      ringMat1.dispose();
      ringMat2.dispose();
      ringMat3.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      renderer.dispose();
    };
  }, []);

  if (!webGlSupported) {
    return (
      <div className="relative w-full h-full flex items-center justify-center p-8 pointer-events-none">
        <div className="w-64 h-64 md:w-80 md:h-80 rounded-full border border-violet-500/20 flex items-center justify-center animate-spin-slow">
          <div className="w-48 h-48 rounded-full border border-purple-500/30 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600/40 to-violet-900/60 blur-md"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="w-full h-full min-h-[380px] sm:min-h-[440px] md:min-h-[500px] lg:min-h-[540px] flex items-center justify-center pointer-events-none bg-transparent"
      aria-hidden="true"
    />
  );
};
