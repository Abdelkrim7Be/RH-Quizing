<template>
  <div class="admin">
    <h1>Banque de questions</h1>

    <section class="card">
      <h2>Sélection du quiz</h2>
      <div class="field">
        <label>Quiz</label>
        <select v-model.number="selectedQuizId" @change="loadQuestions">
          <option :value="0" disabled>-- Sélectionner un quiz --</option>
          <option v-for="quiz in quizzes" :key="quiz.id" :value="quiz.id">
            {{ quiz.name }} ({{ quiz.job_title }})
          </option>
        </select>
      </div>
    </section>

    <section v-if="selectedQuizId" class="card">
      <h2>Filtres</h2>
      <div class="filters">
        <div class="field">
          <label>Catégorie</label>
          <input v-model="filter.category" type="text" />
        </div>
        <div class="field">
          <label>Niveau</label>
          <select v-model="filter.level">
            <option value="">Tous</option>
            <option value="junior">Junior</option>
            <option value="senior">Senior</option>
          </select>
        </div>
        <div class="field">
          <label>Type</label>
          <select v-model="filter.type">
            <option value="">Tous</option>
            <option value="QCM">QCM</option>
            <option value="TEXT">Texte libre</option>
          </select>
        </div>
        <button type="button" @click="loadQuestions">Appliquer</button>
      </div>
    </section>

    <section v-if="selectedQuizId" class="card">
      <h2>Créer / éditer une question</h2>
      <form @submit.prevent="submitQuestion">
        <div class="field">
          <label>Texte de la question</label>
          <textarea v-model="form.text" required></textarea>
        </div>
        <div class="field">
          <label>Type</label>
          <select v-model="form.type" required>
            <option value="QCM">QCM</option>
            <option value="TEXT">Texte libre</option>
          </select>
        </div>
        <div class="field">
          <label>Catégorie</label>
          <input v-model="form.category" type="text" />
        </div>
        <div class="field">
          <label>Niveau</label>
          <select v-model="form.level" required>
            <option value="" disabled>-- Choisir --</option>
            <option value="junior">Junior</option>
            <option value="senior">Senior</option>
          </select>
        </div>

        <div v-if="form.type === 'QCM'" class="qcm-block">
          <h3>Choix</h3>
          <div
            v-for="(choice, index) in form.choices"
            :key="index"
            class="choice-row"
          >
            <input
              v-model="choice.text"
              type="text"
              :placeholder="`Choix ${index + 1}`"
              required
            />
            <label>
              <input
                type="radio"
                name="correct-choice"
                :checked="choice.isCorrect"
                @change="setCorrectChoice(index)"
              />
              Bonne réponse
            </label>
            <button
              type="button"
              @click="removeChoice(index)"
              v-if="form.choices.length > 2"
            >
              Supprimer
            </button>
          </div>
          <button type="button" @click="addChoice">Ajouter un choix</button>
        </div>

        <div class="actions">
          <button type="submit">
            {{ form.id ? "Mettre à jour" : "Créer" }}
          </button>
          <button type="button" v-if="form.id" @click="resetForm">
            Annuler
          </button>
        </div>
      </form>
    </section>

    <section v-if="selectedQuizId" class="card">
      <h2>Import CSV</h2>
      <p class="hint">
        Format : type;question;category;level;choice1;isCorrect1;choice2;isCorrect2;...
      </p>
      <input type="file" accept=".csv,text/csv" @change="handleFileChange" />
      <button type="button" :disabled="!csvFile" @click="importCsv">
        Importer
      </button>
    </section>

    <section v-if="selectedQuizId" class="card">
      <h2>Questions existantes</h2>
      <table class="table" v-if="questions.length">
        <thead>
          <tr>
            <th>ID</th>
            <th>Texte</th>
            <th>Catégorie</th>
            <th>Niveau</th>
            <th>Type</th>
            <th>Choix</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in questions" :key="q.id">
            <td>{{ q.id }}</td>
            <td>{{ q.text }}</td>
            <td>{{ q.category }}</td>
            <td>{{ q.level }}</td>
            <td>{{ q.type }}</td>
            <td>
              <ul v-if="q.type === 'QCM'">
                <li v-for="c in q.choices" :key="c.id">
                  <span v-if="c.is_correct">[x]</span>
                  <span v-else>[ ]</span>
                  {{ c.text }}
                </li>
              </ul>
            </td>
            <td class="actions">
              <button type="button" @click="editQuestion(q)">Éditer</button>
              <button type="button" @click="deleteQuestion(q)">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">Aucune question pour ce quiz.</p>
    </section>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const quizzes = ref([]);
const selectedQuizId = ref(0);
const questions = ref([]);

