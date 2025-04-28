// Configuration sécurisée
const CONFIG = {
    // L'URL de l'API mise à jour - Vous devrez remplacer cette URL après votre nouveau déploiement
    API_URL: 'https://script.google.com/macros/s/AKfycbyeFJUBvFZmvrfeGtPY2Qp82Bsaybvuo3WyKDbrdWt_LNfKpfnGWwGKuDDVc-b0E8KCbw/exec',
    // URL du groupe WhatsApp (non exposée directement dans le HTML)
    WHATSAPP_URL: 'https://chat.whatsapp.com/KBffouh7SXH6pz2CQGtF3l',
    // Nombre cible de portions par catégorie
    TARGET_PER_CATEGORY: 30,
    // Délai d'attente maximum pour les requêtes (en ms)
    REQUEST_TIMEOUT: 10000
};

// Variables globales
let participations = [];
let csrfToken = '';

// Génération d'un jeton CSRF
function generateCSRFToken() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
        token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
}

// Fonctions de validation
function validateEmail(email) {
    // Expression régulière corrigée pour les validations d'email
    if (!email || typeof email !== 'string') return false;
    // Validation simple qui évite les problèmes de regex complexes
    if (!email.includes('@')) return false;
    const parts = email.split('@');
    if (parts.length !== 2 || !parts[0].length || !parts[1].length) return false;
    return parts[1].includes('.');
}

function validatePhone(phone) {
    const re = /^[0-9]{10}$/;
    return re.test(phone);
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    // Échapper les caractères HTML spéciaux
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Fonctions d'initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Générer et stocker un jeton CSRF
    csrfToken = generateCSRFToken();
    document.getElementById('csrfToken').value = csrfToken;
    
    // Configuration du lien WhatsApp avec confirmation
    const whatsappLink = document.getElementById('whatsapp-link');
    whatsappLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Vous allez être redirigé vers WhatsApp pour rejoindre le groupe. Continuer?')) {
            window.open(CONFIG.WHATSAPP_URL, '_blank');
        }
    });
    
    // Gestion des modals
    setupModals();
    
    // Gestion du formulaire
    setupForm();
    
    // Validation en temps réel des champs
    setupLiveValidation();
    
    // Chargement des données depuis Google Sheets
    loadDataFromGoogleSheets();
});

// Configuration de la validation en temps réel
function setupLiveValidation() {
    // Liste des champs à valider en temps réel
    const fields = [
        { id: 'nom', validate: value => value.trim().length > 0 },
        { id: 'email', validate: validateEmail },
        { id: 'telephone', validate: validatePhone },
        { id: 'nbPersonnes', validate: value => !isNaN(value) && parseInt(value) >= 1 && parseInt(value) <= 20 },
        { id: 'categorie', validate: value => value !== '' },
        { id: 'detail', validate: value => value.trim().length > 0 },
        { id: 'portions', validate: value => !isNaN(value) && parseInt(value) >= 1 && parseInt(value) <= 100 }
    ];
    
    // Ajouter des écouteurs d'événements pour chaque champ
    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            // Validation à chaque modification du champ
            element.addEventListener('input', function() {
                validateField(this, field.validate);
            });
            
            // Validation lors de la perte de focus
            element.addEventListener('blur', function() {
                validateField(this, field.validate);
            });
        }
    });
}

// Valider un champ et mettre à jour son apparence
function validateField(field, validateFn) {
    if (!field.required && field.value.trim() === '') {
        // Champ facultatif et vide
        field.classList.remove('valid');
        return true;
    }
    
    const isValid = validateFn(field.value);
    if (isValid) {
        field.classList.add('valid');
    } else {
        field.classList.remove('valid');
    }
    return isValid;
}

function setupModals() {
    // Modal d'inscription
    const inscriptionModal = document.getElementById("inscriptionModal");
    const openModalBtn = document.getElementById("openModalBtn");
    const inscriptionCloseBtn = inscriptionModal.querySelector(".close");
    
    openModalBtn.onclick = function() {
        inscriptionModal.style.display = "block";
    }
    
    inscriptionCloseBtn.onclick = function() {
        inscriptionModal.style.display = "none";
        resetForm();
    }
    
    // Modal de politique de confidentialité
    const privacyModal = document.getElementById("privacyModal");
    const openPrivacyBtn = document.getElementById("openPrivacyBtn");
    const privacyCloseBtn = privacyModal.querySelector(".close");
    const closePrivacyBtn = document.getElementById("closePrivacyBtn");
    
    openPrivacyBtn.onclick = function(e) {
        e.preventDefault();
        privacyModal.style.display = "block";
    }
    
    privacyCloseBtn.onclick = function() {
        privacyModal.style.display = "none";
    }
    
    closePrivacyBtn.onclick = function() {
        privacyModal.style.display = "none";
    }
    
    // Fermeture des modals en cliquant à l'extérieur
    window.onclick = function(event) {
        if (event.target == inscriptionModal) {
            inscriptionModal.style.display = "none";
            resetForm();
        }
        if (event.target == privacyModal) {
            privacyModal.style.display = "none";
        }
    }
}

