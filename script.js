/**
 * Script principal pour l'interface "La Fête des Voisins"
 * Ce script gère l'interface utilisateur et les interactions avec l'API
 */

// Configuration
const CONFIG = {
  // Textes pour l'interface
  TEXTS: {
    LOADING: 'Chargement en cours...',
    SUCCESS: 'Votre contribution a été enregistrée avec succès!',
    ERROR: 'Une erreur est survenue: ',
    API_LOADING: 'Connexion à l\'API en cours...',
    API_ERROR: 'Impossible de se connecter à l\'API. Veuillez réessayer plus tard.',
    FORM_ERROR: 'Veuillez corriger les erreurs dans le formulaire.',
    SENDING: 'Envoi en cours...'
  },
  
  // Classes CSS
  CSS: {
    SUCCESS: 'success',
    ERROR: 'error',
    LOADING: 'loading',
    HIDDEN: 'hidden',
    INVALID: 'invalid'
  }
};

/**
 * Gestionnaire de l'interface utilisateur
 */
class UIManager {
  constructor() {
    // Référence aux éléments du DOM
    this.form = document.getElementById('contribution-form');
    this.resultDiv = document.getElementById('form-result');
    this.apiStatusDiv = document.getElementById('api-status');
    this.loadingIndicator = document.getElementById('loading-indicator');
    
    // Initialiser l'interface
    this.init();
  }
  
  /**
   * Initialise l'interface
   */
  init() {
    // Vérifier que les éléments nécessaires sont présents
    if (!this.form) {
      console.error('Le formulaire n\'a pas été trouvé dans le DOM');
      return;
    }
    
    // Créer le div de résultat s'il n'existe pas
    if (!this.resultDiv) {
      this.resultDiv = document.createElement('div');
      this.resultDiv.id = 'form-result';
      this.form.after(this.resultDiv);
    }
    
    // Créer l'indicateur de chargement s'il n'existe pas
    if (!this.loadingIndicator) {
      this.loadingIndicator = document.createElement('div');
      this.loadingIndicator.id = 'loading-indicator';
      this.loadingIndicator.className = CONFIG.CSS.LOADING + ' ' + CONFIG.CSS.HIDDEN;
      this.loadingIndicator.textContent = CONFIG.TEXTS.LOADING;
      this.form.after(this.loadingIndicator);
    }
    
    // Créer le div de statut API s'il n'existe pas
    if (!this.apiStatusDiv) {
      this.apiStatusDiv = document.createElement('div');
      this.apiStatusDiv.id = 'api-status';
      this.apiStatusDiv.className = CONFIG.CSS.LOADING;
      this.apiStatusDiv.textContent = CONFIG.TEXTS.API_LOADING;
      document.body.prepend(this.apiStatusDiv);
    }
    
    // Ajouter les gestionnaires d'événements
    this.setupEventListeners();
    
    // Mettre en place la validation du formulaire
    this.setupFormValidation();
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Écouteur pour la soumission du formulaire
    this.form.addEventListener('submit', this.handleFormSubmit.bind(this));
    
    // Écouteurs pour les événements de l'API
    document.addEventListener('fete-voisins-api-ready', this.handleApiReady.bind(this));
    document.addEventListener('fete-voisins-api-error', this.handleApiError.bind(this));
  }
  
