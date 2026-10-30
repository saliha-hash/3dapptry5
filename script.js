import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/*
 * Vernier Caliper Precision Lab
 * The provided GLB remains the instrument model. The UI adds a separate,
 * mathematically consistent 0.05 mm reading calculation and zoom schematic.
 */
const MODEL_URL = "./verniercaliper.glb";
const MM_PER_UNIT = 31.27;
const ZERO_X = -1.1227;
const FACE_X = -1.521;
const FACE_Z = 0.366;
const ROOT_Y = -0.17;
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
const ZERO_SLIDER_MAX = 2; // slider range: -2 mm to +2 mm
const ZERO_INPUT_MAX = 5; // typed range: -5 mm to +5 mm
const CLOSE_JAWS_ON_REMOVE = true; // set to false to keep the jaws open after removing an object
const STEEL_UV = { u: 135 / 1024, v: 183 / 512, du: 6 / 1024, dv: 4 / 512 }; // plain steel patch of the model texture
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
renderer.toneMappingExposure = 0.78;
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

let envTarget = null;
function buildEnvironment() {
  // The steel look comes from this reflection map. It is rendered on the GPU, so it is
  // lost whenever the browser frees graphics memory (tab in background, phone locked, etc.).
  // That is what turned the caliper black: it is rebuilt again by refreshGraphics().
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    const previous = envTarget;
    envTarget = target;
    scene.environment = target.texture;
    pmrem.dispose();
    room.dispose?.();
    if (previous) previous.dispose();
  } catch (error) {
    console.warn("Environment reflections could not be prepared; using direct lighting.", error);
  }
}
buildEnvironment();

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

function makeMainScaleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = SCALE_TEX_WIDTH;
  canvas.height = SCALE_TEX_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create the main-scale texture.");
  const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
  background.addColorStop(0, "#747b83");
  background.addColorStop(0.18, "#a9b0b8");
  background.addColorStop(0.5, "#858d95");
  background.addColorStop(0.78, "#b0b7bf");
  background.addColorStop(1, "#777f87");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // The model maps this texture vertically flipped; keep the established orientation.
  const bands = [
    { top: 52, bottom: 194, tickTop: 59, short: 27, mid: 47, long: 69, font: 25 },
    { top: 220, bottom: 328, tickTop: 227, short: 22, mid: 39, long: 57, font: 23 },
    { top: 360, bottom: 462, tickTop: 370, short: 18, mid: 30, long: 42, font: 23 }
  ];
  const maxMM = Math.floor((SCALE_TEX_WIDTH - ZERO_PX - 35) / RULER_PX_PER_MM);
  bands.forEach((band) => {
    const strip = ctx.createLinearGradient(0, band.top, 0, band.bottom);
    strip.addColorStop(0, "#aeb5bc");
    strip.addColorStop(0.48, "#858d95");
    strip.addColorStop(1, "#b3bac1");
    ctx.fillStyle = strip;
    ctx.fillRect(0, band.top, canvas.width, band.bottom - band.top);
    for (let mm = 0; mm <= maxMM; mm++) {
      const x = ZERO_PX + mm * RULER_PX_PER_MM;
      if (x >= canvas.width - 2) break;
      const isTen = mm % 10 === 0;
      const isFive = mm % 5 === 0;
      const tickLength = isTen ? band.long : isFive ? band.mid : band.short;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, band.tickTop);
      ctx.lineTo(Math.round(x) + 0.5, band.tickTop + tickLength);
      ctx.strokeStyle = "#080a0d";
      ctx.lineWidth = isTen ? 3.5 : isFive ? 2.8 : 2.2;
      ctx.stroke();
    }
    ctx.fillStyle = "#080a0d";
    ctx.font = `900 ${band.font}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const labelY = band.tickTop + band.long + LABEL_GAP;
    for (let mm = 0; mm <= maxMM; mm += 10) {
      const x = ZERO_PX + mm * RULER_PX_PER_MM;
      if (x >= canvas.width - 2) break;
      ctx.save();
      ctx.translate(x, labelY);
      ctx.scale(1, -1);
      ctx.fillText(String(mm), 0, 0);
      ctx.restore();
    }
    ctx.strokeStyle = "#626970";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, band.top, canvas.width, band.bottom - band.top);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}
function getMaterials(mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}
function assignCleanMainScale(mesh, scaleTexture) {
  const materials = getMaterials(mesh).map((original) => {
    const material = original.clone();
    material.map = scaleTexture;
    material.color.set(0xffffff);
    material.metalness = 0.72;
    material.roughness = 0.32;
    material.envMapIntensity = 1.05;
    material.needsUpdate = true;
    return material;
  });
  mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
}
function polishModelMaterials(model, ruler) {
  model.traverse((object) => {
    if (!object.isMesh || object === ruler) return;
    const name = String(object.name || "").toLowerCase();
    const isScalePart = name.includes("vernier") || name.includes("scale") || name.includes("graduation");
    const materials = getMaterials(object).map((original) => {
      const material = original.clone();
      material.color.copy(original.color);
      // Keep the supplied textures and markings, but shade the body like brushed steel.
      material.metalness = isScalePart ? 0.72 : 0.92;
      material.roughness = isScalePart ? 0.34 : 0.29;
      material.envMapIntensity = isScalePart ? 0.95 : 1.05;
      if (!isScalePart) material.color.setRGB(0.43, 0.46, 0.50);
      else material.color.multiplyScalar(0.88);
      material.needsUpdate = true;
      return material;
    });
    object.material = Array.isArray(object.material) ? materials : materials[0];
    object.castShadow = true;
    object.receiveShadow = true;
  });
}
function loadImageFromBuffer(buffer, mimeType) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([buffer], { type: mimeType || "image/jpeg" }));
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not decode the model texture.")); };
    image.src = url;
  });
}
async function darkenVernierScale(gltf) {
  const json = gltf.parser.json;
  const metalMaterial = (json.materials || []).find((material) => material.name === "metallic");
  const textureIndex = metalMaterial?.pbrMetallicRoughness?.baseColorTexture?.index;
  if (textureIndex === undefined) throw new Error('Material "metallic" has no embedded texture.');
  const imageDefinition = json.images[json.textures[textureIndex].source];
  if (!imageDefinition || imageDefinition.bufferView === undefined) throw new Error("The metal texture is not embedded in the model.");
  const buffer = await gltf.parser.getDependency("bufferView", imageDefinition.bufferView);
  const image = await loadImageFromBuffer(buffer, imageDefinition.mimeType);
  const width = image.naturalWidth * ATLAS_UPSCALE;
  const height = image.naturalHeight * ATLAS_UPSCALE;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create the Vernier texture.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);
  const x0 = Math.round(VERNIER_REGION.u0 * width);
  const x1 = Math.round(VERNIER_REGION.u1 * width);
  const y0 = Math.round(VERNIER_REGION.v0 * height);
  const y1 = Math.round(VERNIER_REGION.v1 * height);
  const pixels = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    let t = (luminance - INK_LOW) / (INK_HIGH - INK_LOW);
    t = Math.min(1, Math.max(0, t));
    t = t * t * (3 - 2 * t);
    const value = Math.round(t * 255);
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  ctx.putImageData(pixels, x0, y0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  rig.traverse((object) => {
    if (!object.isMesh || object.name === "Object_4") return;
    getMaterials(object).forEach((material) => {
      if (material.map) { material.map = texture; material.needsUpdate = true; }
    });
  });
}
let rulerMesh = null;
let rulerMM = null;
function calibrateMainScale(mesh, zeroOffsetMM = 0) {
  const positions = mesh.geometry.attributes.position;
  const uvs = mesh.geometry.attributes.uv;
  if (!positions || !uvs) throw new Error("Main ruler is missing position/UV data.");
  if (!rulerMM || rulerMM.length !== positions.count) {
    mesh.updateWorldMatrix(true, false);
    const worldPosition = new THREE.Vector3();
    rulerMM = new Float32Array(positions.count);
    for (let i = 0; i < positions.count; i++) {
      worldPosition.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
      rulerMM[i] = (worldPosition.x - ZERO_X) * MM_PER_UNIT;
    }
  }
  rulerMesh = mesh;
  // A zero error means the main-scale zero does not sit under the vernier zero when the jaws
  // are closed. Shifting the graduations shows exactly that, while the jaws stay on the object.
  for (let i = 0; i < positions.count; i++) {
    const textureX = ZERO_PX + RULER_PX_PER_MM * (rulerMM[i] + zeroOffsetMM);
    uvs.setX(i, textureX / SCALE_TEX_WIDTH);
  }
  uvs.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
}
function setMainScaleZeroError(valueMM) {
  if (rulerMesh) calibrateMainScale(rulerMesh, valueMM);
}
function trimExtraScaleParts(model, ruler) {
  // The GLB is built from flat photo-textured plates. Three of them leave extra, unwanted
  // markings around the real (generated) main scale. They are removed here.
  model.updateMatrixWorld(true);
  const rulerBox = new THREE.Box3().setFromObject(ruler);
  const topY = rulerBox.max.y;
  const bottomY = rulerBox.min.y;
  const v = new THREE.Vector3();
  // 1) Two thin photo strips run along the whole top and bottom edge of the ruler: the black line
  //    and the second row of tick marks. Collapse them to zero height so they disappear.
  const beam = model.getObjectByName("Object_6");
  if (beam && beam.isMesh) {
    beam.updateWorldMatrix(true, false);
    const inverse = beam.matrixWorld.clone().invert();
    const pos = beam.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(beam.matrixWorld);
      if (v.z < 0.34 || v.x < -1.56) continue;
      let moved = false;
      if (v.y > topY - 0.001 && v.y < topY + 0.045) { v.y = topY - 0.0006; moved = true; }
      else if (v.y < bottomY + 0.001 && v.y > bottomY - 0.025) { v.y = bottomY + 0.0006; moved = true; }
      if (moved) { v.applyMatrix4(inverse); pos.setXYZ(i, v.x, v.y, v.z); }
    }
    pos.needsUpdate = true;
    beam.geometry.computeBoundingBox();
    beam.geometry.computeBoundingSphere();
  }
  // 2) The sliding part carries a dark photo bar with an extra inch scale above the main scale.
  //    Its triangles are removed. The plain steel housing behind it keeps a clean steel colour.
  const carriage = model.getObjectByName("Object_8");
  if (carriage && carriage.isMesh && carriage.geometry.index) {
    carriage.updateWorldMatrix(true, false);
    const geometry = carriage.geometry;
    const index = geometry.index;
    const pos = geometry.attributes.position;
    const nor = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    const world = (vertex) => v.fromBufferAttribute(pos, vertex).applyMatrix4(carriage.matrixWorld);
    const kept = [];
    const housing = [];
    for (let i = 0; i < index.count; i += 3) {
      const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      let bar = true;
      let box = true;
      for (const vertex of tri) {
        world(vertex);
        if (!(v.z > 0.43 && v.y > topY - 0.07)) bar = false;
        if (!(v.x > -1.46 && v.x < 0.43 && v.y > 0.40 && v.y < 0.64 && v.z > 0.29 && v.z < 0.39)) box = false;
      }
      if (bar) continue;
      (box ? housing : kept).push(tri);
    }
    const count = pos.count;
    const extraPos = [];
    const extraNor = [];
    const extraUv = [];
    const remap = new Map();
    const finalIndex = [];
    kept.forEach((tri) => finalIndex.push(tri[0], tri[1], tri[2]));
    housing.forEach((tri) => {
      tri.forEach((vertex) => {
        let mapped = remap.get(vertex);
        if (mapped === undefined) {
          mapped = count + extraPos.length / 3;
          remap.set(vertex, mapped);
          world(vertex);
          extraPos.push(pos.getX(vertex), pos.getY(vertex), pos.getZ(vertex));
          extraNor.push(nor.getX(vertex), nor.getY(vertex), nor.getZ(vertex));
          extraUv.push(
            STEEL_UV.u + THREE.MathUtils.clamp((v.x + 1.443) / 1.86, 0, 1) * STEEL_UV.du,
            STEEL_UV.v + THREE.MathUtils.clamp((v.y - 0.405) / 0.227, 0, 1) * STEEL_UV.dv
          );
        }
        finalIndex.push(mapped);
      });
    });
    const join = (attribute, extra, size) => {
      const merged = new Float32Array(attribute.count * size + extra.length);
      merged.set(attribute.array, 0);
      merged.set(extra, attribute.count * size);
      return new THREE.BufferAttribute(merged, size);
    };
    geometry.setAttribute("position", join(pos, extraPos, 3));
    geometry.setAttribute("normal", join(nor, extraNor, 3));
    geometry.setAttribute("uv", join(uv, extraUv, 2));
    geometry.setIndex(finalIndex);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
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
  if (!ready || !rig || !slider) return;
  // Frame the jaws at the left end of the instrument, not the centre of the ruler.
  const target = new THREE.Vector3(-modelWidth * 0.34, -modelHeight * 0.08, 0);
  const z = Math.max(cameraDistance(Math.max(modelWidth * 0.40 / Math.max(camera.aspect, 0.65), modelHeight * 0.72)) + 0.2, homeDistance * 0.48);
  moveCamera(new THREE.Vector3(target.x, target.y, z), target);
  if (!$('scaleInset').hidden) drawScaleInset();
}
function zoomCamera(factor) {
  if (!ready) return;
  const offset = camera.position.clone().sub(controls.target);
  const nextLength = THREE.MathUtils.clamp(offset.length() * factor, Math.max(0.32, homeDistance * 0.18), Math.min(32, homeDistance * 2.8));
  offset.setLength(nextLength);
  moveCamera(controls.target.clone().add(offset), controls.target.clone());
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
function physicalSliderPosition(openingMM) {
  // The jaws always sit exactly on the object. The zero error is shown by shifting the
  // main-scale graduations against the vernier zero (see setMainScaleZeroError).
  return openingMM / MM_PER_UNIT;
}
function refreshPhysicalPosition(openingMM = null) {
  if (!slider) return;
  const nominal = openingMM ?? (selectedShape ? getCurrentFirstDimension() : Number($("jawSlider").value));
  slider.position.x = physicalSliderPosition(nominal);
}
function decomposeReading(raw) {
  // Splits a reading into main-scale mm + coinciding vernier division. A negative value
  // (closed jaws with a negative zero error) is written the usual way, e.g. -0.30 = -1 mm + 14 x 0.05 mm.
  const rounded = Math.round((raw + 1e-8) / LC) * LC;
  let msr = Math.floor(rounded + 1e-8);
  let vc = Math.round((rounded - msr) / LC);
  if (vc >= VERNIER_DIVISIONS) { msr += 1; vc = 0; }
  if (vc < 0) vc = 0;
  return { msr, vc, observed: msr + vc * LC };
}
function refreshReading(trueDimension = null) {
  const dimension = trueDimension ?? getCurrentFirstDimension();
  const rawIdeal = Math.max(0, dimension);
  const rawObserved = rawIdeal + zeroError;
  const { msr, vc, observed: normalizedObserved } = decomposeReading(rawObserved);
  const vernierContribution = vc * LC;
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
  return slider ? Math.max(0, slider.position.x * MM_PER_UNIT) : 0;
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
  jawTween = null;
  slider.position.x = units[0];
  definition.position(measuredObject, ...units);
  definition.rotation(measuredObject);
  $("jawSlider").value = String(dimensions[0]);
  $("jawSlider").disabled = true;
  $("jawValue").textContent = mmText(dimensions[0]);
  $("objectDimensionsSummary").textContent = definition.fields.map((name, index) => `${name}: ${Number(dimensions[index].toFixed(3))} mm`).join(" · ");
  $("removeButton").disabled = false;
  if ($("removeObjectButton")) $("removeObjectButton").disabled = false;
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
  showObjectPanel(true);
  $("jawSlider").disabled = true;
  applyDimensions();
}
let jawTween = null;
function setJawOpening(openingMM) {
  slider.position.x = physicalSliderPosition(openingMM);
  $("jawSlider").value = String(openingMM);
  $("jawValue").textContent = mmText(openingMM);
}
function animateJaws(fromMM, toMM, duration = 420) {
  if (!slider) return;
  if (Math.abs(fromMM - toMM) < 0.01) { jawTween = null; setJawOpening(toMM); return; }
  jawTween = { from: fromMM, to: toMM, started: performance.now(), duration };
}
function stepJawTween(now) {
  if (!jawTween || !slider) return;
  const progress = Math.min(1, (now - jawTween.started) / jawTween.duration);
  const eased = progress * progress * (3 - 2 * progress);
  setJawOpening(jawTween.from + (jawTween.to - jawTween.from) * eased);
  if (progress >= 1) { const target = jawTween.to; jawTween = null; setJawOpening(target); }
}
function showObjectPanel(hasObject) {
  // The Object Dimensions section is never empty: it shows a hint until an object is chosen.
  const fields = $("objectFields");
  const hint = $("objectHint");
  if (fields) fields.hidden = !hasObject;
  if (hint) hint.hidden = hasObject;
}
function removeObject({ closeJaws = CLOSE_JAWS_ON_REMOVE } = {}) {
  if (!measuredObject) return;
  const openingNow = Math.max(0, Math.min(MAX_OBJECT_MM, slider.position.x * MM_PER_UNIT));
  const target = closeJaws ? 0 : openingNow;
  rig.remove(measuredObject);
  measuredObject.geometry.dispose();
  measuredObject.material.dispose();
  measuredObject = null;
  selectedShape = null;
  document.querySelectorAll("[data-shape]").forEach((button) => button.classList.remove("active"));
  showObjectPanel(false);
  $("removeButton").disabled = true;
  if ($("removeObjectButton")) $("removeObjectButton").disabled = true;
  $("jawSlider").disabled = false;
  if (closeJaws) animateJaws(openingNow, 0);
  else setJawOpening(openingNow);
  refreshReading(target);
  say(closeJaws ? "Object removed. The jaws are closing." : "Object removed. The opening is preserved in manual mode.");
}

// Draw the scale's arithmetic in a crisp, responsive inset (not on the GLB texture).
function drawScaleInset(override = null) {
  const canvas = $("scaleCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dimension = getCurrentFirstDimension();
  const raw = Math.max(0, dimension) + zeroError;
  let { msr, vc } = decomposeReading(raw);
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
  const startMM = Math.floor(reading) - 1;
  const mainY = 101, vernierY = 211;
  ctx.strokeStyle = "#273340";
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(0, mainY); ctx.lineTo(w, mainY); ctx.stroke();
  for (let mm = startMM; mm <= startMM + visibleMM; mm++) {
    if (mm < 0) continue;
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
$("zoomInButton")?.addEventListener("click", () => zoomCamera(0.78));
$("zoomOutButton")?.addEventListener("click", () => zoomCamera(1.28));
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
  jawTween = null;
  const openingMM = Number($("jawSlider").value);
  slider.position.x = physicalSliderPosition(openingMM);
  $("jawValue").textContent = mmText(openingMM);
  refreshReading(openingMM);
});
$("closeJawsButton").addEventListener("click", () => {
  if (!slider) return;
  if (measuredObject) { removeObject({ closeJaws: true }); return; }
  animateJaws(slider.position.x * MM_PER_UNIT, 0);
  refreshReading(0);
  say("Jaws closed.");
});
$("shapeButtons").querySelectorAll("[data-shape]").forEach((button) => button.addEventListener("click", () => selectShape(button.dataset.shape)));
["dimA", "dimB", "dimC"].forEach((id) => $(id).addEventListener("input", applyDimensions));
$("removeButton").addEventListener("click", () => removeObject());
$("removeObjectButton")?.addEventListener("click", () => removeObject());
const signedMM = (value) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)} mm`;
function snapZeroError(value) {
  // A real vernier can only show multiples of the least count, so typed values snap to 0.05 mm.
  const snapped = Math.round(value / LC) * LC;
  return Math.round(Math.max(-ZERO_INPUT_MAX, Math.min(ZERO_INPUT_MAX, snapped)) * 100) / 100;
}
function setPendingZeroError(rawValue, source) {
  pendingZeroError = snapZeroError(rawValue);
  $("zeroValue").textContent = mmText(pendingZeroError);
  if (source !== "slider") $("zeroSlider").value = String(Math.max(-ZERO_SLIDER_MAX, Math.min(ZERO_SLIDER_MAX, pendingZeroError)));
  if (source === "final") $("zeroInput").value = pendingZeroError.toFixed(2);
  if (source === "slider") $("zeroInput").value = pendingZeroError.toFixed(2);
  const rounded = Math.abs(rawValue - pendingZeroError) > 0.0001;
  $("zeroApplyStatus").textContent = `Pending: ${signedMM(pendingZeroError)}${rounded ? " (rounded to the nearest 0.05 mm, the least count; limit ±" + ZERO_INPUT_MAX + " mm)" : ""}. Tap Apply Zero Error to use it.`;
}
$("zeroSlider").addEventListener("input", () => setPendingZeroError(Number($("zeroSlider").value), "slider"));
$("zeroInput").addEventListener("input", () => {
  const typed = Number.parseFloat($("zeroInput").value);
  if (Number.isFinite(typed)) setPendingZeroError(typed, "typing");
});
$("zeroInput").addEventListener("change", () => {
  const typed = Number.parseFloat($("zeroInput").value);
  setPendingZeroError(Number.isFinite(typed) ? typed : pendingZeroError, "final");
});
$("zeroInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); $("zeroInput").dispatchEvent(new Event("change")); $("applyZeroButton").click(); }
});
$("applyZeroButton").addEventListener("click", () => {
  // Commit the selected zero error: shift the main-scale graduations on the 3D caliper and
  // recalculate the observed and corrected readings.
  zeroError = pendingZeroError;
  setMainScaleZeroError(zeroError);
  refreshReading();
  $("zeroApplyStatus").textContent = `Applied: ${signedMM(zeroError)}. The 3D scale and the readings have been updated.`;
  say(`Zero error applied: ${signedMM(zeroError)}.`);
});
$("zeroResetButton").addEventListener("click", () => {
  zeroError = 0;
  pendingZeroError = 0;
  $("zeroSlider").value = "0";
  $("zeroInput").value = "0.00";
  $("zeroValue").textContent = "0.00 mm";
  setMainScaleZeroError(0);
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

// Keep the caliper alive when the browser frees graphics memory (page in the background,
// phone locked, switching apps or tabs). Without this the 3D view comes back completely black.
let contextWasLost = false;
function refreshGraphics(reuploadTextures) {
  buildEnvironment();
  if (reuploadTextures) {
    scene.traverse((object) => {
      if (!object.isMesh) return;
      getMaterials(object).forEach((material) => {
        material.needsUpdate = true;
        Object.values(material).forEach((value) => { if (value && value.isTexture) value.needsUpdate = true; });
      });
    });
  }
  resizeViewer();
}
renderer.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); contextWasLost = true; }, false);
renderer.domElement.addEventListener("webglcontextrestored", () => { refreshGraphics(true); contextWasLost = false; }, false);
function recoverGraphics() {
  if (document.hidden) return;
  const gl = renderer.getContext();
  if (gl && gl.isContextLost && gl.isContextLost()) return; // the "restored" event rebuilds everything
  refreshGraphics(contextWasLost);
  contextWasLost = false;
}
document.addEventListener("visibilitychange", recoverGraphics);
window.addEventListener("pageshow", recoverGraphics);
window.addEventListener("focus", recoverGraphics);

