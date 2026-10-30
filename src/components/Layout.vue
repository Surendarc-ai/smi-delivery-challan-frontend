<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Mobile overlay -->
    <div
      v-if="menuOpen"
      class="fixed inset-0 z-40 bg-black/40 md:hidden"
      @click="menuOpen = false"
    />

    <aside
      class="fixed md:static z-50 h-screen shrink-0 w-56 bg-slate-800 text-slate-200 flex flex-col py-4 transition-transform duration-200 md:translate-x-0"
      :class="menuOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex items-center gap-2 px-4 text-xl font-bold border-b border-slate-700 mb-4 pb-4">
        <Truck :size="22" class="text-blue-400 shrink-0" />
        <span>Delivery Challan</span>
      </div>

      <nav class="flex flex-col gap-1 px-2">
        <router-link to="/company" class="nav-link" title="Companies" @click="menuOpen = false">
          <Building2 :size="18" class="shrink-0" />
          <span>Companies</span>
        </router-link>
        <router-link to="/customers" class="nav-link" title="Customers" @click="menuOpen = false">
          <Users :size="18" class="shrink-0" />
          <span>Customers</span>
        </router-link>
        <router-link to="/items" class="nav-link" title="Items" @click="menuOpen = false">
          <Package :size="18" class="shrink-0" />
          <span>Items</span>
        </router-link>
        <router-link to="/challans" class="nav-link" title="Challans" @click="menuOpen = false">
          <FileText :size="18" class="shrink-0" />
          <span>Challans</span>
        </router-link>
        <router-link to="/reports" class="nav-link" title="Reports" @click="menuOpen = false">
          <BarChart3 :size="18" class="shrink-0" />
          <span>Reports</span>
        </router-link>
        <router-link to="/pdf-format" class="nav-link" title="PDF Format" @click="menuOpen = false">
          <Settings2 :size="18" class="shrink-0" />
          <span>PDF Format</span>
        </router-link>
      </nav>

      <div class="mt-auto px-2 pt-4 border-t border-slate-700">
        <button
          type="button"
          class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-transparent border border-slate-600 text-slate-400 rounded-md text-sm hover:bg-slate-700 hover:text-slate-100 cursor-pointer"
          @click="logout"
        >
          <LogOut :size="16" class="shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-800 text-slate-100 shrink-0">
        <button
          type="button"
          class="p-1.5 rounded-md hover:bg-slate-700"
          aria-label="Open menu"
          @click="menuOpen = true"
        >
          <Menu :size="22" />
        </button>
        <span class="font-semibold">Delivery Challan</span>
      </header>

      <main class="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  Truck,
  FileText,
  Users,
  Package,
  Building2,
  Settings2,
  BarChart3,
  LogOut,
  Menu,
} from '@lucide/vue'
import { useRouter } from 'vue-router'
import { setToken } from '../api/http'

const router = useRouter()
const menuOpen = ref(false)

function logout() {
  setToken(null)
  menuOpen.value = false
  router.push({ name: 'Login' })
}
</script>
