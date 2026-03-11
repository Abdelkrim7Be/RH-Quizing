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

</template>      