<template>
  <div class="card">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
      <h1 class="mb-0">Items</h1>
      <p v-if="total" class="empty m-0">Showing {{ items.length }} of {{ total }}</p>
    </div>
    <div class="toolbar">
      <input
        v-model="search"
        class="input flex-1"
        placeholder="Search description or HSN..."
        @input="onSearchInput"
      />
      <button type="button" class="btn" @click="openForm()">+ Add Item</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>HSN Code</th>
          <th>Unit</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item._id">
          <td>{{ item.description }}</td>
          <td>{{ item.hsnCode || '—' }}</td>
          <td>{{ item.unit }}</td>
          <td class="actions">
            <button type="button" class="btn secondary" @click="openForm(item)">Edit</button>
            <button type="button" class="btn danger" @click="remove(item._id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!items.length && !loading" class="empty">No items yet. Add items like "Ms 8mm".</p>
    <p v-if="loading" class="empty mt-3">Loading…</p>
    <div ref="sentinel" class="h-4" aria-hidden="true" />
  </div>

  <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
    <div class="modal">
      <h2 class="m-0 mb-4 text-lg font-semibold text-slate-800">
        {{ editingId ? 'Edit' : 'Add' }} Item
      </h2>
      <div class="field">
        <label class="label">Description *</label>
        <input v-model="form.description" class="input" placeholder="e.g. Ms 8mm" />
      </div>
      <div class="grid-2">
        <div class="field">
          <label class="label">HSN Code</label>
          <input v-model="form.hsnCode" class="input" placeholder="e.g. 73089090" />
        </div>
        <div class="field">
          <label class="label">Unit</label>
          <input v-model="form.unit" class="input" placeholder="Nos" />
        </div>
      </div>
      <p v-if="formError" class="error mb-3">{{ formError }}</p>
      <div class="actions">
        <button type="button" class="btn" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button type="button" class="btn secondary" @click="showForm = false">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { request } from '../api/http'

const PAGE_SIZE = 30

const items = ref([])
const search = ref('')
const error = ref('')
const formError = ref('')
const showForm = ref(false)
const editingId = ref(null)
const saving = ref(false)
const loading = ref(false)
const total = ref(0)
const hasMore = ref(true)
const sentinel = ref(null)
const form = reactive({ description: '', hsnCode: '', unit: 'Nos' })

let searchTimer = null
let observer = null

async function loadPage({ reset = false } = {}) {
  if (loading.value) return
  if (!reset && !hasMore.value) return

  loading.value = true
  error.value = ''
  try {
    const skip = reset ? 0 : items.value.length
    const data = await request(
      `/api/items?search=${encodeURIComponent(search.value)}&limit=${PAGE_SIZE}&skip=${skip}`,
    )
    const page = data.items || []
    total.value = data.total ?? page.length
    hasMore.value = Boolean(data.hasMore)
    items.value = reset ? page : [...items.value, ...page]
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

function openForm(item = null) {
  editingId.value = item?._id || null
  form.description = item?.description || ''
  form.hsnCode = item?.hsnCode || ''
  form.unit = item?.unit || 'Nos'
  formError.value = ''
  showForm.value = true
}

async function save() {
  if (!form.description.trim()) {
    formError.value = 'Description is required'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await request(`/api/items/${editingId.value}`, { method: 'PUT', body: JSON.stringify(form) })
    } else {
      await request('/api/items', { method: 'POST', body: JSON.stringify(form) })
    }
    showForm.value = false
    hasMore.value = true
    await loadPage({ reset: true })
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function remove(id) {
  if (!confirm('Delete this item?')) return
  await request(`/api/items/${id}`, { method: 'DELETE' })
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
