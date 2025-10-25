// ============================================
// modules/autoSnapSystem.js - Snap automatique intelligent
// ============================================

export const autoSnapSystem = {
    
    // ============================================
    // DÉTECTION DE FICHIERS LIÉS
    // ============================================
    
    recentlyOpenedFiles: [], 
    maxHistoryTime: 10000, 
    
    getDirectory(path) {
        const lastSlash = path.lastIndexOf('/');
        return lastSlash === -1 ? '' : path.substring(0, lastSlash);
    },

    detectRelatedFiles(filename, filepath) {
        console.log(`%c[AutoSnap] Détection lancée pour : ${filename}`, 'color: #3b82f6; font-weight: bold;');
        
        const now = Date.now();
        
        // Nettoyer l'historique
        this.recentlyOpenedFiles = this.recentlyOpenedFiles.filter(
            file => now - file.timestamp < this.maxHistoryTime
        );

        console.log(`[AutoSnap] Historique après nettoyage (${this.recentlyOpenedFiles.length} fichiers) :`, this.recentlyOpenedFiles.map(f => f.filename));
        
        let result = null;
        if (this.recentlyOpenedFiles.length > 0) {
            // LOGIQUE FORCÉE : Retourne toujours le fichier le plus récent si l'historique n'est pas vide
            result = this.recentlyOpenedFiles[this.recentlyOpenedFiles.length - 1];
            
            console.log(`%c[AutoSnap] FORCÉ : Détection Auto-Snap affichée. Fichier lié sélectionné: ${result.filename}`, 'color: #10b981; font-weight: bold;');
        } else {
            console.log(`%c[AutoSnap] NON FORCÉ : Historique vide. Pas de fichier lié.`, 'color: #f87171;');
        }
        
        // Ajouter le fichier actuel à l'historique
        this.recentlyOpenedFiles.push({
            filename,
            filepath,
            timestamp: now
        });
        
        return result; 
    },
    
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    },
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    },
    
    // ============================================
    // AUTO-SNAP INTELLIGENT
    // ============================================
    
    applyAutoSnap(newWindowId, relatedFile) {
        console.log(`%c[AutoSnap] Application du Snap déclenchée : ID ${newWindowId} avec ${relatedFile.filename}`, 'color: #c084fc; font-weight: bold;');
        
        // Fermeture de la notification
        const suggestion = document.getElementById('autosnap-suggestion');
        if (suggestion) suggestion.remove();

        setTimeout(() => {
            const newWindow = this.activeWindows.find(w => w.id === newWindowId);
            const relatedWindow = this.activeWindows.find(w => 
                w.filename === relatedFile.filename
            );
            
            if (!newWindow || !relatedWindow) {
                console.error(`%c[AutoSnap] ERREUR: Fenêtre(s) non trouvée(s). Fenêtre actuelle trouvée: ${!!newWindow}. Fenêtre liée trouvée: ${!!relatedWindow}.`, 'color: #dc2626; font-weight: bold;');
                return; 
            }
            
            console.log(`%c[AutoSnap] Succès: Fenêtres trouvées. Application du layout...`, 'color: #10b981; font-weight: bold;');
            
            const windowCount = this.activeWindows.length;
            
            // Activer le magnétisme pour les deux fenêtres
            newWindow.magnetic = true;
            relatedWindow.magnetic = true;
            
            // Appliquer le layout selon le nombre de fenêtres
            if (windowCount === 2) {
                // Deux fenêtres : split 50/50
                this.snapToPosition(relatedWindow.element, 'half-left');
                setTimeout(() => {
                    this.snapToPosition(newWindow.element, 'half-right');
                }, 100);
                
                if (typeof notifications !== 'undefined') {
                    notifications.show(`🔗 Fichiers liés détectés : "${relatedFile.filename}" et "${newWindow.filename}"`, 'info');
                }
            } else if (windowCount === 3) {
                // Trois fenêtres : layout "1 + 2"
                this.applyLayout('one-plus-two');
                
                if (typeof notifications !== 'undefined') {
                    notifications.show('🔗 Layout automatique appliqué pour 3 fichiers liés', 'info');
                }
            } else if (windowCount >= 4) {
                // Quatre fenêtres ou plus : grille 2x2
                this.applyLayout('quad');
                
                if (typeof notifications !== 'undefined') {
                    notifications.show('🔗 Grille 2×2 appliquée pour fichiers multiples', 'info');
                }
            }
        }, 300);
    },
    
    // ============================================
    // SUGGESTIONS INTELLIGENTES
    // ============================================
    
    showAutoSnapSuggestion(newWindowId, relatedFile) {
        console.log(`%c[AutoSnap] Affichage de la suggestion pour ${newWindowId} et ${relatedFile.filename}`, 'color: #f97316;');

        // Supprimer l'ancienne notification si elle existe
        const existingSuggestion = document.getElementById('autosnap-suggestion');
        if (existingSuggestion) {
             console.log("[AutoSnap] Supprime l'ancienne notification pour afficher la nouvelle.");
             existingSuggestion.remove();
        }

        const suggestion = document.createElement('div');
        suggestion.id = 'autosnap-suggestion';
        suggestion.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: rgba(17, 24, 39, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(59, 130, 246, 0.5);
            border-radius: 12px;
            padding: 15px 20px;
            z-index: 999996;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 350px;
            animation: slideIn 0.3s ease;
        `;
        
        suggestion.innerHTML = `
            <style>
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
            <div style="display: flex; align-items: start; gap: 12px; margin-bottom: 12px;">
                <div style="font-size: 24px;">🔗</div>
                <div>
                    <div style="font-weight: 600; margin-bottom: 5px;">Organiser l'espace de travail</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7);">
                        Fichier(s) récent(s) détecté(s)
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button id="autosnap-apply" style="
                    flex: 1;
                    background: rgba(59, 130, 246, 0.2);
                    border: 1px solid rgba(59, 130, 246, 0.5);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 0.2s;
                ">Organiser</button>
                <button id="autosnap-dismiss" style="
                    flex: 1;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: rgba(255,255,255,0.7);
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                ">Ignorer</button>
            </div>
        `;
        
        document.body.appendChild(suggestion);
        
        // CORRECTION : Définition des variables des boutons après l'ajout de innerHTML
        const applyBtn = suggestion.querySelector('#autosnap-apply');
        const dismissBtn = suggestion.querySelector('#autosnap-dismiss');
        
        // Hover effects
        applyBtn.addEventListener('mouseenter', () => {
            applyBtn.style.background = 'rgba(59, 130, 246, 0.3)';
        });
        applyBtn.addEventListener('mouseleave', () => {
            applyBtn.style.background = 'rgba(59, 130, 246, 0.2)';
        });
        
        dismissBtn.addEventListener('mouseenter', () => {
            dismissBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        dismissBtn.addEventListener('mouseleave', () => {
            dismissBtn.style.background = 'rgba(255, 255, 255, 0.05)';
        });
        
        // Actions
        applyBtn.addEventListener('click', () => {
            // applyAutoSnap s'occupe de la suppression de la notification
            this.applyAutoSnap(newWindowId, relatedFile); 
        });
        
        dismissBtn.addEventListener('click', () => {
            // Fermeture de la notification
            suggestion.style.animation = 'slideIn 0.2s ease reverse';
            setTimeout(() => suggestion.remove(), 200);
        });
        
        // Auto-dismiss après 8 secondes
        setTimeout(() => {
            if (document.getElementById('autosnap-suggestion')) {
                suggestion.style.animation = 'slideIn 0.2s ease reverse';
                setTimeout(() => suggestion.remove(), 200);
            }
        }, 8000);
    }
};