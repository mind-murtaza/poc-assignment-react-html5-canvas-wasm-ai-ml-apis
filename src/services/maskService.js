/**
 * MaskService handles mask-based image manipulation operations
 * Provides functionality for deleting selected areas and inverting selections
 */
class MaskService {
	/**
	 * Creates a new mask service instance
	 * @param {CanvasRenderingContext2D} context - Canvas 2D context
	 * @param {number} canvasWidth - Canvas width
	 * @param {number} canvasHeight - Canvas height
	 */
	constructor(context, canvasWidth, canvasHeight) {
		this.context = context;
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
	}

	/**
	 * Deletes the selected area from the canvas using a mask
	 * @param {HTMLCanvasElement} maskCanvas - Mask canvas with selection
	 * @param {string} fillColor - Color to fill deleted area (default: transparent)
	 * @returns {boolean} Success status
	 * @throws {Error} If mask is invalid or operation fails
	 */
	deleteSelectedArea(maskCanvas, fillColor = 'transparent') {
		if (!maskCanvas) {
			throw new Error('Mask canvas is required');
		}

		// Allow for small floating point differences due to scaling
		const tolerance = 1; // Allow 1 pixel difference
		if (Math.abs(maskCanvas.width - this.canvasWidth) > tolerance ||
		    Math.abs(maskCanvas.height - this.canvasHeight) > tolerance) {
			throw new Error('Invalid mask canvas dimensions');
		}

		try {
			// Get mask image data
			const maskContext = maskCanvas.getContext('2d');
			const maskImageData = maskContext.getImageData(0, 0, this.canvasWidth, this.canvasHeight);

			// Get source image data
			const sourceImageData = this.context.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
			const sourceData = sourceImageData.data;
			const maskData = maskImageData.data;

			// Apply mask - delete selected areas
			for (let i = 0; i < sourceData.length; i += 4) {
				// If mask pixel is opaque (selected area)
				if (maskData[i + 3] > 128) {
					if (fillColor === 'transparent') {
						// Make pixel transparent
						sourceData[i + 3] = 0;
					} else {
						// Fill with specified color
						const color = this.parseColor(fillColor);
						sourceData[i] = color.r;     // Red
						sourceData[i + 1] = color.g; // Green
						sourceData[i + 2] = color.b; // Blue
						sourceData[i + 3] = 255;     // Alpha (fully opaque)
					}
				}
			}

			// Put modified image data back to canvas
			this.context.putImageData(sourceImageData, 0, 0);
			return true;
		} catch (error) {
			throw new Error(`Failed to delete selected area: ${error.message}`);
		}
	}

	/**
	 * Inverts the current selection mask
	 * @param {HTMLCanvasElement} maskCanvas - Original mask canvas
	 * @returns {HTMLCanvasElement} New mask canvas with inverted selection
	 * @throws {Error} If mask is invalid
	 */
	invertSelection(maskCanvas) {
		if (!maskCanvas) {
			throw new Error('Mask canvas is required');
		}

		// Allow for small floating point differences due to scaling
		const tolerance = 1; // Allow 1 pixel difference
		if (Math.abs(maskCanvas.width - this.canvasWidth) > tolerance ||
		    Math.abs(maskCanvas.height - this.canvasHeight) > tolerance) {
			throw new Error('Invalid mask canvas dimensions');
		}

		try {
			// Create new canvas for inverted mask
			const invertedCanvas = document.createElement('canvas');
			invertedCanvas.width = this.canvasWidth;
			invertedCanvas.height = this.canvasHeight;
			const invertedContext = invertedCanvas.getContext('2d');

			// Get original mask data
			const originalContext = maskCanvas.getContext('2d');
			const originalImageData = originalContext.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
			const originalData = originalImageData.data;

			// Create inverted mask
			const invertedImageData = invertedContext.createImageData(this.canvasWidth, this.canvasHeight);
			const invertedData = invertedImageData.data;

			// Invert the selection (where there was no selection, now there is)
			for (let i = 0; i < originalData.length; i += 4) {
				if (originalData[i + 3] > 128) {
					// Was selected, now unselected
					invertedData[i + 3] = 0;
				} else {
					// Was unselected, now selected
					invertedData[i + 3] = 255;
				}
			}

			// Apply inverted mask to canvas
			invertedContext.putImageData(invertedImageData, 0, 0);
			return invertedCanvas;
		} catch (error) {
			throw new Error(`Failed to invert selection: ${error.message}`);
		}
	}

