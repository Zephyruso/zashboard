<script setup lang="ts">
import { themeChange } from 'theme-change'
import { onMounted } from 'vue'
import Home from './views/HomePage.vue';
import SetupPage from './views/SetupPage.vue';
import { activeBackend } from './store/setup';

onMounted(() => {
  themeChange(false)
})
</script>

<template>
  <div class="h-screen w-screen overflow-x-hidden bg-base-100 flex">
    <SetupPage v-if="!activeBackend"></SetupPage>
    <Home v-else></Home>
  </div>
</template>
