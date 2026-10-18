import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface TshirtCustomization {
  edition: 'founders' | 'zerocode';
  studentName: string;
  department: string;
  numberTag: string;
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL';
}

interface TshirtViewer3DProps {
  customization: TshirtCustomization;
  viewAngle: 'front' | 'back' | 'spin';
}

export const TshirtViewer3D: React.FC<TshirtViewer3DProps> = ({
  customization,
  viewAngle
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const targetAngleYRef = useRef<number>(0);
  const currentAngleYRef = useRef<number>(0);
  const textureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dynamicTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const garmentMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Generate dynamic personalization texture
  const updateTexture = (edition: 'founders' | 'zerocode', name: string, dept: string, num: string) => {
    let canvas = textureCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      textureCanvasRef.current = canvas;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Base background color
    ctx.fillStyle = edition === 'founders' ? '#0d0c17' : '#f8fafc';
    ctx.fillRect(0, 0, 1024, 1024);

    // Front Chest Decal (top half)
    ctx.fillStyle = edition === 'founders' ? '#8b5cf6' : '#0284c7';
    ctx.font = 'bold 38px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEXORA', 512, 280);

    ctx.fillStyle = edition === 'founders' ? '#a1a1aa' : '#475569';
    ctx.font = '500 18px "JetBrains Mono", monospace';
    ctx.fillText('BVM STUDENT INNOVATION', 512, 315);

    // Subtle star emblem
    ctx.fillStyle = edition === 'founders' ? '#c4b5fd' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(512, 220, 8, 0, Math.PI * 2);
    ctx.fill();

    // Back Name & Number Decal (bottom half)
    ctx.fillStyle = edition === 'founders' ? '#f8fafc' : '#0f172a';
    ctx.font = 'bold 44px "Space Grotesk", sans-serif';
    const displayName = (name || 'INNOVATOR').toUpperCase();
    ctx.fillText(displayName, 512, 700);

    ctx.fillStyle = edition === 'founders' ? '#a78bfa' : '#0284c7';
    ctx.font = 'bold 64px "JetBrains Mono", monospace';
    ctx.fillText(num || '01', 512, 790);

    ctx.fillStyle = edition === 'founders' ? '#71717a' : '#64748b';
    ctx.font = '16px "JetBrains Mono", monospace';
    const displayDept = (dept || 'ELECTRONICS // BVM').toUpperCase();
    ctx.fillText(displayDept, 512, 840);

    if (dynamicTextureRef.current) {
      dynamicTextureRef.current.needsUpdate = true;
    }
  };

  useEffect(() => {
    updateTexture(
      customization.edition,
      customization.studentName,
      customization.department,
      customization.numberTag
    );
  }, [customization]);

  useEffect(() => {
    if (viewAngle === 'front') {
      targetAngleYRef.current = 0;
    } else if (viewAngle === 'back') {
      targetAngleYRef.current = Math.PI;
    }
  }, [viewAngle]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebGlSupported(false);
      return;
    }

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 520;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0, 5.2);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    rootGroupRef.current = rootGroup;

    // Generate initial canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    textureCanvasRef.current = canvas;
    const dynamicTexture = new THREE.CanvasTexture(canvas);
    dynamicTexture.colorSpace = THREE.SRGBColorSpace;
    dynamicTextureRef.current = dynamicTexture;
    updateTexture(
      customization.edition,
      customization.studentName,
      customization.department,
      customization.numberTag
    );

    // Procedural T-Shirt Mock Geometry Group
    // 1. Torso
    const torsoGeo = new THREE.CylinderGeometry(0.88, 0.82, 1.8, 32);
    const garmentMat = new THREE.MeshStandardMaterial({
      color: customization.edition === 'founders' ? 0x12111d : 0xf1f5f9,
      roughness: 0.7,
      metalness: 0.1,
      map: dynamicTexture
    });
    garmentMaterialRef.current = garmentMat;
    const torsoMesh = new THREE.Mesh(torsoGeo, garmentMat);
    torsoMesh.position.y = 0;
    rootGroup.add(torsoMesh);

    // 2. Left Sleeve
    const sleeveGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.65, 24);
    const leftSleeve = new THREE.Mesh(sleeveGeo, garmentMat);
    leftSleeve.position.set(-1.05, 0.65, 0);
    leftSleeve.rotation.z = Math.PI / 4;
    rootGroup.add(leftSleeve);

    // 3. Right Sleeve
    const rightSleeve = new THREE.Mesh(sleeveGeo, garmentMat);
    rightSleeve.position.set(1.05, 0.65, 0);
    rightSleeve.rotation.z = -Math.PI / 4;
    rootGroup.add(rightSleeve);

    // 4. Ribbed Collar Ring
    const collarGeo = new THREE.TorusGeometry(0.42, 0.045, 16, 32);
    const collarMat = new THREE.MeshStandardMaterial({
      color: customization.edition === 'founders' ? 0x8b5cf6 : 0x0284c7,
      roughness: 0.4
    });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.9, 0);
    collar.rotation.x = Math.PI / 2;
    rootGroup.add(collar);

    // Grounding Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = -1.1;
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);

    // Studio 3-point Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd8b4fe, 1.2);
    fillLight.position.set(-4, 2, -3);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0x2d1f4d, 1.0);
    scene.add(ambientLight);

    let isDragging = false;
    let prevMouseX = 0;

    const handlePointerDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };
    const handlePointerUp = () => {
      isDragging = false;
    };
    const handlePointerMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      prevMouseX = e.clientX;
      targetAngleYRef.current += deltaX * 0.01;
    };

    container.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('mousemove', handlePointerMove);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (viewAngle === 'spin' && !isDragging) {
        targetAngleYRef.current += 0.5 * delta;
      }

      currentAngleYRef.current = THREE.MathUtils.damp(
        currentAngleYRef.current,
        targetAngleYRef.current,
        6,
        delta
      );

      if (rootGroupRef.current) {
        rootGroupRef.current.rotation.y = currentAngleYRef.current;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      torsoGeo.dispose();
      sleeveGeo.dispose();
      collarGeo.dispose();
      shadowGeo.dispose();
      garmentMat.dispose();
      collarMat.dispose();
      shadowMat.dispose();
      dynamicTexture.dispose();
      renderer.dispose();
    };
  }, [customization.edition]);

  if (!webGlSupported) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center p-6 border border-violet-500/20 rounded-xl bg-[#11101B]">
        <div className="text-sm text-violet-400 font-mono mb-2">3D PREVIEW FALLBACK</div>
        <p className="text-xs text-slate-400 text-center max-w-sm">
          Hardware acceleration unavailable. Displaying static merchandise layout.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[420px] md:h-[480px] flex items-center justify-center rounded-2xl bg-[#11101B]/80 border border-violet-500/15 overflow-hidden">
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
      />
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-slate-500 pointer-events-none">
        <span>Click &amp; drag to rotate 360°</span>
        <span className="text-violet-400">Interactive 3D Prototype</span>
      </div>
    </div>
  );
};
