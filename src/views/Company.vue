<template>
  <div class="card">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
      <div>
        <h1 class="mb-1">Companies</h1>
        <p class="empty m-0">Each company has its own code and challan number series.</p>
      </div>
      <button type="button" class="btn" @click="openForm()">+ Add Company</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>GSTIN</th>
            <th>Phone</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in companies" :key="c.id || c._id">
            <td class="font-semibold">{{ c.code }}</td>
            <td>{{ c.name }}</td>
            <td>{{ c.gstin || '—' }}</td>
            <td>{{ c.cell || '—' }}</td>
            <td class="actions">
              <button type="button" class="btn secondary" @click="openForm(c)">Edit</button>
              <button type="button" class="btn danger" @click="remove(c)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!companies.length && !loading" class="empty">No companies yet.</p>
    <p v-if="loading" class="empty mt-3">Loading…</p>
  </div>

  <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
    <div class="modal max-w-2xl">
      <h2 class="m-0 mb-4 text-lg font-semibold text-slate-800">
        {{ editingId ? 'Edit' : 'Add' }} Company
      </h2>

      <div class="field">
        <label class="label">Logo</label>
        <div class="flex flex-wrap items-center gap-4">
          <div
            class="w-20 h-20 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden"
          >
            <img
              v-if="logoPreview"
              :src="logoPreview"
              alt="Company logo"
              class="max-w-full max-h-full object-contain"
            />
            <span v-else class="text-xs text-slate-400">No logo</span>
          </div>
          <div class="flex flex-col gap-2">
            <input
              ref="fileInput"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              class="text-sm"
              @change="onLogoPick"
            />
            <button
              v-if="logoPreview || form.logoUrl"
              type="button"
              class="btn secondary self-start"
              @click="clearLogo"
            >
              Remove logo
            </button>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="field">
          <label class="label">Code name *</label>
          <input
            v-model="form.code"
            class="input uppercase"
            placeholder="e.g. SMI"
            maxlength="20"
          />
        </div>
        <div class="field">
          <label class="label">Company name *</label>
          <input v-model="form.name" class="input" />
        </div>
        <div class="field">
          <label class="label">Cell</label>
          <input v-model="form.cell" class="input" />
        </div>
        <div class="field">
          <label class="label">Email</label>
          <input v-model="form.email" type="email" class="input" />
        </div>
        <div class="field">
          <label class="label">Website</label>
          <input v-model="form.web" class="input" />
        </div>
        <div class="field">
          <label class="label">GSTIN</label>
          <input v-model="form.gstin" class="input" />
        </div>
      </div>
      <div class="field">
        <label class="label">Address</label>
        <textarea v-model="form.address" class="input min-h-[70px]" />
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
import { computed, onMounted, reactive, ref } from 'vue'
import { assetUrl, request, uploadRequest } from '../api/http'

const companies = ref([])
const loading = ref(false)
const error = ref('')
const formError = ref('')
const showForm = ref(false)
const editingId = ref(null)
const saving = ref(false)
const fileInput = ref(null)
const logoFile = ref(null)
const localPreview = ref('')
const removeLogo = ref(false)

const form = reactive({
  code: '',
  name: '',
  address: '',
  cell: '',
  email: '',
  web: '',
  gstin: '',
  logoUrl: '',
})

const logoPreview = computed(() => localPreview.value || assetUrl(form.logoUrl))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await request('/api/company')
    companies.value = data.items || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openForm(c = null) {
  editingId.value = c?.id || c?._id || null
  form.code = c?.code || ''
  form.name = c?.name || ''
  form.address = c?.address || ''
  form.cell = c?.cell || ''
  form.email = c?.email || ''
  form.web = c?.web || ''
  form.gstin = c?.gstin || ''
  form.logoUrl = c?.logoUrl || ''
  logoFile.value = null
  localPreview.value = ''
  removeLogo.value = false
  formError.value = ''
  if (fileInput.value) fileInput.value.value = ''
  showForm.value = true
}

function onLogoPick(e) {
  const file = e.target.files?.[0]
  if (!file) return
  logoFile.value = file
  removeLogo.value = false
  localPreview.value = URL.createObjectURL(file)
}

function clearLogo() {
  logoFile.value = null
  localPreview.value = ''
  removeLogo.value = true
  form.logoUrl = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function save() {
  if (!form.code.trim()) {
    formError.value = 'Code name is required'
    return
  }
  if (!form.name.trim()) {
    formError.value = 'Company name is required'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const fd = new FormData()
    fd.append('code', form.code.trim().toUpperCase())
    fd.append('name', form.name.trim())
    fd.append('address', form.address.trim())
    fd.append('cell', form.cell.trim())
    fd.append('email', form.email.trim())
    fd.append('web', form.web.trim())
    fd.append('gstin', form.gstin.trim())
    if (logoFile.value) fd.append('logo', logoFile.value)
    if (removeLogo.value) fd.append('removeLogo', 'true')

    if (editingId.value) {
      await uploadRequest(`/api/company/${editingId.value}`, fd, 'PUT')
    } else {
      await uploadRequest('/api/company', fd, 'POST')
    }
    showForm.value = false
    await load()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function remove(c) {
  if (!confirm(`Delete company ${c.code}?`)) return
  try {
    await request(`/api/company/${c.id || c._id}`, { method: 'DELETE' })
    await load()
  } catch (e) {
    error.value = e.message
  }
}

onMounted(load)
</script>
