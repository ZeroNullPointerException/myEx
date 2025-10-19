
// ============================================
// modal.js - Gestion des modales
// ============================================

const modal = {
    open(title, content) {
        dom.modalTitle.textContent = title;
        dom.modalContent.innerHTML = content;
        dom.modalOverlay.classList.remove('hidden');
        setTimeout(() => dom.modalOverlay.classList.add('opacity-100'), 10);
        state.isModalOpen = true;
    },

    close() {
        dom.modalOverlay.classList.remove('opacity-100');
        setTimeout(() => {
            dom.modalOverlay.classList.add('hidden');
            dom.modalContent.innerHTML = '';
        }, 300); 
        state.isModalOpen = false;
    }
};
