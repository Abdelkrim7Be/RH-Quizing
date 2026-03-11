<template>
  <div class="app">
    <h1>Espace RH - Résultats des candidats</h1>

    <div class="card">
      <div class="toolbar">
        <button @click="loadResults" :disabled="loading">
          Rafraîchir
        </button>
        <button @click="downloadCsv" :disabled="!results.length">
          Exporter en CSV
        </button>
        <span v-if="loading" class="hint">Chargement...</span>
        <span v-if="error" class="error">{{ error }}</span>
      </div>

      <table class="results-table" v-if="results.length">
        <thead>
          <tr>
            <th @click="setSort('fullName')">Candidat</th>
            <th @click="setSort('email')">Email</th>
            <th @click="setSort('jobTitle')">Poste</th>
            <th @click="setSort('scorePercent')">Score</th>
            <th @click="setSort('durationSeconds')">Temps passé</th>
            <th @click="setSort('completedAt')">Terminé le</th>
            <th @click="setSort('isAccepted')">Admis</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in sortedResults" :key="row.attemptId">
            <td>{{ row.fullName }}</td>
            <td>{{ row.email }}</td>
            <td>{{ row.jobTitle }}</td>
            <td>{{ row.scorePercent.toFixed(2) }} %</td>
            <td>
              {{ Math.floor((row.durationSeconds || 0) / 60) }} min
              {{ (row.durationSeconds || 0) % 60 }} s
            </td>
            <td>{{ formatDate(row.completedAt) }}</td>
            <td>{{ row.isAccepted ? "Oui" : "Non" }}</td>
          </tr>
        </tbody>
      </table>

      <p v-else class="hint">
        Aucun résultat pour le moment.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const results = ref([]);
const loading = ref(false);
const error = ref("");

const sortKey = ref("completedAt");
const sortDir = ref("desc");

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

const sortedResults = computed(() => {
  const list = [...results.value];
  list.sort((a, b) => {
    const dir = sortDir.value === "asc" ? 1 : -1;
    const key = sortKey.value;
    const va = a[key];
    const vb = b[key];
    if (va == null && vb == null) return 0;
    if (va == null) return -1 * dir;
    if (vb == null) return 1 * dir;
    if (typeof va === "number" && typeof vb === "number") {
      return va === vb ? 0 : va > vb ? dir : -dir;
    }
    const sa = String(va).toLowerCase();
    const sb = String(vb).toLowerCase();
    return sa === sb ? 0 : sa > sb ? dir : -dir;
  });
  return list;
});

function setSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDir.value = "asc";
  }
}

function downloadCsv() {
  if (!results.value.length) return;
  const header = [
    "fullName",
    "email",
    "jobTitle",
    "scorePercent",
    "durationSeconds",
    "completedAt",
    "isAccepted",
  ];
  const rows = results.value.map((r) =>
    [
      r.fullName,
      r.email,
      r.jobTitle,
      r.scorePercent,
      r.durationSeconds,
      r.completedAt,
      r.isAccepted ? "1" : "0",
    ].join(";"),
  );
  const csv = [header.join(";"), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "rh_results.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<style>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 24px;
  font-family: "Times New Roman", serif;
  background: #ffffff;
  color: #000000;
}

h1 {
  margin-bottom: 16px;
}

.card {
  background: #ffffff;
  border: 1px solid #000000;
  padding: 16px;
  width: 100%;
  max-width: 960px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

button {
  background: #ffffff;
  color: #000000;
  border: 1px solid #000000;
  padding: 6px 12px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error {
  margin-left: 8px;
  font-style: italic;
}

.hint {
  font-size: 0.9rem;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 0.9rem;
}

.results-table th,
.results-table td {
  padding: 4px 6px;
  border: 1px solid #000000;
}

.results-table th {
  text-align: left;
  cursor: pointer;
}
</style>

