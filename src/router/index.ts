import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Map",
    component: () => import("@/views/Map.vue"),
    children: [
      {
        path: "/Layer",
        name: "Layer",
        component: () => import("@/views/Map/Layer.vue"),
      },
      {
        path: "/Wind",
        name: "Wind",
        component: () => import("@/views/Map/Wind.vue"),
      },
    ],
  },
  {
    path: "/Cesium",
    name: "Cesium",
    component: () => import("@/views/Map/Cesium.vue"),
  },
  {
    path: "/Three",
    name: "Three",
    component: () => import("@/views/Map/Three.vue"),
  },
  {
    path: "/About",
    name: "About",
    component: () =>
      import(/* webpackChunkName: "about" */ "../views/About.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
