const mysql = require("mysql2");

// Création de la connexion à la base de données
const connection = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "root",
  database: "garden_of_poetry",
});

// Test de la connexion
connection.connect((err) => {
  if (err) {
    console.error("Erreur de connexion à la base de données :", err);
    return;
  }
  console.log("Connecté à la base de données MySQL avec succès !");
});

module.exports = connection;
