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
    {
      path: "/nieuwesessie",
      name: "nieuwesessie",
      component: () => import("../views/NewSession.vue"),
      children: [
        {
          path: "nieuwe-activiteit",
          name: "nieuwe-activiteit",
          component: () => import("../views/NewActivity.vue"),
        },
      ],
    },
    {
      path: "/bigscreen/qrscreen",
      name: "qrscreen",
      component: () => import("../views/bigscreen/QrScreen.vue"),
    },
    {
      path: "/bigscreen/countdownscreen",
      name: "countdown",
      component: () => import("../views/bigscreen/CountdownScreen.vue"),
    },
    {
      path: "/bigscreen/loadingScreen",
      name: "loadingScreen",
      component: () => import("../views/bigscreen/LoadingScreen.vue"),
    },
    {
      path: "/bigscreen/podiumscreen",
      name: "podiumscreen",
      component: () => import("../views/bigscreen/PodiumScreen.vue"),
    },
    {
      path: "/bigscreen/scorescreen",
      name: "scorescreen",
      component: () => import("../views/bigscreen/ScoreScreen.vue"),
    },
    {
      path: "/sessionmanagment",
      name: "sessionmanagment",
      component: () => import("../views/SessionManagment.vue"),
    },
    {
      path: '/session/:id',
      name: 'SessionOverview',
      component: () => import('@/views/SessionOverview.vue')
    }
  ],
});

export default router;
