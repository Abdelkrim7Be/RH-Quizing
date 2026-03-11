<template>
  <div class="admin">
    <h1>Administration des quizzes</h1>

    <section class="card">
      <h2>Créer un poste</h2>
      <form @submit.prevent="createJob">
        <div class="field">
          <label>Intitulé du poste</label>
          <input v-model="newJobTitle" type="text" required />
        </div>
        <button type="submit" :disabled="loadingJobs">Créer le poste</button>
      </form>
    </section>

    <section class="card">
      <h2>Créer un quiz</h2>
      <form @submit.prevent="createQuiz">
        <div class="field">
          <label>Poste</label>
          <select v-model.number="quizForm.jobId" required>
            <option disabled :value="0">-- Sélectionner un poste --</option>
            <option v-for="job in jobs" :key="job.id" :value="job.id">
              {{ job.title }}
            </option>
          </select>
        </div>
        <div class="field">
          <label>Nom du quiz</label>
          <input v-model="quizForm.name" type="text" required />
        </div>
        <div class="field">
          <label>Durée (minutes)</label>
          <input
            v-model.number="quizForm.durationMinutes"
            type="number"
            min="1"
          />
        </div>
        <div class="field">
          <label>Nombre de questions</label>
          <input
            v-model.number="quizForm.questionsCount"
            type="number"
            min="1"
          />
        </div>
        <div class="field">
          <label>
            <input v-model="quizForm.isPublished" type="checkbox" />
            Publier immédiatement
          </label>
        </div>
        <button type="submit" :disabled="loadingQuizzes">Créer le quiz</button>
      </form>
    </section>

    <section class="card">
      <h2>Assigner un quiz à un poste</h2>
      <div class="field">
        <label>Poste</label>
        <select v-model.number="assignForm.jobId">
          <option disabled :value="0">-- Sélectionner un poste --</option>
          <option v-for="job in jobs" :key="job.id" :value="job.id">
            {{ job.title }}
          </option>
        </select>
      </div>
      <div class="field">
        <label>Quiz</label>
        <select v-model.number="assignForm.quizId">
          <option disabled :value="0">-- Sélectionner un quiz --</option>
          <option v-for="quiz in quizzes" :key="quiz.id" :value="quiz.id">
            {{ quiz.name }} ({{ quiz.job_title }})
          </option>
        </select>
      </div>
      <button type="button" @click="assignQuiz">
        Assigner / remplacer
      </button>
    </section>

    <section class="card">
      <h2>Liste des quizzes</h2>
      <button @click="loadData" :disabled="loadingQuizzes || loadingJobs">
        Recharger
      </button>
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Poste</th>
            <th>Durée (min)</th>
            <th># Questions</th>
            <th>Publié</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="quiz in quizzes" :key="quiz.id">
            <td>{{ quiz.id }}</td>
            <td>{{ quiz.name }}</td>
            <td>{{ quiz.job_title }}</td>
            <td>{{ quiz.duration_minutes }}</td>
            <td>{{ quiz.questions_count }}</td>
            <td>{{ quiz.is_published ? "Oui" : "Non" }}</td>
            <td class="actions">
              <button type="button" @click="togglePublish(quiz)">
                {{ quiz.is_published ? "Dépublier" : "Publier" }}
              </button>
              <button type="button" @click="softDeleteQuiz(quiz)">
                Supprimer (dépublier)
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const jobs = ref([]);
const quizzes = ref([]);

const newJobTitle = ref("");

const quizForm = ref({
  jobId: 0,
  name: "",
  durationMinutes: 30,
  questionsCount: 10,
  isPublished: false,
});

const assignForm = ref({
  jobId: 0,
  quizId: 0,
});

const loadingJobs = ref(false);
const loadingQuizzes = ref(false);
const error = ref("");
const success = ref("");

async function loadJobs() {
  loadingJobs.value = true;
  error.value = "";
  try {
    const res = await fetch(`${API_BASE_URL}/admin/jobs`);
    if (!res.ok) throw new Error("Erreur chargement jobs");
    jobs.value = await res.json();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  } finally {
    loadingJobs.value = false;
  }
}

async function loadQuizzes() {
  loadingQuizzes.value = true;
  error.value = "";
  try {
    const res = await fetch(`${API_BASE_URL}/admin/quizzes`);
    if (!res.ok) throw new Error("Erreur chargement quizzes");
    quizzes.value = await res.json();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  } finally {
    loadingQuizzes.value = false;
  }
}

async function loadData() {
  await Promise.all([loadJobs(), loadQuizzes()]);
}

async function createJob() {
  if (!newJobTitle.value) return;
  error.value = "";
  success.value = "";
  try {
    const res = await fetch(`${API_BASE_URL}/admin/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newJobTitle.value }),
    });
    if (!res.ok) throw new Error("Erreur création job");
    newJobTitle.value = "";
    success.value = "Poste créé.";
    await loadJobs();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  }
}

async function createQuiz() {
  if (!quizForm.value.jobId || !quizForm.value.name) return;
  error.value = "";
  success.value = "";
  try {
    const res = await fetch(`${API_BASE_URL}/admin/quizzes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quizForm.value),
    });
    if (!res.ok) throw new Error("Erreur création quiz");
    quizForm.value = {
      jobId: 0,
      name: "",
      durationMinutes: 30,
      questionsCount: 10,
      isPublished: false,
    };
    success.value = "Quiz créé.";
    await loadQuizzes();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  }
}

async function togglePublish(quiz) {
  error.value = "";
  success.value = "";
  try {
    const res = await fetch(`${API_BASE_URL}/admin/quizzes/${quiz.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !quiz.is_published }),
    });
    if (!res.ok) throw new Error("Erreur mise à jour quiz");
    success.value = "Statut mis à jour.";
    await loadQuizzes();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  }
}

async function softDeleteQuiz(quiz) {
  if (!confirm("Dépublier ce quiz ?")) return;
  error.value = "";
  success.value = "";
  try {
    const res = await fetch(`${API_BASE_URL}/admin/quizzes/${quiz.id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) {
      throw new Error("Erreur dépublication quiz");
    }
    success.value = "Quiz dépublié.";
    await loadQuizzes();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  }
}

async function assignQuiz() {
  if (!assignForm.value.jobId || !assignForm.value.quizId) {
    error.value = "Choisir un poste et un quiz.";
    return;
  }
  error.value = "";
  success.value = "";
  try {
    const res = await fetch(
      `${API_BASE_URL}/admin/jobs/${assignForm.value.jobId}/quiz`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: assignForm.value.quizId }),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Erreur assignation quiz");
    }
    success.value = "Quiz assigné au poste.";
    await loadQuizzes();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  }
}

onMounted(() => {
  loadData();
});
</script>

<style>
.admin {
  min-height: 100vh;
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
  margin-bottom: 16px;
}

.field {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
}

input,
select {
  padding: 8px;
  border: 1px solid #000000;
  font-family: "Times New Roman", serif;
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

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.table th,
.table td {
  border: 1px solid #000000;
  padding: 4px 6px;
}

.actions {
  display: flex;
  gap: 6px;
}

.error {
  margin-top: 8px;
  font-style: italic;
}

.success {
  margin-top: 8px;
}
</style>