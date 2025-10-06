/**
 * MagicWandService handles magic wand selection operations
 * Implements flood fill algorithm with configurable tolerance for color-based selection
 */
class MagicWandService {
	/**
	 * Creates a new magic wand service instance
	 * @param {CanvasRenderingContext2D} mainContext - Main canvas 2D context (for reading image data)
	 * @param {CanvasRenderingContext2D} overlayContext - Overlay canvas 2D context (for drawing selection)
	 * @param {number} canvasWidth - Canvas width
	 * @param {number} canvasHeight - Canvas height
	 */
	constructor(mainContext, overlayContext, canvasWidth, canvasHeight) {
		this.mainContext = mainContext; // Read image data from main canvas
		this.overlayContext = overlayContext; // Draw selection on overlay canvas
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.tolerance = 30; // Default tolerance (0-255)
		this.selectionMask = null;
		this.selectionColor = 'rgba(255, 107, 107, 0.7)'; // Light red for selection

		this.initializeMask();
	}

	/**
	 * Initializes the selection mask canvas
	 */
	initializeMask() {
		// Create off-screen canvas for mask data storage
		this.maskDataCanvas = document.createElement('canvas');
		this.maskDataCanvas.width = this.canvasWidth;
		this.maskDataCanvas.height = this.canvasHeight;
		this.maskDataContext = this.maskDataCanvas.getContext('2d');

		// Initialize with transparent mask
		this.clearMask();
	}

	/**
	 * Clears the selection mask and overlay
	 */
	clearMask() {
		// Clear mask data
		this.maskDataContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
		// Clear overlay visualization
		this.overlayContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
		this.selectionMask = null;
	}

	/**
	 * Sets the tolerance for color matching
	 * @param {number} tolerance - Tolerance value (0-255)
	 * @throws {Error} If tolerance is invalid
	 */
	setTolerance(tolerance) {
		if (tolerance < 0 || tolerance > 255) {
			throw new Error('Tolerance must be between 0 and 255');
		}
		this.tolerance = tolerance;
	}

	/**
	 * Gets current tolerance value
	 * @returns {number} Current tolerance
	 */
	getTolerance() {
		return this.tolerance;
	}

	/**
	 * Performs magic wand selection at given coordinates
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 * @param {boolean} isShiftClick - Whether this is a Shift+Click to add to selection
	 * @returns {boolean} Success status
	 */
	performMagicWand(x, y, isShiftClick = false) {
		try {
			// Get the color at the clicked point from the main canvas
			const imageData = this.mainContext.getImageData(Math.floor(x), Math.floor(y), 1, 1);
			const targetColor = {
				r: imageData.data[0],
				g: imageData.data[1],
				b: imageData.data[2],
				a: imageData.data[3]
			};

			// If NOT Shift+Click, clear previous selection
			if (!isShiftClick) {
				this.overlayContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
				this.maskDataContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
			}

			// Perform flood fill
			const selectedPixels = this.floodFill(x, y, targetColor);

			if (selectedPixels > 0) {
				this.generateSelectionMask();
				return true;
			}

			return false;
		} catch (error) {
			console.error('Magic wand error:', error);
			return false;
		}
	}

	/**
	 * Implements flood fill algorithm for color-based selection
	 * @param {number} startX - Starting X coordinate
	 * @param {number} startY - Starting Y coordinate
	 * @param {Object} targetColor - Target color to match
	 * @returns {number} Number of pixels selected
	 */
	floodFill(startX, startY, targetColor) {
		// Read image data from MAIN canvas (not overlay)
		const imageData = this.mainContext.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
		const data = imageData.data;
		
		// Track visited pixels
		const visited = new Uint8Array(this.canvasWidth * this.canvasHeight);
		
		// Get existing overlay data to preserve Shift+Click additions
		const existingOverlay = this.overlayContext.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
		const overlayData = existingOverlay.data;
		
		const queue = [];
		let selectedPixels = 0;

		// Add starting point to queue
		const startXInt = Math.floor(startX);
		const startYInt = Math.floor(startY);
		queue.push({ x: startXInt, y: startYInt });
		visited[startYInt * this.canvasWidth + startXInt] = 1;

		// Process queue
		while (queue.length > 0) {
			const { x, y } = queue.shift(); // Use shift for breadth-first
			const index = (y * this.canvasWidth + x) * 4;

			// Check if current pixel color is within tolerance of target color
			if (this.colorsWithinTolerance(data[index], data[index + 1], data[index + 2], targetColor, this.tolerance)) {
				// Mark pixel as selected in overlay data
				overlayData[index] = 255;     // R
				overlayData[index + 1] = 107; // G (light red)
				overlayData[index + 2] = 107; // B (light red)
				overlayData[index + 3] = 178; // A (0.7 opacity = 178)

				selectedPixels++;

				// Add adjacent pixels to queue (4-directional)
				const neighbors = [
					{ x: x + 1, y: y },     // Right
					{ x: x - 1, y: y },     // Left
					{ x: x, y: y + 1 },     // Down
					{ x: x, y: y - 1 }      // Up
				];

				for (const neighbor of neighbors) {
					if (neighbor.x >= 0 && neighbor.x < this.canvasWidth &&
						neighbor.y >= 0 && neighbor.y < this.canvasHeight) {
						const neighborIndex = neighbor.y * this.canvasWidth + neighbor.x;
						if (!visited[neighborIndex]) {
							visited[neighborIndex] = 1;
							queue.push(neighbor);
						}
					}
				}
			}
		}

		// Draw the selection to the overlay canvas
		this.overlayContext.putImageData(existingOverlay, 0, 0);

		return selectedPixels;
	}

