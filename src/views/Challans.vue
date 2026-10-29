<template>
  <div class="card">
    <h1>Delivery Challans</h1>
    <div class="toolbar">
      <router-link class="btn" to="/challans/new">+ New Challan</router-link>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <table>
      <thead>
        <tr>
          <th>No.</th>
          <th>Date</th>
          <th>Customer</th>
          <th>Lines</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in challans" :key="c._id">
          <td>{{ c.challanNo }}</td>
          <td>{{ formatDate(c.date) }}</td>
          <td>{{ c.customer?.name || '—' }}</td>
          <td>{{ c.lines?.length || 0 }}</td>
          <td class="actions">
            <button class="btn secondary" @click="download(c)">PDF</button>
            <router-link class="btn secondary" :to="`/challans/${c._id}`">Edit</router-link>
            <button class="btn danger" @click="remove(c._id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!challans.length" class="empty">No challans yet.</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { downloadPdf, request } from '../api/http'

const challans = ref([])
const error = ref('')

function formatDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
}

async function load() {
  try {
    challans.value = await request('/api/challans')
  } catch (e) {
    error.value = e.message
  }
}

async function download(c) {
  try {
    await downloadPdf(`/api/challans/${c._id}/pdf`, `delivery-challan-${c.challanNo}.pdf`)
  } catch (e) {
    error.value = e.message
  }
}

async function remove(id) {
  if (!confirm('Delete this challan?')) return
  await request(`/api/challans/${id}`, { method: 'DELETE' })
  await load()
}

onMounted(load)
</script>
