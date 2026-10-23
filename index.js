const db = require("./db");
const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Le serveur de The Garden of Poetry fonctionne !");
});

app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${port}`);
});

// Route pour récupérer tous les poèmes
app.get("/api/poems", (req, res) => {
  db.query("SELECT * FROM poems", (err, results) => {
    if (err) {
      console.error("Erreur lors de la récupération des poèmes :", err);
      return res.status(500).json({ error: "Erreur interne du serveur" });
    }
    res.json(results);
  });
});
