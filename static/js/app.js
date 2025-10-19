
// ============================================
// app.js - Initialisation de l'application
// ============================================

const app = {
    init() {
        // Initialisation des références DOM
        dom.fileListBody = document.getElementById('file-list-body');
        dom.pathDisplay = document.getElementById('path-display');
        dom.modalOverlay = document.getElementById('modal-overlay');
        dom.modalTitle = document.getElementById('modal-title');
        dom.modalContent = document.getElementById('modal-content');
        dom.contextMenu = document.getElementById('context-menu');
        dom.mobileSearchModal = document.getElementById('mobile-search-modal');
        dom.notificationContainer = document.getElementById('notification-container');

        // Événements de tri
        document.querySelectorAll('.sortable-header').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-column');
                sorting.handleSort(column);
            });
        });

        // Formulaires de recherche
        document.getElementById('search-form-desktop').addEventListener('submit', search.handleSubmit);
        document.getElementById('search-form-mobile').addEventListener('submit', search.handleSubmit);

        // Boutons d'action
        document.getElementById('desktop-create-folder-btn').addEventListener('click', folderActions.openCreateModal);
        document.getElementById('mobile-create-folder-btn').addEventListener('click', folderActions.openCreateModal);
        document.getElementById('desktop-upload-btn').addEventListener('click', upload.openModal);
        document.getElementById('mobile-upload-btn').addEventListener('click', upload.openModal);
        document.getElementById('mobile-search-btn').addEventListener('click', mobile.openSearchModal);
        document.getElementById('mobile-close-search-btn').addEventListener('click', mobile.closeSearchModal);

        // Fermeture du menu contextuel au clic
        document.addEventListener('click', (event) => {
            if (dom.contextMenu && !dom.contextMenu.contains(event.target)) {
                contextMenu.hide();
            }
        });

        // Navigation initiale
        const params = new URLSearchParams(window.location.search);
        const initialPath = params.get('path') || ROOT_PATH;
        navigation.navigateToFolder(initialPath);
        
        // Gestion du bouton retour Android
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', function(event) {
            window.history.pushState(null, '', window.location.href);
            
            if (state.isSearchMode) {
                search.exitSearchMode();
            } else if (state.currentPath !== ROOT_PATH) {
                navigation.navigateUp();
            } else {
                notifications.show('Vous êtes déjà à la racine', 'info');
            }
        });
        
        // Gestion des touches clavier
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isModalOpen) {
                modal.close();
            }
            if (e.key === 'Escape' && !dom.mobileSearchModal.classList.contains('hidden')) {
                mobile.closeSearchModal();
            }
            if (e.key === 'Escape' && state.isSearchMode) {
                search.exitSearchMode();
            }
        });
    }
};

// Lancement de l'application au chargement de la page
window.addEventListener('DOMContentLoaded', app.init);