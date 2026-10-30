<template>
  <div class="card">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
      <h1 class="mb-0">Customers</h1>
      <p v-if="total" class="empty m-0">Showing {{ customers.length }} of {{ total }}</p>
    </div>
    <div class="toolbar">
      <input
        v-model="search"
        class="input flex-1"
        placeholder="Search..."
        @input="onSearchInput"
      />
      <button type="button" class="btn" @click="openForm()">+ Add Customer</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>GSTIN</th>
            <th>Phone</th>
            <th>Bill To</th>
            <th>Ship To</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in customers" :key="c._id">
            <td>{{ c.name }}</td>
            <td>{{ c.gstin || '—' }}</td>
            <td>{{ c.phone || '—' }}</td>
            <td>{{ c.address || '—' }}</td>
            <td>
              {{
                c.shippingSameAsBilling === true
                  ? (c.address ? 'Same as bill' : '—')
                  : (c.shippingAddress || '—')
              }}
            </td>
            <td class="actions">
              <button type="button" class="btn secondary" @click="openForm(c)">Edit</button>
              <button type="button" class="btn danger" @click="remove(c._id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!customers.length && !loading" class="empty">No customers yet.</p>
    <p v-if="loading" class="empty mt-3">Loading…</p>
    <div ref="sentinel" class="h-4" aria-hidden="true" />
  </div>

  <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
    <div class="modal">
      <h2 class="m-0 mb-4 text-lg font-semibold text-slate-800">
        {{ editingId ? 'Edit' : 'Add' }} Customer
      </h2>
      <div class="grid-2">
        <div class="field">
          <label class="label">Name (M/s) *</label>
          <input v-model="form.name" class="input" />
        </div>
        <div class="field">
          <label class="label">GSTIN</label>
          <input v-model="form.gstin" class="input" />
        </div>
        <div class="field">
          <label class="label">Phone</label>
          <input v-model="form.phone" class="input" />
        </div>
        <div class="field">
          <label class="label">Email</label>
          <input v-model="form.email" class="input" />
        </div>
      </div>
      <div class="field">
        <label class="label">Bill To Address</label>
        <textarea v-model="form.address" class="input min-h-[70px]" />
      </div>
      <label class="flex items-center gap-2 mb-3 text-sm text-slate-700 cursor-pointer select-none">
        <input
          v-model="form.shippingSameAsBilling"
          type="checkbox"
          class="rounded border-slate-300"
          @change="onSameAsBillChange"
        />
        Ship To same as Bill To
      </label>
      <div class="field">
        <label class="label">Ship To Address</label>
        <textarea
          v-model="form.shippingAddress"
          class="input min-h-[70px]"
          :disabled="form.shippingSameAsBilling"
          :class="{ 'bg-slate-50 text-slate-500': form.shippingSameAsBilling }"
        />
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

const customers = ref([])
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
const form = reactive({
  name: '',
  gstin: '',
  phone: '',
  email: '',
  address: '',
  shippingSameAsBilling: false,
  shippingAddress: '',
})

let searchTimer = null
let observer = null

async function loadPage({ reset = false } = {}) {
  if (loading.value) return
  if (!reset && !hasMore.value) return

  loading.value = true
  error.value = ''
  try {
    const skip = reset ? 0 : customers.value.length
    const data = await request(
      `/api/customers?search=${encodeURIComponent(search.value)}&limit=${PAGE_SIZE}&skip=${skip}`,
    )
    const items = data.items || []
    total.value = data.total ?? items.length
    hasMore.value = Boolean(data.hasMore)
    customers.value = reset ? items : [...customers.value, ...items]
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

function onSameAsBillChange() {
  if (form.shippingSameAsBilling) {
    form.shippingAddress = form.address
  }
}

function openForm(c = null) {
  editingId.value = c?._id || null
  form.name = c?.name || ''
  form.gstin = c?.gstin || ''
  form.phone = c?.phone || ''
  form.email = c?.email || ''
  form.address = c?.address || ''
  form.shippingSameAsBilling = c?.shippingSameAsBilling === true
  form.shippingAddress = form.shippingSameAsBilling
    ? (c?.address || '')
    : (c?.shippingAddress || '')
  formError.value = ''
  showForm.value = true
}

async function save() {
  if (!form.name.trim()) {
    formError.value = 'Name is required'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await request(`/api/customers/${editingId.value}`, { method: 'PUT', body: JSON.stringify(form) })
    } else {
      await request('/api/customers', { method: 'POST', body: JSON.stringify(form) })
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
  if (!confirm('Delete this customer?')) return
  await request(`/api/customers/${id}`, { method: 'DELETE' })
  hasMore.value = true
  await loadPage({ reset: true })
}

function setupObserver() {
  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        loadPage()
      }
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
