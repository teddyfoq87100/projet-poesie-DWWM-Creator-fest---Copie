const express = require("express");
const app = express();
const port = 3000;
const db = require("./db");
const bcrypt = require("bcrypt");

// Middleware pour lire le JSON dans le corps des requêtes
app.use(express.static("public"));
app.use(express.json());

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

// 2. ROUTE DE CONNEXION
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

    res.json({ message: "Connexion réussie !", username: user.username });
  });
});
