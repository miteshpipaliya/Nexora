import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * NEXORA orbital centerpiece — independently previewed before merging into main.
 * Deep amethyst core, delicate triangulated shell, three moving orbital tracks,
 * moving satellite sparks and additive violet glows.
 *
 * The reference image is visual direction, not a flat image background.
 */
export const CosmicHeroObject: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setSupported(false);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.55;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 80);
    camera.position.set(0, 0.15, 8.8);
    const root = new THREE.Group();
    scene.add(root);

    // The central sphere has a slowly shifting cloudy violet surface, not a solid disc.
    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vPos;
        varying vec3 vNorm;
        void main() {
          vPos = position;
          vNorm = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform float uTime;
        varying vec3 vPos;
        varying vec3 vNorm;
        float hash(vec3 p) { p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        float noise3(vec3 p) {
          vec3 i=floor(p), f=fract(p);
          f=f*f*(3.0-2.0*f);
          return mix(mix(mix(hash(i),hash(i+vec3(1.,0.,0.)),f.x),
                         mix(hash(i+vec3(0.,1.,0.)),hash(i+vec3(1.,1.,0.)),f.x),f.y),
                     mix(mix(hash(i+vec3(0.,0.,1.)),hash(i+vec3(1.,0.,1.)),f.x),
                         mix(hash(i+vec3(0.,1.,1.)),hash(i+vec3(1.,1.,1.)),f.x),f.y),f.z);
        }
        void main() {
          vec3 q = vPos*2.4 + vec3(uTime*0.035, -uTime*0.02, 0.);
          float n = noise3(q)*0.58+noise3(q*2.15)*0.29+noise3(q*4.3)*0.13;
          float filaments = smoothstep(0.48,0.73,n);
          vec3 midnight = vec3(0.035,0.009,0.13);
          vec3 violet = vec3(0.23,0.025,0.55);
          vec3 electric = vec3(0.63,0.21,0.95);
          vec3 col = mix(midnight, violet, smoothstep(.23,.62,n));
          col = mix(col, electric, filaments*.85);
          float rim = pow(1.0-max(dot(normalize(vNorm),vec3(0.,0.,1.)),0.0),2.4);
          col += vec3(.23,.07,.4)*rim;
          gl_FragColor = vec4(col,1.);
        }
      `,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.36, 64, 48), coreMaterial);
    root.add(core);

    // Fine bright triangular lattice overlays the glowing globe.
    const lattice = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.40, 3),
      new THREE.MeshBasicMaterial({
        color: 0xc8b4fd,
        wireframe: true,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    root.add(lattice);

    const glowShell = new THREE.Mesh(
      new THREE.SphereGeometry(1.48, 40, 30),
      new THREE.MeshBasicMaterial({
        color: 0x8b40e8,
        transparent: true,
        opacity: 0.095,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    root.add(glowShell);

    // A collection of independently tilted orbital planes. Each includes a crisp
    // neon filament, broad soft glow, orbit dust and a travelling light satellite.
    const tracks: { group: THREE.Group; satellite: THREE.Group; radius: number; speed: number; phase: number }[] = [];
    const createOrbit = (radius: number, tilt: [number, number, number], color: number, speed: number, phase: number) => {
      const group = new THREE.Group();
      group.rotation.set(...tilt);
      root.add(group);

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.068, 8, 240),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
      );
      group.add(halo);
      const filament = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.012, 8, 240),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
      );
      group.add(filament);

      // Dotted starlight on the orbit itself.
      const count = 110;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * radius;
        positions[i * 3 + 1] = Math.sin(theta) * radius;
        positions[i * 3 + 2] = 0;
      }
      const dustGeometry = new THREE.BufferGeometry();
      dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      group.add(new THREE.Points(
        dustGeometry,
        new THREE.PointsMaterial({
          color: 0xdfc6ff,
          size: 0.028,
          transparent: true,
          opacity: 0.62,
          sizeAttenuation: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      ));

      const satellite = new THREE.Group();
      const satelliteGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 16, 12),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      const satelliteCenter = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xf6e9ff, blending: THREE.AdditiveBlending })
      );
      satellite.add(satelliteGlow, satelliteCenter);
      group.add(satellite);
      tracks.push({ group, satellite, radius, speed, phase });
    };

    // The broad diagonally crossing ring is the hero; slimmer upright orbits
    // revolve around the same sphere with distinct, slower angular velocities.
    createOrbit(2.22, [0.60, -0.30, 0.34], 0x9c53ff, 0.21, 0.4);
    createOrbit(2.57, [1.04, 0.36, -0.64], 0xc697ff, -0.14, 2.5);
    createOrbit(2.86, [0.12, 0.84, 1.05], 0x6631d9, 0.11, 4.1);

    // Bright focal sparkle slightly above and to the right of the core.
    const sparkle = new THREE.Group();
    const sparkleCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xfaf0ff, blending: THREE.AdditiveBlending })
    );
    const sparkleGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xb877ff,
        transparent: true,
        opacity: 0.17,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    sparkle.add(sparkleGlow, sparkleCore);
    sparkle.position.set(0.6, 0.56, 1.3);
    root.add(sparkle);

    const aspectCamera = (width: number, height: number) => {
      const w = Math.max(width, 1), h = Math.max(height, 1);
      camera.aspect = w / h;
      camera.position.z = w < h ? 8.9 * h / w : 8.9;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    aspectCamera(container.clientWidth || 500, container.clientHeight || 500);

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      if (w > 0 && h > 0) aspectCamera(w, h);
    });
    resizeObserver.observe(container);

    let targetX = 0, targetY = 0;
    let mouseX = 0, mouseY = 0;
    const onMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetY = THREE.MathUtils.clamp(x * 0.36, -0.18, 0.18);
      targetX = THREE.MathUtils.clamp(y * -0.28, -0.14, 0.14);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let visible = !document.hidden;
    const onVisibility = () => {
      visible = !document.hidden;
      lastTime = performance.now();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(Math.max((now - lastTime) / 1000, 0), 0.05);
      lastTime = now;
      if (!visible) return;
      if (!reduced) elapsed += dt;

      mouseX = THREE.MathUtils.damp(mouseX, targetX, 3, dt);
      mouseY = THREE.MathUtils.damp(mouseY, targetY, 3, dt);
      root.rotation.x = mouseX;
      root.rotation.y = mouseY;
      core.rotation.y = elapsed * 0.06;
      lattice.rotation.y = elapsed * -0.035;
      lattice.rotation.x = elapsed * 0.02;
      coreMaterial.uniforms.uTime.value = elapsed;

      tracks.forEach(({ group, satellite, radius, speed, phase }, i) => {
        group.rotation.z = [0.34, -0.64, 1.05][i] + elapsed * speed * 0.16;
        const theta = phase + elapsed * speed;
        satellite.position.set(Math.cos(theta) * radius, Math.sin(theta) * radius, 0);
      });
      const pulse = 1 + 0.08 * Math.sin(elapsed * 2.0);
      sparkleGlow.scale.setScalar(pulse);

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(draw);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setSupported(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, []);

  if (!supported) {
    return (
      <div className="relative w-full h-full flex items-center justify-center" aria-hidden="true">
        <div className="relative h-56 w-56 sm:h-72 sm:w-72 rounded-full border border-violet-400/60 shadow-[0_0_75px_rgba(139,92,246,0.25)]">
          <div className="absolute inset-6 rounded-full border border-purple-400/50 rotate-45" />
          <div className="absolute inset-12 rounded-full bg-gradient-to-br from-violet-500/60 to-indigo-950/70" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="w-full h-full min-h-[320px] sm:min-h-[400px] md:min-h-[480px] lg:min-h-[540px] pointer-events-none bg-transparent overflow-visible"
      aria-label="Animated violet celestial sphere with three rotating luminous orbital rings"
      role="img"
    />
  );
};
