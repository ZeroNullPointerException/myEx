// ============================================
// floatingViewer.js - Fichier principal
// ============================================

import { windowCreators } from './windowCreators.js';
import { windowManagement } from './windowManagement.js';
import { tilingSystem } from './tilingSystem.js';
import { dragDropSystem } from './dragDropSystem.js';
import { editorSystem } from './editorSystem.js';

const floatingViewer = {
    activeWindows: [],
    nextZIndex: 1000,
    isMobile: window.innerWidth <= 768,
    linkedResizePair: null,
    
    // Importer les méthodes des modules
    ...windowCreators,
    ...windowManagement,
    ...tilingSystem,
    ...dragDropSystem,
    ...editorSystem,
    
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

// Export par défaut pour l'import ES6
export default floatingViewer;