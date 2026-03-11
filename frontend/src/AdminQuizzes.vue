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


      
</template>      