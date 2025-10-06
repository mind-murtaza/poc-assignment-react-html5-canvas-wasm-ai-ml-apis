/**
 * Canvas Operations Service
 * Handles all canvas drawing and image manipulation operations
 * Separated from AI/LLM logic for better modularity
 */

/**
 * Execute parsed command on canvas
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {Object} command - Parsed command object
 */
export const executeCommand = (canvas, command) => {
	const ctx = canvas.getContext("2d");

	switch (command.action) {
		case "draw":
			drawShape(ctx, canvas, command);
			break;
		case "adjust":
			adjustImage(ctx, canvas, command);
			break;
		default:
			throw new Error(`Unknown action: ${command.action}`);
	}
};

/**
 * Draw shape on canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {Object} command
 */
export const drawShape = (ctx, canvas, command) => {
	const { shape, color, position, size = 50 } = command;

	// Get actual canvas dimensions
	const canvasWidth = canvas.width;
	const canvasHeight = canvas.height;

	ctx.fillStyle = color || "red";
	ctx.strokeStyle = color || "red";
	ctx.lineWidth = 3;

	// Calculate position based on canvas size
	let x, y;

	if (position && typeof position.x === "number" && typeof position.y === "number") {
		// If coordinates are between 0-1, treat as percentage (relative positioning)
		if (position.x <= 1 && position.y <= 1) {
			x = position.x * canvasWidth;
			y = position.y * canvasHeight;
		} else {
			// Otherwise use as absolute coordinates but clamp to canvas bounds
			x = Math.min(Math.max(position.x, size), canvasWidth - size);
			y = Math.min(Math.max(position.y, size), canvasHeight - size);
		}
	} else {
		// Default to center
		x = canvasWidth / 2;
		y = canvasHeight / 2;
	}

	// Scale size relative to canvas (minimum 10px, maximum 20% of smaller dimension)
	const scaledSize = Math.min(
		Math.max(size, 10),
		Math.min(canvasWidth, canvasHeight) * 0.2
	);

	switch (shape) {
		case "circle":
			ctx.beginPath();
			ctx.arc(x, y, scaledSize, 0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();
			break;

		case "rectangle":
			const rectX = x - scaledSize / 2;
			const rectY = y - scaledSize / 2;
			ctx.fillRect(rectX, rectY, scaledSize, scaledSize * 0.6); // Make it more rectangular
			ctx.strokeRect(rectX, rectY, scaledSize, scaledSize * 0.6);
			break;

		case "square":
			const squareX = x - scaledSize / 2;
			const squareY = y - scaledSize / 2;
			ctx.fillRect(squareX, squareY, scaledSize, scaledSize);
			ctx.strokeRect(squareX, squareY, scaledSize, scaledSize);
			break;

		case "line":
			ctx.beginPath();
			ctx.moveTo(x - scaledSize / 2, y);
			ctx.lineTo(x + scaledSize / 2, y);
			ctx.stroke();
			break;

		case "triangle":
			ctx.beginPath();
			ctx.moveTo(x, y - scaledSize / 2); // Top point
			ctx.lineTo(x - scaledSize / 2, y + scaledSize / 2); // Bottom left
			ctx.lineTo(x + scaledSize / 2, y + scaledSize / 2); // Bottom right
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
			break;

		default:
			throw new Error(`Unknown shape: ${shape}`);
	}
};

/**
 * Adjust image properties
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {Object} command
 */
export const adjustImage = (ctx, canvas, command) => {
	const { adjustment, value } = command;
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const data = imageData.data;

	switch (adjustment) {
		case "brightness":
			adjustBrightness(data, value);
			break;
		case "contrast":
			adjustContrast(data, value);
			break;
		default:
			throw new Error(`Unknown adjustment: ${adjustment}`);
	}

	ctx.putImageData(imageData, 0, 0);
};

/**
 * Adjust brightness of image data
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} value - Brightness adjustment percentage
 */
export const adjustBrightness = (data, value) => {
	const factor = (value / 100) * 255;

	for (let i = 0; i < data.length; i += 4) {
		data[i] = Math.max(0, Math.min(255, data[i] + factor)); // Red
		data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + factor)); // Green
		data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + factor)); // Blue
		// Alpha channel (i + 3) remains unchanged
	}
};

/**
 * Adjust contrast of image data
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} value - Contrast adjustment percentage
 */
export const adjustContrast = (data, value) => {
	const factor = (259 * (value + 255)) / (255 * (259 - value));

	for (let i = 0; i < data.length; i += 4) {
		data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128)); // Red
		data[i + 1] = Math.max(
			0,
			Math.min(255, factor * (data[i + 1] - 128) + 128)
		); // Green
		data[i + 2] = Math.max(
			0,
			Math.min(255, factor * (data[i + 2] - 128) + 128)
		); // Blue
		// Alpha channel (i + 3) remains unchanged
	}
};

