import { createApp } from "vue";
import App from "./App.vue";
import RhResults from "./RhResults.vue";

const url = new URL(window.location.href);
// Simple routing: /rh shows RH results page, everything else shows candidate quiz
const isRh = url.pathname.startsWith("/rh");

const app = createApp(isRh ? RhResults : App);
app.mount("#app");