	/**
	 * Applies a mask to the canvas with a specified operation
	 * @param {HTMLCanvasElement} maskCanvas - Mask to apply
	 * @param {string} operation - Operation type ('delete', 'fill', 'copy')
	 * @param {Object} options - Operation options
	 * @returns {boolean} Success status
	 * @throws {Error} If operation is not supported
	 */
	applyMask(maskCanvas, operation = 'delete', options = {}) {
		if (!maskCanvas) {
			throw new Error('Mask canvas is required');
		}

		switch (operation) {
			case 'delete':
				return this.deleteSelectedArea(maskCanvas, options.fillColor);

			case 'fill':
				return this.fillSelectedArea(maskCanvas, options.fillColor);

			case 'copy':
				return this.copySelectedArea(maskCanvas, options.destinationX, options.destinationY);

			default:
				throw new Error(`Unsupported mask operation: ${operation}`);
		}
	}

	/**
	 * Fills selected area with specified color
	 * @param {HTMLCanvasElement} maskCanvas - Mask canvas
	 * @param {string} fillColor - Color to fill with
	 * @returns {boolean} Success status
	 */
	fillSelectedArea(maskCanvas, fillColor) {
		const color = this.parseColor(fillColor);
		return this.deleteSelectedArea(maskCanvas, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
	}

	/**
	 * Copies selected area to a new location (placeholder for future implementation)
	 * @param {HTMLCanvasElement} maskCanvas - Mask canvas
	 * @param {number} destX - Destination X coordinate
	 * @param {number} destY - Destination Y coordinate
	 * @returns {boolean} Success status
	 */
	copySelectedArea(maskCanvas, destX, destY) {
		// This would implement copy/paste functionality
		// For now, return false as not implemented
		console.warn('Copy operation not yet implemented');
		return false;
	}

	/**
	 * Parses color string into RGB components
	 * @param {string} color - Color string (hex, rgb, rgba, named colors)
	 * @returns {Object} RGB color object with r, g, b properties
	 * @throws {Error} If color format is invalid
	 */
	parseColor(color) {
		// Handle transparent
		if (color === 'transparent') {
			return { r: 0, g: 0, b: 0 };
		}

		// Create temporary canvas to parse color
		const tempCanvas = document.createElement('canvas');
		tempCanvas.width = 1;
		tempCanvas.height = 1;
		const tempContext = tempCanvas.getContext('2d');

		tempContext.fillStyle = color;
		tempContext.fillRect(0, 0, 1, 1);

		const imageData = tempContext.getImageData(0, 0, 1, 1);
		const data = imageData.data;

		return {
			r: data[0],
			g: data[1],
			b: data[2]
		};
	}

	/**
	 * Validates mask canvas dimensions
	 * @param {HTMLCanvasElement} maskCanvas - Mask canvas to validate
	 * @returns {boolean} True if valid
	 */
	validateMaskCanvas(maskCanvas) {
		if (!maskCanvas) return false;

		// Allow for small floating point differences due to scaling
		const tolerance = 1; // Allow 1 pixel difference
		return Math.abs(maskCanvas.width - this.canvasWidth) <= tolerance &&
			   Math.abs(maskCanvas.height - this.canvasHeight) <= tolerance;
	}

	/**
	 * Gets mask statistics (selected vs unselected pixels)
	 * @param {HTMLCanvasElement} maskCanvas - Mask canvas
	 * @returns {Object} Statistics object
	 */
	getMaskStatistics(maskCanvas) {
		if (!this.validateMaskCanvas(maskCanvas)) {
			throw new Error('Invalid mask canvas');
		}

		const context = maskCanvas.getContext('2d');
		const imageData = context.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
		const data = imageData.data;

		let selectedPixels = 0;
		let totalPixels = this.canvasWidth * this.canvasHeight;

		for (let i = 0; i < data.length; i += 4) {
			if (data[i + 3] > 128) {
				selectedPixels++;
			}
		}

		return {
			selectedPixels,
			unselectedPixels: totalPixels - selectedPixels,
			totalPixels,
			selectionRatio: selectedPixels / totalPixels
		};
	}
}

export default MaskService;
