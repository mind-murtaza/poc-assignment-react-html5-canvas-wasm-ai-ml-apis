import React, { useState, useEffect } from "react";
import {
	removeBackground,
	applyBackgroundRemovedImage,
	getAccountInfo,
} from "../services/removeBgApi";

const AIControls = ({ imageData, onLoadingChange, onSuccess, onError }) => {
	const [accountInfo, setAccountInfo] = useState(null);
	const [isProcessing, setIsProcessing] = useState(false);

	// Check API status on component mount
	useEffect(() => {
		checkApiStatus();
	}, []);

	const checkApiStatus = async () => {
		try {
			const info = await getAccountInfo();
			setAccountInfo(info);
		} catch (error) {
			// Don't show error for missing API key, just disable the feature
			setAccountInfo(null);
		}
	};

	const handleRemoveBackground = async () => {
		if (!window.currentCanvas) {
			onError("No image loaded");
			return;
		}

		if (!accountInfo) {
			onError(
				"Remove.bg API not configured. Please add your API key to .env file."
			);
			return;
		}

		setIsProcessing(true);
		onLoadingChange(true, "Removing background with AI...");

		try {
			const canvas = window.currentCanvas;

			// Call Remove.bg API
			const processedBlob = await removeBackground(canvas);

			// Apply the processed image back to canvas
			await applyBackgroundRemovedImage(canvas, processedBlob);

			// Save state for undo/redo
			if (window.saveCanvasState) {
				window.saveCanvasState();
			}

			onSuccess("Background removed successfully!");

			// Update account info to show remaining credits
			await checkApiStatus();
		} catch (error) {
			console.error("Background removal error:", error);
			onError(error.message);
		} finally {
			setIsProcessing(false);
			onLoadingChange(false);
		}
	};

	const isApiConfigured = accountInfo !== null;
	const hasCredits = 
		accountInfo?.data?.attributes?.api?.free_calls > 0 || 
		accountInfo?.data?.attributes?.credits?.total > 0;

	return (
		<div className="control-group">
			<h3>🤖 AI Vision</h3>

			<div className="ai-section">
				<div className="api-status">
					{!isApiConfigured ? (
						<div className="status-warning">
							<p>⚠️ Remove.bg API not configured</p>
							<small>Add VITE_REMOVEBG_API_KEY to your .env file</small>
						</div>
					) : (
						<div className="status-success">
							<p>✅ API Connected</p>
							{accountInfo && (
								<small>
									Credits: {accountInfo.data?.attributes?.api?.free_calls || 0} free calls, 
									{accountInfo.data?.attributes?.credits?.total || 0} total credits
								</small>
							)}
						</div>
					)}
				</div>

				<button
					className="btn btn-primary"
					onClick={handleRemoveBackground}
					disabled={
						!isApiConfigured || !hasCredits || isProcessing || !imageData
					}
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