  /**
   * Configure la validation du formulaire
   */
  setupFormValidation() {
    // Ajouter des écouteurs pour la validation en temps réel
    const inputs = this.form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateInput(input));
      input.addEventListener('input', () => {
        if (input.classList.contains(CONFIG.CSS.INVALID)) {
          this.validateInput(input);
        }
      });
    });
  }
  
  /**
   * Valide un champ du formulaire
   * @param {HTMLElement} input - Élément à valider
   * @returns {boolean} - true si le champ est valide
   */
  validateInput(input) {
    // Récupérer le message d'erreur associé
    let errorMessageElement = input.nextElementSibling;
    if (!errorMessageElement || !errorMessageElement.classList.contains('error-message')) {
      errorMessageElement = document.createElement('span');
      errorMessageElement.className = 'error-message ' + CONFIG.CSS.HIDDEN;
      input.after(errorMessageElement);
    }
    
    // Réinitialiser l'état
    input.classList.remove(CONFIG.CSS.INVALID);
    errorMessageElement.classList.add(CONFIG.CSS.HIDDEN);
    errorMessageElement.textContent = '';
    
    // Valider selon le type de champ
    let isValid = true;
    let errorMessage = '';
    
    if (input.hasAttribute('required') && input.value.trim() === '') {
      isValid = false;
      errorMessage = 'Ce champ est obligatoire';
    } else if (input.type === 'email' && input.value.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.value)) {
        isValid = false;
        errorMessage = 'Email invalide';
      }
    } else if (input.id === 'telephone' && input.value.trim() !== '') {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(input.value)) {
        isValid = false;
        errorMessage = 'Le téléphone doit contenir 10 chiffres';
      }
    } else if (input.type === 'number') {
      const value = parseInt(input.value);
      const min = parseInt(input.getAttribute('min') || '-Infinity');
      const max = parseInt(input.getAttribute('max') || 'Infinity');
      
      if (isNaN(value) || value < min || value > max) {
        isValid = false;
        errorMessage = `Valeur entre ${min} et ${max} attendue`;
      }
    }
    
    // Afficher l'erreur si nécessaire
    if (!isValid) {
      input.classList.add(CONFIG.CSS.INVALID);
      errorMessageElement.textContent = errorMessage;
      errorMessageElement.classList.remove(CONFIG.CSS.HIDDEN);
    }
    
    return isValid;
  }
  
  /**
   * Valide le formulaire complet
   * @returns {boolean} - true si le formulaire est valide
   */
  validateForm() {
    const inputs = this.form.querySelectorAll('input, select, textarea');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!this.validateInput(input)) {
        isValid = false;
      }
    });
    
    return isValid;
  }
  
  /**
   * Gère la soumission du formulaire
   * @param {Event} event - Événement de soumission
   */
  async handleFormSubmit(event) {
    // Empêcher la soumission normale du formulaire
    event.preventDefault();
    
    // Vérifier que l'API est disponible
    if (!window.FeteVoisinsApi || !window.FeteVoisinsApi.isInitialized) {
      this.showResult(CONFIG.TEXTS.API_ERROR, true);
      return;
    }
    
    // Valider le formulaire
    if (!this.validateForm()) {
      this.showResult(CONFIG.TEXTS.FORM_ERROR, true);
      return;
    }
    
    // Afficher l'indicateur de chargement
    this.showLoading(true);
    
    try {
      // Récupérer les données du formulaire
      const formData = {
        nom: this.form.elements.nom.value,
        email: this.form.elements.email.value,
        telephone: this.form.elements.telephone ? this.form.elements.telephone.value : '',
        nbPersonnes: parseInt(this.form.elements.nbPersonnes.value) || 1,
        categorie: this.form.elements.categorie.value,
        detail: this.form.elements.detail.value,
        portions: parseInt(this.form.elements.portions.value) || 1,
        commentaire: this.form.elements.commentaire ? this.form.elements.commentaire.value : ''
      };
      
      // Soumettre le formulaire
      const response = await window.FeteVoisinsApi.submitContribution(formData);
      
      // Traiter la réponse
      if (response.result === 'success') {
        // Réinitialiser le formulaire
        this.form.reset();
        
        // Afficher le message de succès
        this.showResult(CONFIG.TEXTS.SUCCESS);
      } else {
        // Afficher l'erreur
        this.showResult(CONFIG.TEXTS.ERROR + (response.error || 'Erreur inconnue'), true);
      }
    } catch (error) {
      // Afficher l'erreur
      this.showResult(CONFIG.TEXTS.ERROR + (error.message || 'Erreur inconnue'), true);
    } finally {
      // Cacher l'indicateur de chargement
      this.showLoading(false);
    }
  }
  
  /**
   * Gère l'événement lorsque l'API est prête
   */
  handleApiReady() {
    if (this.apiStatusDiv) {
      this.apiStatusDiv.textContent = 'API connectée';
      this.apiStatusDiv.className = CONFIG.CSS.SUCCESS;
      
      // Cacher le message après 3 secondes
      setTimeout(() => {
        this.apiStatusDiv.classList.add(CONFIG.CSS.HIDDEN);
      }, 3000);
    }
  }
  
  /**
   * Gère l'événement d'erreur de l'API
   * @param {CustomEvent} event - Événement contenant les détails de l'erreur
   */
  handleApiError(event) {
    if (this.apiStatusDiv) {
      this.apiStatusDiv.textContent = 'Erreur API: ' + (event.detail?.error || 'Erreur inconnue');
      this.apiStatusDiv.className = CONFIG.CSS.ERROR;
    }
  }
  
  /**
   * Affiche un message de résultat
   * @param {string} message - Message à afficher
   * @param {boolean} isError - true si c'est une erreur
   */
  showResult(message, isError = false) {
    if (!this.resultDiv) return;
    
    this.resultDiv.textContent = message;
    this.resultDiv.className = isError ? CONFIG.CSS.ERROR : CONFIG.CSS.SUCCESS;
    this.resultDiv.classList.remove(CONFIG.CSS.HIDDEN);
    
    // Faire défiler jusqu'au message
    this.resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  /**
   * Affiche ou cache l'indicateur de chargement
   * @param {boolean} show - true pour afficher, false pour cacher
   */
  showLoading(show) {
    if (!this.loadingIndicator) return;
    
    if (show) {
      this.loadingIndicator.classList.remove(CONFIG.CSS.HIDDEN);
      this.form.classList.add(CONFIG.CSS.LOADING);
    } else {
      this.loadingIndicator.classList.add(CONFIG.CSS.HIDDEN);
      this.form.classList.remove(CONFIG.CSS.LOADING);
    }
  }
}

// Initialiser l'interface au chargement du document
document.addEventListener('DOMContentLoaded', () => {
  const ui = new UIManager();
});