	/**
	 * Checks if two colors are within the specified tolerance
	 * @param {number} r1 - Red component of first color
	 * @param {number} g1 - Green component of first color
	 * @param {number} b1 - Blue component of first color
	 * @param {Object} color2 - Second color object {r, g, b}
	 * @param {number} tolerance - Tolerance value
	 * @returns {boolean} True if colors are within tolerance
	 */
	colorsWithinTolerance(r1, g1, b1, color2, tolerance) {
		const r2 = color2.r;
		const g2 = color2.g;
		const b2 = color2.b;

		// Calculate Euclidean distance in RGB space
		const distance = Math.sqrt(
			Math.pow(r1 - r2, 2) +
			Math.pow(g1 - g2, 2) +
			Math.pow(b1 - b2, 2)
		);

		return distance <= tolerance;
	}

	/**
	 * Generates the final selection mask from the overlay canvas
	 */
	generateSelectionMask() {
		// Get overlay data
		const overlayImageData = this.overlayContext.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
		const overlayData = overlayImageData.data;

		// Create mask data (white for selected, transparent for unselected)
		const maskImageData = this.maskDataContext.createImageData(this.canvasWidth, this.canvasHeight);
		const maskData = maskImageData.data;

		// Convert any painted pixels (alpha > 10) to opaque white for the mask
		for (let i = 0; i < overlayData.length; i += 4) {
			if (overlayData[i + 3] > 10) {
				// This pixel is selected (has overlay color)
				maskData[i] = 255;     // R
				maskData[i + 1] = 255; // G
				maskData[i + 2] = 255; // B
				maskData[i + 3] = 255; // A (fully opaque for selection)
			} else {
				// This pixel was not selected
				maskData[i + 3] = 0; // Transparent
			}
		}

		this.maskDataContext.putImageData(maskImageData, 0, 0);
		this.selectionMask = this.maskDataCanvas;
	}

	/**
	 * Gets the current selection mask
	 * @returns {HTMLCanvasElement|null} Selection mask canvas or null if no selection
	 */
	getSelectionMask() {
		return this.selectionMask;
	}

	/**
	 * Gets selection bounds (min/max x,y coordinates of selection)
	 * @returns {Object|null} Selection bounds or null if no selection
	 */
	getSelectionBounds() {
		if (!this.selectionMask) return null;

		const imageData = this.maskDataContext.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
		const data = imageData.data;

		let minX = this.canvasWidth;
		let minY = this.canvasHeight;
		let maxX = 0;
		let maxY = 0;

		for (let y = 0; y < this.canvasHeight; y++) {
			for (let x = 0; x < this.canvasWidth; x++) {
				const index = (y * this.canvasWidth + x) * 4;
				if (data[index + 3] > 200) { // Selected pixel (high threshold for mask data)
					minX = Math.min(minX, x);
					minY = Math.min(minY, y);
					maxX = Math.max(maxX, x);
					maxY = Math.max(maxY, y);
				}
			}
		}

		if (minX > maxX) return null; // No selection

		return { minX, minY, maxX, maxY };
	}

	/**
	 * Checks if a point is within the current selection
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 * @returns {boolean} True if point is selected
	 */
	isPointSelected(x, y) {
		if (!this.selectionMask) return false;

		const imageData = this.maskDataContext.getImageData(Math.floor(x), Math.floor(y), 1, 1);
		const alpha = imageData.data[3];
		return alpha > 200; // High threshold for reliable detection
	}
}

export default MagicWandService;