const filter = ref({
  category: "",
  level: "",
  type: "",
});

const form = ref({
  id: null,
  text: "",
  category: "",
  level: "",
  type: "QCM",
  choices: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ],
});

const csvFile = ref(null);
const error = ref("");
const success = ref("");

async function loadQuizzes() {
  error.value = "";
  try {
    const res = await fetch(`${API_BASE_URL}/admin/quizzes`);
    if (!res.ok) throw new Error("Erreur chargement quizzes");
    quizzes.value = await res.json();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  }
}

async function loadQuestions() {
  if (!selectedQuizId.value) return;
  error.value = "";
  success.value = "";
  try {
    const params = new URLSearchParams();
    if (filter.value.category) params.append("category", filter.value.category);
    if (filter.value.level) params.append("level", filter.value.level);
    if (filter.value.type) params.append("type", filter.value.type);

    const res = await fetch(
      `${API_BASE_URL}/admin/quizzes/${selectedQuizId.value}/questions?${params.toString()}`,
    );
    if (!res.ok) throw new Error("Erreur chargement questions");
    questions.value = await res.json();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  }
}

function resetForm() {
  form.value = {
    id: null,
    text: "",
    category: "",
    level: "",
    type: "QCM",
    choices: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ],
  };
}

function addChoice() {
  form.value.choices.push({ text: "", isCorrect: false });
}

function removeChoice(index) {
  if (form.value.choices.length <= 2) return;
  form.value.choices.splice(index, 1);
  if (!form.value.choices.some((c) => c.isCorrect)) {
    form.value.choices[0].isCorrect = true;
  }
}

function setCorrectChoice(index) {
  form.value.choices.forEach((c, i) => {
    c.isCorrect = i === index;
  });
}

async function submitQuestion() {
  if (!selectedQuizId.value) return;
  error.value = "";
  success.value = "";

  const payload = {
    text: form.value.text,
    category: form.value.category || null,
    level: form.value.level,
    type: form.value.type,
  };

  if (form.value.type === "QCM") {
    payload.choices = form.value.choices.map((c) => ({
      text: c.text,
      isCorrect: !!c.isCorrect,
    }));
  }

  try {
    let url;
    let method;

    if (form.value.id) {
      url = `${API_BASE_URL}/admin/questions/${form.value.id}`;
      method = "PUT";
    } else {
      url = `${API_BASE_URL}/admin/quizzes/${selectedQuizId.value}/questions`;
      method = "POST";
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Erreur sauvegarde question");
    }

    success.value = form.value.id
      ? "Question mise à jour."
      : "Question créée.";
    resetForm();
    await loadQuestions();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  }
}

function editQuestion(q) {
  form.value.id = q.id;
  form.value.text = q.text;
  form.value.category = q.category || "";
  form.value.level = q.level;
  form.value.type = q.type || "QCM";

  if (form.value.type === "QCM") {
    form.value.choices = (q.choices || []).map((c) => ({
      text: c.text,
      isCorrect: !!c.is_correct,
    }));
    if (form.value.choices.length < 2) {
      while (form.value.choices.length < 2) {
        form.value.choices.push({ text: "", isCorrect: false });
      }
    }
    if (!form.value.choices.some((c) => c.isCorrect)) {
      form.value.choices[0].isCorrect = true;
    }
  } else {
    form.value.choices = [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ];
  }
}

async function deleteQuestion(q) {
  if (!confirm("Supprimer cette question ?")) return;
  error.value = "";
  success.value = "";
  try {
    const res = await fetch(`${API_BASE_URL}/admin/questions/${q.id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) {
      throw new Error("Erreur suppression question");
    }
    success.value = "Question supprimée.";
    await loadQuestions();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  }
}

function handleFileChange(event) {
  const files = event.target.files;
  csvFile.value = files && files[0] ? files[0] : null;
}

async function importCsv() {
  if (!csvFile.value || !selectedQuizId.value) return;
  error.value = "";
  success.value = "";

  try {
    const text = await csvFile.value.text();
    const res = await fetch(
      `${API_BASE_URL}/admin/quizzes/${selectedQuizId.value}/questions/import`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: text }),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Erreur import CSV");
    }

    let msg = `Import terminé. Questions importées : ${
      data.importedCount || 0
    }.`;
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      msg += ` Lignes en erreur : ${data.errors.length}.`;
      // détails visibles dans la console
      console.warn("Erreurs import CSV", data.errors);
    }
    success.value = msg;
    await loadQuestions();
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  }
}

onMounted(async () => {
  await loadQuizzes();
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
select,
textarea {
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

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
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
  vertical-align: top;
}

.choice-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
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

.hint {
  font-size: 0.85rem;
}
</style>

