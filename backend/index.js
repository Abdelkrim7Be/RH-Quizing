import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initDb() {
  const connection = await dbPool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        duration_minutes INT NOT NULL DEFAULT 30,
        questions_count INT NOT NULL DEFAULT 10,
        is_published TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quiz_id INT NOT NULL,
        text TEXT NOT NULL,
        category VARCHAR(100),
        level ENUM('junior','senior') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS choices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT NOT NULL,
        text TEXT NOT NULL,
        is_correct TINYINT(1) NOT NULL DEFAULT 0,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        job_id INT NOT NULL,
        quiz_id INT NOT NULL,
        status ENUM('in_progress','completed') NOT NULL DEFAULT 'in_progress',
        score_percent DECIMAL(5,2),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        duration_seconds INT,
        UNIQUE KEY uniq_candidate_job (candidate_id, job_id),
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        attempt_id INT NOT NULL,
        question_id INT NOT NULL,
        choice_id INT NOT NULL,
        is_correct TINYINT(1) NOT NULL,
        FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (choice_id) REFERENCES choices(id) ON DELETE CASCADE
      )
    `);

    const [jobCountRows] = await connection.query(
      "SELECT COUNT(*) AS cnt FROM jobs",
    );
    if (jobCountRows[0].cnt === 0) {
      const [jobResult] = await connection.query(
        "INSERT INTO jobs (title) VALUES (?)",
        ["Analyste Sécurité Junior"],
      );
      const jobId = jobResult.insertId;

      const [quizResult] = await connection.query(
        `
          INSERT INTO quizzes (job_id, name, duration_minutes, questions_count, is_published)
          VALUES (?, ?, ?, ?, 1)
        `,
        [jobId, "Quiz sécurité de base", 10, 3],
      );
      const quizId = quizResult.insertId;

      const questionsData = [
        {
          text: "Quel protocole est utilisé pour sécuriser HTTP ?",
          category: "réseau",
          level: "junior",
        },
        {
          text: "Quel est l'objectif principal d'un pare-feu ?",
          category: "réseau",
          level: "junior",
        },
        {
          text: "Que signifie le sigle MFA ?",
          category: "sécurité",
          level: "junior",
        },
      ];

      const questionIds = [];
      for (const q of questionsData) {
        const [qResult] = await connection.query(
          `
            INSERT INTO questions (quiz_id, text, category, level)
            VALUES (?, ?, ?, ?)
          `,
          [quizId, q.text, q.category, q.level],
        );
        questionIds.push(qResult.insertId);
      }

      const choicesInserts = [
        {
          questionIndex: 0,
          text: "TLS/SSL",
          isCorrect: 1,
        },
        {
          questionIndex: 0,
          text: "FTP",
          isCorrect: 0,
        },
        {
          questionIndex: 0,
          text: "SMTP",
          isCorrect: 0,
        },
        {
          questionIndex: 0,
          text: "DNS",
          isCorrect: 0,
        },
        {
          questionIndex: 1,
          text: "Filtrer le trafic réseau entrant et sortant",
          isCorrect: 1,
        },
        {
          questionIndex: 1,
          text: "Stocker des fichiers",
          isCorrect: 0,
        },
        {
          questionIndex: 1,
          text: "Envoyer des emails",
          isCorrect: 0,
        },
        {
          questionIndex: 1,
          text: "Exécuter du code JavaScript",
          isCorrect: 0,
        },
        {
          questionIndex: 2,
          text: "Multi-Factor Authentication",
          isCorrect: 1,
        },
        {
          questionIndex: 2,
          text: "Main Frame Access",
          isCorrect: 0,
        },
        {
          questionIndex: 2,
          text: "Managed File Agreement",
          isCorrect: 0,
        },
        {
          questionIndex: 2,
          text: "Master Firewall Application",
          isCorrect: 0,
        },
      ];

      for (const c of choicesInserts) {
        const questionId = questionIds[c.questionIndex];
        await connection.query(
          `
            INSERT INTO choices (question_id, text, is_correct)
            VALUES (?, ?, ?)
          `,
          [questionId, c.text, c.isCorrect],
        );
      }
    }
  } finally {
    connection.release();
  }
}

const mailTransport =
  process.env.MAIL_HOST && process.env.MAIL_FROM
    ? nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT || 587),
        secure: false,
        auth:
          process.env.MAIL_USER && process.env.MAIL_PASSWORD
            ? {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASSWORD,
              }
            : undefined,
      })
    : null;

app.get("/health", async (req, res) => {
  try {
    const [rows] = await dbPool.query("SELECT 1 AS ok");
    res.json({ status: "ok", db: rows[0].ok === 1 });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/jobs", async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      `
        SELECT j.id, j.title, q.id as quiz_id, q.duration_minutes, q.questions_count
        FROM jobs j
        LEFT JOIN quizzes q
          ON q.job_id = j.id AND q.is_published = 1
        ORDER BY j.title ASC
      `,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
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

app.post("/candidates", async (req, res) => {
  const { email, fullName } = req.body;
  if (!email || !fullName) {
    return res.status(400).json({ error: "email and fullName are required" });
  }
  try {
    const [existing] = await dbPool.query(
      "SELECT * FROM candidates WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res.json(existing[0]);
    }
    const [result] = await dbPool.query(
      "INSERT INTO candidates (email, full_name) VALUES (?, ?)",
      [email, fullName],
    );
    const [created] = await dbPool.query(
      "SELECT * FROM candidates WHERE id = ?",
      [result.insertId],
    );
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un quiz
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
// Supprimer un quiz: on le dépublie
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
app.post("/quiz/start", async (req, res) => {
  const { candidateId, jobId } = req.body;
  if (!candidateId || !jobId) {
    return res
      .status(400)
      .json({ error: "candidateId and jobId are required" });
  }
  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();

    const [attempts] = await connection.query(
      "SELECT * FROM quiz_attempts WHERE candidate_id = ? AND job_id = ?",
      [candidateId, jobId],
    );
    if (attempts.length > 0 && attempts[0].status === "completed") {
      await connection.rollback();
      return res.status(409).json({
        error: "Quiz already taken for this job",
      });
    }

    const [quizRows] = await connection.query(
      `
        SELECT q.*
        FROM quizzes q
        WHERE q.job_id = ? AND q.is_published = 1
        LIMIT 1
      `,
      [jobId],
    );
    if (quizRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "No published quiz for this job" });
    }
    const quiz = quizRows[0];

    const [questions] = await connection.query(
      `
        SELECT id, text, category, level
        FROM questions
        WHERE quiz_id = ?
        ORDER BY RAND()
        LIMIT ?
      `,
      [quiz.id, quiz.questions_count],
    );

    if (questions.length === 0) {
      await connection.rollback();
      return res
        .status(400)
        .json({ error: "No questions configured for this quiz" });
    }

    const questionIds = questions.map((q) => q.id);
    const [choices] = await connection.query(
      `
        SELECT id, question_id, text
        FROM choices
        WHERE question_id IN (?)
        ORDER BY id ASC
      `,
      [questionIds],
    );

    let attemptId;
    if (attempts.length === 0) {
      const [insertResult] = await connection.query(
        `
          INSERT INTO quiz_attempts (candidate_id, job_id, quiz_id)
          VALUES (?, ?, ?)
        `,
        [candidateId, jobId, quiz.id],
      );
      attemptId = insertResult.insertId;
    } else {
      attemptId = attempts[0].id;
    }

    await connection.commit();

    const questionsWithChoices = questions.map((q) => ({
      ...q,
      choices: choices.filter((c) => c.question_id === q.id),
    }));

    res.json({
      attemptId,
      quiz: {
        id: quiz.id,
        name: quiz.name,
        durationMinutes: quiz.duration_minutes,
        questionsCount: quiz.questions_count,
      },
      questions: questionsWithChoices,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.post("/quiz/attempts/:attemptId/submit", async (req, res) => {
  const attemptId = Number(req.params.attemptId);
  const { answers } = req.body;

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "answers array is required" });
  }

  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();

    const [attemptRows] = await connection.query(
      `
        SELECT a.*, q.duration_minutes, c.email, c.full_name, j.title as job_title
        FROM quiz_attempts a
        JOIN quizzes q ON a.quiz_id = q.id
        JOIN candidates c ON a.candidate_id = c.id
        JOIN jobs j ON a.job_id = j.id
        WHERE a.id = ?
        FOR UPDATE
      `,
      [attemptId],
    );
    if (attemptRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Attempt not found" });
    }
    const attempt = attemptRows[0];
    if (attempt.status === "completed") {
      await connection.rollback();
      return res.status(409).json({ error: "Attempt already submitted" });
    }

    const [correctChoices] = await connection.query(
      `
        SELECT q.id as question_id, c.id as choice_id
        FROM questions q
        JOIN choices c ON c.question_id = q.id AND c.is_correct = 1
        WHERE q.quiz_id = ?
      `,
      [attempt.quiz_id],
    );

    const correctMap = new Map();
    for (const row of correctChoices) {
      correctMap.set(row.question_id, row.choice_id);
    }

    let correctCount = 0;
    const totalQuestions = answers.length;
    const now = new Date();
    const startedAt = new Date(attempt.started_at);
    const durationSeconds = Math.floor(
      (now.getTime() - startedAt.getTime()) / 1000,
    );

    for (const ans of answers) {
      const questionId = Number(ans.questionId);
      const choiceId = Number(ans.choiceId);
      const correctChoiceId = correctMap.get(questionId);
      const isCorrect = correctChoiceId === choiceId ? 1 : 0;
      if (isCorrect) correctCount += 1;

      await connection.query(
        `
          INSERT INTO quiz_attempt_answers (attempt_id, question_id, choice_id, is_correct)
          VALUES (?, ?, ?, ?)
        `,
        [attemptId, questionId, choiceId, isCorrect],
      );
    }

    const scorePercent = (correctCount / totalQuestions) * 100;

    await connection.query(
      `
        UPDATE quiz_attempts
        SET status = 'completed',
            score_percent = ?,
            completed_at = ?,
            duration_seconds = ?
        WHERE id = ?
      `,
      [scorePercent, now, durationSeconds, attemptId],
    );

    if (mailTransport) {
      try {
        await mailTransport.sendMail({
          from: process.env.MAIL_FROM,
          to: attempt.email,
          subject: `Résultat de votre quiz - ${attempt.job_title}`,
          text: `Bonjour ${attempt.full_name},

