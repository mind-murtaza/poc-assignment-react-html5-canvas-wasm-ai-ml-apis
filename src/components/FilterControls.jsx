import React, { useState, useEffect } from "react";
import { useOpenCV } from "../hooks/useOpenCV";

const FilterControls = ({ imageData, onLoadingChange, onError }) => {
	const [selectedFilter, setSelectedFilter] = useState("none");
	const [intensity, setIntensity] = useState(5);
	const [originalImageData, setOriginalImageData] = useState(null);
	const { isReady, error, applyGaussianBlur, applySobelEdges } = useOpenCV();

	// Store original image data when component mounts
	useEffect(() => {
		if (imageData && window.currentCanvas) {
			const canvas = window.currentCanvas;
			const ctx = canvas.getContext("2d");
			setOriginalImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
		}
	}, [imageData]);

	// Apply filter when selection or intensity changes
	useEffect(() => {
		if (selectedFilter !== "none" && originalImageData && isReady) {
			applyFilter();
		} else if (selectedFilter === "none" && originalImageData) {
			restoreOriginalImage();
		}
	}, [selectedFilter, intensity, isReady]);

	const restoreOriginalImage = () => {
		if (!originalImageData || !window.currentCanvas) return;

		const canvas = window.currentCanvas;
		const ctx = canvas.getContext("2d");
		ctx.putImageData(originalImageData, 0, 0);
	};

	const applyFilter = async () => {
		if (!window.currentCanvas || !isReady) {
			onError("Canvas or OpenCV not ready");
			return;
		}

		try {
			onLoadingChange(true, `Applying ${selectedFilter} filter...`);

			// Small delay to show loading state
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Restore original image first
			restoreOriginalImage();

			const canvas = window.currentCanvas;

			// Apply the selected filter
			switch (selectedFilter) {
				case "blur":
					applyGaussianBlur(canvas, intensity);
					break;
				case "edge":
					applySobelEdges(canvas, intensity);
					break;
				default:
					break;
			}

			// Save state for undo/redo
			if (window.saveCanvasState) {
				window.saveCanvasState();
			}
		} catch (err) {
			console.error("Filter application failed:", err);
			onError(`Failed to apply ${selectedFilter} filter: ${err.message}`);
		} finally {
			onLoadingChange(false);
		}
	};

	const handleFilterChange = (filterType) => {
		setSelectedFilter(filterType);
	};

	const handleIntensityChange = (newIntensity) => {
		setIntensity(newIntensity);
	};

	if (error) {
		return (
			<div className="control-group">
				<h3>🔧 WASM Filters</h3>
				<div className="error-message">
					<p>⚠️ OpenCV Error: {error}</p>
					<button
						className="btn btn-secondary"
						onClick={() => window.location.reload()}
					>
						Reload Page
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="control-group">
			<h3>🔧 WASM Filters</h3>

			{!isReady && (
				<div className="opencv-loading">
					<p>🔄 Loading OpenCV.js...</p>
					<div className="progress-bar">
						<div className="progress-fill"></div>
					</div>
				</div>
			)}

			<div className="filter-options">
				<div className="radio-group">
					<label className="radio-option">
						<input
							type="radio"
							name="filter"
							value="none"
							checked={selectedFilter === "none"}
							onChange={() => handleFilterChange("none")}
						/>
						Original
					</label>

					<label className="radio-option">
						<input
							type="radio"
							name="filter"
							value="blur"
							checked={selectedFilter === "blur"}
							onChange={() => handleFilterChange("blur")}
							disabled={!isReady}
						/>
						Gaussian Blur
					</label>

					<label className="radio-option">
						<input
							type="radio"
							name="filter"
							value="edge"
							checked={selectedFilter === "edge"}
							onChange={() => handleFilterChange("edge")}
							disabled={!isReady}
						/>
						Edge Detection
					</label>
				</div>

				{selectedFilter !== "none" && (
					<div className="range-group">
						<label className="form-label">Intensity:</label>
						<input
							type="range"
							className="range-slider"
							min="1"
							max="20"
							value={intensity}
							onChange={(e) => handleIntensityChange(parseInt(e.target.value))}
							disabled={!isReady}
						/>
						<span className="range-value">
							{intensity}
							{selectedFilter === 'edge' && (
								<small style={{display: 'block', fontSize: '0.7em', color: '#666'}}>
									(kernel: {[1, 3, 5, 7][Math.min(Math.floor(((intensity - 1) / 19) * 3), 3)]})
								</small>
							)}
						</span>
					</div>
				)}

				{isReady && (
					<div className="filter-info">
						<small>✅ OpenCV.js loaded and ready</small>
					</div>
				)}
			</div>
		</div>
	);
};

export default FilterControls;
