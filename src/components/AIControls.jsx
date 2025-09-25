import React, { useState, useEffect } from "react";
import {
	removeBackground,
	applyBackgroundRemovedImage,
	getAccountInfo,
} from "../services/huggingFaceBgRemoval";

const AIControls = ({ imageData, onLoadingChange, onSuccess, onError }) => {
	const [isProcessing, setIsProcessing] = useState(false);
	const [accountInfo, setAccountInfo] = useState(null);
	useEffect(() => {
		const fetchAccountInfo = async () => {
			const accountInfo = await getAccountInfo();
			setAccountInfo(accountInfo);
		};
		fetchAccountInfo();
	}, []);
	
	const handleRemoveBackground = async () => {
		if (!window.currentCanvas) {
			onError("No image loaded");
			return;
		}

		setIsProcessing(true);
		onLoadingChange(true, "Removing background with AI...");

		try {
			const canvas = window.currentCanvas;

			// Call Hugging Face RMBG-1.4
			const processedBlob = await removeBackground(canvas);

			// Apply the processed image back to canvas
			await applyBackgroundRemovedImage(canvas, processedBlob);

			// Save state for undo/redo
			if (window.saveCanvasState) {
				window.saveCanvasState();
			}

			onSuccess("Background removed successfully!");

		} catch (error) {
			console.error("Background removal error:", error);
			onError(error.message);
		} finally {
			setIsProcessing(false);
			onLoadingChange(false);
		}
	};

	return (
		<div className="control-group">
			<h3>🤖 Hugging Face RMBG-1.4</h3>

			<div className="ai-section">
				<div className="api-status">
					<div className="status-success">
						<p>✅ Hugging Face RMBG-1.4 Ready</p>
						{accountInfo && (
						<>
							<p>Credits: {accountInfo?.data?.attributes?.api?.free_calls || 0}</p>
							<p>Service: {accountInfo?.service}</p>
							<p>Model: {accountInfo?.model}</p>
							<p>Provider: {accountInfo?.provider}</p>
						</>
					)}
					</div>
				</div>

				<button
					className="btn btn-primary"
					onClick={handleRemoveBackground}
					disabled={isProcessing || !imageData}
				>
					{isProcessing ? "🔄 Processing..." : "✂️ Remove Background"}
				</button>

				<div className="ai-info">
					<h4>How it works:</h4>
					<ul>
						<li>🧠 AI analyzes your image</li>
						<li>🎯 Identifies foreground objects</li>
						<li>✂️ Removes background automatically</li>
						<li>🖼️ Returns transparent PNG</li>
					</ul>
				</div>
			</div>
		</div>
	);
};

export default AIControls;
