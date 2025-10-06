/**
 * PolygonSelectionService handles polygon-based selection operations
 * Implements click-to-add-point and close on first-point click functionality
 */
class PolygonSelectionService {
	/**
	 * Creates a new polygon selection service instance
	 * @param {CanvasRenderingContext2D} overlayContext - Overlay canvas 2D context (for drawing selection)
	 * @param {number} canvasWidth - Canvas width
	 * @param {number} canvasHeight - Canvas height
	 */
	constructor(overlayContext, canvasWidth, canvasHeight) {
		this.overlayContext = overlayContext;
		// Use integer dimensions for pixel operations
		this.canvasWidth = Math.floor(canvasWidth);
		this.canvasHeight = Math.floor(canvasHeight);
		this.points = []; // Array of {x, y} points
		this.isComplete = false;
		this.selectionMask = null;
		this.selectionColor = 'rgba(255, 107, 107, 0.7)'; // Light red for selection
		this.lineColor = 'rgba(255, 107, 107, 0.9)'; // Darker red for lines
		this.pointRadius = 4;
		this.currentMousePos = null; // For drawing preview line

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
		this.points = [];
		this.isComplete = false;
		this.currentMousePos = null;
	}

	/**
	 * Adds a point to the polygon
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 * @returns {boolean} True if point was added
	 */
	addPoint(x, y) {
		if (this.isComplete) {
			return false;
		}

		// Check if clicking near the first point to close polygon (within 10px)
		if (this.points.length >= 3) {
			const firstPoint = this.points[0];
			const distance = Math.sqrt(
				Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2)
			);
			
			if (distance <= 10) {
				this.closePolygon();
				return true;
			}
		}

		// Add the point
		this.points.push({ x, y });
		this.drawPolygon();
		return true;
	}

	/**
	 * Updates the current mouse position for preview line
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 */
	updateMousePosition(x, y) {
		if (this.isComplete || this.points.length === 0) return;

		this.currentMousePos = { x, y };
		this.drawPolygon();
	}

	/**
	 * Closes the polygon and generates the selection mask
	 * @returns {boolean} True if polygon was closed successfully
	 */
	closePolygon() {
		if (this.points.length < 3) return false;

		this.isComplete = true;
		this.currentMousePos = null;
		this.fillPolygon();
		this.generateSelectionMask();
		return true;
	}

	/**
	 * Draws the polygon outline and points
	 */
	drawPolygon() {
		// Clear overlay
		this.overlayContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

		if (this.points.length === 0) return;

		// Draw lines between points
		this.overlayContext.strokeStyle = this.lineColor;
		this.overlayContext.lineWidth = 2;
		this.overlayContext.beginPath();
		this.overlayContext.moveTo(this.points[0].x, this.points[0].y);

		for (let i = 1; i < this.points.length; i++) {
			this.overlayContext.lineTo(this.points[i].x, this.points[i].y);
		}

		// Draw preview line to current mouse position
		if (this.currentMousePos && !this.isComplete) {
			this.overlayContext.lineTo(this.currentMousePos.x, this.currentMousePos.y);
		}

		// Close path if complete
		if (this.isComplete) {
			this.overlayContext.closePath();
		}

		this.overlayContext.stroke();

		// Draw points
		this.points.forEach((point, index) => {
			this.overlayContext.fillStyle = index === 0 ? '#ff6b6b' : '#667eea';
			this.overlayContext.beginPath();
			this.overlayContext.arc(point.x, point.y, this.pointRadius, 0, Math.PI * 2);
			this.overlayContext.fill();
		});

		// Highlight first point when hovering near it (if we have at least 3 points)
		if (this.currentMousePos && this.points.length >= 3 && !this.isComplete) {
			const firstPoint = this.points[0];
			const distance = Math.sqrt(
				Math.pow(this.currentMousePos.x - firstPoint.x, 2) + 
				Math.pow(this.currentMousePos.y - firstPoint.y, 2)
			);

			if (distance <= 10) {
				this.overlayContext.fillStyle = 'rgba(255, 107, 107, 0.5)';
				this.overlayContext.beginPath();
				this.overlayContext.arc(firstPoint.x, firstPoint.y, 8, 0, Math.PI * 2);
				this.overlayContext.fill();
			}
		}
	}

	/**
	 * Fills the polygon with selection color
	 */
	fillPolygon() {
		if (this.points.length < 3) return;

		// Fill the polygon
		this.overlayContext.fillStyle = this.selectionColor;
		this.overlayContext.beginPath();
		this.overlayContext.moveTo(this.points[0].x, this.points[0].y);

		for (let i = 1; i < this.points.length; i++) {
			this.overlayContext.lineTo(this.points[i].x, this.points[i].y);
		}

		this.overlayContext.closePath();
		this.overlayContext.fill();

		// Draw outline
		this.overlayContext.strokeStyle = this.lineColor;
		this.overlayContext.lineWidth = 2;
		this.overlayContext.stroke();
	}

	/**
	 * Generates the final selection mask from ONLY the polygon area (no dots/lines)
	 */
	generateSelectionMask() {
		// Clear mask data canvas
		this.maskDataContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
		
		// Draw ONLY the filled polygon on the mask canvas (no dots, no lines)
		this.maskDataContext.fillStyle = 'white';
		this.maskDataContext.beginPath();
		this.maskDataContext.moveTo(this.points[0].x, this.points[0].y);

		for (let i = 1; i < this.points.length; i++) {
			this.maskDataContext.lineTo(this.points[i].x, this.points[i].y);
		}

		this.maskDataContext.closePath();
		this.maskDataContext.fill();
		
		// Set the selection mask
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
	 * Checks if the polygon is complete
	 * @returns {boolean} True if polygon is closed
	 */
	isPolygonComplete() {
		return this.isComplete;
	}

	/**
	 * Gets the number of points in the polygon
	 * @returns {number} Number of points
	 */
	getPointCount() {
		return this.points.length;
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

export default PolygonSelectionService;