function setupForm() {
    const form = document.getElementById("inscriptionForm");
    const categorieSelect = document.getElementById("categorie");
    const detailsContainer = document.getElementById("detailsContainer");
    
    // Afficher/masquer les détails en fonction de la catégorie sélectionnée
    categorieSelect.addEventListener("change", function() {
        if (this.value) {
            detailsContainer.style.display = "block";
        } else {
            detailsContainer.style.display = "none";
        }
    });
    
    // Soumission du formulaire avec validation
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        
        // Récupérer les valeurs du formulaire
        const nom = document.getElementById("nom").value.trim();
        const email = document.getElementById("email").value.trim();
        const telephone = document.getElementById("telephone").value.trim();
        const nbPersonnes = parseInt(document.getElementById("nbPersonnes").value);
        const categorie = document.getElementById("categorie").value;
        const detail = document.getElementById("detail") ? document.getElementById("detail").value.trim() : "";
        const portions = document.getElementById("portions") ? parseInt(document.getElementById("portions").value) : 0;
        const commentaire = document.getElementById("commentaire").value.trim();
        const formToken = document.getElementById("csrfToken").value;
        
        // Validation des données
        if (!nom || !email || !telephone || !categorie || (categorie && (!detail || !portions))) {
            showFormError("Veuillez remplir tous les champs obligatoires.");
            return;
        }
        
        if (!validateEmail(email)) {
            showFormError("Veuillez entrer une adresse email valide.");
            return;
        }
        
        if (!validatePhone(telephone)) {
            showFormError("Veuillez entrer un numéro de téléphone valide (10 chiffres).");
            return;
        }
        
        if (isNaN(nbPersonnes) || nbPersonnes < 1 || nbPersonnes > 20) {
            showFormError("Le nombre de personnes doit être entre 1 et 20.");
            return;
        }
        
        if (categorie && (isNaN(portions) || portions < 1 || portions > 100)) {
            showFormError("Le nombre de portions doit être entre 1 et 100.");
            return;
        }
        
        // Vérifier que le jeton CSRF est présent et valide
        if (formToken !== csrfToken) {
            showFormError("Erreur de sécurité. Veuillez recharger la page et réessayer.");
            return;
        }
        
        // Sanitiser les entrées
        const sanitizedData = {
            timestamp: new Date().toISOString(),
            nom: sanitizeInput(nom),
            email: sanitizeInput(email),
            telephone: sanitizeInput(telephone),
            nbPersonnes: nbPersonnes,
            categorie: sanitizeInput(categorie),
            detail: sanitizeInput(detail),
            portions: portions,
            commentaire: sanitizeInput(commentaire),
            csrfToken: formToken,
            origin: window.location.hostname // Envoyer le domaine d'origine pour la vérification de sécurité
        };
        
        // Envoyer les données au Google Sheet via Google Apps Script
        console.log("Données à envoyer au Google Sheet:", sanitizedData);
        
        // Afficher un message d'attente
        const formBtn = document.querySelector("#inscriptionForm .btn");
        const originalBtnText = formBtn.textContent;
        formBtn.textContent = "Envoi en cours...";
        formBtn.disabled = true;
        
        // Créer un contrôleur d'abandon pour limiter le temps d'attente
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
        
        fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'cors', // Mode CORS maintenant que le serveur est configuré correctement
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
            },
            redirect: 'follow',
            body: JSON.stringify(sanitizedData),
            signal: controller.signal
        })
        .then(response => {
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Réinitialiser le bouton
            formBtn.textContent = originalBtnText;
            formBtn.disabled = false;
            
            if (data.result === 'success') {
                // Ajouter aux données locales pour la mise à jour de l'interface
                const newId = participations.length > 0 ? 
                    Math.max(...participations.map(p => p.id)) + 1 : 1;
                    
                participations.push({
                    id: newId,
                    ...sanitizedData
                });
                
                updateContributionsList();
                showFormSuccess();
                resetForm();
                
                // Mettre à jour le jeton CSRF si un nouveau jeton est fourni
                if (data.newCsrfToken) {
                    csrfToken = data.newCsrfToken;
                    document.getElementById('csrfToken').value = csrfToken;
                } else {
                    // Générer un nouveau jeton CSRF
                    csrfToken = generateCSRFToken();
                    document.getElementById('csrfToken').value = csrfToken;
                }
                
                // Recharger les données après 2 secondes
                setTimeout(() => {
                    loadDataFromGoogleSheets();
                }, 2000);
            } else {
                showFormError(data.error || "Erreur lors de l'enregistrement. Veuillez réessayer.");
            }
        })
        .catch(error => {
            clearTimeout(timeoutId);
            console.error('Erreur lors de l\'envoi des données:', error);
            
            if (error.name === 'AbortError') {
                showFormError("La requête a pris trop de temps. Veuillez réessayer.");
            } else {
                showFormError("Erreur de connexion. Veuillez vérifier votre connexion internet et réessayer.");
            }
            
            // Réinitialiser le bouton
            formBtn.textContent = originalBtnText;
            formBtn.disabled = false;
        });
    });
}

