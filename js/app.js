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
    highlightedIndex: 0,
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
      const pixelX = this.selectedPrinter?.pixelX ?? this.manualPixelX;
      return this.calculateAngle(this.layerHeight, pixelX);
    },

    get angleY() {
      const pixelY = this.selectedPrinter?.pixelY ?? this.manualPixelY;
      return this.calculateAngle(this.layerHeight, pixelY);
    },

    calculateAngle(layerHeight, pixelSize) {
      if (!layerHeight || layerHeight <= 0) return null;
      if (!pixelSize || pixelSize <= 0) return null;

      const radians = Math.atan(layerHeight / pixelSize);
      const degrees = radians * (180 / Math.PI);
      return Math.round(degrees * 100) / 100;
    },

    // ============================================================
    // ACTIONS
    // ============================================================

    openDropdown() {
      this.dropdownOpen = true;
      this.searchQuery = '';
      this.highlightedIndex = 0;
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

    handleKeydown(event) {
      if (!this.dropdownOpen) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          this.openDropdown();
          event.preventDefault();
        }
        return;
      }

      const printers = this.filteredPrinters;

      switch (event.key) {
        case 'ArrowDown':
          this.highlightedIndex = Math.min(
            this.highlightedIndex + 1,
            printers.length - 1
          );
          this.scrollHighlightedIntoView();
          event.preventDefault();
          break;
        case 'ArrowUp':
          this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
          this.scrollHighlightedIntoView();
          event.preventDefault();
          break;
        case 'Enter':
          if (printers[this.highlightedIndex]) {
            this.selectPrinter(printers[this.highlightedIndex]);
          }
          event.preventDefault();
          break;
        case 'Escape':
          this.closeDropdown();
          event.preventDefault();
          break;
      }
    },

    scrollHighlightedIntoView() {
      this.$nextTick(() => {
        const list = this.$refs.dropdownList;
        const highlighted = list?.querySelector('.highlighted');
        if (highlighted) {
          highlighted.scrollIntoView({ block: 'nearest' });
        }
      });
    },

    resetHighlightOnSearch() {
      this.highlightedIndex = 0;
    },
  }));
});
