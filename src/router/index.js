import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/HomePage.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/pages/RegisterPage.vue'),
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('@/pages/FavoritesPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/pages/ProfilePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile/edit',
    name: 'EditProfile',
    component: () => import('@/pages/EditProfilePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/pages/SettingsPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings/password',
    name: 'ChangePassword',
    component: () => import('@/pages/ChangePasswordPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/pages/SearchResultsPage.vue'),
  },
  {
    path: '/publish',
    name: 'Publish',
    component: () => import('@/pages/PublishPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/post/:id',
    name: 'PostDetail',
    component: () => import('@/pages/PostDetailPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/pages/AdminPage.vue'),
    meta: { requiresAdmin: true },
  },
  {
    path: '/review',
    name: 'Review',
    component: () => import('@/pages/ReviewPage.vue'),
    meta: { requiresReviewer: true },
  },
  {
    path: '/trip',
    name: 'TripPlan',
    component: () => import('@/pages/TripPlanPage.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const { isLoggedIn, user } = useAuth()

  if (to.meta.requiresAuth && !isLoggedIn.value) {
    next('/login')
    return
  }
  if (to.meta.requiresAdmin) {
    if (user.value?.role !== 9) {
      next('/')
      return
    }
  }
  if (to.meta.requiresReviewer) {
    if (user.value?.role !== 1 && user.value?.role !== 9) {
      next('/')
      return
    }
  }
  next()
})

export default router
