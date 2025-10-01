/**
 * BrushSelectionService handles brush-based image selection operations
 * Provides functionality for creating selections with configurable brush sizes
 */
class BrushSelectionService {
	/**
	 * Creates a new brush selection service instance
	 * @param {CanvasRenderingContext2D} context - Canvas 2D context
	 * @param {number} canvasWidth - Canvas width
	 * @param {number} canvasHeight - Canvas height
	 */
	constructor(context, canvasWidth, canvasHeight) {
		this.context = context;
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.brushSize = 10; // Default brush size
		this.isDrawing = false;
		this.selectionMask = null;

		this.initializeMask();
	}

	/**
	 * Initializes the selection mask canvas
	 */
	initializeMask() {
		// Use the provided context (which is the overlay canvas context)
		// The 'context' parameter passed to constructor is already the overlay canvas context
		this.maskContext = this.context;
		
		// Also create an off-screen canvas for mask data storage
		this.maskCanvas = document.createElement('canvas');
		this.maskCanvas.width = this.canvasWidth;
		this.maskCanvas.height = this.canvasHeight;
		this.maskDataContext = this.maskCanvas.getContext('2d');

		// Initialize with transparent mask
		this.clearMask();
	}

	/**
	 * Clears the selection mask
	 */
	clearMask() {
		this.maskContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
		this.selectionMask = null;
		this.lastX = null;
		this.lastY = null;
	}

	/**
	 * Sets the brush size for selection
	 * @param {number} size - Brush size in pixels (1-50)
	 * @throws {Error} If size is invalid
	 */
	setBrushSize(size) {
		if (size < 1 || size > 50) {
			throw new Error('Brush size must be between 1 and 50 pixels');
		}
		this.brushSize = size;
	}

	/**
	 * Gets current brush size
	 * @returns {number} Current brush size
	 */
	getBrushSize() {
		return this.brushSize;
	}


	/**
	 * Starts drawing selection at given coordinates
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 */
	startSelection(x, y) {
		this.isDrawing = true;
		this.lastX = x;
		this.lastY = y;
		this.drawBrush(x, y);
	}

	/**
	 * Continues drawing selection to given coordinates
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 */
	continueSelection(x, y) {
		if (!this.isDrawing) return;

		// Draw line from previous point to current point
		this.drawLineTo(x, y);
	}

	/**
	 * Ends the current selection
	 */
	endSelection() {
		this.isDrawing = false;
		this.lastX = null;
		this.lastY = null;
		this.generateSelectionMask();
	}

	/**
	 * Draws a brush stroke at given coordinates
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 */
	drawBrush(x, y) {
		this.maskContext.globalCompositeOperation = 'source-over';
		this.maskContext.fillStyle = 'rgba(255, 107, 107, 0.7)'; // Light red color
		this.maskContext.strokeStyle = 'rgba(255, 107, 107, 0.9)'; // Light red border
		this.maskContext.lineWidth = 2;

		this.maskContext.setLineDash([]); // No dash pattern

		this.maskContext.beginPath();
		this.maskContext.arc(x, y, this.brushSize / 2, 0, 2 * Math.PI);

		this.maskContext.fill();
		this.maskContext.stroke();
	}

	/**
	 * Draws a line between two points for smooth brush strokes
	 * @param {number} x - Target X coordinate
	 * @param {number} y - Target Y coordinate
	 */
	drawLineTo(x, y) {
		// Store last position if not exists
		if (!this.lastX) {
			this.lastX = x;
			this.lastY = y;
		}

		// Draw a line from last position to current position for smooth strokes
		const distance = Math.sqrt(Math.pow(x - this.lastX, 2) + Math.pow(y - this.lastY, 2));
		const steps = Math.max(1, Math.floor(distance / 2)); // Draw points every 2 pixels for smoothness

		for (let i = 0; i <= steps; i++) {
			const t = i / steps;
			const intermediateX = this.lastX + (x - this.lastX) * t;
			const intermediateY = this.lastY + (y - this.lastY) * t;
			this.drawBrush(intermediateX, intermediateY);
		}

		// Update last position
		this.lastX = x;
		this.lastY = y;
	}

	/**
	 * Generates the final selection mask from brush strokes
	 */
	generateSelectionMask() {
		// Copy the visible overlay canvas to the mask data canvas for operations
		this.maskDataContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
		this.maskDataContext.drawImage(this.context.canvas, 0, 0);

		const imageData = this.maskDataContext.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
		const data = imageData.data;

		// Convert colored brush strokes to selection mask (alpha channel)
		for (let i = 0; i < data.length; i += 4) {
			// Check if pixel has any significant opacity (was painted by brush)
			if (data[i + 3] > 10) {
				data[i] = 255;     // White
				data[i + 1] = 255; // White
				data[i + 2] = 255; // White
				data[i + 3] = 255; // Fully opaque for selection
			}
		}

		this.maskDataContext.putImageData(imageData, 0, 0);
		this.selectionMask = this.maskCanvas;
	}

	/**
	 * Gets the current selection mask
	 * @returns {HTMLCanvasElement|null} Selection mask canvas or null if no selection
	 */
	getSelectionMask() {
		return this.selectionMask;
	}

}

export default BrushSelectionService;
