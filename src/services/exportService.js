/**
 * ExportService handles image export operations for selected areas and full canvas
 * Supports JPEG and PNG formats with various quality and transparency options
 */
class ExportService {
	/**
	 * Creates a new export service instance
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
	 * Exports the entire canvas as an image
	 * @param {string} format - Export format ('jpeg' or 'png')
	 * @param {Object} options - Export options
	 * @returns {string} Data URL of exported image
	 * @throws {Error} If format is not supported or export fails
	 */
	exportCanvas(format = 'png', options = {}) {
		if (!this.isValidFormat(format)) {
			throw new Error(`Unsupported export format: ${format}. Supported formats: jpeg, png`);
		}

		try {
			const mimeType = this.getMimeType(format);
			const quality = options.quality || 0.9;

			return this.context.canvas.toDataURL(mimeType, quality);
		} catch (error) {
			throw new Error(`Failed to export canvas: ${error.message}`);
		}
	}

	/**
	 * Exports a selected area using a mask
	 * @param {HTMLCanvasElement} maskCanvas - Mask canvas defining selection
	 * @param {string} format - Export format ('jpeg' or 'png')
	 * @param {Object} options - Export options
	 * @returns {string} Data URL of exported selection
	 * @throws {Error} If mask is invalid or export fails
	 */
	exportSelection(maskCanvas, format = 'png', options = {}) {
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
			// Create temporary canvas for the selection
			const selectionCanvas = this.createSelectionCanvas(maskCanvas);
			const selectionContext = selectionCanvas.getContext('2d');

			// Get selection bounds for cropping
			const bounds = this.getSelectionBounds(maskCanvas);
			if (!bounds) {
				throw new Error('No selection found in mask');
			}

			// Create cropped canvas with selection
			const croppedCanvas = document.createElement('canvas');
			croppedCanvas.width = bounds.maxX - bounds.minX + 1;
			croppedCanvas.height = bounds.maxY - bounds.minY + 1;
			const croppedContext = croppedCanvas.getContext('2d');

			// Draw the selected portion with transparency
			const sourceImageData = this.context.getImageData(bounds.minX, bounds.minY,
															bounds.maxX - bounds.minX + 1,
															bounds.maxY - bounds.minY + 1);
			const maskImageData = selectionContext.getImageData(bounds.minX, bounds.minY,
															  bounds.maxX - bounds.minX + 1,
															  bounds.maxY - bounds.minY + 1);

			// Apply mask to create transparent background for unselected areas
			this.applyMaskToImageData(sourceImageData, maskImageData);

			croppedContext.putImageData(sourceImageData, 0, 0);

			// Export the cropped selection
			return croppedCanvas.toDataURL(this.getMimeType(format), options.quality || 0.9);
		} catch (error) {
			throw new Error(`Failed to export selection: ${error.message}`);
		}
	}

	/**
	 * Downloads an image with specified filename
	 * @param {string} dataUrl - Image data URL
	 * @param {string} filename - Download filename
	 * @param {string} format - Image format
	 * @throws {Error} If download fails
	 */
	downloadImage(dataUrl, filename, format) {
		try {
			const link = document.createElement('a');
			link.download = filename;
			link.href = dataUrl;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			throw new Error(`Failed to download image: ${error.message}`);
		}
	}

	/**
	 * Exports and downloads the entire canvas
	 * @param {string} format - Export format ('jpeg' or 'png')
	 * @param {string} filename - Download filename
	 * @param {Object} options - Export options
	 * @throws {Error} If export or download fails
	 */
	exportAndDownloadCanvas(format = 'png', filename = 'canvas-export', options = {}) {
		const dataUrl = this.exportCanvas(format, options);
		const finalFilename = this.generateFilename(filename, format);
		this.downloadImage(dataUrl, finalFilename, format);
	}

	/**
	 * Exports and downloads a selection
	 * @param {HTMLCanvasElement} maskCanvas - Mask canvas
	 * @param {string} format - Export format ('jpeg' or 'png')
	 * @param {string} filename - Download filename
	 * @param {Object} options - Export options
	 * @throws {Error} If export or download fails
	 */
	exportAndDownloadSelection(maskCanvas, format = 'png', filename = 'selection-export', options = {}) {
		const dataUrl = this.exportSelection(maskCanvas, format, options);
		const finalFilename = this.generateFilename(filename, format);
		this.downloadImage(dataUrl, finalFilename, format);
	}

	/**
	 * Creates a temporary canvas with the selection applied
	 * @param {HTMLCanvasElement} maskCanvas - Mask canvas
	 * @returns {HTMLCanvasElement} Selection canvas
	 */
	createSelectionCanvas(maskCanvas) {
		const selectionCanvas = document.createElement('canvas');
		selectionCanvas.width = this.canvasWidth;
		selectionCanvas.height = this.canvasHeight;
		const selectionContext = selectionCanvas.getContext('2d');

		// Copy original canvas
		selectionContext.drawImage(this.context.canvas, 0, 0);

		// Apply mask (make unselected areas transparent)
		const maskContext = maskCanvas.getContext('2d');
		const maskImageData = maskContext.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
		const selectionImageData = selectionContext.getImageData(0, 0, this.canvasWidth, this.canvasHeight);

		this.applyMaskToImageData(selectionImageData, maskImageData);
		selectionContext.putImageData(selectionImageData, 0, 0);

		return selectionCanvas;
	}

	/**
	 * Applies mask to image data (makes unselected areas transparent)
	 * @param {ImageData} imageData - Source image data
	 * @param {ImageData} maskImageData - Mask image data
	 */
	applyMaskToImageData(imageData, maskImageData) {
		const sourceData = imageData.data;
		const maskData = maskImageData.data;

		for (let i = 0; i < sourceData.length; i += 4) {
			// If mask pixel is transparent (unselected), make source transparent
			if (maskData[i + 3] < 128) {
				sourceData[i + 3] = 0; // Set alpha to 0 (transparent)
			}
		}
	}

	/**
	 * Gets selection bounds from mask
	 * @param {HTMLCanvasElement} maskCanvas - Mask canvas
	 * @returns {Object|null} Selection bounds or null if no selection
	 */
	getSelectionBounds(maskCanvas) {
		const maskContext = maskCanvas.getContext('2d');
		const maskImageData = maskContext.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
		const maskData = maskImageData.data;

		let minX = this.canvasWidth;
		let minY = this.canvasHeight;
		let maxX = 0;
		let maxY = 0;

		for (let y = 0; y < this.canvasHeight; y++) {
			for (let x = 0; x < this.canvasWidth; x++) {
				const index = (y * this.canvasWidth + x) * 4;
				if (maskData[index + 3] > 200) { // Selected pixel (higher threshold for mask data)
					minX = Math.min(minX, x);
					minY = Math.min(minY, y);
					maxX = Math.max(maxX, x);
					maxY = Math.max(maxY, y);
				}
			}
		}

		if (minX > maxX) {
			return null; // No selection
		}

		return { minX, minY, maxX, maxY };
	}

	/**
	 * Validates export format
	 * @param {string} format - Format to validate
	 * @returns {boolean} True if valid format
	 */
	isValidFormat(format) {
		return ['jpeg', 'png'].includes(format.toLowerCase());
	}

	/**
	 * Gets MIME type for format
	 * @param {string} format - Image format
	 * @returns {string} MIME type
	 */
	getMimeType(format) {
		const formatLower = format.toLowerCase();
		return formatLower === 'jpeg' ? 'image/jpeg' : `image/${formatLower}`;
	}

	/**
	 * Generates filename with format extension
	 * @param {string} baseFilename - Base filename
	 * @param {string} format - Image format
	 * @returns {string} Filename with proper extension
	 */
	generateFilename(baseFilename, format) {
		const extension = format.toLowerCase();
		const baseName = baseFilename.replace(/\.[^/.]+$/, ''); // Remove existing extension
		return `${baseName}.${extension}`;
	}

}

export default ExportService;
