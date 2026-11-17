import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Pause, Play, RotateCcw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { EksSvgFallback } from '../blueprint/EksSvgFallback.tsx';

interface EksBlueprintCanvasProps {
  onSelectTarget?: (sectionId: string) => void;
}

interface HoverCallout {
  label: string;
  sublabel: string;
  targetSection: string;
  x: number;
  y: number;
}

type CameraPreset = 'iso' | 'top' | 'alb';

const _vec3 = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _dummy = new THREE.Object3D();

const PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  iso: { pos: [11.5, 8.5, 11.5], target: [0.5, 0.7, 0] },
  top: { pos: [0.5, 15.5, 2.2], target: [0.5, 0, 0] },
  alb: { pos: [-9.2, 4.6, 7.6], target: [-2.8, 0.8, 0] },
};

function createGridTexture(isDark: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = isDark ? '#071F4A' : '#E7F0FF';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = isDark ? 'rgba(111, 211, 255, 0.14)' : 'rgba(14, 58, 125, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    ctx.strokeStyle = isDark ? 'rgba(111, 211, 255, 0.34)' : 'rgba(14, 58, 125, 0.30)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

export default function EksBlueprintCanvas({ onSelectTarget }: EksBlueprintCanvasProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [webglFailed, setWebglFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [callout, setCallout] = useState<HoverCallout | null>(null);
  const [preset, setPreset] = useState<CameraPreset>('iso');
  const [exploded, setExploded] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dockOpen, setDockOpen] = useState(true);

  const stateRef = useRef({
    preset: 'iso' as CameraPreset,
    presetDirty: false,
    exploded: 0,
    paused: false,
    theme,
    scrollRatio: 0,
    pointerX: 0,
    pointerY: 0,
    inView: true,
    onSelectTarget,
  });

  stateRef.current.onSelectTarget = onSelectTarget;
  stateRef.current.exploded = exploded;
  stateRef.current.paused = paused;
  stateRef.current.theme = theme;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (reducedMotion || webglFailed) return;
    const mountEl = mountRef.current;
    const containerEl = containerRef.current;
    if (!mountEl || !containerEl) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const initialDark = stateRef.current.theme === 'dark';
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = containerEl.clientWidth || 640;
    const height = containerEl.clientHeight || 480;
    renderer.setSize(width, height);
    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    const bgHex = initialDark ? 0x0a2a5e : 0xe9f2ff;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.022);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 120);
    camera.position.set(...PRESETS.iso.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.minDistance = 6;
    controls.maxDistance = 26;
    controls.target.set(...PRESETS.iso.target);

    let userInteracted = false;
    controls.addEventListener('start', () => {
      userInteracted = true;
      stateRef.current.presetDirty = false;
    });

    // 3-Point Studio & Blueprint Lighting
    const hemiLight = new THREE.HemisphereLight(0x8cd6ff, 0x081e47, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.45);
    keyLight.position.set(10, 14, 9);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -11;
    keyLight.shadow.camera.right = 11;
    keyLight.shadow.camera.top = 11;
    keyLight.shadow.camera.bottom = -11;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6fd3ff, 0.75);
    rimLight.position.set(-10, 8, -10);
    scene.add(rimLight);

    // Drafting Grid Ground Plane (with polygonOffset to prevent Z-fighting)
    const gridTex = createGridTexture(initialDark);
    gridTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const floorMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      roughness: 0.9,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);

    // Soft radial contact shadow under cluster
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(128, 128, 18, 128, 128, 126);
      grad.addColorStop(0, 'rgba(3, 12, 30, 0.5)');
      grad.addColorStop(1, 'rgba(3, 12, 30, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 256);
    }
    const contactShadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    });
    const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(18, 14), contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0.4, 0.002, 0);
    scene.add(contactShadow);

    // Shared Materials
    const wireMat = new THREE.LineBasicMaterial({ color: 0x6fd3ff, transparent: true, opacity: 0.82 });
    const vpcWireMat = new THREE.LineDashedMaterial({
      color: 0xe8f1ff,
      dashSize: 0.35,
      gapSize: 0.18,
      transparent: true,
      opacity: 0.72,
    });
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x0f3b7d,
      roughness: 0.68,
      metalness: 0.25,
    });
    const metalCapMat = new THREE.MeshStandardMaterial({
      color: 0x90c8f8,
      roughness: 0.25,
      metalness: 0.85,
    });
    const glassChassisMat = new THREE.MeshPhysicalMaterial({
      color: 0x164a96,
      roughness: 0.18,
      metalness: 0.1,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    const podMat = new THREE.MeshStandardMaterial({
      color: 0xffb84d,
      emissive: 0xff981a,
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.4,
    });

    const clusterRoot = new THREE.Group();
    scene.add(clusterRoot);

    // 1. VPC Outer Boundary Frame
    const vpcGroup = new THREE.Group();
    const vpcBoxGeo = new THREE.BoxGeometry(10.8, 0.12, 9.6);
    const vpcEdges = new THREE.EdgesGeometry(vpcBoxGeo);
    const vpcFrame = new THREE.LineSegments(vpcEdges, vpcWireMat);
    vpcFrame.computeLineDistances();
    vpcFrame.position.set(1.6, 0.06, 0);
    vpcGroup.add(vpcFrame);
    clusterRoot.add(vpcGroup);

    // Raycast Hitboxes (Layer 1)
    const hitboxes: THREE.Mesh[] = [];
    const hitboxGeo = new THREE.BoxGeometry(1, 1, 1);
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });

    function registerHitbox(
      parent: THREE.Object3D,
      scale: [number, number, number],
      offset: [number, number, number],
      meta: { label: string; sublabel: string; targetSection: string }
    ) {
      const box = new THREE.Mesh(hitboxGeo, hitboxMat);
      box.scale.set(...scale);
      box.position.set(...offset);
      box.layers.set(1);
      box.userData = meta;
      parent.add(box);
      hitboxes.push(box);
    }

    // 2. Application Load Balancer (ALB) Composite Hub (5 parts)
    const albGroup = new THREE.Group();
    albGroup.position.set(-5.2, 0, 0);

    const albPedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 0.28, 8), plinthMat);
    albPedestal.position.y = 0.14;
    albPedestal.castShadow = !isSoftwareGl;
    albGroup.add(albPedestal);

    const albCore = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 0.82, 8), metalCapMat);
    albCore.position.y = 0.69;
    albCore.castShadow = !isSoftwareGl;
    albGroup.add(albCore);

    const albEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.72, 0.82, 0.86, 8)),
      wireMat
    );
    albEdges.position.y = 0.7;
    albGroup.add(albEdges);

    const albRing = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.055, 12, 32), podMat);
    albRing.rotation.x = Math.PI / 2;
    albRing.position.y = 0.65;
    albGroup.add(albRing);

    const albCap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.36, 8), plinthMat);
    albCap.position.y = 1.28;
    albGroup.add(albCap);

    registerHitbox(albGroup, [2.2, 1.8, 2.2], [0, 0.8, 0], {
      label: 'Application Load Balancer',
      sublabel: 'TLS 1.3 Ingress · AWS WAF + Target Group Routing',
      targetSection: 'projects',
    });

    clusterRoot.add(albGroup);

    // 3. Three Availability Zone Subnets + Worker Nodes + Pods
    const azSpecs = [
      { name: 'us-east-1a', z: -2.9, section: 'skills' },
      { name: 'us-east-1b', z: 0.0, section: 'skills' },
      { name: 'us-east-1c', z: 2.9, section: 'projects' },
    ];

    const subnetGroups: THREE.Group[] = [];
    const nodeGroups: { group: THREE.Group; baseY: number; delay: number }[] = [];
    const podMeshes: { mesh: THREE.Mesh; phase: number; baseY: number }[] = [];
    const packetRoutes: THREE.CatmullRomCurve3[] = [];

    const podBoxGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
    const podEdgeGeo = new THREE.EdgesGeometry(podBoxGeo);
    const nodeChassisGeo = new THREE.BoxGeometry(2.1, 1.15, 1.55);
    const nodeEdgeGeo = new THREE.EdgesGeometry(nodeChassisGeo);

    azSpecs.forEach((az, azIdx) => {
      const subGroup = new THREE.Group();
      subGroup.position.set(1.6, 0, az.z);

      // Subnet platform plinth + wireframe perimeter
      const pad = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.14, 2.3), plinthMat);
      pad.position.y = 0.07;
      pad.receiveShadow = !isSoftwareGl;
      subGroup.add(pad);

      const subBorder = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(9.42, 0.18, 2.32)),
        wireMat
      );
      subBorder.position.y = 0.09;
      subGroup.add(subBorder);

      // 2 Worker Nodes per AZ
      [-2.1, 2.1].forEach((nx, nodeIdx) => {
        const nodeGroup = new THREE.Group();
        nodeGroup.position.set(nx, 0.14, 0);

        // Part 1: Grounded Base Plinth
        const base = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.14, 1.7), plinthMat);
        base.position.y = 0.07;
        base.castShadow = !isSoftwareGl;
        nodeGroup.add(base);

        // Part 2: Translucent Chassis
        const chassis = new THREE.Mesh(nodeChassisGeo, glassChassisMat);
        chassis.position.y = 0.72;
        nodeGroup.add(chassis);

        // Part 3: Blueprint Wireframe Cage
        const cage = new THREE.LineSegments(nodeEdgeGeo, wireMat);
        cage.position.y = 0.72;
        nodeGroup.add(cage);

        // Part 4: Metallic Top Cooling Cap
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 1.35), metalCapMat);
        cap.position.y = 1.33;
        cap.castShadow = !isSoftwareGl;
        nodeGroup.add(cap);

        // 3 Pods nested inside Worker Node
        [-0.56, 0, 0.56].forEach((px, pIdx) => {
          const podGroup = new THREE.Group();
          const podY = 0.68;
          podGroup.position.set(px, podY, 0);

          const podMesh = new THREE.Mesh(podBoxGeo, podMat);
          const podWire = new THREE.LineSegments(podEdgeGeo, wireMat);
          podGroup.add(podMesh);
          podGroup.add(podWire);

          nodeGroup.add(podGroup);
          podMeshes.push({ mesh: podMesh, phase: azIdx * 1.4 + nodeIdx * 0.9 + pIdx * 0.5, baseY: podY });
        });

        registerHitbox(nodeGroup, [2.3, 1.5, 1.75], [0, 0.75, 0], {
          label: `Node group: my-worker-node-${az.name.slice(-1)}${nodeIdx + 1}`,
          sublabel: `AZ: ${az.name} · 3 Active Pods · Karpenter Managed`,
          targetSection: az.section,
        });

        subGroup.add(nodeGroup);
        nodeGroups.push({
          group: nodeGroup,
          baseY: 0.14,
          delay: (azIdx * 2 + nodeIdx) * 0.12,
        });

        // Curved route from ALB to Worker Node
        const worldTargetX = 1.6 + nx;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-4.2, 0.65, 0),
          new THREE.Vector3(-2.4, 1.15, az.z * 0.55),
          new THREE.Vector3(worldTargetX - 1.1, 0.85, az.z),
          new THREE.Vector3(worldTargetX, 0.7, az.z),
        ]);
        packetRoutes.push(curve);

        const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.018, 6, false);
        const tubeMat = new THREE.MeshBasicMaterial({
          color: 0x6fd3ff,
          transparent: true,
          opacity: 0.35,
        });
        clusterRoot.add(new THREE.Mesh(tubeGeo, tubeMat));
      });

      clusterRoot.add(subGroup);
      subnetGroups.push(subGroup);
    });

    // 4. Instanced Data Packets flowing ALB -> Pods
    const PACKET_COUNT = 24;
    const packetGeo = new THREE.SphereGeometry(0.08, 10, 10);
    const packetMat = new THREE.MeshStandardMaterial({
      color: 0xffb84d,
      emissive: 0xffb84d,
      emissiveIntensity: 1.1,
      roughness: 0.2,
      metalness: 0.3,
    });
    const packetInstanced = new THREE.InstancedMesh(packetGeo, packetMat, PACKET_COUNT);
    packetInstanced.frustumCulled = false;
    clusterRoot.add(packetInstanced);

    // Pre-warm shaders on GPU devices
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting setup (throttled hover + click)
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const mouse = new THREE.Vector2();
    let lastRaycast = 0;

    const updateMouse = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      stateRef.current.pointerX = mouse.x;
      stateRef.current.pointerY = mouse.y;
    };

    const onPointerMove = (e: PointerEvent) => {
      updateMouse(e.clientX, e.clientY);
      const now = performance.now();
      if (now - lastRaycast < 50) return;
      lastRaycast = now;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(hitboxes, false);
      if (hits.length > 0) {
        const hit = hits[0].object;
        hit.getWorldPosition(_projVec);
        _projVec.y += 0.9;
        _projVec.project(camera);
        const w = renderer.domElement.clientWidth;
        const h = renderer.domElement.clientHeight;
        setCallout({
          label: hit.userData.label,
          sublabel: hit.userData.sublabel,
          targetSection: hit.userData.targetSection,
          x: ((_projVec.x + 1) / 2) * w,
          y: ((-_projVec.y + 1) / 2) * h,
        });
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setCallout(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onClick = (e: MouseEvent) => {
      updateMouse(e.clientX, e.clientY);
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(hitboxes, false);
      if (hits.length > 0) {
        const target = hits[0].object.userData.targetSection as string;
        stateRef.current.onSelectTarget?.(target);
      }
    };

    const onScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      stateRef.current.scrollRatio = Math.min(1, window.scrollY / maxScroll);
    };

    const onResize = () => {
      const w = containerEl.clientWidth || 640;
      const h = containerEl.clientHeight || 480;
      camera.aspect = w / h;
      camera.fov = w < 540 ? 48 : 40;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        stateRef.current.inView = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    observer.observe(containerEl);

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // Animation Loop with Software-WebGL afterDraw Pacing
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let elapsedTotal = 0;
    let currentThemeApplied = initialDark;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.1);

      // Sync theme background/fog dynamically without recreating canvas
      const darkNow = stateRef.current.theme === 'dark';
      if (darkNow !== currentThemeApplied) {
        currentThemeApplied = darkNow;
        const nextBg = darkNow ? 0x0a2a5e : 0xe9f2ff;
        (scene.background as THREE.Color).setHex(nextBg);
        (scene.fog as THREE.FogExp2).color.setHex(nextBg);
        wireMat.color.setHex(darkNow ? 0x6fd3ff : 0x0e4da4);
        vpcWireMat.color.setHex(darkNow ? 0xe8f1ff : 0x0b2249);
        plinthMat.color.setHex(darkNow ? 0x0f3b7d : 0xc7daf9);
        floorMat.map?.dispose();
        floorMat.map = createGridTexture(darkNow);
        floorMat.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
        floorMat.needsUpdate = true;
      }

      if (!stateRef.current.inView || document.hidden) {
        frameId = window.setTimeout(tick, 180);
        return;
      }

      if (!stateRef.current.paused) {
        elapsedTotal += dt;
      }

      // Smooth assembly & exploded layer separation via exponential damping
      const explodeOffset = stateRef.current.exploded * 1.65;
      subnetGroups.forEach((sg, idx) => {
        const targetY = explodeOffset * 0.25 + (idx - 1) * explodeOffset * 0.05;
        sg.position.y = THREE.MathUtils.damp(sg.position.y, targetY, 6, dt);
      });

      nodeGroups.forEach((ng) => {
        const assembled = elapsedTotal > ng.delay ? 1 : 0;
        const targetY = assembled ? ng.baseY + explodeOffset * 0.75 : -0.6;
        ng.group.position.y = THREE.MathUtils.damp(ng.group.position.y, targetY, 5.5, dt);
      });

      // Pod vertical pulse
      podMeshes.forEach((pm) => {
        const pulse = Math.sin(elapsedTotal * 2.4 + pm.phase) * 0.06;
        const targetPodY = pm.baseY + pulse + explodeOffset * 0.65;
        pm.mesh.parent!.position.y = THREE.MathUtils.damp(pm.mesh.parent!.position.y, targetPodY, 7, dt);
      });

      // ALB ring rotation
      albRing.rotation.z = elapsedTotal * 0.65;

      // Packet flow along CatmullRomCurve3 routes
      for (let i = 0; i < PACKET_COUNT; i++) {
        const route = packetRoutes[i % packetRoutes.length];
        const t = ((elapsedTotal * 0.28 + i / PACKET_COUNT) % 1 + 1) % 1;
        route.getPointAt(t, _vec3);
        _dummy.position.copy(_vec3);
        _dummy.position.y += explodeOffset * 0.45;
        const scale = 0.85 + Math.sin(t * Math.PI) * 0.4;
        _dummy.scale.setScalar(scale);
        _dummy.updateMatrix();
        packetInstanced.setMatrixAt(i, _dummy.matrix);
      }
      packetInstanced.instanceMatrix.needsUpdate = true;

      // Camera preset damping or gentle mouse/scroll parallax
      if (stateRef.current.presetDirty) {
        const targetPreset = PRESETS[stateRef.current.preset];
        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPreset.pos[0], 5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPreset.pos[1], 5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPreset.pos[2], 5, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, targetPreset.target[0], 5, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, targetPreset.target[1], 5, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, targetPreset.target[2], 5, dt);
        if (camera.position.distanceTo(_vec3.set(...targetPreset.pos)) < 0.05) {
          stateRef.current.presetDirty = false;
        }
      } else if (!userInteracted) {
        const base = PRESETS[stateRef.current.preset];
        const px = stateRef.current.pointerX * 0.65;
        const py = stateRef.current.pointerY * 0.45;
        const scrollAngle = stateRef.current.scrollRatio * 0.45;
        const targetX = base.pos[0] + px - scrollAngle * 2.5;
        const targetY = base.pos[1] + py - stateRef.current.scrollRatio * 1.4;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 3.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3.5, dt);
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      envTex.dispose();
      gridTex.dispose();
      contactShadowTex.dispose();
      renderer.dispose();
    };
  }, [reducedMotion, webglFailed]);

  if (reducedMotion || webglFailed) {
    return <EksSvgFallback onSelectTarget={onSelectTarget} reducedMotionNote={reducedMotion} />;
  }

  const handlePresetChange = (next: CameraPreset) => {
    setPreset(next);
    stateRef.current.preset = next;
    stateRef.current.presetDirty = true;
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[420px] sm:h-[500px] lg:h-[560px] w-full overflow-hidden border border-[var(--bp-line)]"
      aria-label="Interactive 3D AWS EKS Blueprint Scene"
    >
      {/* Isolated WebGL canvas container */}
      <div ref={mountRef} className="h-full w-full" />

      {/* Top-Left Spec Label */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 border border-[var(--bp-line)] bg-[var(--bp-surface-solid)]/90 px-3 py-1.5 font-mono text-[11px] text-[var(--bp-ink)]">
        VPC 10.0.0.0/16 · 3 AZ SUBNETS · ALB → EKS PODS
      </div>

      {/* Hover Callout Leader */}
      {callout && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full border border-[var(--bp-accent)] bg-[var(--bp-surface-solid)] px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${Math.max(90, Math.min(callout.x, 520))}px`,
            top: `${Math.max(70, callout.y)}px`,
          }}
        >
          <p className="font-mono font-semibold text-[var(--bp-accent)]">{callout.label}</p>
          <p className="font-mono text-[11px] text-[var(--bp-ink-muted)]">{callout.sublabel}</p>
          <p className="mt-0.5 font-mono text-[10px] text-[var(--bp-ink)]">Click to inspect {callout.targetSection}</p>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (Zero backdrop-filter over WebGL) */}
      <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 max-w-[94%] flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockOpen((v) => !v)}
          className="flex items-center gap-1.5 border border-b-0 border-[var(--bp-line)] bg-[var(--bp-surface-solid)] px-3 py-1 font-mono text-[11px] text-[var(--bp-ink-muted)] hover:text-[var(--bp-ink)] whitespace-nowrap"
        >
          {dockOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          {dockOpen ? 'Hide Controls' : 'Show 3D Controls'}
        </button>

        {dockOpen && (
          <div className="flex flex-wrap items-center justify-center gap-3 border border-[var(--bp-line)] bg-[var(--bp-surface-solid)]/95 px-4 py-2 text-xs">
            {/* Camera Presets */}
            <div className="flex items-center gap-1" role="group" aria-label="Camera presets">
              {(['iso', 'top', 'alb'] as CameraPreset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePresetChange(p)}
                  className={`px-2.5 py-1 font-mono text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                    preset === p
                      ? 'bg-[var(--bp-accent)] text-[var(--bp-accent-fg)] font-semibold'
                      : 'border border-[var(--bp-line)] text-[var(--bp-ink-muted)] hover:text-[var(--bp-ink)]'
                  }`}
                >
                  {p === 'iso' ? 'Isometric' : p === 'top' ? 'AZ Plan' : 'ALB Ingress'}
                </button>
              ))}
            </div>

            {/* Exploded View Slider */}
            <label className="flex items-center gap-2 font-mono text-[11px] text-[var(--bp-ink-muted)] whitespace-nowrap">
              <span>Explode</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={exploded}
                onChange={(e) => setExploded(Number(e.target.value))}
                className="w-20 accent-[var(--bp-accent)]"
                aria-label="Exploded view separation"
              />
            </label>

            {/* Play/Pause & Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPaused((v) => !v)}
                className="flex items-center gap-1 border border-[var(--bp-line)] px-2.5 py-1 font-mono text-[11px] text-[var(--bp-ink)] hover:border-[var(--bp-accent)] whitespace-nowrap"
              >
                {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setExploded(0);
                  handlePresetChange('iso');
                }}
                className="flex items-center gap-1 border border-[var(--bp-line)] px-2 py-1 font-mono text-[11px] text-[var(--bp-ink-muted)] hover:text-[var(--bp-ink)] whitespace-nowrap"
                title="Reset camera view"
                aria-label="Reset camera view"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
