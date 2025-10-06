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
		// Use integer dimensions for pixel operations (consistent with other services)
		this.canvasWidth = Math.floor(canvasWidth);
		this.canvasHeight = Math.floor(canvasHeight);
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

			default:
				throw new Error(`Unsupported mask operation: ${operation}`);
		}
	}




}

export default MaskService;
