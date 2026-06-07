"use client"

import React, { useEffect, useRef } from "react"
import * as THREE from "three"
import { ArrowRight, Search, Bell, Settings } from "lucide-react"

type LaserFlowProps = {
  className?: string
  style?: React.CSSProperties
  wispDensity?: number
  dpr?: number
  mouseSmoothTime?: number
  mouseTiltStrength?: number
  horizontalBeamOffset?: number
  verticalBeamOffset?: number
  flowSpeed?: number
  verticalSizing?: number
  horizontalSizing?: number
  fogIntensity?: number
  fogScale?: number
  wispSpeed?: number
  wispIntensity?: number
  flowStrength?: number
  decay?: number
  falloffStart?: number
  fogFallSpeed?: number
  color?: string
}

const VERT = `
precision highp float;
void main(){
  gl_Position = vec4(position, 1.0);
}
`

const FRAG = `
#ifdef GL_ES
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float;
precision mediump int;

uniform float iTime;
uniform vec3 iResolution;
uniform vec4 iMouse;
uniform float uWispDensity;
uniform float uTiltScale;
uniform float uFlowTime;
uniform float uFogTime;
uniform float uBeamXFrac;
uniform float uBeamYFrac;
uniform float uFlowSpeed;
uniform float uVLenFactor;
uniform float uHLenFactor;
uniform float uFogIntensity;
uniform float uFogScale;
uniform float uWSpeed;
uniform float uWIntensity;
uniform float uFlowStrength;
uniform float uDecay;
uniform float uFalloffStart;
uniform float uFogFallSpeed;
uniform vec3 uColor;
uniform float uFade;

// Core beam/flare shaping and dynamics
#define PI 3.14159265359
#define TWO_PI 6.28318530718
#define EPS 1e-6
#define EDGE_SOFT (DT_LOCAL*4.0)
#define DT_LOCAL 0.0038
#define TAP_RADIUS 6
#define R_H 150.0
#define R_V 150.0
#define FLARE_HEIGHT 16.0
#define FLARE_AMOUNT 8.0
#define FLARE_EXP 2.0
#define TOP_FADE_START 0.1
#define TOP_FADE_EXP 1.0
#define FLOW_PERIOD 0.5
#define FLOW_SHARPNESS 1.5

// Wisps (animated micro-streaks) that travel along the beam
#define W_BASE_X 1.5
#define W_LAYER_GAP 0.25
#define W_LANES 10
#define W_SIDE_DECAY 0.5
#define W_HALF 0.01
#define W_AA 0.15
#define W_CELL 20.0
#define W_SEG_MIN 0.01
#define W_SEG_MAX 0.55
#define W_CURVE_AMOUNT 15.0
#define W_CURVE_RANGE (FLARE_HEIGHT - 3.0)
#define W_BOTTOM_EXP 10.0

// Volumetric fog controls
#define FOG_ON 1
#define FOG_CONTRAST 1.2
#define FOG_SPEED_U 0.1
#define FOG_SPEED_V -0.1
#define FOG_OCTAVES 5
#define FOG_BOTTOM_BIAS 0.8
#define FOG_TILT_TO_MOUSE 0.05
#define FOG_TILT_DEADZONE 0.01
#define FOG_TILT_MAX_X 0.35
#define FOG_TILT_SHAPE 1.5
#define FOG_BEAM_MIN 0.0
#define FOG_BEAM_MAX 0.75
#define FOG_MASK_GAMMA 0.5
#define FOG_EXPAND_SHAPE 12.2
#define FOG_EDGE_MIX 0.5

// Horizontal vignette for the fog volume
#define HFOG_EDGE_START 0.20
#define HFOG_EDGE_END 0.98
#define HFOG_EDGE_GAMMA 1.4
#define HFOG_Y_RADIUS 25.0
#define HFOG_Y_SOFT 60.0

// Beam extents and edge masking
#define EDGE_X0 0.22
#define EDGE_X1 0.995
#define EDGE_X_GAMMA 1.25
#define EDGE_LUMA_T0 0.0
#define EDGE_LUMA_T1 2.0
#define DITHER_STRENGTH 1.0

    float g(float x){return x<=0.00031308?12.92*x:1.055*pow(x,1.0/2.4)-0.055;}
    float bs(vec2 p,vec2 q,float powr){
        float d=distance(p,q),f=powr*uFalloffStart,r=(f*f)/(d*d+EPS);
        return powr*min(1.0,r);
    }
    float bsa(vec2 p,vec2 q,float powr,vec2 s){
        vec2 d=p-q; float dd=(d.x*d.x)/(s.x*s.x)+(d.y*d.y)/(s.y*s.y),f=powr*uFalloffStart,r=(f*f)/(dd+EPS);
        return powr*min(1.0,r);
    }
    float tri01(float x){float f=fract(x);return 1.0-abs(f*2.0-1.0);}
    float tauWf(float t,float tmin,float tmax){float a=smoothstep(tmin,tmin+EDGE_SOFT,t),b=1.0-smoothstep(tmax-EDGE_SOFT,tmax,t);return max(0.0,a*b);} 
    float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+34.123);return fract(p.x*p.y);}
    float vnoise(vec2 p){
        vec2 i=floor(p),f=fract(p);
        float a=h21(i),b=h21(i+vec2(1,0)),c=h21(i+vec2(0,1)),d=h21(i+vec2(1,1));
        vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
    }
    float fbm2(vec2 p){
        float v=0.0,amp=0.6; mat2 m=mat2(0.86,0.5,-0.5,0.86);
        for(int i=0;i<FOG_OCTAVES;++i){v+=amp*vnoise(p); p=m*p*2.03+17.1; amp*=0.52;}
        return v;
    }
    float rGate(float x,float l){float a=smoothstep(0.0,W_AA,x),b=1.0-smoothstep(l,l+W_AA,x);return max(0.0,a*b);}
    float flareY(float y){float t=clamp(1.0-(clamp(y,0.0,FLARE_HEIGHT)/max(FLARE_HEIGHT,EPS)),0.0,1.0);return pow(t,FLARE_EXP);}

    float vWisps(vec2 uv,float topF){
    float y=uv.y,yf=(y+uFlowTime*uWSpeed)/W_CELL;
    float dRaw=clamp(uWispDensity,0.0,2.0),d=dRaw<=0.0?1.0:dRaw;
    float lanesF=floor(float(W_LANES)*min(d,1.0)+0.5); // WebGL1-safe
    int lanes=int(max(1.0,lanesF));
    float sp=min(d,1.0),ep=max(d-1.0,0.0);
    float fm=flareY(max(y,0.0)),rm=clamp(1.0-(y/max(W_CURVE_RANGE,EPS)),0.0,1.0),cm=fm*rm;
    const float G=0.05; float xS=1.0+(FLARE_AMOUNT*W_CURVE_AMOUNT*G)*cm;
    float sPix=clamp(y/R_V,0.0,1.0),bGain=pow(1.0-sPix,W_BOTTOM_EXP),sum=0.0;
    for(int s=0;s<2;++s){
        float sgn=s==0?-1.0:1.0;
        for(int i=0;i<W_LANES;++i){
            if(i>=lanes) break;
            float off=W_BASE_X+float(i)*W_LAYER_GAP,xc=sgn*(off*xS);
            float dx=abs(uv.x-xc),lat=1.0-smoothstep(W_HALF,W_HALF+W_AA,dx),amp=exp(-off*W_SIDE_DECAY);
            float seed=h21(vec2(off,sgn*17.0)),yf2=yf+seed*7.0,ci=floor(yf2),fy=fract(yf2);
            float seg=mix(W_SEG_MIN,W_SEG_MAX,h21(vec2(ci,off*2.3)));
            float spR=h21(vec2(ci,off+sgn*31.0)),seg1=rGate(fy,seg)*step(spR,sp);
            if(ep>0.0){float spR2=h21(vec2(ci*3.1+7.0,off*5.3+sgn*13.0)); float f2=fract(fy+0.5); seg1+=rGate(f2,seg*0.9)*step(spR2,ep);}
            sum+=amp*lat*seg1;
        }
    }
    float span=smoothstep(-3.0,0.0,y)*(1.0-smoothstep(R_V-6.0,R_V,y));
    return uWIntensity*sum*topF*bGain*span;
}

void mainImage(out vec4 fc,in vec2 frag){
    vec2 C=iResolution.xy*.5; float invW=1.0/max(C.x,1.0);
    float sc=512.0/iResolution.x*.4;
    vec2 uv=(frag-C)*sc,off=vec2(uBeamXFrac*iResolution.x*sc,uBeamYFrac*iResolution.y*sc);
    vec2 uvc = uv - off;
    float a=0.0,b=0.0;
    float basePhase=1.5*PI+uDecay*.5; float tauMin=basePhase-uDecay; float tauMax=basePhase;
    float cx=clamp(uvc.x/(R_H*uHLenFactor),-1.0,1.0),tH=clamp(TWO_PI-acos(cx),tauMin,tauMax);
    for(int k=-TAP_RADIUS;k<=TAP_RADIUS;++k){
        float tu=tH+float(k)*DT_LOCAL,wt=tauWf(tu,tauMin,tauMax); if(wt<=0.0) continue;
        float spd=max(abs(sin(tu)),0.02),u=clamp((basePhase-tu)/max(uDecay,EPS),0.0,1.0),env=pow(1.0-abs(u*2.0-1.0),0.8);
        vec2 p=vec2((R_H*uHLenFactor)*cos(tu),0.0);
        a+=wt*bs(uvc,p,env*spd);
    }
    float yPix=uvc.y,cy=clamp(-yPix/(R_V*uVLenFactor),-1.0,1.0),tV=clamp(TWO_PI-acos(cy),tauMin,tauMax);
    for(int k=-TAP_RADIUS;k<=TAP_RADIUS;++k){
        float tu=tV+float(k)*DT_LOCAL,wt=tauWf(tu,tauMin,tauMax); if(wt<=0.0) continue;
        float yb=(-R_V)*cos(tu),s=clamp(yb/R_V,0.0,1.0),spd=max(abs(sin(tu)),0.02);
        float env=pow(1.0-s,0.6)*spd;
        float cap=1.0-smoothstep(TOP_FADE_START,1.0,s); cap=pow(cap,TOP_FADE_EXP); env*=cap;
        float ph=s/max(FLOW_PERIOD,EPS)+uFlowTime*uFlowSpeed;
        float fl=pow(tri01(ph),FLOW_SHARPNESS);
        env*=mix(1.0-uFlowStrength,1.0,fl);
        float yp=(-R_V*uVLenFactor)*cos(tu),m=pow(smoothstep(FLARE_HEIGHT,0.0,yp),FLARE_EXP),wx=1.0+FLARE_AMOUNT*m;
        vec2 sig=vec2(wx,1.0),p=vec2(0.0,yp);
        float mask=step(0.0,yp);
        b+=wt*bsa(uvc,p,mask*env,sig);
    }
    float sPix=clamp(yPix/R_V,0.0,1.0),topA=pow(1.0-smoothstep(TOP_FADE_START,1.0,sPix),TOP_FADE_EXP);
    float L=a+b*topA;
    float w=vWisps(vec2(uvc.x,yPix),topA);
    float fog=0.0;
#if FOG_ON
    vec2 fuv=uvc*uFogScale;
    float mAct=step(1.0,length(iMouse.xy)),nx=((iMouse.x-C.x)*invW)*mAct;
    float ax = abs(nx);
    float stMag = mix(ax, pow(ax, FOG_TILT_SHAPE), 0.35);
    float st = sign(nx) * stMag * uTiltScale;
    st = clamp(st, -FOG_TILT_MAX_X, FOG_TILT_MAX_X);
    vec2 dir=normalize(vec2(st,1.0));
    fuv+=uFogTime*uFogFallSpeed*dir;
    vec2 prp=vec2(-dir.y,dir.x);
    fuv+=prp*(0.08*sin(dot(uvc,prp)*0.08+uFogTime*0.9));
    float n=fbm2(fuv+vec2(fbm2(fuv+vec2(7.3,2.1)),fbm2(fuv+vec2(-3.7,5.9)))*0.6);
    n=pow(clamp(n,0.0,1.0),FOG_CONTRAST);
    float pixW = 1.0 / max(iResolution.y, 1.0);
#ifdef GL_OES_standard_derivatives
    float wL = max(fwidth(L), pixW);
#else
    float wL = pixW;
#endif
    float m0=pow(smoothstep(FOG_BEAM_MIN - wL, FOG_BEAM_MAX + wL, L),FOG_MASK_GAMMA);
    float bm=1.0-pow(1.0-m0,FOG_EXPAND_SHAPE); bm=mix(bm*m0,bm,FOG_EDGE_MIX);
    float yP=1.0-smoothstep(HFOG_Y_RADIUS,HFOG_Y_RADIUS+HFOG_Y_SOFT,abs(yPix));
    float nxF=abs((frag.x-C.x)*invW),hE=1.0-smoothstep(HFOG_EDGE_START,HFOG_EDGE_END,nxF); hE=pow(clamp(hE,0.0,1.0),HFOG_EDGE_GAMMA);
    float hW=mix(1.0,hE,clamp(yP,0.0,1.0));
    float bBias=mix(1.0,1.0-sPix,FOG_BOTTOM_BIAS);
    float browserFogIntensity = uFogIntensity;
    browserFogIntensity *= 1.8;
    float radialFade = 1.0 - smoothstep(0.0, 0.7, length(uvc) / 120.0);
    float safariFog = n * browserFogIntensity * bBias * bm * hW * radialFade;
    fog = safariFog;
#endif
    float LF=L+fog;
    float dith=(h21(frag)-0.5)*(DITHER_STRENGTH/255.0);
    float tone=g(LF+w);
    vec3 col=tone*uColor+dith;
    float alpha=clamp(g(L+w*0.6)+dith*0.6,0.0,1.0);
    float nxE=abs((frag.x-C.x)*invW),xF=pow(clamp(1.0-smoothstep(EDGE_X0,EDGE_X1,nxE),0.0,1.0),EDGE_X_GAMMA);
    float scene=LF+max(0.0,w)*0.5,hi=smoothstep(EDGE_LUMA_T0,EDGE_LUMA_T1,scene);
    float eM=mix(xF,1.0,hi);
    col*=eM; alpha*=eM;
    col*=uFade; alpha*=uFade;
    fc=vec4(col,alpha);
}

void main(){
  vec4 fc;
  mainImage(fc, gl_FragCoord.xy);
  gl_FragColor = fc;
}
`

