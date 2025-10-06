/**
 * HistoryService manages undo/redo operations for canvas state
 * Implements stack-based history with configurable limits
 */
class HistoryService {
	/**
	 * Creates a new history service instance
	 * @param {number} maxHistorySize - Maximum number of history states to keep (default: 50)
	 */
	constructor(maxHistorySize = 50) {
		this.maxHistorySize = maxHistorySize;
		this.historyStack = [];
		this.currentIndex = -1;
	}

	/**
	 * Saves the current canvas state to history
	 * @param {HTMLCanvasElement} canvas - Canvas element to save
	 * @returns {boolean} True if state was saved successfully
	 */
	saveState(canvas) {
		try {
			if (!canvas) return false;

			// Get canvas as data URL (PNG format for lossless quality)
			const dataUrl = canvas.toDataURL('image/png');

			// Remove any states after current index (if we're in the middle of history)
			if (this.currentIndex < this.historyStack.length - 1) {
				this.historyStack = this.historyStack.slice(0, this.currentIndex + 1);
			}

			// Add new state
			this.historyStack.push({
				dataUrl,
				timestamp: Date.now(),
			});

			// Limit history size
			if (this.historyStack.length > this.maxHistorySize) {
				this.historyStack.shift();
			} else {
				this.currentIndex++;
			}

			return true;
		} catch (error) {
			console.error('Failed to save history state:', error);
			return false;
		}
	}

	/**
	 * Restores a canvas state from data URL
	 * @param {HTMLCanvasElement} canvas - Canvas element to restore to
	 * @param {string} dataUrl - Data URL of the image to restore
	 * @returns {Promise<boolean>} Promise that resolves to true if restore was successful
	 */
	async restoreState(canvas, dataUrl) {
		return new Promise((resolve, reject) => {
			try {
				const img = new Image();
				
				img.onload = () => {
					const ctx = canvas.getContext('2d');
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(img, 0, 0);
					resolve(true);
				};

				img.onerror = () => {
					reject(new Error('Failed to load image from history'));
				};

				img.src = dataUrl;
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Performs undo operation
	 * @param {HTMLCanvasElement} canvas - Canvas element to restore to
	 * @returns {Promise<boolean>} Promise that resolves to true if undo was successful
	 */
	async undo(canvas) {
		if (!this.canUndo()) return false;

		try {
			this.currentIndex--;
			const state = this.historyStack[this.currentIndex];
			await this.restoreState(canvas, state.dataUrl);
			return true;
		} catch (error) {
			console.error('Undo failed:', error);
			// Restore index on failure
			this.currentIndex++;
			return false;
		}
	}

	/**
	 * Performs redo operation
	 * @param {HTMLCanvasElement} canvas - Canvas element to restore to
	 * @returns {Promise<boolean>} Promise that resolves to true if redo was successful
	 */
	async redo(canvas) {
		if (!this.canRedo()) return false;

		try {
			this.currentIndex++;
			const state = this.historyStack[this.currentIndex];
			await this.restoreState(canvas, state.dataUrl);
			return true;
		} catch (error) {
			console.error('Redo failed:', error);
			// Restore index on failure
			this.currentIndex--;
			return false;
		}
	}

	/**
	 * Checks if undo is available
	 * @returns {boolean} True if undo is possible
	 */
	canUndo() {
		return this.currentIndex > 0;
	}

	/**
	 * Checks if redo is available
	 * @returns {boolean} True if redo is possible
	 */
	canRedo() {
		return this.currentIndex < this.historyStack.length - 1;
	}

	/**
	 * Gets the current history index
	 * @returns {number} Current index in history stack
	 */
	getCurrentIndex() {
		return this.currentIndex;
	}

	/**
	 * Gets the total number of history states
	 * @returns {number} Total history states
	 */
	getHistoryLength() {
		return this.historyStack.length;
	}

	/**
	 * Clears all history
	 */
	clearHistory() {
		this.historyStack = [];
		this.currentIndex = -1;
	}

	/**
	 * Gets history statistics
	 * @returns {Object} History statistics
	 */
	getStats() {
		return {
			currentIndex: this.currentIndex,
			totalStates: this.historyStack.length,
			canUndo: this.canUndo(),
			canRedo: this.canRedo(),
			maxSize: this.maxHistorySize,
		};
	}
}

export default HistoryService;

