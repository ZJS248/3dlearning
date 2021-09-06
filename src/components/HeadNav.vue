<template>
  <div class="head-nav">
    <div class="logo">
      <div class="img">
        <img src="../assets/logo.png" alt="" />
      </div>
      <router-link to="/">城市内涝防灾减灾服务系统</router-link>
      <router-link to="/">
        <img src="@/assets/home-router.png" alt="" />
      </router-link>
    </div>
    <div class="router">
      <div class="router-menu">
        <router-link to="/Layer" class="link-item">
          <img src="../assets/监测.svg" alt="" />
          <div>色斑格点</div>
        </router-link>
        <router-link to="/Wind" class="link-item">
          <img src="../assets/预警.svg" alt="" />
          <div>风</div>
        </router-link>
        <router-link to="/Cesium" class="link-item">
          <img src="../assets/雷达.svg" alt="" />
          <div>Cesium3D</div>
        </router-link>
        <router-link to="/About" class="link-item">
          <img src="../assets/云图.svg" alt="" />
          <div>about</div>
        </router-link>
        <router-link to="/Three" class="link-item">
          <img src="../assets/检验.svg" alt="" />
          <div>Three.js</div>
        </router-link>
        <a class="link-item">
          <img src="../assets/历史.svg" alt="" />
          <div>历史统计</div>
        </a>
        <a class="link-item">
          <img src="../assets/产品.svg" alt="" />
          <div>产品制作</div>
        </a>
        <a class="link-item">
          <img src="../assets/信息.svg" alt="" />
          <div>信息管理</div>
        </a>
      </div>
      <div class="router-manager">
        <div class="dateTime">
          <div>{{ date }}</div>
          <div>{{ time }}</div>
        </div>
        <div class="manager-item">
          <router-link to="/About">
            <img src="../assets/用户.svg" alt="" />
          </router-link>
        </div>
        <div class="manager-item">
          <img src="../assets/登出.svg" alt="" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from "vue";
import moment from "moment";
export default {
  setup() {
    const now = ref(new Date());
    const updateClock = () => {
      now.value = new Date();
      requestAnimationFrame(updateClock);
    };
    requestAnimationFrame(updateClock);
    const date = computed(() => moment(now.value).format("YYYY-MM-DD"));
    const time = computed(() => moment(now.value).format("HH:mm:ss"));
    return {
      date,
      time,
    };
  },
};
</script>

<style lang="scss" scoped>
.head-nav {
  width: 100vw;
  height: 60px;
  background: #173047;
  display: flex;
  justify-content: space-between;
  text-align: center;
  white-space: nowrap;
  min-width: 1380px;
  .logo {
    display: flex;
    height: 60px;
    margin: 0 13px 0 13px;
    align-items: center;
    font-size: 24px;
    background: -webkit-linear-gradient(#ffffff 0%, #aed7fc 100%);
    background-clip: text;
    -webkit-text-fill-color: transparent;
    flex: 3;
    .img {
      height: 100%;
      display: flex;
      align-items: center;
      margin: 0 13px;
      font-weight: 400;
      line-height: 32px;
    }
  }
  .router {
    display: flex;
    font-size: 14px;
    line-height: 16px;
    flex: 4;
    justify-content: space-between;
    a {
      color: white;
      text-decoration: none;
    }
    .router-menu {
      display: flex;
      .link-item {
        height: 50px;
        width: 95px;
        padding: 10px 0 0px 0;
        cursor: pointer;
        &.router-link-active {
          background: #32a2e1;
        }
      }
    }
    .router-manager {
      display: flex;
      align-items: center;
      margin: 0 5px 0 0px;
      .dateTime {
        color: white;
        margin-right: 23px;
      }
      .manager-item {
        cursor: pointer;
        width: 22px;
        height: 22px;
        padding: 0 16px;
        border-left: 1px solid white;
        display: flex;
        align-items: center;
        align-content: center;
      }
    }
  }
}
</style>
