# Sprint 2 – Partie 1 Quiz

CRUD Quiz + liaison à un poste (US 3.1, 3.2, 3.3, 6.1, 6.2 – côté technique)

---

## 0. Branches (à créer par chacun)

Dans le repo `Scrum_RH` :

```bash
# Backend – Bell_Bar
git checkout -b back/sprint2-quiz-part1

# Front – Hadd_Nass
git checkout -b front/sprint2-quiz-part1

# BDD – Hakim
git checkout -b bdd/sprint2-quiz-part1
```

---

## 1. BDD – Hakim

### 1.1. Script SQL (si on veut un script indépendant du backend)

**Fichier à créer**  
`/database/sprint2_quiz_part1.sql` (ou un dossier `database/` si besoin)

**Contenu**

```sql
CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  questions_count INT NOT NULL DEFAULT 10,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
```

### 1.2. À faire

- Vérifier que la BDD utilisée par le backend contient bien les tables `jobs` et `quizzes` avec les colonnes ci‑dessus.
- Si ce n’est pas le cas, exécuter le script `sprint2_quiz_part1.sql` sur l’instance MySQL.
- Communiquer à Bell_Bar les noms de BDD / user / host (déjà utilisés dans `.env` du backend).

---

## 2. Backend – Bell_Bar (Express + MySQL)

Backend existant : `/backend/index.js` (Express, MySQL2, déjà avec tables `jobs`, `quizzes`, `questions`, etc.).

### 2.1. API Admin Jobs (création de poste)

**Fichier à modifier**  
`/backend/index.js`

**À ajouter après la route `/jobs` existante** :

```javascript
// === ADMIN JOBS ===

// Créer un nouveau poste
app.post("/admin/jobs", async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }
  try {
    const [result] = await dbPool.query("INSERT INTO jobs (title) VALUES (?)", [
      title,
    ]);
    const [rows] = await dbPool.query(
      "SELECT id, title, created_at FROM jobs WHERE id = ?",
      [result.insertId],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lister tous les postes (vue RH, avec quiz éventuellement lié)
app.get("/admin/jobs", async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      `
      SELECT
        j.id,
        j.title,
        j.created_at,
        q.id AS quiz_id,
        q.name AS quiz_name,
        q.duration_minutes,
        q.questions_count,
        q.is_published
      FROM jobs j
      LEFT JOIN quizzes q
        ON q.job_id = j.id
      ORDER BY j.created_at DESC
      `,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### 2.2. API CRUD Quiz

**Même fichier** `backend/index.js`  
**À ajouter après le bloc ci‑dessus** :

```javascript
// === ADMIN QUIZZES ===

