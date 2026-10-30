<template>
  <div class="card max-w-3xl">
    <h1>Company Master</h1>
    <p class="empty mb-4">These details appear on delivery challan PDFs.</p>
    <p v-if="error" class="error mb-3">{{ error }}</p>
    <p v-if="success" class="text-emerald-600 text-sm mb-3">{{ success }}</p>

    <div class="field">
      <label class="label">Logo</label>
      <div class="flex flex-wrap items-center gap-4">
        <div
          class="w-24 h-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden"
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

    <div class="field">
      <label class="label">Company name *</label>
      <input v-model="form.name" class="input w-full min-w-0" />
    </div>
    <div class="field">
      <label class="label">Address</label>
      <textarea v-model="form.address" class="input w-full min-w-0 min-h-[80px]" />
    </div>
    <div class="grid-2">
      <div class="field">
        <label class="label">Cell</label>
        <input v-model="form.cell" class="input w-full min-w-0" />
      </div>
      <div class="field">
        <label class="label">Email</label>
        <input v-model="form.email" class="input w-full min-w-0" type="email" />
      </div>
      <div class="field">
        <label class="label">Website</label>
        <input v-model="form.web" class="input w-full min-w-0" />
      </div>
      <div class="field">
        <label class="label">GSTIN</label>
        <input v-model="form.gstin" class="input w-full min-w-0" />
      </div>
    </div>

    <div class="actions mt-2">
      <button type="button" class="btn" :disabled="saving" @click="save">
        {{ saving ? 'Saving…' : 'Save company' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { assetUrl, request, uploadRequest } from '../api/http'

const form = reactive({
  name: '',
  address: '',
  cell: '',
  email: '',
  web: '',
  gstin: '',
  logoUrl: '',
})

const fileInput = ref(null)
const logoFile = ref(null)
const localPreview = ref('')
const removeLogo = ref(false)
const error = ref('')
const success = ref('')
const saving = ref(false)

const logoPreview = computed(() => localPreview.value || assetUrl(form.logoUrl))

async function load() {
  error.value = ''
  const data = await request('/api/company')
  form.name = data.name || ''
  form.address = data.address || ''
  form.cell = data.cell || ''
  form.email = data.email || ''
  form.web = data.web || ''
  form.gstin = data.gstin || ''
  form.logoUrl = data.logoUrl || ''
  logoFile.value = null
  localPreview.value = ''
  removeLogo.value = false
  if (fileInput.value) fileInput.value.value = ''
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
  if (!form.name.trim()) {
    error.value = 'Company name is required'
    return
  }
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const fd = new FormData()
    fd.append('name', form.name.trim())
    fd.append('address', form.address.trim())
    fd.append('cell', form.cell.trim())
    fd.append('email', form.email.trim())
    fd.append('web', form.web.trim())
    fd.append('gstin', form.gstin.trim())
    if (logoFile.value) fd.append('logo', logoFile.value)
    if (removeLogo.value) fd.append('removeLogo', 'true')

    const data = await uploadRequest('/api/company', fd, 'PUT')
    form.logoUrl = data.logoUrl || ''
    logoFile.value = null
    localPreview.value = ''
    removeLogo.value = false
    if (fileInput.value) fileInput.value.value = ''
    success.value = 'Company saved'
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await load()
  } catch (e) {
    error.value = e.message
  }
})
</script>
