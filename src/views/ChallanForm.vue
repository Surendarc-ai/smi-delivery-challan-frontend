<template>
  <div class="card">
    <h1>{{ isEdit ? `Edit Challan ${challanNoDisplay}` : 'New Delivery Challan' }}</h1>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="grid-2">
      <div class="field">
        <label class="label">Company *</label>
        <select
          v-model="form.company"
          class="select w-full min-w-0"
          :disabled="isEdit"
          @change="onCompanyChange"
        >
          <option value="" disabled>Select company</option>
          <option v-for="c in companies" :key="c.id || c._id" :value="c.id || c._id">
            {{ c.code }} — {{ c.name }}
          </option>
        </select>
      </div>
      <div class="field">
        <label class="label">Challan No.</label>
        <input
          class="input w-full min-w-0 bg-slate-50 text-slate-700"
          :value="challanNoDisplay"
          readonly
          tabindex="-1"
        />
        <p v-if="!isEdit" class="empty mt-1 text-xs">
          Auto number for selected company (next on save)
        </p>
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
      <button v-if="isEdit" class="btn secondary" type="button" @click="download">View PDF</button>
      <router-link class="btn secondary" to="/challans">Cancel</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SearchableSelect from '../components/SearchableSelect.vue'
import { downloadPdf, request } from '../api/http'
import { formatChallanNo } from '../utils/challanNo'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const selectedCustomer = ref(null)
const companies = ref([])
const nextChallanNo = ref(null)
const error = ref('')
const saving = ref(false)

const form = reactive({
  company: '',
  challanNo: '',
  customer: '',
  date: new Date().toISOString().slice(0, 10),
  partyDcNo: '',
  partyDcDate: '',
  partyGstin: '',
  notes: '',
  lines: [emptyLine()],
})

const selectedCompanyCode = computed(() => {
  const c = companies.value.find((x) => String(x.id || x._id) === String(form.company))
  return c?.code || ''
})

const challanNoDisplay = computed(() => {
  const no = isEdit.value && form.challanNo !== ''
    ? form.challanNo
    : nextChallanNo.value
  if (!selectedCompanyCode.value && (no == null || no === '')) return 'Auto'
  return formatChallanNo(selectedCompanyCode.value, no)
})

function emptyLine() {
  return {
    itemId: '',
    itemName: '',
    itemOption: null,
    description: '',
    hsnCode: '',
    quantity: '',
    unit: 'Nos',
  }
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
  const prevItemName = line.itemName || line.itemOption?.description || ''
  const current = (line.description || '').trim()
  // Fill description only when empty or still the previous item's text —
  // keep manual values like TOP / BOTTOM / DOOR.
  const shouldFillDescription = !current || current === prevItemName

  line.itemId = item._id || ''
  line.itemName = item.description || ''
  line.itemOption = item
  line.hsnCode = item.hsnCode || ''
  if (shouldFillDescription) {
    line.description = item.description || ''
  }
  if (!line.unit?.trim() || line.unit === 'Nos') {
    line.unit = item.unit || 'Nos'
  }
}

async function loadCompanies() {
  const data = await request('/api/company?active=1')
  companies.value = data.items || []
  if (!isEdit.value && !form.company && companies.value.length) {
    form.company = companies.value[0].id || companies.value[0]._id
  }
}

async function onCompanyChange() {
  nextChallanNo.value = null
  await loadNextNumber()
}

async function loadChallan() {
  if (!isEdit.value) return
  const c = await request(`/api/challans/${route.params.id}`)
  form.challanNo = c.challanNo
  form.company = c.company?._id || c.company?.id || c.company || ''
  if (c.company && typeof c.company === 'object' && !companies.value.find((x) => String(x.id || x._id) === String(form.company))) {
    companies.value = [...companies.value, {
      id: c.company._id,
      _id: c.company._id,
      code: c.company.code,
      name: c.company.name,
    }]
  }
  form.customer = c.customer?._id || c.customer || ''
  selectedCustomer.value = c.customer && typeof c.customer === 'object' ? c.customer : null
  form.date = c.date ? new Date(c.date).toISOString().slice(0, 10) : ''
  form.partyDcNo = c.partyDcNo || ''
  form.partyDcDate = c.partyDcDate ? new Date(c.partyDcDate).toISOString().slice(0, 10) : ''
  form.partyGstin = c.partyGstin || ''
  form.notes = c.notes || ''
  form.lines = (c.lines || []).map((l) => {
    const item = l.item && typeof l.item === 'object' ? l.item : null
    const itemId = String(item?._id || l.item || '')
    const itemName = item?.description || l.itemName || ''
    return {
      itemId,
      itemName,
      itemOption: item || (itemId && itemName
        ? { _id: itemId, description: itemName, unit: l.unit, hsnCode: l.hsnCode || item?.hsnCode || '' }
        : null),
      description: l.description || '',
      hsnCode: l.hsnCode || item?.hsnCode || '',
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
      company: form.company,
      customer: form.customer,
      date: form.date,
      partyDcNo: form.partyDcNo,
      partyDcDate: form.partyDcDate || null,
      partyGstin: form.partyGstin,
      notes: form.notes,
      lines: form.lines
        .filter((l) => l.itemId || l.description?.trim() || l.itemName?.trim())
        .map((l) => ({
          itemId: l.itemId || null,
          itemName: l.itemName || l.itemOption?.description || '',
          description: (l.description || l.itemName || l.itemOption?.description || '').trim(),
          hsnCode: l.hsnCode || l.itemOption?.hsnCode || '',
          quantity: Number(l.quantity) || 0,
          unit: l.unit || 'Nos',
        })),
    }
    if (!payload.company) throw new Error('Company is required')
    if (!payload.customer || !payload.date) throw new Error('Customer and date are required')
    if (!payload.lines.length) throw new Error('Add at least one line item')
    if (payload.lines.some((l) => !l.itemId)) {
      throw new Error('Select an item for each line')
    }

    if (isEdit.value) {
      await request(`/api/challans/${route.params.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    } else {
      await request('/api/challans', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    }
    router.push('/')
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
      `delivery-challan-${String(challanNoDisplay.value).replaceAll('/', '-') || 'draft'}.pdf`,
    )
  } catch (e) {
    error.value = e.message
  }
}

async function loadNextNumber() {
  if (isEdit.value) return
  if (!form.company) {
    nextChallanNo.value = null
    return
  }
  const data = await request(`/api/challans/next-number?company=${encodeURIComponent(form.company)}`)
  nextChallanNo.value = data.challanNo
}

onMounted(async () => {
  try {
    await loadCompanies()
    await Promise.all([loadNextNumber(), loadChallan()])
  } catch (e) {
    error.value = e.message
  }
})
</script>
