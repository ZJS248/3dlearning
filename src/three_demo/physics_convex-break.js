import * as THREE from "../build/three.module.js";

import Stats from "./jsm/libs/stats.module.js";

import { OrbitControls } from "./jsm/controls/OrbitControls.js";
import { ConvexObjectBreaker } from "./jsm/misc/ConvexObjectBreaker.js";
import { ConvexBufferGeometry } from "./jsm/geometries/ConvexGeometry.js";
import Ammo from 'ammo'

//http://www.webgl3d.cn/threejs/examples/#webgl_physics_convex_break
// - Global variables -

// Graphics variables
var container, stats;
var camera, controls, scene, renderer;
var textureLoader;
var clock = new THREE.Clock();

var mouseCoords = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var ballMaterial = new THREE.MeshPhongMaterial({ color: 0x202020 });

// Physics variables
var gravityConstant = 7.8;
var collisionConfiguration;
var dispatcher;
var broadphase;
var solver;
var physicsWorld;
var margin = 0.05;

var convexBreaker = new ConvexObjectBreaker();

// Rigid bodies include all movable objects
var rigidBodies = [];

var pos = new THREE.Vector3();
var quat = new THREE.Quaternion();
var transformAux1;
var tempBtVec3_1;

var objectsToRemove = [];
for (var i = 0; i < 500; i++) {
  objectsToRemove[i] = null;
}
var numObjectsToRemove = 0;

var impactPoint = new THREE.Vector3();
var impactNormal = new THREE.Vector3();

// - Main code -

Ammo().then(function (AmmoLib) {
  Ammo = AmmoLib;

  init();
  animate();
});

// - Functions -

function init() {
  initGraphics();

  initPhysics();

  createObjects();

  initInput();
}

function initGraphics() {
  container = document.getElementById("container");

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.2,
    2000
  );

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  camera.position.set(-14, 8, 16);

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2, 0);
  controls.update();

  textureLoader = new THREE.TextureLoader();

  var ambientLight = new THREE.AmbientLight(0x707070);
  scene.add(ambientLight);

  var light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(-10, 18, 5);
  light.castShadow = true;
  var d = 14;
  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;

  light.shadow.camera.near = 2;
  light.shadow.camera.far = 50;

  light.shadow.mapSize.x = 1024;
  light.shadow.mapSize.y = 1024;

  scene.add(light);

  stats = new Stats();
  stats.domElement.style.position = "absolute";
  stats.domElement.style.top = "0px";
  container.appendChild(stats.domElement);

  //

  window.addEventListener("resize", onWindowResize, false);
}

function initPhysics() {
  // Physics configuration

  collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  broadphase = new Ammo.btDbvtBroadphase();
  solver = new Ammo.btSequentialImpulseConstraintSolver();
  physicsWorld = new Ammo.btDiscreteDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration
  );
  physicsWorld.setGravity(new Ammo.btVector3(0, -gravityConstant, 0));

  transformAux1 = new Ammo.btTransform();
  tempBtVec3_1 = new Ammo.btVector3(0, 0, 0);
}

function createObject(mass, halfExtents, pos, quat, material) {
  var object = new THREE.Mesh(
    new THREE.BoxBufferGeometry(
      halfExtents.x * 2,
      halfExtents.y * 2,
      halfExtents.z * 2
    ),
    material
  );
  object.position.copy(pos);
  object.quaternion.copy(quat);
  convexBreaker.prepareBreakableObject(
    object,
    mass,
    new THREE.Vector3(),
    new THREE.Vector3(),
    true
  );
  createDebrisFromBreakableObject(object);
}

