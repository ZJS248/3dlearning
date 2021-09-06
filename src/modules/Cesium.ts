import { nextTick, onMounted } from "@vue/runtime-core";
import axios from "axios";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
(window as any).CESIUM_BASE_URL = "/Source";
Cesium.Ion.defaultAccessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2ZmUwOTA1Zi0yNWRjLTRjOTAtYmFlNS1hMDNlYmQ4YTk3ZGYiLCJpZCI6NjYzMzksImlhdCI6MTYzMDg5ODQwN30.cIvtTielqr3S38-9ZiOwP2wa-x63asH7XL06_y8Mm8Q`;
export const setup = () => {
  // console.clear();
  let viewer: Cesium.Viewer;
  const init = () => {
    const height = document.querySelector("#cesiumContainer")?.clientHeight;
    const canvas = document.createElement("canvas");
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    const webgl = canvas.getContext("webgl");
    viewer = new Cesium.Viewer("cesiumContainer", {
      // terrainProvider: Cesium.createWorldTerrain(),
      scene3DOnly: true,
      selectionIndicator: false,
      baseLayerPicker: false,
    });
    viewer.resize();
    // Add Cesium OSM Buildings, a global 3D buildings layer.
    // const buildingTileset = viewer.scene.primitives.add(
    //   Cesium.createOsmBuildings()
    // );
    // // Fly the camera to San Francisco at the given longitude, latitude, and height.
    // viewer.camera.flyTo({
    //   destination: Cesium.Cartesian3.fromDegrees(-122.4175, 37.655, 400),
    //   orientation: {
    //     heading: Cesium.Math.toRadians(0.0),
    //     pitch: Cesium.Math.toRadians(-15.0),
    //   },
    // });
  };
  const addPoint = () => {
    const dataPoint = {
      longitude: -122.38985,
      latitude: 37.61864,
      height: -27.32,
    };
    // Mark this location with a red point.
    const pointEntity = viewer.entities.add({
      description: `First data point at (${dataPoint.longitude}, ${dataPoint.latitude})`,
      position: Cesium.Cartesian3.fromDegrees(
        dataPoint.longitude,
        dataPoint.latitude,
        dataPoint.height
      ),
      point: { pixelSize: 10, color: Cesium.Color.RED },
    });
    // Fly the camera to this point.
    viewer.flyTo(pointEntity);
    viewer.render();
  };
  const addPoints = () => {
    axios.get("/json/points.json").then((res) => {
      const flightData = res.data;
      // Create a point for each.
      for (let i = 0; i < flightData.length; i++) {
        const dataPoint = flightData[i];

        viewer.entities.add({
          description: `Location: (${dataPoint.longitude}, ${dataPoint.latitude}, ${dataPoint.height})`,
          position: Cesium.Cartesian3.fromDegrees(
            dataPoint.longitude,
            dataPoint.latitude,
            dataPoint.height
          ),
          point: { pixelSize: 10, color: Cesium.Color.RED },
        });
        viewer.render();
      }
    });
  };
  onMounted(() => {
    nextTick(() => {
      init();
    });

    // addPoint();
    // addPoints();
  });
  return {};
};
