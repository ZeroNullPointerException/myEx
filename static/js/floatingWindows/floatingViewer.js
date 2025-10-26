import { windowCreators } from './windowCreators.js';  
import { windowManagement } from './windowManagement.js';  
import { tilingSystem } from './tilingSystem.js'; 
import { editorSystem } from './editorSystem.js'; 
import { dragDropSystem } from './dragDropSystem.js'; 
import { autoSnapSystem } from './autoSnapSystem.js';
import { layoutSystem } from './layoutSystem.js';

const floatingViewer = {
    // Les ...spread operators ajoutent toutes les méthodes des modules
    ...windowCreators,
    ...windowManagement,
    ...tilingSystem,
    ...dragDropSystem,
    ...editorSystem,
    ...autoSnapSystem, 
    ...layoutSystem, 

    activeWindows: [],
    nextZIndex: 1000,
    isMobile: window.innerWidth <= 768,
    linkedResizePair: null,
    
    // CORRECTION: Fonction centralisée pour vérifier et suggérer l'auto-snap
    _checkAndSuggestAutoSnap(newWindowId, filename, filepath, reason = 'open') {
        if (!filename || !filepath) {
            console.error("%c[AutoSnap] ERREUR DE DONNÉES: filename ou filepath manquant. Détection ignorée.", 'color: #dc2626; font-weight: bold;');
            return;
        }

        // CORRECTION: detectRelatedFiles retourne maintenant toujours un array
        const relatedFiles = this.detectRelatedFiles(filename, filepath);
        
        console.log('[AutoSnap] Fichiers liés détectés:', relatedFiles);
        
        // Vérifier qu'il y a des fichiers liés ET au moins 2 fenêtres actives
        if (relatedFiles.length > 0 && this.activeWindows.length > 1) {
            console.log(`%c[AutoSnap] --> ${relatedFiles.length} fichier(s) lié(s) trouvé(s). Suggestion lancée.`, 'color: #16a34a;');
            
            // CORRECTION: Passer 'this' comme windowManager et relatedFiles comme array
            setTimeout(() => {
                this.showAutoSnapSuggestion(this, newWindowId, relatedFiles, reason);
            }, 500);
        } else {
            console.log("[AutoSnap] --> Pas de suggestion (fichiers liés:", relatedFiles.length, "/ fenêtres actives:", this.activeWindows.length, ")");
        }
    },

    init() {
        // 1. Initialisation des raccourcis clavier (via tilingSystem)
        if (tilingSystem.setupKeyboardShortcuts) {
            tilingSystem.setupKeyboardShortcuts.call(this);
        } else {
            console.error("tilingSystem.setupKeyboardShortcuts n'est pas disponible pour l'initialisation.");
        }
        
        // 2. Initialisation de la détection Auto-Snap (ouverture)
        if (typeof this.setupAutoSnapDetection === 'function') {
            setTimeout(() => {
                this.setupAutoSnapDetection();
            }, 0); 
        } else {
            console.error("ERREUR CRITIQUE: setupAutoSnapDetection n'est pas une fonction dans floatingViewer. Le système d'Auto-Snap est désactivé.");
        }
        
        // 3. Initialisation de la détection Auto-Snap (fermeture)
        if (typeof this.setupAutoSnapOnClose === 'function') {
            setTimeout(() => {
                this.setupAutoSnapOnClose();
            }, 0);
        } else {
            console.error("ERREUR: setupAutoSnapOnClose n'est pas disponible.");
        }
        
        // Afficher un message d'aide au premier lancement
        if (typeof notifications !== 'undefined') {
            setTimeout(() => {
                notifications.show('💡 Raccourcis : Ctrl+L (Layouts) | Ctrl+Flèches (Snap)', 'info');
            }, 2000);
        }
    },
    
    setupAutoSnapDetection() {
        // === Sauvegarde des fonctions originales ===
        const originalCreateImageViewer = this.createImageViewer;
        const originalCreateAudioPlayer = this.createAudioPlayer;
        const originalCreateFolderViewer = this.createFolderViewer;

        console.log("%c[AutoSnap] Initialisation réussie. Interception de 'windowCreators'.", 'color: #22c55e; font-weight: bold;');

        // --- 1. Interception de createImageViewer ---
        this.createImageViewer = (filename, imageUrl, asPopup = false) => {
            console.log("%c[AutoSnap] ===> Intercepted createImageViewer CALL détecté. Analyse Auto-Snap lancée.", 'color: #eab308; font-weight: bold;'); 
            
            // Appeler la fonction originale
            const newWindowId = originalCreateImageViewer.call(this, filename, imageUrl, asPopup);

            if (newWindowId) {
                // Logique Auto-Snap centralisée: utilise imageUrl comme filepath
                this._checkAndSuggestAutoSnap(newWindowId, filename, imageUrl, 'open');
            }
            return newWindowId;
        };

        // --- 2. Interception de createAudioPlayer ---
        this.createAudioPlayer = (filename, audioUrl, asPopup = false) => {
            console.log("%c[AutoSnap] ===> Intercepted createAudioPlayer CALL détecté. Analyse Auto-Snap lancée.", 'color: #eab308; font-weight: bold;'); 
            
            const newWindowId = originalCreateAudioPlayer.call(this, filename, audioUrl, asPopup);

            if (newWindowId) {
                // Logique Auto-Snap centralisée: utilise audioUrl comme filepath
                this._checkAndSuggestAutoSnap(newWindowId, filename, audioUrl, 'open');
            }
            return newWindowId;
        };
        
        // --- 3. Interception de createFolderViewer ---
        this.createFolderViewer = (folderName, folderPath) => {
            console.log("%c[AutoSnap] ===> Intercepted createFolderViewer CALL détecté. Analyse Auto-Snap lancée.", 'color: #eab308; font-weight: bold;'); 
            
            const newWindowId = originalCreateFolderViewer.call(this, folderName, folderPath);

            if (newWindowId) {
                // Logique Auto-Snap centralisée: utilise folderPath comme filepath
                this._checkAndSuggestAutoSnap(newWindowId, folderName, folderPath, 'open');
            }
            return newWindowId;
        };
    },
    
    setupAutoSnapOnClose() {
        // === Sauvegarde de la fonction originale closeWindow ===
        const originalCloseWindow = this.closeWindow;
        
        console.log("%c[AutoSnap] Initialisation de la détection de fermeture.", 'color: #22c55e; font-weight: bold;');
        
        this.closeWindow = (viewerId) => {
            console.log("%c[AutoSnap] ===> Fermeture de fenêtre détectée.", 'color: #f59e0b; font-weight: bold;');
            
            // Appeler la fonction originale
            originalCloseWindow.call(this, viewerId);
            
            // Attendre que la fenêtre soit effectivement supprimée de activeWindows
            setTimeout(() => {
                const remainingWindows = this.activeWindows.length;
                
                console.log(`[AutoSnap] Fenêtres restantes: ${remainingWindows}`);
                
                // Afficher la suggestion si au moins 2 fenêtres restent
                if (remainingWindows >= 2) {
                    console.log('%c[AutoSnap] --> Suggestion de réorganisation lancée', 'color: #16a34a;');
                    this.showAutoSnapSuggestion(this, null, [], 'close');
                } else {
                    console.log('[AutoSnap] --> Pas assez de fenêtres pour suggérer une réorganisation.');
                }
            }, 300); // Attendre la fin de l'animation de fermeture
        };
    },
    
    handleScreenResize() {
        this.isMobile = window.innerWidth <= 768;
        
        this.activeWindows.forEach(win => {
            const element = win.element;
            
            if (this.linkedResizePair) {
                const viewerA = document.getElementById(this.linkedResizePair.idA);
                const viewerB = document.getElementById(this.linkedResizePair.idB);
                
                if (viewerA && viewerB) {
                    const totalWidth = window.innerWidth;
                    const currentWidthA = parseFloat(viewerA.style.width);
                    const ratio = currentWidthA / (window.innerWidth / 100) / 100;
                    
                    let newWidthA = totalWidth / 2;
                    
                    if (!isNaN(currentWidthA) && currentWidthA > 100 && currentWidthA < totalWidth - 100) {
                        newWidthA = totalWidth * ratio;
                    }
                    
                    const newWidthB = totalWidth - newWidthA;

                    viewerA.style.width = newWidthA + 'px';
                    viewerB.style.width = newWidthB + 'px';
                    viewerB.style.left = newWidthA + 'px';
                    viewerA.style.height = '100vh';
                    viewerB.style.height = '100vh';
                    
                    this.updateContentHeight(viewerA);
                    this.updateContentHeight(viewerB);
                }
            } else {
                const rect = element.getBoundingClientRect();

                if (rect.right > window.innerWidth) {
                    element.style.left = Math.max(10, window.innerWidth - rect.width - 10) + 'px';
                }
                if (rect.bottom > window.innerHeight) {
                    element.style.top = Math.max(10, window.innerHeight - rect.height - 10) + 'px';
                }
                
                if (this.isMobile) {
                    element.style.width = (window.innerWidth - 20) + 'px';
                    element.style.left = '10px';
                    element.style.right = '10px';
                }
            }
            this.updateContentHeight(win.element);
        });
    }
};

window.addEventListener('resize', () => floatingViewer.handleScreenResize());
window.addEventListener('orientationchange', () => {
    setTimeout(() => floatingViewer.handleScreenResize(), 100);
});

export default floatingViewer; 

// Utiliser une fonction anonyme pour s'assurer que 'floatingViewer' est bien défini
// avant d'appeler la méthode 'init'.
window.addEventListener('DOMContentLoaded', () => {
    // On vérifie une dernière fois pour être certain que l'objet existe.
    if (floatingViewer && typeof floatingViewer.init === 'function') {
        floatingViewer.init(); 
    } else {
        console.error("Impossible de trouver la méthode floatingViewer.init.");
    }
});