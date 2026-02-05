// Dashboard Risk Heatmap Visualization
// Real-time 3D fraud heatmap with merchant risk mapping
// Live visualization of fraud patterns and risk distribution

import type { FraudSession } from "../ai/anomaly-predict";

// Heatmap configuration
export interface HeatmapConfig {
	width: number;
	height: number;
	cellSize: number;
	colorScheme: "viridis" | "plasma" | "inferno" | "magma" | "blues" | "reds";
	showGrid: boolean;
	showLabels: boolean;
	animationSpeed: number;
	maxDataPoints: number;
}

// Heatmap data point
export interface HeatmapDataPoint {
	x: number;
	y: number;
	value: number;
	merchantId: string;
	sessionId: string;
	timestamp: number;
	riskLevel: "low" | "medium" | "high" | "critical";
	metadata?: {
		country?: string;
		deviceType?: string;
		transactionAmount?: number;
	};
}

// 3D visualization data
export interface Heatmap3DData {
	points: Array<{
		x: number;
		y: number;
		z: number; // Risk score as height
		color: string;
		size: number;
		merchantId: string;
		riskLevel: string;
	}>;

	grid: Array<{
		x: number;
		y: number;
		value: number;
		color: string;
	}>;

	statistics: {
		totalPoints: number;
		avgRiskScore: number;
		maxRiskScore: number;
		riskDistribution: Record<string, number>;
		hotspots: Array<{
			x: number;
			y: number;
			intensity: number;
			radius: number;
		}>;
	};
}

// Color scheme definitions
const COLOR_SCHEMES = {
	viridis: [
		"#440154",
		"#482777",
		"#3f4a8a",
		"#31678e",
		"#26838f",
		"#1f9d8a",
		"#6cce5a",
		"#b6de2b",
		"#fee825",
	],
	plasma: [
		"#0d0887",
		"#6e00a8",
		"#8c0aa5",
		"#a8196d",
		"#c12b42",
		"#d5433d",
		"#e66236",
		"#f89441",
		"#fce026",
	],
	inferno: [
		"#000004",
		"#1b0c41",
		"#4a0c6b",
		"#781c6d",
		"#b5275f",
		"#e45936",
		"#f98e09",
		"#f8c932",
		"#fcffa4",
	],
	magma: [
		"#000004",
		"#180f3d",
		"#440f76",
		"#721f81",
		"#9e2f7f",
		"#cd4071",
		"#f1605d",
		"#fd9668",
		"#fca50a",
		"#f0f921",
	],
	blues: [
		"#f7fbff",
		"#deebf7",
		"#c6dbef",
		"#9ecae1",
		"#6baed6",
		"#4292c6",
		"#2171b5",
		"#08519c",
		"#08306b",
	],
	reds: [
		"#fff5f0",
		"#fee0d2",
		"#fcbba1",
		"#fc9272",
		"#fb6a4a",
		"#ef3b2c",
		"#cb181d",
		"#a50f15",
		"#67000d",
	],
};

export class RiskHeatmap {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private config: HeatmapConfig;
	private dataPoints: HeatmapDataPoint[] = [];
	private animationFrame: number | null = null;
	private lastUpdateTime = 0;

	constructor(canvasId: string, config: Partial<HeatmapConfig> = {}) {
		const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
		if (!canvas) {
			throw new Error(`Canvas element with id '${canvasId}' not found`);
		}

		this.canvas = canvas;
		this.ctx = canvas.getContext("2d")!;
		this.config = {
			width: 800,
			height: 600,
			cellSize: 20,
			colorScheme: "viridis",
			showGrid: true,
			showLabels: true,
			animationSpeed: 1000,
			maxDataPoints: 1000,
			...config,
		};

		this.setupCanvas();
		this.startAnimation();
	}

	// Setup canvas dimensions and context
	private setupCanvas(): void {
		this.canvas.width = this.config.width;
		this.canvas.height = this.config.height;
		this.ctx.imageSmoothingEnabled = true;

		// Enable high DPI support
		const dpr = window.devicePixelRatio || 1;
		const rect = this.canvas.getBoundingClientRect();

		this.canvas.width = rect.width * dpr;
		this.canvas.height = rect.height * dpr;
		this.ctx.scale(dpr, dpr);

		this.canvas.style.width = rect.width + "px";
		this.canvas.style.height = rect.height + "px";
	}

