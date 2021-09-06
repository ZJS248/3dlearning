<template>
  <div id="map"></div>
  <router-view></router-view>
</template>

<script lang="ts">
import { nextTick } from "@vue/runtime-core";
import { LeafletMouseEvent, Map, TileLayer } from "leaflet";
import { Vue } from "vue-class-component";
import "leaflet/dist/leaflet.css";
import Tiles from "@/microLayer/tiles";
Vue.registerHooks([
  "beforeRouteEnter",
  "beforeRouteLeave",
  "beforeRouteUpdate",
]);
export let map: Map;
export default class Home extends Vue {
  initMap(): void {
    const tiles = new Tiles();
    const layer = tiles.Geoq.Normal.Map;
    map = new Map("map", {
      zoom: 8,
      center: [27.35011834601495, 120.41633605957033],
      layers: [layer],
      attributionControl: false,
    });
    map.on("click", (e: LeafletMouseEvent) =>
      console.log(e.latlng.toString(), e.target.getZoom())
    );
    console.log("map");
  }
  mounted(): void {
    this.initMap();
  }
  beforeUnmount(): void {
    map.remove();
  }
  // beforeRouteEnter(): void {}
}
</script>
<style lang="scss" scoped>
#map {
  width: 100%;
  height: 100%;
}
</style>
