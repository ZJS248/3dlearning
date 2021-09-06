/* eslint-disable no-var */
import * as Cesium from "cesium";
var demo = Cesium.defaultValue(demo, false);

const fileOptions = {
  dataDirectory: demo
    ? "https://raw.githubusercontent.com/RaymanNg/3D-Wind-Field/master/data/"
    : "../data/",
  dataFile: "demo.nc",
  glslDirectory: demo ? "../Cesium-3D-Wind/glsl/" : "glsl/",
};

const defaultParticleSystemOptions = {
  maxParticles: 64 * 64,
  particleHeight: 100.0,
  fadeOpacity: 0.996,
  dropRate: 0.003,
  dropRateBump: 0.01,
  speedFactor: 1.0,
  lineWidth: 4.0,
};

const globeLayers = [
  { name: "NaturalEarthII", type: "NaturalEarthII" },
  {
    name: "WMS:Air Pressure",
    type: "WMS",
    layer: "Pressure_surface",
    ColorScaleRange: "51640,103500",
  },
  {
    name: "WMS:Wind Speed",
    type: "WMS",
    layer: "Wind_speed_gust_surface",
    ColorScaleRange: "0.1095,35.31",
  },
  { name: "WorldTerrain", type: "WorldTerrain" },
];

const defaultLayerOptions = {
  globeLayer: globeLayers[0],
  WMS_URL:
    "https://www.ncei.noaa.gov/thredds/wms/model-gfs-g4-anl-files-old/201809/20180916/gfsanl_4_20180916_0000_000.grb2",
};
class Panel {
  maxParticles: number;
  particleHeight: number;
  fadeOpacity: number;
  dropRate: number;
  dropRateBump: number;
  speedFactor: number;
  lineWidth: number;
  globeLayer:
    | {
        name: string;
        type: string;
        layer?: undefined;
        ColorScaleRange?: undefined;
      }
    | { name: string; type: string; layer: string; ColorScaleRange: string };
  WMS_URL: string;
  layerToShow: any;
  constructor() {
    this.maxParticles = defaultParticleSystemOptions.maxParticles;
    this.particleHeight = defaultParticleSystemOptions.particleHeight;
    this.fadeOpacity = defaultParticleSystemOptions.fadeOpacity;
    this.dropRate = defaultParticleSystemOptions.dropRate;
    this.dropRateBump = defaultParticleSystemOptions.dropRateBump;
    this.speedFactor = defaultParticleSystemOptions.speedFactor;
    this.lineWidth = defaultParticleSystemOptions.lineWidth;

    this.globeLayer = defaultLayerOptions.globeLayer;
    this.WMS_URL = defaultLayerOptions.WMS_URL;

    const layerNames: string[] = [];
    globeLayers.forEach(function (layer) {
      layerNames.push(layer.name);
    });
    this.layerToShow = layerNames[0];

    const onParticleSystemOptionsChange = function () {
      const event = new CustomEvent("particleSystemOptionsChanged");
      window.dispatchEvent(event);
    };

    const onLayerOptionsChange = () => {
      for (let i = 0; i < globeLayers.length; i++) {
        if (this.layerToShow == globeLayers[i].name) {
          this.globeLayer = globeLayers[i];
          break;
        }
      }
      const event = new CustomEvent("layerOptionsChanged");
      window.dispatchEvent(event);
    };

    window.onload = () => {
      const gui = new dat.GUI({ autoPlace: false });
      gui
        .add(this, "maxParticles", 1, 256 * 256, 1)
        .onFinishChange(onParticleSystemOptionsChange);
      gui
        .add(this, "particleHeight", 1, 10000, 1)
        .onFinishChange(onParticleSystemOptionsChange);
      gui
        .add(this, "fadeOpacity", 0.9, 0.999, 0.001)
        .onFinishChange(onParticleSystemOptionsChange);
      gui
        .add(this, "dropRate", 0.0, 0.1)
        .onFinishChange(onParticleSystemOptionsChange);
      gui
        .add(this, "dropRateBump", 0, 0.2)
        .onFinishChange(onParticleSystemOptionsChange);
      gui
        .add(this, "speedFactor", 0.05, 8)
        .onFinishChange(onParticleSystemOptionsChange);
      gui
        .add(this, "lineWidth", 0.01, 16.0)
        .onFinishChange(onParticleSystemOptionsChange);

      gui
        .add(this, "layerToShow", layerNames)
        .onFinishChange(onLayerOptionsChange);

      const panelContainer = document
        .getElementsByClassName("cesium-widget")
        .item(0) as HTMLElement;
      gui.domElement.classList.add("myPanel");
      panelContainer.appendChild(gui.domElement);
    };
  }