	// Add new data point to heatmap
	addDataPoint(
		session: FraudSession,
		metadata?: HeatmapDataPoint["metadata"],
	): void {
		const point: HeatmapDataPoint = {
			x: this.generateXCoordinate(session.merchantId),
			y: this.generateYCoordinate(session.timestamp),
			value: session.score,
			merchantId: session.merchantId,
			sessionId: session.sessionId,
			timestamp: session.timestamp,
			riskLevel: session.riskLevel,
			metadata,
		};

		this.dataPoints.push(point);

		// Keep data points within limit
		if (this.dataPoints.length > this.config.maxDataPoints) {
			this.dataPoints.splice(
				0,
				this.dataPoints.length - this.config.maxDataPoints,
			);
		}

		console.log(
			`🗺️ Heatmap: Added point for ${session.merchantId} | Score: ${session.score.toFixed(3)} | Risk: ${session.riskLevel}`,
		);
	}

	// Generate X coordinate from merchant ID
	private generateXCoordinate(merchantId: string): number {
		// Hash merchant ID to get consistent X coordinate
		let hash = 0;
		for (let i = 0; i < merchantId.length; i++) {
			hash = (hash << 5) - hash + merchantId.charCodeAt(i);
			hash = hash & hash; // Convert to 32-bit integer
		}

		// Map to canvas width
		return Math.abs(hash) % this.config.width;
	}

	// Generate Y coordinate from timestamp
	private generateYCoordinate(timestamp: number): number {
		// Map timestamp to Y coordinate (newer data at top)
		const age = Date.now() - timestamp;
		const maxAge = 24 * 60 * 60 * 1000; // 24 hours
		const normalizedAge = Math.min(age / maxAge, 1);

		return Math.floor(normalizedAge * this.config.height);
	}

	// Get color for value based on color scheme
	private getColorForValue(value: number): string {
		const colors = COLOR_SCHEMES[this.config.colorScheme];
		const index = Math.floor(value * (colors.length - 1));
		return colors[Math.min(index, colors.length - 1)];
	}

	// Render 2D heatmap
	render2D(): void {
		// Clear canvas
		this.ctx.clearRect(0, 0, this.config.width, this.config.height);

		// Draw background
		this.ctx.fillStyle = "#1a1a1a";
		this.ctx.fillRect(0, 0, this.config.width, this.config.height);

		// Draw grid if enabled
		if (this.config.showGrid) {
			this.drawGrid();
		}

		// Draw data points
		this.drawDataPoints();

		// Draw labels if enabled
		if (this.config.showLabels) {
			this.drawLabels();
		}

		// Draw legend
		this.drawLegend();
	}

	// Draw grid
	private drawGrid(): void {
		this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
		this.ctx.lineWidth = 1;

		// Vertical lines
		for (let x = 0; x <= this.config.width; x += this.config.cellSize) {
			this.ctx.beginPath();
			this.ctx.moveTo(x, 0);
			this.ctx.lineTo(x, this.config.height);
			this.ctx.stroke();
		}

		// Horizontal lines
		for (let y = 0; y <= this.config.height; y += this.config.cellSize) {
			this.ctx.beginPath();
			this.ctx.moveTo(0, y);
			this.ctx.lineTo(this.config.width, y);
			this.ctx.stroke();
		}
	}

	// Draw data points
	private drawDataPoints(): void {
		// Group points by grid cells for aggregation
		const gridCells = new Map<string, HeatmapDataPoint[]>();

		this.dataPoints.forEach((point) => {
			const gridX = Math.floor(point.x / this.config.cellSize);
			const gridY = Math.floor(point.y / this.config.cellSize);
			const key = `${gridX},${gridY}`;

			if (!gridCells.has(key)) {
				gridCells.set(key, []);
			}
			gridCells.get(key)!.push(point);
		});

		// Draw aggregated cells
		gridCells.forEach((points, key) => {
			const [gridX, gridY] = key.split(",").map(Number);
			const avgValue =
				points.reduce((sum, p) => sum + p.value, 0) / points.length;
			const maxRisk = Math.max(...points.map((p) => p.value));

			const x = gridX * this.config.cellSize;
			const y = gridY * this.config.cellSize;

			// Draw cell with gradient
			const gradient = this.ctx.createRadialGradient(
				x + this.config.cellSize / 2,
				y + this.config.cellSize / 2,
				0,
				x + this.config.cellSize / 2,
				y + this.config.cellSize / 2,
				this.config.cellSize / 2,
			);

			const baseColor = this.getColorForValue(avgValue);
			gradient.addColorStop(0, baseColor);
			gradient.addColorStop(1, this.adjustColorOpacity(baseColor, 0.3));

			this.ctx.fillStyle = gradient;
			this.ctx.fillRect(x, y, this.config.cellSize, this.config.cellSize);

			// Draw border for high-risk cells
			if (maxRisk > 0.8) {
				this.ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
				this.ctx.lineWidth = 2;
				this.ctx.strokeRect(x, y, this.config.cellSize, this.config.cellSize);
			}
		});
	}

