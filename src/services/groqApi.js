/**
 * Groq API Service
 * Handles natural language command parsing using Groq's fast inference
 */

const GROQ_API_URL =
	import.meta.env.VITE_GROQ_API_URL ||
	"https://api.groq.com/openai/v1/chat/completions";
const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || "llama3-8b-8192";
/**
 * Parse natural language command into canvas actions
 * @param {string} command - User's natural language command
 * @returns {Promise<Object>} - Parsed command object
 */
export const parseCommand = async (command) => {
	if (!API_KEY || API_KEY === "your_groq_api_key_here") {
		throw new Error(
			"Groq API key not configured. Please add VITE_GROQ_API_KEY to your .env file."
		);
	}

	const systemPrompt = `You are a canvas command parser. Convert natural language commands into JSON actions for an HTML5 canvas.

Supported actions:
1. Draw shapes: "draw red circle", "draw blue rectangle", "draw circle at top left", "draw rectangle in center"
2. Adjust brightness: "brighten image 20%", "darken image 15%"
3. Adjust contrast: "increase contrast 30%", "decrease contrast 10%"

Return JSON in this exact format:
{
  "action": "draw" | "adjust",
  "shape": "circle" | "rectangle" | "line" | "triangle" | "square" (for draw actions),
  "color": "red" | "blue" | "green" | "yellow" | "purple" | "black" | "white" | "orange" | "pink",
  "position": {"x": number, "y": number} (for draw actions - use 0.5, 0.5 for center, 0.2, 0.2 for top-left, etc.),
  "size": number (default 80, range 20-150),
  "adjustment": "brightness" | "contrast" (for adjust actions),
  "value": number (percentage change, positive for increase, negative for decrease)
}

Position Guidelines:
- Use decimal values between 0.0 and 1.0 for relative positioning
- 0.5, 0.5 = center
- 0.2, 0.2 = top-left area
- 0.8, 0.2 = top-right area
- 0.2, 0.8 = bottom-left area
- 0.8, 0.8 = bottom-right area
- If no position mentioned, use center (0.5, 0.5)

Examples:
- "draw red circle" → {"action": "draw", "shape": "circle", "color": "red", "position": {"x": 0.5, "y": 0.5}, "size": 80}
- "draw blue rectangle at top left" → {"action": "draw", "shape": "rectangle", "color": "blue", "position": {"x": 0.2, "y": 0.2}, "size": 80}
- "brighten image 20%" → {"action": "adjust", "adjustment": "brightness", "value": 20}
- "draw small green circle" → {"action": "draw", "shape": "circle", "color": "green", "position": {"x": 0.5, "y": 0.5}, "size": 40}
- "draw large yellow triangle at bottom right" → {"action": "draw", "shape": "triangle", "color": "yellow", "position": {"x": 0.8, "y": 0.8}, "size": 120}

Only return valid JSON, no explanations.`;

	try {
		const response = await fetch(GROQ_API_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: GROQ_MODEL, // Fast Llama model
				messages: [
					{
						role: "system",
						content: systemPrompt,
					},
					{
						role: "user",
						content: command,
					},
				],
				temperature: 0.1, // Low temperature for consistent parsing
				max_tokens: 500,
				top_p: 0.9,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(
				errorData.error?.message || `API Error: ${response.status}`
			);
		}

		const data = await response.json();
		const content = data.choices?.[0]?.message?.content?.trim();
		
		if (!content) {
			throw new Error("No response from AI");
		}

		// Parse JSON response
		try {
			const parsedCommand = JSON.parse(content);
			return parsedCommand;
		} catch (parseError) {
			console.error("Failed to parse AI response:", content);
			throw new Error("AI returned invalid response format");
		}
	} catch (error) {
		console.error("Groq API error:", error);
		throw new Error(`Command parsing failed: ${error.message}`);
	}
};

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
const drawShape = (ctx, canvas, command) => {
	const { shape, color, position, size = 50 } = command;

	// Get actual canvas dimensions
	const canvasWidth = canvas.width;
	const canvasHeight = canvas.height;

	ctx.fillStyle = color || "red";
	ctx.strokeStyle = color || "red";
	ctx.lineWidth = 3;

	// Calculate position based on canvas size
	let x, y;
	
	if (position && typeof position.x === 'number' && typeof position.y === 'number') {
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
	const scaledSize = Math.min(Math.max(size, 10), Math.min(canvasWidth, canvasHeight) * 0.2);

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
const adjustImage = (ctx, canvas, command) => {
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
const adjustBrightness = (data, value) => {
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
const adjustContrast = (data, value) => {
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
