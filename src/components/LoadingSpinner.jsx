import React from "react";

const LoadingSpinner = ({ text = "Processing..." }) => {
	return (
		<div className="loading-overlay">
			<div className="spinner"></div>
			<p className="loading-text">{text}</p>
		</div>
	);
};

export default LoadingSpinner;
