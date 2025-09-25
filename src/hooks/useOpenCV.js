import { useState, useEffect } from "react";

export const useOpenCV = () => {
	const [isReady, setIsReady] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		const checkOpenCV = () => {
			if (window.cv && window.cv.Mat) {
				setIsReady(true);
				return;
			}

			// Listen for OpenCV ready event
			const handleOpenCVReady = () => {
				if (window.cv && window.cv.Mat) {
					setIsReady(true);
				} else {
					setError("OpenCV failed to initialize");
				}
			};

			window.addEventListener("opencv-ready", handleOpenCVReady);

			// Timeout fallback
			const timeout = setTimeout(() => {
				if (!window.cv) {
					setError("OpenCV failed to load. Please refresh the page.");
				}
			}, 10000);

			return () => {
				window.removeEventListener("opencv-ready", handleOpenCVReady);
				clearTimeout(timeout);
			};
		};

		checkOpenCV();
	}, []);

	/**
	 * Apply Gaussian blur filter
	 * @param {HTMLCanvasElement} canvas
	 * @param {number} intensity - Blur intensity (1-20)
	 */
	const applyGaussianBlur = (canvas, intensity = 5) => {
		if (!isReady || !window.cv) {
			throw new Error("OpenCV not ready");
		}

		const ctx = canvas.getContext("2d");
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		// Create OpenCV Mat from ImageData
		const src = window.cv.matFromImageData(imageData);
		const dst = new window.cv.Mat();

		// Apply Gaussian blur
		const ksize = new window.cv.Size(intensity * 2 + 1, intensity * 2 + 1);
		window.cv.GaussianBlur(src, dst, ksize, 0, 0, window.cv.BORDER_DEFAULT);

		// Convert back to ImageData and draw on canvas
		const outputImageData = new ImageData(
			new Uint8ClampedArray(dst.data),
			dst.cols,
			dst.rows
		);

		ctx.putImageData(outputImageData, 0, 0);

		// Clean up
		src.delete();
		dst.delete();
	};

	/**
	 * Apply Sobel edge detection
	 * @param {HTMLCanvasElement} canvas
	 * @param {number} intensity - Edge intensity (1-20)
	 */
	const applySobelEdges = (canvas, intensity = 5) => {
		if (!isReady || !window.cv) {
			throw new Error("OpenCV not ready");
		}

		const ctx = canvas.getContext("2d");
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		// Create OpenCV Mat from ImageData
		const src = window.cv.matFromImageData(imageData);
		const gray = new window.cv.Mat();
		const sobelX = new window.cv.Mat();
		const sobelY = new window.cv.Mat();
		const sobel = new window.cv.Mat();
		const dst = new window.cv.Mat();

		// Convert to grayscale
		window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);

		// Apply Sobel operators
		// Map intensity (1-20) to valid Sobel kernel sizes (1, 3, 5, 7)
		const validKernelSizes = [1, 3, 5, 7];
		const kernelIndex = Math.floor(((intensity - 1) / 19) * 3); // Map 1-20 to 0-3 index
		const ksize = validKernelSizes[Math.min(kernelIndex, 3)];
		
		window.cv.Sobel(gray, sobelX, window.cv.CV_64F, 1, 0, ksize);
		window.cv.Sobel(gray, sobelY, window.cv.CV_64F, 0, 1, ksize);

		// Combine X and Y gradients
		window.cv.magnitude(sobelX, sobelY, sobel);

		// Convert back to 8-bit and apply threshold
		// Scale the intensity for better visual effect
		const scaleFactor = intensity / 5; // Gives range 0.2 to 4.0
		sobel.convertTo(dst, window.cv.CV_8U, scaleFactor);

		// Convert grayscale back to RGBA
		const rgba = new window.cv.Mat();
		window.cv.cvtColor(dst, rgba, window.cv.COLOR_GRAY2RGBA);

		// Convert back to ImageData and draw on canvas
		const outputImageData = new ImageData(
			new Uint8ClampedArray(rgba.data),
			rgba.cols,
			rgba.rows
		);

		ctx.putImageData(outputImageData, 0, 0);

		// Clean up
		src.delete();
		gray.delete();
		sobelX.delete();
		sobelY.delete();
		sobel.delete();
		dst.delete();
		rgba.delete();
	};

	return {
		isReady,
		error,
		applyGaussianBlur,
		applySobelEdges,
	};
};
