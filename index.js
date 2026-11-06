const express = require("express");
const session = require("express-session"); // 1. Import de express-session
const app = express();
const port = 3000;
const db = require("./db");
const bcrypt = require("bcrypt");

// Middleware pour lire le JSON dans le corps des requêtes et les fichiers statiques
app.use(express.static("public"));
app.use(express.json());

// --- AJOUT IMPORTANT : Configuration du middleware de session ---
app.use(
  session({
    secret: "mon_jardin_secret_tres_securise", // Vous pouvez mettre ce texte que vous voulez
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // false pour le développement en local (HTTP)
  }),
);

app.get("/", (req, res) => {
  res.send("Le serveur de The Garden of Poetry fonctionne !");
});

app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${port}`);
});

// Route pour récupérer les poèmes (avec filtre optionnel par thème)
app.get("/api/poems", (req, res) => {
  const { theme } = req.query;

  let query = "SELECT * FROM poems";
  const queryParams = [];

  if (theme) {
    query += " WHERE theme = ?";
    queryParams.push(theme);
  }

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Erreur lors de la récupération des poèmes :", err);
      return res.status(500).json({ error: "Erreur interne du serveur" });
    }
    res.json(results);
  });
});

// 1. ROUTE D'INSCRIPTION
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires" });
  }

  try {
    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertion dans la base de données
    const query =
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
    db.query(query, [username, email, hashedPassword], (err, results) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(400)
            .json({ error: "Ce nom d'utilisateur ou cet email existe déjà" });
        }
        return res.status(500).json({ error: "Erreur lors de l'inscription" });
      }
      res.status(201).json({ message: "Utilisateur créé avec succès !" });
    });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// 2. ROUTE DE CONNEXION (Mémorisation de la session)
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires" });
  }

  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Erreur serveur" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const user = results[0];

    // Vérification du mot de passe haché
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    // --- ENREGISTREMENT DE L'UTILISATEUR DANS LA SESSION ---
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ message: "Connexion réussie !", username: user.username });
  });
});

// ROUTE D'AJOUT DE POÈME (Sécurisée : liée à l'utilisateur connecté)
app.post("/api/poems", (req, res) => {
  // Vérifiez si l'utilisateur est bien connecté via sa session
  if (!req.session.userId) {
    return res
      .status(401)
      .json({ error: "Vous devez être connecté pour publier un poème." });
  }

  const { title, author, theme, content } = req.body;
  const userId = req.session.userId; // ID de l'utilisateur connecté

  const query =
    "INSERT INTO poems (title, author, theme, content, user_id) VALUES (?, ?, ?, ?, ?)";
  db.query(query, [title, author, theme, content, userId], (err, result) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Erreur lors de l'enregistrement du poème." });
    }
    res.status(201).json({ message: "Poème publié avec succès !" });
  });
});
// Route pour vérifier si l'utilisateur est connecté
app.get("/api/check-auth", (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ loggedIn: true, username: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// Optionnel : Route de déconnexion
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err)
      return res.status(500).json({ error: "Erreur lors de la déconnexion" });
    res.clearCookie("connect.sid"); // Nom par défaut du cookie de session
    res.json({ message: "Déconnexion réussie" });
  });
});
// ==========================================
// ROUTE : Supprimer un poème du jardin
// ==========================================
app.delete("/api/poems/:id", (req, res) => {
  // 1. On vérifie d'abord si l'utilisateur est bien connecté via sa session
  if (!req.session.userId) {
    return res
      .status(401)
      .json({ error: "Vous devez être connecté pour supprimer un poème." });
  }

  const poemId = req.params.id;
  const userId = req.session.userId; // ID de l'utilisateur connecté

  // 2. On prépare la requête de suppression dans la base de données
  // Sécurité : on s'assure que le poème appartient bien à l'utilisateur (user_id = userId)
  const query = "DELETE FROM poems WHERE id = ? AND user_id = ?";

  db.query(query, [poemId, userId], (err, result) => {
    if (err) {
      console.error("Erreur lors de la suppression du poème :", err);
      return res.status(500).json({ error: "Erreur interne du serveur." });
    }

    // Si aucune ligne n'a été effacée, c'est que le poème n'existe pas ou n'appartient pas à cet utilisateur
    if (result.affectedRows === 0) {
      return res
        .status(403)
        .json({ error: "Action non autorisée ou poème introuvable." });
    }

    // Succès !
    res.json({ message: "Poème supprimé avec succès du jardin !" });
  });
});
