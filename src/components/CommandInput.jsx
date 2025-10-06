import React, { useState, useEffect } from "react";
import { parseCommand, initializeEngine, isEngineReady } from "../services/webLLMService";
import { executeCommand } from "../services/canvasOperations";

const CommandInput = ({ imageData, onLoadingChange, onSuccess, onError }) => {
	const [command, setCommand] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [commandHistory, setCommandHistory] = useState([]);
	const [isModelLoading, setIsModelLoading] = useState(false);
	const [isModelReady, setIsModelReady] = useState(false);
	const [loadingProgress, setLoadingProgress] = useState("");

	const exampleCommands = [
		"draw red circle",
		"draw blue rectangle at top left",
		"draw small green circle",
		"draw large yellow triangle at bottom right",
		"brighten image 20%",
		"darken image 15%",
		"increase contrast 30%",
		"draw orange square in center"
	];

	// Check if model is ready on mount
	useEffect(() => {
		setIsModelReady(isEngineReady());
	}, []);

	// Initialize Web LLM model
	const handleInitializeModel = async () => {
		setIsModelLoading(true);
		setLoadingProgress("Initializing Web LLM...");

		try {
			await initializeEngine((progress) => {
				// Format progress message
				if (progress.text) {
					setLoadingProgress(progress.text);
				} else if (progress.progress) {
					setLoadingProgress(`Loading model: ${Math.round(progress.progress * 100)}%`);
				}
			});

			setIsModelReady(true);
			setLoadingProgress("");
			onSuccess?.("Web LLM model loaded successfully! You can now use AI commands.");
		} catch (error) {
			onError?.(`Failed to load model: ${error.message}`);
			setLoadingProgress("");
		} finally {
			setIsModelLoading(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		await executeNaturalCommand(command.trim());
	};

	const executeNaturalCommand = async (commandText) => {
		if (!commandText) {
			onError("Please enter a command");
			return;
		}

		if (!isModelReady) {
			onError("Please initialize the AI model first");
			return;
		}

		if (!window.currentCanvas) {
			onError("No image loaded");
			return;
		}

		setIsProcessing(true);
		onLoadingChange(true, "Parsing command with AI...");

		try {
			// Parse command using Web LLM
			const parsedCommand = await parseCommand(commandText, (progress) => {
				if (progress.text) {
					onLoadingChange(true, progress.text);
				}
			});

			onLoadingChange(true, "Executing command...");

			// Execute command on canvas
			const canvas = window.currentCanvas;
			executeCommand(canvas, parsedCommand);

			// Save state for undo/redo
			if (window.saveCanvasState) {
				window.saveCanvasState();
			}

			// Add to history
			setCommandHistory((prev) => [
				{ command: commandText, parsedCommand, timestamp: Date.now() },
				...prev.slice(0, 9), // Keep last 10 commands
			]);

			// Clear input and show success
			setCommand("");
			onSuccess(`Command executed: "${commandText}"`);
		} catch (error) {
			onError(error.message);
		} finally {
			setIsProcessing(false);
			onLoadingChange(false);
		}
	};

	const handleExampleClick = (exampleCommand) => {
		setCommand(exampleCommand);
	};

	return (
		<div className="control-group">
			<h3>Natural Language Commands</h3>

			{!isModelReady && !isModelLoading && (
				<div className="llm-status llm-status--inactive">
					<div className="llm-status__content">
						<div className="llm-status__header">
							<span className="llm-status__indicator"></span>
							<h4>AI Model Initialization Required</h4>
						</div>
						<p className="llm-status__description">
							First-time setup downloads ~1.5GB to browser cache (one-time operation)
						</p>
					</div>
					<button
						className="btn btn-primary btn--large"
						onClick={handleInitializeModel}
						disabled={isModelLoading}
					>
						Initialize Model
					</button>
				</div>
			)}

			{isModelLoading && (
				<div className="llm-status llm-status--loading">
					<div className="llm-status__content">
						<div className="llm-status__header">
							<div className="llm-spinner"></div>
							<h4>Initializing AI Model</h4>
						</div>
						<p className="llm-status__progress">{loadingProgress || "Loading model..."}</p>
						<p className="llm-status__description">
							This process may take several minutes. Please do not close this tab.
						</p>
					</div>
				</div>
			)}

			{isModelReady && (
				<div className="llm-status llm-status--ready">
					<div className="llm-status__content">
						<div className="llm-status__header">
							<span className="llm-status__indicator"></span>
							<h4>Model Active</h4>
						</div>
						<p className="llm-status__description">
							Local inference ready • Privacy-first • Offline capable
						</p>
					</div>
				</div>
			)}

			<form onSubmit={handleSubmit} className="command-form">
				<div className="form-group">
					<label className="form-label">Command Input</label>
					<input
						type="text"
						className="form-control"
						value={command}
						onChange={(e) => setCommand(e.target.value)}
						placeholder="e.g., 'draw red circle' or 'brighten image 20%'"
						disabled={!isModelReady || isProcessing || !imageData || isModelLoading}
					/>
				</div>

				<button
					type="submit"
					className="btn btn-primary btn--execute"
					disabled={
						!isModelReady || isProcessing || !imageData || !command.trim() || isModelLoading
					}
				>
					{isProcessing ? "Processing..." : "Execute Command"}
				</button>
			</form>

			<div className="command-examples">
				<h4>Quick Actions</h4>
				<div className="example-buttons">
					{exampleCommands.map((example, index) => (
						<button
							key={index}
							className="btn btn-secondary btn--example"
							onClick={() => handleExampleClick(example)}
							disabled={!isModelReady || isProcessing || !imageData || isModelLoading}
						>
							{example}
						</button>
					))}
				</div>
			</div>

			{commandHistory.length > 0 && (
				<div className="command-history">
					<h4>Command History</h4>
					<div className="history-list">
						{commandHistory.slice(0, 5).map((item, index) => (
							<div key={index} className="history-item">
								<code className="history-command">{item.command}</code>
								<button
									className="btn btn-icon"
									onClick={() => executeNaturalCommand(item.command)}
									disabled={isProcessing || !imageData}
									title="Repeat command"
									aria-label="Repeat command"
								>
									↻
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="command-reference">
				<h4>Command Reference</h4>
				<div className="reference-grid">
					<div className="reference-section">
						<h5>Shapes</h5>
						<p>circle, rectangle, square, triangle, line</p>
					</div>
					<div className="reference-section">
						<h5>Colors</h5>
						<p>red, blue, green, yellow, purple, black, white, orange, pink</p>
					</div>
					<div className="reference-section">
						<h5>Positions</h5>
						<p>center, top left, top right, bottom left, bottom right</p>
					</div>
					<div className="reference-section">
						<h5>Adjustments</h5>
						<p>brighten/darken [X]%, increase/decrease contrast [X]%</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CommandInput;