function setup(model) {
  rig = new THREE.Group();
  rig.add(model);
  scene.add(rig);
  rig.updateMatrixWorld(true);
  const movingParts = [];
  const movingNames = new Set(["cube0042", "cylinder3"]);
  const hiddenNames = new Set(["circle4", "cylinder0015"]);
  model.traverse((object) => {
    const normalized = String(object.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (hiddenNames.has(normalized)) object.visible = false;
    if (movingNames.has(normalized)) movingParts.push(object);
  });
  if (movingParts.length !== movingNames.size) throw new Error(`Could not identify the two moving GLB parts (found ${movingParts.map((part) => part.name).join(", ") || "none"}).`);
  const ruler = model.getObjectByName("Object_4");
  if (!ruler?.isMesh) throw new Error('The model ruler mesh "Object_4" was not found.');
  trimExtraScaleParts(model, ruler);
  const scaleTexture = makeMainScaleTexture();
  calibrateMainScale(ruler);
  assignCleanMainScale(ruler, scaleTexture);
  polishModelMaterials(model, ruler);
  slider = new THREE.Group();
  slider.name = "movingSlider";
  rig.add(slider);
  movingParts.forEach((part) => slider.attach(part));
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  rig.traverse((object) => {
    if (!object.isMesh) return;
    let parent = object;
    while (parent) { if (!parent.visible) return; parent = parent.parent; }
    bounds.union(new THREE.Box3().setFromObject(object));
  });
  if (bounds.isEmpty()) throw new Error("The GLB contains no visible geometry.");
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  modelWidth = size.x;
  modelHeight = size.y;
  rig.position.copy(center).negate();
  rig.updateMatrixWorld(true);
  ready = true;
  fullView(true);
  say("Caliper ready. Drag to rotate; pinch to zoom. Use the jaw and object controls to explore measurements.");
  refreshReading(0);
  // Start with the instrument alone. The user chooses an object when ready.
  selectedShape = null;
  measuredObject = null;
  showObjectPanel(false);
  document.querySelectorAll("[data-shape]").forEach((button) => button.classList.remove("active"));
  $("jawSlider").disabled = false;
  $("jawSlider").value = "0";
  slider.position.x = physicalSliderPosition(0);
  $("jawValue").textContent = "0.00 mm";
  refreshReading(0);
}

new GLTFLoader().load(MODEL_URL, async (gltf) => {
  try {
    setup(gltf.scene);
    try { await darkenVernierScale(gltf); }
    catch (error) { console.warn("Optional Vernier-mark contrast enhancement skipped:", error); }
  } catch (error) {
    console.error(error);
    say(`Model setup problem: ${error.message || "Unknown error."}`, "error");
    if (stageStatus) stageStatus.textContent = "Model error";
  }
}, undefined, (error) => {
  console.error(error);
  say("3D model could not load. Check that verniercaliper.glb is in the same folder as index.html and that the site is served over HTTP/HTTPS.", "error");
  if (stageStatus) stageStatus.textContent = "Model failed to load";
});

function animate(now) {
  requestAnimationFrame(animate);
  if (flight) {
    const progress = Math.min(1, (now - flight.started) / 520);
    const eased = progress * progress * (3 - 2 * progress);
    camera.position.lerpVectors(flight.fromPosition, flight.toPosition, eased);
    controls.target.lerpVectors(flight.fromTarget, flight.toTarget, eased);
    if (progress >= 1) flight = null;
  }
  stepJawTween(now);
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
