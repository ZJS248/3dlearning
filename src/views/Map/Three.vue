<template>
  <div class="three">
    <div id="fps">{{ fps }}</div>
    <div id="scene"></div>
  </div>
</template>

<script>
import { setup } from "@/modules/Three";

export default {
  setup,
};
</script>

<style lang="scss">
.three {
  width: 100vw;
  height: calc(100vh - 60px);
  position: relative;
  #scene {
    width: 100%;
    height: 100%;
  }
  #fps {
    position: absolute;
    color: #fff;
    font-size: 32px;
    right: 10px;
    top: 10px;
  }
}
</style>
