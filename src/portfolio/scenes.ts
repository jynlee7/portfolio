import type * as Three from 'three';
import type { SceneKind, buildScene } from './scene-models';
import './scenes.css';

type World = ReturnType<typeof buildScene>;
type View = {
  host: HTMLElement;
  figure: HTMLElement | null;
  kind: SceneKind;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;
  world?: World;
  camera?: Three.PerspectiveCamera;
  visible: boolean;
  dirty: boolean;
  yaw: number;
  targetYaw: number;
};

/** One GPU context for the whole page. The visible canvases hold inexpensive 2D snapshots. */
export function initScenes(): () => void {
  const hosts = [...document.querySelectorAll<HTMLElement>('[data-scene]')];
  if (!hosts.length) return () => {};
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners: (() => void)[] = [];
  let disposed = false;
  let failed = false;
  let loading: Promise<void> | undefined;
  let renderer: Three.WebGLRenderer | undefined;
  let three: typeof Three | undefined;
  let makeWorld: typeof buildScene | undefined;
  let frame = 0;
  let lastTime = 0;

  const views: View[] = hosts.map(host => {
    const canvas = document.createElement('canvas');
    canvas.className = 'scene__canvas';
    canvas.setAttribute('aria-hidden','true');
    host.append(canvas);
    return {
      host, canvas, figure: host.closest<HTMLElement>('.scene'), kind: host.dataset.scene as SceneKind,
      context: canvas.getContext('2d', { alpha: true }), visible: false, dirty: true, yaw: 0, targetYaw: 0,
    };
  });

  function listen(target: EventTarget, event: string, callback: EventListener, options?: AddEventListenerOptions) {
    target.addEventListener(event, callback, options);
    listeners.push(() => target.removeEventListener(event, callback, options));
  }

  function setReady(view: View, ready: boolean) {
    view.host.classList.toggle('is-ready',ready);
    view.figure?.classList.toggle('has-interactive-scene',ready);
    const label = view.figure?.querySelector<HTMLElement>('.scene__caption > span:first-child');
    if (label) label.textContent = ready ? 'Drag to explore · Illustrative' : 'Illustrative scene';
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }

  function fallback() {
    failed = true;
    stop();
    views.forEach(view => setReady(view,false));
  }

  async function loadRenderer() {
    if (disposed || motion.matches || failed) return;
    if (loading) return loading;
    loading = (async () => {
      try {
        const [T, models] = await Promise.all([import('three'),import('./scene-models')]);
        if (disposed || motion.matches) return;
        three = T;
        makeWorld = models.buildScene;
        renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        renderer.setClearColor(0x000000,0);
        renderer.setPixelRatio(1);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = T.PCFSoftShadowMap;
        listen(renderer.domElement,'webglcontextlost',() => fallback());
        schedule();
      } catch {
        // The authored SVG remains the complete visual when WebGL is unavailable.
        fallback();
      }
    })();
    await loading;
    if (!renderer && !failed) loading = undefined;
  }

  function schedule() {
    if (disposed || failed || motion.matches || document.hidden || frame) return;
    if (!views.some(view => view.visible && (view.dirty || Math.abs(view.targetYaw - view.yaw) > .0005))) return;
    if (!renderer) { void loadRenderer(); return; }
    frame = requestAnimationFrame(render);
  }

  function render(time: number) {
    frame = 0;
    if (disposed || failed || motion.matches || document.hidden || !renderer || !three || !makeWorld) return;
    const dt = lastTime ? Math.min(48,time - lastTime) : 16;
    lastTime = time;
    let moving = false;
    for (const view of views) {
      if (!view.visible || !view.context || (!view.dirty && Math.abs(view.targetYaw-view.yaw) <= .0005)) continue;
      const rect = view.host.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1 || rect.bottom <= 0 || rect.top >= window.innerHeight) continue;
      try {
        if (!view.world) {
          view.world = makeWorld(view.kind);
          view.camera = new three.PerspectiveCamera(32,1,.1,80);
        }
        view.yaw += (view.targetYaw - view.yaw) * (1 - Math.exp(-dt / 72));
        if (Math.abs(view.targetYaw - view.yaw) < .0005) view.yaw = view.targetYaw;
        else moving = true;
        view.world.object.rotation.y = view.yaw;
        const ratio = Math.min(window.devicePixelRatio || 1,1.6,1280/rect.width,1024/rect.height);
        const width = Math.max(1,Math.round(rect.width * ratio));
        const height = Math.max(1,Math.round(rect.height * ratio));
        if (view.canvas.width !== width || view.canvas.height !== height) {
          view.canvas.width = width;
          view.canvas.height = height;
        }
        renderer.setSize(width,height,false);
        const camera = view.camera!;
        camera.aspect = rect.width / rect.height;
        const distance = view.world.radius / Math.sin(16 * Math.PI / 180) * .9 / Math.min(camera.aspect,1);
        const elevation = view.kind === 'simulation' || view.kind === 'knowledge' ? .33 : .62;
        camera.position.set(.66,elevation,1).normalize().multiplyScalar(distance);
        camera.lookAt(0,0,0);
        camera.updateProjectionMatrix();
        renderer.render(view.world.scene,camera);
        view.context.clearRect(0,0,width,height);
        // Copy synchronously before the browser clears the shared WebGL drawing buffer.
        view.context.drawImage(renderer.domElement,0,0,width,height);
        view.dirty = false;
        setReady(view,true);
      } catch {
        fallback();
        return;
      }
    }
    if (moving) schedule();
    else lastTime = 0;
  }

  const intersect = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const view = views.find(item => item.host === entry.target);
      if (!view) continue;
      view.visible = entry.isIntersecting;
      if (view.visible) view.dirty = true;
    }
    if (!views.some(view => view.visible)) stop();
    else schedule();
  },{ threshold: .01 });

  const resize = new ResizeObserver(entries => {
    for (const entry of entries) {
      const view = views.find(item => item.host === entry.target);
      if (view) view.dirty = true;
    }
    schedule();
  });

  for (const view of views) {
    setReady(view,false);
    intersect.observe(view.host);
    resize.observe(view.host);
    let pointer: { id: number; x: number; y: number; yaw: number; axis: 'pending' | 'horizontal' | 'vertical' } | undefined;
    listen(view.host,'pointerdown',((event: PointerEvent) => {
      if (!view.host.classList.contains('is-ready') || event.button !== 0 || !event.isPrimary) return;
      pointer = {id:event.pointerId,x:event.clientX,y:event.clientY,yaw:view.targetYaw,axis:'pending'};
    }) as EventListener);
    listen(view.host,'pointermove',((event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      if (pointer.axis === 'pending' && Math.max(Math.abs(dx),Math.abs(dy)) > 6) {
        pointer.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        if (pointer.axis === 'horizontal') {
          view.host.setPointerCapture(event.pointerId);
          view.host.classList.add('is-dragging');
        }
      }
      if (pointer.axis !== 'horizontal') return;
      event.preventDefault();
      view.targetYaw = pointer.yaw + dx * .009;
      view.dirty = true;
      schedule();
    }) as EventListener,{passive:false});
    const release = (event: Event) => {
      const e = event as PointerEvent;
      if (pointer?.id !== e.pointerId) return;
      if (view.host.hasPointerCapture(e.pointerId)) view.host.releasePointerCapture(e.pointerId);
      pointer = undefined;
      view.host.classList.remove('is-dragging');
    };
    for (const event of ['pointerup','pointercancel','lostpointercapture']) listen(view.host,event,release);
    listen(view.host,'pointerleave',((event: PointerEvent) => {
      if (pointer?.axis === 'pending') release(event);
    }) as EventListener);
    view.figure?.querySelectorAll<HTMLButtonElement>('[data-scene-rotate], [data-scene-reset]').forEach(button => {
      listen(button,'click',() => {
        if (!view.host.classList.contains('is-ready')) return;
        view.targetYaw = button.hasAttribute('data-scene-reset') ? 0 : view.targetYaw + (button.dataset.sceneRotate === 'left' ? -.4 : .4);
        view.dirty = true;
        schedule();
      });
    });
  }

  listen(document,'visibilitychange',() => {
    if (document.hidden) stop();
    else { views.forEach(view => { if (view.visible) view.dirty = true; }); schedule(); }
  });
  listen(motion,'change',() => {
    if (motion.matches) {
      stop();
      views.forEach(view => setReady(view,false));
    } else {
      views.forEach(view => { view.dirty = true; });
      schedule();
    }
  });

  return () => {
    disposed = true;
    stop();
    intersect.disconnect();
    resize.disconnect();
    listeners.forEach(remove => remove());
    for (const view of views) {
      setReady(view,false);
      view.canvas.remove();
      const geometry = new Set<Three.BufferGeometry>();
      const materials = new Set<Three.Material>();
      view.world?.scene.traverse(item => {
        const mesh = item as Three.Mesh;
        if (mesh.geometry) geometry.add(mesh.geometry);
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material));
        const light = item as Three.DirectionalLight;
        light.shadow?.map?.dispose();
        light.shadow?.mapPass?.dispose();
      });
      geometry.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      view.world?.scene.clear();
    }
    renderer?.dispose();
    renderer?.forceContextLoss();
  };
}
