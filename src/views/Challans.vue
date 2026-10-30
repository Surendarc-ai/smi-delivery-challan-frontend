<template>
  <div class="card">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
      <h1 class="mb-0">Delivery Challans</h1>
      <p v-if="total" class="empty m-0">Showing {{ challans.length }} of {{ total }}</p>
    </div>
    <div class="toolbar">
      <input
        v-model="search"
        class="input flex-1"
        placeholder="Search challan no / DC no / GSTIN..."
        @input="onSearchInput"
      />
      <router-link class="btn" to="/challans/new">+ New Challan</router-link>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <table>
      <thead>
        <tr>
          <th>Company</th>
          <th>No.</th>
          <th>Date</th>
          <th>Customer</th>
          <th>Lines</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in challans" :key="c._id">
          <td>{{ c.company?.code || '—' }}</td>
          <td>{{ formatChallanNo(c.company?.code, c.challanNo) }}</td>
          <td>{{ formatDate(c.date) }}</td>
          <td>{{ c.customer?.name || '—' }}</td>
          <td>{{ c.lines?.length || 0 }}</td>
          <td class="actions">
            <button type="button" class="btn secondary" @click="download(c)">PDF</button>
            <router-link class="btn secondary" :to="`/challans/${c._id}`">Edit</router-link>
            <button type="button" class="btn danger" @click="remove(c._id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!challans.length && !loading" class="empty">No challans yet.</p>
    <p v-if="loading" class="empty mt-3">Loading…</p>
    <div ref="sentinel" class="h-4" aria-hidden="true" />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { downloadPdf, request } from '../api/http'
import { formatChallanNo } from '../utils/challanNo'

const PAGE_SIZE = 30

const challans = ref([])
const search = ref('')
const error = ref('')
const loading = ref(false)
const total = ref(0)
const hasMore = ref(true)
const sentinel = ref(null)

let searchTimer = null
let observer = null

function formatDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
}

async function loadPage({ reset = false } = {}) {
  if (loading.value) return
  if (!reset && !hasMore.value) return

  loading.value = true
  error.value = ''
  try {
    const skip = reset ? 0 : challans.value.length
    const data = await request(
      `/api/challans?search=${encodeURIComponent(search.value)}&limit=${PAGE_SIZE}&skip=${skip}`,
    )
    const page = data.items || []
    total.value = data.total ?? page.length
    hasMore.value = Boolean(data.hasMore)
    challans.value = reset ? page : [...challans.value, ...page]
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    hasMore.value = true
    loadPage({ reset: true })
  }, 250)
}

async function download(c) {
  try {
    await downloadPdf(
      `/api/challans/${c._id}/pdf`,
      `delivery-challan-${formatChallanNo(c.company?.code, c.challanNo).replaceAll('/', '-')}.pdf`,
    )
  } catch (e) {
    error.value = e.message
  }
}

async function remove(id) {
  if (!confirm('Delete this challan?')) return
  await request(`/api/challans/${id}`, { method: 'DELETE' })
  hasMore.value = true
  await loadPage({ reset: true })
}

function setupObserver() {
  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) loadPage()
    },
    { root: null, rootMargin: '200px', threshold: 0 },
  )
  if (sentinel.value) observer.observe(sentinel.value)
}

onMounted(async () => {
  await loadPage({ reset: true })
  await nextTick()
  setupObserver()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  observer?.disconnect()
})
</script>
