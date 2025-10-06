import React, { useEffect, useRef, useState, useCallback } from "react";
import BrushSelectionService from "../services/brushSelectionService";
import MagicWandService from "../services/magicWandService";
import MaskService from "../services/maskService";
import ExportService from "../services/exportService";
import BrushControls from "./BrushControls";

/**
 * CanvasEditor component with brush selection functionality
 * Supports brush-based selection, mask operations, and export capabilities
 */
const CanvasEditor = ({ imageData, onError }) => {
	const canvasRef = useRef(null);
	const overlayCanvasRef = useRef(null);
	const [brushSize, setBrushSize] = useState(10);
	const [hasSelection, setHasSelection] = useState(false);
	const [isBrushActive, setIsBrushActive] = useState(false);
	const [selectionMode, setSelectionMode] = useState(true);
	const [currentTool, setCurrentTool] = useState('brush'); // 'brush', 'magicWand'
	const [magicWandTolerance, setMagicWandTolerance] = useState(30);

	// Service instances
	const brushSelectionServiceRef = useRef(null);
	const magicWandServiceRef = useRef(null);
	const maskServiceRef = useRef(null);
	const exportServiceRef = useRef(null);


	/**
	 * Initializes canvas and services when image data is available
	 */
	useEffect(() => {
		if (imageData && canvasRef.current && overlayCanvasRef.current) {
			const canvas = canvasRef.current;
			const overlayCanvas = overlayCanvasRef.current;
			const ctx = canvas.getContext("2d");
			const overlayCtx = overlayCanvas.getContext("2d");

			// Set canvas dimensions
			canvas.width = imageData.width;
			canvas.height = imageData.height;
			overlayCanvas.width = imageData.width;
			overlayCanvas.height = imageData.height;

			// Draw the image
			ctx.drawImage(
				imageData.originalImage,
				0,
				0,
				imageData.width,
				imageData.height
			);

			// Initialize services
			brushSelectionServiceRef.current = new BrushSelectionService(overlayCtx, imageData.width, imageData.height);
			magicWandServiceRef.current = new MagicWandService(ctx, overlayCtx, imageData.width, imageData.height);
			maskServiceRef.current = new MaskService(ctx, imageData.width, imageData.height);
			exportServiceRef.current = new ExportService(ctx, imageData.width, imageData.height);

			// Set initial brush size
			brushSelectionServiceRef.current.setBrushSize(brushSize);

			// Set initial magic wand tolerance
			if (magicWandServiceRef.current) {
				magicWandServiceRef.current.setTolerance(magicWandTolerance);
			}

			// Expose canvas reference for other components (OpenCV, AI, etc.)
			window.currentCanvas = canvas;
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [imageData, brushSize, magicWandTolerance]); // Re-run when image, brush size, or tolerance changes

	/**
	 * Updates brush size in service when it changes
	 */
	useEffect(() => {
		if (brushSelectionServiceRef.current) {
			try {
				brushSelectionServiceRef.current.setBrushSize(brushSize);
			} catch (error) {
				onError?.(`Brush size error: ${error.message}`);
			}
		}
	}, [brushSize, onError]);

	/**
	 * Updates magic wand tolerance in service when it changes
	 */
	useEffect(() => {
		if (magicWandServiceRef.current) {
			try {
				magicWandServiceRef.current.setTolerance(magicWandTolerance);
			} catch (error) {
				onError?.(`Magic wand tolerance error: ${error.message}`);
			}
		}
	}, [magicWandTolerance, onError]);


	/**
	 * Gets mouse position relative to canvas
	 * @param {MouseEvent} event - Mouse event
	 * @returns {Object} X, Y coordinates relative to canvas
	 */
	const getMousePos = useCallback((event) => {
		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		return {
			x: (event.clientX - rect.left) * scaleX,
			y: (event.clientY - rect.top) * scaleY
		};
	}, []);

	/**
	 * Handles mouse down event for brush/magic wand selection
	 * @param {MouseEvent} event - Mouse down event
	 */
	const handleMouseDown = useCallback((event) => {
		if (!selectionMode) {
			return;
		}

		const { x, y } = getMousePos(event);
		const isShiftClick = event.shiftKey;

		try {
			if (currentTool === 'magicWand' && magicWandServiceRef.current) {
				// Magic wand selection
				const success = magicWandServiceRef.current.performMagicWand(x, y, isShiftClick);
				if (success) {
					setHasSelection(true);
				}
			} else if (currentTool === 'brush' && brushSelectionServiceRef.current) {
				// Brush selection
				setIsBrushActive(true);
				brushSelectionServiceRef.current.startSelection(x, y);
				setHasSelection(true);
			}
		} catch (error) {
			onError?.(`Selection error: ${error.message}`);
		}
	}, [selectionMode, currentTool, getMousePos, onError]);

	/**
	 * Handles mouse move event for brush selection
	 * @param {MouseEvent} event - Mouse move event
	 */
	const handleMouseMove = useCallback((event) => {
		if (currentTool !== 'brush' || !isBrushActive || !selectionMode || !brushSelectionServiceRef.current) return;

		const { x, y } = getMousePos(event);

		try {
			brushSelectionServiceRef.current.continueSelection(x, y);
		} catch (error) {
			onError?.(`Brush selection error: ${error.message}`);
		}
	}, [currentTool, isBrushActive, selectionMode, getMousePos, onError]);

	/**
	 * Handles mouse up event for brush selection
	 * @param {MouseEvent} event - Mouse up event
	 */
	const handleMouseUp = useCallback((event) => {
		if (currentTool !== 'brush' || !selectionMode || !brushSelectionServiceRef.current) return;

		setIsBrushActive(false);

		try {
			brushSelectionServiceRef.current.endSelection();
		} catch (error) {
			onError?.(`Brush selection error: ${error.message}`);
		}
	}, [currentTool, selectionMode, onError]);

	/**
	 * Handles brush size change from controls
	 * @param {number} newSize - New brush size
	 */
	const handleBrushSizeChange = useCallback((newSize) => {
		setBrushSize(newSize);
	}, []);

	/**
	 * Clears current selection
	 */
	const handleClearSelection = useCallback(() => {
		try {
			// Clear both brush and magic wand selections
			if (brushSelectionServiceRef.current) {
				brushSelectionServiceRef.current.clearMask();
			}
			if (magicWandServiceRef.current) {
				magicWandServiceRef.current.clearMask();
			}
			setHasSelection(false);
			setIsBrushActive(false);
		} catch (error) {
			onError?.(`Clear selection error: ${error.message}`);
		}
	}, [onError]);

	/**
	 * Deletes selected area
	 */
	const handleDeleteSelection = useCallback(() => {
		if (!maskServiceRef.current) return;

		try {
			let mask = null;

			// Try to get mask from brush service first
			if (brushSelectionServiceRef.current) {
				mask = brushSelectionServiceRef.current.getSelectionMask();
			}

			// If no brush selection, try magic wand
			if (!mask && magicWandServiceRef.current) {
				mask = magicWandServiceRef.current.getSelectionMask();
			}

			if (!mask) {
				onError?.('No selection to delete');
				return;
			}

			const success = maskServiceRef.current.deleteSelectedArea(mask, 'transparent');
			if (success) {
				setHasSelection(false);
			}
		} catch (error) {
			onError?.(`Delete selection error: ${error.message}`);
		}
	}, [onError]);

	/**
	 * Inverts current selection
	 */
	const handleInvertSelection = useCallback(() => {
		if (!maskServiceRef.current) return;

		try {
			let mask = null;
			let targetService = null;

			// Try to get mask from brush service first
			if (brushSelectionServiceRef.current) {
				mask = brushSelectionServiceRef.current.getSelectionMask();
				targetService = brushSelectionServiceRef.current;
			}

			// If no brush selection, try magic wand
			if (!mask && magicWandServiceRef.current) {
				mask = magicWandServiceRef.current.getSelectionMask();
				targetService = magicWandServiceRef.current;
			}

			if (!mask) {
				onError?.('No selection to invert');
				return;
			}

			const invertedMask = maskServiceRef.current.invertSelection(mask);

			// Update the appropriate service with the inverted mask
			if (targetService) {
				const invertedContext = invertedMask.getContext('2d');
				targetService.maskContext.clearRect(0, 0, imageData.width, imageData.height);
				targetService.maskContext.drawImage(invertedMask, 0, 0);
				targetService.selectionMask = invertedMask;
			}

		} catch (error) {
			onError?.(`Invert selection error: ${error.message}`);
		}
	}, [onError, imageData]);

	/**
	 * Exports selection as specified format
	 * @param {string} format - Export format ('png' or 'jpeg')
	 */
	const handleExportSelection = useCallback((format) => {
		if (!exportServiceRef.current) {
			return;
		}

		if (!hasSelection) {
			onError?.('No selection to export');
			return;
		}

		try {
			let mask = null;

			// Try to get mask from brush service first
			if (brushSelectionServiceRef.current) {
				mask = brushSelectionServiceRef.current.getSelectionMask();
			}

			// If no brush selection, try magic wand
			if (!mask && magicWandServiceRef.current) {
				mask = magicWandServiceRef.current.getSelectionMask();
			}

			if (!mask) {
				onError?.('No selection to export');
				return;
			}

			const filename = `selection-${imageData.fileName || 'image'}`;
			exportServiceRef.current.exportAndDownloadSelection(mask, format, filename);
		} catch (error) {
			onError?.(`Export selection error: ${error.message}`);
		}
	}, [onError, imageData, hasSelection]);

	/**
	 * Exports entire canvas as specified format
	 * @param {string} format - Export format ('png' or 'jpeg')
	 */
	const handleExportCanvas = useCallback((format) => {
		if (!exportServiceRef.current) return;

		try {
			const filename = `canvas-${imageData.fileName || 'image'}`;
			exportServiceRef.current.exportAndDownloadCanvas(format, filename);
		} catch (error) {
			onError?.(`Export canvas error: ${error.message}`);
		}
	}, [onError, imageData]);

	/**
	 * Handles copy selection to clipboard
	 */
	const handleCopySelection = useCallback(async () => {
		if (!exportServiceRef.current) {
			onError?.('Copy service not available');
			return;
		}

		if (!hasSelection) {
			onError?.('No selection to copy');
			return;
		}

		try {
			let mask = null;

			// Try to get mask from brush service first
			if (brushSelectionServiceRef.current) {
				mask = brushSelectionServiceRef.current.getSelectionMask();
			}

			// If no brush selection, try magic wand
			if (!mask && magicWandServiceRef.current) {
				mask = magicWandServiceRef.current.getSelectionMask();
			}

			if (!mask) {
				onError?.('No selection mask found');
				return;
			}

			// Export the selection as a data URL
			const dataUrl = exportServiceRef.current.exportSelection(mask, 'png');

			// Convert data URL to blob
			const response = await fetch(dataUrl);
			const blob = await response.blob();

			// Copy to clipboard using modern API
			try {
				if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
					// For image/png blob
					const clipboardItem = new window.ClipboardItem({ 'image/png': blob });
					await navigator.clipboard.write([clipboardItem]);
					// Show success feedback to user
					alert('✅ Selection copied to clipboard! You can now paste it anywhere.');
				} else {
					throw new Error('Clipboard API not supported');
				}
			} catch (clipboardError) {
				// Fallback for older browsers - download the image
				const link = document.createElement('a');
				link.href = dataUrl;
				link.download = 'selection.png';
				link.style.display = 'none';
				document.body.appendChild(link);
		link.click();
				document.body.removeChild(link);
				alert('✅ Selection downloaded as selection.png');
			}
		} catch (error) {
			onError?.(`Copy selection error: ${error.message}`);
		}
	}, [onError, hasSelection]);

	/**
	 * Handles selection mode change from controls
	 * @param {boolean} mode - New selection mode state
	 */
	const handleSelectionModeChange = useCallback((mode) => {
		setSelectionMode(mode);
		// Clear selection if turning off selection mode
		if (!mode) {
			handleClearSelection();
		}
	}, []);

	/**
	 * Handles tool change (brush/magic wand)
	 * @param {string} tool - Tool type ('brush' or 'magicWand')
	 */
	const handleToolChange = useCallback((tool) => {
		setCurrentTool(tool);
		setIsBrushActive(false);
	}, []);

	/**
	 * Handles magic wand tolerance change
	 * @param {number} tolerance - New tolerance value
	 */
	const handleMagicWandToleranceChange = useCallback((tolerance) => {
		setMagicWandTolerance(tolerance);
		if (magicWandServiceRef.current) {
			magicWandServiceRef.current.setTolerance(tolerance);
		}
	}, []);

	/**
	 * Legacy download function for backward compatibility
	 */
	const downloadImage = useCallback(() => {
		handleExportCanvas('png');
	}, [handleExportCanvas]);


	return (
		<div className="canvas-editor">
			<div className="canvas-toolbar">
				<div className="canvas-info">
					<span>
						📐 {imageData.width} × {imageData.height}px
					</span>
					<span>📁 {imageData.fileName}</span>
					{hasSelection && <span className="selection-indicator">✓ Selection Active</span>}
				</div>

				<div className="canvas-actions">
					<button
						className="btn btn-primary"
						onClick={downloadImage}
						title="Download Image (PNG)"
					>
						💾 Download
					</button>
				</div>
			</div>

			<div className="canvas-workspace">
			<div className="canvas-container">
					<div style={{ position: 'relative', display: 'inline-block' }}>
				<canvas
					ref={canvasRef}
					className="main-canvas"
					style={{
						maxWidth: "100%",
								maxHeight: "60vh",
						border: "2px solid #e9ecef",
						borderRadius: "8px",
						boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
								display: 'block',
							}}
							onMouseDown={handleMouseDown}
							onMouseMove={handleMouseMove}
							onMouseUp={handleMouseUp}
							onMouseLeave={handleMouseUp}
						/>
						<canvas
							ref={overlayCanvasRef}
							className="overlay-canvas"
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							height: '100%',
							pointerEvents: 'none',
							opacity: selectionMode && (isBrushActive || hasSelection) ? 1 : 0,
							transition: 'opacity 0.3s ease',
							zIndex: 10,
							borderRadius: "8px",
						}}
						/>
					</div>
				</div>

				<BrushControls
					brushSize={brushSize}
					hasSelection={hasSelection}
					selectionMode={selectionMode}
					currentTool={currentTool}
					magicWandTolerance={magicWandTolerance}
					onBrushSizeChange={handleBrushSizeChange}
					onClearSelection={handleClearSelection}
					onDeleteSelection={handleDeleteSelection}
					onInvertSelection={handleInvertSelection}
					onExportSelection={handleExportSelection}
					onExportCanvas={handleExportCanvas}
					onCopySelection={handleCopySelection}
					onSelectionModeChange={handleSelectionModeChange}
					onToolChange={handleToolChange}
					onMagicWandToleranceChange={handleMagicWandToleranceChange}
					disabled={!imageData}
				/>
			</div>
		</div>
	);
};

export default CanvasEditor;
