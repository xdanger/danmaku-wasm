# 使用Bevy引擎重写弹幕游戏为纯Rust实现

## 项目概述

当前项目是一个使用JavaScript和Canvas API开发的2D弹幕飞机游戏。我们计划完全重写游戏，使用Rust语言和Bevy游戏引擎实现，以实现以下目标：

1. 完全消除对JavaScript的依赖
2. 提高游戏性能和响应速度
3. 同时支持原生应用和WebAssembly部署
4. 简化代码架构，提高可维护性
5. 改善在移动设备上的体验

Bevy是一个基于ECS（实体组件系统）的Rust游戏引擎，使用现代渲染API，而不是依赖Canvas进行2D渲染。

## 阶段一：准备与评估

### 1. 现有代码库分析

- **当前架构**：
  - 纯JavaScript实现的游戏逻辑
  - 使用Canvas API进行渲染
  - 包含多种弹幕模式和粒子效果
  - 支持键盘和触摸控制
  - 包含性能自适应机制

- **性能瓶颈点**：
  - 大量弹幕和粒子的物理计算
  - 复杂的碰撞检测
  - 复杂图案生成（如心形、星形弹幕）
  - JavaScript单线程限制
  - Canvas渲染性能有限

### 2. 环境设置

- **Rust与Bevy开发环境**：

  ```bash
  # 安装Rust和Cargo
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

  # 添加WebAssembly目标支持
  rustup target add wasm32-unknown-unknown

  # 安装wasm-bindgen-cli (用于生成WebAssembly绑定)
  cargo install wasm-bindgen-cli

  # 安装HTTP服务器（用于测试WebAssembly版本）
  cargo install basic-http-server
  ```

- **项目初始化**：

  ```bash
  # 初始化新项目
  cargo new danmaku-bevy
  cd danmaku-bevy
  ```

- **添加Bevy依赖到Cargo.toml**：

  ```toml
  [package]
  name = "danmaku-bevy"
  version = "0.1.0"
  edition = "2021"

  [dependencies]
  bevy = "0.12"
  rand = { version = "0.8.5", features = ["small_rng"] }

  # 开发模式优化设置
  [profile.dev]
  opt-level = 1

  # 优化依赖库（包括Bevy）
  [profile.dev.package."*"]
  opt-level = 3

  # 生产构建优化
  [profile.release]
  lto = true
  codegen-units = 1

  # 在Linux下使用动态链接加速开发
  [target.'cfg(target_os = "linux")'.dependencies.bevy]
  version = "0.12"
  features = ["dynamic_linking"]

  # 为WebAssembly构建配置Bevy
  [target.'cfg(target_arch = "wasm32")'.dependencies]
  bevy = { version = "0.12", default-features = false, features = [
    "bevy_winit",
    "bevy_core_pipeline",
    "bevy_sprite",
    "bevy_text",
    "png",
    "webgl2",
  ]}
  ```

- **创建WebAssembly的HTML入口文件**：

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Danmaku Game - Bevy</title>
      <style>
          body, html {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background-color: #050A30;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
          }
          canvas {
              background-color: #000;
              width: 480px;
              height: 640px;
              max-width: 100%;
              max-height: 100%;
              display: block;
              margin: 0 auto;
              outline: none;
          }
          .loading {
              color: #00FFFF;
              font-size: 24px;
              text-align: center;
          }
      </style>
  </head>
  <body>
      <div id="loading-screen" class="loading">Loading game...</div>
      <script type="module">
          import init from './target/wasm_bindgen/danmaku-bevy.js';

          async function run() {
              await init();
              document.getElementById('loading-screen').style.display = 'none';
          }

          run().catch(console.error);
      </script>
  </body>
  </html>
  ```

## 阶段二：Bevy与ECS架构实现

### 1. 游戏架构设计

Bevy使用ECS（实体组件系统）架构，这完全不同于传统的面向对象方法：

- **实体（Entity）**：游戏中的对象，仅作为唯一ID存在
- **组件（Component）**：纯数据，不包含行为逻辑
- **系统（System）**：包含游戏逻辑，处理特定组件类型

### 2. 核心组件设计

```rust
// 玩家组件
#[derive(Component)]
struct Player {
    size: f32,
    is_invincible: bool,
    invincibility_timer: Timer,
}

// 子弹组件
#[derive(Component)]
struct Bullet {
    radius: f32,
    color: Color,
}

// 速度组件
#[derive(Component)]
struct Velocity(Vec2);

