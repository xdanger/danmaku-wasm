# 将 JS+Canvas HTML 游戏彻底重写为 Rust WebAssembly 版本

## 项目概述

当前项目是一个使用 JavaScript 和 Canvas API 开发的 2D 弹幕飞机游戏。我们计划使用 Rust 语言彻底重写游戏核心逻辑并编译为 WebAssembly (WASM)，在完成后删除所有 JavaScript 遗留代码，以提高在 iOS Safari 和 Android Chrome 等移动浏览器上的性能和用户体验。

## 阶段一：准备与评估

### 1. 现有代码库分析

- **当前架构**：
  - 纯 JavaScript 实现的游戏逻辑
  - 使用 Canvas API 进行渲染
  - 包含多种弹幕模式和粒子效果
  - 支持键盘和触摸控制
  - 包含性能自适应机制

- **性能瓶颈点**：
  - 大量弹幕和粒子的物理计算
  - 复杂的碰撞检测
  - 复杂图案生成（如心形、星形弹幕）

### 2. 环境设置

- **Rust 开发环境**：

  ```bash
  # 安装 Rust 和 Cargo
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

  # 添加 WebAssembly 目标支持
  rustup target add wasm32-unknown-unknown

  # 安装 wasm-pack (用于构建和打包 WebAssembly)
  cargo install wasm-pack
  ```

- **项目结构调整**：

  ```bash
  # 切换到 wasm 分支
  git checkout wasm

  # 备份重要的游戏数据和逻辑
  mkdir -p _backup
  cp -r js _backup/
  cp index.html _backup/

  # 初始化 Rust 库（直接在根目录）
  cargo init --lib
  ```

- **添加必要依赖到 Cargo.toml**：

  ```toml
  [package]
  name = "danmaku-wasm"
  version = "0.1.0"
  edition = "2021"

  [lib]
  crate-type = ["cdylib", "rlib"]

  [dependencies]
  wasm-bindgen = "0.2.87"
  web-sys = { version = "0.3.64", features = [
    "Document", "Element", "HtmlCanvasElement", "Window",
    "CanvasRenderingContext2d", "Performance", "KeyboardEvent",
    "TouchEvent", "TouchList", "Touch"
  ]}
  js-sys = "0.3.64"
  nalgebra = "0.32.3"
  rand = { version = "0.8.5", features = ["small_rng"] }
  getrandom = { version = "0.2.10", features = ["js"] }
  console_error_panic_hook = "0.1.7"
  ```

### 3. 设置构建系统

- **创建构建配置**：
  在项目根目录创建 `webpack.config.js`：

  ```javascript
  const path = require('path');
  const HtmlWebpackPlugin = require('html-webpack-plugin');
  const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");
  const CopyPlugin = require("copy-webpack-plugin");

  module.exports = {
    entry: './www/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: 'www/index.html'
      }),
      new WasmPackPlugin({
        crateDirectory: path.resolve(__dirname),
        outDir: path.resolve(__dirname, "pkg"),
      }),
      new CopyPlugin({
        patterns: [
          { from: "www/assets", to: "assets" },
        ],
      }),
    ],
    experiments: {
      asyncWebAssembly: true,
    }
  };
  ```

- **创建 npm 配置**：

  ```bash
  # 初始化 npm 项目
  npm init -y

  # 安装必要的 npm 包
  npm install --save-dev webpack webpack-cli webpack-dev-server html-webpack-plugin @wasm-tool/wasm-pack-plugin copy-webpack-plugin
  ```

### 4. 创建 Web 前端基础结构

- **创建 Web 部分的目录结构**：

  ```bash
  mkdir -p www/assets
  touch www/index.js
  touch www/index.html
  touch www/style.css
  ```

- **创建基础 HTML**：
  以现有的 `index.html` 为基础创建新的 HTML 文件，简化后保留必要的结构和 UI 元素。

## 阶段二：核心引擎实现

### 1. Rust 项目结构

在 `src` 目录中创建以下文件：

```
src/
├── lib.rs                # 主要入口点和 WASM 绑定
├── game.rs               # 游戏状态和核心循环
├── player.rs             # 玩家飞机实现
├── bullet.rs             # 弹幕系统实现
├── patterns.rs           # 弹幕模式生成器
├── collision.rs          # 碰撞检测系统
└── utils.rs              # 工具函数
```

### 2. 基本数据结构实现

- **lib.rs - 主模块**：

  ```rust
  mod game;
  mod player;
  mod bullet;
  mod patterns;
  mod collision;
  mod utils;

  use wasm_bindgen::prelude::*;

  // 初始化函数
  #[wasm_bindgen(start)]
  pub fn start() {
      utils::set_panic_hook();
      // 其他初始化代码
  }

  // 导出游戏类
  #[wasm_bindgen]
  pub use game::DanmakuGame;
  #[wasm_bindgen]
  pub use game::GameState;
  ```

