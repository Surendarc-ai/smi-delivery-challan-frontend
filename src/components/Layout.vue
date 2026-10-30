<template>
  <div class="flex h-screen overflow-hidden">
    <aside class="h-screen shrink-0 w-56 bg-slate-800 text-slate-200 flex flex-col py-4">
      <div class="flex items-center gap-2 px-4 text-xl font-bold border-b border-slate-700 mb-4 pb-4">
        <Truck :size="22" class="text-blue-400 shrink-0" />
        <span>Delivery Challan</span>
      </div>

      <nav class="flex flex-col gap-1 px-2">
        <router-link to="/company" class="nav-link" title="Company">
          <Building2 :size="18" class="shrink-0" />
          <span>Company</span>
        </router-link>
        <router-link to="/customers" class="nav-link" title="Customers">
          <Users :size="18" class="shrink-0" />
          <span>Customers</span>
        </router-link>
        <router-link to="/items" class="nav-link" title="Items">
          <Package :size="18" class="shrink-0" />
          <span>Items</span>
        </router-link>
        <router-link to="/challans" class="nav-link" title="Challans">
          <FileText :size="18" class="shrink-0" />
          <span>Challans</span>
        </router-link>
        <router-link to="/pdf-format" class="nav-link" title="PDF Format">
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

    <main class="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { Truck, FileText, Users, Package, Building2, Settings2, LogOut } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { setToken } from '../api/http'

const router = useRouter()

function logout() {
  setToken(null)
  router.push({ name: 'Login' })
}
</script>