// 游戏数据资源
#[derive(Resource)]
struct GameData {
    survival_time: f32,
    difficulty: f32,
    bullet_spawn_timer: Timer,
}
```

### 3. 游戏状态

```rust
// 游戏状态
#[derive(Debug, Clone, Copy, Default, Eq, PartialEq, Hash, States)]
enum GameState {
    #[default]
    Menu,
    Playing,
    GameOver,
}
```

### 4. 主游戏系统

```rust
fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "Danmaku Game".into(),
                resolution: (480.0, 640.0).into(),
                ..default()
            }),
            ..default()
        }))
        .insert_resource(GameData {
            survival_time: 0.0,
            difficulty: 1.0,
            bullet_spawn_timer: Timer::from_seconds(0.5, TimerMode::Repeating),
        })
        .add_state::<GameState>()
        // 启动系统
        .add_systems(Startup, setup)
        // 菜单状态系统
        .add_systems(OnEnter(GameState::Menu), setup_menu)
        .add_systems(Update, button_system.run_if(in_state(GameState::Menu)))
        // 游戏状态系统
        .add_systems(OnEnter(GameState::Playing), start_game)
        .add_systems(
            Update,
            (
                player_movement,
                bullet_movement,
                spawn_bullets,
                check_collisions,
                update_game_data,
            )
            .run_if(in_state(GameState::Playing)),
        )
        // 游戏结束状态系统
        .add_systems(OnEnter(GameState::GameOver), setup_game_over)
        .add_systems(Update, game_over_button.run_if(in_state(GameState::GameOver)))
        .run();
}
```

### 5. 游戏核心系统实现

```rust
// 玩家移动系统
fn player_movement(
    time: Res<Time>,
    keyboard_input: Res<Input<KeyCode>>,
    mut player_query: Query<(&mut Transform, &mut Velocity), With<Player>>,
) {
    // 玩家控制逻辑
}

// 子弹移动系统
fn bullet_movement(
    time: Res<Time>,
    mut commands: Commands,
    mut bullet_query: Query<(Entity, &mut Transform, &Velocity), With<Bullet>>,
) {
    // 子弹移动和边界检查
}

// 子弹生成系统
fn spawn_bullets(
    mut commands: Commands,
    time: Res<Time>,
    mut game_data: ResMut<GameData>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    // 根据难度生成不同模式的子弹
}

// 碰撞检测系统
fn check_collisions(
    mut commands: Commands,
    mut next_state: ResMut<NextState<GameState>>,
    player_query: Query<(&Transform, &Player)>,
    bullet_query: Query<(&Transform, &Bullet)>,
) {
    // 检测玩家与子弹的碰撞
}
```

## 阶段三：弹幕模式与视觉效果

### 1. 实现多种弹幕模式

```rust
// 在spawn_bullets系统中
match pattern_type {
    0 => {
        // 圆形弹幕
        let x = rng.gen_range(0.0..WINDOW_WIDTH);
        let count = 8 + (game_data.difficulty as u32 % 8);
        let speed = BULLET_SPEED_BASE + (game_data.difficulty * 10.0);

        for i in 0..count {
            let angle = (i as f32 / count as f32) * std::f32::consts::TAU;
            let velocity = Vec2::new(angle.cos(), angle.sin()) * speed;

            spawn_bullet(&mut commands, &mut meshes, &mut materials,
                Vec2::new(x, 50.0), velocity, 5.0, Color::rgb(1.0, 0.5, 0.0));
        }
    },
    1 => {
        // 随机侧边弹幕
    },
    2 => {
        // 追踪玩家的弹幕
    },
    // 其他模式...
}
```

### 2. 玩家飞船渲染

```rust
// 玩家飞船生成
commands.spawn((
    MaterialMesh2dBundle {
        mesh: meshes.add(shape::RegularPolygon::new(PLAYER_SIZE, 3).into()).into(),
        material: materials.add(ColorMaterial::from(Color::CYAN)),
        transform: Transform::from_translation(Vec3::new(WINDOW_WIDTH / 2.0, WINDOW_HEIGHT * 0.8, 0.0))
            .with_rotation(Quat::from_rotation_z(std::f32::consts::PI)),
        ..default()
    },
    Player {
        size: PLAYER_SIZE,
        is_invincible: false,
        invincibility_timer: Timer::from_seconds(0.0, TimerMode::Once),
    },
    Velocity(Vec2::ZERO),
));
```

## 阶段四：UI系统与游戏状态

### 1. 游戏菜单界面

```rust
fn setup_menu(mut commands: Commands) {
    commands
        .spawn(NodeBundle {
            style: Style {
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                justify_content: JustifyContent::Center,
                align_items: AlignItems::Center,
                flex_direction: FlexDirection::Column,
                ..default()
            },
            background_color: Color::rgb(0.05, 0.05, 0.15).into(),
            ..default()
        })
        .with_children(|parent| {
            // 游戏标题
            parent.spawn(TextBundle::from_section(
                "DANMAKU GAME",
                TextStyle {
                    font_size: 40.0,
                    color: Color::rgb(0.0, 0.9, 0.9),
                    ..default()
                },
            ));

            // 开始按钮
            parent
                .spawn((
                    ButtonBundle {
                        style: Style {
                            width: Val::Px(150.0),
                            height: Val::Px(50.0),
                            margin: UiRect::all(Val::Px(20.0)),
                            justify_content: JustifyContent::Center,
                            align_items: AlignItems::Center,
                            ..default()
                        },
                        background_color: Color::rgb(0.15, 0.15, 0.25).into(),
                        ..default()
                    },
                    MenuButtonAction::Start,
                ))
                .with_children(|parent| {
                    parent.spawn(TextBundle::from_section(
                        "Start Game",
                        TextStyle {
                            font_size: 24.0,
                            color: Color::WHITE,
                            ..default()
                        },
                    ));
                });
        });
}
```

### 2. 游戏结束界面

```rust
fn setup_game_over(
    mut commands: Commands,
    game_data: Res<GameData>,
) {
    commands
        .spawn(NodeBundle {
            style: Style {
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                justify_content: JustifyContent::Center,
                align_items: AlignItems::Center,
                flex_direction: FlexDirection::Column,
                ..default()
            },
            background_color: Color::rgba(0.0, 0.0, 0.0, 0.8).into(),
            ..default()
        })
        .with_children(|parent| {
            // Game Over标题
            parent.spawn(TextBundle::from_section(
                "GAME OVER",
                TextStyle {
                    font_size: 50.0,
                    color: Color::rgb(1.0, 0.2, 0.2),
                    ..default()
                },
            ));

            // 存活时间
            parent.spawn(TextBundle::from_section(
                format!("Survival Time: {:.1} seconds", game_data.survival_time),
                TextStyle {
                    font_size: 30.0,
                    color: Color::WHITE,
                    ..default()
                },
            ));

            // 重新开始按钮
            // ...
        });
}
```

## 阶段五：编译与部署

### 1. 原生应用构建

```bash
# 开发模式构建
cargo run