Vous avez terminé le quiz pour le poste "${attempt.job_title}".
Score: ${scorePercent.toFixed(2)}%
Temps passé: ${durationSeconds} secondes

Cordialement,
L'équipe recrutement`,
        });
      } catch (mailErr) {
        console.error("Error sending result email", mailErr);
      }
    }

    await connection.commit();

    res.json({
      attemptId,
      scorePercent,
      durationSeconds,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.get("/quiz/attempts/:attemptId/result", async (req, res) => {
  const attemptId = Number(req.params.attemptId);
  try {
    const [rows] = await dbPool.query(
      `
        SELECT a.id, a.score_percent, a.duration_seconds,
               j.title as job_title
        FROM quiz_attempts a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.id = ?
      `,
      [attemptId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Result not found" });
    }
    const result = rows[0];
    res.json({
      attemptId: result.id,
      scorePercent: result.score_percent,
      durationSeconds: result.duration_seconds,
      jobTitle: result.job_title,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lister les questions d'un quiz (avec filtres simples)
app.get("/admin/quizzes/:quizId/questions", async (req, res) => {
  const quizId = Number(req.params.quizId);
  const { category, level, type } = req.query;

  if (!quizId) {
    return res.status(400).json({ error: "Invalid quizId" });
  }

  try {
    const filters = ["q.quiz_id = ?"];
    const params = [quizId];

    if (category) {
      filters.push("q.category = ?");
      params.push(String(category));
    }
    if (level) {
      filters.push("q.level = ?");
      params.push(String(level));
    }
    if (type) {
      filters.push("q.type = ?");
      params.push(String(type));
    }

    const whereClause = filters.join(" AND ");

    const [questions] = await dbPool.query(
      `
      SELECT
        q.id,
        q.quiz_id,
        q.text,
        q.category,
        q.level,
        q.type,
        q.created_at
      FROM questions q
      WHERE ${whereClause}
      ORDER BY q.created_at DESC
      `,
      params,
    );

    const questionIds = questions.map((q) => q.id);
    let choices = [];
    if (questionIds.length > 0) {
      const [rows] = await dbPool.query(
        `
        SELECT id, question_id, text, is_correct
        FROM choices
        WHERE question_id IN (?)
        ORDER BY id ASC
        `,
        [questionIds],
      );
      choices = rows;
    }

    const withChoices = questions.map((q) => ({
      ...q,
      choices: choices.filter((c) => c.question_id === q.id),
    }));

    res.json(withChoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/admin/quizzes/:quizId/questions", async (req, res) => {
  const quizId = Number(req.params.quizId);
  const { text, category, level, type, choices } = req.body;

  if (!quizId) {
    return res.status(400).json({ error: "Invalid quizId" });
  }
  if (!text || !level || !type) {
    return res.status(400).json({ error: "text, level and type are required" });
  }
  if (!["QCM", "TEXT"].includes(type)) {
    return res.status(400).json({ error: "type must be QCM or TEXT" });
  }

  // Validation spécifique QCM
  if (type === "QCM") {
    if (!Array.isArray(choices) || choices.length < 2) {
      return res
        .status(400)
        .json({ error: "QCM must have at least 2 choices" });
    }
    const correctCount = choices.filter((c) => c.isCorrect).length;
    if (correctCount !== 1) {
      return res.status(400).json({
        error: "QCM must have exactly one correct choice",
      });
    }
  }

  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();

    const [quizRows] = await connection.query(
      "SELECT id FROM quizzes WHERE id = ?",
      [quizId],
    );
    if (quizRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Quiz not found" });
    }

    const [qResult] = await connection.query(
      `
      INSERT INTO questions (quiz_id, text, category, level, type)
      VALUES (?, ?, ?, ?, ?)
      `,
      [quizId, text, category || null, level, type],
    );
    const questionId = qResult.insertId;

    if (type === "QCM") {
      for (const c of choices) {
        await connection.query(
          `
          INSERT INTO choices (question_id, text, is_correct)
          VALUES (?, ?, ?)
          `,
          [questionId, c.text, c.isCorrect ? 1 : 0],
        );
      }
    }

    await connection.commit();

    const [createdRows] = await connection.query(
      `
      SELECT
        id,
        quiz_id,
        text,
        category,
        level,
        type,
        created_at
      FROM questions
      WHERE id = ?
      `,
      [questionId],
    );

    const created = createdRows[0];

    let createdChoices = [];
    if (type === "QCM") {
      const [rows] = await connection.query(
        `
        SELECT id, question_id, text, is_correct
        FROM choices
        WHERE question_id = ?
        ORDER BY id ASC
        `,
        [questionId],
      );
      createdChoices = rows;
    }

    res.status(201).json({
      ...created,
      choices: createdChoices,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database", err);
    process.exit(1);
  });
