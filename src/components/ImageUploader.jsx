import React, { useState, useRef } from "react";

const ImageUploader = ({ onImageLoad, onError }) => {
	const [isDragOver, setIsDragOver] = useState(false);
	const fileInputRef = useRef(null);

	const handleDragOver = (e) => {
		e.preventDefault();
		setIsDragOver(true);
	};

	const handleDragLeave = (e) => {
		e.preventDefault();
		setIsDragOver(false);
	};

	const handleDrop = (e) => {
		e.preventDefault();
		setIsDragOver(false);

		const files = e.dataTransfer.files;
		if (files.length > 0) {
			handleFile(files[0]);
		}
	};

	const handleFileSelect = (e) => {
		const files = e.target.files;
		if (files.length > 0) {
			handleFile(files[0]);
		}
	};

	const handleFile = (file) => {
		// Validate file type
		if (!file.type.startsWith("image/")) {
			onError("Please select a valid image file");
			return;
		}

		// Validate file size (max 10MB for Remove.bg compatibility)
		if (file.size > 10 * 1024 * 1024) {
			onError("Image size must be less than 10MB");
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				// Create canvas to get image data
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");

				// Set canvas size to fit image while maintaining aspect ratio
				const maxWidth = 800;
				const maxHeight = 600;
				let { width, height } = img;

				if (width > maxWidth || height > maxHeight) {
					const ratio = Math.min(maxWidth / width, maxHeight / height);
					width *= ratio;
					height *= ratio;
				}

				canvas.width = width;
				canvas.height = height;

				// Draw image on canvas
				ctx.drawImage(img, 0, 0, width, height);

				// Pass image data to parent
				onImageLoad({
					canvas,
					ctx,
					originalImage: img,
					width,
					height,
					fileName: file.name,
				});
			};

			img.onerror = () => {
				onError("Failed to load image. Please try another file.");
			};

			img.src = e.target.result;
		};

		reader.onerror = () => {
			onError("Failed to read file. Please try again.");
		};

		reader.readAsDataURL(file);
	};

	const handleClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div className="upload-section">
			<div
				className={`drop-zone ${isDragOver ? "drag-over" : ""}`}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={handleClick}
			>
				<div className="drop-content">
					<div className="upload-icon">
						<svg
							width="64"
							height="64"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
						>
							<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
							<circle cx="12" cy="13" r="3"></circle>
						</svg>
					</div>
					<h3>Upload Your Image</h3>
					<p>
						Drop an image here or{" "}
						<span className="upload-link">browse files</span>
					</p>
					<small>Supports JPG, PNG, GIF up to 10MB</small>
				</div>

				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={handleFileSelect}
					style={{ display: "none" }}
				/>
			</div>
		</div>
	);
};

export default ImageUploader;