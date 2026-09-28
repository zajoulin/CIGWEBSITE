/* ==========================================================================
   cardio3d — WebGL2 renderer
   --------------------------------------------------------------------------
   A small, dependency-free renderer built for anatomical visualisation:

     • smooth-shaded meshes with a three-light studio rig and a fresnel rim
     • correct back-to-front transparency so chambers read as translucent
     • GPU colour-buffer picking, so selection is pixel-accurate
     • animated per-part opacity for isolate / hide / view-mode transitions
     • damped orbit, pan and zoom with smooth camera flights to a structure
     • screen-space projection so HTML labels can track a structure

   The renderer knows nothing about cardiology — it draws named parts. The
   anatomy lives in model.ts and the content layer.
   ========================================================================== */

import { bounds, type Bounds, type Geometry } from './geometry';
import type { Mat4, Vec3 } from './math';
import {
  clamp,
  hexToRgb,
  lerp,
  lookAt,
  multiply,
  perspective,
  transformPoint,
} from './math';
import type { ModelPart, PartGroup, ViewMode } from './model';

/* --------------------------------------------------------------- Shaders -- */

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
uniform mat4 uProjection;
uniform mat4 uView;
out vec3 vNormal;
out vec3 vWorld;
void main() {
  vNormal = aNormal;
  vWorld = aPosition;
  gl_Position = uProjection * uView * vec4(aPosition, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vWorld;
uniform vec3 uColor;
uniform vec3 uCamera;
uniform float uOpacity;
uniform float uHighlight;   // 0 = normal, 1 = fully highlighted
uniform float uDim;         // 0 = normal, 1 = desaturated context
out vec4 outColor;

const vec3 KEY_DIR  = normalize(vec3(-0.45, 0.72, 0.95));
const vec3 FILL_DIR = normalize(vec3(0.85, 0.15, 0.35));
const vec3 BACK_DIR = normalize(vec3(0.1, -0.4, -1.0));
const vec3 KEY_COL  = vec3(1.0, 0.96, 0.93);
const vec3 FILL_COL = vec3(0.42, 0.62, 0.92);
const vec3 BACK_COL = vec3(0.30, 0.52, 0.72);
const vec3 RIM_COL  = vec3(0.42, 0.82, 0.95);
const vec3 HL_COL   = vec3(0.36, 0.90, 1.0);

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamera - vWorld);
  if (!gl_FrontFacing) N = -N;

  vec3 base = uColor;
  // Desaturate and darken parts that are only present for context.
  float grey = dot(base, vec3(0.299, 0.587, 0.114));
  base = mix(base, vec3(grey) * 0.75, uDim * 0.82);

  float key  = max(dot(N, KEY_DIR), 0.0);
  float fill = max(dot(N, FILL_DIR), 0.0) * 0.42;
  float back = max(dot(N, BACK_DIR), 0.0) * 0.28;

  vec3 diffuse = base * (KEY_COL * key + FILL_COL * fill + BACK_COL * back);
  vec3 ambient = base * mix(0.20, 0.30, 0.5 + 0.5 * N.y);

  vec3 H = normalize(KEY_DIR + V);
  float spec = pow(max(dot(N, H), 0.0), 34.0) * 0.30;

  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  vec3 rim = RIM_COL * fres * mix(0.28, 0.10, uDim);

  vec3 col = ambient + diffuse + vec3(spec) + rim;

  // Selection glow: lift towards the highlight colour and add a strong rim.
  col = mix(col, mix(col, HL_COL, 0.42) + HL_COL * fres * 0.85, uHighlight);

  float alpha = uOpacity * mix(1.0, 0.55 + 0.45 * fres, uDim);
  alpha = clamp(alpha + uHighlight * 0.18, 0.0, 1.0);

  // Gentle filmic roll-off keeps highlights from clipping harshly.
  col = col / (col + vec3(0.86)) * 1.62;
  outColor = vec4(col, alpha);
}`;

const PICK_FRAG = `#version 300 es
precision highp float;
uniform vec3 uPickColor;
out vec4 outColor;
void main() { outColor = vec4(uPickColor, 1.0); }`;

/* ------------------------------------------------------------- Internals -- */

interface GpuPart {
  part: ModelPart;
  vao: WebGLVertexArrayObject;
  positionBuffer: WebGLBuffer;
  normalBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  count: number;
  rgb: Vec3;
  bounds: Bounds;
  /** Animated towards `targetOpacity` each frame. */
  opacity: number;
  targetOpacity: number;
  dim: number;
  targetDim: number;
  highlight: number;
  targetHighlight: number;
  pickId: number;
}

export interface CameraState {
  azimuth: number;
  elevation: number;
  radius: number;
  target: Vec3;
}

export interface ViewerOptions {
  /** Called when the pointer moves over a different part (or none). */
  onHover?: (name: string | null) => void;
  /** Called on a click that lands on a part (or empty space). */
  onSelect?: (name: string | null) => void;
  /** Called once the first frame has been drawn. */
  onReady?: () => void;
  /** Called if WebGL2 is unavailable or the context is lost. */
  onError?: (message: string) => void;
  /** Called every frame with the projected screen position of the selection. */
  onProject?: (screen: { x: number; y: number; visible: boolean } | null) => void;
  /** Slowly rotate when the user is not interacting. */
  autoRotate?: boolean;
  /** Disables all animation for prefers-reduced-motion. */
  reducedMotion?: boolean;
  /** Starting camera. */
  initialCamera?: Partial<CameraState>;
  /** Hides the interaction cursor changes (used by the small homepage preview). */
  compact?: boolean;
}

const DEFAULT_CAMERA: CameraState = {
  azimuth: 0.06,
  elevation: 0.08,
  radius: 9.6,
  target: [0, 0.12, 0],
};

const MIN_RADIUS = 1.1;
const MAX_RADIUS = 22;

export class CardioViewer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private pickProgram: WebGLProgram;
  private parts: GpuPart[] = [];
  private byName = new Map<string, GpuPart>();
  private options: ViewerOptions;

  private camera: CameraState;
  private desired: CameraState;
  private raf = 0;
  private disposed = false;
  private needsRender = true;

  private pickFbo: WebGLFramebuffer | null = null;
  private pickTexture: WebGLTexture | null = null;
  private pickDepth: WebGLRenderbuffer | null = null;
  private pickSize = { w: 0, h: 0 };

  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private pickUniforms: Record<string, WebGLUniformLocation | null> = {};

  private selected: string | null = null;
  private hovered: string | null = null;
  private isolated: string | null = null;
  private hidden = new Set<string>();
  private viewMode: ViewMode | null = null;
  private autoRotate: boolean;
  private reducedMotion: boolean;

  private pointer = { down: false, moved: 0, x: 0, y: 0, button: 0, panning: false };
  private pinch = { active: false, distance: 0, cx: 0, cy: 0 };
  private lastInteraction = 0;
  private observer: ResizeObserver | null = null;
  private intersection: IntersectionObserver | null = null;
  /** False while the canvas is scrolled out of view; suspends rendering. */
  private onScreen = true;

  constructor(canvas: HTMLCanvasElement, parts: ModelPart[], options: ViewerOptions = {}) {
    this.canvas = canvas;
    this.options = options;
    this.autoRotate = options.autoRotate ?? false;
    this.reducedMotion = options.reducedMotion ?? false;

    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      depth: true,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      options.onError?.('WebGL2 is not available in this browser.');
      throw new Error('webgl2-unavailable');
    }
    this.gl = gl;

    this.camera = { ...DEFAULT_CAMERA, ...options.initialCamera, target: [...(options.initialCamera?.target ?? DEFAULT_CAMERA.target)] as Vec3 };
    this.desired = { ...this.camera, target: [...this.camera.target] as Vec3 };

    this.program = this.buildProgram(VERT, FRAG);
    this.pickProgram = this.buildProgram(VERT, PICK_FRAG);

    for (const key of ['uProjection', 'uView', 'uColor', 'uCamera', 'uOpacity', 'uHighlight', 'uDim']) {
      this.uniforms[key] = gl.getUniformLocation(this.program, key);
    }
    for (const key of ['uProjection', 'uView', 'uPickColor']) {
      this.pickUniforms[key] = gl.getUniformLocation(this.pickProgram, key);
    }

    parts.forEach((part, i) => this.upload(part, i + 1));

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(0, 0, 0, 0);

    this.attachEvents();
    this.resize();
    this.loop();
  }

  /* ------------------------------------------------------------- setup -- */

  private buildProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const gl = this.gl;
    const compile = (type: number, src: string): WebGLShader => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error('Shader compile failed: ' + log);
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Program link failed: ' + gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  private upload(part: ModelPart, pickId: number): void {
    const gl = this.gl;
    const g: Geometry = part.geometry;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const positionBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, g.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const normalBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, g.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    const gpu: GpuPart = {
      part,
      vao,
      positionBuffer,
      normalBuffer,
      indexBuffer,
      count: g.indices.length,
      rgb: hexToRgb(part.color),
      bounds: bounds(g),
      opacity: part.opacity,
      targetOpacity: part.opacity,
      dim: 0,
      targetDim: 0,
      highlight: 0,
      targetHighlight: 0,
      pickId,
    };
    this.parts.push(gpu);
    this.byName.set(part.name, gpu);
  }

  /* ------------------------------------------------------------ events -- */

  private attachEvents(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', this.onPointerDown);
    c.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    c.addEventListener('pointerleave', this.onPointerLeave);
    c.addEventListener('wheel', this.onWheel, { passive: false });
    c.addEventListener('contextmenu', this.onContextMenu);
    c.addEventListener('touchstart', this.onTouchStart, { passive: true });
    c.addEventListener('touchmove', this.onTouchMove, { passive: false });
    c.addEventListener('touchend', this.onTouchEnd, { passive: true });
    this.gl.canvas.addEventListener('webglcontextlost', this.onContextLost as EventListener);

    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(c);
    } else {
      window.addEventListener('resize', this.resize);
    }

    /* An auto-rotating model redraws every frame for as long as it exists.
       Scrolled off a phone screen, or with the browser in the background,
       that is pure battery and heat for something nobody can see — and on the
       home page it competes with the scroll the reader is actually doing.
       Rendering is suspended whenever the canvas is not on screen. */
    document.addEventListener('visibilitychange', this.onVisibility);
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersection = new IntersectionObserver(
        (entries) => {
          const wasVisible = this.onScreen;
          this.onScreen = entries.some((en) => en.isIntersecting);
          // Coming back into view: catch up in one frame rather than fading.
          if (this.onScreen && !wasVisible) this.needsRender = true;
        },
        { rootMargin: '120px' },
      );
      this.intersection.observe(c);
    }
  }

  private onVisibility = (): void => {
    if (!document.hidden) this.needsRender = true;
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.options.onError?.('The 3D context was lost. Try reloading the page.');
  };

  private onContextMenu = (e: Event): void => e.preventDefault();

  private onPointerDown = (e: PointerEvent): void => {
    this.pointer.down = true;
    this.pointer.moved = 0;
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.button = e.button;
    this.pointer.panning = e.button === 2 || e.button === 1 || e.shiftKey;
    this.lastInteraction = performance.now();
    this.canvas.classList.add('grabbing');
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* not all browsers allow capture here */
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.pinch.active) return;
    if (this.pointer.down) {
      const dx = e.clientX - this.pointer.x;
      const dy = e.clientY - this.pointer.y;
      this.pointer.moved += Math.abs(dx) + Math.abs(dy);
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.lastInteraction = performance.now();

      if (this.pointer.panning) {
        this.pan(dx, dy);
      } else {
        this.desired.azimuth -= dx * 0.0072;
        this.desired.elevation = clamp(this.desired.elevation + dy * 0.0072, -1.35, 1.35);
      }
      this.needsRender = true;
      return;
    }

    // Hover picking, throttled to animation frames by the render loop.
    const name = this.pick(e.clientX, e.clientY);
    if (name !== this.hovered) {
      this.hovered = name;
      this.options.onHover?.(name);
      if (!this.options.compact) {
        this.canvas.classList.toggle('pointing', Boolean(name));
      }
      this.applyVisualState();
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.pointer.down) return;
    this.pointer.down = false;
    this.canvas.classList.remove('grabbing');
    if (this.pointer.moved < 5 && !this.pointer.panning) {
      const name = this.pick(e.clientX, e.clientY);
      this.options.onSelect?.(name);
    }
  };

  private onPointerLeave = (): void => {
    if (this.hovered !== null) {
      this.hovered = null;
      this.options.onHover?.(null);
      this.canvas.classList.remove('pointing');
      this.applyVisualState();
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = Math.exp(clamp(e.deltaY, -80, 80) * 0.0016);
    this.desired.radius = clamp(this.desired.radius * factor, MIN_RADIUS, MAX_RADIUS);
    this.lastInteraction = performance.now();
    this.needsRender = true;
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      this.pinch.active = true;
      this.pinch.distance = this.touchDistance(e);
      const c = this.touchCentre(e);
      this.pinch.cx = c.x;
      this.pinch.cy = c.y;
      this.pointer.down = false;
    }
  };

  /**
   * Two fingers zoom *and* pan. Panning was previously reachable only by
   * shift-dragging or right-dragging a mouse, which a touchscreen has no way
   * to express — so on a phone part of the model could be moved out of frame
   * with no way to bring it back except resetting the view.
   */
  private onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 2 && this.pinch.active) {
      e.preventDefault();

      const d = this.touchDistance(e);
      if (this.pinch.distance > 0) {
        this.desired.radius = clamp(
          this.desired.radius * (this.pinch.distance / d),
          MIN_RADIUS,
          MAX_RADIUS,
        );
      }
      this.pinch.distance = d;

      const c = this.touchCentre(e);
      this.pan(c.x - this.pinch.cx, c.y - this.pinch.cy);
      this.pinch.cx = c.x;
      this.pinch.cy = c.y;

      this.lastInteraction = performance.now();
      this.needsRender = true;
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length < 2) {
      this.pinch.active = false;
      this.pinch.distance = 0;
    }
  };

  private touchDistance(e: TouchEvent): number {
    const [a, b] = [e.touches[0], e.touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  private touchCentre(e: TouchEvent): { x: number; y: number } {
    const [a, b] = [e.touches[0], e.touches[1]];
    return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
  }

  private pan(dx: number, dy: number): void {
    const { azimuth, elevation, radius } = this.desired;
    const scale = (radius * 0.0016);
    // Camera right and up vectors in world space.
    const right: Vec3 = [Math.cos(azimuth), 0, -Math.sin(azimuth)];
    const up: Vec3 = [
      -Math.sin(azimuth) * Math.sin(elevation),
      Math.cos(elevation),
      -Math.cos(azimuth) * Math.sin(elevation),
    ];
    for (let i = 0; i < 3; i++) {
      this.desired.target[i] += -right[i] * dx * scale + up[i] * dy * scale;
    }
  }

  /* ------------------------------------------------------------ public -- */

  setViewMode(mode: ViewMode, reframe = false): void {
    this.viewMode = mode;
    this.applyVisualState();
    if (reframe && mode.camera) this.frameTo(mode.camera.radius, mode.camera.target);
  }

  /** Moves the camera to a specific distance and target, keeping the angle. */
  frameTo(radius: number, target: Vec3): void {
    this.desired.radius = clamp(radius, MIN_RADIUS, MAX_RADIUS);
    this.desired.target = [...target] as Vec3;
    this.needsRender = true;
  }

  setSelected(name: string | null): void {
    this.selected = name;
    this.applyVisualState();
  }

  setIsolated(name: string | null): void {
    this.isolated = name;
    this.applyVisualState();
  }

  setHidden(names: Set<string>): void {
    this.hidden = new Set(names);
    this.applyVisualState();
  }

  setAutoRotate(on: boolean): void {
    this.autoRotate = on;
    this.needsRender = true;
  }

  setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
  }

  resetView(): void {
    this.desired = { ...DEFAULT_CAMERA, target: [...DEFAULT_CAMERA.target] as Vec3 };
    this.needsRender = true;
  }

  /** Flies the camera so the named part fills a comfortable part of the frame. */
  focusOn(name: string | null): void {
    if (!name) {
      this.resetView();
      return;
    }
    const gpu = this.byName.get(name);
    if (!gpu) return;
    this.desired.target = [...gpu.bounds.centre] as Vec3;
    this.desired.radius = clamp(gpu.bounds.radius * 5.4 + 0.55, MIN_RADIUS, MAX_RADIUS);
    this.needsRender = true;
  }

  /** The visible screen position of a part's centre, for HTML labels. */
  project(name: string): { x: number; y: number; visible: boolean } | null {
    const gpu = this.byName.get(name);
    if (!gpu) return null;
    const { projection, view } = this.matrices();
    const clip = transformPoint(multiply(projection, view), gpu.bounds.centre);
    if (clip[3] <= 0.001) return null;
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clip[0] / clip[3]) * 0.5 + 0.5) * rect.width,
      y: (0.5 - (clip[1] / clip[3]) * 0.5) * rect.height,
      visible: gpu.opacity > 0.06,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);

    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onPointerDown);
    c.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    c.removeEventListener('pointerleave', this.onPointerLeave);
    c.removeEventListener('wheel', this.onWheel);
    c.removeEventListener('contextmenu', this.onContextMenu);
    c.removeEventListener('touchstart', this.onTouchStart);
    c.removeEventListener('touchmove', this.onTouchMove);
    c.removeEventListener('touchend', this.onTouchEnd);
    this.gl.canvas.removeEventListener('webglcontextlost', this.onContextLost as EventListener);
    this.observer?.disconnect();
    this.intersection?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('resize', this.resize);

    const gl = this.gl;
    for (const p of this.parts) {
      gl.deleteVertexArray(p.vao);
      gl.deleteBuffer(p.positionBuffer);
      gl.deleteBuffer(p.normalBuffer);
      gl.deleteBuffer(p.indexBuffer);
    }
    this.parts = [];
    this.byName.clear();
    if (this.pickFbo) gl.deleteFramebuffer(this.pickFbo);
    if (this.pickTexture) gl.deleteTexture(this.pickTexture);
    if (this.pickDepth) gl.deleteRenderbuffer(this.pickDepth);
    gl.deleteProgram(this.program);
    gl.deleteProgram(this.pickProgram);
  }

  /* ------------------------------------------------------ visual state -- */

  private inGroups(part: ModelPart, groups: PartGroup[] | 'all'): boolean {
    if (groups === 'all') return true;
    return part.groups.some((g) => groups.includes(g));
  }

  private applyVisualState(): void {
    for (const gpu of this.parts) {
      const { part } = gpu;
      let opacity = part.opacity;
      let dim = 0;

      if (this.viewMode) {
        const emphasised = this.inGroups(part, this.viewMode.emphasise);
        const context = this.inGroups(part, this.viewMode.context);
        if (emphasised) {
          opacity = part.opacity;
        } else if (context) {
          opacity = 0.13;
          dim = 1;
        } else {
          opacity = 0;
        }
      }

      if (this.hidden.has(part.name)) opacity = 0;

      if (this.isolated) {
        if (part.name === this.isolated) {
          opacity = 1;
          dim = 0;
        } else if (opacity > 0) {
          opacity = 0.055;
          dim = 1;
        }
      }

      // The selected structure is always fully visible, even if its group is off.
      if (part.name === this.selected && !this.hidden.has(part.name)) {
        opacity = Math.max(opacity, 0.96);
        dim = 0;
      }

      gpu.targetOpacity = opacity;
      gpu.targetDim = dim;
      gpu.targetHighlight =
        part.name === this.selected ? 1 : part.name === this.hovered && opacity > 0.1 ? 0.42 : 0;
    }
    this.needsRender = true;
  }

  /* ---------------------------------------------------------- rendering -- */

  private resize = (): void => {
    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      gl.viewport(0, 0, w, h);
      this.needsRender = true;
    }
  };

  private matrices(): { projection: Mat4; view: Mat4; eye: Vec3 } {
    const aspect = this.canvas.width / Math.max(1, this.canvas.height);
    const projection = perspective((36 * Math.PI) / 180, aspect, 0.05, 60);
    const { azimuth, elevation, radius, target } = this.camera;
    const eye: Vec3 = [
      target[0] + radius * Math.cos(elevation) * Math.sin(azimuth),
      target[1] + radius * Math.sin(elevation),
      target[2] + radius * Math.cos(elevation) * Math.cos(azimuth),
    ];
    return { projection, view: lookAt(eye, target, [0, 1, 0]), eye };
  }

  private ensurePickTarget(): void {
    const gl = this.gl;
    const w = Math.max(1, Math.round(this.canvas.width / 2));
    const h = Math.max(1, Math.round(this.canvas.height / 2));
    if (this.pickFbo && this.pickSize.w === w && this.pickSize.h === h) return;

    if (this.pickFbo) gl.deleteFramebuffer(this.pickFbo);
    if (this.pickTexture) gl.deleteTexture(this.pickTexture);
    if (this.pickDepth) gl.deleteRenderbuffer(this.pickDepth);

    this.pickTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.pickTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.pickDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickDepth);
    // 24-bit depth: at typical camera distances a 16-bit buffer cannot
    // separate a marker lying on a surface from the surface itself, so thin
    // decals lose the depth test and become unpickable.
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);

    this.pickFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickDepth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.pickSize = { w, h };
  }

  /** Renders part ids to an offscreen buffer and reads back the pixel under the cursor. */
  private pick(clientX: number, clientY: number): string | null {
    if (this.disposed) return null;
    const gl = this.gl;
    this.ensurePickTarget();
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.round(((clientX - rect.left) / rect.width) * this.pickSize.w);
    const y = Math.round(((rect.bottom - clientY) / rect.height) * this.pickSize.h);
    if (x < 0 || y < 0 || x >= this.pickSize.w || y >= this.pickSize.h) return null;

    const { projection, view } = this.matrices();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo);
    gl.viewport(0, 0, this.pickSize.w, this.pickSize.h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.useProgram(this.pickProgram);
    gl.uniformMatrix4fv(this.pickUniforms.uProjection!, false, projection);
    gl.uniformMatrix4fv(this.pickUniforms.uView!, false, view);

    for (const p of this.parts) {
      // Only pick what the user can actually see.
      if (p.opacity < 0.12) continue;
      const id = p.pickId;
      gl.uniform3f(
        this.pickUniforms.uPickColor!,
        ((id >> 16) & 255) / 255,
        ((id >> 8) & 255) / 255,
        (id & 255) / 255,
      );
      gl.bindVertexArray(p.vao);
      gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_INT, 0);
    }

    const pixel = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);

    const id = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
    if (!id) return null;
    return this.parts.find((p) => p.pickId === id)?.part.name ?? null;
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);

    // Off screen or in a background tab: keep the loop alive so state is
    // still there on return, but do no camera work and draw nothing.
    if (!this.onScreen || document.hidden) return;

    const ease = this.reducedMotion ? 1 : 0.16;
    let moving = false;

    // Idle auto-rotation, suspended briefly after any interaction.
    if (this.autoRotate && !this.pointer.down && performance.now() - this.lastInteraction > 2200) {
      this.desired.azimuth += this.reducedMotion ? 0 : 0.0016;
      moving = true;
    }

    const c = this.camera;
    const d = this.desired;
    const before = [c.azimuth, c.elevation, c.radius, ...c.target];
    c.azimuth = lerp(c.azimuth, d.azimuth, ease);
    c.elevation = lerp(c.elevation, d.elevation, ease);
    c.radius = lerp(c.radius, d.radius, ease);
    for (let i = 0; i < 3; i++) c.target[i] = lerp(c.target[i], d.target[i], ease);
    const after = [c.azimuth, c.elevation, c.radius, ...c.target];
    if (before.some((v, i) => Math.abs(v - after[i]) > 1e-5)) moving = true;

    const settle = (current: number, target: number, rate: number): number => {
      const next = lerp(current, target, this.reducedMotion ? 1 : rate);
      return Math.abs(next - target) < 0.004 ? target : next;
    };

    for (const p of this.parts) {
      const before = p.opacity + p.dim + p.highlight;
      p.opacity = settle(p.opacity, p.targetOpacity, 0.14);
      p.dim = settle(p.dim, p.targetDim, 0.14);
      p.highlight = settle(p.highlight, p.targetHighlight, 0.2);
      if (Math.abs(before - (p.opacity + p.dim + p.highlight)) > 1e-4) moving = true;
    }

    if (moving || this.needsRender) {
      this.render();
      this.needsRender = false;
    }

    if (this.selected) {
      this.options.onProject?.(this.project(this.selected));
    }
  };

  private render(): void {
    const gl = this.gl;
    const { projection, view, eye } = this.matrices();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uniforms.uProjection!, false, projection);
    gl.uniformMatrix4fv(this.uniforms.uView!, false, view);
    gl.uniform3f(this.uniforms.uCamera!, eye[0], eye[1], eye[2]);

    const visible = this.parts.filter((p) => p.opacity > 0.004);
    const opaque = visible.filter((p) => p.opacity > 0.985);
    const transparent = visible.filter((p) => p.opacity <= 0.985);

    // Opaque pass: depth write on, no blending.
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    for (const p of opaque) this.draw(p);

    // Transparent pass: back-to-front, depth test on but no depth write.
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    const depthOf = (p: GpuPart): number => {
      const c = p.bounds.centre;
      const dx = c[0] - eye[0], dy = c[1] - eye[1], dz = c[2] - eye[2];
      return dx * dx + dy * dy + dz * dz;
    };
    transparent.sort((a, b) => depthOf(b) - depthOf(a) || a.part.order - b.part.order);

    // Draw back faces first so translucent chambers show their far wall.
    for (const p of transparent) {
      gl.cullFace(gl.FRONT);
      this.draw(p);
      gl.cullFace(gl.BACK);
      this.draw(p);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  private draw(p: GpuPart): void {
    const gl = this.gl;
    gl.uniform3f(this.uniforms.uColor!, p.rgb[0], p.rgb[1], p.rgb[2]);
    gl.uniform1f(this.uniforms.uOpacity!, p.opacity);
    gl.uniform1f(this.uniforms.uHighlight!, p.highlight);
    gl.uniform1f(this.uniforms.uDim!, p.dim);
    gl.bindVertexArray(p.vao);
    gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_INT, 0);
  }

  /** Signals that the first frame has been drawn. */
  markReady(): void {
    this.options.onReady?.();
  }
}
