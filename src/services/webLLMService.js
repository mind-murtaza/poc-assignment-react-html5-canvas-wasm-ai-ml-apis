/**
 * Web LLM Service
 * Handles natural language command parsing using local browser-based LLM
 * This service ONLY handles AI/LLM operations
 * Canvas operations are handled by canvasOperations.js
 */

import * as webllm from "@mlc-ai/web-llm";

// Singleton engine instance
let engineInstance = null;
let isInitializing = false;
let initializationPromise = null;

// Available models - choose smaller models for better performance
const DEFAULT_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

// Alternative models (commented out for reference):
// const DEFAULT_MODEL = "Phi-3.5-mini-instruct-q4f16_1-MLC"; // Smaller, faster
// const DEFAULT_MODEL = "Llama-3.2-3B-Instruct-q4f16_1-MLC"; // Larger, more capable

/**
 * Initialize the Web LLM engine
 * @param {Function} progressCallback - Callback for initialization progress
 * @returns {Promise<webllm.MLCEngine>} - Initialized engine
 */
export const initializeEngine = async (progressCallback) => {
	// Return existing instance if already initialized
	if (engineInstance) {
		return engineInstance;
	}

	// Return existing initialization promise if currently initializing
	if (isInitializing && initializationPromise) {
		return initializationPromise;
	}

	isInitializing = true;

	initializationPromise = (async () => {
		try {
			// Create engine with progress callback
			const engine = await webllm.CreateMLCEngine(DEFAULT_MODEL, {
				initProgressCallback: (progress) => {
					if (progressCallback) {
						progressCallback(progress);
					}
				},
			});

			engineInstance = engine;
			isInitializing = false;
			return engine;
		} catch (error) {
			isInitializing = false;
			initializationPromise = null;
			throw new Error(`Failed to initialize Web LLM: ${error.message}`);
		}
	})();

	return initializationPromise;
};

/**
 * Get the current engine instance (if initialized)
 * @returns {webllm.MLCEngine|null}
 */
export const getEngine = () => {
	return engineInstance;
};

/**
 * Check if engine is initialized
 * @returns {boolean}
 */
export const isEngineReady = () => {
	return engineInstance !== null;
};

/**
 * Parse natural language command into canvas actions using Web LLM
 * @param {string} command - User's natural language command
 * @param {Function} progressCallback - Optional progress callback
 * @returns {Promise<Object>} - Parsed command object
 */
export const parseCommand = async (command, progressCallback) => {
	// Initialize engine if not ready
	if (!engineInstance) {
		await initializeEngine(progressCallback);
	}

	const systemPrompt = `You are a JSON command parser for canvas drawing. Parse user commands into EXACT JSON format.

CRITICAL RULES:
1. For DRAW commands: ONLY include "action", "shape", "color", "position", "size"
2. For ADJUST commands: ONLY include "action", "adjustment", "value"
3. NEVER mix draw and adjust fields
4. Position values MUST be decimals between 0.0 and 1.0

POSITION MAPPING (IMPORTANT):
- center / middle → {"x": 0.5, "y": 0.5}
- top left → {"x": 0.2, "y": 0.2}
- top right → {"x": 0.8, "y": 0.2}
- bottom left → {"x": 0.2, "y": 0.8}
- bottom right → {"x": 0.8, "y": 0.8}
- top center → {"x": 0.5, "y": 0.2}
- bottom center → {"x": 0.5, "y": 0.8}
- left center → {"x": 0.2, "y": 0.5}
- right center → {"x": 0.8, "y": 0.5}

SIZE MAPPING:
- small → 40
- normal/default → 80
- large → 120
- tiny → 20
- huge → 150

COLORS: red, blue, green, yellow, purple, black, white, orange, pink

SHAPES: circle, rectangle, square, triangle, line

DRAW COMMAND FORMAT (use ONLY these 5 fields):
{
  "action": "draw",
  "shape": "circle",
  "color": "red",
  "position": {"x": 0.5, "y": 0.5},
  "size": 80
}

ADJUST COMMAND FORMAT (use ONLY these 3 fields):
{
  "action": "adjust",
  "adjustment": "brightness",
  "value": 20
}

EXAMPLES:
Input: "draw red circle"
Output: {"action": "draw", "shape": "circle", "color": "red", "position": {"x": 0.5, "y": 0.5}, "size": 80}

Input: "draw blue rectangle at top left"
Output: {"action": "draw", "shape": "rectangle", "color": "blue", "position": {"x": 0.2, "y": 0.2}, "size": 80}

Input: "draw square bottom left"
Output: {"action": "draw", "shape": "square", "color": "black", "position": {"x": 0.2, "y": 0.8}, "size": 80}

Input: "draw large yellow triangle at bottom right"
Output: {"action": "draw", "shape": "triangle", "color": "yellow", "position": {"x": 0.8, "y": 0.8}, "size": 120}

Input: "draw small green circle at top right"
Output: {"action": "draw", "shape": "circle", "color": "green", "position": {"x": 0.8, "y": 0.2}, "size": 40}

Input: "brighten image 20%"
Output: {"action": "adjust", "adjustment": "brightness", "value": 20}

Input: "darken image 15%"
Output: {"action": "adjust", "adjustment": "brightness", "value": -15}

Return ONLY the JSON object. No extra text.`;

	try {
		const messages = [
			{
				role: "system",
				content: systemPrompt,
			},
			{
				role: "user",
				content: command,
			},
		];

		// Generate response using Web LLM
		const response = await engineInstance.chat.completions.create({
			messages: messages,
			temperature: 0.1, // Low temperature for consistent parsing
			max_tokens: 500,
			top_p: 0.9,
		});

		const content = response.choices?.[0]?.message?.content?.trim();

		if (!content) {
			throw new Error("No response from AI");
		}

		// Extract JSON from response (handle cases where model adds extra text)
		let jsonContent = content;
		
		// Try to find JSON in the response
		const jsonMatch = content.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			jsonContent = jsonMatch[0];
		}

		// Parse JSON response
		try {
			const parsedCommand = JSON.parse(jsonContent);
			return parsedCommand;
		} catch (parseError) {
			console.error("Failed to parse AI response:", content);
			throw new Error("AI returned invalid response format");
		}
	} catch (error) {
		console.error("Web LLM error:", error);
		throw new Error(`Command parsing failed: ${error.message}`);
	}
};

/**
 * Reset/unload the engine (useful for cleanup)
 */
export const resetEngine = async () => {
	if (engineInstance) {
		try {
			await engineInstance.unload();
		} catch (error) {
			console.error("Error unloading engine:", error);
		}
		engineInstance = null;
		isInitializing = false;
		initializationPromise = null;
	}
};

