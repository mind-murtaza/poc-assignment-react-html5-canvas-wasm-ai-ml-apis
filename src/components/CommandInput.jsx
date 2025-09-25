import React, { useState } from "react";
import { parseCommand, executeCommand } from "../services/groqApi";

const CommandInput = ({ imageData, onLoadingChange, onSuccess, onError }) => {
	const [command, setCommand] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [commandHistory, setCommandHistory] = useState([]);

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

	const handleSubmit = async (e) => {
		e.preventDefault();
		await executeNaturalCommand(command.trim());
	};

	const executeNaturalCommand = async (commandText) => {
		if (!commandText) {
			onError("Please enter a command");
			return;
		}

		if (!window.currentCanvas) {
			onError("No image loaded");
			return;
		}

		setIsProcessing(true);
		onLoadingChange(true, "Parsing command with AI...");

		try {
			// Parse command using Groq API
			const parsedCommand = await parseCommand(commandText);

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

	const isApiConfigured =
		import.meta.env.VITE_GROQ_API_KEY &&
		import.meta.env.VITE_GROQ_API_KEY !== "your_groq_api_key_here";

	return (
		<div className="control-group">
			<h3>💬 Natural Language Commands</h3>

			{!isApiConfigured && (
				<div className="status-warning">
					<p>⚠️ Groq API not configured</p>
					<small>Add VITE_GROQ_API_KEY to your .env file</small>
				</div>
			)}

			<form onSubmit={handleSubmit} className="command-form">
				<div className="form-group">
					<label className="form-label">Enter your command:</label>
					<input
						type="text"
						className="form-control"
						value={command}
						onChange={(e) => setCommand(e.target.value)}
						placeholder="Try: 'draw red circle' or 'brighten image 20%'"
						disabled={!isApiConfigured || isProcessing || !imageData}
					/>
				</div>

				<button
					type="submit"
					className="btn btn-success"
					disabled={
						!isApiConfigured || isProcessing || !imageData || !command.trim()
					}
				>
					{isProcessing ? "🤖 Processing..." : "⚡ Execute Command"}
				</button>
			</form>

			<div className="command-examples">
				<h4>Example Commands:</h4>
				<div className="example-buttons">
					{exampleCommands.map((example, index) => (
						<button
							key={index}
							className="example-btn"
							onClick={() => handleExampleClick(example)}
							disabled={!isApiConfigured || isProcessing || !imageData}
						>
							{example}
						</button>
					))}
				</div>
			</div>

			{commandHistory.length > 0 && (
				<div className="command-history">
					<h4>Recent Commands:</h4>
					<div className="history-list">
						{commandHistory.slice(0, 5).map((item, index) => (
							<div key={index} className="history-item">
								<span className="history-command">"{item.command}"</span>
								<button
									className="history-repeat"
									onClick={() => executeNaturalCommand(item.command)}
									disabled={isProcessing || !imageData}
									title="Repeat command"
								>
									🔄
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="command-info">
				<h4>Supported Commands:</h4>
				<ul>
					<li><strong>Draw shapes:</strong> "draw [color] [shape]" or "draw [size] [color] [shape] at [position]"</li>
					<li><strong>Shapes:</strong> circle, rectangle, square, triangle, line</li>
					<li><strong>Colors:</strong> red, blue, green, yellow, purple, black, white, orange, pink</li>
					<li><strong>Positions:</strong> center, top left, top right, bottom left, bottom right</li>
					<li><strong>Sizes:</strong> small, large, or default</li>
					<li><strong>Brightness:</strong> "brighten/darken image [X]%"</li>
					<li><strong>Contrast:</strong> "increase/decrease contrast [X]%"</li>
				</ul>
			</div>
		</div>
	);
};

export default CommandInput;