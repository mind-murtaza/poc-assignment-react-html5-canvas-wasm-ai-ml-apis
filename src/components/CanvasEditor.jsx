import React, { useEffect, useRef, useState } from "react";

const CanvasEditor = ({ imageData, onError}) => {
	const canvasRef = useRef(null);
	const [canvasHistory, setCanvasHistory] = useState([]);
	const [historyIndex, setHistoryIndex] = useState(-1);

	useEffect(() => {
		if (imageData && canvasRef.current) {
			const canvas = canvasRef.current;
			const ctx = canvas.getContext("2d");

			// Set canvas dimensions
			canvas.width = imageData.width;
			canvas.height = imageData.height;

			// Draw the image
			ctx.drawImage(
				imageData.originalImage,
				0,
				0,
				imageData.width,
				imageData.height
			);

			// Save initial state to history
			saveToHistory(canvas);
		}
	}, [imageData]);

	const saveToHistory = (canvas) => {
		const imageData = canvas.toDataURL();
		setCanvasHistory((prev) => {
			const newHistory = prev.slice(0, historyIndex + 1);
			newHistory.push(imageData);
			return newHistory;
		});
		setHistoryIndex((prev) => prev + 1);
	};


	const downloadImage = () => {
		const canvas = canvasRef.current;
		const link = document.createElement("a");
		link.download = `edited-${imageData.fileName || "image.png"}`;
		link.href = canvas.toDataURL();
		link.click();
	};

	// Expose canvas methods for other components
	useEffect(() => {
		if (canvasRef.current) {
			window.currentCanvas = canvasRef.current;
			window.saveCanvasState = () => saveToHistory(canvasRef.current);
		}
	}, []);

	return (
		<div className="canvas-section">
			<div className="canvas-toolbar">
				<div className="canvas-info">
					<span>
						📐 {imageData.width} × {imageData.height}px
					</span>
					<span>📁 {imageData.fileName}</span>
				</div>

				<div className="canvas-actions">
					<button
						className="btn btn-primary"
						onClick={downloadImage}
						title="Download Image"
					>
						💾 Download
					</button>
				</div>
			</div>

			<div className="canvas-container">
				<canvas
					ref={canvasRef}
					className="main-canvas"
					style={{
						maxWidth: "100%",
						maxHeight: "70vh",
						border: "2px solid #e9ecef",
						borderRadius: "8px",
						boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
					}}
				/>
			</div>
		</div>
	);
};

export default CanvasEditor;
