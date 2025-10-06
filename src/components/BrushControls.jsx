import React, { useState, useCallback, useEffect } from 'react';

/**
 * BrushControls component provides UI controls for brush-based selection
 * Allows users to select brush size, toggle selection mode, and perform selection operations
 */
const BrushControls = ({
	onBrushSizeChange,
	onClearSelection,
	onDeleteSelection,
	onInvertSelection,
	onExportSelection,
	onExportCanvas,
	onCopySelection,
	onSelectionModeChange,
	onToolChange,
	onMagicWandToleranceChange,
	onUndo,
	onRedo,
	brushSize = 10,
	hasSelection = false,
	disabled = false,
	selectionMode = true,
	currentTool = 'brush',
	magicWandTolerance = 30,
	canUndo = false,
	canRedo = false
}) => {
	const [currentBrushSize, setCurrentBrushSize] = useState(brushSize);
	const [isSelectionMode, setIsSelectionMode] = useState(selectionMode);
	const [currentToolState, setCurrentToolState] = useState(currentTool);
	const [currentTolerance, setCurrentTolerance] = useState(magicWandTolerance);

	// Sync local state with props when they change
	useEffect(() => {
		setIsSelectionMode(selectionMode);
	}, [selectionMode]);

	useEffect(() => {
		setCurrentBrushSize(brushSize);
	}, [brushSize]);

	useEffect(() => {
		setCurrentToolState(currentTool);
	}, [currentTool]);

	useEffect(() => {
		setCurrentTolerance(magicWandTolerance);
	}, [magicWandTolerance]);

	/**
	 * Handles brush size slider change
	 * @param {Event} event - Input change event
	 */
	const handleBrushSizeChange = useCallback((event) => {
		const newSize = parseInt(event.target.value, 10);
		setCurrentBrushSize(newSize);
		onBrushSizeChange?.(newSize);
	}, [onBrushSizeChange]);

	/**
	 * Handles selection mode toggle
	 */
	const handleSelectionModeToggle = useCallback(() => {
		const newMode = !isSelectionMode;
		setIsSelectionMode(newMode);
		onSelectionModeChange?.(newMode);
	}, [isSelectionMode, onSelectionModeChange]);

	/**
	 * Handles clear selection action
	 */
	const handleClearSelection = useCallback(() => {
		onClearSelection?.();
	}, [onClearSelection]);

	/**
	 * Handles delete selection action
	 */
	const handleDeleteSelection = useCallback(() => {
		onDeleteSelection?.();
	}, [onDeleteSelection]);

	/**
	 * Handles invert selection action
	 */
	const handleInvertSelection = useCallback(() => {
		onInvertSelection?.();
	}, [onInvertSelection]);

	/**
	 * Handles export selection action
	 */
	const handleExportSelection = useCallback((format) => {
		onExportSelection?.(format);
	}, [onExportSelection]);

	/**
	 * Handles export canvas action
	 */
	const handleExportCanvas = useCallback((format) => {
		onExportCanvas?.(format);
	}, [onExportCanvas]);

	/**
	 * Handles copy selection action
	 */
	const handleCopySelection = useCallback(() => {
		onCopySelection?.();
	}, [onCopySelection]);

	/**
	 * Handles tool change (brush/magic wand)
	 */
	const handleToolChange = useCallback((tool) => {
		setCurrentToolState(tool);
		onToolChange?.(tool);
	}, [onToolChange]);

	/**
	 * Handles magic wand tolerance change
	 */
	const handleToleranceChange = useCallback((event) => {
		const newTolerance = parseInt(event.target.value, 10);
		setCurrentTolerance(newTolerance);
		onMagicWandToleranceChange?.(newTolerance);
	}, [onMagicWandToleranceChange]);

	/**
	 * Renders brush size preset buttons
	 * @returns {JSX.Element[]} Array of brush size buttons
	 */
	const renderBrushSizePresets = () => {
		const presets = [5, 10, 15, 20, 25, 30];

		return presets.map(size => (
			<button
				key={size}
				type="button"
				className={`brush-size-preset ${currentBrushSize === size ? 'active' : ''}`}
				onClick={() => handleBrushSizeChange({ target: { value: size } })}
				disabled={disabled}
				title={`Set brush size to ${size}px`}
			>
				{size}px
			</button>
		));
	};

	/**
	 * Renders selection operation buttons
	 * @returns {JSX.Element[]} Array of operation buttons
	 */
	const renderSelectionOperations = () => {
		if (!hasSelection) return null;

		return (
			<div className="selection-operations">
				<div className="operation-group">
					<h4>Selection Operations</h4>
					<div className="operation-buttons">
						<button
							type="button"
							className="btn btn-secondary"
							onClick={handleClearSelection}
							disabled={disabled}
							title="Clear selection"
						>
							Clear
						</button>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={handleDeleteSelection}
							disabled={disabled}
							title="Delete selected area"
						>
							Delete
						</button>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={handleInvertSelection}
							disabled={disabled}
							title="Invert selection"
						>
							Invert
						</button>
						<button
							type="button"
							className="btn btn-primary"
							onClick={handleCopySelection}
							disabled={disabled}
							title="Copy to clipboard"
						>
							Copy
						</button>
					</div>
				</div>

				<div className="operation-group">
					<h4>Export Selection</h4>
					<div className="export-buttons">
						<button
							type="button"
							className="btn btn-primary"
							onClick={() => handleExportSelection('png')}
							disabled={disabled}
							title="Export as PNG"
						>
							PNG
						</button>
						<button
							type="button"
							className="btn btn-primary"
							onClick={() => handleExportSelection('jpeg')}
							disabled={disabled}
							title="Export as JPEG"
						>
							JPEG
						</button>
					</div>
				</div>

				<div className="operation-group">
					<h4>Export Canvas</h4>
					<div className="export-buttons">
						<button
							type="button"
							className="btn btn-secondary"
							onClick={() => handleExportCanvas('png')}
							disabled={disabled}
							title="Export canvas as PNG"
						>
							PNG
						</button>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={() => handleExportCanvas('jpeg')}
							disabled={disabled}
							title="Export canvas as JPEG"
						>
							JPEG
						</button>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className={`brush-controls ${disabled ? 'disabled' : ''}`}>
			<div className="control-section">
				<h3>Selection Tools</h3>

				<div className="mode-toggle">
					<label className="toggle-label">
						<span className={`toggle-switch ${isSelectionMode ? 'active' : ''}`} onClick={handleSelectionModeToggle}>
							<span className="toggle-slider"></span>
						</span>
						<span className="toggle-text" onClick={handleSelectionModeToggle}>
							Selection Mode {isSelectionMode ? 'Active' : 'Inactive'}
						</span>
					</label>
				</div>

				<div className="tool-selection">
					<label>Active Tool</label>
					<div className="tool-buttons">
						<button
							type="button"
							className={`tool-btn ${currentToolState === 'brush' ? 'active' : ''}`}
							onClick={() => handleToolChange('brush')}
							disabled={disabled}
							title="Brush selection tool"
						>
							Brush
						</button>
						<button
							type="button"
							className={`tool-btn ${currentToolState === 'magicWand' ? 'active' : ''}`}
							onClick={() => handleToolChange('magicWand')}
							disabled={disabled}
							title="Magic wand selection tool"
						>
							Magic Wand
						</button>
						<button
							type="button"
							className={`tool-btn ${currentToolState === 'polygon' ? 'active' : ''}`}
							onClick={() => handleToolChange('polygon')}
							disabled={disabled}
							title="Polygon selection tool"
						>
							Polygon
						</button>
					</div>
				</div>

				{currentToolState === 'brush' && (
					<>
						<div className="brush-size-control">
							<label htmlFor="brush-size">
								Brush Size: <span className="brush-size-value">{currentBrushSize}px</span>
							</label>
							<input
								id="brush-size"
								type="range"
								min="1"
								max="50"
								value={currentBrushSize}
								onChange={handleBrushSizeChange}
								disabled={disabled}
								className="brush-size-slider"
							/>
							<div className="brush-size-presets">
								{renderBrushSizePresets()}
							</div>
						</div>

						<div className="brush-preview">
							<div
								className="brush-circle"
								style={{
									width: `${currentBrushSize}px`,
									height: `${currentBrushSize}px`,
									borderRadius: `${currentBrushSize / 2}px`,
									backgroundColor: 'rgba(255, 107, 107, 0.7)',
									border: '2px solid rgba(255, 107, 107, 0.9)'
								}}
							/>
							<span>Current Brush</span>
						</div>
					</>
				)}

				{currentToolState === 'magicWand' && (
					<div className="tolerance-control">
						<label htmlFor="magic-wand-tolerance">
							Tolerance: <span className="tolerance-value">{currentTolerance}</span>
						</label>
						<input
							id="magic-wand-tolerance"
							type="range"
							min="0"
							max="255"
							value={currentTolerance}
							onChange={handleToleranceChange}
							disabled={disabled}
							className="tolerance-slider"
						/>
						<div className="tolerance-info">
							<small>0 = Exact color match, 255 = All colors</small>
						</div>
					</div>
				)}

				{currentToolState === 'polygon' && (
					<div className="polygon-info">
						<p className="info-text">
							Click to add points • Click first point to close • Minimum 3 points required
						</p>
					</div>
				)}

				{/* History Controls */}
				<div className="history-controls">
					<button
						type="button"
						className="btn btn-secondary"
						onClick={onUndo}
						disabled={disabled || !canUndo}
						title="Undo last action"
					>
						Undo
					</button>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={onRedo}
						disabled={disabled || !canRedo}
						title="Redo last action"
					>
						Redo
					</button>
				</div>
			</div>

			{renderSelectionOperations()}
		</div>
	);
};

export default BrushControls;