- **game.rs - 游戏核心状态**：

  ```rust
  use wasm_bindgen::prelude::*;
  use crate::player::Player;
  use crate::bullet::Bullet;

  #[wasm_bindgen]
  #[derive(Clone, Copy, PartialEq)]
  pub enum GameState {
      Menu,
      Playing,
      GameOver,
  }

  #[wasm_bindgen]
  pub struct DanmakuGame {
      // 游戏状态字段
  }

  #[wasm_bindgen]
  impl DanmakuGame {
      // 游戏方法实现
  }
  ```

### 3. 按模块实现游戏逻辑

1. **玩家模块**：

   ```rust
   // player.rs
   use nalgebra::Vector2;
   use crate::bullet::Bullet;

   pub struct Player {
       pub position: Vector2<f64>,
       pub size: f64,
       pub velocity: Vector2<f64>,
       pub is_invincible: bool,
   }

   impl Player {
       pub fn new(x: f64, y: f64) -> Self {
           Self {
               position: Vector2::new(x, y),
               size: 10.0,
               velocity: Vector2::new(0.0, 0.0),
               is_invincible: false,
           }
       }

       pub fn update(&mut self, delta_time: f64, width: f64, height: f64) {
           // 更新玩家位置
           self.position += self.velocity * delta_time;

           // 边界检查
           self.position.x = self.position.x.max(self.size).min(width - self.size);
           self.position.y = self.position.y.max(self.size).min(height - self.size);
       }
   }
   ```

2. **弹幕模块**：

   ```rust
   // bullet.rs
   use nalgebra::Vector2;

   pub struct Bullet {
       pub position: Vector2<f64>,
       pub velocity: Vector2<f64>,
       pub radius: f64,
       pub color: String,
   }

   impl Bullet {
       pub fn update(&mut self, delta_time: f64) {
           self.position += self.velocity * delta_time;
       }
   }
   ```

## 阶段三：JavaScript 入口与画布渲染

### 1. 创建 JavaScript 入口

在 `www/index.js` 中实现：

```javascript
import init, { DanmakuGame, GameState } from '../pkg/danmaku_game';

let game;
let canvas;
let ctx;
let lastTime = 0;
let isRunning = false;

// 初始化函数
async function init_game() {
    // 初始化 WASM 模块
    await init();

    // 获取画布和上下文
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // 设置画布尺寸
    canvas.width = 480;
    canvas.height = 720;

    // 创建游戏实例
    game = new DanmakuGame(canvas.width, canvas.height);

    // 设置事件监听器
    setupEventListeners();

    // 开始游戏循环
    requestAnimationFrame(gameLoop);
    isRunning = true;
}

// 游戏主循环
function gameLoop(timestamp) {
    if (!isRunning) return;

    const deltaTime = lastTime ? timestamp - lastTime : 0;
    lastTime = timestamp;

    // 更新游戏状态并获取渲染数据
    const renderData = game.update(deltaTime);

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 渲染游戏
    drawGame(renderData);

    // 继续循环
    requestAnimationFrame(gameLoop);
}

// 事件处理
function setupEventListeners() {
    // 按钮事件
    document.getElementById('start-button').addEventListener('click', () => {
        game.start_game();
    });

    document.getElementById('restart-button').addEventListener('click', () => {
        game.reset();
        game.start_game();
    });

    // 键盘事件
    window.addEventListener('keydown', (e) => handleKeyEvent(e, true));
    window.addEventListener('keyup', (e) => handleKeyEvent(e, false));

    // 触摸事件
    setupTouchEvents();
}

// 在页面加载完成后初始化
window.addEventListener('load', init_game);
```

### 2. 创建基础 HTML 和 CSS

基于现有的 HTML 和 CSS，创建精简版的 HTML 和样式，以支持新的 Rust/WASM 游戏。

## 阶段四：完整游戏功能实现

### 1. 弹幕模式生成器

```rust
// patterns.rs
use nalgebra::Vector2;
use rand::Rng;
use crate::bullet::Bullet;

pub fn create_circle_pattern(center: Vector2<f64>, bullets_count: usize, speed: f64) -> Vec<Bullet> {
    let mut bullets = Vec::with_capacity(bullets_count);

    for i in 0..bullets_count {
        let angle = 2.0 * std::f64::consts::PI * (i as f64) / (bullets_count as f64);
        let velocity = Vector2::new(angle.cos() * speed, angle.sin() * speed);

        bullets.push(Bullet {
            position: center,
            velocity,
            radius: 6.0,
            color: "#FF0000".to_string(),
        });
    }

    bullets
}

// 实现其他弹幕模式：螺旋、波浪、心形等
```

### 2. 碰撞检测系统

