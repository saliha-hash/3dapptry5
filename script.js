import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/*
 * Vernier Caliper Precision Lab
 * The provided GLB remains the instrument model. The UI adds a separate,
 * mathematically consistent 0.05 mm reading calculation and zoom schematic.
 */
const MODEL_URL = "./verniercaliper.glb";
const MM_PER_UNIT = 31.27;
const ZERO_X = -1.1227;
const FACE_X = 0;
const FACE_Z = 0;
const ROOT_Y = 0;
const TRAVEL_UNITS = 3.47;
const MAX_OBJECT_MM = 100;
const LC = 0.05;
const VERNIER_DIVISIONS = 20; // 20 VSD = 19 mm, so LC = 0.05 mm when 1 MSD = 1 mm.
const SCALE_TEX_WIDTH = 2048;
const SCALE_TEX_HEIGHT = 512;
const ZERO_PX = 70;
const RULER_PX_PER_MM = 2.903 * 2;
const LABEL_GAP = 9;
const VERNIER_REGION = { u0: 268 / 1024, u1: 619 / 1024, v0: 250 / 512, v1: 267 / 512 };
const INK_LOW = 185;
const INK_HIGH = 240;
const ATLAS_UPSCALE = 2;
const CROWN_STRENGTH = { cube: 0.35, cuboid: 0.25, cylinder: 0.25, cone: 0.25, slab: 0.12 };
const $ = (id) => document.getElementById(id);
const viewer = $("viewer");
const status = $("status");
const stageStatus = $("stageStatus");
const say = (message, kind = "info") => {
  if (status) {
    status.textContent = message;
    status.dataset.kind = kind;
  }

};
if (!viewer) throw new Error('Missing HTML element: "viewer".');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 1000);
camera.position.set(0, 0, 10);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewer.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xcbd3dc, 0x171b20, 0.72));
const keyLight = new THREE.DirectionalLight(0xe4e9ef, 1.65);
keyLight.position.set(1.5, 3.0, 5.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -5;
keyLight.shadow.camera.right = 5;
keyLight.shadow.camera.top = 4;
keyLight.shadow.camera.bottom = -4;
keyLight.shadow.bias = -0.0003;
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x9ca8b5, 0.32);
fillLight.position.set(-5, -2, 3);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xf0f3f6, 0.68);
rimLight.position.set(0, 1, -4);
scene.add(rimLight);

