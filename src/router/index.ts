import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage.vue'),
    },
    {
      path: '/novel/:id',
      name: 'novel-detail',
      component: () => import('@/views/NovelDetail.vue'),
    },
  ],
})

export default router
