
// ============================================
// mobile.js - Gestion mobile
// ============================================

const mobile = {
    openSearchModal() {
        dom.mobileSearchModal.classList.remove('hidden');
    },

    closeSearchModal() {
        dom.mobileSearchModal.classList.add('hidden');
    }
};