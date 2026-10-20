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
    // Max orbital geometry bounding radius is R_MAX = 3.57 (Ring 3 radius 3.55 + tube 0.02)
    // At FOV 45° with baseDistance = 10.05:
    // Subtended half-angle = arcsin(3.57 / 10.05) = 20.81°.
    // Projected span fills tan(20.81°) / tan(22.5°) ≈ 91.8% of viewport height & width.
    // On a 500-600px container, this maintains strictly 18-24px of safe spacing from the edges,
    // ensuring the rotating orbital structure dominates the container without ever crossing the boundary.
    const camera = new THREE.PerspectiveCamera(45, initialDim.width / initialDim.height, 0.1, 100);

    const updateCameraFrustum = (w: number, h: number) => {
      const aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      // Proportional enlargement with safe container padding across all viewport aspect ratios
      const baseDistance = 10.05;
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

    // 1. Central Core Sphere (Enlarged by ~28% from 1.2 to 1.54 radius for prominent, powerful presence)
    const sphereGeo = new THREE.SphereGeometry(1.54, 64, 64);
    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: 0x160f2e,
      roughness: 0.18,
      metalness: 0.88,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      emissive: 0x581c87,
      emissiveIntensity: 0.68
    });
    const coreSphere = new THREE.Mesh(sphereGeo, sphereMat);
    rootGroup.add(coreSphere);

    // Outer triangular geometric wireframe (icosahedron enlarged by ~28% from 1.36 to 1.74)
    const wireGeo = new THREE.IcosahedronGeometry(1.74, 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xc4b5fd,
      wireframe: true,
      transparent: true,
      opacity: 0.32
    });
    const wireSphere = new THREE.Mesh(wireGeo, wireMat);
    rootGroup.add(wireSphere);

    // Subtle atmospheric violet glow envelope
    const glowGeo = new THREE.SphereGeometry(1.78, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    rootGroup.add(glowSphere);

    // -------------------------------------------------------------
    // 2. Three Independent Orbital Rings with Parent Axis Groups
    // Each ring uses a parent tilt group + child spin group for true 3D orbital motion
    // -------------------------------------------------------------

    // Helper to create ring particles that hug the orbit
    const createRingParticles = (radius: number, count: number, colorHex: number) => {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        positions[i * 3] = radius * Math.cos(theta);
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = radius * Math.sin(theta);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: colorHex,
        size: 0.05,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      return new THREE.Points(geo, mat);
    };

    // --- RING 1: Slow continuous rotation around tilted horizontal axis ---
    // Orbital radius: 2.35 (clearance from central sphere: >0.6 units)
    const orbitGroup1 = new THREE.Group();
    orbitGroup1.rotation.set(0.38, 0, 0.14); // Tilted horizontal axis (~22°)
    rootGroup.add(orbitGroup1);

    const spinGroup1 = new THREE.Group();
    orbitGroup1.add(spinGroup1);

    const ring1Geo = new THREE.TorusGeometry(2.35, 0.024, 32, 140);
    ring1Geo.rotateX(Math.PI / 2); // Orient ring into horizontal orbital plane
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      roughness: 0.12,
      metalness: 0.9,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.4
    });
    const ring1Mesh = new THREE.Mesh(ring1Geo, ring1Mat);
    spinGroup1.add(ring1Mesh);

    // Subtle luminous edge rim on Ring 1
    const rim1Geo = new THREE.TorusGeometry(2.35, 0.008, 16, 120);
    rim1Geo.rotateX(Math.PI / 2);
    const rim1Mat = new THREE.MeshBasicMaterial({
      color: 0xd8b4fe,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const rim1Mesh = new THREE.Mesh(rim1Geo, rim1Mat);
    spinGroup1.add(rim1Mesh);

    const particles1 = createRingParticles(2.35, 18, 0xd8b4fe);
    spinGroup1.add(particles1);

    // --- RING 2: Medium speed continuous rotation around diagonal axis ---
    // Orbital radius: 2.95
    const orbitGroup2 = new THREE.Group();
    orbitGroup2.rotation.set(-0.76, 0.44, 0.68); // Diagonal orbital axis (~45°)
    rootGroup.add(orbitGroup2);

    const spinGroup2 = new THREE.Group();
    orbitGroup2.add(spinGroup2);

    const ring2Geo = new THREE.TorusGeometry(2.95, 0.02, 32, 140);
    ring2Geo.rotateX(Math.PI / 2);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      roughness: 0.14,
      metalness: 0.85,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.45
    });
    const ring2Mesh = new THREE.Mesh(ring2Geo, ring2Mat);
    spinGroup2.add(ring2Mesh);

    const rim2Geo = new THREE.TorusGeometry(2.95, 0.007, 16, 120);
    rim2Geo.rotateX(Math.PI / 2);
    const rim2Mat = new THREE.MeshBasicMaterial({
      color: 0xe9d5ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const rim2Mesh = new THREE.Mesh(rim2Geo, rim2Mat);
    spinGroup2.add(rim2Mesh);

    const particles2 = createRingParticles(2.95, 24, 0xe9d5ff);
    spinGroup2.add(particles2);

    // --- RING 3: Slightly faster continuous rotation around near-vertical axis ---
    // Orbital radius: 3.55 (outermost orbit)
    const orbitGroup3 = new THREE.Group();
    orbitGroup3.rotation.set(1.36, 0.24, 0.42); // Near-vertical orbital axis (~78°)
    rootGroup.add(orbitGroup3);

    const spinGroup3 = new THREE.Group();
    orbitGroup3.add(spinGroup3);

    const ring3Geo = new THREE.TorusGeometry(3.55, 0.016, 32, 160);
    ring3Geo.rotateX(Math.PI / 2);
    const ring3Mat = new THREE.MeshStandardMaterial({
      color: 0xc4b5fd,
      roughness: 0.18,
      metalness: 0.8,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.92
    });
    const ring3Mesh = new THREE.Mesh(ring3Geo, ring3Mat);
    spinGroup3.add(ring3Mesh);

    const rim3Geo = new THREE.TorusGeometry(3.55, 0.006, 16, 140);
    rim3Geo.rotateX(Math.PI / 2);
    const rim3Mat = new THREE.MeshBasicMaterial({
      color: 0xf3e8ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const rim3Mesh = new THREE.Mesh(rim3Geo, rim3Mat);
    spinGroup3.add(rim3Mesh);

    const particles3 = createRingParticles(3.55, 28, 0xf3e8ff);
    spinGroup3.add(particles3);

    // Floating ambient cosmic dust
    const ambientDustCount = 40;
    const dustPositions = new Float32Array(ambientDustCount * 3);
    for (let i = 0; i < ambientDustCount; i++) {
      const radius = 2.0 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;
      dustPositions[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      dustPositions[i * 3 + 1] = radius * Math.sin(phi);
      dustPositions[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xa78bfa,
      size: 0.035,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    const ambientDust = new THREE.Points(dustGeo, dustMat);
    rootGroup.add(ambientDust);

    // 3. Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xd8b4fe, 2.8);
    keyLight.position.set(6, 6, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7c3aed, 2.4);
    rimLight.position.set(-6, -3, -5);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x181028, 1.4);
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

    // Continuous Smooth Animation Loop (Frame-rate independent delta time)
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

      // 1. Central sphere rotates slowly around its own axis
      coreSphere.rotation.y += delta * 0.12;
      wireSphere.rotation.y -= delta * 0.08;
      wireSphere.rotation.x += delta * 0.04;

      // 2. Three independent orbital revolutions in true 3D around their respective parent axes:
      // Ring 1: Slow continuous rotation around tilted horizontal axis
      spinGroup1.rotation.y += delta * 0.22;

      // Ring 2: Medium speed continuous rotation around diagonal axis
      spinGroup2.rotation.y += delta * 0.44;

      // Ring 3: Slightly faster continuous rotation around near-vertical axis (counter-clockwise)
      spinGroup3.rotation.y -= delta * 0.62;

      // Ambient cosmic dust subtle rotation
      ambientDust.rotation.y += delta * 0.05;

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
      glowGeo.dispose();
      glowMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      rim1Geo.dispose();
      rim1Mat.dispose();
      particles1.geometry.dispose();
      (particles1.material as THREE.Material).dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      rim2Geo.dispose();
      rim2Mat.dispose();
      particles2.geometry.dispose();
      (particles2.material as THREE.Material).dispose();
      ring3Geo.dispose();
      ring3Mat.dispose();
      rim3Geo.dispose();
      rim3Mat.dispose();
      particles3.geometry.dispose();
      (particles3.material as THREE.Material).dispose();
      dustGeo.dispose();
      dustMat.dispose();
      renderer.dispose();
    };
  }, []);

  if (!webGlSupported) {
    return (
      <div className="relative w-full h-full flex items-center justify-center p-4 pointer-events-none">
        <div className="w-80 h-80 sm:w-96 sm:h-96 md:w-[480px] md:h-[480px] rounded-full border border-violet-500/20 flex items-center justify-center animate-spin-slow">
          <div className="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-full border border-purple-500/30 flex items-center justify-center">
            <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-purple-600/40 to-violet-900/60 blur-md"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="w-full h-full min-h-[320px] sm:min-h-[400px] md:min-h-[480px] lg:min-h-[540px] flex items-center justify-center pointer-events-none bg-transparent overflow-visible"
      aria-hidden="true"
    />
  );
};
