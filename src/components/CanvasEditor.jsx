import React, { useEffect, useRef, useState, useCallback } from "react";
import BrushSelectionService from "../services/brushSelectionService";
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
	const [canvasHistory, setCanvasHistory] = useState([]);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const [brushSize, setBrushSize] = useState(10);
	const [hasSelection, setHasSelection] = useState(false);
	const [isBrushActive, setIsBrushActive] = useState(false);
	const [currentTool, setCurrentTool] = useState('brush'); // 'brush', 'hand'
	const [selectionMode, setSelectionMode] = useState(true);

	// Service instances
	const brushSelectionServiceRef = useRef(null);
	const maskServiceRef = useRef(null);
	const exportServiceRef = useRef(null);

	/**
	 * Saves current canvas state to history
	 * @param {HTMLCanvasElement} canvas - Canvas to save
	 */
	const saveToHistory = useCallback((canvas) => {
		const imageDataUrl = canvas.toDataURL();
		setCanvasHistory((prev) => [...prev, imageDataUrl]);
		setHistoryIndex((prev) => prev + 1);
	}, []); // Empty dependency array to prevent re-creation

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
			maskServiceRef.current = new MaskService(ctx, imageData.width, imageData.height);
			exportServiceRef.current = new ExportService(ctx, imageData.width, imageData.height);

			// Save initial state to history
			saveToHistory(canvas);

			// Set initial brush size
			brushSelectionServiceRef.current.setBrushSize(brushSize);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [imageData]); // Only re-run when imageData changes

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
	 * Handles mouse down event for brush selection
	 * @param {MouseEvent} event - Mouse down event
	 */
	const handleMouseDown = useCallback((event) => {
		if (currentTool !== 'brush' || !selectionMode || !brushSelectionServiceRef.current) {
			return;
		}

		const { x, y } = getMousePos(event);
		setIsBrushActive(true);

		try {
			brushSelectionServiceRef.current.startSelection(x, y);
			setHasSelection(true);
		} catch (error) {
			onError?.(`Brush selection error: ${error.message}`);
		}
	}, [currentTool, selectionMode, getMousePos, onError]);

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
		if (!brushSelectionServiceRef.current) return;

		try {
			brushSelectionServiceRef.current.clearMask();
			setHasSelection(false);
		} catch (error) {
			onError?.(`Clear selection error: ${error.message}`);
		}
	}, [onError]);

	/**
	 * Deletes selected area
	 */
	const handleDeleteSelection = useCallback(() => {
		if (!brushSelectionServiceRef.current || !maskServiceRef.current) return;

		try {
			const mask = brushSelectionServiceRef.current.getSelectionMask();
			if (!mask) {
				onError?.('No selection to delete');
				return;
			}

			const success = maskServiceRef.current.deleteSelectedArea(mask, 'transparent');
			if (success) {
				saveToHistory(canvasRef.current);
				setHasSelection(false);
			}
		} catch (error) {
			onError?.(`Delete selection error: ${error.message}`);
		}
	}, [onError, saveToHistory]);

	/**
	 * Inverts current selection
	 */
	const handleInvertSelection = useCallback(() => {
		if (!brushSelectionServiceRef.current || !maskServiceRef.current) return;

		try {
			const mask = brushSelectionServiceRef.current.getSelectionMask();
			if (!mask) {
				onError?.('No selection to invert');
				return;
			}

			const invertedMask = maskServiceRef.current.invertSelection(mask);
			// Update the brush selection service with the inverted mask
			const invertedContext = invertedMask.getContext('2d');
			brushSelectionServiceRef.current.maskContext.clearRect(0, 0, imageData.width, imageData.height);
			brushSelectionServiceRef.current.maskContext.drawImage(invertedMask, 0, 0);
			brushSelectionServiceRef.current.selectionMask = invertedMask;

		} catch (error) {
			onError?.(`Invert selection error: ${error.message}`);
		}
	}, [onError, imageData]);

	/**
	 * Exports selection as specified format
	 * @param {string} format - Export format ('png' or 'jpeg')
	 */
	const handleExportSelection = useCallback((format) => {
		if (!brushSelectionServiceRef.current || !exportServiceRef.current) {
			return;
		}

		if (!hasSelection) {
			onError?.('No selection to export');
			return;
		}

		try {
			const mask = brushSelectionServiceRef.current.getSelectionMask();

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
	 * Legacy download function for backward compatibility
	 */
	const downloadImage = useCallback(() => {
		handleExportCanvas('png');
	}, [handleExportCanvas]);

	/**
	 * Exposes canvas methods for other components
	 */
	useEffect(() => {
		if (canvasRef.current) {
			window.currentCanvas = canvasRef.current;
			window.saveCanvasState = () => saveToHistory(canvasRef.current);
		}
	}, [saveToHistory]);

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
							opacity: selectionMode && (hasSelection || isBrushActive) ? 1 : 0,
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
					onBrushSizeChange={handleBrushSizeChange}
					onClearSelection={handleClearSelection}
					onDeleteSelection={handleDeleteSelection}
					onInvertSelection={handleInvertSelection}
					onExportSelection={handleExportSelection}
					onExportCanvas={handleExportCanvas}
					onSelectionModeChange={handleSelectionModeChange}
					disabled={!imageData}
				/>
			</div>
		</div>
	);
};

export default CanvasEditor;