const LaserFlow: React.FC<LaserFlowProps> = ({
  className,
  style,
  wispDensity = 1,
  dpr,
  mouseSmoothTime = 0.0,
  mouseTiltStrength = 0.01,
  horizontalBeamOffset = 0.1,
  verticalBeamOffset = 0.0,
  flowSpeed = 0.35,
  verticalSizing = 2.0,
  horizontalSizing = 0.5,
  fogIntensity = 0.45,
  fogScale = 0.3,
  wispSpeed = 15.0,
  wispIntensity = 5.0,
  flowStrength = 0.25,
  decay = 1.1,
  falloffStart = 1.2,
  fogFallSpeed = 0.6,
  color = "#FF79C6",
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const uniformsRef = useRef<any>(null)
  const hasFadedRef = useRef(false)
  const rectRef = useRef<DOMRect | null>(null)
  const baseDprRef = useRef<number>(1)
  const currentDprRef = useRef<number>(1)
  const fpsSamplesRef = useRef<number[]>([])
  const lastFpsCheckRef = useRef<number>(performance.now())
  const emaDtRef = useRef<number>(16.7) // ms
  const pausedRef = useRef<boolean>(false)
  const inViewRef = useRef<boolean>(true)

  const hexToRGB = (hex: string) => {
    let c = hex.trim()
    if (c[0] === "#") c = c.slice(1)
    if (c.length === 3)
      c = c
        .split("")
        .map((x) => x + x)
        .join("")
    const n = Number.parseInt(c, 16) || 0xffffff
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
  }

  useEffect(() => {
    const mount = mountRef.current!
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
      logarithmicDepthBuffer: false,
    })
    rendererRef.current = renderer

    baseDprRef.current = Math.min(dpr ?? (window.devicePixelRatio || 1), 2)
    currentDprRef.current = baseDprRef.current

    renderer.setPixelRatio(currentDprRef.current)
    renderer.shadowMap.enabled = false
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 1)
    const canvas = renderer.domElement
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.display = "block"
    mount.appendChild(canvas)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector3(1, 1, 1) },
      iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
      uWispDensity: { value: wispDensity },
      uTiltScale: { value: mouseTiltStrength },
      uFlowTime: { value: 0 },
      uFogTime: { value: 0 },
      uBeamXFrac: { value: horizontalBeamOffset },
      uBeamYFrac: { value: verticalBeamOffset },
      uFlowSpeed: { value: flowSpeed },
      uVLenFactor: { value: verticalSizing },
      uHLenFactor: { value: horizontalSizing },
      uFogIntensity: { value: fogIntensity },
      uFogScale: { value: fogScale },
      uWSpeed: { value: wispSpeed },
      uWIntensity: { value: wispIntensity },
      uFlowStrength: { value: flowStrength },
      uDecay: { value: decay },
      uFalloffStart: { value: falloffStart },
      uFogFallSpeed: { value: fogFallSpeed },
      uColor: { value: new THREE.Vector3(1, 1, 1) },
      uFade: { value: hasFadedRef.current ? 1 : 0 },
    }
    uniformsRef.current = uniforms

    const material = new THREE.RawShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    scene.add(mesh)

    const clock = new THREE.Clock()
    let prevTime = 0
    let fade = hasFadedRef.current ? 1 : 0

    const mouseTarget = new THREE.Vector2(0, 0)
    const mouseSmooth = new THREE.Vector2(0, 0)

    const setSizeNow = () => {
      const w = mount.clientWidth || 1
      const h = mount.clientHeight || 1
      const pr = currentDprRef.current
      renderer.setPixelRatio(pr)
      renderer.setSize(w, h, false)
      uniforms.iResolution.value.set(w * pr, h * pr, pr)
      rectRef.current = canvas.getBoundingClientRect()
    }

    let resizeRaf = 0
    const scheduleResize = () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(setSizeNow)
    }

    setSizeNow()
    const ro = new ResizeObserver(scheduleResize)
    ro.observe(mount)

    inViewRef.current = true; // Always render so scrolling down doesn't stop the animations or live updates
    const io = new IntersectionObserver(
      () => {
        // Keep rendering active to ensure scroll updates
        inViewRef.current = true;
      },
      { root: null, threshold: 0 },
    )
    io.observe(mount)

    const onVis = () => {
      pausedRef.current = document.hidden
    }
    document.addEventListener("visibilitychange", onVis, { passive: true })

    const updateMouse = (clientX: number, clientY: number) => {
      const rect = rectRef.current
      if (!rect) return
      const x = clientX - rect.left
      const y = clientY - rect.top
      const ratio = currentDprRef.current
      const hb = rect.height * ratio
      mouseTarget.set(x * ratio, hb - y * ratio)
    }
    const onMove = (ev: PointerEvent | MouseEvent) => updateMouse(ev.clientX, ev.clientY)
    const onLeave = () => mouseTarget.set(0, 0)
    canvas.addEventListener("pointermove", onMove as any, { passive: true })
    canvas.addEventListener("pointerdown", onMove as any, { passive: true })
    canvas.addEventListener("pointerenter", onMove as any, { passive: true })
    canvas.addEventListener("pointerleave", onLeave as any, { passive: true })

    const onCtxLost = (e: Event) => {
      e.preventDefault()
      pausedRef.current = true
    }
    const onCtxRestored = () => {
      pausedRef.current = false
      scheduleResize()
    }
    canvas.addEventListener("webglcontextlost", onCtxLost, false)
    canvas.addEventListener("webglcontextrestored", onCtxRestored, false)

    let raf = 0

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
    const dprFloor = 0.6
    const lowerThresh = 50
    const upperThresh = 58

    const adjustDprIfNeeded = (now: number) => {
      const elapsed = now - lastFpsCheckRef.current
      if (elapsed < 750) return

      const samples = fpsSamplesRef.current
      if (samples.length === 0) {
        lastFpsCheckRef.current = now
        return
      }
      const avgFps = samples.reduce((a, b) => a + b, 0) / samples.length

      let next = currentDprRef.current
      const base = baseDprRef.current

      if (avgFps < lowerThresh) {
        next = clamp(currentDprRef.current * 0.9, dprFloor, base)
      } else if (avgFps > upperThresh && currentDprRef.current < base) {
        next = clamp(currentDprRef.current * 1.05, dprFloor, base)
      }

      if (Math.abs(next - currentDprRef.current) > 0.01) {
        currentDprRef.current = next
        setSizeNow()
      }

      fpsSamplesRef.current = []
      lastFpsCheckRef.current = now
    }

    const animate = () => {
      raf = requestAnimationFrame(animate)
      if (pausedRef.current || !inViewRef.current) return

      const t = clock.getElapsedTime()
      const dt = Math.max(0, t - prevTime)
      prevTime = t

      const dtMs = dt * 1000
      emaDtRef.current = emaDtRef.current * 0.9 + dtMs * 0.1
      const instFps = 1000 / Math.max(1, emaDtRef.current)
      fpsSamplesRef.current.push(instFps)

      uniforms.iTime.value = t

      const cdt = Math.min(0.033, Math.max(0.001, dt))
      ;(uniforms.uFlowTime.value as number) += cdt
      ;(uniforms.uFogTime.value as number) += cdt

      if (!hasFadedRef.current) {
        const fadeDur = 1.0
        fade = Math.min(1, fade + cdt / fadeDur)
        uniforms.uFade.value = fade
        if (fade >= 1) hasFadedRef.current = true
      }

      const tau = Math.max(1e-3, mouseSmoothTime)
      const alpha = 1 - Math.exp(-cdt / tau)
      mouseSmooth.lerp(mouseTarget, alpha)
      uniforms.iMouse.value.set(mouseSmooth.x, mouseSmooth.y, 0, 0)

      renderer.render(scene, camera)

      adjustDprIfNeeded(performance.now())
    }

    animate()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      canvas.removeEventListener("pointermove", onMove as any)
      canvas.removeEventListener("pointerdown", onMove as any)
      canvas.removeEventListener("pointerenter", onMove as any)
      canvas.removeEventListener("pointerleave", onLeave as any)
      canvas.removeEventListener("webglcontextlost", onCtxLost)
      canvas.removeEventListener("webglcontextrestored", onCtxRestored)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (mount.contains(canvas)) mount.removeChild(canvas)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpr])

  useEffect(() => {
    const uniforms = uniformsRef.current
    if (!uniforms) return

    uniforms.uWispDensity.value = wispDensity
    uniforms.uTiltScale.value = mouseTiltStrength
    uniforms.uBeamXFrac.value = horizontalBeamOffset
    uniforms.uBeamYFrac.value = verticalBeamOffset
    uniforms.uFlowSpeed.value = flowSpeed
    uniforms.uVLenFactor.value = verticalSizing
    uniforms.uHLenFactor.value = horizontalSizing
    uniforms.uFogIntensity.value = fogIntensity
    uniforms.uFogScale.value = fogScale
    uniforms.uWSpeed.value = wispSpeed
    uniforms.uWIntensity.value = wispIntensity
    uniforms.uFlowStrength.value = flowStrength
    uniforms.uDecay.value = decay
    uniforms.uFalloffStart.value = falloffStart
    uniforms.uFogFallSpeed.value = fogFallSpeed

    const { r, g, b } = hexToRGB(color || "#FFFFFF")
    uniforms.uColor.value.set(r, g, b)
  }, [
    wispDensity,
    mouseTiltStrength,
    horizontalBeamOffset,
    verticalBeamOffset,
    flowSpeed,
    verticalSizing,
    horizontalSizing,
    fogIntensity,
    fogScale,
    wispSpeed,
    wispIntensity,
    flowStrength,
    decay,
    falloffStart,
    fogFallSpeed,
    color,
  ])

  return <div ref={mountRef} className={`w-full h-full relative ${className || ""}`} style={style} />
}

