// ==========================================
// THE GARDEN OF POETRY - SCRIPT PRINCIPAL
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  // 1. Vérification de la session utilisateur au chargement de la page
  verifierSession();

  // 2. Chargement des poèmes depuis la base de données
  recupererPoemes();

  // 3. Gestion de la soumission du formulaire de poème
  const formPoeme = document.getElementById("poemForm");
  if (formPoeme) {
    formPoeme.addEventListener("submit", publierPoeme);
  }
});

// --- FONCTION : Vérifier si l'utilisateur est connecté ---
async function verifierSession() {
  const guestLinks = document.getElementById("guestLinks");
  const userLinks = document.getElementById("userLinks");
  const welcomeUser = document.getElementById("welcomeUser");
  const poemSection = document.getElementById("poemSection");
  const logoutBtn = document.getElementById("logoutBtn");

  try {
    const reponse = await fetch("/api/check-auth");
    const resultat = await reponse.json();

    if (resultat.loggedIn) {
      // Utilisateur connecté : on affiche son nom et le formulaire de poème
      guestLinks.style.display = "none";
      userLinks.style.display = "block";
      welcomeUser.textContent = `Bienvenue, ${resultat.username} 🌿`;
      if (poemSection) poemSection.style.display = "block";

      // Gérer la déconnexion au clic sur le bouton
      logoutBtn.addEventListener("click", async () => {
        const decoReponse = await fetch("/api/logout", { method: "POST" });
        if (decoReponse.ok) {
          alert("Vous êtes déconnecté. À bientôt !");
          window.location.reload();
        } else {
          alert("Erreur lors de la déconnexion.");
        }
      });
    } else {
      // Utilisateur non connecté : on affiche les liens de connexion/inscription
      guestLinks.style.display = "block";
      userLinks.style.display = "none";
      if (poemSection) poemSection.style.display = "none";
    }
  } catch (erreur) {
    console.error("Erreur lors de la vérification de la session :", erreur);
  }
}

// --- FONCTION : Récupérer et afficher tous les poèmes ---
async function recupererPoemes() {
  const conteneur = document.getElementById("poemsList");

  try {
    const reponse = await fetch("/api/poems");
    const poemes = await reponse.json();

    if (poemes.length === 0) {
      conteneur.innerHTML =
        "<p>Aucun poème pour le moment. Soyez le premier à en planter un !</p>";
      return;
    }

    conteneur.innerHTML = "";
    poemes.forEach((poem) => {
      const carte = document.createElement("div");
      carte.className = "poem-card";
      carte.innerHTML = `
                <h3>${poem.title}</h3>
                <small>Par ${poem.author} | Thème : ${poem.theme}</small>
                <p>${poem.content}</p>
            `;
      conteneur.appendChild(carte);
    });
  } catch (erreur) {
    conteneur.innerHTML = "<p>Erreur lors du chargement des poèmes.</p>";
    console.error("Erreur :", erreur);
  }
}

// --- FONCTION : Envoyer un nouveau poème au serveur ---
async function publierPoeme(e) {
  e.preventDefault();

  const nouveauPoeme = {
    title: document.getElementById("title").value,
    author: document.getElementById("author").value,
    theme: document.getElementById("theme").value,
    content: document.getElementById("content").value,
  };

  const messageElement = document.getElementById("formMessage");

  try {
    const reponse = await fetch("/api/poems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouveauPoeme),
    });

    if (reponse.ok) {
      messageElement.textContent =
        "Poème planté avec succès dans le jardin ! 🌱";
      document.getElementById("poemForm").reset();
      recupererPoemes(); // Actualise la liste des poèmes immédiatement
    } else {
      const donnees = await reponse.json();
      messageElement.textContent =
        donnees.error || "Erreur lors de l'ajout du poème.";
    }
  } catch (erreur) {
    messageElement.textContent = "Erreur de connexion avec le serveur.";
    console.error("Erreur :", erreur);
  }
}
// --- FONCTION : Récupérer et afficher tous les poèmes (avec bouton de suppression) ---
async function recupererPoemes() {
  const conteneur = document.getElementById("poemsList");

  try {
    const reponse = await fetch("/api/poems");
    const poemes = await reponse.json();

    if (poemes.length === 0) {
      conteneur.innerHTML =
        "<p>Aucun poème pour le moment. Soyez le premier à en planter un !</p>";
      return;
    }

    conteneur.innerHTML = "";
    poemes.forEach((poem) => {
      const carte = document.createElement("div");
      carte.className = "poem-card";

      // On construit la carte du poème en y ajoutant un bouton "Supprimer"
      carte.innerHTML = `
                <h3>${poem.title}</h3>
                <small>Par ${poem.author} | Thème : ${poem.theme}</small>
                <p>${poem.content}</p>
                <button class="delete-btn" data-id="${poem.id}">Supprimer ce poème</button>
            `;

      // On écoute le clic sur le bouton de suppression de cette carte précise
      const boutonSupprimer = carte.querySelector(".delete-btn");
      boutonSupprimer.addEventListener("click", async () => {
        if (confirm("Voulez-vous vraiment supprimer ce poème du jardin ?")) {
          await supprimerPoeme(poem.id);
        }
      });

      conteneur.appendChild(carte);
    });
  } catch (erreur) {
    conteneur.innerHTML = "<p>Erreur lors du chargement des poèmes.</p>";
    console.error("Erreur :", erreur);
  }
}

// --- FONCTION : Envoyer la demande de suppression au serveur Express ---
async function supprimerPoeme(idPoeme) {
  try {
    const reponse = await fetch(`/api/poems/${idPoeme}`, {
      method: "DELETE", // On utilise la méthode HTTP DELETE
    });

    const resultat = await reponse.json();

    if (reponse.ok) {
      alert(resultat.message);
      recupererPoemes(); // On actualise instantanément la liste des poèmes affichés
    } else {
      alert(resultat.error || "Erreur lors de la suppression.");
    }
  } catch (erreur) {
    console.error("Erreur de connexion :", erreur);
    alert("Impossible de contacter le serveur.");
  }
}
