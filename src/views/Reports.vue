<template>
  <div class="card">
    <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <h1 class="mb-1">Reports</h1>
        <p class="empty m-0">Select one or more items — filter by date and company.</p>
      </div>
      <button
        type="button"
        class="btn secondary"
        :disabled="!itemIds.length || loading || exporting || !report?.rows?.length"
        @click="exportExcel"
      >
        {{ exporting ? 'Exporting…' : 'Download Excel' }}
      </button>
    </div>

    <div class="grid-2 mb-5">
      <div class="field">
        <label class="label">Items *</label>
        <SearchableMultiSelect
          v-model="itemIds"
          placeholder="Select items"
          search-placeholder="Search items..."
          :load-options="loadItems"
          :option-label="itemOptionLabel"
        />
      </div>
      <div class="field">
        <label class="label">Company</label>
        <select v-model="companyId" class="select w-full min-w-0">
          <option value="">All companies</option>
          <option v-for="c in companies" :key="c.id || c._id" :value="c.id || c._id">
            {{ c.code }} — {{ c.name }}
          </option>
        </select>
      </div>
      <div class="field">
        <label class="label">From date</label>
        <input v-model="fromDate" type="date" class="input w-full min-w-0" />
      </div>
      <div class="field">
        <label class="label">To date</label>
        <input v-model="toDate" type="date" class="input w-full min-w-0" />
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="empty">Loading…</p>

    <template v-if="!loading && itemIds.length && report">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Customer</th>
              <th>DC No</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in report.rows" :key="idx">
              <td>{{ row.itemName }}</td>
              <td>{{ row.customer }}</td>
              <td>{{ row.dcNo }}</td>
              <td>{{ formatQty(row.qty, row.unit) }}</td>
            </tr>
          </tbody>
          <tfoot v-if="report.rows.length">
            <tr>
              <td colspan="3" class="font-semibold text-right">Total</td>
              <td class="font-semibold">{{ formatQty(report.totalQty) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p v-if="!report.rows.length" class="empty mt-3">No challan lines found for these filters.</p>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import SearchableMultiSelect from '../components/SearchableMultiSelect.vue'
import { getToken, request } from '../api/http'

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const itemIds = ref([])
const companyId = ref('')
const fromDate = ref('')
const toDate = ref('')
const companies = ref([])
const report = ref(null)
const loading = ref(false)
const exporting = ref(false)
const error = ref('')

function itemOptionLabel(item) {
  if (!item) return ''
  return item.hsnCode ? `${item.description} (HSN ${item.hsnCode})` : item.description
}

function formatQty(qty, unit) {
  const n = Number(qty) || 0
  return unit ? `${n} ${unit}` : String(n)
}

function queryString() {
  const params = new URLSearchParams()
  params.set('itemIds', itemIds.value.join(','))
  if (companyId.value) params.set('company', companyId.value)
  if (fromDate.value) params.set('from', fromDate.value)
  if (toDate.value) params.set('to', toDate.value)
  return params.toString()
}

async function loadItems({ search, skip, limit }) {
  return request(
    `/api/items?search=${encodeURIComponent(search || '')}&limit=${limit}&skip=${skip}`,
  )
}

async function loadCompanies() {
  const data = await request('/api/company?active=1')
  companies.value = data.items || []
}

async function loadReport() {
  if (!itemIds.value.length) {
    report.value = null
    return
  }
  loading.value = true
  error.value = ''
  try {
    report.value = await request(`/api/reports/by-item?${queryString()}`)
  } catch (e) {
    error.value = e.message
    report.value = null
  } finally {
    loading.value = false
  }
}

async function exportExcel() {
  if (!itemIds.value.length) return
  exporting.value = true
  error.value = ''
  try {
    const token = getToken()
    const res = await fetch(`${BASE}/api/reports/by-item/excel?${queryString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Excel export failed')
    }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `item-report.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
  } catch (e) {
    error.value = e.message
  } finally {
    exporting.value = false
  }
}

watch([itemIds, companyId, fromDate, toDate], () => {
  loadReport()
}, { deep: true })

onMounted(async () => {
  try {
    await loadCompanies()
  } catch (e) {
    error.value = e.message
  }
})
</script>
