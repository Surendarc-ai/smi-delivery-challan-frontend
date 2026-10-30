<template>
  <div class="login-wrap">
    <div class="login-card">
      <h1 class="text-2xl font-semibold text-slate-800 mb-2">Delivery Challan</h1>
      <p class="empty mb-6">Sign in to continue</p>
      <form @submit.prevent="submit">
        <div class="field">
          <label class="label">Username</label>
          <input v-model="username" class="input" required autocomplete="username" />
        </div>
        <div class="field">
          <label class="label">Password</label>
          <input
            v-model="password"
            type="password"
            class="input"
            required
            autocomplete="current-password"
          />
        </div>
        <p v-if="error" class="error mb-3">{{ error }}</p>
        <button class="btn w-full" type="submit" :disabled="saving">
          {{ mode === 'login' ? 'Login' : 'Register' }}
        </button>
        <button class="btn secondary w-full mt-2" type="button" @click="toggleMode">
          {{ mode === 'login' ? 'Create account' : 'Have account? Login' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { request, setToken } from '../api/http'

const router = useRouter()
const username = ref('')
const password = ref('')
const mode = ref('login')
const error = ref('')
const saving = ref(false)

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
}

async function submit() {
  saving.value = true
  error.value = ''
  try {
    const path = mode.value === 'login' ? '/api/auth/login' : '/api/auth/register'
    const data = await request(path, {
      method: 'POST',
      body: JSON.stringify({ username: username.value, password: password.value }),
    })
    setToken(data.token)
    router.push({ name: 'Challans' })
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}
</script>
