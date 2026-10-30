<template>
  <div ref="rootRef" class="relative w-full">
    <button
      type="button"
      class="select w-full flex items-center justify-between gap-2 text-left cursor-pointer min-w-0 min-h-[42px]"
      @click="toggleOpen"
    >
      <span class="flex flex-wrap gap-1 min-w-0 flex-1">
        <template v-if="selectedOptions.length">
          <span
            v-for="opt in selectedOptions"
            :key="String(opt.value)"
            class="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-xs"
            @click.stop
          >
            <span class="truncate">{{ opt.label }}</span>
            <button
              type="button"
              class="text-blue-600 hover:text-blue-900"
              @click.stop="removeValue(opt.value)"
            >
              ×
            </button>
          </span>
        </template>
        <span v-else class="text-slate-400 truncate">{{ placeholder }}</span>
      </span>
      <ChevronDown :size="16" class="shrink-0 text-slate-400" />
    </button>

    <div
      v-if="open"
      class="absolute z-[60] left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
    >
      <div class="p-2 border-b border-slate-100">
        <input
          ref="searchInputRef"
          v-model="search"
          type="text"
          :placeholder="searchPlaceholder"
          class="input w-full min-w-0"
          @keydown.escape.prevent="close"
        />
      </div>
      <ul ref="listRef" class="max-h-56 overflow-y-auto py-1" @scroll="onListScroll">
        <li v-if="loading && !options.length" class="px-3 py-2 text-sm text-slate-500">Loading…</li>
        <li
          v-for="opt in options"
          :key="String(opt.value)"
          class="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 whitespace-normal break-words flex items-start gap-2"
          :class="{ 'bg-blue-50 text-blue-700 font-medium': isSelected(opt.value) }"
          @click="toggleOption(opt)"
        >
          <span
            class="mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[10px]"
            :class="isSelected(opt.value) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'"
          >
            <span v-if="isSelected(opt.value)">✓</span>
          </span>
          <span>{{ opt.label }}</span>
        </li>
        <li v-if="!loading && !options.length" class="px-3 py-2 text-sm text-slate-500">No results found</li>
        <li v-if="loading && options.length" class="px-3 py-2 text-sm text-slate-500">Loading more…</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ChevronDown } from '@lucide/vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select...' },
  searchPlaceholder: { type: String, default: 'Search...' },
  loadOptions: { type: Function, required: true },
  optionValue: { type: String, default: '_id' },
  optionLabel: { type: [String, Function], default: 'name' },
  pageSize: { type: Number, default: 30 },
})

const emit = defineEmits(['update:modelValue', 'change'])

const rootRef = ref(null)
const searchInputRef = ref(null)
const listRef = ref(null)
const open = ref(false)
const search = ref('')
const options = ref([])
const selectedMap = ref({})
const loading = ref(false)
const hasMore = ref(true)

let searchTimer = null
let fetchSeq = 0

function normalizeOption(item) {
  if (!item || typeof item !== 'object') {
    return { value: item, label: String(item ?? ''), raw: item }
  }
  const value = item[props.optionValue]
  let label = String(value ?? '')
  if (typeof props.optionLabel === 'function') label = props.optionLabel(item)
  else if (props.optionLabel) label = String(item[props.optionLabel] ?? value ?? '')
  return { value, label, raw: item }
}

function isSelected(value) {
  return props.modelValue.some((v) => String(v) === String(value))
}

const selectedOptions = computed(() => {
  return props.modelValue.map((id) => {
    const key = String(id)
    if (selectedMap.value[key]) return selectedMap.value[key]
    const found = options.value.find((o) => String(o.value) === key)
    return found || { value: id, label: key, raw: null }
  })
})

async function fetchOptions({ reset = false } = {}) {
  if (loading.value && !reset) return
  if (!reset && !hasMore.value) return

  const seq = ++fetchSeq
  loading.value = true
  try {
    const skip = reset ? 0 : options.value.length
    const data = await props.loadOptions({
      search: search.value.trim(),
      skip,
      limit: props.pageSize,
    })
    if (seq !== fetchSeq) return

    const items = (data.items || []).map(normalizeOption)
    options.value = reset ? items : [...options.value, ...items]
    hasMore.value = Boolean(data.hasMore)
    for (const opt of items) {
      if (isSelected(opt.value)) selectedMap.value[String(opt.value)] = opt
    }
  } finally {
    if (seq === fetchSeq) loading.value = false
  }
}

function toggleOpen() {
  open.value = !open.value
  if (open.value) {
    search.value = ''
    nextTick(() => searchInputRef.value?.focus())
    fetchOptions({ reset: true })
  }
}

function close() {
  open.value = false
  search.value = ''
}

function toggleOption(opt) {
  selectedMap.value[String(opt.value)] = opt
  const exists = isSelected(opt.value)
  const next = exists
    ? props.modelValue.filter((v) => String(v) !== String(opt.value))
    : [...props.modelValue, opt.value]
  emit('update:modelValue', next)
  emit('change', next)
}

function removeValue(value) {
  const next = props.modelValue.filter((v) => String(v) !== String(value))
  emit('update:modelValue', next)
  emit('change', next)
}

function onListScroll(e) {
  const el = e.target
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    fetchOptions()
  }
}

function onDocumentClick(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) close()
}

watch(search, () => {
  if (!open.value) return
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchOptions({ reset: true }), 250)
})

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  clearTimeout(searchTimer)
  document.removeEventListener('click', onDocumentClick)
})
</script>
