<template>
  <div class="card">
    <h1>Customers</h1>
    <div class="toolbar">
      <input v-model="search" class="input" placeholder="Search..." @input="load" />
      <button class="btn" @click="openForm()">+ Add Customer</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>GSTIN</th>
          <th>Phone</th>
          <th>Address</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in customers" :key="c._id">
          <td>{{ c.name }}</td>
          <td>{{ c.gstin || '—' }}</td>
          <td>{{ c.phone || '—' }}</td>
          <td>{{ c.address || '—' }}</td>
          <td class="actions">
            <button class="btn secondary" @click="openForm(c)">Edit</button>
            <button class="btn danger" @click="remove(c._id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!customers.length" class="empty">No customers yet.</p>

    <div v-if="showForm" class="card" style="margin-top:16px;background:var(--primary-soft)">
      <h2 style="margin:0 0 12px;font-size:16px">{{ editingId ? 'Edit' : 'Add' }} Customer</h2>
      <div class="grid-2">
        <div class="field">
          <label class="label">Name (M/s) *</label>
          <input v-model="form.name" class="input" style="width:100%" />
        </div>
        <div class="field">
          <label class="label">GSTIN</label>
          <input v-model="form.gstin" class="input" style="width:100%" />
        </div>
        <div class="field">
          <label class="label">Phone</label>
          <input v-model="form.phone" class="input" style="width:100%" />
        </div>
        <div class="field">
          <label class="label">Email</label>
          <input v-model="form.email" class="input" style="width:100%" />
        </div>
      </div>
      <div class="field">
        <label class="label">Address</label>
        <textarea v-model="form.address" class="input" style="width:100%;min-height:70px" />
      </div>
      <div class="actions">
        <button class="btn" @click="save">Save</button>
        <button class="btn secondary" @click="showForm = false">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { request } from '../api/http'

const customers = ref([])
const search = ref('')
const error = ref('')
const showForm = ref(false)
const editingId = ref(null)
const form = reactive({ name: '', gstin: '', phone: '', email: '', address: '' })

async function load() {
  try {
    customers.value = await request(`/api/customers?search=${encodeURIComponent(search.value)}`)
  } catch (e) {
    error.value = e.message
  }
}

function openForm(c = null) {
  editingId.value = c?._id || null
  form.name = c?.name || ''
  form.gstin = c?.gstin || ''
  form.phone = c?.phone || ''
  form.email = c?.email || ''
  form.address = c?.address || ''
  showForm.value = true
}

async function save() {
  try {
    if (editingId.value) {
      await request(`/api/customers/${editingId.value}`, { method: 'PUT', body: JSON.stringify(form) })
    } else {
      await request('/api/customers', { method: 'POST', body: JSON.stringify(form) })
    }
    showForm.value = false
    await load()
  } catch (e) {
    error.value = e.message
  }
}

async function remove(id) {
  if (!confirm('Delete this customer?')) return
  await request(`/api/customers/${id}`, { method: 'DELETE' })
  await load()
}

onMounted(load)
</script>
