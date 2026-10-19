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

    const getDimensions = () => {
      const w = container.clientWidth || 500;
      const h = container.clientHeight || 500;
      return { width: Math.max(w, 280), height: Math.max(h, 280) };
    };

    const initialDim = getDimensions();
    renderer.setSize(initialDim.width, initialDim.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Field of view and camera calculation
    // Max orbital geometry bounding radius is R_MAX = 3.12 (Ring 3 radius 3.1 + tube 0.02)
    // Target span with 14-18% visual padding = 3.12 * 2 * 1.34 ≈ 8.36 world units.
    // At FOV 45°, dist = (8.36 / 2) / tan(22.5°) = 4.18 / 0.41421356 ≈ 10.1 units.
    const camera = new THREE.PerspectiveCamera(45, initialDim.width / initialDim.height, 0.1, 100);

    const updateCameraFrustum = (w: number, h: number) => {
      const aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      // Ensure that both horizontal and vertical views encompass the complete rotating orbital volume
      // including dynamic tilt and visual padding, preventing clipping on mobile (portrait) and ultrawide.
      const baseDistance = 10.2;
      if (aspect < 1) {
        camera.position.set(0, 0, baseDistance / Math.max(0.65, aspect));
      } else {
        camera.position.set(0, 0, baseDistance);
      }
    };

    updateCameraFrustum(initialDim.width, initialDim.height);

    // Root Group - perfectly centered at stable origin (0, 0, 0)
    const rootGroup = new THREE.Group();
    rootGroup.position.set(0, 0, 0);
    scene.add(rootGroup);

    // 1. Central Core Sphere with deep violet luminous glow
    const sphereGeo = new THREE.SphereGeometry(1.2, 48, 48);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x160f2e,
      roughness: 0.2,
      metalness: 0.85,
      emissive: 0x4c1d95,
      emissiveIntensity: 0.55
    });
    const coreSphere = new THREE.Mesh(sphereGeo, sphereMat);
    rootGroup.add(coreSphere);

    // Inner wireframe icosahedron
    const wireGeo = new THREE.IcosahedronGeometry(1.36, 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      wireframe: true,
      transparent: true,
      opacity: 0.28
    });
    const wireSphere = new THREE.Mesh(wireGeo, wireMat);
    rootGroup.add(wireSphere);

    // 2. Three Elegant Orbital Rings (Torus) - Precise proportions
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.35
    });
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      roughness: 0.15,
      metalness: 0.85,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.4
    });
    const ringMat3 = new THREE.MeshStandardMaterial({
      color: 0xc4b5fd,
      roughness: 0.2,
      metalness: 0.7,
      transparent: true,
      opacity: 0.85
    });

    // Ring 1 (Radius 2.1)
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.024, 24, 120), ringMat1);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    rootGroup.add(ring1);

    // Ring 2 (Radius 2.65)
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.02, 24, 120), ringMat2);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 4;
    rootGroup.add(ring2);

    // Ring 3 (Outer Ring: Radius 3.1)
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.016, 24, 120), ringMat3);
    ring3.rotation.x = Math.PI / 6;
    ring3.rotation.z = Math.PI / 5;
    rootGroup.add(ring3);

    // 3. Orbital micro-nodes strictly hugging the ring paths
    const nodeCount = 36;
    const nodePositions = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const r = i % 2 === 0 ? 2.1 : 2.65;
      nodePositions[i * 3] = r * Math.cos(angle);
      nodePositions[i * 3 + 1] = r * Math.sin(angle) * 0.4;
      nodePositions[i * 3 + 2] = r * Math.sin(angle) * 0.9;
    }
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    const nodeMat = new THREE.PointsMaterial({
      color: 0xc4b5fd,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const orbitalNodes = new THREE.Points(nodeGeo, nodeMat);
    rootGroup.add(orbitalNodes);

    // 4. Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xd8b4fe, 2.5);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7c3aed, 2.2);
    rimLight.position.set(-5, -3, -4);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x181028, 1.2);
    scene.add(ambientLight);

    // Mouse Parallax Trackers (subtle, bounded)
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = Math.max(-0.25, Math.min(0.25, x * 0.25));
      targetRotX = Math.max(-0.25, Math.min(0.25, -y * 0.25));
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Robust ResizeObserver for reliable dimension tracking across responsive breakpoints
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          renderer.setSize(width, height);
          updateCameraFrustum(width, height);
        }
      }
    });

    resizeObserver.observe(container);

    // Continuous Smooth Animation Loop
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

      // Independent, continuous, elegant orbital revolutions
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
      window.removeEventListener('pointermove', handlePointerMove);
      resizeObserver.disconnect();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sphereGeo.dispose();
      sphereMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      ring1.geometry.dispose();
      ring2.geometry.dispose();
      ring3.geometry.dispose();
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
      className="w-full h-full min-h-[340px] sm:min-h-[420px] md:min-h-[480px] lg:min-h-[520px] flex items-center justify-center pointer-events-none bg-transparent overflow-visible"
      aria-hidden="true"
    />
  );
};
