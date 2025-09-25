import React, { useState } from "react";
import ImageUploader from "./components/ImageUploader";
import CanvasEditor from "./components/CanvasEditor";
import FilterControls from "./components/FilterControls";
import AIControls from "./components/AIControls";
import CommandInput from "./components/CommandInput";
import LoadingSpinner from "./components/LoadingSpinner";

function App() {
	const [currentImage, setCurrentImage] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [loadingText, setLoadingText] = useState("");
	const [toast, setToast] = useState({
		show: false,
		message: "",
		type: "info",
	});

	const showToast = (message, type = "info") => {
		setToast({ show: true, message, type });
		setTimeout(
			() => setToast({ show: false, message: "", type: "info" }),
			4000
		);
	};

	const handleImageLoad = (imageData) => {
		setCurrentImage(imageData);
		showToast("Image loaded successfully!", "success");
	};

	const handleLoadingChange = (loading, text = "Processing...") => {
		setIsLoading(loading);
		setLoadingText(text);
	};

	return (
		<div className="app">
			<header className="app-header">
				<h1>🎨 POC Image Editor</h1>
				<p>React + Canvas + WASM + AI Vision + Natural Language</p>
			</header>

			<main className="app-main">
				{/* Image Upload Section */}
				{!currentImage && (
					<ImageUploader
						onImageLoad={handleImageLoad}
						onError={(error) => showToast(error, "error")}
					/>
				)}

				{/* Canvas Editor */}
				{currentImage && (
					<>
						<CanvasEditor
							imageData={currentImage}
							onError={(error) => showToast(error, "error")}
						/>

						<div className="controls-grid">
							{/* WASM Filter Controls */}
							<FilterControls
								imageData={currentImage}
								onLoadingChange={handleLoadingChange}
								onError={(error) => showToast(error, "error")}
							/>

							{/* AI Background Removal */}
							<AIControls
								imageData={currentImage}
								onLoadingChange={handleLoadingChange}
								onSuccess={(message) => showToast(message, "success")}
								onError={(error) => showToast(error, "error")}
							/>

							{/* Natural Language Commands */}
							<CommandInput
								imageData={currentImage}
								onLoadingChange={handleLoadingChange}
								onSuccess={(message) => showToast(message, "success")}
								onError={(error) => showToast(error, "error")}
							/>
						</div>

						{/* Reset Button */}
						<div className="reset-section">
							<button
								className="reset-button"
								onClick={() => {
									setCurrentImage(null);
									showToast("Ready for new image", "info");
								}}
							>
								Load New Image
							</button>
						</div>
					</>
				)}

				{/* Global Loading Overlay */}
				{isLoading && <LoadingSpinner text={loadingText} />}

				{/* Toast Notifications */}
				{toast.show && (
					<div className={`toast toast-${toast.type}`}>{toast.message}</div>
				)}
			</main>
		</div>
	);
}

export default App;
