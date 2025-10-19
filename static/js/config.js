// ============================================
// config.js - Configuration et constantes
// ============================================

const API_BASE = '/api';
const ROOT_PATH = '/';

// État global de l'application
const state = {
    currentPath: ROOT_PATH,
    selectedFile: null,
    isModalOpen: false,
    sortColumn: 'name',
    sortDirection: 'asc',
    isSearchMode: false,
    lastSearchQuery: '',
    navigationHistory: [ROOT_PATH],
    historyIndex: 0
};

// Références DOM
const dom = {
    fileListBody: null,
    pathDisplay: null,
    modalOverlay: null,
    modalTitle: null,
    modalContent: null,
    contextMenu: null,
    mobileSearchModal: null,
    notificationContainer: null
};