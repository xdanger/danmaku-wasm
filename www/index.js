import init, { DanmakuGame, GameState } from "../pkg/danmaku_wasm";

// Game variables
let game;
let canvas;
let ctx;
let lastTime = 0;
let isRunning = false;
const keyStates = {};

// Initialize the game
async function initGame() {
	try {
		// Initialize the WASM module
		await init();

		// Get canvas and context
		canvas = document.getElementById("game-canvas");
		ctx = canvas.getContext("2d");

		// Set canvas size
		setupCanvas();

		// Create game instance
		game = new DanmakuGame(canvas.width, canvas.height);

		// Set up event listeners
		setupEventListeners();

		// Start game loop
		window.requestAnimationFrame(gameLoop);
		isRunning = true;

		console.log("Game initialized successfully");
	} catch (error) {
		console.error("Failed to initialize game:", error);
	}
}

// Set up the canvas size
function setupCanvas() {
	// Match container size or use fixed size
	const container = document.getElementById("game-container");
	const containerWidth = container.clientWidth;
	const containerHeight = container.clientHeight;

	// Keep aspect ratio of 3:4 (width:height)
	const aspectRatio = 3 / 4;

	// Calculate size based on available space
	let width, height;
	if (containerWidth / containerHeight > aspectRatio) {
		// Container is wider than needed
		height = Math.min(containerHeight, 720);
		width = height * aspectRatio;
	} else {
		// Container is taller than needed
		width = Math.min(containerWidth, 480);
		height = width / aspectRatio;
	}

	canvas.width = width;
	canvas.height = height;

	console.log(`Canvas size set to ${width}x${height}`);
}

// Set up event listeners
function setupEventListeners() {
	// Buttons
	document.getElementById("start-button").addEventListener("click", () => {
		game.start_game();
		document.getElementById("menu-screen").classList.add("hidden");
	});

	document.getElementById("restart-button").addEventListener("click", () => {
		game.reset();
		game.start_game();
		document.getElementById("game-over-screen").classList.add("hidden");
	});

	// Keyboard controls
	window.addEventListener("keydown", handleKeyDown);
	window.addEventListener("keyup", handleKeyUp);

	// Touch controls for mobile
	setupTouchControls();

	// Window resize
	window.addEventListener("resize", () => {
		setupCanvas();
		// Update the game with new dimensions
		// (In a full implementation, you'd need to handle this in the Rust code)
	});
}

// Handle keyboard input
function handleKeyDown(event) {
	keyStates[event.code] = true;
	updatePlayerVelocity();
}

function handleKeyUp(event) {
	keyStates[event.code] = false;
	updatePlayerVelocity();
}

// Update player velocity based on key states
function updatePlayerVelocity() {
	let dx = 0;
	let dy = 0;

	// Check arrow keys or WASD
	if (keyStates["ArrowLeft"] || keyStates["KeyA"]) dx -= 1;
	if (keyStates["ArrowRight"] || keyStates["KeyD"]) dx += 1;
	if (keyStates["ArrowUp"] || keyStates["KeyW"]) dy -= 1;
	if (keyStates["ArrowDown"] || keyStates["KeyS"]) dy += 1;

	// Normalize diagonal movement
	if (dx !== 0 && dy !== 0) {
		const length = Math.sqrt(dx * dx + dy * dy);
		dx /= length;
		dy /= length;
	}

	// Set player velocity
	game.set_player_velocity(dx, dy);
}

// Set up touch controls for mobile
function setupTouchControls() {
	let touchStartX = 0;
	let touchStartY = 0;
	let playerStartX = 0;
	let playerStartY = 0;

	canvas.addEventListener("touchstart", (e) => {
		e.preventDefault();
		const touch = e.touches[0];
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;

		// Get current player position (in a full implementation, you'd need a getter in Rust)
		const renderData = game.update(0);
		playerStartX = renderData.playerX;
		playerStartY = renderData.playerY;
	});

	canvas.addEventListener("touchmove", (e) => {
		e.preventDefault();
		const touch = e.touches[0];
		const dx = (touch.clientX - touchStartX) / 50;
		const dy = (touch.clientY - touchStartY) / 50;

		game.set_player_velocity(dx, dy);
	});

	canvas.addEventListener("touchend", (e) => {
		e.preventDefault();
		game.set_player_velocity(0, 0);
	});
}

// Main game loop
function gameLoop(timestamp) {
	if (!isRunning) return;

	// Calculate delta time
	const deltaTime = lastTime ? timestamp - lastTime : 0;
	lastTime = timestamp;

	// Update game state and get render data
	const renderData = game.update(deltaTime);

	// Clear canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Draw background grid
	drawBackground();

	// Render game
	drawGame(renderData);

	// Update UI
	updateUI(renderData);

	// Handle game state changes
	handleGameState(renderData.gameState);

	// Continue the loop
	window.requestAnimationFrame(gameLoop);
}

