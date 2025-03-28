# Rust/WebAssembly 弹幕飞机游戏

这是一个使用 Rust 和 WebAssembly 实现的 2D 弹幕躲避游戏。通过使用 Rust 的高性能特性，游戏在移动设备上能够处理更多的弹幕和粒子效果，同时保持稳定的帧率。

## 技术栈

- Rust - 游戏核心逻辑实现
- WebAssembly (WASM) - 编译 Rust 代码为浏览器可运行的格式
- Canvas API - 渲染图形
- Webpack - 构建与打包
- wasm-bindgen - Rust 与 JavaScript 的交互桥梁

## 游戏特点

- 多种弹幕图案：圆形、扇形、螺旋等
- 追踪弹幕系统
- 平滑的飞机控制与动画
- 动态难度系统
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
bun start

# 构建生产版本
bun run build
```

## 项目结构

```plaintext
danmaku-wasm/
├── src/                  # Rust 源代码
│   ├── lib.rs            # 主入口点
│   ├── game.rs           # 游戏核心逻辑
│   ├── player.rs         # 玩家实现
│   ├── bullet.rs         # 弹幕系统
│   ├── patterns.rs       # 弹幕模式生成器
│   └── collision.rs      # 碰撞检测
├── www/                  # Web 前端
│   ├── index.js          # JavaScript 入口
│   ├── index.html        # HTML 页面
│   └── style.css         # 样式
├── dist/                 # 构建输出（生产版本）
├── pkg/                  # WebAssembly 编译输出
└── Cargo.toml            # Rust 项目配置
```

## 性能对比

相比原始的 JavaScript 实现，Rust/WASM 版本实现了以下性能提升：

- 支持同时渲染的弹幕数量显著增加
- 更复杂的弹幕图案和物理模拟
- 在中低端移动设备上保持流畅的帧率

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

## 游戏技巧

- 擦边躲避弹幕可以积累连击，增加得分倍率
- 连续躲避多个弹幕会增加分数倍率，最高可达 5 倍
- 注意不要让连击计时器超时，否则倍率会重置
- 弹幕颜色有提示作用，红色弹幕通常会追踪玩家

## 优化特性

- 平滑的动画和过渡效果
- 优化的粒子系统
- 动态调整弹幕密度
- 平衡的难度曲线

## 挑战自我

这是一个"一命制"游戏，一旦被击中就会游戏结束。挑战自己，看看能获得多高的分数！

## 项目部署

本项目已配置为可以在 Vercel 上轻松部署：

1. Fork 本仓库到您的 GitHub 账户
2. 登录[Vercel](https://vercel.com/)（可使用 GitHub 账号直接登录）
3. 点击"New Project"按钮
4. 从 GitHub 导入您 fork 的仓库
5. 保持默认设置，点击"Deploy"

部署完成后，您将获得一个可访问的 URL 来玩这个游戏。

## 项目地址

GitHub: [https://github.com/dashhuang/danmaku-game](https://github.com/dashhuang/danmaku-game)

## 更新日志

2024-03-28: 修复了浏览器标签页切换到后台时游戏时间继续但画面暂停的问题
2023-03-27: 更新了作者信息，修复了 GitHub 验证问题
