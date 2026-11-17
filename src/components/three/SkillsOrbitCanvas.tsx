import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { useTheme } from '../../context/ThemeContext.tsx';

interface SkillsOrbitCanvasProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
}

const _rayVec = new THREE.Vector2();

export default function SkillsOrbitCanvas({
  categories,
  activeCategory,
  onSelectCategory,
}: SkillsOrbitCanvasProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  const stateRef = useRef({
    activeCategory,
    theme,
    inView: true,
    onSelectCategory,
  });
  stateRef.current.activeCategory = activeCategory;
  stateRef.current.theme = theme;
  stateRef.current.onSelectCategory = onSelectCategory;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setFallback(true);
      return;
    }

    const containerEl = containerRef.current;
    const mountEl = mountRef.current;
    if (!containerEl || !mountEl) return;

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
      renderer = new THREE.WebGLRenderer({ antialias: !isSoftwareGl, alpha: false });
    } catch {
      setFallback(true);
      return;
    }

    const width = containerEl.clientWidth || 400;
    const height = containerEl.clientHeight || 300;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const isDark = stateRef.current.theme === 'dark';
    scene.background = new THREE.Color(isDark ? 0x082252 : 0xeaf2ff);
    scene.fog = new THREE.FogExp2(isDark ? 0x082252 : 0xeaf2ff, 0.035);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    camera.position.set(0, 3.4, 9.5);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0x8cd6ff, 0x0a214b, 0.9));
    const key = new THREE.DirectionalLight(0xfff1d6, 1.3);
    key.position.set(6, 9, 6);
    scene.add(key);

    // Central Wireframe Core (composite 3-part assembly)
    const coreGroup = new THREE.Group();
    const coreMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.95, 0),
      new THREE.MeshStandardMaterial({ color: 0x164a96, roughness: 0.35, metalness: 0.8 })
    );
    const coreEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.05, 0)),
      new THREE.LineBasicMaterial({ color: 0x6fd3ff })
    );
    const orbitRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.018, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x6fd3ff, transparent: true, opacity: 0.38 })
    );
    orbitRing.rotation.x = Math.PI / 2;
    coreGroup.add(coreMesh, coreEdges, orbitRing);
    scene.add(coreGroup);

    // Orbiting Category Nodes
    const nodes: { group: THREE.Group; mat: THREE.MeshStandardMaterial; category: string; angle: number }[] = [];
    const hitTargets: THREE.Mesh[] = [];
    const tileGeo = new THREE.BoxGeometry(0.75, 0.45, 0.75);
    const tileEdgeGeo = new THREE.EdgesGeometry(tileGeo);
    const subPodGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);

    categories.forEach((cat, idx) => {
      const angle = (idx / Math.max(1, categories.length)) * Math.PI * 2;
      const nodeGroup = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1a56ad,
        roughness: 0.35,
        metalness: 0.6,
      });
      const mainTile = new THREE.Mesh(tileGeo, mat);
      const wire = new THREE.LineSegments(
        tileEdgeGeo,
        new THREE.LineBasicMaterial({ color: 0x6fd3ff })
      );
      const accentPod = new THREE.Mesh(
        subPodGeo,
        new THREE.MeshStandardMaterial({ color: 0xffb84d, roughness: 0.25, metalness: 0.3 })
      );
      accentPod.position.set(0, 0.42, 0);

      nodeGroup.add(mainTile, wire, accentPod);
      nodeGroup.position.set(Math.cos(angle) * 3.4, 0, Math.sin(angle) * 3.4);

      const hit = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.1, 1.2),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.layers.set(1);
      hit.userData.category = cat;
      nodeGroup.add(hit);
      hitTargets.push(hit);

      scene.add(nodeGroup);
      nodes.push({ group: nodeGroup, mat, category: cat, angle });
    });

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _rayVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayVec, camera);
      const hits = raycaster.intersectObjects(hitTargets, false);
      if (hits.length > 0) {
        setHoveredCat(hits[0].object.userData.category as string);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredCat(null);
        renderer.domElement.style.cursor = 'default';
      }
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _rayVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayVec, camera);
      const hits = raycaster.intersectObjects(hitTargets, false);
      if (hits.length > 0) {
        const cat = hits[0].object.userData.category as string;
        stateRef.current.onSelectCategory(cat);
      }
    };

    const onResize = () => {
      const w = containerEl.clientWidth || 400;
      const h = containerEl.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const obs = new IntersectionObserver((entries) => {
      stateRef.current.inView = entries[0]?.isIntersecting ?? true;
    });
    obs.observe(containerEl);

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);

    let frameId = 0;
    let disposed = false;
    let t = 0;
    const clock = new THREE.Clock();
    let appliedDark = isDark;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
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

      const darkNow = stateRef.current.theme === 'dark';
      if (darkNow !== appliedDark) {
        appliedDark = darkNow;
        const hex = darkNow ? 0x082252 : 0xeaf2ff;
        (scene.background as THREE.Color).setHex(hex);
        (scene.fog as THREE.FogExp2).color.setHex(hex);
      }

      if (!stateRef.current.inView || document.hidden) {
        frameId = window.setTimeout(tick, 180);
        return;
      }

      t += dt;
      coreMesh.rotation.y = t * 0.45;
      coreEdges.rotation.y = -t * 0.3;

      nodes.forEach((n, idx) => {
        const a = n.angle + t * 0.25;
        n.group.position.x = Math.cos(a) * 3.4;
        n.group.position.z = Math.sin(a) * 3.4;
        n.group.position.y = Math.sin(t * 1.4 + idx) * 0.25;
        n.group.rotation.y = -a;
        const isActive =
          stateRef.current.activeCategory === 'All' ||
          stateRef.current.activeCategory === n.category;
        n.mat.color.setHex(isActive ? 0x2563eb : 0x0f326b);
        n.mat.emissive.setHex(stateRef.current.activeCategory === n.category ? 0xffb84d : 0x000000);
        n.mat.emissiveIntensity = stateRef.current.activeCategory === n.category ? 0.5 : 0;
      });

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      obs.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      env.dispose();
      renderer.dispose();
    };
  }, [categories]);

  if (fallback) {
    return (
      <div className="flex h-56 items-center justify-center border border-[var(--bp-line)] p-6 text-center font-mono text-xs text-[var(--bp-ink-muted)]">
        Reduced motion enabled — use the category tabs below to filter technical expertise.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-64 sm:h-72 w-full border border-[var(--bp-line)] overflow-hidden">
      <div ref={mountRef} className="h-full w-full" />
      <div className="pointer-events-none absolute top-3 left-3 font-mono text-[11px] text-[var(--bp-ink-muted)]">
        {hoveredCat ? `CLUSTER NODE: ${hoveredCat.toUpperCase()} (CLICK TO FILTER)` : '3D TECH STACK CLUSTER · CLICK NODE TO FILTER'}
      </div>
    </div>
  );
}
