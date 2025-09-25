/**
 * Remove.bg API Service
 * Handles background removal using the Remove.bg API
 */

const REMOVEBG_API_URL =
	import.meta.env.VITE_REMOVEBG_API_URL ||
	"https://api.remove.bg/v1.0/removebg";
const API_KEY = import.meta.env.VITE_REMOVEBG_API_KEY;
const REMOVEBG_DETAILS_URL =
	import.meta.env.VITE_REMOVEBG_DETAILS_URL ||
	"https://api.remove.bg/v1.0/account";

/**
 * Remove background from image using Remove.bg API
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @returns {Promise<Blob>} - Processed image blob
 */
export const removeBackground = async (canvas) => {
	if (!API_KEY || API_KEY === "your_remove_bg_api_key_here") {
		throw new Error(
			"Remove.bg API key not configured. Please add VITE_REMOVEBG_API_KEY to your .env file."
		);
	}

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

		// Validate blob size (Remove.bg has 12MB limit)
		const maxSize = 12 * 1024 * 1024;
		if (blob.size > maxSize) {
			throw new Error(`Image too large: ${Math.round(blob.size / 1024 / 1024)}MB (max: 12MB)`);
		}

		// Create form data
		const formData = new FormData();
		formData.append("image_file", blob, "image.png");
		formData.append("size", "preview"); // Use preview for faster processing

		// Make API request with timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 30000);

		const response = await fetch(REMOVEBG_API_URL, {
			method: "POST",
			headers: {
				"X-Api-Key": API_KEY,
			},
			body: formData,
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			let errorMessage = `API Error: ${response.status}`;
			
			try {
				const errorData = await response.text();
				const jsonError = JSON.parse(errorData);
				errorMessage = jsonError.errors?.[0]?.title || jsonError.error || errorMessage;
			} catch (parseError) {
				// Use default error message if parsing fails
			}
			
			throw new Error(errorMessage);
		}

		// Return the processed image blob
		return await response.blob();
		
	} catch (error) {
		if (error.name === 'AbortError') {
			throw new Error("Request timeout - try with a smaller image");
		}
		
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

		img.onerror = () => {
			URL.revokeObjectURL(img.src);
			reject(new Error("Failed to load processed image"));
		};

		// Create object URL and load image
		try {
			img.src = URL.createObjectURL(imageBlob);
		} catch (error) {
			reject(new Error("Failed to create object URL for processed image"));
		}
	});
};

/**
 * Check Remove.bg API status and account info
 * @returns {Promise<Object>} - Account information
 */
export const getAccountInfo = async () => {
	if (!API_KEY || API_KEY === "your_remove_bg_api_key_here") {
		throw new Error("API key not configured");
	}

	try {
		const response = await fetch(REMOVEBG_DETAILS_URL, {
			headers: {
				"X-Api-Key": API_KEY,
			},
		});

		if (!response.ok) {
			throw new Error(`API Error: ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Account info error:", error);
		throw error;
	}
};
