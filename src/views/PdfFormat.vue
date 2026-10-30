<template>
  <div class="space-y-4">
    <div class="card !mb-0">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="mb-1">PDF Format</h1>
          <p class="empty m-0">Drag blocks on the A4 page. Drop from the palette to show hidden items.</p>
        </div>
        <div class="actions !mt-0">
          <button type="button" class="btn" :disabled="saving" @click="save">
            {{ saving ? 'Saving…' : 'Save layout' }}
          </button>
          <button type="button" class="btn secondary" :disabled="saving" @click="resetDefaults">
            Reset
          </button>
        </div>
      </div>
      <p v-if="error" class="error mt-3 mb-0">{{ error }}</p>
      <p v-if="success" class="text-emerald-600 text-sm mt-3 mb-0">{{ success }}</p>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[240px_1fr] gap-4 items-start">
      <aside class="card !mb-0 space-y-4">
        <div>
          <h2 class="text-sm font-semibold text-slate-800 m-0 mb-2">Palette</h2>
          <p class="empty text-xs mb-2">Drag onto the page (or click to show).</p>
          <div class="flex flex-col gap-2">
            <button
              v-for="b in hiddenBlocks"
              :key="b.id"
              type="button"
              class="text-left px-3 py-2 rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-700 cursor-grab active:cursor-grabbing hover:border-blue-400 hover:bg-blue-50"
              draggable="true"
              @dragstart="onPaletteDragStart($event, b.id)"
              @click="showBlock(b.id)"
            >
              + {{ b.label }}
            </button>
            <p v-if="!hiddenBlocks.length" class="empty text-xs m-0">All blocks are on the page.</p>
          </div>
        </div>

        <div>
          <h2 class="text-sm font-semibold text-slate-800 m-0 mb-2">Selected</h2>
          <template v-if="selected">
            <p class="text-sm font-medium text-slate-800 mb-2">{{ selected.label }}</p>
            <div class="grid grid-cols-2 gap-2">
              <div class="field mb-0">
                <label class="label">X</label>
                <input v-model.number="selected.x" type="number" class="input" @change="clampSelected" />
              </div>
              <div class="field mb-0">
                <label class="label">Y</label>
                <input v-model.number="selected.y" type="number" class="input" @change="clampSelected" />
              </div>
              <div class="field mb-0">
                <label class="label">W</label>
                <input v-model.number="selected.w" type="number" class="input" @change="clampSelected" />
              </div>
              <div class="field mb-0">
                <label class="label">H</label>
                <input v-model.number="selected.h" type="number" class="input" @change="clampSelected" />
              </div>
            </div>
            <button type="button" class="btn danger mt-3 w-full" @click="hideSelected">
              Remove from page
            </button>
          </template>
          <p v-else class="empty text-xs m-0">Click a block on the page.</p>
        </div>

        <details class="border-t border-slate-200 pt-3">
          <summary class="text-sm font-semibold text-slate-800 cursor-pointer">Fonts & labels</summary>
          <div class="grid grid-cols-1 gap-2 mt-3">
            <div class="field mb-0">
              <label class="label">Title text</label>
              <input v-model="form.titleText" class="input" />
            </div>
            <div class="field mb-0">
              <label class="label">Item font</label>
              <input v-model.number="form.itemFontSize" type="number" min="6" max="14" class="input" />
            </div>
            <div class="field mb-0">
              <label class="label">Note font</label>
              <input v-model.number="form.itemNoteFontSize" type="number" min="5" max="12" class="input" />
            </div>
            <label class="flex items-center gap-2 text-sm text-slate-700">
              <input v-model="form.itemBold" type="checkbox" class="rounded border-slate-300" />
              Bold items
            </label>
            <div class="field mb-0">
              <label class="label">Item column</label>
              <input v-model="form.itemColumnLabel" class="input" />
            </div>
            <div class="field mb-0">
              <label class="label">Qty column</label>
              <input v-model="form.qtyColumnLabel" class="input" />
            </div>
          </div>
        </details>
      </aside>

      <div class="card !mb-0 overflow-auto">
        <div
          ref="canvasWrap"
          class="relative mx-auto bg-white shadow-md border border-slate-300"
          :style="pageStyle"
          @dragover.prevent
          @drop="onCanvasDrop"
        >
          <div
            v-for="b in visibleBlocks"
            :key="b.id"
            class="absolute border border-blue-400/70 bg-blue-50/40 rounded-sm px-1 text-[10px] text-blue-900 select-none overflow-hidden"
            :class="selectedId === b.id ? 'ring-2 ring-blue-500 z-20' : 'z-10'"
            :style="blockStyle(b)"
            @mousedown.prevent="startDrag($event, b)"
            @click.stop="selectedId = b.id"
          >
            <div class="font-semibold truncate pointer-events-none">{{ b.label }}</div>
            <div class="opacity-70 truncate pointer-events-none">{{ blockPreview(b.id) }}</div>
            <div
              class="absolute right-0 bottom-0 w-3 h-3 bg-blue-500 cursor-se-resize"
              @mousedown.stop.prevent="startResize($event, b)"
            />
          </div>
        </div>
        <p class="empty text-center text-xs mt-3 mb-0">A4 preview · drag to move · corner to resize</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import { request } from '../api/http'

const A4 = { width: 595.28, height: 841.89 }
const SCALE = 0.92

