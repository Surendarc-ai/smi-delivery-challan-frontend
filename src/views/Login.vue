<template>
  <div class="login-wrap">
    <div class="card login-card">
      <h1>Delivery Challan</h1>
      <p class="empty" style="margin-top:-8px">Sign in to continue</p>
      <form @submit.prevent="submit">
        <div class="field">
          <label class="label">Username</label>
          <input v-model="username" class="input" style="width:100%" required />
        </div>
        <div class="field">
          <label class="label">Password</label>
          <input v-model="password" type="password" class="input" style="width:100%" required />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="actions">
          <button class="btn" type="submit" :disabled="saving">{{ mode === 'login' ? 'Login' : 'Register' }}</button>
          <button class="btn secondary" type="button" @click="toggleMode">
            {{ mode === 'login' ? 'Create account' : 'Have account? Login' }}
          </button>
        </div>
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
