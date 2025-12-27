/**
 * SLA Angle Calculator - Alpine.js Component
 * Calculates optimal tilt angles for resin 3D printing based on printer specs
 */

document.addEventListener('alpine:init', () => {
  Alpine.data('calculator', () => ({
    // ============================================================
    // STATE
    // ============================================================

    printers: [],
    selectedPrinter: null,
    layerHeight: 50,
    manualPixelX: null,
    manualPixelY: null,
    favorites: [],
    searchQuery: '',
    dropdownOpen: false,
    loading: false,
    jsonError: null,

    // ============================================================
    // LIFECYCLE
    // ============================================================

    init() {
      this.loadFavorites();
      this.loadPrinters();
    },

    // ============================================================
    // DATA LOADING
    // ============================================================

    loadFavorites() {
      // TODO: Load favorites from localStorage
    },

    async loadPrinters() {
      this.loading = true;
      this.jsonError = null;

      try {
        const response = await fetch('data/printers.json');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        this.printers = await response.json();
      } catch (error) {
        this.jsonError = 'Failed to load printer database';
        console.error('Printer load error:', error);
      } finally {
        this.loading = false;
      }
    },

    // ============================================================
    // COMPUTED PROPERTIES
    // ============================================================

    get filteredPrinters() {
      // TODO: Filter printers by searchQuery and sort with favorites first
      return this.printers;
    },

    get isManualMode() {
      return this.selectedPrinter === null && (this.manualPixelX !== null || this.manualPixelY !== null);
    },

    get angleX() {
      // TODO: Calculate angle for X axis
      return null;
    },

    get angleY() {
      // TODO: Calculate angle for Y axis
      return null;
    },

    // ============================================================
    // ACTIONS
    // ============================================================

    // Placeholder methods for favorites and selection actions
    // TODO: Implement favorite toggling
    // TODO: Implement printer selection
    // TODO: Implement manual mode switching
  }));
});
