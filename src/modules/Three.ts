import * as three from "three";
import { onMounted, ref, onBeforeUnmount } from "vue";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
const fps = ref(0);
const render = new three.WebGLRenderer({ alpha: false, antialias: true });
const scene = new three.Scene();
const OrtCamera = new three.OrthographicCamera(
  500,
  -500,
  325,
  -325,
  0.01,
  1000
);
const PerCamera = new three.PerspectiveCamera(75, 1000 / 750, 1, 1000);
const camera = PerCamera;
const directLight = new three.DirectionalLight("#fff", 1);
const ambientLight = new three.AmbientLight(0x999999);
const control = new OrbitControls(camera, render.domElement);
const grid = new three.GridHelper(500, 500, 0xffffff, 0x555555);
class WindSprite {
  particle: three.Points;
  x = Math.random() * 500;
  y = Math.random() * 500;
  age = Math.random() * 100;
  alive = true;
  constructor(group: three.Group) {
    const sphereGeometry = new three.SphereGeometry();
    const material = new three.PointsMaterial({ color: "red" });
    this.particle = new three.Points(sphereGeometry, material);
    this.particle.position.set(this.x, this.y, 0);
    group.add(this.particle);
  }
  move() {
    this.x -= 1;
    this.y -= 1;
    this.age++;
    if (
      this.x < 500 &&
      this.y < 500 &&
      this.x > 0 &&
      this.y > 0 &&
      this.age < 100
    ) {
      this.particle.position.set(this.x, this.y, 0);
    } else {
      this.alive = false;
    }
  }
  rebuild() {
    this.x = Math.random() * 500;
    this.y = Math.random() * 500;
    this.alive = true;
    this.age = 0;
  }
  start() {
    if (this.alive) {
      this.move();
    } else {
      this.rebuild();
    }
  }
}

const initScene = () => {
  render.setClearColor(0x000000, 0);
  render.setPixelRatio(window.devicePixelRatio);
  render.setSize(window.innerWidth, window.innerHeight - 60);
  camera.position.set(500, 500, 500);
  camera.add(new three.PointLight(0xffffff, 0.8));
  camera.lookAt(new three.Vector3(500, 500, 0));
  // directLight.position.set(500, 500, 10000);
  scene.background = new three.Color(0x999999);
  scene.add(ambientLight);
  scene.add(grid);
};

const setOrbControl = () => {
  control.mouseButtons = {
    LEFT: three.MOUSE.PAN,
    MIDDLE: three.MOUSE.DOLLY,
    RIGHT: three.MOUSE.ROTATE,
  };
  control.zoomSpeed = 5;
  control.panSpeed = 10;
};

/**设置可视粒子 */
const createParticles = () => {
  /**粒子数量 */
  const num = 5000;
  /**存放粒子的数组 */
  const particles: WindSprite[] = [];
  const particleGroup = new three.Group();
  scene.add(particleGroup);
  for (let i = 0; i < num; i++) {
    const sprite = new WindSprite(particleGroup);
    particles.push(sprite);
  }
  const run = () => {
    particles.forEach((item) => item.start());
    window.requestAnimationFrame(run);
  };
  run();
};
const setAxis = () => {
  const axisGroup = new three.Group();
  scene.add(axisGroup);
  const geometry = new three.BufferGeometry();
  const lineMaterial = new three.LineBasicMaterial({
    color: "#fff",
  });
  /**轴线 */
  const p0 = new three.Vector3(0, 0, 0);
  const p1 = new three.Vector3(500, 0, 0);
  const p2 = new three.Vector3(0, 500, 0);
  const p3 = new three.Vector3(0, 0, 500);
  geometry.setFromPoints([p0, p1]);
  geometry.setFromPoints([p0, p2]);
  geometry.setFromPoints([p0, p3, p0, p1, p0, p2]);
  const line = new three.Line(geometry, lineMaterial);
  axisGroup.add(line);
  /**坐标轴名称 */
  const loader = new three.FontLoader();
  loader.load("/helvetiker_regular.typeface.json", (font) => {
    const option = {
      font: font,
      size: 80,
      height: 5,
    };
    const material = new three.MeshBasicMaterial({ color: "yellow" });
    const X = new three.TextGeometry("X", option);
    const Y = new three.TextGeometry("Y", option);
    const Z = new three.TextGeometry("Z", option);
    const XBox = new three.Mesh(X, material);
    const YBox = new three.Mesh(Y, material);
    const ZBox = new three.Mesh(Z, material);
    XBox.position.set(500, 0, 0);
    YBox.position.set(0, 500, 0);
    ZBox.position.set(0, 0, 500);
    axisGroup.add(XBox).add(YBox).add(ZBox);
  });
};

/**循环动画 */
let now = Date.now();
let loop = 0;
let loopFn: number;
const animate = () => {
  loop++;
  if (Date.now() - now >= 1000) {
    fps.value = Number(loop);
    loop = 0;
    now = Date.now();
  }
  control.update();
  render.render(scene, camera);
  loopFn = window.requestAnimationFrame(animate);
};
export const setup = () => {
  onMounted(() => {
    document.getElementById("scene")?.appendChild(render.domElement);
    initScene();
    setOrbControl();
    setAxis();
    createParticles();
    animate();
  });
  onBeforeUnmount(() => {
    window.cancelAnimationFrame(loopFn);
  });
  return { fps };
};