function makeStudioEnvironment() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(40, 28, 40), new THREE.MeshBasicMaterial({ color: 0x15181c, side: THREE.BackSide })));
  const lamp = (w, h, x, y, z, rx, ry, k, map) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), map, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m);
  };
  const c = document.createElement("canvas"); c.width = 512; c.height = 8;
  const cx = c.getContext("2d"), g = cx.createLinearGradient(0, 0, 512, 0);
  [[0, "#7d848b"], [0.22, "#f4f7fa"], [0.4, "#aab1b8"], [0.62, "#ffffff"], [0.82, "#9097a0"], [1, "#dfe3e7"]].forEach(([o, col]) => g.addColorStop(o, col));
  cx.fillStyle = g; cx.fillRect(0, 0, 512, 8);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  lamp(34, 16, 0, 0, 14, 0, Math.PI, 1.9, tex);
  lamp(36, 3, 0, 11, 4, Math.PI / 2.3, 0, 8);
  lamp(3, 20, -14, 0, 6, 0, Math.PI / 2.4, 5);
  lamp(3, 20, 14, 0, 6, 0, -Math.PI / 2.4, 5);
  return env;
}
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(makeStudioEnvironment(), 0.03).texture;
  scene.environmentIntensity = 1;
  pmrem.dispose();
} catch (error) {
  console.warn("Steel reflections could not be prepared; using direct lighting.", error);
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.085;
controls.rotateSpeed = 0.65;
controls.zoomSpeed = 0.75;
controls.panSpeed = 1;
controls.enableRotate = true;
controls.enableZoom = true;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.zoomToCursor = true;
controls.minDistance = 0.55;
controls.maxDistance = 24;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = Math.PI - 0.05;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
let movedByUser = false;
let homeDistance = 10;
controls.addEventListener("start", () => { movedByUser = true; });
controls.addEventListener("change", updateTouchMode);
function updateTouchMode() {
  const distance = camera.position.distanceTo(controls.target);
  controls.touches.ONE = distance < homeDistance * 0.85 ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
}

const OBJECT_STYLES = {
  sphere:   { color: 0xe24f67, metalness: 0.28, roughness: 0.16, clearcoat: 0.95, clearcoatRoughness: 0.12, envMapIntensity: 1.25 },
  cube:     { color: 0x4c9de8, metalness: 0.28, roughness: 0.26, clearcoat: 0.75, clearcoatRoughness: 0.19, envMapIntensity: 1.0 },
  cylinder: { color: 0x44c49a, metalness: 0.62, roughness: 0.23, clearcoat: 0.55, clearcoatRoughness: 0.2, envMapIntensity: 1.1 },
  cuboid:   { color: 0xe5b34a, metalness: 0.12, roughness: 0.48, clearcoat: 0.18, clearcoatRoughness: 0.34, envMapIntensity: 0.65 },
  cone:     { color: 0xa879ec, metalness: 0.24, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.25, envMapIntensity: 0.9 },
  slab:     { color: 0xc5d2df, metalness: 0.3, roughness: 0.38, clearcoat: 0.3, clearcoatRoughness: 0.3, envMapIntensity: 0.8 },
  wire:     { color: 0xaab9c8, metalness: 0.88, roughness: 0.19, clearcoat: 0.65, clearcoatRoughness: 0.18, envMapIntensity: 1.4 }
};
function createObjectMaterial(shapeName) {
  const style = OBJECT_STYLES[shapeName] || OBJECT_STYLES.cube;
  return new THREE.MeshPhysicalMaterial({ ...style, side: THREE.DoubleSide });
}

let beamTexture = null;
function updateMainScaleOffset() { if (beamTexture) beamTexture.offset.y = -zeroError * 10 / 2090; }
function buildCaliper() {
  const U = 1 / MM_PER_UNIT, PX = 10;
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xdfe3e7, metalness: 1, roughness: 0.27 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x4a4f55, metalness: 1, roughness: 0.32 });
  const tex = (w, h, draw, rep) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  };
  const face = (map, metal, rough) => { const m = new THREE.MeshPhysicalMaterial({ map, color: 0xffffff, metalness: metal, roughness: rough }); return [steel, steel, steel, steel, m, steel]; };
  const box = (x0, x1, y0, y1, z0, z1, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return m; };
  const poly = (pts, mat, d = 3.5) => { const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return new THREE.Mesh(g, mat); };
  const cyl = (r, h, mat, x, y, z, rx, rz) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); return m; };
  const label = (g, text, x, y) => { g.save(); g.translate(x, y); g.rotate(Math.PI / 2); g.fillText(text, 0, 0); g.restore(); };
  // Main scale: mm ticks and numbers on the left edge, inch ticks on the right edge.
  beamTexture = tex(150, 2090, (g, w, h) => {
    g.fillStyle = "#d6dadd"; g.fillRect(0, 0, w, h);
    g.fillStyle = g.strokeStyle = "#101214"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "bold 27px Arial";
    for (let mm = 0; mm <= 150; mm++) {
      const y = (24 + mm) * PX, ten = mm % 10 === 0;
      g.lineWidth = ten ? 3 : 2; g.beginPath(); g.moveTo(0, y); g.lineTo(ten ? 52 : mm % 5 === 0 ? 38 : 25, y); g.stroke();
      if (ten) label(g, String(mm), 76, y);
    }
    for (let i = 0; i * 1.5875 <= 150; i++) {
      const y = (24 + i * 1.5875) * PX;
      g.lineWidth = 2; g.beginPath(); g.moveTo(w, y); g.lineTo(w - (i % 16 === 0 ? 46 : i % 8 === 0 ? 34 : i % 4 === 0 ? 26 : 16), y); g.stroke();
    }
  });
  const vernierTex = tex(90, 580, (g, w, h) => {
    g.fillStyle = "#eceef0"; g.fillRect(0, 0, w, h);
    g.fillStyle = g.strokeStyle = "#101214"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "bold 17px Arial";
    for (let i = 0; i <= VERNIER_DIVISIONS; i++) {
      const y = 1.5 + i * 9.5, major = i % 2 === 0;
      g.lineWidth = 2; g.beginPath(); g.moveTo(w, y); g.lineTo(w - (major ? 34 : 22), y); g.stroke();
      if (major) label(g, String(i / 2), 36, y + (i === 0 ? 8 : 0));
    }
    g.font = "bold 15px Arial"; label(g, "0.05 mm", 40, 330);
  });
  const knurl = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.4, map: tex(64, 64, (g) => {
    g.fillStyle = "#9aa0a6"; g.fillRect(0, 0, 64, 64); g.strokeStyle = "#2a2e32"; g.lineWidth = 3;
    for (let k = -64; k < 128; k += 8) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 64, 64); g.moveTo(k + 64, 0); g.lineTo(k, 64); g.stroke(); }
  }, [3, 1]) });
  const fixed = new THREE.Group(), fp = new THREE.Group();
  fp.rotation.z = Math.PI / 2; fp.scale.setScalar(U); fixed.add(fp);
  fp.add(box(0, 15, -185, 24, -1.75, 1.75, face(beamTexture, 0.85, 0.34)));
  fp.add(poly([[0, 0], [-42, 0], [-42, 11], [-22, 19], [0, 24]], steel));
  fp.add(poly([[15, 24], [15, 10], [38, 10], [38, 14], [28, 24]], steel));
  fp.add(cyl(1.4, 15, steel, 7.5, -192.5, 0, 0, 0));
  [4, 11].forEach((x) => fp.add(cyl(1.6, 0.5, dark, x, -178, 1.8, Math.PI / 2, 0)));
  const slider = new THREE.Group(), sp = new THREE.Group();
  sp.rotation.z = Math.PI / 2; sp.scale.setScalar(U); slider.add(sp);
  sp.add(box(-9, 0, -58, 0, -1.5, 2.1, face(vernierTex, 0.15, 0.5)));
  sp.add(box(15, 23, -58, 0, -1.5, 2.1, dark));
  sp.add(box(-9, 23, -58, 0, -4, -1.5, steel));
  sp.add(poly([[-9, 0], [-42, 0], [-42, -8], [-30, -14], [-9, -20]], steel));
  sp.add(poly([[15, 0], [15, 9], [36, 9], [36, 5], [27, 0]], steel));
  sp.add(cyl(3, 6, knurl, 26, -24, 0.5, 0, Math.PI / 2));
  sp.add(cyl(4, 5, knurl, 25.5, -50, 0.5, 0, Math.PI / 2));
  [fixed, slider].forEach((group) => group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }));
  return { fixed, slider };
}

