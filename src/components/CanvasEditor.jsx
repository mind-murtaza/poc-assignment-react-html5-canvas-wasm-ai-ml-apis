import React, { useEffect, useRef, useState, useCallback } from "react";
import BrushSelectionService from "../services/brushSelectionService";
import MagicWandService from "../services/magicWandService";
import PolygonSelectionService from "../services/polygonSelectionService";
import MaskService from "../services/maskService";
import ExportService from "../services/exportService";
import HistoryService from "../services/historyService";
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
	const [isPolygonActive, setIsPolygonActive] = useState(false);
	const [selectionMode, setSelectionMode] = useState(true);
	const [currentTool, setCurrentTool] = useState('brush'); // 'brush', 'magicWand', 'polygon'
	const [magicWandTolerance, setMagicWandTolerance] = useState(30);
	const [canUndo, setCanUndo] = useState(false);
	const [canRedo, setCanRedo] = useState(false);

	// Service instances
	const brushSelectionServiceRef = useRef(null);
	const magicWandServiceRef = useRef(null);
	const polygonSelectionServiceRef = useRef(null);
	const maskServiceRef = useRef(null);
	const exportServiceRef = useRef(null);
	const historyServiceRef = useRef(null);


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
			polygonSelectionServiceRef.current = new PolygonSelectionService(overlayCtx, imageData.width, imageData.height);
			maskServiceRef.current = new MaskService(ctx, imageData.width, imageData.height);
			exportServiceRef.current = new ExportService(ctx, imageData.width, imageData.height);
			historyServiceRef.current = new HistoryService(50);

			// Set initial brush size
			brushSelectionServiceRef.current.setBrushSize(brushSize);

			// Set initial magic wand tolerance
			if (magicWandServiceRef.current) {
				magicWandServiceRef.current.setTolerance(magicWandTolerance);
			}

			// Save initial state to history
			historyServiceRef.current.saveState(canvas);
			updateHistoryState();

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
	 * Updates the undo/redo state
	 */
	const updateHistoryState = useCallback(() => {
		if (historyServiceRef.current) {
			setCanUndo(historyServiceRef.current.canUndo());
			setCanRedo(historyServiceRef.current.canRedo());
		}
	}, []);

	/**
	 * Saves current canvas state to history
	 */
	const saveToHistory = useCallback(() => {
		if (canvasRef.current && historyServiceRef.current) {
			historyServiceRef.current.saveState(canvasRef.current);
			updateHistoryState();
		}
	}, [updateHistoryState]);


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
	 * Handles mouse down event for brush/magic wand/polygon selection
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
			} else if (currentTool === 'polygon' && polygonSelectionServiceRef.current) {
				// Polygon selection - add point on click
				const pointAdded = polygonSelectionServiceRef.current.addPoint(x, y);
				
				if (pointAdded) {
					// Show overlay as soon as first point is added
					setIsPolygonActive(true);
					
					// Check if polygon is complete
					if (polygonSelectionServiceRef.current.isPolygonComplete()) {
						setHasSelection(true);
						setIsPolygonActive(false); // Polygon drawing is done
						saveToHistory(); // Save to history after completing polygon
					}
				}
			}
		} catch (error) {
			onError?.(`Selection error: ${error.message}`);
		}
	}, [selectionMode, currentTool, getMousePos, onError, saveToHistory]);

	/**
	 * Handles mouse move event for brush and polygon selection
	 * @param {MouseEvent} event - Mouse move event
	 */
	const handleMouseMove = useCallback((event) => {
		const { x, y } = getMousePos(event);

		try {
			if (currentTool === 'brush' && isBrushActive && selectionMode && brushSelectionServiceRef.current) {
				// Brush selection - continue drawing
				brushSelectionServiceRef.current.continueSelection(x, y);
			} else if (currentTool === 'polygon' && selectionMode && polygonSelectionServiceRef.current) {
				// Polygon selection - update preview line
				polygonSelectionServiceRef.current.updateMousePosition(x, y);
			}
		} catch (error) {
			onError?.(`Selection error: ${error.message}`);
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
			// Clear all selection tools
			if (brushSelectionServiceRef.current) {
				brushSelectionServiceRef.current.clearMask();
			}
			if (magicWandServiceRef.current) {
				magicWandServiceRef.current.clearMask();
			}
			if (polygonSelectionServiceRef.current) {
				polygonSelectionServiceRef.current.clearMask();
			}
			setHasSelection(false);
			setIsBrushActive(false);
			setIsPolygonActive(false);
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

			// Try to get mask from active tool
			if (brushSelectionServiceRef.current) {
				mask = brushSelectionServiceRef.current.getSelectionMask();
			}

			if (!mask && magicWandServiceRef.current) {
				mask = magicWandServiceRef.current.getSelectionMask();
			}

			if (!mask && polygonSelectionServiceRef.current) {
				mask = polygonSelectionServiceRef.current.getSelectionMask();
			}

			if (!mask) {
				onError?.('No selection to delete');
				return;
			}

			const success = maskServiceRef.current.deleteSelectedArea(mask, 'transparent');
			if (success) {
				handleClearSelection();
				saveToHistory();
			}
		} catch (error) {
			onError?.(`Delete selection error: ${error.message}`);
		}
	}, [onError, handleClearSelection, saveToHistory]);

	/**
	 * Inverts current selection
	 */
	const handleInvertSelection = useCallback(() => {
		if (!maskServiceRef.current) return;

		try {
			let mask = null;
			let targetService = null;

			// Try to get mask from active tool
			if (brushSelectionServiceRef.current) {
				mask = brushSelectionServiceRef.current.getSelectionMask();
				targetService = brushSelectionServiceRef.current;
			}

			if (!mask && magicWandServiceRef.current) {
				mask = magicWandServiceRef.current.getSelectionMask();
				targetService = magicWandServiceRef.current;
			}

			if (!mask && polygonSelectionServiceRef.current) {
				mask = polygonSelectionServiceRef.current.getSelectionMask();
				targetService = polygonSelectionServiceRef.current;
			}

			if (!mask) {
				onError?.('No selection to invert');
				return;
			}

			const invertedMask = maskServiceRef.current.invertSelection(mask);

			// Update the mask data context
			if (targetService && targetService.maskDataContext) {
				targetService.maskDataContext.clearRect(0, 0, imageData.width, imageData.height);
				targetService.maskDataContext.drawImage(invertedMask, 0, 0);
				targetService.selectionMask = invertedMask;
				
				// Update the overlay visualization for brush and magic wand
				if (targetService.overlayContext || targetService.context) {
					const overlayCtx = targetService.overlayContext || targetService.context;
					overlayCtx.clearRect(0, 0, imageData.width, imageData.height);
					
					// Redraw inverted selection with light red color
					const invertedImageData = targetService.maskDataContext.getImageData(0, 0, imageData.width, imageData.height);
					const overlayImageData = overlayCtx.createImageData(imageData.width, imageData.height);
					
					for (let i = 0; i < invertedImageData.data.length; i += 4) {
						if (invertedImageData.data[i + 3] > 200) { // If selected in mask
							overlayImageData.data[i] = 255;      // R
							overlayImageData.data[i + 1] = 107;  // G (light red)
							overlayImageData.data[i + 2] = 107;  // B (light red)
							overlayImageData.data[i + 3] = 178;  // A (0.7 opacity)
						}
					}
					
					overlayCtx.putImageData(overlayImageData, 0, 0);
				}
			}

		} catch (error) {
			console.error('Invert selection error:', error);
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

			// Try to get mask from active tool
			if (brushSelectionServiceRef.current) {
				mask = brushSelectionServiceRef.current.getSelectionMask();
			}

			if (!mask && magicWandServiceRef.current) {
				mask = magicWandServiceRef.current.getSelectionMask();
			}

			if (!mask && polygonSelectionServiceRef.current) {
				mask = polygonSelectionServiceRef.current.getSelectionMask();
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

			// Try to get mask from active tool
			if (brushSelectionServiceRef.current) {
				mask = brushSelectionServiceRef.current.getSelectionMask();
			}

			if (!mask && magicWandServiceRef.current) {
				mask = magicWandServiceRef.current.getSelectionMask();
			}

			if (!mask && polygonSelectionServiceRef.current) {
				mask = polygonSelectionServiceRef.current.getSelectionMask();
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
				console.warn('Clipboard API failed, using download fallback:', clipboardError);
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
			console.error('Copy selection error:', error);
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
	 * Handles tool change (brush/magic wand/polygon)
	 * @param {string} tool - Tool type ('brush', 'magicWand', or 'polygon')
	 */
	const handleToolChange = useCallback((tool) => {
		// Clear any incomplete polygon when switching tools
		if (currentTool === 'polygon' && tool !== 'polygon' && polygonSelectionServiceRef.current) {
			if (!polygonSelectionServiceRef.current.isPolygonComplete()) {
				polygonSelectionServiceRef.current.clearMask();
			}
		}
		
		setCurrentTool(tool);
		setIsBrushActive(false);
		setIsPolygonActive(false);
	}, [currentTool]);

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
	 * Handles undo operation
	 */
	const handleUndo = useCallback(async () => {
		if (!historyServiceRef.current || !canvasRef.current) return;

		try {
			const success = await historyServiceRef.current.undo(canvasRef.current);
			if (success) {
				handleClearSelection(); // Clear any active selection
				updateHistoryState();
			}
		} catch (error) {
			onError?.(`Undo error: ${error.message}`);
		}
	}, [onError, handleClearSelection, updateHistoryState]);

	/**
	 * Handles redo operation
	 */
	const handleRedo = useCallback(async () => {
		if (!historyServiceRef.current || !canvasRef.current) return;

		try {
			const success = await historyServiceRef.current.redo(canvasRef.current);
			if (success) {
				handleClearSelection(); // Clear any active selection
				updateHistoryState();
			}
		} catch (error) {
			onError?.(`Redo error: ${error.message}`);
		}
	}, [onError, handleClearSelection, updateHistoryState]);

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
							opacity: selectionMode && (isBrushActive || isPolygonActive || hasSelection) ? 1 : 0,
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
					canUndo={canUndo}
					canRedo={canRedo}
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
					onUndo={handleUndo}
					onRedo={handleRedo}
					disabled={!imageData}
				/>
			</div>
		</div>
	);
};

export default CanvasEditor;
