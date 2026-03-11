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