'use client';

import React, { useMemo, useRef, useState, useEffect, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useAspect, useTexture } from '@react-three/drei';
import type { WebGLRenderer } from 'three';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import {
  abs,
  blendScreen,
  float,
  mod,
  mx_cell_noise_float,
  oneMinus,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  pass,
  mix,
  add,
} from 'three/tsl';

const TEXTUREMAP = { src: 'https://i.postimg.cc/XYwvXN8D/img-4.png' };
const DEPTHMAP = { src: 'https://i.postimg.cc/2SHKQh2q/raw-4.webp' };

type ThreeModule = typeof import('three/webgpu');

let threePromise: Promise<ThreeModule> | null = null;

function loadThreeWebGPU() {
  if (!threePromise) {
    threePromise = import('three/webgpu');
  }
  return threePromise;
}

class HeroCanvasErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function HeroCanvasFallback() {
  return (
    <div
      className="absolute inset-0 z-10"
      style={{
        background:
          'radial-gradient(circle at 50% 40%, rgba(120, 40, 40, 0.45) 0%, rgba(3, 7, 18, 0.95) 55%, #030712 100%)',
      }}
    />
  );
}

const PostProcessing = ({
  three,
  strength = 1,
  threshold = 1,
  fullScreenEffect = true,
}: {
  three: ThreeModule;
  strength?: number;
  threshold?: number;
  fullScreenEffect?: boolean;
}) => {
  const { gl, scene, camera } = useThree();
  const progressRef = useRef<{ value: number } | null>(null);

  const render = useMemo(() => {
    const postProcessing = new three.PostProcessing(gl as never);
    const scenePass = pass(scene, camera);
    const scenePassColor = scenePass.getTextureNode('output');
    const bloomPass = bloom(scenePassColor, strength, 0.5, threshold);

    const uScanProgress = uniform(0);
    progressRef.current = uScanProgress;

    const scanPos = float(uScanProgress.value);
    const uvY = uv().y;
    const scanWidth = float(0.05);
    const scanLine = smoothstep(0, scanWidth, abs(uvY.sub(scanPos)));
    const redOverlay = vec3(1, 0, 0).mul(oneMinus(scanLine)).mul(0.4);

    const withScanEffect = mix(
      scenePassColor,
      add(scenePassColor, redOverlay),
      fullScreenEffect ? smoothstep(0.9, 1.0, oneMinus(scanLine)) : 1.0
    );

    const final = withScanEffect.add(bloomPass);
    postProcessing.outputNode = final;

    return postProcessing;
  }, [camera, gl, scene, strength, threshold, fullScreenEffect, three]);

  useFrame(({ clock }) => {
    if (progressRef.current) {
      progressRef.current.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    }
    render.renderAsync();
  }, 1);

  return null;
};

const WIDTH = 300;
const HEIGHT = 300;

const Scene = ({ three }: { three: ThreeModule }) => {
  const [rawMap, depthMap] = useTexture([TEXTUREMAP.src, DEPTHMAP.src]);
  const meshRef = useRef<import('three').Mesh>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (rawMap && depthMap) {
      setVisible(true);
    }
  }, [rawMap, depthMap]);

  const { material, uniforms } = useMemo(() => {
    const uPointer = uniform(new three.Vector2(0));
    const uProgress = uniform(0);

    if (!rawMap || !depthMap) {
      return {
        material: new three.MeshBasicMaterial({ transparent: true, opacity: 0 }),
        uniforms: { uPointer, uProgress },
      };
    }

    const strength = 0.01;
    const tDepthMap = texture(depthMap);
    const tMap = texture(rawMap, uv().add(tDepthMap.r.mul(uPointer).mul(strength)));
    const aspect = float(WIDTH).div(HEIGHT);
    const tUv = vec2(uv().x.mul(aspect), uv().y);
    const tiling = vec2(120.0);
    const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);
    const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2));
    const dist = float(tiledUv.length());
    const dot = float(smoothstep(0.5, 0.49, dist)).mul(brightness);
    const depth = tDepthMap.r;
    const flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))));
    const mask = dot.mul(flow).mul(vec3(10, 0, 0));
    const final = blendScreen(tMap, mask);

    const material = new three.MeshBasicNodeMaterial({
      colorNode: final,
      transparent: true,
      opacity: 0,
    });

    return { material, uniforms: { uPointer, uProgress } };
  }, [rawMap, depthMap, three]);

  const [w, h] = useAspect(WIDTH, HEIGHT);

  useFrame(({ clock }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    if (meshRef.current?.material && 'opacity' in meshRef.current.material) {
      const mat = meshRef.current.material as { opacity: number };
      mat.opacity = three.MathUtils.lerp(mat.opacity, visible ? 1 : 0, 0.07);
    }
  });

  useFrame(({ pointer }) => {
    uniforms.uPointer.value = pointer;
  });

  const scaleFactor = 0.4;
  return (
    <mesh ref={meshRef} scale={[w * scaleFactor, h * scaleFactor, 1]} material={material}>
      <planeGeometry />
    </mesh>
  );
};

export default function HeroWebGPUCanvas() {
  const [three, setThree] = useState<ThreeModule | null>(null);

  useEffect(() => {
    let mounted = true;
    loadThreeWebGPU()
      .then((mod) => {
        if (mounted) setThree(mod);
      })
      .catch((err) => {
        console.warn('Failed to load WebGPU three module:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!three) {
    return <HeroCanvasFallback />;
  }

  return (
    <HeroCanvasErrorBoundary fallback={<HeroCanvasFallback />}>
      <Canvas
        flat
        gl={async (props) => {
          try {
            const renderer = new three.WebGPURenderer(
              props as ConstructorParameters<typeof three.WebGPURenderer>[0]
            );
            await renderer.init();
            return renderer;
          } catch (e) {
            console.warn('WebGPU not supported, falling back to WebGL:', e);
            const { WebGLRenderer: GLRenderer } = await import('three');
            return new GLRenderer(props as ConstructorParameters<typeof WebGLRenderer>[0]);
          }
        }}
        className="absolute inset-0 z-10"
      >
        <React.Suspense fallback={null}>
          <PostProcessing three={three} fullScreenEffect={true} />
          <Scene three={three} />
        </React.Suspense>
      </Canvas>
    </HeroCanvasErrorBoundary>
  );
}
