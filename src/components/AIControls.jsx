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
			<h3>AI Background Removal</h3>

			<div className="ai-section">
				<div className="api-status">
					{accountInfo ? (
						<div className="service-info">
							<div className="service-header">
								<h4>Hugging Face RMBG-1.4</h4>
								<span className="service-badge">Active</span>
							</div>
							<div className="service-details">
								<div className="detail-item">
									<span className="detail-label">API Credits</span>
									<span className="detail-value">{accountInfo?.data?.attributes?.api?.free_calls || 0}</span>
								</div>
								<div className="detail-item">
									<span className="detail-label">Provider</span>
									<span className="detail-value">{accountInfo?.provider || 'Hugging Face'}</span>
								</div>
							</div>
						</div>
					) : (
						<div className="service-loading">
							<span className="spinner-small"></span>
							<span>Loading service info...</span>
						</div>
					)}
				</div>

				<button
					className="btn btn-primary btn--large"
					onClick={handleRemoveBackground}
					disabled={isProcessing || !imageData}
				>
					{isProcessing ? "Processing..." : "Remove Background"}
				</button>

				<div className="ai-info">
					<h4>Process Overview</h4>
					<ul className="process-list">
						<li>Analyzes image content using AI</li>
						<li>Identifies and segments foreground objects</li>
						<li>Removes background with high precision</li>
						<li>Returns result as transparent PNG</li>
					</ul>
				</div>
			</div>
		</div>
	);
};

export default AIControls;