	// Draw labels
	private drawLabels(): void {
		this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
		this.ctx.font = "12px monospace";

		// Time axis (Y)
		this.ctx.save();
		this.ctx.translate(10, 20);
		this.ctx.rotate(-Math.PI / 2);
		this.ctx.fillText("Time (newer → older)", 0, 0);
		this.ctx.restore();

		// Merchant axis (X)
		this.ctx.fillText(
			"Merchant Distribution",
			this.config.width / 2 - 50,
			this.config.height - 10,
		);

		// Statistics
		const stats = this.calculateStatistics();
		this.ctx.fillText(
			`Active: ${stats.totalPoints} | Avg Risk: ${(stats.avgRiskScore * 100).toFixed(1)}%`,
			10,
			20,
		);
	}

	// Draw legend
	private drawLegend(): void {
		const legendX = this.config.width - 150;
		const legendY = 20;
		const legendWidth = 120;
		const legendHeight = 200;

		// Background
		this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
		this.ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

		// Title
		this.ctx.fillStyle = "white";
		this.ctx.font = "12px monospace";
		this.ctx.fillText("Risk Level", legendX + 10, legendY + 20);

		// Color gradient
		const gradient = this.ctx.createLinearGradient(
			legendX + 10,
			legendY + 30,
			legendX + 10,
			legendY + 130,
		);
		const colors = COLOR_SCHEMES[this.config.colorScheme];
		colors.forEach((color, index) => {
			gradient.addColorStop(index / (colors.length - 1), color);
		});

		this.ctx.fillStyle = gradient;
		this.ctx.fillRect(legendX + 10, legendY + 30, 20, 100);

		// Labels
		this.ctx.fillStyle = "white";
		this.ctx.font = "10px monospace";
		this.ctx.fillText("1.0", legendX + 35, legendY + 35);
		this.ctx.fillText("0.5", legendX + 35, legendY + 80);
		this.ctx.fillText("0.0", legendX + 35, legendY + 125);

		// Risk distribution
		const stats = this.calculateStatistics();
		let yOffset = legendY + 150;
		this.ctx.fillText("Distribution:", legendX + 10, yOffset);

		Object.entries(stats.riskDistribution).forEach(([level, count]) => {
			yOffset += 15;
			const color = this.getRiskLevelColor(level as any);
			this.ctx.fillStyle = color;
			this.ctx.fillRect(legendX + 10, yOffset - 10, 10, 10);
			this.ctx.fillStyle = "white";
			this.ctx.fillText(`${level}: ${count}`, legendX + 25, yOffset);
		});
	}

	// Generate 3D visualization data
	generate3DData(): Heatmap3DData {
		const points: Heatmap3DData["points"] = [];
		const grid: Heatmap3DData["grid"] = [];

		// Convert 2D points to 3D
		this.dataPoints.forEach((point) => {
			points.push({
				x: point.x,
				y: point.y,
				z: point.value * 100, // Convert to height
				color: this.getColorForValue(point.value),
				size: Math.max(3, point.value * 10),
				merchantId: point.merchantId,
				riskLevel: point.riskLevel,
			});
		});

		// Generate grid for surface plot
		const gridSize = 20;
		for (let x = 0; x < this.config.width; x += gridSize) {
			for (let y = 0; y < this.config.height; y += gridSize) {
				const nearbyPoints = this.dataPoints.filter(
					(p) => Math.abs(p.x - x) < gridSize && Math.abs(p.y - y) < gridSize,
				);

				if (nearbyPoints.length > 0) {
					const avgValue =
						nearbyPoints.reduce((sum, p) => sum + p.value, 0) /
						nearbyPoints.length;
					grid.push({
						x,
						y,
						value: avgValue,
						color: this.getColorForValue(avgValue),
					});
				}
			}
		}

		const statistics = this.calculateStatistics();
		const hotspots = this.detectHotspots();

		return {
			points,
			grid,
			statistics: {
				...statistics,
				hotspots,
			},
		};
	}

	// Calculate statistics
	private calculateStatistics() {
		const totalPoints = this.dataPoints.length;
		const avgRiskScore =
			totalPoints > 0
				? this.dataPoints.reduce((sum, p) => sum + p.value, 0) / totalPoints
				: 0;
		const maxRiskScore =
			totalPoints > 0 ? Math.max(...this.dataPoints.map((p) => p.value)) : 0;

		const riskDistribution = this.dataPoints.reduce(
			(dist, point) => {
				dist[point.riskLevel] = (dist[point.riskLevel] || 0) + 1;
				return dist;
			},
			{} as Record<string, number>,
		);

		return {
			totalPoints,
			avgRiskScore,
			maxRiskScore,
			riskDistribution,
		};
	}

