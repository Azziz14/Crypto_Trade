import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getProject, val } from '@theatre/core';

export const CoinStairsCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    const theatreProject = getProject('Crypto Market Stage');
    const theatreSheet = theatreProject.sheet('Scene');
    const theatreCoin = theatreSheet.object('MarketCoin', {
      spinSpeed: 0.0,
      glowBoost: 0.3,
      hoverY: 0.0,
    });

    // --- Scene Setup ---
    const scene = new THREE.Scene();

    // Deep space black fog
    scene.fog = new THREE.FogExp2('#040508', 0.15);

    // --- Camera Setup ---
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(4.8, 3.2, 5.2);
    camera.lookAt(0, 0.8, 0);

    // --- Renderer Setup ---
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // --- Procedural Volumetric Light Beam Texture Creator ---
    const createBeamTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, 64);
        grad.addColorStop(0, 'rgba(255, 223, 115, 0.45)');
        grad.addColorStop(0.3, 'rgba(255, 223, 115, 0.15)');
        grad.addColorStop(1, 'rgba(255, 223, 115, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 64);
      }
      return new THREE.CanvasTexture(canvas);
    };

    // --- Volumetric Light Beam ---
    const beamMat = new THREE.MeshBasicMaterial({
      map: createBeamTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const volumetricBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 2.5, 12, 32, 1, true), beamMat);
    volumetricBeam.position.set(3, 4.5, 0);
    volumetricBeam.rotation.z = -Math.PI / 7;
    scene.add(volumetricBeam);

    // --- Glossy Metallic Floor for Mirror Reflections ---
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#030407'),
      roughness: 0.16,
      metalness: 0.95,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.25;
    floor.receiveShadow = true;
    scene.add(floor);

    // --- Metallic Background Wall Plane ---
    const wallGeo = new THREE.PlaneGeometry(50, 40);
    const wallMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#040508'),
      roughness: 0.32,
      metalness: 0.9,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(-2, 2, -3.5);
    wall.receiveShadow = true;
    scene.add(wall);

    // --- Lighting (Cinematic Studio Rig) ---
    const ambientLight = new THREE.AmbientLight('#020206', 1.0);
    scene.add(ambientLight);

    // Brighter Key Gold Light
    const goldKeyLight = new THREE.DirectionalLight('#FFDF73', 8.5);
    goldKeyLight.position.set(8, 14, 6);
    goldKeyLight.castShadow = true;
    goldKeyLight.shadow.mapSize.width = 2048;
    goldKeyLight.shadow.mapSize.height = 2048;
    goldKeyLight.shadow.bias = -0.0003;
    scene.add(goldKeyLight);

    // Strong White Rim Light for Coin Edge Highlight
    const rimLight = new THREE.PointLight('#ffffff', 8.0, 10);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    // Cyan Fill Light for futuristic contrast
    const cyanFillLight = new THREE.PointLight('#00E5FF', 6.0, 18);
    cyanFillLight.position.set(-6, 2.5, 3);
    scene.add(cyanFillLight);

    // Soft Amber Backlight
    const amberBackLight = new THREE.PointLight('#FF8C00', 4.0, 12);
    amberBackLight.position.set(3, 5, -3);
    scene.add(amberBackLight);

    // --- Stairs Creation ---
    const stepCount = 6;
    const steps: THREE.Mesh[] = [];
    const stepWidth = 3.8;   
    const stepHeight = 0.42;  
    const stepDepth = 1.35;    

    const stepGeometry = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);

    for (let i = 0; i < stepCount; i++) {
      const stepMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#06070c'),
        roughness: 0.12,
        metalness: 0.94,
        emissive: new THREE.Color('#221700'), 
        emissiveIntensity: 0.15,
      });

      const stepMesh = new THREE.Mesh(stepGeometry, stepMat);
      stepMesh.receiveShadow = true;
      stepMesh.castShadow = true;
      scene.add(stepMesh);
      steps.push(stepMesh);
    }

    // --- Detailed 3D Gold Coin ---
    const coinRadius = 0.76; // Larger coin as requested
    const coinThickness = 0.14; 
    const coinGeometry = new THREE.CylinderGeometry(coinRadius, coinRadius, coinThickness, 64);
    coinGeometry.rotateZ(Math.PI / 2); // Flat faces face X-axis

    // Ultra polished metal gold with lower roughness
    const coinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#F0C243'), // Intense Rich Gold
      metalness: 1.0,
      roughness: 0.11, // High metallic sheen
      emissive: new THREE.Color('#5c3f00'),
      emissiveIntensity: 0.05,
    });

    const coinGroup = new THREE.Group();
    const coinMesh = new THREE.Mesh(coinGeometry, coinMat);
    coinMesh.castShadow = true;
    coinMesh.receiveShadow = true;
    coinGroup.add(coinMesh);

    // Torus rims
    const rimGeo = new THREE.TorusGeometry(coinRadius * 0.9, 0.038, 16, 64);
    rimGeo.rotateY(Math.PI / 2);

    const rimMesh1 = new THREE.Mesh(rimGeo, coinMat);
    rimMesh1.position.x = coinThickness / 2;
    coinGroup.add(rimMesh1);

    const rimMesh2 = rimMesh1.clone();
    rimMesh2.position.x = -coinThickness / 2;
    coinGroup.add(rimMesh2);

    // Central Ascending Chart Emblem
    const emblemGroup = new THREE.Group();
    const barGeo1 = new THREE.BoxGeometry(0.04, 0.20, 0.05);
    const barGeo2 = new THREE.BoxGeometry(0.04, 0.34, 0.05);
    const barGeo3 = new THREE.BoxGeometry(0.04, 0.48, 0.05);

    const bar1 = new THREE.Mesh(barGeo1, coinMat);
    bar1.position.set(0, -0.07, -0.16);
    emblemGroup.add(bar1);

    const bar2 = new THREE.Mesh(barGeo2, coinMat);
    bar2.position.set(0, 0, 0);
    emblemGroup.add(bar2);

    const bar3 = new THREE.Mesh(barGeo3, coinMat);
    bar3.position.set(0, 0.07, 0.16);
    emblemGroup.add(bar3);

    const emblem1 = emblemGroup.clone();
    emblem1.position.x = coinThickness / 2 + 0.005;
    coinGroup.add(emblem1);

    const emblem2 = emblemGroup.clone();
    emblem2.position.x = -(coinThickness / 2 + 0.005);
    coinGroup.add(emblem2);

    // Light underneath the coin
    const coinGlowLight = new THREE.PointLight('#FFA500', 9.5, 3.5);
    coinGlowLight.position.set(0, -0.35, 0);
    coinGroup.add(coinGlowLight);

    scene.add(coinGroup);

    // --- Floating Wireframe Holographic Shapes ---
    const holoGeo = new THREE.IcosahedronGeometry(0.24, 1);
    const holoMat = new THREE.MeshBasicMaterial({
      color: '#00E5FF',
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });
    
    const floatingHolos: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const holo = new THREE.Mesh(holoGeo, holoMat);
      holo.position.set(
        (Math.random() - 0.5) * 6 - 1,
        Math.random() * 4,
        (Math.random() - 0.5) * 4
      );
      scene.add(holo);
      floatingHolos.push(holo);
    }

    // --- Gold & Cyan Particles ---
    const particleCount = 65;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorOptions = [
      new THREE.Color('#FFD700'), 
      new THREE.Color('#FFA500'), 
      new THREE.Color('#00E5FF')  
    ];

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 16;
      positions[i + 1] = (Math.random() - 0.2) * 10;
      positions[i + 2] = (Math.random() - 0.5) * 10;

      const c = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors[i] = c.r;
      colors[i + 1] = c.g;
      colors[i + 2] = c.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMat);
    scene.add(particles);

    // --- Smooth Scrolling Stairs Math Setup ---
    const clock = new THREE.Clock();
    let scrollPos = 0;
    const scrollSpeed = 0.48; // Rolling speed

    // Diagonal layout constants
    const dx = 1.42;
    const dy = 0.81;
    const dz = -0.42;

    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetMouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      targetMouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let targetScrollY = 0;
    let currentScrollY = 0;
    const handleScroll = () => {
      targetScrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Framerate independence using Clock
      const delta = clock.getDelta();
      const dt = Math.min(delta, 0.1); 

      // Smoothly interpolate inputs
      currentScrollY = THREE.MathUtils.lerp(currentScrollY, targetScrollY, 0.06);
      currentMouseX = THREE.MathUtils.lerp(currentMouseX, targetMouseX, 0.08);
      currentMouseY = THREE.MathUtils.lerp(currentMouseY, targetMouseY, 0.08);

      // Advance scroll position continuously
      scrollPos += dt * scrollSpeed;

      // Particles & Holos rotation
      particles.rotation.y += dt * 0.03;
      particles.rotation.x += dt * 0.01;
      
      floatingHolos.forEach((holo, idx) => {
        holo.rotation.y += dt * 0.4;
        holo.rotation.z += dt * 0.2;
        holo.position.y += Math.sin(scrollPos * 1.5 + idx) * 0.003;
      });

      // Update positions of steps (wrapping seamlessly)
      steps.forEach((step, idx) => {
        let stepY = idx * dy - scrollPos;
        let stepX = idx * dx - scrollPos * (dx / dy);
        let stepZ = idx * dz - scrollPos * (dz / dy);

        const minVisibleY = -2.2;
        const totalSpanY = stepCount * dy;

        while (stepY < minVisibleY) {
          stepY += totalSpanY;
          stepX += stepCount * dx;
          stepZ += stepCount * dz;
        }

        step.position.set(stepX, stepY, stepZ);
      });

      // --- Mathematically Smooth Coin Rolling & Climbing ---
      const relativeY = scrollPos % dy;
      const progress = relativeY / dy;
      const climbTrigger = 0.65; 

      const flatHeight = stepHeight / 2 + coinRadius;
      let coinY = 0;

      // Stationary horizontal position of the coin relative to the frame
      const coinBaseX = 0.65;
      const coinBaseZ = -0.18;

      if (progress < climbTrigger) {
        // Flat rolling phase: coin rides the step down as it scrolls
        coinY = -relativeY + flatHeight;
      } else {
        // Climbing phase: coin climbs to the next step
        const t = (progress - climbTrigger) / (1 - climbTrigger);
        const smoothClimb = (1 - Math.cos(t * Math.PI)) / 2; 
        coinY = -relativeY + flatHeight + smoothClimb * dy;
      }

      // Add a tiny physical rolling vibration
      coinY += Math.sin(scrollPos * 12) * 0.01;

      coinGroup.position.set(coinBaseX, coinY, coinBaseZ);

      // Illuminating stairs dynamically on contact
      steps.forEach((step) => {
        const mat = step.material as THREE.MeshStandardMaterial;
        const dist = coinGroup.position.distanceTo(step.position);
        
        if (dist < 1.35) {
          mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 1.4, 0.15);
          mat.emissive.set('#FFA500');
        } else {
          mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0.15, 0.08);
          mat.emissive.set('#2b1b00');
        }
      });

      // Continuous rolling rotation matching the scroll distance
      const theatreSpin = val(theatreCoin.props.spinSpeed);
      const theatreGlow = val(theatreCoin.props.glowBoost);
      const theatreHover = val(theatreCoin.props.hoverY);

      coinGroup.rotation.z -= dt * (3.5 + theatreSpin * 0.8);
      coinGroup.rotation.y = Math.sin(scrollPos * 0.5 + theatreHover) * 0.12;
      coinGlowLight.intensity = THREE.MathUtils.lerp(coinGlowLight.intensity, 9.5 + theatreGlow * 6.0, 0.06);

      // Mouse interactive studio lighting
      cyanFillLight.position.x = -6 + currentMouseX * 3.0;
      cyanFillLight.position.y = 2.5 + currentMouseY * 3.0;
      goldKeyLight.position.x = 8 + currentMouseX * 2.0;

      // Parallax scroll-camera updates (Slow Orbital + Scroll Parallax)
      const maxScroll = 1200;
      const scrollFactor = Math.min(currentScrollY / maxScroll, 1);
      
      const orbitAngle = scrollPos * 0.06; // Slow orbit over time
      const baseCameraX = Math.cos(orbitAngle) * 0.8 + 4.8;
      const baseCameraZ = Math.sin(orbitAngle) * 0.8 + 5.2;

      camera.position.x = baseCameraX + Math.sin(scrollFactor * Math.PI * 0.22) * 2.0 + currentMouseX * 0.22;
      camera.position.y = 3.2 - scrollFactor * 0.95 + currentMouseY * 0.22;
      camera.position.z = baseCameraZ - scrollFactor * 1.4;
      camera.lookAt(coinGroup.position.x, coinGroup.position.y + 0.15, coinGroup.position.z);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      
      wallGeo.dispose();
      wallMat.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      stepGeometry.dispose();
      coinGeometry.dispose();
      coinMat.dispose();
      rimGeo.dispose();
      particleGeometry.dispose();
      particleMat.dispose();
      holoGeo.dispose();
      holoMat.dispose();
      steps.forEach(step => {
        (step.material as THREE.MeshStandardMaterial).dispose();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div 
        style={{
          position: 'absolute',
          width: '90%',
          height: '90%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(153, 69, 255, 0.18) 0%, rgba(20, 241, 149, 0.08) 50%, transparent 80%)',
          zIndex: 0,
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }}
      />
      <canvas 
        ref={canvasRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          zIndex: 1, 
          display: 'block',
          outline: 'none',
        }} 
      />
    </div>
  );
};
