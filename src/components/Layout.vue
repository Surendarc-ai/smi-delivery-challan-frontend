<template>
  <div class="layout">
    <aside class="sidebar">
      <p class="brand">Delivery Challan</p>
      <router-link class="nav-link" to="/challans">Challans</router-link>
      <router-link class="nav-link" to="/customers">Customers</router-link>
      <router-link class="nav-link" to="/items">Items</router-link>
      <button class="btn secondary" style="margin-top:auto" @click="logout">Logout</button>
    </aside>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { setToken } from '../api/http'

const router = useRouter()

function logout() {
  setToken(null)
  router.push({ name: 'Login' })
}
</script>