const form = reactive({
  titleText: 'DELIVERY CHALLAN',
  companyNameFontSize: 16,
  titleFontSize: 14,
  bodyFontSize: 10,
  itemFontSize: 9,
  itemNoteFontSize: 7,
  itemBold: false,
  itemColumnLabel: 'ITEM',
  qtyColumnLabel: 'Qty',
  minEmptyRows: 8,
  receiverText: 'Received the goods in good conditions',
  blocks: {},
})

const selectedId = ref('')
const saving = ref(false)
const error = ref('')
const success = ref('')
const canvasWrap = ref(null)

const blockList = computed(() => Object.values(form.blocks || {}))
const visibleBlocks = computed(() => blockList.value.filter((b) => b.visible))
const hiddenBlocks = computed(() => blockList.value.filter((b) => !b.visible))
const selected = computed(() => form.blocks[selectedId.value] || null)

const pageStyle = computed(() => ({
  width: `${A4.width * SCALE}px`,
  height: `${A4.height * SCALE}px`,
}))

function blockStyle(b) {
  return {
    left: `${b.x * SCALE}px`,
    top: `${b.y * SCALE}px`,
    width: `${b.w * SCALE}px`,
    height: `${b.h * SCALE}px`,
  }
}

function blockPreview(id) {
  const map = {
    logo: 'Company logo',
    company: 'Name / address / GSTIN',
    title: form.titleText,
    date: 'Date value',
    challanNo: 'Challan number',
    billTo: 'Customer bill address',
    shipTo: 'Customer ship address',
    gstin: 'Party GSTIN',
    itemsTable: 'Line items grid',
    summary: 'Notes / summary',
    signatures: 'Receiver / authorised',
  }
  return map[id] || ''
}

function applyData(data) {
  form.titleText = data.titleText
  form.companyNameFontSize = data.companyNameFontSize
  form.titleFontSize = data.titleFontSize
  form.bodyFontSize = data.bodyFontSize
  form.itemFontSize = data.itemFontSize
  form.itemNoteFontSize = data.itemNoteFontSize
  form.itemBold = data.itemBold
  form.itemColumnLabel = data.itemColumnLabel
  form.qtyColumnLabel = data.qtyColumnLabel
  form.minEmptyRows = data.minEmptyRows
  form.receiverText = data.receiverText
  form.blocks = JSON.parse(JSON.stringify(data.blocks || {}))
}

async function load() {
  const data = await request('/api/pdf-format')
  applyData(data)
}

function clampBlock(b) {
  b.x = Math.max(0, Math.min(A4.width - 24, Number(b.x) || 0))
  b.y = Math.max(0, Math.min(A4.height - 16, Number(b.y) || 0))
  b.w = Math.max(24, Math.min(A4.width - b.x, Number(b.w) || 24))
  b.h = Math.max(16, Math.min(A4.height - b.y, Number(b.h) || 16))
}

function clampSelected() {
  if (selected.value) clampBlock(selected.value)
}

function showBlock(id) {
  const b = form.blocks[id]
  if (!b) return
  b.visible = true
  selectedId.value = id
}

function hideSelected() {
  if (!selected.value) return
  selected.value.visible = false
  selectedId.value = ''
}

let drag = null

function startDrag(e, b) {
  selectedId.value = b.id
  drag = {
    mode: 'move',
    id: b.id,
    startX: e.clientX,
    startY: e.clientY,
    origX: b.x,
    origY: b.y,
  }
  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('mouseup', endPointer)
}

function startResize(e, b) {
  selectedId.value = b.id
  drag = {
    mode: 'resize',
    id: b.id,
    startX: e.clientX,
    startY: e.clientY,
    origW: b.w,
    origH: b.h,
  }
  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('mouseup', endPointer)
}

function onPointerMove(e) {
  if (!drag) return
  const b = form.blocks[drag.id]
  if (!b) return
  const dx = (e.clientX - drag.startX) / SCALE
  const dy = (e.clientY - drag.startY) / SCALE
  if (drag.mode === 'move') {
    b.x = drag.origX + dx
    b.y = drag.origY + dy
  } else {
    b.w = drag.origW + dx
    b.h = drag.origH + dy
  }
  clampBlock(b)
}

function endPointer() {
  drag = null
  window.removeEventListener('mousemove', onPointerMove)
  window.removeEventListener('mouseup', endPointer)
}

function onPaletteDragStart(e, id) {
  e.dataTransfer.setData('text/plain', id)
  e.dataTransfer.effectAllowed = 'copy'
}

function onCanvasDrop(e) {
  const id = e.dataTransfer.getData('text/plain')
  const b = form.blocks[id]
  if (!b || !canvasWrap.value) return
  const rect = canvasWrap.value.getBoundingClientRect()
  b.visible = true
  b.x = (e.clientX - rect.left) / SCALE - b.w / 2
  b.y = (e.clientY - rect.top) / SCALE - 10
  clampBlock(b)
  selectedId.value = id
}

async function save() {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    Object.values(form.blocks).forEach(clampBlock)
    const data = await request('/api/pdf-format', {
      method: 'PUT',
      body: JSON.stringify(form),
    })
    applyData(data)
    success.value = 'Layout saved. Download a challan PDF to preview.'
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function resetDefaults() {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const defaults = await request('/api/pdf-format/defaults')
    const data = await request('/api/pdf-format', {
      method: 'PUT',
      body: JSON.stringify(defaults),
    })
    applyData(data)
    selectedId.value = ''
    success.value = 'Reset to default A4 layout.'
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

onBeforeUnmount(() => {
  endPointer()
})
</script>
