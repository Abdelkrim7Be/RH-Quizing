import { createApp } from "vue";
import App from "./App.vue";
import RhResults from "./RhResults.vue";
import AdminQuizzes from "./AdminQuizzes.vue";
import AdminQuestions from "./AdminQuestions.vue";

const url = new URL(window.location.href);
const path = url.pathname;

let RootComponent = App;
if (path.startsWith("/rh")) {
  RootComponent = RhResults;
} else if (path.startsWith("/admin-quizzes")) {
  RootComponent = AdminQuizzes;
} else if (path.startsWith("/admin-questions")) {
  RootComponent = AdminQuestions;
}

createApp(RootComponent).mount("#app");
