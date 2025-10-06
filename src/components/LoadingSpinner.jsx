import React from "react";

const LoadingSpinner = ({ text = "Processing..." }) => {
	return (
		<div className="loading-overlay">
			<div className="loading-container">
				<div className="spinner"></div>
				<p className="loading-text">{text}</p>
			</div>
		</div>
	);
};

export default LoadingSpinner;