  getUserInput() {
    // make sure maxParticles is exactly the square of particlesTextureSize
    const particlesTextureSize = Math.ceil(Math.sqrt(this.maxParticles));
    this.maxParticles = particlesTextureSize * particlesTextureSize;

    return {
      particlesTextureSize: particlesTextureSize,
      maxParticles: this.maxParticles,
      particleHeight: this.particleHeight,
      fadeOpacity: this.fadeOpacity,
      dropRate: this.dropRate,
      dropRateBump: this.dropRateBump,
      speedFactor: this.speedFactor,
      lineWidth: this.lineWidth,
      globeLayer: this.globeLayer,
      WMS_URL: this.WMS_URL,
    };
  }
}
class Wind3D {
  viewer: Cesium.Viewer;
  panel: Panel;
  globeBoundingSphere: Cesium.BoundingSphere;
  scene: Cesium.Scene;
  camera: Cesium.Camera;
  viewerParameters: {
    lonRange: Cesium.Cartesian2;
    latRange: Cesium.Cartesian2;
    pixelSize: number;
  };
  imageryLayers: Cesium.ImageryLayerCollection;
  constructor(panel: Panel, mode: { debug: boolean }) {
    const options = {
      // use Sentinel-2 instead of the default Bing Maps because Bing Maps sessions is limited
      imageryProvider: new Cesium.IonImageryProvider({ assetId: 3954 }),
      baseLayerPicker: false,
      geocoder: false,
      infoBox: false,
      fullscreenElement: "cesiumContainer",
      // useBrowserRecommendedResolution can be set to false to improve the render quality
      // useBrowserRecommendedResolution: false,
      scene3DOnly: true,
    };

    if (mode.debug) {
      options.useDefaultRenderLoop = false;
    }

    this.viewer = new Cesium.Viewer("cesiumContainer", options);
    this.scene = this.viewer.scene;
    this.camera = this.viewer.camera;

    this.panel = panel;

    this.viewerParameters = {
      lonRange: new Cesium.Cartesian2(),
      latRange: new Cesium.Cartesian2(),
      pixelSize: 0.0,
    };
    // use a smaller earth radius to make sure distance to camera > 0
    this.globeBoundingSphere = new Cesium.BoundingSphere(
      Cesium.Cartesian3.ZERO,
      0.99 * 6378137.0
    );
    this.updateViewerParameters();

    DataProcess.loadData().then((data: any) => {
      this.particleSystem = new ParticleSystem(
        this.scene.context,
        data,
        this.panel.getUserInput(),
        this.viewerParameters
      );
      this.addPrimitives();

      this.setupEventListeners();

      if (mode.debug) {
        this.debug();
      }
    });

    this.imageryLayers = this.viewer.imageryLayers;
    this.setGlobeLayer(this.panel.getUserInput());
  }

  addPrimitives() {
    // the order of primitives.add() should respect the dependency of primitives
    this.scene.primitives.add(
      this.particleSystem.particlesComputing.primitives.calculateSpeed
    );
    this.scene.primitives.add(
      this.particleSystem.particlesComputing.primitives.updatePosition
    );
    this.scene.primitives.add(
      this.particleSystem.particlesComputing.primitives.postProcessingPosition
    );

    this.scene.primitives.add(
      this.particleSystem.particlesRendering.primitives.segments
    );
    this.scene.primitives.add(
      this.particleSystem.particlesRendering.primitives.trails
    );
    this.scene.primitives.add(
      this.particleSystem.particlesRendering.primitives.screen
    );
  }

  updateViewerParameters() {
    const viewRectangle = this.camera.computeViewRectangle(
      this.scene.globe.ellipsoid
    );
    const lonLatRange = Util.viewRectangleToLonLatRange(viewRectangle);
    this.viewerParameters.lonRange.x = lonLatRange.lon.min;
    this.viewerParameters.lonRange.y = lonLatRange.lon.max;
    this.viewerParameters.latRange.x = lonLatRange.lat.min;
    this.viewerParameters.latRange.y = lonLatRange.lat.max;

    const pixelSize = this.camera.getPixelSize(
      this.globeBoundingSphere,
      this.scene.drawingBufferWidth,
      this.scene.drawingBufferHeight
    );

    if (pixelSize > 0) {
      this.viewerParameters.pixelSize = pixelSize;
    }
  }

  setGlobeLayer(userInput: {
    particlesTextureSize?: number;
    maxParticles?: number;
    particleHeight?: number;
    fadeOpacity?: number;
    dropRate?: number;
    dropRateBump?: number;
    speedFactor?: number;
    lineWidth?: number;
    globeLayer: any;
    WMS_URL: any;
  }) {
    this.viewer.imageryLayers.removeAll();
    this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();

    const globeLayer = userInput.globeLayer;
    switch (globeLayer.type) {
      case "NaturalEarthII": {
        this.viewer.imageryLayers.addImageryProvider(
          new Cesium.TileMapServiceImageryProvider({
            url: Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
          })
        );
        break;
      }
      case "WMS": {
        this.viewer.imageryLayers.addImageryProvider(
          new Cesium.WebMapServiceImageryProvider({
            url: userInput.WMS_URL,
            layers: globeLayer.layer,
            parameters: {
              ColorScaleRange: globeLayer.ColorScaleRange,
            },
          })
        );
        break;
      }
      case "WorldTerrain": {
        this.viewer.imageryLayers.addImageryProvider(
          new Cesium.IonImageryProvider({ assetId: 3954 })
        );
        this.viewer.terrainProvider = Cesium.createWorldTerrain();
        break;
      }
    }
  }

  setupEventListeners() {
    const that = this;

    this.camera.moveStart.addEventListener(function () {
      that.scene.primitives.show = false;
    });

    this.camera.moveEnd.addEventListener(function () {
      that.updateViewerParameters();
      that.particleSystem.applyViewerParameters(that.viewerParameters);
      that.scene.primitives.show = true;
    });

    let resized = false;
    window.addEventListener("resize", function () {
      resized = true;
      that.scene.primitives.show = false;
      that.scene.primitives.removeAll();
    });

    this.scene.preRender.addEventListener(function () {
      if (resized) {
        that.particleSystem.canvasResize(that.scene.context);
        resized = false;
        that.addPrimitives();
        that.scene.primitives.show = true;
      }
    });

    window.addEventListener("particleSystemOptionsChanged", function () {
      that.particleSystem.applyUserInput(that.panel.getUserInput());
    });
    window.addEventListener("layerOptionsChanged", function () {
      that.setGlobeLayer(that.panel.getUserInput());
    });
  }

  debug() {
    var animate = () => {
      this.viewer.resize();
      this.viewer.render();
      requestAnimationFrame(animate);
    };

    const spector = new SPECTOR.Spector();
    spector.displayUI();
    spector.spyCanvases();

    animate();
  }
}