const SHAPES = {
  sphere: {
    fields: ["Diameter"], defaults: [20],
    geometry: (a) => new THREE.SphereGeometry(a / 2, 64, 40),
    height: (a) => a,
    position: (obj, a) => obj.position.set(FACE_X + a / 2, ROOT_Y - a / 2, FACE_Z),
    rotation: (obj) => obj.rotation.set(0, 0, 0)
  },
  cube: {
    fields: ["Side"], defaults: [20],
    geometry: (a) => crowned(new THREE.BoxGeometry(a, a, a, 12, 12, 12), "cube"),
    height: (a) => a,
    position: (obj, a) => obj.position.set(FACE_X + a / 2, ROOT_Y - a / 2, FACE_Z),
    rotation: (obj) => obj.rotation.set(0, 0, 0)
  },
  cylinder: {
    fields: ["Diameter", "Height"], defaults: [20, 30],
    geometry: (a, b) => crowned(new THREE.CylinderGeometry(a / 2, a / 2, b, 64, 8), "cylinder"),
    height: (a, b) => b,
    position: (obj, a, b) => obj.position.set(FACE_X + a / 2, ROOT_Y - b / 2, FACE_Z),
    rotation: (obj) => obj.rotation.set(0, 0, 0)
  },
  cuboid: {
    fields: ["Length", "Width", "Height"], defaults: [30, 18, 12],
    geometry: (a, b, c) => crowned(new THREE.BoxGeometry(a, c, b, 12, 12, 12), "cuboid"),
    height: (a, b, c) => c,
    position: (obj, a, b, c) => obj.position.set(FACE_X + a / 2, ROOT_Y - c / 2, FACE_Z),
    rotation: (obj) => obj.rotation.set(0, 0, 0)
  },
  cone: {
    fields: ["Base diameter", "Height"], defaults: [20, 30],
    geometry: (a, b) => crowned(new THREE.ConeGeometry(a / 2, b, 64, 8), "cone"),
    height: (a, b) => b,
    position: (obj, a, b) => obj.position.set(FACE_X + a / 2, ROOT_Y - b / 2, FACE_Z),
    rotation: (obj) => obj.rotation.set(0, 0, Math.PI)
  },
  slab: {
    fields: ["Length", "Width", "Thickness"], defaults: [30, 20, 6],
    geometry: (a, b, c) => crowned(new THREE.BoxGeometry(a, c, b, 12, 12, 12), "slab"),
    height: (a, b, c) => c,
    position: (obj, a, b, c) => obj.position.set(FACE_X + a / 2, ROOT_Y - c / 2, FACE_Z),
    rotation: (obj) => obj.rotation.set(0, 0, 0)
  },
  wire: {
    fields: ["Diameter", "Length"], defaults: [2, 40],
    // Cylinder axis is rotated toward the depth axis so jaws measure its diameter.
    geometry: (a, b) => new THREE.CylinderGeometry(a / 2, a / 2, b, 48, 4),
    height: (a, b) => a,
    position: (obj, a, b) => obj.position.set(FACE_X + a / 2, ROOT_Y - a / 2, FACE_Z),
    rotation: (obj) => obj.rotation.set(Math.PI / 2, 0, 0)
  }
};
function crowned(geometry, shapeName) {
  const strength = CROWN_STRENGTH[shapeName] || 0;
  if (strength <= 0) return geometry;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const center = box.getCenter(new THREE.Vector3());
  const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i).sub(center);
    p.set(p.x / (half.x || 1), p.y / (half.y || 1), p.z / (half.z || 1));
    n.fromBufferAttribute(normal, i);
    p.addScaledVector(n, -p.dot(n));
    n.addScaledVector(p, strength).normalize();
    normal.setXYZ(i, n.x, n.y, n.z);
  }
  normal.needsUpdate = true;
  return geometry;
}

