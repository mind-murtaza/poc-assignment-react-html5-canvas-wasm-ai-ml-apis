/**
 * Simple Text-to-Text API using Transformers.js
 * Input: "draw circle with 40 size"
 * Output: '{"action": "draw", "shape": "circle", "size": 40}'
 */

import { pipeline, env } from '@xenova/transformers';
import { executeCommand as executeCanvasCommand } from './canvasOperations.js';

// Configure Transformers.js environment
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

let textGenerator = null;
let isLoading = false;
let isReady = false;

/**
 * Initialize the text-to-text model
 */
const initializeModel = async () => {
	if (isLoading || isReady) return;
	
	isLoading = true;
	console.log('🤖 Loading Text-to-Text model...');
	
	try {
		// Try GPT-2 which is known to work well with Transformers.js
		console.log('📥 Loading Xenova/gpt2 (reliable text generation)...');
		textGenerator = await pipeline('text-generation', 'Xenova/gpt2');
		
		isReady = true;
		console.log('✅ GPT-2 loaded successfully!');
		
	} catch (error) {
		console.error('❌ Failed to load GPT-2, trying DistilGPT2:', error);
		
		// Try DistilGPT2 as fallback (smaller, faster)
		try {
			console.log('📥 Loading Xenova/distilgpt2...');
			textGenerator = await pipeline('text-generation', 'Xenova/distilgpt2');
			isReady = true;
			console.log('✅ DistilGPT2 ready as fallback!');
		} catch (distilError) {
			console.error('❌ All models failed:', distilError);
			isReady = false;
		}
	} finally {
		isLoading = false;
	}
};

/**
 * Parse natural language command and return JSON
 * @param {string} command - User's natural language command
 * @returns {Promise<Object>} - JSON command object
 */
export const parseCommand = async (command) => {
	console.log('🔥 Converting text to JSON with AI model:', command);
	
	// Ensure model is loaded
	if (!isReady) {
		await initializeModel();
	}
	
	if (!textGenerator) {
		console.error('❌ AI model failed to load - cannot process command');
		throw new Error('AI model not available. Please refresh the page.');
	}
	
	try {
		// GPT-2 style prompt with examples
		const prompt = `Convert commands to JSON:

Command: "draw red circle"
JSON: {"action":"draw","shape":"circle","color":"red","position":{"x":400,"y":300},"size":80}

Command: "draw blue rectangle with 50 size"  
JSON: {"action":"draw","shape":"rectangle","color":"blue","position":{"x":400,"y":300},"size":50}

Command: "draw yellow triangle at top right"
JSON: {"action":"draw","shape":"triangle","color":"yellow","position":{"x":600,"y":150},"size":80}

Command: "draw green circle with 120 size at bottom left"
JSON: {"action":"draw","shape":"circle","color":"green","position":{"x":200,"y":450},"size":120}

Command: "brighten image by 25"
JSON: {"action":"adjust","type":"brightness","value":25}

Command: "darken image by 15"
JSON: {"action":"adjust","type":"brightness","value":-15}

Command: "increase contrast by 30"
JSON: {"action":"adjust","type":"contrast","value":30}

Command: "draw orange square in center"
JSON: {"action":"draw","shape":"square","color":"orange","position":{"x":400,"y":300},"size":80}

Command: "${command}"
JSON:`;
		
		console.log('🤖 Sending GPT-2 prompt:', prompt);
		
		// GPT-2 generation parameters
		const result = await textGenerator(prompt, {
			max_new_tokens: 100,
			do_sample: true,
			temperature: 0.3,
			top_p: 0.9,
			pad_token_id: 50256,
		});
		
		const generatedText = result[0].generated_text;
		console.log('🎯 AI Generated:', generatedText);
		console.log('🎯 AI Generated:', result);
		
		// Extract JSON from GPT-2 output
		// GPT-2 returns the full text, so find the last JSON object
		const lines = generatedText.split('\n');
		let jsonText = '';
		
		// Look for the line that starts with JSON: and get what follows
		for (let i = lines.length - 1; i >= 0; i--) {
			if (lines[i].includes('JSON:') || lines[i].includes('{')) {
				const jsonMatch = lines[i].match(/\{.*\}/);
				if (jsonMatch) {
					jsonText = jsonMatch[0];
					break;
				}
			}
		}
		
		// If no JSON found in lines, try to find any JSON object in the full text
		if (!jsonText) {
			const jsonMatch = generatedText.match(/\{[^}]*\}/g);
			if (jsonMatch && jsonMatch.length > 0) {
				jsonText = jsonMatch[jsonMatch.length - 1]; // Get the last JSON object
			}
		}
		
		console.log('📝 Extracted JSON:', jsonText);
		
		// Parse the JSON
		const parsedResult = JSON.parse(jsonText);
		console.log('✅ Successfully parsed AI JSON:', parsedResult);
		return parsedResult;
		
	} catch (error) {
		console.error('❌ AI model failed to generate JSON:', error);
		throw new Error(`AI model could not process: "${command}". Please try a simpler command.`);
	}
};


/**
 * Execute command on canvas
 */
export const executeCommand = (canvas, command) => {
	return executeCanvasCommand(canvas, command);
};

/**
 * Get model status
 */
export const getModelStatus = () => {
	return {
		isReady,
		isLoading,
		model: textGenerator ? 'GPT-2 or DistilGPT2' : 'Not loaded',
		type: 'text-generation',
		description: 'GPT-2: Proven reliable AI for JSON generation',
		backend: 'Transformers.js + WebAssembly',
		note: 'NO FALLBACK - GPT-2 must generate valid JSON!'
	};
};