	// Detect risk hotspots
	private detectHotspots(): Array<{
		x: number;
		y: number;
		intensity: number;
		radius: number;
	}> {
		const hotspots: Array<{
			x: number;
			y: number;
			intensity: number;
			radius: number;
		}> = [];

		// Simple clustering to find hotspots
		const threshold = 50; // Distance threshold for clustering
		const processed = new Set<number>();

		for (let i = 0; i < this.dataPoints.length; i++) {
			if (processed.has(i)) continue;

			const point = this.dataPoints[i];
			if (point.value < 0.7) continue; // Only high-risk points

			const cluster = [point];
			processed.add(i);

			// Find nearby high-risk points
			for (let j = i + 1; j < this.dataPoints.length; j++) {
				if (processed.has(j)) continue;

				const other = this.dataPoints[j];
				const distance = Math.sqrt(
					(point.x - other.x) ** 2 + (point.y - other.y) ** 2,
				);

				if (distance < threshold && other.value > 0.7) {
					cluster.push(other);
					processed.add(j);
				}
			}

			if (cluster.length > 2) {
				const centerX =
					cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length;
				const centerY =
					cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length;
				const intensity =
					cluster.reduce((sum, p) => sum + p.value, 0) / cluster.length;
				const radius = Math.max(
					...cluster.map((p) =>
						Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2),
					),
				);

				hotspots.push({
					x: centerX,
					y: centerY,
					intensity,
					radius: radius + 20, // Add padding
				});
			}
		}

		return hotspots;
	}

	// Get risk level color
	private getRiskLevelColor(riskLevel: string): string {
		switch (riskLevel) {
			case "critical":
				return "#ef4444";
			case "high":
				return "#f59e0b";
			case "medium":
				return "#eab308";
			case "low":
				return "#22c55e";
			default:
				return "#6b7280";
		}
	}

	// Adjust color opacity
	private adjustColorOpacity(color: string, opacity: number): string {
		// Convert hex to rgba
		const hex = color.replace("#", "");
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);

		return `rgba(${r}, ${g}, ${b}, ${opacity})`;
	}

	// Start animation loop
	private startAnimation(): void {
		const animate = (timestamp: number) => {
			if (timestamp - this.lastUpdateTime > this.config.animationSpeed) {
				this.render2D();
				this.lastUpdateTime = timestamp;
			}

			this.animationFrame = requestAnimationFrame(animate);
		};

		this.animationFrame = requestAnimationFrame(animate);
	}

	// Stop animation
	stopAnimation(): void {
		if (this.animationFrame) {
			cancelAnimationFrame(this.animationFrame);
			this.animationFrame = null;
		}
	}

	// Clear all data
	clearData(): void {
		this.dataPoints = [];
		this.render2D();
	}

	// Export heatmap as image
	exportImage(): string {
		return this.canvas.toDataURL("image/png");
	}

	// Update configuration
	updateConfig(newConfig: Partial<HeatmapConfig>): void {
		this.config = { ...this.config, ...newConfig };
		this.setupCanvas();
		this.render2D();
	}

	// Get current data points
	getDataPoints(): HeatmapDataPoint[] {
		return [...this.dataPoints];
	}

	// Filter data points by time range
	filterByTimeRange(startTime: number, endTime: number): HeatmapDataPoint[] {
		return this.dataPoints.filter(
			(point) => point.timestamp >= startTime && point.timestamp <= endTime,
		);
	}

	// Filter data points by risk level
	filterByRiskLevel(riskLevels: string[]): HeatmapDataPoint[] {
		return this.dataPoints.filter((point) =>
			riskLevels.includes(point.riskLevel),
		);
	}
}

// Export utility functions
export function createRiskHeatmap(
	canvasId: string,
	config?: Partial<HeatmapConfig>,
): RiskHeatmap {
	return new RiskHeatmap(canvasId, config);
}

export function generateHeatmapReport(heatmap: RiskHeatmap): {
	summary: string;
	statistics: any;
	recommendations: string[];
} {
	const data = heatmap.generate3DData();
	const stats = data.statistics;

	const summary = `Risk heatmap analysis shows ${stats.totalPoints} active data points with an average risk score of ${(stats.avgRiskScore * 100).toFixed(1)}%. Current risk distribution: ${Object.entries(
		stats.riskDistribution,
	)
		.map(([level, count]) => `${level} (${count})`)
		.join(", ")}.`;

	const recommendations: string[] = [];

	if (stats.avgRiskScore > 0.7) {
		recommendations.push(
			"High overall risk levels detected - consider tightening thresholds",
		);
	}

	if (stats.hotspots.length > 0) {
		recommendations.push(
			`${stats.hotspots.length} risk hotspots identified - investigate clustered fraud patterns`,
		);
	}

	if (stats.riskDistribution.critical > stats.totalPoints * 0.1) {
		recommendations.push(
			"Critical risk events above 10% - immediate security review recommended",
		);
	}

	return {
		summary,
		statistics: stats,
		recommendations,
	};
}

// Export types for external use
export type { HeatmapConfig, HeatmapDataPoint, Heatmap3DData };