// Draw a grid background
function drawBackground() {
	ctx.fillStyle = "#050A30";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Draw grid
	ctx.strokeStyle = "#0A1550";
	ctx.lineWidth = 1;

	// Grid size
	const gridSize = 30;

	// Draw vertical lines
	for (let x = 0; x <= canvas.width; x += gridSize) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvas.height);
		ctx.stroke();
	}

	// Draw horizontal lines
	for (let y = 0; y <= canvas.height; y += gridSize) {
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(canvas.width, y);
		ctx.stroke();
	}

	// Draw player glow at bottom
	const gradient = ctx.createLinearGradient(
		0,
		canvas.height - 50,
		0,
		canvas.height,
	);
	gradient.addColorStop(0, "rgba(0, 150, 150, 0.1)");
	gradient.addColorStop(1, "rgba(0, 100, 100, 0.4)");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
}

// Draw the game elements
function drawGame(renderData) {
	// Draw bullets with trail effect
	const bullets = renderData.bullets;
	if (bullets && bullets.length) {
		for (let i = 0; i < bullets.length; i++) {
			const bullet = bullets[i];

			// 创建拖尾效果
			const trailLength = 5; // 轨迹粒子数量
			const trailFade = 0.7; // 轨迹淡出速度

			// 获取速度信息 - 如果bullet.velocity存在就使用，否则使用基于屏幕中心的推断方向
			let dirX = 0;
			let dirY = 0;

			if (bullet.velocity) {
				// 使用Rust返回的速度信息
				const vMagnitude = Math.sqrt(
					bullet.velocity.x * bullet.velocity.x +
						bullet.velocity.y * bullet.velocity.y,
				);
				if (vMagnitude > 0) {
					dirX = bullet.velocity.x / vMagnitude;
					dirY = bullet.velocity.y / vMagnitude;
				}
			} else {
				// 备用方案：推断方向 - 假设子弹离屏幕中心越远速度越快
				const centerX = canvas.width / 2;
				const centerY = canvas.height / 2;
				const dx = bullet.x - centerX;
				const dy = bullet.y - centerY;
				const dist = Math.sqrt(dx * dx + dy * dy);
				// 标准化方向向量
				dirX = dist > 0 ? dx / dist : 0;
				dirY = dist > 0 ? dy / dist : 0;
			}

			for (let t = 0; t < trailLength; t++) {
				const size = bullet.radius * (1 - (t / trailLength) * 0.5);
				const alpha = (1 - t / trailLength) * trailFade;

				// 使用方向创建轨迹
				const trailX = bullet.x - dirX * bullet.radius * 1.5 * t;
				const trailY = bullet.y - dirY * bullet.radius * 1.5 * t;

				ctx.globalAlpha = alpha;
				ctx.fillStyle = bullet.color;
				ctx.beginPath();
				ctx.arc(trailX, trailY, size, 0, Math.PI * 2);
				ctx.fill();
			}

			// 主弹幕
			ctx.globalAlpha = 1.0;
			ctx.fillStyle = bullet.color;
			ctx.beginPath();
			ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	// Draw player (ship shape instead of circle)
	drawPlayerShip(renderData.playerX, renderData.playerY, 12);
}

// Draw a ship-shaped player
function drawPlayerShip(x, y, size) {
	ctx.save();

	// Ship body gradient
	const gradient = ctx.createLinearGradient(x, y - size, x, y + size);
	gradient.addColorStop(0, "#00FFFF");
	gradient.addColorStop(0.5, "#0088AA");
	gradient.addColorStop(1, "#006688");

	// Draw ship shape
	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.moveTo(x, y - size); // Top point
	ctx.lineTo(x - size / 1.5, y + size / 2); // Bottom left
	ctx.lineTo(x, y + size / 3); // Bottom middle indent
	ctx.lineTo(x + size / 1.5, y + size / 2); // Bottom right
	ctx.closePath();
	ctx.fill();

	// Add glow effect
	ctx.shadowColor = "#00FFFF";
	ctx.shadowBlur = 10;
	ctx.fill();

	// Reset shadow
	ctx.shadowBlur = 0;

	// Draw center gem
	ctx.fillStyle = "#FFAA00";
	ctx.beginPath();
	ctx.arc(x, y - size / 4, size / 5, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
}

// Update UI elements
function updateUI(renderData) {
	// Update time display
	const timeElement = document.getElementById("time");
	timeElement.textContent = renderData.survivalTime.toFixed(1);
}

// Handle game state changes
function handleGameState(state) {
	// Convert state number to enum
	// (In JS, we get the enum as a number)
	switch (state) {
		case 0: // GameState::Menu
			// Show menu screen if not already visible
			if (
				!document.getElementById("menu-screen").classList.contains("hidden")
			) {
				document.getElementById("menu-screen").classList.remove("hidden");
			}
			document.getElementById("game-over-screen").classList.add("hidden");
			break;

		case 1: // GameState::Playing
			// Ensure menu and game over screens are hidden
			document.getElementById("menu-screen").classList.add("hidden");
			document.getElementById("game-over-screen").classList.add("hidden");
			break;

		case 2: // GameState::GameOver
			// Show game over screen
			document.getElementById("game-over-screen").classList.remove("hidden");

			// Update final time
			const finalTimeElement = document.getElementById("final-time");
			finalTimeElement.textContent = game.get_survival_time().toFixed(1);
			break;
	}
}

// Initialize the game when the page loads
window.addEventListener("load", initGame);
