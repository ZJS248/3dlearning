<template>
  <div></div>
</template>
<script lang="ts">
import { map } from "@/views/Map.vue";
import { getJSONFromImg } from "@/utils/imgdata";
import WindFeatherLayer2D from "@/microLayer/layers/WindFeatherLayer2D";
import { onMounted, defineComponent, nextTick, onBeforeUnmount } from "vue";
import SimplePoints from "@/microLayer/layers/SimplePoints";
let windFeatherLayer: WindFeatherLayer2D;
let simplePointsLayer: SimplePoints;
const Asia = {
  center: [24.046464, 101.513672],
  zoom: 4,
  url: `/data-img/20210723090000.wind10.15.000.png`,
  value: [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
  color: [
    "#D8D8D8",
    "#01A0F6",
    "#00ECEC",
    "#00D800",
    "#019000",
    "#FFFF00",
    "#E7C000",
    "#FF9000",
    "#FF0000",
    "#D60000",
    "#C00000",
    "#FF00F0",
    "#9600B4",
    "#AD90F0",
  ],
};
const cangnan = {
  center: [27.372987, 120.49942],
  zoom: 10,
  url: `/data-img/20210628170000.WIN.00.000.png`,
  value: [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
  color: [
    "#D8D8D8",
    "#01A0F6",
    "#00ECEC",
    "#00D800",
    "#019000",
    "#FFFF00",
    "#E7C000",
    "#FF9000",
    "#FF0000",
    "#D60000",
    "#C00000",
    "#FF00F0",
    "#9600B4",
    "#AD90F0",
  ],
};
const dataObj = cangnan;
const getImgData = () =>
  getJSONFromImg(dataObj.url, true).then((res) => {
    console.log(res);
    map.setView(dataObj.center as [number, number], dataObj.zoom);
    const now = Date.now();
    const data = res.data.u.map((u, index) => {
      const item = {
        u: u,
        v: res.data.v[index],
        lng: res.sLon + res.lonStep * (index % res.width),
        lat: res.eLat - res.latStep * Math.floor(index / res.width),
      };
      return { ...item };
    });
    console.log(Date.now() - now);

    simplePointsLayer.setData(data);
    simplePointsLayer.Draw();
    console.log(Date.now() - now);
  });
export default defineComponent({
  setup() {
    onMounted(() => {
      nextTick(() => {
        simplePointsLayer = new SimplePoints(map, {
          color: "auto",
          interval: [50, 50],
          thinout: true,
          moveType: "move",
        });
        simplePointsLayer.on("click", (e) => {
          console.log(e);
        });
        getImgData();
      });
    });
    onBeforeUnmount(() => {
      simplePointsLayer.destroy();
    });
    return {};
  },
});
</script>
<style lang="scss" scoped>
.legend {
  position: absolute;
  right: 20px;
  bottom: 30px;
  z-index: 1000;
}
</style>
