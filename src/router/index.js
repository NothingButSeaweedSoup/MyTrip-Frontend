import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import LoginPage from '@/pages/LoginPage.vue'
import RegisterPage from '@/pages/RegisterPage.vue'
import PostDetailPage from '@/pages/PostDetailPage.vue'
import FavoritesPage from '@/pages/FavoritesPage.vue'
import ProfilePage from '@/pages/ProfilePage.vue'
import EditProfilePage from '@/pages/EditProfilePage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import ChangePasswordPage from '@/pages/ChangePasswordPage.vue'
import PublishPage from '@/pages/PublishPage.vue'
import AdminPage from '@/pages/AdminPage.vue'
import ReviewPage from '@/pages/ReviewPage.vue'
import { useAuth } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterPage,
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: FavoritesPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfilePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/profile/edit',
    name: 'EditProfile',
    component: EditProfilePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings/password',
    name: 'ChangePassword',
    component: ChangePasswordPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/publish',
    name: 'Publish',
    component: PublishPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/post/:id',
    name: 'PostDetail',
    component: PostDetailPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminPage,
    meta: { requiresAdmin: true },
  },
  {
    path: '/review',
    name: 'Review',
    component: ReviewPage,
    meta: { requiresReviewer: true },
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
