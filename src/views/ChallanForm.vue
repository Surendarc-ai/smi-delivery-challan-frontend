<template>
  <div class="card">
    <h1>{{ isEdit ? `Edit Challan #${form.challanNo || ''}` : 'New Delivery Challan' }}</h1>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="grid-2">
      <div class="field">
        <label class="label">Challan No.</label>
        <input
          class="input w-full min-w-0 bg-slate-50 text-slate-700"
          :value="challanNoDisplay"
          readonly
          tabindex="-1"
        />
        <p v-if="!isEdit" class="empty mt-1 text-xs">Number is auto-generated on save</p>
      </div>
      <div class="field">
        <label class="label">Date *</label>
        <input v-model="form.date" type="date" class="input w-full min-w-0" />
      </div>
      <div class="field">
        <label class="label">Customer (M/s) *</label>
        <SearchableSelect
          v-model="form.customer"
          placeholder="Select customer"
          search-placeholder="Type to search customers..."
          :load-options="loadCustomers"
          option-label="name"
          :initial-option="selectedCustomer"
          @select="onCustomerSelect"
        />
      </div>
      <div class="field">
        <label class="label">Party's D.C. No.</label>
        <input v-model="form.partyDcNo" class="input w-full min-w-0" />
      </div>
      <div class="field">
        <label class="label">Party D.C. Date</label>
        <input v-model="form.partyDcDate" type="date" class="input w-full min-w-0" />
      </div>
      <div class="field">
        <label class="label">Party GSTIN</label>
        <input v-model="form.partyGstin" class="input w-full min-w-0" />
      </div>
    </div>

    <h2 class="text-[15px] font-semibold mt-[18px] mb-2.5 text-slate-800">Line items</h2>
    <div class="line-row line-row-head hidden md:grid">
      <span class="label mb-0">Item</span>
      <span class="label mb-0">Description</span>
      <span class="label mb-0">Qty</span>
      <span class="label mb-0">Unit</span>
      <span></span>
    </div>
    <div v-for="(line, idx) in form.lines" :key="idx" class="line-row">
      <SearchableSelect
        v-model="line.itemId"
        placeholder="Select item"
        search-placeholder="Search items..."
        :load-options="loadItems"
        :option-label="itemOptionLabel"
        :initial-option="line.itemOption"
        @select="(item) => onItemSelect(line, item)"
      />
      <input
        v-model="line.description"
        class="input"
        placeholder="Description (editable)"
      />
      <input v-model="line.quantity" type="number" min="0" step="1" class="input" placeholder="Qty" />
      <input v-model="line.unit" class="input" placeholder="Nos" />
      <button class="btn danger" type="button" @click="form.lines.splice(idx, 1)">×</button>
    </div>
    <button class="btn secondary" type="button" @click="addLine">+ Add line</button>

    <div class="field mt-5">
      <label class="label">Summary</label>
      <textarea
        v-model="form.notes"
        class="input w-full min-w-0 min-h-[100px]"
        placeholder="Add summary or notes for this challan..."
      />
    </div>

    <div class="actions mt-5">
      <button class="btn" :disabled="saving" @click="save">{{ saving ? 'Saving...' : 'Save' }}</button>
      <button v-if="isEdit" class="btn secondary" type="button" @click="download">Download PDF</button>
      <router-link class="btn secondary" to="/challans">Cancel</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SearchableSelect from '../components/SearchableSelect.vue'
import { downloadPdf, request } from '../api/http'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const selectedCustomer = ref(null)
const nextChallanNo = ref(null)
const error = ref('')
const saving = ref(false)

const form = reactive({
  challanNo: '',
  customer: '',
  date: new Date().toISOString().slice(0, 10),
  partyDcNo: '',
  partyDcDate: '',
  partyGstin: '',
  notes: '',
  lines: [emptyLine()],
})

const challanNoDisplay = computed(() => {
  if (isEdit.value && form.challanNo !== '') return String(form.challanNo)
  if (nextChallanNo.value != null) return String(nextChallanNo.value)
  return 'Auto'
})

function emptyLine() {
  return { itemId: '', itemOption: null, description: '', quantity: '', unit: 'Nos' }
}

function addLine() {
  form.lines.push(emptyLine())
}

async function loadCustomers({ search, skip, limit }) {
  return request(
    `/api/customers?search=${encodeURIComponent(search || '')}&limit=${limit}&skip=${skip}`,
  )
}

async function loadItems({ search, skip, limit }) {
  return request(
    `/api/items?search=${encodeURIComponent(search || '')}&limit=${limit}&skip=${skip}`,
  )
}

function onCustomerSelect(customer) {
  selectedCustomer.value = customer
  if (customer?.gstin && !form.partyGstin) {
    form.partyGstin = customer.gstin
  }
}

function itemOptionLabel(item) {
  if (!item) return ''
  return item.hsnCode ? `${item.description} (HSN ${item.hsnCode})` : item.description
}

function onItemSelect(line, item) {
  if (!item) return
  line.itemId = item._id || ''
  line.itemOption = item
  // Selecting an item always fills description; user can still edit afterward
  line.description = item.description || ''
  line.unit = item.unit || line.unit || 'Nos'
}

async function loadChallan() {
  if (!isEdit.value) return
  const c = await request(`/api/challans/${route.params.id}`)
  form.challanNo = c.challanNo
  form.customer = c.customer?._id || c.customer || ''
  selectedCustomer.value = c.customer && typeof c.customer === 'object' ? c.customer : null
  form.date = c.date ? new Date(c.date).toISOString().slice(0, 10) : ''
  form.partyDcNo = c.partyDcNo || ''
  form.partyDcDate = c.partyDcDate ? new Date(c.partyDcDate).toISOString().slice(0, 10) : ''
  form.partyGstin = c.partyGstin || ''
  form.notes = c.notes || ''
  form.lines = (c.lines || []).map((l) => {
    const item = l.item && typeof l.item === 'object' ? l.item : null
    return {
      itemId: item?._id || l.item || '',
      itemOption: item,
      description: l.description || '',
      quantity: l.quantity,
      unit: l.unit || 'Nos',
    }
  })
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
      notes: form.notes,
      lines: form.lines
        .filter((l) => l.description?.trim())
        .map((l) => ({
          itemId: l.itemId || null,
          description: l.description.trim(),
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

async function loadNextNumber() {
  if (isEdit.value) return
  const data = await request('/api/challans/next-number')
  nextChallanNo.value = data.challanNo
}

onMounted(async () => {
  try {
    await Promise.all([loadNextNumber(), loadChallan()])
  } catch (e) {
    error.value = e.message
  }
})
</script>