let rig = null;
let holder = null;
let slider = null;
let ready = false;
let modelWidth = 6;
let modelHeight = 2.5;
let selectedShape = null;
let measuredObject = null;
let zeroError = 0;
let pendingZeroError = 0;
let flight = null;

function cameraDistance(span) { return span / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); }
function moveCamera(position, target, instant = false) {
  if (instant) {
    camera.position.copy(position);
    controls.target.copy(target);
    controls.update();
    flight = null;
    return;
  }
  flight = { started: performance.now(), fromPosition: camera.position.clone(), fromTarget: controls.target.clone(), toPosition: position.clone(), toTarget: target.clone() };
}
function fullView(instant = false) {
  const aspect = Math.max(camera.aspect, 0.1);
  const span = Math.max(modelWidth / aspect, modelHeight) * 1.02;
  const z = cameraDistance(span) + 0.35;
  homeDistance = z;
  moveCamera(new THREE.Vector3(0, 0, z), new THREE.Vector3(0, 0, 0), instant);
}
function jawsView() {
  if (!ready || !slider) return;
  const opening = slider.position.x;
  const target = holder.localToWorld(new THREE.Vector3(opening / 2, -0.55, 0));
  target.z = 0;
  const span = Math.max(opening + 2.2, 2.6 / Math.max(camera.aspect, 0.1));
  const z = THREE.MathUtils.clamp(cameraDistance(span), 0.9, homeDistance * 0.8);
  moveCamera(new THREE.Vector3(target.x, target.y, z), target);
  if (!$("scaleInset").hidden) drawScaleInset();
}

