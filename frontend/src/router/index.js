import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../views/HomePage.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomePage,
    },
    {
      path: "/templates",
      name: "templates",
      component: () => import("../views/Templates.vue"),
    },
    {
      path: "/geschiedenis",
      name: "geschiedenis",
      component: () => import("../views/History.vue"),
    },
    {
      path: "/actief",
      name: "actief",
      component: () => import("../views/Active.vue"),
    },
  ],
});

export default router;
