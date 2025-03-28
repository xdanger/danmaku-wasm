# Rust/WebAssembly 弹幕飞机游戏

这是一个使用 Rust 和 WebAssembly 实现的 2D 弹幕躲避游戏。通过使用 Rust 的高性能特性，游戏能够处理大量弹幕和粒子效果，同时保持稳定的帧率。

## 技术栈

- Rust - 游戏核心逻辑实现
- WebAssembly (WASM) - 编译 Rust 代码为浏览器可运行的格式
- Canvas API - 渲染图形
- Webpack - 构建与打包
- wasm-bindgen - Rust 与 JavaScript 的交互桥梁

## 游戏特点

- 多种弹幕图案
- 美观的视觉效果（轨迹、发光效果等）
- 平滑的飞机控制与动画
- 适应移动端与桌面设备

## 开发环境设置

### 前提条件

- Rust 和 Cargo (<https://www.rust-lang.org/tools/install>)
  - **注意**: 强烈建议使用 `rustup` 安装 Rust，而不是通过 Homebrew 或其他包管理器
- Node.js 和 npm (<https://nodejs.org/>)
- wasm-pack (`cargo install wasm-pack`)
- wasm32-unknown-unknown 目标 (`rustup target add wasm32-unknown-unknown`)

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/yourusername/danmaku-wasm.git
cd danmaku-wasm

# 安装依赖
bun install

# 开发服务器
bun run dev

# 生产环境开发服务器
bun run start

# 构建生产版本
bun run build

# 清理构建文件
bun run clean

# 清理并重新构建
bun run rebuild
```

## 项目结构

```plaintext
danmaku-wasm/
├── src/                  # Rust 源代码
│   ├── lib.rs            # 主入口点
│   ├── game.rs           # 游戏核心逻辑
│   └── ...               # 其他Rust模块
├── www/                  # Web 前端
│   ├── index.js          # JavaScript 入口
│   ├── index.html        # HTML 页面
│   └── style.css         # 样式
├── dist/                 # 构建输出（生产版本）
├── pkg/                  # WebAssembly 编译输出
└── Cargo.toml            # Rust 项目配置
```

## 性能特点

Rust/WASM 实现具有以下性能特点：

- 高效处理大量弹幕同时渲染
- 支持复杂的视觉效果和粒子系统
- 在各种设备上保持流畅的帧率

## 故障排除

### wasm32-unknown-unknown 目标安装问题

如果使用 Homebrew 安装的 Rust，可能会遇到 wasm32-unknown-unknown 目标添加问题。解决方法有两种：

1. **推荐方案**: 卸载 Homebrew 版本的 Rust，改用 rustup 安装：

   ```bash
   brew uninstall rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup target add wasm32-unknown-unknown
   ```

2. **替代方案**: 手动安装 wasm32 目标到 Homebrew Rust：
   请参考 [wasm-pack 非 rustup 设置](https://rustwasm.github.io/wasm-pack/book/prerequisites/non-rustup-setups.html)

## 许可证

MIT

## 更新日志

- 2024-05-30: 改进视觉效果，添加弹幕轨迹和发光效果
- 2024-03-28: 修复了浏览器标签页切换到后台时游戏时间继续但画面暂停的问题
