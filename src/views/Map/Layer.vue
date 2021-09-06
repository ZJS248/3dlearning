<template>
  <div>
    <img src="/legend/郑州降水图例.png" alt="" class="legend" />
  </div>
</template>
<script lang="ts">
import { map } from "@/views/Map.vue";
import { getJSONFromImg } from "@/utils/imgdata";
import IsoLayer from "@/microLayer/layers/IsoLayer";
import GridLayer from "@/microLayer/layers/GridLayer";
import { onMounted, defineComponent, nextTick, onBeforeUnmount } from "vue";
let isoLayer: IsoLayer;
let gridLayer: GridLayer;
const rain = {
  center: [34.615, 113.42],
  zoom: 10,
  url: `/data-img/zhangzhou-Rain-2021-08-22_0800_6.png`,
  value: [1, 10, 25, 50, 100, 250],
  color: ["#A5F28D", "#3CB93D", "#62B7FD", "#0100FE", "#FA00FA", "#810040"],
};
const radar = {
  center: [36, 101.5],
  zoom: 8,
  url: `/data-img/qinghai_Radar_20210824.153000.00.000.data.png`,
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
const dataObj = rain;
const getImgData = () =>
  getJSONFromImg(dataObj.url).then((res) => {
    map.setView(dataObj.center as [number, number], dataObj.zoom);
    const property = {
      lonStep: Math.abs(res.lonStep),
      latStep: Math.abs(res.latStep),
      size: [res.width, res.height] as [number, number],
      border: {
        east: res.eLon,
        west: res.sLon,
        north: res.sLat,
        south: res.eLat,
      },
      value: dataObj.value,
      color: dataObj.color,
    };
    isoLayer.setData(res.data, property);
    isoLayer.Draw();
    isoLayer.on("click", (e: any) => {
      if (e.value) {
        console.log(e);
      }
    });
    gridLayer.setData(res.data, property);
    gridLayer.Draw();
    gridLayer.on("click", (e: any) => {
      console.log(e);
    });
  });
export default defineComponent({
  setup() {
    onMounted(() => {
      nextTick(() => {
        isoLayer = new IsoLayer(map, {
          opacity: 0.5,
          smooth: false,
          // lineType: "rect",
          moveType: "move",
          stroke: false,
        });
        gridLayer = new GridLayer(map, {
          color: "auto",
          showRect: false,
          lineWidth: 20,
          moveType: "move",
        });
        getImgData();
      });
    });
    onBeforeUnmount(() => {
      isoLayer.destroy();
      gridLayer.destroy();
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