// Fonction pour charger les données depuis Google Sheets via le Google Apps Script
async function loadDataFromGoogleSheets() {
    try {
        // Afficher un message de chargement
        document.getElementById("saleList").innerHTML = "<li>Chargement des données...</li>";
        document.getElementById("sucreList").innerHTML = "<li>Chargement des données...</li>";
        document.getElementById("softList").innerHTML = "<li>Chargement des données...</li>";
        document.getElementById("alcoList").innerHTML = "<li>Chargement des données...</li>";
        
        // Créer une URL pour faire une requête GET au script avec l'origine et le jeton CSRF
        const originParam = encodeURIComponent(window.location.hostname);
        const tokenParam = encodeURIComponent(csrfToken);
        const cacheBreaker = new Date().getTime();
        const fetchUrl = `${CONFIG.API_URL}?action=getData&origin=${originParam}&csrf=${tokenParam}&_=${cacheBreaker}`;
        
        // Créer un contrôleur d'abandon pour limiter le temps d'attente
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
        
        // Tenter de récupérer les données du serveur
        const response = await fetch(fetchUrl, {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const jsonData = await response.json();
            
            // Si un nouveau jeton CSRF est fourni, le stocker
            if (jsonData.csrfToken) {
                csrfToken = jsonData.csrfToken;
                document.getElementById('csrfToken').value = csrfToken;
            }
            
            if (jsonData.result === 'success' && jsonData.data && jsonData.data.length > 0) {
                // Transformer les données pour correspondre à notre format
                participations = jsonData.data.map((row, index) => ({
                    id: index + 1,
                    nom: row.nom || '',
                    email: row.email || '',
                    telephone: row.telephone || '',
                    nbPersonnes: parseInt(row.nbPersonnes) || 1,
                    categorie: row.categorie || '',
                    detail: row.detail || '',
                    portions: parseInt(row.portions) || 0,
                    commentaire: row.commentaire || ''
                }));
                
                // Mettre à jour l'interface
                updateContributionsList();
                return;
            }
        }
        
        // Si nous n'avons pas pu charger les données ou si elles sont vides,
        // utiliser les données par défaut
        console.log("Aucune donnée chargée du serveur, utilisation des données par défaut");
        useDefaultData();
        
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        
        if (error.name === 'AbortError') {
            console.log("La requête a pris trop de temps, utilisation des données par défaut");
        }
        
        // En cas d'erreur, utiliser des données de démo
        useDefaultData();
    }
}

// Fonction pour utiliser des données par défaut en cas d'erreur
function useDefaultData() {
    participations = [
        {id: 1, nom: "Participant Exemple 1", email: "exemple1@example.com", telephone: "0612345678", nbPersonnes: 2, categorie: "sale", detail: "Quiche aux légumes", portions: 8, commentaire: ""},
        {id: 2, nom: "Participant Exemple 2", email: "exemple2@example.com", telephone: "0623456789", nbPersonnes: 3, categorie: "sucre", detail: "Tarte aux fruits", portions: 10, commentaire: ""},
        {id: 3, nom: "Participant Exemple 3", email: "exemple3@example.com", telephone: "0634567890", nbPersonnes: 1, categorie: "alco", detail: "Vin rouge", portions: 12, commentaire: "2 bouteilles"},
        {id: 4, nom: "Participant Exemple 4", email: "exemple4@example.com", telephone: "0645678901", nbPersonnes: 2, categorie: "soft", detail: "Jus et sodas", portions: 10, commentaire: ""}
    ];
    updateContributionsList();
}

// Fonctions de mise à jour de l'UI
function updateContributionsList() {
    const categories = {
        sale: { list: document.getElementById("saleList"), total: document.getElementById("saleTotal"), meter: document.getElementById("saleMeter") },
        sucre: { list: document.getElementById("sucreList"), total: document.getElementById("sucreTotal"), meter: document.getElementById("sucreMeter") },
        soft: { list: document.getElementById("softList"), total: document.getElementById("softTotal"), meter: document.getElementById("softMeter") },
        alco: { list: document.getElementById("alcoList"), total: document.getElementById("alcoTotal"), meter: document.getElementById("alcoMeter") }
    };
    
    const totals = { sale: 0, sucre: 0, soft: 0, alco: 0 };
    
    // Réinitialiser les listes
    for (const cat in categories) {
        categories[cat].list.innerHTML = "";
    }
    
    // Remplir avec les participations
    participations.forEach(p => {
        if (categories[p.categorie]) {
            const li = document.createElement("li");
            // N'afficher que le nom (pas l'email ou téléphone) pour la confidentialité
            li.innerHTML = `<span>${sanitizeInput(p.detail)} (${sanitizeInput(p.nom)})</span> <span>${p.portions} portions</span>`;
            categories[p.categorie].list.appendChild(li);
            totals[p.categorie] += parseInt(p.portions) || 0;
        }
    });
    
    // Ajouter un message si la liste est vide
    for (const cat in categories) {
        if (categories[cat].list.children.length === 0) {
            categories[cat].list.innerHTML = "<li>Aucune contribution pour le moment</li>";
        }
    }
    
    // Mettre à jour les totaux et barres de progression
    for (const cat in categories) {
        categories[cat].total.textContent = totals[cat];
        const percentage = Math.min(totals[cat] / CONFIG.TARGET_PER_CATEGORY * 100, 100);
        categories[cat].meter.style.width = `${percentage}%`;
        
        // Changer la couleur en fonction du pourcentage
        if (percentage < 30) {
            categories[cat].meter.style.backgroundColor = "#ff6b6b"; // Rouge
        } else if (percentage < 70) {
            categories[cat].meter.style.backgroundColor = "#ffc145"; // Orange
        } else {
            categories[cat].meter.style.backgroundColor = "#66bb6a"; // Vert
        }
    }
    
    // Mise à jour des recommandations
    updateMissingItems(totals);
}

function updateMissingItems(totals) {
    const missingSpan = document.getElementById("missingItems");
    const missing = [];
    
    if (totals.sale < CONFIG.TARGET_PER_CATEGORY) missing.push("plats salés");
    if (totals.sucre < CONFIG.TARGET_PER_CATEGORY) missing.push("desserts");
    if (totals.soft < CONFIG.TARGET_PER_CATEGORY) missing.push("boissons non alcoolisées");
    if (totals.alco < CONFIG.TARGET_PER_CATEGORY) missing.push("boissons alcoolisées");
    
    if (missing.length === 0) {
        missingSpan.textContent = "Nous avons un bon équilibre! Merci à tous!";
        missingSpan.style.color = "green";
    } else {
        missingSpan.textContent = missing.join(", ");
        missingSpan.style.color = "#e07c0a";
    }
}

function showFormError(message) {
    const errorDiv = document.getElementById("formError");
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
    
    // Scroller vers le message d'erreur
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showFormSuccess() {
    const successDiv = document.getElementById("formSuccess");
    successDiv.style.display = "block";
    
    // Scroller vers le message de succès
    successDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    setTimeout(() => {
        document.getElementById("inscriptionModal").style.display = "none";
        successDiv.style.display = "none";
    }, 2000);
}

function resetForm() {
    document.getElementById("inscriptionForm").reset();
    document.getElementById("detailsContainer").style.display = "none";
    document.getElementById("formError").style.display = "none";
    document.getElementById("formSuccess").style.display = "none";
    
    // Réinitialiser les classes de validation
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.classList.remove('valid');
    });
    
    // Générer un nouveau jeton CSRF
    csrfToken = generateCSRFToken();
    document.getElementById('csrfToken').value = csrfToken;
}
