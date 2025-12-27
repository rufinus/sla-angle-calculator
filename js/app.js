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
      if (!this.searchQuery.trim()) {
        return this.sortWithFavorites(this.printers);
      }

      const query = this.searchQuery.toLowerCase().trim();
      const filtered = this.printers.filter(printer => {
        const name = `${printer.manufacturer} ${printer.model}`.toLowerCase();
        return name.includes(query);
      });

      return this.sortWithFavorites(filtered);
    },

    sortWithFavorites(printers) {
      const favoriteIds = new Set(this.favorites);
      return [...printers].sort((a, b) => {
        const aFav = favoriteIds.has(a.id);
        const bFav = favoriteIds.has(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return 0;
      });
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

    openDropdown() {
      this.dropdownOpen = true;
      this.searchQuery = '';
    },

    closeDropdown() {
      this.dropdownOpen = false;
    },

    selectPrinter(printer) {
      this.selectedPrinter = printer;
      this.dropdownOpen = false;
      this.searchQuery = '';
      this.manualPixelX = null;
      this.manualPixelY = null;
    },

    clearSelection() {
      this.selectedPrinter = null;
    },
  }));
});
