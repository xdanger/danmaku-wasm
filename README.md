# Danmaku Bevy

A bullet hell (danmaku) game implemented in Rust using the Bevy game engine.

## Features

- Entity Component System (ECS) architecture
- Pure Rust implementation with no JavaScript rendering
- Multiple bullet patterns
- Difficulty scaling over time
- Menu and game over screens
- Keyboard controls

## Prerequisites

- Rust and Cargo (<https://rustup.rs/>)
- wasm-bindgen-cli (for web builds)
- WebAssembly target: `rustup target add wasm32-unknown-unknown`

## Development

### Running Native (Desktop)

```bash
# Run in debug mode
cargo run

# Run with better performance
cargo run --release
```

### Building for Web (WebAssembly)

```bash
# Add WebAssembly target (if not already added)
rustup target add wasm32-unknown-unknown

# Install wasm-bindgen-cli (if not already installed)
cargo install wasm-bindgen-cli

# Build the WebAssembly package
cargo build --release --target wasm32-unknown-unknown

# Generate JavaScript bindings
wasm-bindgen --out-dir ./target/wasm_bindgen --target web ./target/wasm32-unknown-unknown/release/danmaku-bevy.wasm

# Install and run a local HTTP server
cargo install basic-http-server
basic-http-server .
```

Then open your browser at <http://localhost:4000>

## Game Controls

- Arrow keys or WASD: Move the player
- Avoid the bullets for as long as possible!

## Project Structure

- `src/main.rs`: Main game code using Bevy
- `index.html`: HTML entry point for web builds

## Architecture

This game implements a complete Bevy-based ECS architecture:

1. **Components**:
   - `Player`: Player ship properties
   - `Bullet`: Bullet properties
   - `Velocity`: Movement vector

2. **Systems**:
   - Player movement
   - Bullet movement and spawning
   - Collision detection
   - Game state management
   - UI rendering and updates

3. **Game States**:
   - Menu
   - Playing
   - Game Over

## Advantages Over Canvas-Based Implementation

This Bevy-based implementation offers several advantages:

1. **Native Performance**: Can run as a desktop application with full GPU acceleration
2. **Pure Rust**: No dependency on JavaScript for game logic or rendering
3. **Simplified Architecture**: ECS makes the game more modular and easier to extend
4. **Web Support**: Still works in browsers through WebAssembly
5. **Cross-Platform**: Same codebase can target desktop, web, and mobile platforms
6. **Modern Rendering**: Uses GPU acceleration rather than Canvas 2D

## License

MIT
