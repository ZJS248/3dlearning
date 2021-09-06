import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { WEBGL } from "three/examples/jsm/WebGL.js";

if (WEBGL.isWebGL2Available() === false) {
  document.body.appendChild(WEBGL.getWebGL2ErrorMessage());
}

//

var camera, scene, renderer;
var controls;

init();
render();

function init() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 3;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0, 0, 0.5);
  scene.fog = new THREE.Fog(0x000000, 0.1, 3);

  var light = new THREE.PointLight(0xffffff);
  scene.add(light);

  var geometry = new THREE.SphereBufferGeometry(0.05, 32, 16);
  var material = new THREE.MeshNormalMaterial();

  for (var i = 0; i < 5000; i++) {
    var mesh = new THREE.Mesh(geometry, material);

    mesh.position.x = Math.random() * 10 - 5;
    mesh.position.y = Math.random() * 10 - 5;
    mesh.position.z = Math.random() * 10 - 5;

    mesh.rotation.y = Math.random() * 2 * Math.PI;

    mesh.scale.setScalar(Math.random() * 4 + 1);

    scene.add(mesh);
  }

  var canvas = document.createElement("canvas");
  var context = canvas.getContext("webgl2", { alpha: false, antialias: true });

  renderer = new THREE.WebGLRenderer({ canvas: canvas, context: context });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize, false);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function render() {
  renderer.render(scene, camera);
}
