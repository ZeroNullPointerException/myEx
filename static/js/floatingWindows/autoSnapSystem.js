// ============================================
// modules/autoSnapSystem.js - Snap automatique intelligent
// ============================================

export const autoSnapSystem = {
    // ============================================
    // DÉTECTION DE FICHIERS LIÉS
    // ============================================
    
    recentlyOpenedFiles: [], // Historique des fichiers ouverts
    maxHistoryTime: 10000, // CORRECTION : 10 secondes pour considérer des fichiers comme liés (en ms)
    
    // NOUVEAU : Fonction utilitaire sécurisée pour extraire le répertoire
    getDirectory(path) {
        const lastSlash = path.lastIndexOf('/');
        // Renvoie une chaîne vide si le fichier est à la racine, sinon le chemin
        return lastSlash === -1 ? '' : path.substring(0, lastSlash);
    },

    detectRelatedFiles(filename, filepath) {
        console.log(`%c[AutoSnap] Détection lancée pour : ${filename}`, 'color: #3b82f6; font-weight: bold;');
        
        const patterns = [
            // Images d'une même série
            /(.+?)[-_\s](\d+)\.(jpg|jpeg|png|gif|webp)$/i,
            // Fichiers avec suffixes
            /(.+?)[-_](front|back|left|right|top|bottom)\.(jpg|jpeg|png|gif|webp)$/i,
            // Documents par chapitre
            /(.+?)[-_]chapter[-_](\d+)\.(pdf|doc|docx)$/i,
            // Code source
            /(.+?)\.(js|css|html|json)$/i,
        ];
        
        const now = Date.now();
        
        // Nettoyer l'historique
        this.recentlyOpenedFiles = this.recentlyOpenedFiles.filter(
            file => now - file.timestamp < this.maxHistoryTime
        );

        console.log(`[AutoSnap] Historique après nettoyage (${this.recentlyOpenedFiles.length} fichiers) :`, this.recentlyOpenedFiles.map(f => f.filename));
        
        // Ajouter le fichier actuel à l'historique
        this.recentlyOpenedFiles.push({
            filename,
            filepath,
            timestamp: now
        });
        
        // Vérifier s'il y a des fichiers liés récemment ouverts
        const related = this.recentlyOpenedFiles.filter(file => {
            if (file.filename === filename) return false;
            
            console.log(`%c[AutoSnap] --> Comparaison avec fichier historique : ${file.filename}`, 'color: #60a5fa;');

            // 1. Vérifier si les fichiers partagent le même préfixe (Patterns)
            let isPatternMatch = false;
            for (const pattern of patterns) {
                const match1 = filename.match(pattern);
                const match2 = file.filename.match(pattern);
                
                if (match1 && match2 && match1[1] === match2[1]) {
                    isPatternMatch = true;
                    console.log(`%c[AutoSnap] ----> Résultat Pattern : Match trouvé (${match1[1]})`, 'color: #10b981;');
                    return true;
                }
            }
            if (!isPatternMatch) {
                console.log(`[AutoSnap] ----> Résultat Pattern : Pas de match.`);
            }
            
            // 2. Vérifier si les fichiers sont dans le même dossier et similaires
            const dir1 = this.getDirectory(filepath);
            const dir2 = this.getDirectory(file.filepath);
            
            console.log(`[AutoSnap] ----> Comparaison Répertoires : '${dir1}' vs '${dir2}'`);

            if (dir1 === dir2) {
                const similarity = this.calculateSimilarity(filename, file.filename);
                console.log(`[AutoSnap] ----> Similitude de nom (Levenshtein) : ${similarity.toFixed(3)} (Seuil > 0.6)`);
                
                if (similarity > 0.6) return true;
            }
            
            return false;
        });
        
        const result = related.length > 0 ? related[related.length - 1] : null;
        if (result) {
             console.log(`%c[AutoSnap] Résultat final de la détection : LIÉ`, 'color: #10b981; font-weight: bold;');
        } else {
             console.log(`%c[AutoSnap] Résultat final de la détection : NON LIÉ`, 'color: #f87171;');
        }
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
        // Attendre que la fenêtre soit complètement créée
        setTimeout(() => {
            const newWindow = this.activeWindows.find(w => w.id === newWindowId);
            if (!newWindow) return;
            
            // Trouver la fenêtre du fichier lié
            const relatedWindow = this.activeWindows.find(w => 
                w.filename === relatedFile.filename
            );
            
            if (!relatedWindow) return;
            
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
                    <div style="font-weight: 600; margin-bottom: 5px;">Fichiers liés détectés</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7);">
                        "${relatedFile.filename}" ouvert récemment
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
        
        // Hover effects
        const applyBtn = suggestion.querySelector('#autosnap-apply');
        const dismissBtn = suggestion.querySelector('#autosnap-dismiss');
        
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
            this.applyAutoSnap(newWindowId, relatedFile);
            suggestion.remove();
        });
        
        dismissBtn.addEventListener('click', () => {
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