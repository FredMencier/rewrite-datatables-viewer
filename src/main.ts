import { App } from './App';
import './styles.css';

/**
 * Point d'entrée principal de l'application OpenRewrite Data Visualizer
 */

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 Initialisation de OpenRewrite Data Visualizer');
    
    // Créer et initialiser l'application
    const app = new App();
    await app.initialize();
    
    console.log('✅ Application initialisée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de l\'application:', error);
    
    // Afficher un message d'erreur à l'utilisateur
    showErrorMessage(error as Error);
  }
});

/**
 * Affiche un message d'erreur global à l'utilisateur
 */
function showErrorMessage(error: Error): void {
  const errorContainer = document.createElement('div');
  errorContainer.className = 'error-overlay';
  errorContainer.innerHTML = `
    <div class="error-content">
      <h2>❌ Erreur de chargement</h2>
      <p>Une erreur s'est produite lors du chargement de l'application :</p>
      <pre>${error.message}</pre>
      <button onclick="location.reload()" class="btn btn-primary">
        🔄 Recharger la page
      </button>
    </div>
  `;
  
  document.body.appendChild(errorContainer);
}

// Gestion globale des erreurs non capturées
window.addEventListener('error', (event) => {
  console.error('Erreur globale non capturée:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rejetée non gérée:', event.reason);
  event.preventDefault();
});

// Affichage des informations de debug
console.log('🔧 OpenRewrite Data Visualizer initialisé');

// Ajouter des informations utiles dans la console
console.log('📊 OpenRewrite Data Visualizer');
console.log('🔗 Données attendues:', [
  'data/org.openrewrite.table.RecipeRunStats.csv',
  'data/org.openrewrite.table.SourcesFileResults.csv'
]);