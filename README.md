# Scrum RH – Quiz App (Vue + Node + MySQL)

## Stack
- **Frontend**: Vue 3 + Vite (dossier `frontend`)
- **Backend**: Node.js (Express) + MySQL (dossier `backend`)
- **Future**: Supabase (auth / stockage) – à brancher plus tard

## Installation

### 1. Frontend
```bash
cd frontend
npm install        # déjà fait une fois, à refaire si besoin
npm run dev        # lance le front sur http://localhost:5173
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # puis adapter les variables MySQL
npm install            # déjà fait une fois, à refaire si besoin
npm run dev            # API sur http://localhost:4000
```

### 3. MySQL
1. Crée une base de données `scrum_rh_quiz` dans MySQL.
2. Mets à jour `DB_USER`, `DB_PASSWORD` (et éventuellement `DB_HOST`, `DB_PORT`).
3. Plus tard on ajoutera les tables (quiz, questions, réponses, candidats, etc.).

### 4. Supabase (plus tard)
Quand tu auras créé ton projet Supabase et le lien:
- On ajoutera les **clés** et **URL** dans un `.env` côté backend et/ou frontend.
- On décidera si Supabase gère l'auth des candidats / recruteurs et/ou le stockage des résultats.

## Prochaines étapes
- Définir le **modèle de données** pour les quiz open positions.
- Créer les premières routes API (`/api/quizzes`, `/api/positions`, etc.).
- Connecter le front à l'API (Axios / fetch) et commencer l'UI de création de quiz.
