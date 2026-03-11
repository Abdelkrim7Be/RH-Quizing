<template>
  <div class="app">
    <h1>Passer un quiz</h1>

    <div v-if="step === 'intro'" class="card">
      <h2>Informations candidat</h2>
      <p class="hint">
        Le poste vous a été attribué par l'équipe RH. Vous n'avez rien à
        sélectionner ici.
      </p>
      <form @submit.prevent="handleIntroSubmit">
        <div class="field">
          <label>Nom complet</label>
          <input v-model="fullName" type="text" required />
        </div>
        <div class="field">
          <label>Email</label>
          <input v-model="email" type="email" required />
        </div>
        <button type="submit" :disabled="loading">Commencer le quiz</button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div v-else-if="step === 'quiz'" class="card">
      <div class="quiz-header">
        <h2>{{ quiz?.name }}</h2>
        <div class="timer">
          Temps écoulé : {{ minutesElapsed }}{{
            secondsElapsed.toString().padStart(2, "0")
          }}
          / {{ quiz?.durationMinutes }}:00
        </div>
      </div>

      <div class="question">
        <h3>Question {{ currentIndex + 1 }} / {{ questions.length }}</h3>
        <p>{{ currentQuestion.text }}</p>
        <ul class="choices">
          <li v-for="choice in currentQuestion.choices" :key="choice.id">
            <label>
              <input
                type="radio"
                :name="'q-' + currentQuestion.id"
                :value="choice.id"
                v-model="answers[currentQuestion.id]"
              />
              {{ choice.text }}
            </label>
          </li>
        </ul>
      </div>

      <div class="quiz-navigation">
        <button @click="prevQuestion" :disabled="currentIndex === 0">
          Précédent
        </button>
        <button
          v-if="currentIndex < questions.length - 1"
          @click="nextQuestion"
        >
          Suivant
        </button>
        <button
          v-else
          @click="submitQuiz"
          :disabled="submitting || !allAnswered"
        >
          Soumettre
        </button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div v-else-if="step === 'result'" class="card">
      <h2>Résultat du quiz</h2>
      <p><strong>Poste :</strong> {{ result?.jobTitle }}</p>
      <p><strong>Score :</strong> {{ result?.scorePercent.toFixed(2) }} %</p>
      <p>
        <strong>Temps passé :</strong>
        {{ Math.floor((result?.durationSeconds || 0) / 60) }} min
        {{ (result?.durationSeconds || 0) % 60 }} s
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const step = ref("intro");
const loading = ref(false);
const submitting = ref(false);
const error = ref("");

const fullName = ref("");
const email = ref("");
const jobs = ref([]);
// Poste attribué automatiquement par la RH : pour l'instant on prend un exemple avec jobId = 1
const selectedJobId = ref(1);

const candidateId = ref(null);
const attemptId = ref(null);
const quiz = ref(null);
const questions = ref([]);
const currentIndex = ref(0);
const answers = ref({});

const result = ref(null);

const elapsedSeconds = ref(0);
const timeLeftSeconds = ref(0);
let timerInterval = null;

const currentQuestion = computed(
  () => questions.value[currentIndex.value] || {},
);

const minutesElapsed = computed(() => Math.floor(elapsedSeconds.value / 60));
const secondsElapsed = computed(() => elapsedSeconds.value % 60);

const allAnswered = computed(() => {
  if (!questions.value.length) return false;
  return questions.value.every((q) => answers.value[q.id]);
});

async function fetchJobs() {
  loading.value = true;
  error.value = "";
  try {
    const res = await fetch(`${API_BASE_URL}/jobs`);
    if (!res.ok) throw new Error("Impossible de charger les postes");
    jobs.value = await res.json();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  } finally {
    loading.value = false;
  }
}

async function ensureCandidate() {
  const res = await fetch(`${API_BASE_URL}/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.value, fullName: fullName.value }),
  });
  if (!res.ok) {
    throw new Error("Impossible d'enregistrer le candidat");
  }
  const data = await res.json();
  candidateId.value = data.id;
}

async function startQuiz() {
  const res = await fetch(`${API_BASE_URL}/quiz/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidateId: candidateId.value,
      jobId: Number(selectedJobId.value),
    }),
  });
  if (res.status === 409) {
    const data = await res.json();
    throw new Error(data.error || "Quiz déjà passé pour ce poste");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Impossible de démarrer le quiz");
  }
  const data = await res.json();
  attemptId.value = data.attemptId;
  quiz.value = data.quiz;
  questions.value = data.questions;
  answers.value = {};
  currentIndex.value = 0;
  elapsedSeconds.value = 0;
  timeLeftSeconds.value = quiz.value.durationMinutes * 60;
  startTimer();
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timeLeftSeconds.value <= 0) {
      clearInterval(timerInterval);
      autoSubmitQuiz();
    } else {
      elapsedSeconds.value += 1;
      timeLeftSeconds.value -= 1;
    }
  }, 1000);
}

async function handleIntroSubmit() {
  if (!fullName.value || !email.value) return;
  loading.value = true;
  error.value = "";
  try {
    await ensureCandidate();
    await startQuiz();
    step.value = "quiz";
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  } finally {
    loading.value = false;
  }
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value += 1;
  }
}

function prevQuestion() {
  if (currentIndex.value > 0) {
    currentIndex.value -= 1;
  }
}

async function submitQuiz() {
  if (!allAnswered.value) {
    error.value = "Veuillez répondre à toutes les questions.";
    return;
  }
  submitting.value = true;
  error.value = "";
  try {
    const payloadAnswers = questions.value.map((q) => ({
      questionId: q.id,
      choiceId: Number(answers.value[q.id]),
    }));
    const res = await fetch(
      `${API_BASE_URL}/quiz/attempts/${attemptId.value}/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payloadAnswers }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erreur lors de la soumission");
    }
    const data = await res.json();
    result.value = {
      attemptId: data.attemptId,
      scorePercent: data.scorePercent,
      status: data.status,
      durationSeconds: data.durationSeconds,
      jobTitle:
        jobs.value.find((j) => j.id === Number(selectedJobId.value))?.title ||
        "",
    };
    clearInterval(timerInterval);
    step.value = "result";
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  } finally {
    submitting.value = false;
  }
}

async function autoSubmitQuiz() {
  if (step.value !== "quiz") return;
  try {
    await submitQuiz();
  } catch {
    // already handled
  }
}

onMounted(() => {
  fetchJobs();
});

onUnmounted(() => {
  clearInterval(timerInterval);
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
  max-width: 640px;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.8);
}

.field {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}

label {
  margin-bottom: 0.25rem;
  font-weight: 500;
}

input,
select {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #334155;
  background: #020617;
  color: #e5e7eb;
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
  margin-top: 0.75rem;
  color: #f97373;
}

.hint {
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: #9ca3af;
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.timer {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: #0f172a;
  border: 1px solid #1d4ed8;
  font-variant-numeric: tabular-nums;
}

.question h3 {
  margin-bottom: 0.5rem;
}

.choices {
  list-style: none;
  padding: 0;
}

.choices li {
  margin-bottom: 0.5rem;
}

.quiz-navigation {
  margin-top: 1.5rem;
  display: flex;
  justify-content: space-between;
}
</style>
