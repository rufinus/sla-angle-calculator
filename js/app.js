/**
 * SLA Angle Calculator - Alpine.js Component
 * Calculates optimal tilt angles for resin 3D printing based on printer specs
 */

document.addEventListener('alpine:init', () => {
  Alpine.data('calculator', () => ({
    // ============================================================
    // CONSTANTS
    // ============================================================

    STORAGE_KEY: 'sla-calculator-favorites',
    MAX_FAVORITES: 20,

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
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            // Limit to max favorites
            this.favorites = parsed.slice(0, this.MAX_FAVORITES);
          }
        }
      } catch (error) {
        console.warn('Failed to load favorites:', error);
        this.favorites = [];
      }
    },

    saveFavorites() {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.favorites));
      } catch (error) {
        console.warn('Failed to save favorites:', error);
      }
    },

    toggleFavorite(printerId) {
      const index = this.favorites.indexOf(printerId);
      if (index === -1) {
        // Add to favorites (respect max limit)
        if (this.favorites.length < this.MAX_FAVORITES) {
          this.favorites.push(printerId);
        }
      } else {
        // Remove from favorites
        this.favorites.splice(index, 1);
      }
      this.saveFavorites();
    },

    isFavorite(printerId) {
      return this.favorites.includes(printerId);
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
    // VALIDATION
    // ============================================================

    validateInput(value, min = 1, max = 10000) {
      if (value === null || value === '') return null;

      const num = parseFloat(value);
      if (isNaN(num)) return 'Please enter a valid number';
      if (num < min) return `Value must be at least ${min}μm`;
      if (num > max) return `Value must not exceed ${max}μm`;

      return null;
    },

    // ============================================================
    // COMPUTED PROPERTIES
    // ============================================================

    get validationErrors() {
      return {
        manualPixelX: this.validateInput(this.manualPixelX),
        manualPixelY: this.validateInput(this.manualPixelY),
        layerHeight: this.validateInput(this.layerHeight, 10, 200)
      };
    },

    get isValid() {
      return !Object.values(this.validationErrors).some(error => error !== null);
    },

    get canShowResults() {
      return this.angleX !== null && this.isValid;
    },

    get hasSquarePixels() {
      const pixelX = this.selectedPrinter?.pixelX ?? this.manualPixelX;
      const pixelY = this.selectedPrinter?.pixelY ?? this.manualPixelY;
      return pixelX === pixelY;
    },

    get currentPixelX() {
      return this.selectedPrinter?.pixelX ?? this.manualPixelX ?? null;
    },

    get currentPixelY() {
      return this.selectedPrinter?.pixelY ?? this.manualPixelY ?? null;
    },

    get filteredPrinters() {
      const query = this.searchQuery.toLowerCase().trim();
      if (!query) {
        return this.printers;
      }
      return this.printers.filter(printer => {
        const name = `${printer.manufacturer} ${printer.model}`.toLowerCase();
        return name.includes(query);
      });
    },

    get filteredFavorites() {
      return this.filteredPrinters.filter(p => this.favorites.includes(p.id));
    },

    get filteredNonFavorites() {
      return this.filteredPrinters.filter(p => !this.favorites.includes(p.id));
    },

    get allDropdownItems() {
      // Combined list for keyboard navigation: favorites first, then non-favorites
      return [...this.filteredFavorites, ...this.filteredNonFavorites];
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
      if (!this.isValid) return null;
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

      const items = this.allDropdownItems;

      switch (event.key) {
        case 'ArrowDown':
          this.highlightedIndex = Math.min(
            this.highlightedIndex + 1,
            items.length - 1
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
          if (items[this.highlightedIndex]) {
            this.selectPrinter(items[this.highlightedIndex]);
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
