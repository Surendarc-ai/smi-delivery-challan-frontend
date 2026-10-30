import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '../api/http'
import Login from '../views/Login.vue'
import Layout from '../components/Layout.vue'
import Customers from '../views/Customers.vue'
import Items from '../views/Items.vue'
import Challans from '../views/Challans.vue'
import ChallanForm from '../views/ChallanForm.vue'
import Company from '../views/Company.vue'
import PdfFormat from '../views/PdfFormat.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: Login, meta: { public: true } },
    {
      path: '/',
      component: Layout,
      children: [
        { path: '', redirect: '/challans' },
        { path: 'customers', name: 'Customers', component: Customers },
        { path: 'items', name: 'Items', component: Items },
        { path: 'challans', name: 'Challans', component: Challans },
        { path: 'challans/new', name: 'ChallanNew', component: ChallanForm },
        { path: 'challans/:id', name: 'ChallanEdit', component: ChallanForm },
        { path: 'company', name: 'Company', component: Company },
        { path: 'pdf-format', name: 'PdfFormat', component: PdfFormat },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const authed = !!getToken()
  if (!to.meta.public && !authed) next({ name: 'Login' })
  else if (to.name === 'Login' && authed) next({ name: 'Challans' })
  else next()
})

export default router
