<template>
<div class="container">
    <head-nav-vue></head-nav-vue>
    <div id="main">
       <router-view />
    </div>
</div>

</template>
<script>
import HeadNavVue from './components/HeadNav.vue'
export default {
  components:{
    HeadNavVue
  }
}
</script>
<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
body{
  margin:0
}
.container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  #main{
    flex:1
  }
}
</style>
