<template>about</template>

<script>
import axios from "axios";
import { onMounted } from "@vue/runtime-core";
export default {
  setup() {
    function test() {
      axios
        .get(`https://geo.datav.aliyun.com/areas_v3/bound/330000_full.json`)
        .then((res) => {
          console.log(res);
        });
    }
    onMounted(() => {
      test();
    });
    return {};
  },
};
</script>

<style></style>