function zoomCamera(factor) {
  if (!ready) return;
  const target = flight ? flight.toTarget.clone() : controls.target.clone();
  const offset = (flight ? flight.toPosition.clone() : camera.position.clone()).sub(target);
  offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
  moveCamera(target.clone().add(offset), target);
}

function readDimensions() {
  if (!selectedShape) return null;
  const definition = SHAPES[selectedShape];
  const dimensions = definition.fields.map((_, index) => Number.parseFloat($("dim" + "ABC"[index]).value));
  if (dimensions.some((value) => !Number.isFinite(value) || value < 1 || value > MAX_OBJECT_MM)) {
    say(`Enter every dimension between 1 and ${MAX_OBJECT_MM} mm.`, "error");
    return null;
  }
  if (selectedShape === "wire" && dimensions[0] < 1) {
    say("Wire diameter must be at least 1 mm in this model.", "error");
    return null;
  }
  const maxOpening = Math.min(MAX_OBJECT_MM, TRAVEL_UNITS * MM_PER_UNIT);
  if (dimensions[0] > maxOpening) {
    say(`The current 3D jaw travel is about ${maxOpening.toFixed(1)} mm. Reduce the first dimension.`, "error");
    return null;
  }
  return dimensions;
}
function mmText(value, digits = 2) {
  const safe = Math.abs(value) < 0.0000001 ? 0 : value;
  return `${safe.toFixed(digits)} mm`;
}
function refreshReading(trueDimension = null) {
  const dimension = trueDimension ?? getCurrentFirstDimension();
  const rawIdeal = Math.max(0, dimension);
  // A positive zero error makes the observed reading larger; correction is
  // always observed reading minus zero error.
  const rawObserved = rawIdeal + zeroError;
  const observed = Math.round((rawObserved + 1e-8) / LC) * LC;
  let msr = Math.floor(observed + 1e-8);
  let vc = Math.round((observed - msr) / LC);
  if (vc >= VERNIER_DIVISIONS) { msr += 1; vc = 0; }
  if (vc < 0) vc = 0;
  const vernierContribution = vc * LC;
  const normalizedObserved = msr + vernierContribution;
  const finalReading = normalizedObserved - zeroError;
  $("msrValue").textContent = `${msr} mm`;
  $("vcValue").textContent = String(vc);
  $("vernierContribution").textContent = mmText(vernierContribution);
  $("observedValue").textContent = mmText(normalizedObserved);
  $("zeroErrorCalc").textContent = `${zeroError >= 0 ? "+" : "−"}${Math.abs(zeroError).toFixed(2)} mm`;
  $("zeroCorrection").textContent = `${-zeroError >= 0 ? "+" : "−"}${Math.abs(-zeroError).toFixed(2)} mm`;
  $("finalReading").textContent = mmText(finalReading);
  $("zeroValue").textContent = mmText(zeroError);
  $("roundingNote").textContent = selectedShape
    ? `Observed reading − zero error = corrected reading. Object size ${mmText(dimension)}; least count ${LC.toFixed(2)} mm.`
    : `No object selected. Move the jaws or choose an object to practise a reading.`;
  if (selectedShape) $("measurementAnswer").textContent = mmText(finalReading);
  drawScaleInset({ msr, vc, observed: normalizedObserved });
}
function getCurrentFirstDimension() {
  if (selectedShape) {
    const parsed = Number.parseFloat($("dimA").value);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return slider ? slider.position.x * MM_PER_UNIT : 0;
}
function applyDimensions() {
  if (!measuredObject || !selectedShape || !slider || !rig) return;
  const dimensions = readDimensions();
  if (!dimensions) return;
  const definition = SHAPES[selectedShape];
  const units = dimensions.map((value) => value / MM_PER_UNIT);
  const nextGeometry = definition.geometry(...units);
  measuredObject.geometry.dispose();
  measuredObject.geometry = nextGeometry;
  measuredObject.castShadow = true;
  measuredObject.receiveShadow = true;
  slider.position.x = units[0];
  definition.position(measuredObject, ...units);
  definition.rotation(measuredObject);
  $("jawSlider").value = String(dimensions[0]);
  $("jawSlider").disabled = true;
  $("jawValue").textContent = mmText(dimensions[0]);
  $("objectDimensionsSummary").textContent = definition.fields.map((name, index) => `${name}: ${Number(dimensions[index].toFixed(3))} mm`).join(" · ");
  $("removeButton").disabled = false;
  refreshReading(dimensions[0]);
  say(`Object held between the jaws. First dimension: ${mmText(dimensions[0])}.`);
}
function selectShape(name) {
  if (!ready || !rig || !slider) { say("Wait for the 3D model to finish loading."); return; }
  if (!SHAPES[name]) return;
  selectedShape = name;
  const definition = SHAPES[name];
  ["dimA", "dimB", "dimC"].forEach((id, index) => {
    const wrapper = $("field" + "ABC"[index]);
    const visible = index < definition.fields.length;
    wrapper.hidden = !visible;
    if (visible) {
      $("label" + "ABC"[index]).textContent = `${definition.fields[index]} (mm)`;
      $(id).value = definition.defaults[index] ?? 20;
    }
  });
  if (!measuredObject) {
    measuredObject = new THREE.Mesh(new THREE.BufferGeometry(), createObjectMaterial(name));
    measuredObject.name = "Measured object";
    rig.add(measuredObject);
  } else {
    measuredObject.material.dispose();
    measuredObject.material = createObjectMaterial(name);
  }
  document.querySelectorAll("[data-shape]").forEach((button) => button.classList.toggle("active", button.dataset.shape === name));
  $("objectPanel").hidden = false;
  $("jawSlider").disabled = true;
  applyDimensions();
}
function removeObject({ closeJaws = false } = {}) {
  if (!measuredObject) return;
  const preservedOpeningMM = closeJaws ? 0 : Math.max(0, Math.min(MAX_OBJECT_MM, slider.position.x * MM_PER_UNIT));
  rig.remove(measuredObject);
  measuredObject.geometry.dispose();
  measuredObject.material.dispose();
  measuredObject = null;
  selectedShape = null;
  document.querySelectorAll("[data-shape]").forEach((button) => button.classList.remove("active"));
  $("objectPanel").hidden = true;
  $("removeButton").disabled = true;
  $("jawSlider").disabled = false;
  slider.position.x = preservedOpeningMM / MM_PER_UNIT;
  $("jawSlider").value = String(preservedOpeningMM);
  $("jawValue").textContent = mmText(preservedOpeningMM);
  refreshReading(preservedOpeningMM);
  say(closeJaws ? "Object removed and jaws closed." : "Object removed. The opening is preserved in manual mode.");
}

// Draw the scale's arithmetic in a crisp, responsive inset (not on the GLB texture).
function drawScaleInset(override = null) {
  const canvas = $("scaleCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dimension = getCurrentFirstDimension();
  const raw = dimension + zeroError;
  const observed = Math.round((raw + 1e-8) / LC) * LC;
  let msr = Math.floor(observed + 1e-8);
  let vc = Math.round((observed - msr) / LC);
  if (vc >= VERNIER_DIVISIONS) { msr += 1; vc = 0; }
  if (override) { msr = override.msr; vc = override.vc; }
  const reading = msr + vc * LC;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#edf1f5";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#19222c";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "left";
  ctx.fillText("MAIN SCALE  ·  1 mm per division", 24, 28);
  const x0 = 26, x1 = w - 26, visibleMM = 22;
  const pxPerMM = (x1 - x0) / visibleMM;
  // Keep the Vernier zero close to the left of the window; the 20th mark
  // spans 19 mm, so the matching division remains visible at all readings.
  const startMM = Math.max(0, Math.floor(reading) - 1);
  const mainY = 101, vernierY = 211;
  ctx.strokeStyle = "#273340";
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(0, mainY); ctx.lineTo(w, mainY); ctx.stroke();
  for (let mm = startMM; mm <= startMM + visibleMM; mm++) {
    const x = x0 + (mm - startMM) * pxPerMM;
    ctx.strokeStyle = "#252e38";
    ctx.lineWidth = mm % 5 === 0 ? 2.4 : 1.35;
    ctx.beginPath(); ctx.moveTo(x, mainY - (mm % 5 === 0 ? 35 : 23)); ctx.lineTo(x, mainY); ctx.stroke();
    if (mm % 5 === 0) {
      ctx.fillStyle = "#202b36"; ctx.font = "bold 15px Arial"; ctx.textAlign = "center";
      ctx.fillText(String(mm), x, mainY - 42);
    }
  }
  ctx.fillStyle = "#d5e3ef";
  ctx.fillRect(0, 126, w, 102);
  ctx.fillStyle = "#233445";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "left";
  ctx.fillText("VERNIER · 20 divisions = 19 mm", 24, 151);
  ctx.strokeStyle = "#4b5e70"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, vernierY); ctx.lineTo(w, vernierY); ctx.stroke();
  const vernierZeroX = x0 + (reading - startMM) * pxPerMM;
  for (let i = 0; i <= VERNIER_DIVISIONS; i++) {
    const x = vernierZeroX + i * (1 - LC) * pxPerMM;
    if (x < -5 || x > w + 5) continue;
    const coincides = i === vc;
    ctx.strokeStyle = coincides ? "#d62f40" : "#263545";
    ctx.lineWidth = coincides ? 4 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, vernierY - (coincides ? 52 : (i % 5 === 0 ? 33 : 23)));
    ctx.lineTo(x, vernierY);
    ctx.stroke();
    if (i % 5 === 0 && x > 8 && x < w - 8) {
      ctx.fillStyle = "#243544"; ctx.font = "14px Arial"; ctx.textAlign = "center";
      ctx.fillText(String(i), x, vernierY + 24);
    }
    if (coincides) {
      ctx.fillStyle = "#d62f40";
      ctx.beginPath(); ctx.arc(x, vernierY - 60, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#a31e2c"; ctx.font = "bold 15px Arial";
      ctx.textAlign = x > w * .78 ? "right" : "left";
      // The coinciding mark is highlighted without an extra floating label.
    }
  }
  ctx.fillStyle = "#3a4a59"; ctx.font = "14px Arial"; ctx.textAlign = "left";
  ctx.fillText(`LC = 0.05 mm  ·  MSR = ${msr} mm  ·  VC = ${vc}`, 24, h - 14);
}

$("fitButton").addEventListener("click", () => { if (ready) fullView(); });
$("jawsButton").addEventListener("click", jawsView);
$("zoomInButton")?.addEventListener("click", () => zoomCamera(0.5));
$("zoomOutButton")?.addEventListener("click", () => zoomCamera(2));
$("scaleButton")?.addEventListener("click", () => {
  const inset = $("scaleInset");
  inset.hidden = !inset.hidden;
  if (!inset.hidden) drawScaleInset();
});
$("closeInsetButton").addEventListener("click", () => { $("scaleInset").hidden = true; });
const fullscreenButton = $("fullscreenButton");
if (fullscreenButton) fullscreenButton.addEventListener("click", async () => {
  const stage = document.querySelector(".stage");
  try {
    if (!document.fullscreenElement) await stage.requestFullscreen?.();
    else await document.exitFullscreen?.();
  } catch (error) { say("Fullscreen is not available in this browser."); }
});
$("jawSlider").addEventListener("input", () => {
  if (!ready || !slider || measuredObject) return;
  const openingMM = Number($("jawSlider").value);
  slider.position.x = openingMM / MM_PER_UNIT;
  $("jawValue").textContent = mmText(openingMM);
  refreshReading(openingMM);
});
$("closeJawsButton").addEventListener("click", () => {
  if (measuredObject) removeObject({ closeJaws: true });
  if (!slider) return;
  $("jawSlider").value = "0";
  slider.position.x = 0;
  $("jawValue").textContent = "0.00 mm";
  refreshReading(0);
  say("Jaws closed.");
});
$("shapeButtons").querySelectorAll("[data-shape]").forEach((button) => button.addEventListener("click", () => selectShape(button.dataset.shape)));
["dimA", "dimB", "dimC"].forEach((id) => $(id).addEventListener("input", applyDimensions));
$("removeButton").addEventListener("click", removeObject);
$("zeroSlider").addEventListener("input", () => {
  pendingZeroError = Number($("zeroSlider").value);
  $("zeroValue").textContent = mmText(pendingZeroError);
  $("zeroApplyStatus").textContent = `Pending: ${pendingZeroError >= 0 ? "+" : "−"}${Math.abs(pendingZeroError).toFixed(2)} mm. Tap Apply Zero Error to use it in the reading.`;
  $("applyZeroButton").classList.add("primary");
});
$("applyZeroButton").addEventListener("click", () => {
  // Commit the selected zero error, then recalculate the observed and corrected readings.
  zeroError = pendingZeroError;
  updateMainScaleOffset();
  refreshReading();
  $("zeroApplyStatus").textContent = `Applied: ${zeroError >= 0 ? "+" : "−"}${Math.abs(zeroError).toFixed(2)} mm. The main scale has moved against the vernier zero, and every reading now includes it.`;
  say(`Zero error applied: ${zeroError >= 0 ? "+" : "−"}${Math.abs(zeroError).toFixed(2)} mm.`);
});
$("zeroResetButton").addEventListener("click", () => {
  zeroError = 0;
  pendingZeroError = 0;
  updateMainScaleOffset();
  $("zeroSlider").value = "0";
  $("zeroValue").textContent = "0.00 mm";
  refreshReading();
  $("zeroApplyStatus").textContent = "Zero error reset and applied: 0.00 mm.";
  say("Zero error reset to 0.00 mm.");
});

function resizeViewer() {
  const width = viewer.clientWidth;
  const height = viewer.clientHeight;
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  if (ready && !movedByUser) fullView(true);
  if (!$("scaleInset").hidden) drawScaleInset();
}
new ResizeObserver(resizeViewer).observe(viewer);
resizeViewer();

function setup() {
  holder = new THREE.Group();
  holder.rotation.z = -Math.PI / 2;
  rig = new THREE.Group();
  holder.add(rig);
  scene.add(holder);
  const built = buildCaliper();
  slider = built.slider;
  rig.add(built.fixed, slider);
  holder.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(holder);
  const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  modelWidth = size.x; modelHeight = size.y;
  holder.position.copy(center).negate();
  holder.updateMatrixWorld(true);
  ready = true;
  fullView(true);
  selectedShape = null; measuredObject = null;
  $("objectPanel").hidden = true;
  document.querySelectorAll("[data-shape]").forEach((button) => button.classList.remove("active"));
  $("jawSlider").disabled = false; $("jawSlider").value = "0";
  slider.position.x = 0; $("jawValue").textContent = "0.00 mm";
  refreshReading(0);
  say("Caliper ready. Drag to rotate; pinch to zoom. Use the jaw and object controls to explore measurements.");
}
try { setup(); } catch (error) { console.error(error); say(`Model setup problem: ${error.message || "Unknown error."}`, "error"); }

function animate(now) {
  requestAnimationFrame(animate);
  if (flight) {
    const progress = Math.min(1, (now - flight.started) / 520);
    const eased = progress * progress * (3 - 2 * progress);
    camera.position.lerpVectors(flight.fromPosition, flight.toPosition, eased);
    controls.target.lerpVectors(flight.fromTarget, flight.toTarget, eased);
    if (progress >= 1) flight = null;
  }
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