export function LaserHero({ onStartTrading }: { onStartTrading: () => void }) {
  const [tickerOffset, setTickerOffset] = React.useState(0)

  // ── Real market data state ────────────────────────────────────────────────
  interface CryptoPrice {
    inr: number
    inr_24h_change: number
  }
  const [prices, setPrices] = React.useState<{
    bitcoin: CryptoPrice
    ethereum: CryptoPrice
    tether: CryptoPrice
    binancecoin: CryptoPrice
    solana: CryptoPrice
    ripple: CryptoPrice
  } | null>(null)

  const [orderBook, setOrderBook] = React.useState<{
    asks: [string, string][]
    bids: [string, string][]
    usdInr: number
  } | null>(null)

  // Tick animation
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerOffset((prev) => prev + 1)
    }, 200)
    return () => clearInterval(timer)
  }, [])

  // Fetch real prices from CoinGecko (INR, no API key needed)
  const fetchPrices = React.useCallback(async () => {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin,solana,ripple&vs_currencies=inr&include_24hr_change=true',
        { cache: 'no-store' }
      )
      if (!res.ok) return
      const data = await res.json()
      setPrices(data)
    } catch { /* silently ignore — fallback values used */ }
  }, [])

  // Fetch live order book from Binance public API (USDT prices) + derive USD/INR from tether price
  const fetchOrderBook = React.useCallback(async () => {
    try {
      const depthRes = await fetch(
        'https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=8',
        { cache: 'no-store' }
      )
      const depth = await depthRes.json()
      // Derive USD→INR from CoinGecko tether price (≈84), fallback to 84
      setOrderBook({
        asks: depth.asks as [string, string][],
        bids: depth.bids as [string, string][],
        usdInr: prices?.tether?.inr ?? 84,
      })
    } catch { /* silently ignore */ }
  }, [prices])

  useEffect(() => {
    fetchPrices()
    const priceInterval = setInterval(fetchPrices, 30_000)
    return () => clearInterval(priceInterval)
  }, [fetchPrices])

  useEffect(() => {
    if (prices) {
      fetchOrderBook()
      const obInterval = setInterval(fetchOrderBook, 10_000)
      return () => clearInterval(obInterval)
    }
  }, [fetchOrderBook, prices])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt = (n: number, dec = 0) =>
    '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })

  // Fallback prices (approximate INR values at ~84 rate)
  const BTC  = prices?.bitcoin?.inr       ?? (70883 * 84)
  const ETH  = prices?.ethereum?.inr      ?? (3667  * 84)
  const USDT = prices?.tether?.inr        ?? 84
  const BNB  = prices?.binancecoin?.inr   ?? (624   * 84)
  const SOL  = prices?.solana?.inr        ?? (138   * 84)
  const XRP  = prices?.ripple?.inr        ?? (0.54  * 84)
  // usdInr is stored in orderBook.usdInr; USDT used as fallback rate reference
  void USDT // suppress lint — used via orderBook.usdInr in JSX

  const btcChange = prices?.bitcoin?.inr_24h_change     ?? 5.98
  const ethChange = prices?.ethereum?.inr_24h_change    ?? 18.66
  const bnbChange = prices?.binancecoin?.inr_24h_change ?? 9.52
  const solChange = prices?.solana?.inr_24h_change      ?? 1.82
  const xrpChange = prices?.ripple?.inr_24h_change      ?? 5.12

  // Animate BTC price slightly with tickerOffset for chart liveness
  const btcLive = BTC + Math.sin(tickerOffset * 0.1) * (BTC * 0.0015)

  // ── Dashboard panel tab state ─────────────────────────────────────────────
  type Panel = 'trade' | 'portfolio' | 'balance' | 'history'
  const [activePanel, setActivePanel] = React.useState<Panel>('trade')

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-[#030712] w-full">
      {/* Glassmorphic Navbar */}
      <nav className="relative z-20 w-full">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-md border-b border-red-900/20 rounded-b-xl"></div>
        <div className="relative xl:max-w-7xl max-w-6xl mx-auto py-4 lg:px-0 px-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">crypto trade</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#" onClick={(e) => { e.preventDefault(); onStartTrading(); }} className="text-gray-300 hover:text-white transition-colors">
                About
              </a>
              <a href="#" onClick={(e) => { e.preventDefault(); onStartTrading(); }} className="text-gray-300 hover:text-white transition-colors">
                Work
              </a>
              <a href="#" onClick={(e) => { e.preventDefault(); onStartTrading(); }} className="text-gray-300 hover:text-white transition-colors">
                Pricing
              </a>
              <a href="#" onClick={(e) => { e.preventDefault(); onStartTrading(); }} className="text-gray-300 hover:text-white transition-colors">
                Expertise
              </a>
              <div className="relative group">
                <a href="#" onClick={(e) => { e.preventDefault(); onStartTrading(); }} className="text-gray-300 hover:text-white transition-colors flex items-center gap-1">
                  Resources
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
              </div>
            </div>

            <button 
              onClick={onStartTrading}
              className="bg-white text-black hover:bg-gray-100 px-6 py-2 rounded-full font-medium transition-colors duration-200 flex items-center gap-2"
            >
              Start Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="absolute inset-0 z-0">
        <LaserFlow
          color="#FF4444"
          horizontalBeamOffset={0.3}
          verticalBeamOffset={0.0}
          flowSpeed={0.35}
          verticalSizing={33.8}
          horizontalSizing={0.5}
          fogIntensity={1}
          fogScale={0.25}
          wispSpeed={12.0}
          wispIntensity={7.0}
          flowStrength={0.3}
          decay={1.2}
          falloffStart={2.0}
          fogFallSpeed={0.8}
          wispDensity={1.2}
          mouseTiltStrength={0}
          className="w-full h-full"
        />
      </div>
      <div className="absolute top-4 left-2 h-40 w-40 rounded-full bg-[#FF4444]/80 blur-[200px]"></div>

      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pt-20 pb-16">
        <div className="xl:max-w-7xl max-w-6xl  w-full mx-auto lg:px-0 px-6">
          <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-stone-800/50 pr-3 backdrop-blur-sm border border-stone-600/30 mb-8">
            <span className="px-2 py-0.5 bg-red-500 text-red-100 text-xs font-bold rounded-full">New</span>
            <span className="text-sm text-gray-300 tracking-tight">The Future of Crypto Trading is Here</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-balance mb-6 text-white leading-tight">
            Own Your Crypto Journey
            <br />
            <span className="text-gray-300">with One Dashboard</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-300 text-balance mb-12 max-w-2xl leading-relaxed">
            Track real-time prices, manage your portfolio, and trade seamlessly — all in one fast, secure, and intuitive
            platform
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <button 
              onClick={onStartTrading}
              className="bg-white text-black hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2"
            >
              Start Now
              <ArrowRight className="w-5 h-5" />
            </button>

            <button 
              onClick={onStartTrading}
              className="border border-gray-600 bg-transparent hover:bg-gray-900/50 text-white px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300"
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 lg:px-0 px-6 pb-8">
        <div className="xl:max-w-7xl max-w-6xl  mx-auto w-full">
          <div className="bg-black/90 backdrop-blur-xl rounded-xl border border-stone-800/50 overflow-hidden">
            {/* Dashboard Header Tabs */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800/50">
              <div className="flex items-center gap-8">
                <span className="text-xl font-bold text-white">Crypto</span>
                <div className="flex items-center gap-1">
                  {(['trade', 'portfolio', 'balance', 'history'] as Panel[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setActivePanel(p)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 capitalize ${
                        activePanel === p
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {p === 'history' ? 'Tx History' : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Search className="w-5 h-5 text-gray-400" />
                <Bell className="w-5 h-5 text-gray-400" />
                <Settings className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* ── TRADE panel ── */}
            {activePanel === 'trade' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
              {/* Left Panel - Market Data */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Favorit</span>
                    <span className="text-sm text-gray-400">Market</span>
                  </div>
                </div>

                {/* Featured Crypto - Live BTC/INR */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-orange-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">₿</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">BTC/INR</div>
                      <div className="text-xs text-gray-400">Live • Binance</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {fmt(btcLive)}
                  </div>
                  <div className={`text-sm ${btcChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {btcChange >= 0 ? '+' : ''}{btcChange.toFixed(2)}% (24h)
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-gray-400">
                    <div>
                      24h Change<br />
                      <span className={btcChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {btcChange >= 0 ? '+' : ''}{btcChange.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      24h High<br />
                      <span className="text-white">{fmt(BTC * 1.015)}</span>
                    </div>
                    <div>
                      24h Low<br />
                      <span className="text-white">{fmt(BTC * 0.972)}</span>
                    </div>
                    <div>
                      Vol(BTC)<br />
                      <span className="text-white">63,218</span>
                    </div>
                  </div>
                </div>

                {/* Crypto List — Live from CoinGecko */}
                <div className="space-y-2">
                  {[
                    { symbol: 'BTC',  name: 'Bitcoin',  price: fmt(BTC  + Math.sin(tickerOffset * 0.08) * BTC  * 0.001), change: btcChange, positive: btcChange >= 0 },
                    { symbol: 'ETH',  name: 'Ethereum', price: fmt(ETH  + Math.cos(tickerOffset * 0.08) * ETH  * 0.001), change: ethChange, positive: ethChange >= 0 },
                    { symbol: 'USDT', name: 'Tether',   price: fmt(USDT, 2),                                              change: 0.03,      positive: true },
                    { symbol: 'BNB',  name: 'BNB',      price: fmt(BNB  + Math.sin(tickerOffset * 0.1)  * BNB  * 0.001), change: bnbChange, positive: bnbChange >= 0 },
                    { symbol: 'SOL',  name: 'Solana',   price: fmt(SOL  + Math.cos(tickerOffset * 0.12) * SOL  * 0.001), change: solChange, positive: solChange >= 0 },
                    { symbol: 'XRP',  name: 'Ripple',   price: fmt(XRP  + Math.sin(tickerOffset * 0.09) * XRP  * 0.001, 2), change: xrpChange, positive: xrpChange >= 0 },
                  ].map((crypto, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 hover:bg-gray-900/30 rounded transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${crypto.positive ? 'bg-green-400' : 'bg-red-400'}`} />
                        <div>
                          <div className="text-white text-sm font-medium">{crypto.symbol}</div>
                          <div className="text-gray-400 text-xs">{crypto.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-sm font-mono">{crypto.price}</div>
                        <div className={`text-xs font-semibold ${crypto.positive ? 'text-green-400' : 'text-red-400'}`}>
                          {crypto.positive ? '+' : ''}{typeof crypto.change === 'number' ? crypto.change.toFixed(2) : crypto.change}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Center Panel - Chart */}
              <div className="lg:col-span-1">
                <div className="bg-gray-900/50 rounded-lg p-4 flex flex-col h-80">

                  {/* Header row: pair name + timeframe buttons */}
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-semibold text-sm">BTC/INR</span>
                      <div className="text-green-400 text-sm font-bold font-mono">
                        {fmt(btcLive)}
                      </div>
                    </div>
                    <div className="flex gap-1 text-xs">
                      {['1s','15m','1H','4H','1D','1W'].map((tf) => (
                        <button
                          key={tf}
                          className={`px-2 py-0.5 rounded transition-colors ${tf === '1H' ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chart visualization — fills remaining height */}
                  <div className="relative flex-1 bg-black/50 rounded overflow-hidden">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none">
                      {[0,1,2,3].map(i => (
                        <div key={i} className="w-full border-t border-white/5" />
                      ))}
                    </div>

                    {/* Animated candlestick bars */}
                    <div className="absolute inset-0 flex items-end px-3 pb-2 gap-[2px]">
                      {Array.from({ length: 60 }, (_, i) => {
                        const phase = (i + tickerOffset * 0.5) * 0.3;
                        const bodyH  = Math.abs(Math.sin(phase) * 32 + Math.cos(phase * 1.3) * 12) + 8;
                        const totalH = bodyH + Math.abs(Math.sin(phase * 2.1) * 10) + 4;
                        const isGreen = Math.sin(phase + 0.4) > 0;
                        const color = isGreen ? '#22c55e' : '#ef4444';
                        const wickH = totalH - bodyH;

                        return (
                          <div
                            key={i}
                            className="flex flex-col items-center justify-end flex-1"
                            style={{ minWidth: '4px', maxWidth: '10px' }}
                          >
                            {/* Upper wick */}
                            <div style={{ width: '1px', height: `${wickH}%`, background: color, opacity: 0.6 }} />
                            {/* Body */}
                            <div
                              style={{
                                width: '100%',
                                height: `${bodyH}%`,
                                background: color,
                                opacity: 0.85,
                                borderRadius: '1px',
                                transition: 'height 0.2s ease-in-out',
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Live price label overlay */}
                    <div className="absolute top-2 right-3 text-xs text-green-400 font-mono font-bold bg-black/50 px-2 py-0.5 rounded">
                      {fmt(btcLive)}
                    </div>

                    {/* Volume bars at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-6 flex items-end px-3 gap-[2px] opacity-40">
                      {Array.from({ length: 60 }, (_, i) => {
                        const volH = (Math.abs(Math.sin((i + tickerOffset * 0.3) * 0.4)) * 80 + 10);
                        const isGreen = Math.sin((i + tickerOffset * 0.5) * 0.3 + 0.4) > 0;
                        return (
                          <div
                            key={i}
                            className="flex-1"
                            style={{
                              height: `${volH}%`,
                              background: isGreen ? '#22c55e' : '#ef4444',
                              minWidth: '2px',
                              maxWidth: '8px',
                              borderRadius: '1px 1px 0 0',
                              transition: 'height 0.3s ease-in-out',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Panel - Order Book */}
              <div className="lg:col-span-1">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white font-medium">Order Book</span>
                    <div className="flex gap-2">
                      <button className="text-green-400 text-sm">Buy Order</button>
                      <button className="text-red-400 text-sm">Sell Order</button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="grid grid-cols-3 gap-2 text-gray-400 mb-2">
                      <span>Price(₹)</span>
                      <span>Qty(BTC)</span>
                      <span>Total(₹)</span>
                    </div>

                    {/* Sell Orders — real Binance asks converted to INR */}
                    {orderBook
                      ? orderBook.asks.slice(0, 8).map(([p, q], i) => {
                          const priceInr = parseFloat(p) * orderBook.usdInr;
                          const qty = parseFloat(q);
                          return (
                            <div key={`sell-${i}`} className="grid grid-cols-3 gap-2 text-red-400">
                              <span className="font-mono">{fmt(priceInr)}</span>
                              <span>{qty.toFixed(5)}</span>
                              <span className="font-mono">{fmt(priceInr * qty)}</span>
                            </div>
                          );
                        })
                      : Array.from({ length: 8 }, (_, i) => {
                          const basePrice = (BTC * 1.0002) + Math.sin((tickerOffset + i * 3) * 0.08) * BTC * 0.001;
                          const qty = 0.0784 + Math.sin((tickerOffset + i * 5) * 0.12) * 0.005;
                          return (
                            <div key={`sell-${i}`} className="grid grid-cols-3 gap-2 text-red-400 animate-pulse">
                              <span className="font-mono">{fmt(basePrice)}</span>
                              <span>{qty.toFixed(5)}</span>
                              <span className="font-mono">{fmt(basePrice * qty)}</span>
                            </div>
                          );
                        })
                    }

                    {/* Current Price — live BTC */}
                    <div className="py-2 text-center border-y border-gray-700">
                      <span className="text-green-400 font-bold font-mono">{fmt(btcLive)}</span>
                    </div>

                    {/* Buy Orders — real Binance bids converted to INR */}
                    {orderBook
                      ? orderBook.bids.slice(0, 8).map(([p, q], i) => {
                          const priceInr = parseFloat(p) * orderBook.usdInr;
                          const qty = parseFloat(q);
                          return (
                            <div key={`buy-${i}`} className="grid grid-cols-3 gap-2 text-green-400">
                              <span className="font-mono">{fmt(priceInr)}</span>
                              <span>{qty.toFixed(5)}</span>
                              <span className="font-mono">{fmt(priceInr * qty)}</span>
                            </div>
                          );
                        })
                      : Array.from({ length: 8 }, (_, i) => {
                          const basePrice = (BTC * 0.9998) + Math.cos((tickerOffset + i * 4) * 0.09) * BTC * 0.001;
                          const qty = 0.3686 + Math.cos((tickerOffset + i * 6) * 0.11) * 0.02;
                          return (
                            <div key={`buy-${i}`} className="grid grid-cols-3 gap-2 text-green-400 animate-pulse">
                              <span className="font-mono">{fmt(basePrice)}</span>
                              <span>{qty.toFixed(5)}</span>
                              <span className="font-mono">{fmt(basePrice * qty)}</span>
                            </div>
                          );
                        })
                    }
                  </div>
                </div>
              </div>
            </div>
            )} {/* end trade panel */}

            {/* ── PORTFOLIO panel ── */}
            {activePanel === 'portfolio' && (
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-white font-semibold text-lg">Portfolio Allocation</h3>
                  <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full">Live · CoinGecko</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Allocation bars */}
                  <div className="space-y-4">
                    {[
                      { symbol: 'BTC', name: 'Bitcoin',  price: btcLive,                       color: '#f7931a', weight: 40 },
                      { symbol: 'ETH', name: 'Ethereum', price: ETH + Math.cos(tickerOffset * 0.08) * ETH * 0.001, color: '#627eea', weight: 25 },
                      { symbol: 'BNB', name: 'BNB',      price: BNB + Math.sin(tickerOffset * 0.1)  * BNB * 0.001, color: '#f3ba2f', weight: 15 },
                      { symbol: 'SOL', name: 'Solana',   price: SOL + Math.cos(tickerOffset * 0.12) * SOL * 0.001, color: '#9945ff', weight: 12 },
                      { symbol: 'XRP', name: 'Ripple',   price: XRP + Math.sin(tickerOffset * 0.09) * XRP * 0.001, color: '#00aae4', weight:  8 },
                    ].map((c) => (
                      <div key={c.symbol}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                            <span className="text-white text-sm font-medium">{c.symbol}</span>
                            <span className="text-gray-500 text-xs">{c.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-white text-sm font-mono">{fmt(c.price)}</span>
                            <span className="text-gray-400 text-xs ml-2">{c.weight}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${c.weight}%`, background: c.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Portfolio summary stats */}
                  <div className="space-y-3">
                    {[
                      { label: 'Total Value',   value: fmt(BTC * 0.012 + ETH * 0.15 + BNB * 0.5 + SOL * 2 + XRP * 200), highlight: true },
                      { label: 'Today P&L',     value: `+${fmt(btcLive * 0.012 * (btcChange / 100))}`, highlight: true },
                      { label: '24h Change',    value: `${btcChange >= 0 ? '+' : ''}${btcChange.toFixed(2)}%`, highlight: false },
                      { label: 'Best Performer',value: 'ETH +' + ethChange.toFixed(2) + '%',              highlight: false },
                      { label: 'BTC Holdings',  value: '0.0120 BTC',                                      highlight: false },
                      { label: 'ETH Holdings',  value: '0.1500 ETH',                                      highlight: false },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between items-center py-2 border-b border-gray-800/60">
                        <span className="text-gray-400 text-sm">{row.label}</span>
                        <span className={`text-sm font-mono font-semibold ${row.highlight ? 'text-green-400' : 'text-white'}`}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── BALANCE panel ── */}
            {activePanel === 'balance' && (
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-white font-semibold text-lg">Account Balance</h3>
                  <span className="text-xs text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20">● Live</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Available Cash',   value: fmt(500000), sub: 'INR Balance',      color: '#f7931a', icon: '₹' },
                    { label: 'Crypto Holdings',  value: fmt(BTC * 0.012 + ETH * 0.15 + SOL * 2), sub: 'Market Value INR', color: '#627eea', icon: '📈' },
                    { label: 'Total Net Worth',  value: fmt(500000 + BTC * 0.012 + ETH * 0.15 + SOL * 2), sub: 'Cash + Holdings', color: '#22c55e', icon: '💼' },
                  ].map((card) => (
                    <div key={card.label} className="bg-gray-900/60 rounded-xl p-5 border border-gray-800/50">
                      <div className="text-2xl mb-2">{card.icon}</div>
                      <div className="text-xs text-gray-400 mb-1">{card.label}</div>
                      <div className="text-xl font-bold font-mono" style={{ color: card.color }}>{card.value}</div>
                      <div className="text-xs text-gray-500 mt-1">{card.sub}</div>
                    </div>
                  ))}
                </div>
                {/* Live coin balances */}
                <div className="bg-gray-900/40 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-4 text-xs text-gray-400 px-4 py-2 border-b border-gray-800">
                    <span>Asset</span><span className="text-right">Quantity</span>
                    <span className="text-right">Price (₹)</span><span className="text-right">Value (₹)</span>
                  </div>
                  {[
                    { sym: 'BTC', qty: 0.0120, price: btcLive },
                    { sym: 'ETH', qty: 0.1500, price: ETH + Math.cos(tickerOffset * 0.08) * ETH * 0.001 },
                    { sym: 'BNB', qty: 0.5000, price: BNB + Math.sin(tickerOffset * 0.1)  * BNB * 0.001 },
                    { sym: 'SOL', qty: 2.0000, price: SOL + Math.cos(tickerOffset * 0.12) * SOL * 0.001 },
                    { sym: 'XRP', qty: 200.00, price: XRP + Math.sin(tickerOffset * 0.09) * XRP * 0.001 },
                  ].map((row) => (
                    <div key={row.sym} className="grid grid-cols-4 text-sm px-4 py-2.5 border-b border-gray-800/40 hover:bg-white/2 transition-colors">
                      <span className="text-white font-semibold">{row.sym}</span>
                      <span className="text-right text-gray-300 font-mono">{row.qty.toFixed(4)}</span>
                      <span className="text-right text-gray-300 font-mono">{fmt(row.price)}</span>
                      <span className="text-right text-green-400 font-mono font-semibold">{fmt(row.qty * row.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TRANSACTION HISTORY panel ── */}
            {activePanel === 'history' && (
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-white font-semibold text-lg">Transaction History</h3>
                  <div className="flex gap-2 text-xs">
                    {['All', 'Buy', 'Sell'].map((f) => (
                      <button key={f} className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-900/40 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-5 text-xs text-gray-400 px-4 py-2.5 border-b border-gray-800">
                    <span>Type</span><span>Pair</span><span className="text-right">Price (₹)</span>
                    <span className="text-right">Qty</span><span className="text-right">Total (₹)</span>
                  </div>
                  {[
                    { type: 'BUY',  sym: 'BTC', price: BTC * 0.985,  qty: 0.0050 },
                    { type: 'BUY',  sym: 'ETH', price: ETH * 0.992,  qty: 0.1000 },
                    { type: 'SELL', sym: 'SOL', price: SOL * 1.031,  qty: 1.0000 },
                    { type: 'BUY',  sym: 'BNB', price: BNB * 0.978,  qty: 0.2500 },
                    { type: 'SELL', sym: 'BTC', price: BTC * 1.022,  qty: 0.0030 },
                    { type: 'BUY',  sym: 'XRP', price: XRP * 0.995,  qty: 100.00 },
                    { type: 'SELL', sym: 'ETH', price: ETH * 1.015,  qty: 0.0500 },
                    { type: 'BUY',  sym: 'SOL', price: SOL * 0.968,  qty: 1.5000 },
                  ].map((tx, i) => (
                    <div key={i} className="grid grid-cols-5 text-sm px-4 py-2.5 border-b border-gray-800/40 hover:bg-white/2 transition-colors items-center">
                      <span className={`font-bold text-xs px-2 py-0.5 rounded w-fit ${tx.type === 'BUY' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                        {tx.type}
                      </span>
                      <span className="text-white font-medium">{tx.sym}/INR</span>
                      <span className="text-right text-gray-300 font-mono text-xs">{fmt(tx.price)}</span>
                      <span className="text-right text-gray-300 font-mono text-xs">{tx.qty.toFixed(4)}</span>
                      <span className={`text-right font-mono font-semibold text-xs ${tx.type === 'BUY' ? 'text-red-400' : 'text-green-400'}`}>
                        {tx.type === 'BUY' ? '-' : '+'}{fmt(tx.price * tx.qty)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />
    </section>
  )
}

export default LaserHero
