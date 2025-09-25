/**
 * Hugging Face Background Removal Service
 * Uses RMBG-1.4 model via Gradio client
 */

import { client } from "@gradio/client";

// Hugging Face Space URL for RMBG-1.4
const HF_SPACE_URL = import.meta.env.VITE_HF_SPACE_URL || "https://briaai-bria-rmbg-1-4.hf.space/";

/**
 * Remove background from image using Hugging Face RMBG-1.4 model
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @returns {Promise<Blob>} - Processed image blob
 */
export const removeBackground = async (canvas) => {
	if (!canvas) {
		throw new Error("No canvas provided");
	}

	try {
		// Convert canvas to blob with high quality
		const blob = await new Promise((resolve, reject) => {
			canvas.toBlob((result) => {
				if (result) {
					resolve(result);
				} else {
					reject(new Error("Failed to create blob from canvas"));
				}
			}, "image/png", 1.0);
		});

		// Connect to Hugging Face Space
		const app = await client(HF_SPACE_URL);
		
		// Process image using RMBG-1.4 model
		const result = await app.predict("/predict", [blob]);
		
		// Extract the file information from the response
		if (!result.data || !result.data[0]) {
			throw new Error("Invalid response format from Hugging Face API");
		}
		
		const fileInfo = result.data[0];
		
		// The response contains a file path, we need to download it
		// Gradio typically serves files at /file={path} endpoint
		let imageUrl;
		
		if (fileInfo.url) {
			// If URL is provided, use it directly
			imageUrl = fileInfo.url;
		} else if (fileInfo.path) {
			// Construct the file URL from the path
			imageUrl = `${HF_SPACE_URL}file=${fileInfo.path}`;
		} else {
			throw new Error("No file path or URL in response");
		}
		
		// Fetch the actual image file
		const imageResponse = await fetch(imageUrl);
		
		if (!imageResponse.ok) {
			throw new Error(`Failed to fetch processed image: ${imageResponse.status}`);
		}
		
		// Get the image as blob
		const processedBlob = await imageResponse.blob();
		
		return processedBlob;
		
	} catch (error) {
		console.error("❌ Hugging Face API error:", error);
		throw new Error(`Background removal failed: ${error.message}`);
	}
};

/**
 * Apply the background-removed image to canvas
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {Blob} imageBlob - Processed image blob
 * @returns {Promise<void>}
 */
export const applyBackgroundRemovedImage = (canvas, imageBlob) => {
	return new Promise((resolve, reject) => {
		if (!canvas || !imageBlob) {
			reject(new Error("Missing canvas or image blob"));
			return;
		}

		const ctx = canvas.getContext("2d");
		const img = new Image();

		img.onload = () => {
			
			// Clear canvas with transparent background
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			
			// Draw the background-removed image preserving canvas dimensions
			ctx.globalCompositeOperation = 'source-over';
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			
			// Clean up
			URL.revokeObjectURL(img.src);
			resolve();
		};

		img.onerror = (error) => {
			console.error("❌ Failed to load processed image:", error);
			URL.revokeObjectURL(img.src);
			reject(new Error("Failed to load processed image"));
		};

		// Create object URL and load image
		try {
			const objectURL = URL.createObjectURL(imageBlob);
			img.src = objectURL;
		} catch (error) {
			console.error("❌ Failed to create object URL:", error);
			reject(new Error("Failed to create object URL for processed image"));
		}
	});
};

/**
 * Get Hugging Face service status
 * @returns {Promise<Object>} - Service information
 */
export const getAccountInfo = async () => {
	try {
		// Test connection to Hugging Face Space
		await client(HF_SPACE_URL);
		
		return {
			data: {
				attributes: {
					api: {
						free_calls: "unlimited",
						sizes: "all"
					},
					credits: {
						total: "unlimited"
					}
				}
			},
			service: "Hugging Face Spaces",
			model: "RMBG-1.4",
			provider: "BRIA AI"
		};
	} catch (error) {
		throw new Error("Hugging Face Space not available");
	}
};