# 生产模式构建
cargo run --release
```

### 2. WebAssembly构建

```bash
# 构建WebAssembly
cargo build --release --target wasm32-unknown-unknown

# 生成JavaScript绑定
wasm-bindgen --out-dir ./target/wasm_bindgen --target web ./target/wasm32-unknown-unknown/release/danmaku-bevy.wasm

# 启动本地服务器测试
basic-http-server .
```

### 3. 部署更新

更新Vercel配置文件（vercel.json）：

```json
{
  "buildCommand": "rustup target add wasm32-unknown-unknown && cargo install wasm-bindgen-cli && cargo build --release --target wasm32-unknown-unknown && wasm-bindgen --out-dir ./target/wasm_bindgen --target web ./target/wasm32-unknown-unknown/release/danmaku-bevy.wasm",
  "outputDirectory": ".",
  "installCommand": "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
}
```

## 优势与收益

使用Bevy引擎和纯Rust实现相比于原始JavaScript+Canvas方案的优势：

1. **性能大幅提升**：
   - Rust的零成本抽象提供更高效的CPU利用
   - ECS架构优化数据布局，提高缓存命中率
   - 使用GPU加速渲染，而不是依赖CPU渲染的Canvas

2. **代码质量改进**：
   - Rust强类型系统减少运行时错误
   - ECS架构使游戏逻辑更容易理解和扩展
   - 统一的系统接口简化开发

3. **跨平台支持**：
   - 同一份代码可编译为原生应用或WebAssembly
   - 支持Windows、macOS、Linux等多平台
   - 更容易扩展到移动平台

4. **更高级的渲染能力**：
   - 自动批处理渲染提高性能
   - 支持更丰富的视觉效果
   - 可扩展性更强的渲染管线

## 时间估计

- **阶段一（准备与环境设置）**：1天
- **阶段二（Bevy与ECS架构实现）**：3-5天
- **阶段三（弹幕模式与视觉效果）**：2-3天
- **阶段四（UI系统与游戏状态）**：2-3天
- **阶段五（编译与部署）**：1天

总计：约9-12天

## 资源和参考链接

- [Bevy官方网站](https://bevyengine.org/)
- [Bevy官方文档](https://docs.rs/bevy/latest/bevy/)
- [Bevy GitHub仓库](https://github.com/bevyengine/bevy)
- [Rust官方文档](https://www.rust-lang.org/learn)
- [WebAssembly MDN参考](https://developer.mozilla.org/zh-CN/docs/WebAssembly)
- [Bevy Cheatbook](https://bevy-cheatbook.github.io/)
