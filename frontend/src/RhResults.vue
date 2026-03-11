<template>
  <div class="app">
    <h1>Espace RH - Résultats des candidats</h1>

    <div class="card">
      <div class="toolbar">
        <button @click="loadResults" :disabled="loading">
          Rafraîchir
        </button>
        <span v-if="loading" class="hint">Chargement...</span>
        <span v-if="error" class="error">{{ error }}</span>
      </div>

      <table class="results-table" v-if="results.length">
        <thead>
          <tr>
            <th>Candidat</th>
            <th>Email</th>
            <th>Poste</th>
            <th>Score</th>
            <th>Temps passé</th>
            <th>Terminé le</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in results" :key="row.attemptId">
            <td>{{ row.fullName }}</td>
            <td>{{ row.email }}</td>
            <td>{{ row.jobTitle }}</td>
            <td>{{ row.scorePercent.toFixed(2) }} %</td>
            <td>
              {{ Math.floor((row.durationSeconds || 0) / 60) }} min
              {{ (row.durationSeconds || 0) % 60 }} s
            </td>
            <td>{{ formatDate(row.completedAt) }}</td>
          </tr>
        </tbody>
      </table>

      <p v-else class="hint">
        Aucun candidat admis pour le moment.
      </p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const results = ref([]);
const loading = ref(false);
const error = ref("");

async function loadResults() {
  loading.value = true;
  error.value = "";
  try {
    const res = await fetch(`${API_BASE_URL}/rh/results`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erreur lors du chargement des résultats");
    }
    results.value = await res.json();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  } finally {
    loading.value = false;
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString();
}

onMounted(() => {
  loadResults();
});
</script>

<style>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 2rem;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: #e5e7eb;
}

h1 {
  margin-bottom: 1.5rem;
}

.card {
  background: #020617;
  border-radius: 1rem;
  padding: 2rem;
  width: 100%;
  max-width: 960px;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.8);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

button {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
  font-weight: 500;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #f97373;
}

.hint {
  font-size: 0.9rem;
  color: #9ca3af;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.results-table th,
.results-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #1f2937;
}

.results-table th {
  text-align: left;
  font-weight: 600;
}

.results-table tbody tr:hover {
  background-color: #020617ee;
}
</style>