function createObjects() {
  // Ground
  pos.set(0, -0.5, 0);
  quat.set(0, 0, 0, 1);
  var ground = createParalellepipedWithPhysics(
    40,
    1,
    40,
    0,
    pos,
    quat,
    new THREE.MeshPhongMaterial({ color: 0xffffff })
  );
  ground.receiveShadow = true;
  textureLoader.load("textures/grid.png", function (texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40);
    ground.material.map = texture;
    ground.material.needsUpdate = true;
  });

  // Tower 1
  var towerMass = 1000;
  var towerHalfExtents = new THREE.Vector3(2, 5, 2);
  pos.set(-8, 5, 0);
  quat.set(0, 0, 0, 1);
  createObject(
    towerMass,
    towerHalfExtents,
    pos,
    quat,
    createMaterial(0xb03014)
  );

  // Tower 2
  pos.set(8, 5, 0);
  quat.set(0, 0, 0, 1);
  createObject(
    towerMass,
    towerHalfExtents,
    pos,
    quat,
    createMaterial(0xb03214)
  );

  //Bridge
  var bridgeMass = 100;
  var bridgeHalfExtents = new THREE.Vector3(7, 0.2, 1.5);
  pos.set(0, 10.2, 0);
  quat.set(0, 0, 0, 1);
  createObject(
    bridgeMass,
    bridgeHalfExtents,
    pos,
    quat,
    createMaterial(0xb3b865)
  );

  // Stones
  var stoneMass = 120;
  var stoneHalfExtents = new THREE.Vector3(1, 2, 0.15);
  var numStones = 8;
  quat.set(0, 0, 0, 1);
  for (var i = 0; i < numStones; i++) {
    pos.set(0, 2, 15 * (0.5 - i / (numStones + 1)));

    createObject(
      stoneMass,
      stoneHalfExtents,
      pos,
      quat,
      createMaterial(0xb0b0b0)
    );
  }

  // Mountain
  var mountainMass = 860;
  var mountainHalfExtents = new THREE.Vector3(4, 5, 4);
  pos.set(5, mountainHalfExtents.y * 0.5, -7);
  quat.set(0, 0, 0, 1);
  var mountainPoints = [];
  mountainPoints.push(
    new THREE.Vector3(
      mountainHalfExtents.x,
      -mountainHalfExtents.y,
      mountainHalfExtents.z
    )
  );
  mountainPoints.push(
    new THREE.Vector3(
      -mountainHalfExtents.x,
      -mountainHalfExtents.y,
      mountainHalfExtents.z
    )
  );
  mountainPoints.push(
    new THREE.Vector3(
      mountainHalfExtents.x,
      -mountainHalfExtents.y,
      -mountainHalfExtents.z
    )
  );
  mountainPoints.push(
    new THREE.Vector3(
      -mountainHalfExtents.x,
      -mountainHalfExtents.y,
      -mountainHalfExtents.z
    )
  );
  mountainPoints.push(new THREE.Vector3(0, mountainHalfExtents.y, 0));
  var mountain = new THREE.Mesh(
    new ConvexBufferGeometry(mountainPoints),
    createMaterial(0xb03814)
  );
  mountain.position.copy(pos);
  mountain.quaternion.copy(quat);
  convexBreaker.prepareBreakableObject(
    mountain,
    mountainMass,
    new THREE.Vector3(),
    new THREE.Vector3(),
    true
  );
  createDebrisFromBreakableObject(mountain);
}

function createParalellepipedWithPhysics(
  sx,
  sy,
  sz,
  mass,
  pos,
  quat,
  material
) {
  var object = new THREE.Mesh(
    new THREE.BoxBufferGeometry(sx, sy, sz, 1, 1, 1),
    material
  );
  var shape = new Ammo.btBoxShape(
    new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5)
  );
  shape.setMargin(margin);

  createRigidBody(object, shape, mass, pos, quat);

  return object;
}

function createDebrisFromBreakableObject(object) {
  object.castShadow = true;
  object.receiveShadow = true;

  var shape = createConvexHullPhysicsShape(
    object.geometry.attributes.position.array
  );
  shape.setMargin(margin);

  var body = createRigidBody(
    object,
    shape,
    object.userData.mass,
    null,
    null,
    object.userData.velocity,
    object.userData.angularVelocity
  );

  // Set pointer back to the three object only in the debris objects
  var btVecUserData = new Ammo.btVector3(0, 0, 0);
  btVecUserData.threeObject = object;
  body.setUserPointer(btVecUserData);
}

function removeDebris(object) {
  scene.remove(object);

  physicsWorld.removeRigidBody(object.userData.physicsBody);
}

function createConvexHullPhysicsShape(coords) {
  var shape = new Ammo.btConvexHullShape();

  for (var i = 0, il = coords.length; i < il; i += 3) {
    tempBtVec3_1.setValue(coords[i], coords[i + 1], coords[i + 2]);
    var lastOne = i >= il - 3;
    shape.addPoint(tempBtVec3_1, lastOne);
  }

  return shape;
}

function createRigidBody(object, physicsShape, mass, pos, quat, vel, angVel) {
  if (pos) {
    object.position.copy(pos);
  } else {
    pos = object.position;
  }
  if (quat) {
    object.quaternion.copy(quat);
  } else {
    quat = object.quaternion;
  }

  var transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  var motionState = new Ammo.btDefaultMotionState(transform);

  var localInertia = new Ammo.btVector3(0, 0, 0);
  physicsShape.calculateLocalInertia(mass, localInertia);

  var rbInfo = new Ammo.btRigidBodyConstructionInfo(
    mass,
    motionState,
    physicsShape,
    localInertia
  );
  var body = new Ammo.btRigidBody(rbInfo);

  body.setFriction(0.5);

  if (vel) {
    body.setLinearVelocity(new Ammo.btVector3(vel.x, vel.y, vel.z));
  }
  if (angVel) {
    body.setAngularVelocity(new Ammo.btVector3(angVel.x, angVel.y, angVel.z));
  }

  object.userData.physicsBody = body;
  object.userData.collided = false;

  scene.add(object);

  if (mass > 0) {
    rigidBodies.push(object);

    // Disable deactivation
    body.setActivationState(4);
  }

  physicsWorld.addRigidBody(body);

  return body;
}

function createRandomColor() {
  return Math.floor(Math.random() * (1 << 24));
}

function createMaterial(color) {
  color = color || createRandomColor();
  return new THREE.MeshPhongMaterial({ color: color });
}

function initInput() {
  window.addEventListener("mousedown", function (event) {
    mouseCoords.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouseCoords, camera);

    // Creates a ball and throws it
  });
}
