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
	brushSize = 10,
	hasSelection = false,
	disabled = false,
	selectionMode = true
}) => {
	const [currentBrushSize, setCurrentBrushSize] = useState(brushSize);
	const [isSelectionMode, setIsSelectionMode] = useState(selectionMode);

	// Sync local state with props when they change
	useEffect(() => {
		setIsSelectionMode(selectionMode);
	}, [selectionMode]);

	useEffect(() => {
		setCurrentBrushSize(brushSize);
	}, [brushSize]);

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
							title="Clear current selection"
						>
							🗑️ Clear
						</button>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={handleDeleteSelection}
							disabled={disabled}
							title="Delete selected area"
						>
							✂️ Delete
						</button>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={handleInvertSelection}
							disabled={disabled}
							title="Invert current selection"
						>
							🔄 Invert
						</button>
						<button
							type="button"
							className="btn btn-primary"
							onClick={handleCopySelection}
							disabled={disabled}
							title="Copy selected area to clipboard"
						>
							📋 Copy
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
							title="Export selection as PNG"
						>
							📥 PNG
						</button>
						<button
							type="button"
							className="btn btn-primary"
							onClick={() => handleExportSelection('jpeg')}
							disabled={disabled}
							title="Export selection as JPEG"
						>
							📥 JPEG
						</button>
					</div>
				</div>

				<div className="operation-group">
					<h4>Export Canvas</h4>
					<div className="export-buttons">
						<button
							type="button"
							className="btn btn-success"
							onClick={() => handleExportCanvas('png')}
							disabled={disabled}
							title="Export entire canvas as PNG"
						>
							🖼️ PNG
						</button>
						<button
							type="button"
							className="btn btn-success"
							onClick={() => handleExportCanvas('jpeg')}
							disabled={disabled}
							title="Export entire canvas as JPEG"
						>
							🖼️ JPEG
						</button>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className={`brush-controls ${disabled ? 'disabled' : ''}`}>
			<div className="control-section">
				<h3>🎨 Brush Selection Tool</h3>

				<div className="mode-toggle">
					<label className="toggle-label">
						<input
							type="checkbox"
							checked={isSelectionMode}
							onChange={handleSelectionModeToggle}
							disabled={disabled}
						/>
						<span className="toggle-switch"></span>
						Selection Mode
					</label>
				</div>

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
			</div>

			{renderSelectionOperations()}

			<div className="control-info">
				<small>
					💡 Tip: Hold and drag to paint your selection. Use small brush for precision, large for broad areas.
				</small>
			</div>
		</div>
	);
};

export default BrushControls;
