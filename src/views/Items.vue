<template>
  <div class="card">
    <h1>Items</h1>
    <div class="toolbar">
      <input v-model="search" class="input" placeholder="Search description..." @input="load" />
      <button class="btn" @click="openForm()">+ Add Item</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Unit</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item._id">
          <td>{{ item.description }}</td>
          <td>{{ item.unit }}</td>
          <td class="actions">
            <button class="btn secondary" @click="openForm(item)">Edit</button>
            <button class="btn danger" @click="remove(item._id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!items.length" class="empty">No items yet. Add items like "Ms 8mm".</p>

    <div v-if="showForm" class="card" style="margin-top:16px;background:var(--primary-soft)">
      <h2 style="margin:0 0 12px;font-size:16px">{{ editingId ? 'Edit' : 'Add' }} Item</h2>
      <div class="grid-2">
        <div class="field">
          <label class="label">Description *</label>
          <input v-model="form.description" class="input" style="width:100%" placeholder="e.g. Ms 8mm" />
        </div>
        <div class="field">
          <label class="label">Unit</label>
          <input v-model="form.unit" class="input" style="width:100%" placeholder="Nos" />
        </div>
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

const items = ref([])
const search = ref('')
const error = ref('')
const showForm = ref(false)
const editingId = ref(null)
const form = reactive({ description: '', unit: 'Nos' })

async function load() {
  try {
    items.value = await request(`/api/items?search=${encodeURIComponent(search.value)}`)
  } catch (e) {
    error.value = e.message
  }
}

function openForm(item = null) {
  editingId.value = item?._id || null
  form.description = item?.description || ''
  form.unit = item?.unit || 'Nos'
  showForm.value = true
}

async function save() {
  try {
    if (editingId.value) {
      await request(`/api/items/${editingId.value}`, { method: 'PUT', body: JSON.stringify(form) })
    } else {
      await request('/api/items', { method: 'POST', body: JSON.stringify(form) })
    }
    showForm.value = false
    await load()
  } catch (e) {
    error.value = e.message
  }
}

async function remove(id) {
  if (!confirm('Delete this item?')) return
  await request(`/api/items/${id}`, { method: 'DELETE' })
  await load()
}

onMounted(load)
</script>
