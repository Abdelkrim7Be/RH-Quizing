<template>
  <div class="page">Salut</div>
</template>

<script setup>
import { ref } from "vue";

const clicked = ref(false);

const demoClick = () => {
  clicked.value = true;
};
</script>
