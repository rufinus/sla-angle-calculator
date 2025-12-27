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
        const response = await fetch('data/printers.json?_=' + Date.now());
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('NOT_FOUND');
          }
          throw new Error('SERVER_ERROR');
        }
        this.printers = await response.json();
      } catch (error) {
        // Determine user-friendly error message
        if (!navigator.onLine) {
          this.jsonError = 'No internet connection';
        } else if (error.message === 'NOT_FOUND') {
          this.jsonError = 'Printer database not found';
        } else if (error.name === 'SyntaxError') {
          this.jsonError = 'Invalid printer data';
        } else {
          this.jsonError = 'Failed to load printers';
        }
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
      // Show results section if we have pixel data (from printer or manual input)
      // Don't hide based on layer height validation - angles will show "--" if invalid
      const hasPixelData = this.selectedPrinter !== null ||
        (this.manualPixelX !== null && this.manualPixelY !== null);
      return hasPixelData;
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

      // Angle from vertical (tilt angle) = atan(pixelSize / layerHeight)
      // This matches RC87 reference: for pixel=20, layer=50 → 21.8°
      const radians = Math.atan(pixelSize / layerHeight);
      const degrees = radians * (180 / Math.PI);
      return Math.round(degrees * 10000) / 10000;
    },

    // ============================================================
    // SVG 2D TILTED RECTANGLE DIAGRAM (matches RC87 reference)
    // ============================================================

    // Create a 2D tilted rectangle (side view) using proper rotation
    // The angle parameter is the tilt angle from vertical
    // Block tilts RIGHT (rotates clockwise around bottom-left)
    createTiltedRect(cx, baseY, width, height, angle) {
      const radians = angle * Math.PI / 180;

      // Define vertical rectangle corners (before rotation)
      const corners = [
        { x: cx - width/2, y: baseY },           // bottom-left
        { x: cx + width/2, y: baseY },           // bottom-right
        { x: cx + width/2, y: baseY - height },  // top-right
        { x: cx - width/2, y: baseY - height }   // top-left
      ];

      // Pivot point: bottom-left corner of rectangle
      const pivotX = cx - width/2;
      const pivotY = baseY;

      // Rotate each corner clockwise around pivot
      let rotated = corners.map(c => ({
        x: pivotX + (c.x - pivotX) * Math.cos(radians) - (c.y - pivotY) * Math.sin(radians),
        y: pivotY + (c.x - pivotX) * Math.sin(radians) + (c.y - pivotY) * Math.cos(radians)
      }));

      // Find lowest point (max y) and shift up so it sits on baseY
      const maxY = Math.max(...rotated.map(c => c.y));
      const yOffset = maxY - baseY;
      rotated = rotated.map(c => ({ x: c.x, y: c.y - yOffset }));

      const [bl, br, tr, tl] = rotated;

      return {
        // Main rectangle polygon points
        points: `${bl.x},${bl.y} ${br.x},${br.y} ${tr.x},${tr.y} ${tl.x},${tl.y}`,
        // Left edge (green highlight) - from bottom-left to top-left
        leftEdge: { x1: bl.x, y1: bl.y, x2: tl.x, y2: tl.y },
        // Corner positions for angle indicators
        corners: { bl, br, tl, tr }
      };
    },

    // Create arc path for angle visualization
    // sweepFlag: 0 = counter-clockwise, 1 = clockwise
    createArcPath(cx, cy, radius, startAngle, endAngle, sweepFlag = 0) {
      const startRad = startAngle * Math.PI / 180;
      const endRad = endAngle * Math.PI / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy - radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy - radius * Math.sin(endRad);

      const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;

      return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`;
    },

    // Complementary angles (90 - angle)
    get complementaryAngleX() {
      return this.angleX ? (90 - this.angleX) : null;
    },

    get complementaryAngleY() {
      return this.angleY ? (90 - this.angleY) : null;
    },

    // Single block for square pixels (centered at x=200)
    get singleBlockData() {
      const angle = this.angleX ?? 45;
      const baseY = 240;
      const height = 160;
      const width = 50;
      const rect = this.createTiltedRect(200, baseY, width, height, angle);

      const vertLineX = rect.corners.bl.x - 35;
      const vertLineLen = height + 20;
      const vertLine = {
        x1: vertLineX,
        y1: baseY,
        x2: vertLineX,
        y2: baseY - vertLineLen
      };

      const vertLineMidY = baseY - vertLineLen / 2;
      const arcRadius = baseY - vertLineMidY;
      const arcCenterY = baseY;
      const arcPath = this.createArcPath(vertLineX, arcCenterY, arcRadius, 90, 0, 1);

      const angle1Pos = 79 * Math.PI / 180;
      const arc1LabelX = vertLineX + (arcRadius + 12) * Math.cos(angle1Pos);
      const arc1LabelY = arcCenterY - (arcRadius + 12) * Math.sin(angle1Pos);

      const angle2Pos = 20 * Math.PI / 180;
      const arc2LabelX = vertLineX + (arcRadius + 12) * Math.cos(angle2Pos);
      const arc2LabelY = arcCenterY - (arcRadius + 12) * Math.sin(angle2Pos);

      return {
        rect,
        vertLine,
        arcPath,
        arc1LabelPos: { x: arc1LabelX - 10, y: arc1LabelY - 25 },
        arc2LabelPos: { x: arc2LabelX + 5, y: arc2LabelY + 5 }
      };
    },

    get xBlockData() {
      const angle = this.angleX ?? 45;
      const baseY = 240;
      const height = 150;
      const width = 45;
      const rect = this.createTiltedRect(140, baseY, width, height, angle);

      const vertLineX = rect.corners.bl.x - 30;
      const vertLineLen = height + 15;
      const vertLine = {
        x1: vertLineX,
        y1: baseY,
        x2: vertLineX,
        y2: baseY - vertLineLen
      };

      const vertLineMidY = baseY - vertLineLen / 2;
      const arcRadius = baseY - vertLineMidY;
      const arcCenterY = baseY;
      const arcPath = this.createArcPath(vertLineX, arcCenterY, arcRadius, 90, 0, 1);

      const angle1Pos = 79 * Math.PI / 180;
      const arc1LabelX = vertLineX + (arcRadius + 10) * Math.cos(angle1Pos);
      const arc1LabelY = arcCenterY - (arcRadius + 10) * Math.sin(angle1Pos);

      const angle2Pos = 20 * Math.PI / 180;
      const arc2LabelX = vertLineX + (arcRadius + 10) * Math.cos(angle2Pos);
      const arc2LabelY = arcCenterY - (arcRadius + 10) * Math.sin(angle2Pos);

      return {
        rect,
        vertLine,
        arcPath,
        arc1LabelPos: { x: arc1LabelX - 7, y: arc1LabelY - 25 },
        arc2LabelPos: { x: arc2LabelX + 5, y: arc2LabelY + 5 }
      };
    },

    get yBlockData() {
      const angle = this.angleY ?? 45;
      const baseY = 240;
      const height = 150;
      const width = 45;
      const rect = this.createTiltedRect(420, baseY, width, height, angle);

      const vertLineX = rect.corners.bl.x - 30;
      const vertLineLen = height + 15;
      const vertLine = {
        x1: vertLineX,
        y1: baseY,
        x2: vertLineX,
        y2: baseY - vertLineLen
      };

      const vertLineMidY = baseY - vertLineLen / 2;
      const arcRadius = baseY - vertLineMidY;
      const arcCenterY = baseY;
      const arcPath = this.createArcPath(vertLineX, arcCenterY, arcRadius, 90, 0, 1);

      const angle1Pos = 79 * Math.PI / 180;
      const arc1LabelX = vertLineX + (arcRadius + 15) * Math.cos(angle1Pos);
      const arc1LabelY = arcCenterY - (arcRadius + 15) * Math.sin(angle1Pos);

      const angle2Pos = 20 * Math.PI / 180;
      const arc2LabelX = vertLineX + (arcRadius + 15) * Math.cos(angle2Pos);
      const arc2LabelY = arcCenterY - (arcRadius + 15) * Math.sin(angle2Pos);

      return {
        rect,
        vertLine,
        arcPath,
        arc1LabelPos: { x: arc1LabelX - 7, y: arc1LabelY - 25 },
        arc2LabelPos: { x: arc2LabelX + 5, y: arc2LabelY + 5 }
      };
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
        case 'Home':
          this.highlightedIndex = 0;
          this.scrollHighlightedIntoView();
          event.preventDefault();
          break;
        case 'End':
          this.highlightedIndex = items.length - 1;
          this.scrollHighlightedIntoView();
          event.preventDefault();
          break;
        case 'Tab':
          this.closeDropdown();
          // Allow default tab behavior to proceed
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