```rust
// collision.rs
use nalgebra::Vector2;
use crate::player::Player;
use crate::bullet::Bullet;

pub fn check_collision(player: &Player, bullet: &Bullet) -> bool {
    let distance = (player.position - bullet.position).magnitude();
    distance < (player.size + bullet.radius)
}

pub fn check_all_collisions(player: &Player, bullets: &[Bullet]) -> bool {
    if player.is_invincible {
        return false;
    }

    bullets.iter().any(|bullet| check_collision(player, bullet))
}

// 实现更高效的碰撞检测算法，如空间分割或四叉树
```

### 3. 渲染数据结构

```rust
// 在 game.rs 中
#[wasm_bindgen]
pub struct RenderData {
    player_x: f64,
    player_y: f64,
    game_state: GameState,
    survival_time: f64,
}

#[wasm_bindgen]
impl RenderData {
    // 创建 getter 方法供 JavaScript 使用
    #[wasm_bindgen(getter)]
    pub fn player_x(&self) -> f64 {
        self.player_x
    }

    #[wasm_bindgen(getter)]
    pub fn player_y(&self) -> f64 {
        self.player_y
    }

    // 其他 getter 方法
}
```

## 阶段五：测试与优化

### 1. 性能基准测试

创建测试脚本，与原始 JS 版本对比性能：

```javascript
// 在 www/benchmark.js 中
import { DanmakuGame } from '../pkg/danmaku_game';

export async function runWasmBenchmark(frames) {
    const game = new DanmakuGame(480, 720);
    game.start_game();

    const times = [];
    for (let i = 0; i < frames; i++) {
        const start = performance.now();
        game.update(16.67); // 假设 60fps
        times.push(performance.now() - start);
    }

    return {
        averageFrameTime: times.reduce((a, b) => a + b, 0) / times.length
    };
}
```

### 2. 内存优化

- **使用 Rust 的内存管理特性**：

  ```rust
  // 使用预分配的 Vec 来避免频繁分配
  let mut bullets = Vec::with_capacity(1000);

  // 重用对象而不是重新创建
  bullets.clear();
  // 添加新的子弹...
  ```

- **使用 Rust 的线程局部存储**：

  ```rust
  thread_local! {
      static BULLET_BUFFER: RefCell<Vec<Bullet>> = RefCell::new(Vec::with_capacity(1000));
  }
  ```

## 阶段六：清理与最终部署

### 1. 删除遗留文件

在确认 Rust/WASM 版本完全功能正常后，删除所有 JavaScript 遗留文件：

```bash
# 删除遗留的 JS 游戏文件
rm -rf js/
# 保留指定的 CSS 和 HTML
find . -name "*.js" -not -path "./www/*" -not -path "./node_modules/*" -not -path "./webpack.config.js" -delete
```

### 2. 更新部署配置

更新 Vercel 配置文件 `vercel.json`：

```json
{
  "buildCommand": "wasm-pack build --target web && npx webpack --mode production",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

### 3. 添加 README 说明

更新 README.md，说明已经将游戏从 JavaScript 转换为 Rust/WASM，并介绍性能提升：

```markdown
# Rust/WebAssembly 弹幕飞机游戏

这是一个使用 Rust 和 WebAssembly 实现的 2D 弹幕躲避游戏。通过使用 Rust 的高性能特性，游戏在移动设备上能够处理更多的弹幕和粒子效果，同时保持稳定的帧率。

## 性能提升

相比原始的 JavaScript 实现，Rust/WASM 版本实现了以下性能提升：

- 平均帧时间减少约 X 倍
- 支持同时渲染的弹幕数量增加 X 倍
- 内存使用量减少约 X%

## 游戏特点

- 多种弹幕图案：圆形、扇形、螺旋、心形、星形等
- 智能追踪弹幕系统
- 华丽的粒子效果和视觉反馈
- 连击系统和分数倍率奖励
- 平滑的飞机控制与动画
- 动态难度系统
```

## 时间估计

- **阶段一（准备与环境设置）**：1-2 天
- **阶段二（核心引擎实现）**：1-2 周
- **阶段三（JavaScript 交互）**：2-3 天
- **阶段四（完整功能实现）**：1-2 周
- **阶段五（测试与优化）**：3-5 天
- **阶段六（清理与部署）**：1-2 天

总计：约 3-4 周

## 资源和参考链接

- [Rust 官方文档](https://www.rust-lang.org/learn)
- [wasm-bindgen 指南](https://rustwasm.github.io/docs/wasm-bindgen/)
- [Rust and WebAssembly 教程](https://rustwasm.github.io/docs/book/)
- [web-sys API 文档](https://docs.rs/web-sys/latest/web_sys/)
- [Rust 游戏开发资源](https://arewegameyet.rs/)
- [WebAssembly MDN 参考](https://developer.mozilla.org/zh-CN/docs/WebAssembly)
