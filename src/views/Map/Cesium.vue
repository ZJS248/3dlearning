<template>
  <div class="Cesium-Map">
    <div id="cesiumContainer" class="cesiumContainer"></div>
  </div>
</template>

<script>
import { setup } from "@/modules/Cesium";
export default {
  setup,
};
</script>

<style lang="scss" scoped>
.Cesium-Map {
  height: 100%;
  width: 100%;
}
</style>