// Lister tous les quizzes (vue RH)
app.get("/admin/quizzes", async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      `
      SELECT
        q.id,
        q.name,
        q.duration_minutes,
        q.questions_count,
        q.is_published,
        q.created_at,
        j.id AS job_id,
        j.title AS job_title
      FROM quizzes q
      JOIN jobs j ON q.job_id = j.id
      ORDER BY q.created_at DESC
      `,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer un quiz par id (pour édition)
app.get("/admin/quizzes/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid quiz id" });
  }
  try {
    const [rows] = await dbPool.query(
      `
      SELECT
        q.id,
        q.name,
        q.duration_minutes,
        q.questions_count,
        q.is_published,
        q.job_id
      FROM quizzes q
      WHERE q.id = ?
      `,
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un quiz (brouillon par défaut ou déjà publié)
app.post("/admin/quizzes", async (req, res) => {
  const { jobId, name, durationMinutes, questionsCount, isPublished } =
    req.body;

  if (!jobId || !name) {
    return res.status(400).json({ error: "jobId and name are required" });
  }

  const duration = Number(durationMinutes || 30);
  const qCount = Number(questionsCount || 10);
  const published = isPublished ? 1 : 0;

  try {
    const [result] = await dbPool.query(
      `
      INSERT INTO quizzes (job_id, name, duration_minutes, questions_count, is_published)
      VALUES (?, ?, ?, ?, ?)
      `,
      [jobId, name, duration, qCount, published],
    );
    const [rows] = await dbPool.query(
      `
      SELECT
        id,
        job_id,
        name,
        duration_minutes,
        questions_count,
        is_published,
        created_at
      FROM quizzes
      WHERE id = ?
      `,
      [result.insertId],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour un quiz (nom, durée, nb questions, publication)
app.put("/admin/quizzes/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid quiz id" });
  }

  const { name, durationMinutes, questionsCount, isPublished } = req.body;

  try {
    const [existingRows] = await dbPool.query(
      "SELECT * FROM quizzes WHERE id = ?",
      [id],
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const existing = existingRows[0];
    const newName = name || existing.name;
    const newDuration = durationMinutes ?? existing.duration_minutes;
    const newQCount = questionsCount ?? existing.questions_count;
    const newPublished =
      typeof isPublished === "boolean"
        ? isPublished
          ? 1
          : 0
        : existing.is_published;

    await dbPool.query(
      `
      UPDATE quizzes
      SET name = ?, duration_minutes = ?, questions_count = ?, is_published = ?
      WHERE id = ?
      `,
      [newName, newDuration, newQCount, newPublished, id],
    );

    const [rows] = await dbPool.query(
      `
      SELECT
        id,
        job_id,
        name,
        duration_minutes,
        questions_count,
        is_published,
        created_at
      FROM quizzes
      WHERE id = ?
      `,
      [id],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer (logiquement) un quiz: on le dépublie
app.delete("/admin/quizzes/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid quiz id" });
  }
  try {
    await dbPool.query(
      `
      UPDATE quizzes
      SET is_published = 0
      WHERE id = ?
      `,
      [id],
    );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### 2.3. Lier / remplacer un quiz pour un poste (US 6.1 / 6.2)

**Toujours dans** `backend/index.js`  
**Ajouter** (après le bloc précédent) :

```javascript
// === ASSIGNATION QUIZ ↔ POSTE ===

// Assigner ou remplacer le quiz d'un poste
app.put("/admin/jobs/:jobId/quiz", async (req, res) => {
  const jobId = Number(req.params.jobId);
  const { quizId } = req.body;

  if (!jobId || !quizId) {
    return res.status(400).json({ error: "jobId and quizId are required" });
  }

  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();

    const [jobRows] = await connection.query(
      "SELECT * FROM jobs WHERE id = ?",
      [jobId],
    );
    if (jobRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Job not found" });
    }

    const [quizRows] = await connection.query(
      "SELECT * FROM quizzes WHERE id = ?",
      [quizId],
    );
    if (quizRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Ici, on impose qu'un quiz est toujours lié à un job précis.
    // Si on veut "remplacer", il suffit d'avoir un seul quiz publié pour ce job.
    await connection.query(
      `
      UPDATE quizzes
      SET is_published = 0
      WHERE job_id = ? AND id <> ?
      `,
      [jobId, quizId],
    );

    await connection.query(
      `
      UPDATE quizzes
      SET job_id = ?, is_published = 1
      WHERE id = ?
      `,
      [jobId, quizId],
    );

    await connection.commit();

    res.json({ jobId, quizId });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});
```

### 2.4. Tests rapides backend

Depuis `/backend` :

```bash
npm install        # si pas déjà fait
npm run dev        # ou npm start selon ton package.json
```

Vérifier avec un client HTTP (Postman / Thunder Client / curl) :

- `GET http://localhost:4000/admin/jobs`
- `POST http://localhost:4000/admin/jobs`
- `GET/POST/PUT/DELETE http://localhost:4000/admin/quizzes...`
- `PUT http://localhost:4000/admin/jobs/:jobId/quiz`

---

## 3. Front – Hadd_Nass (Vue 3 + Vite)

Front existant : `/frontend/src/App.vue` déjà utilisé pour le parcours candidat.  
On ajoute une vue simple RH pour gérer les quizzes, sans casser le code candidat.

### 3.1. Nouveau composant Admin Quizzes

**Fichier à créer**  
`/frontend/src/AdminQuizzes.vue`

**Contenu**

```vue
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
            <option disabled value="0">-- Sélectionner un poste --</option>
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
            <td>
              <span
                :class="
                  quiz.is_published ? 'badge badge-green' : 'badge badge-gray'
                "
              >
                {{ quiz.is_published ? "Oui" : "Non" }}
              </span>
            </td>
            <td class="actions">
              <button @click="togglePublish(quiz)">
                {{ quiz.is_published ? "Dépublier" : "Publier" }}
              </button>
              <button @click="softDeleteQuiz(quiz)">
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
    error.value = e.message || "Erreur inattendue (jobs)";
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
    error.value = e.message || "Erreur inattendue (quizzes)";
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
    await loadJobs();
    newJobTitle.value = "";
    success.value = "Poste créé.";
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
    await loadQuizzes();
    quizForm.value = {
      jobId: 0,
      name: "",
      durationMinutes: 30,
      questionsCount: 10,
      isPublished: false,
    };
    success.value = "Quiz créé.";
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
      body: JSON.stringify({
        isPublished: !quiz.is_published,
      }),
    });
    if (!res.ok) throw new Error("Erreur mise à jour quiz");
    await loadQuizzes();
    success.value = "Statut de publication mis à jour.";
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
      throw new Error("Erreur suppression (dépublication) quiz");
    }
    await loadQuizzes();
    success.value = "Quiz dépublié.";
  } catch (e) {
    error.value = e.message || "Erreur inattendue";
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.admin {
  min-height: 100vh;
  padding: 24px;
  font-family:
    system-ui,
    -apple-system,
    "Segoe UI",
    sans-serif;
  background: #0f172a;
  color: #e5e7eb;
}

h1 {
  margin-bottom: 20px;
}

.card {
  background: #020617;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #1f2937;
}

.field {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
}

input,
select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #4b5563;
  background: #020617;
  color: #e5e7eb;
}

button {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 14px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.table th,
.table td {
  border: 1px solid #1f2937;
  padding: 6px 8px;
}

.badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
}

.badge-green {
  background: #22c55e33;
  color: #22c55e;
}

.badge-gray {
  background: #4b556333;
  color: #9ca3af;
}

.actions button {
  margin-right: 4px;
}

.error {
  margin-top: 8px;
  color: #fca5a5;
}

.success {
  margin-top: 8px;
  color: #4ade80;
}
</style>
```

### 3.2. Comment tester côté front (local pour Hadd_Nass)

**Fichier à modifier (temporairement)**  
`/frontend/src/App.vue`

Exemple minimal pour monter la vue admin :

```vue
<template>
  <AdminQuizzes />
</template>

<script setup>
import AdminQuizzes from "./AdminQuizzes.vue";
</script>
```

**Lancement**

Depuis `/frontend` :

```bash
npm install      # si pas fait
npm run dev
```

---

## 4. Récap très court

- **Hakim (BDD)** : script SQL `database/sprint2_quiz_part1.sql` pour `jobs` + `quizzes`.
- **Bell_Bar (Back)** : routes `/admin/jobs`, `/admin/quizzes`, `/admin/jobs/:jobId/quiz` ajoutées dans `backend/index.js`.
- **Hadd_Nass (Front)** : composant `frontend/src/AdminQuizzes.vue` pour que le RH crée des postes + quizzes, et gère la publication.

Chacun push sa branche (`back/front/bdd`) sur remote après avoir copié‑collé le code correspondant.
