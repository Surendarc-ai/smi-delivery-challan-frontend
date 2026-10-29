<template>
  <div class="card">
    <h1>{{ isEdit ? `Edit Challan #${form.challanNo || ''}` : 'New Delivery Challan' }}</h1>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="grid-2">
      <div class="field">
        <label class="label">Customer (M/s) *</label>
        <select v-model="form.customer" class="select" style="width:100%" required>
          <option value="">Select customer</option>
          <option v-for="c in customers" :key="c._id" :value="c._id">{{ c.name }}</option>
        </select>
      </div>
      <div class="field">
        <label class="label">Date *</label>
        <input v-model="form.date" type="date" class="input" style="width:100%" />
      </div>
      <div class="field">
        <label class="label">Party's D.C. No.</label>
        <input v-model="form.partyDcNo" class="input" style="width:100%" />
      </div>
      <div class="field">
        <label class="label">Party D.C. Date</label>
        <input v-model="form.partyDcDate" type="date" class="input" style="width:100%" />
      </div>
      <div class="field">
        <label class="label">Party GSTIN</label>
        <input v-model="form.partyGstin" class="input" style="width:100%" />
      </div>
    </div>

    <h2 style="font-size:15px;margin:18px 0 10px">Line items</h2>
    <div v-for="(line, idx) in form.lines" :key="idx" class="line-row">
      <select v-model="line.itemId" class="select" @change="onItemPick(line)">
        <option value="">Custom / pick item</option>
        <option v-for="item in items" :key="item._id" :value="item._id">{{ item.description }}</option>
      </select>
      <input v-model="line.description" class="input" placeholder="Description" />
      <input v-model="line.quantity" type="number" min="0" step="1" class="input" placeholder="Qty" />
      <input v-model="line.unit" class="input" placeholder="Nos" />
      <button class="btn danger" type="button" @click="form.lines.splice(idx, 1)">×</button>
    </div>
    <button class="btn secondary" type="button" @click="addLine">+ Add line</button>

    <div class="actions" style="margin-top:20px">
      <button class="btn" :disabled="saving" @click="save">{{ saving ? 'Saving...' : 'Save' }}</button>
      <button v-if="isEdit" class="btn secondary" @click="download">Download PDF</button>
      <router-link class="btn secondary" to="/challans">Cancel</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadPdf, request } from '../api/http'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const customers = ref([])
const items = ref([])
const error = ref('')
const saving = ref(false)

const form = reactive({
  challanNo: '',
  customer: '',
  date: new Date().toISOString().slice(0, 10),
  partyDcNo: '',
  partyDcDate: '',
  partyGstin: '',
  lines: [{ itemId: '', description: '', quantity: '', unit: 'Nos' }],
})

function addLine() {
  form.lines.push({ itemId: '', description: '', quantity: '', unit: 'Nos' })
}

function onItemPick(line) {
  const item = items.value.find((i) => i._id === line.itemId)
  if (item) {
    line.description = item.description
    line.unit = item.unit || 'Nos'
  }
}

async function loadMeta() {
  customers.value = await request('/api/customers')
  items.value = await request('/api/items')
}

async function loadChallan() {
  if (!isEdit.value) return
  const c = await request(`/api/challans/${route.params.id}`)
  form.challanNo = c.challanNo
  form.customer = c.customer?._id || c.customer
  form.date = c.date ? new Date(c.date).toISOString().slice(0, 10) : ''
  form.partyDcNo = c.partyDcNo || ''
  form.partyDcDate = c.partyDcDate ? new Date(c.partyDcDate).toISOString().slice(0, 10) : ''
  form.partyGstin = c.partyGstin || ''
  form.lines = (c.lines || []).map((l) => ({
    itemId: '',
    description: l.description,
    quantity: l.quantity,
    unit: l.unit || 'Nos',
  }))
  if (!form.lines.length) addLine()
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      customer: form.customer,
      date: form.date,
      partyDcNo: form.partyDcNo,
      partyDcDate: form.partyDcDate || null,
      partyGstin: form.partyGstin,
      lines: form.lines
        .filter((l) => l.description?.trim())
        .map((l) => ({
          description: l.description,
          quantity: Number(l.quantity) || 0,
          unit: l.unit || 'Nos',
        })),
    }
    if (!payload.customer || !payload.date) throw new Error('Customer and date are required')
    if (!payload.lines.length) throw new Error('Add at least one line item')

    if (isEdit.value) {
      await request(`/api/challans/${route.params.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    } else {
      const created = await request('/api/challans', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      router.replace(`/challans/${created._id}`)
      return
    }
    router.push('/challans')
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function download() {
  try {
    await downloadPdf(
      `/api/challans/${route.params.id}/pdf`,
      `delivery-challan-${form.challanNo || 'draft'}.pdf`,
    )
  } catch (e) {
    error.value = e.message
  }
}

onMounted(async () => {
  try {
    await loadMeta()
    await loadChallan()
  } catch (e) {
    error.value = e.message
  }
})
</script>
