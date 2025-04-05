use bevy::{
    prelude::*,
    sprite::MaterialMesh2dBundle,
    time::Timer,
    window::{PresentMode, WindowMode},
};
use rand::prelude::*;
use std::time::Duration;

// Game constants
const PLAYER_SIZE: f32 = 10.0;
const PLAYER_SPEED: f32 = 200.0;
const BULLET_SPEED_BASE: f32 = 100.0;
const BULLET_SPAWN_TIMER: f32 = 0.5;
const WINDOW_WIDTH: f32 = 480.0;
const WINDOW_HEIGHT: f32 = 640.0;

// Game states
#[derive(Debug, Clone, Copy, Default, Eq, PartialEq, Hash, States)]
enum GameState {
    #[default]
    Menu,
    Playing,
    GameOver,
}

// ECS Components
#[derive(Component)]
struct Player {
    size: f32,
    is_invincible: bool,
    invincibility_timer: Timer,
}

#[derive(Component)]
struct Bullet {
    radius: f32,
    color: Color,
}

#[derive(Component)]
struct Velocity(Vec2);

#[derive(Component)]
struct MainCamera;

// Resources
#[derive(Resource)]
struct GameData {
    survival_time: f32,
    difficulty: f32,
    bullet_spawn_timer: Timer,
}

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "Danmaku Game".into(),
                resolution: (WINDOW_WIDTH, WINDOW_HEIGHT).into(),
                present_mode: PresentMode::AutoVsync,
                mode: WindowMode::Windowed,
                ..default()
            }),
            ..default()
        }))
        .insert_resource(GameData {
            survival_time: 0.0,
            difficulty: 1.0,
            bullet_spawn_timer: Timer::from_seconds(BULLET_SPAWN_TIMER, TimerMode::Repeating),
        })
        .add_state::<GameState>()
        .add_systems(Startup, setup)
        // Menu state systems
        .add_systems(OnEnter(GameState::Menu), setup_menu)
        .add_systems(Update, button_system.run_if(in_state(GameState::Menu)))
        // Playing state systems
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
        // Game over state systems
        .add_systems(OnEnter(GameState::GameOver), setup_game_over)
        .add_systems(
            Update,
            game_over_button.run_if(in_state(GameState::GameOver)),
        )
        .run();
}

// Initial setup
fn setup(mut commands: Commands) {
    // 设置相机位置在窗口中心
    commands.spawn((Camera2dBundle {
        transform: Transform::from_translation(Vec3::new(WINDOW_WIDTH / 2.0, WINDOW_HEIGHT / 2.0, 999.9)),
        ..default()
    }, MainCamera));
}

// Menu screen setup
fn setup_menu(mut commands: Commands, _asset_server: Res<AssetServer>) {
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
            // Title
            parent.spawn(TextBundle::from_section(
                "DANMAKU GAME",
                TextStyle {
                    font_size: 40.0,
                    color: Color::rgb(0.0, 0.9, 0.9),
                    ..default()
                },
            ));

            // Start Button
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

// UI button component
#[derive(Component)]
enum MenuButtonAction {
    Start,
    Restart,
}

// Start button behavior
fn button_system(
    mut interaction_query: Query<
        (&Interaction, &MenuButtonAction),
        (Changed<Interaction>, With<Button>),
    >,
    mut next_state: ResMut<NextState<GameState>>,
) {
    for (interaction, action) in &mut interaction_query {
        match (*interaction, action) {
            (Interaction::Pressed, MenuButtonAction::Start) => {
                next_state.set(GameState::Playing);
            }
            _ => {}
        }
    }
}

// Start the game
fn start_game(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    mut game_data: ResMut<GameData>,
    menu_ui: Query<Entity, With<Node>>,
) {
    // Remove menu UI
    for entity in menu_ui.iter() {
        commands.entity(entity).despawn_recursive();
    }

    // Reset game data
    game_data.survival_time = 0.0;
    game_data.difficulty = 1.0;
    game_data.bullet_spawn_timer.reset();

    // Spawn player
    commands.spawn((
        MaterialMesh2dBundle {
            mesh: meshes
                .add(shape::RegularPolygon::new(PLAYER_SIZE, 3).into())
                .into(),
            material: materials.add(ColorMaterial::from(Color::CYAN)),
            transform: Transform::from_translation(Vec3::new(
                WINDOW_WIDTH / 2.0,
                WINDOW_HEIGHT * 0.2,
                10.0,
            ))
            .with_scale(Vec3::splat(1.5))
            .with_rotation(Quat::from_rotation_z(0.0)),
            ..default()
        },
        Player {
            size: PLAYER_SIZE,
            is_invincible: false,
            invincibility_timer: Timer::from_seconds(0.0, TimerMode::Once),
        },
        Velocity(Vec2::ZERO),
    ));

    // Add UI for survival time
    commands
        .spawn(NodeBundle {
            style: Style {
                width: Val::Percent(100.0),
                height: Val::Px(40.0),
                position_type: PositionType::Absolute,
                top: Val::Px(0.0),
                justify_content: JustifyContent::FlexEnd,
                align_items: AlignItems::Center,
                padding: UiRect::all(Val::Px(10.0)),
                ..default()
            },
            background_color: Color::rgba(0.0, 0.0, 0.0, 0.3).into(),
            ..default()
        })
        .with_children(|parent| {
            parent.spawn((
                TextBundle::from_section(
                    "Time: 0.0",
                    TextStyle {
                        font_size: 24.0,
                        color: Color::WHITE,
                        ..default()
                    },
                ),
                SurvivalTimeText,
            ));
        });
}

// UI component for survival time text
#[derive(Component)]
struct SurvivalTimeText;

// Update game data (time, difficulty)
fn update_game_data(
    time: Res<Time>,
    mut game_data: ResMut<GameData>,
    mut survival_time_query: Query<&mut Text, With<SurvivalTimeText>>,
) {
    // Update time
    game_data.survival_time += time.delta_seconds();

    // Update difficulty
    game_data.difficulty = 1.0 + (game_data.survival_time / 15.0);

    // Update timer for bullet spawning
    game_data.bullet_spawn_timer.tick(time.delta());

    // Update UI text
    if let Ok(mut text) = survival_time_query.get_single_mut() {
        text.sections[0].value = format!("Time: {:.1}", game_data.survival_time);
    }
}

// Handle player movement with keyboard
fn player_movement(
    time: Res<Time>,
    keyboard_input: Res<Input<KeyCode>>,
    mut player_query: Query<(&mut Transform, &mut Velocity), With<Player>>,
) {
    if let Ok((mut transform, mut velocity)) = player_query.get_single_mut() {
        let mut direction = Vec2::ZERO;

        // WASD or Arrow keys
        if keyboard_input.any_pressed([KeyCode::Left, KeyCode::A]) {
            direction.x -= 1.0;
        }
        if keyboard_input.any_pressed([KeyCode::Right, KeyCode::D]) {
            direction.x += 1.0;
        }
        if keyboard_input.any_pressed([KeyCode::Up, KeyCode::W]) {
            direction.y += 1.0;
        }
        if keyboard_input.any_pressed([KeyCode::Down, KeyCode::S]) {
            direction.y -= 1.0;
        }

        // Normalize direction and set velocity
        if direction != Vec2::ZERO {
            direction = direction.normalize();
        }
        velocity.0 = direction * PLAYER_SPEED;

        // Update position
        transform.translation.x += velocity.0.x * time.delta_seconds();
        transform.translation.y += velocity.0.y * time.delta_seconds();

        // Clamp to screen bounds
        transform.translation.x = transform
            .translation
            .x
            .max(PLAYER_SIZE)
            .min(WINDOW_WIDTH - PLAYER_SIZE);
        transform.translation.y = transform
            .translation
            .y
            .max(PLAYER_SIZE)
            .min(WINDOW_HEIGHT - PLAYER_SIZE);
    }
}

// Move bullets
fn bullet_movement(
    time: Res<Time>,
    mut commands: Commands,
    mut bullet_query: Query<(Entity, &mut Transform, &Velocity), With<Bullet>>,
) {
    for (entity, mut transform, velocity) in bullet_query.iter_mut() {
        transform.translation.x += velocity.0.x * time.delta_seconds();
        transform.translation.y += velocity.0.y * time.delta_seconds();

        // Remove bullets that are out of bounds (with some margin)
        if transform.translation.x < -50.0
            || transform.translation.x > WINDOW_WIDTH + 50.0
            || transform.translation.y < -50.0
            || transform.translation.y > WINDOW_HEIGHT + 50.0
        {
            commands.entity(entity).despawn();
        }
    }
}

// Spawn bullets
fn spawn_bullets(
    mut commands: Commands,
    time: Res<Time>,
    mut game_data: ResMut<GameData>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    // Check if it's time to spawn bullets
    if !game_data.bullet_spawn_timer.finished() {
        return;
    }

    // Calculate difficulty-adjusted timer duration
    let difficulty = game_data.difficulty;
    let new_duration = BULLET_SPAWN_TIMER / difficulty;

    // Reset timer with adjusted interval based on difficulty
    game_data
        .bullet_spawn_timer
        .set_duration(Duration::from_secs_f32(new_duration));
    game_data.bullet_spawn_timer.reset();

    // Randomly choose a bullet pattern
    let mut rng = thread_rng();
    let pattern_type = rng.gen_range(0..3);

    match pattern_type {
        0 => {
            // Circle pattern from top of screen
            let x = rng.gen_range(0.0..WINDOW_WIDTH);
            let count = 8 + (game_data.difficulty as u32 % 8);
            let speed = BULLET_SPEED_BASE + (game_data.difficulty * 10.0);

            for i in 0..count {
                let angle = (i as f32 / count as f32) * std::f32::consts::TAU;
                let velocity = Vec2::new(angle.cos(), angle.sin()) * speed;

                spawn_bullet(
                    &mut commands,
                    &mut meshes,
                    &mut materials,
                    Vec2::new(x, 50.0),
                    velocity,
                    5.0,
                    Color::rgb(1.0, 0.5, 0.0),
                );
            }
        }
        1 => {
            // Random bullets from sides
            let from_left = rng.gen_bool(0.5);
            let x = if from_left { 0.0 } else { WINDOW_WIDTH };
            let vx = if from_left { 1.0 } else { -1.0 };

            let y = rng.gen_range(50.0..WINDOW_HEIGHT - 100.0);
            let speed = BULLET_SPEED_BASE + (game_data.difficulty * 8.0);

            for _ in 0..5 {
                let vy = rng.gen_range(-0.5..0.5);
                let velocity = Vec2::new(vx, vy).normalize() * speed;

                spawn_bullet(
                    &mut commands,
                    &mut meshes,
                    &mut materials,
                    Vec2::new(x, y),
                    velocity,
                    6.0,
                    Color::rgb(0.0, 0.8, 0.8),
                );
            }
        }
        2 => {
            // Aimed pattern (at player) from random position at top
            let x = rng.gen_range(50.0..WINDOW_WIDTH - 50.0);
            let speed = BULLET_SPEED_BASE + (game_data.difficulty * 5.0);

            // Aim at center-bottom area (simplified targeting)
            let target_pos = Vec2::new(WINDOW_WIDTH / 2.0, WINDOW_HEIGHT * 0.8);
            let direction = (target_pos - Vec2::new(x, 50.0)).normalize();

            // Fan pattern
            let spread = 0.4;
            let count = 5;

            for i in 0..count {
                let angle_offset = spread * ((i as f32 / (count - 1) as f32) - 0.5);
                let rot = Mat2::from_angle(angle_offset);
                let dir = rot * direction;

                spawn_bullet(
                    &mut commands,
                    &mut meshes,
                    &mut materials,
                    Vec2::new(x, 50.0),
                    dir * speed,
                    4.0,
                    Color::rgb(1.0, 0.2, 0.4),
                );
            }
        }
        _ => {}
    }
}

// Helper function to spawn a bullet
fn spawn_bullet(
    commands: &mut Commands,
    meshes: &mut ResMut<Assets<Mesh>>,
    materials: &mut ResMut<Assets<ColorMaterial>>,
    position: Vec2,
    velocity: Vec2,
    radius: f32,
    color: Color,
) {
    commands.spawn((
        MaterialMesh2dBundle {
            mesh: meshes.add(shape::Circle::new(radius).into()).into(),
            material: materials.add(ColorMaterial::from(color)),
            transform: Transform::from_translation(Vec3::new(position.x, position.y, 0.0)),
            ..default()
        },
        Bullet { radius, color },
        Velocity(velocity),
    ));
}

// Check for collisions between player and bullets
fn check_collisions(
    _commands: Commands,
    mut next_state: ResMut<NextState<GameState>>,
    player_query: Query<(&Transform, &Player)>,
    bullet_query: Query<(&Transform, &Bullet)>,
) {
    // Get player data
    if let Ok((player_transform, player)) = player_query.get_single() {
        // Skip collision check if player is invincible
        if player.is_invincible {
            return;
        }

        let player_pos = player_transform.translation.truncate();

        // Check against all bullets
        for (bullet_transform, bullet) in bullet_query.iter() {
            let bullet_pos = bullet_transform.translation.truncate();
            let distance = player_pos.distance(bullet_pos);

            // Collision detected
            if distance < (player.size + bullet.radius) {
                // Game over
                next_state.set(GameState::GameOver);
                return;
            }
        }
    }
}

// Game over screen setup
fn setup_game_over(mut commands: Commands, game_data: Res<GameData>) {
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
            // Game Over Title
            parent.spawn(TextBundle::from_section(
                "GAME OVER",
                TextStyle {
                    font_size: 50.0,
                    color: Color::rgb(1.0, 0.2, 0.2),
                    ..default()
                },
            ));

            // Survival time
            parent.spawn(TextBundle::from_section(
                format!("Survival Time: {:.1} seconds", game_data.survival_time),
                TextStyle {
                    font_size: 30.0,
                    color: Color::WHITE,
                    ..default()
                },
            ));

            // Restart button
            parent
                .spawn((
                    ButtonBundle {
                        style: Style {
                            width: Val::Px(200.0),
                            height: Val::Px(50.0),
                            margin: UiRect::all(Val::Px(20.0)),
                            justify_content: JustifyContent::Center,
                            align_items: AlignItems::Center,
                            ..default()
                        },
                        background_color: Color::rgb(0.15, 0.15, 0.25).into(),
                        ..default()
                    },
                    MenuButtonAction::Restart,
                ))
                .with_children(|parent| {
                    parent.spawn(TextBundle::from_section(
                        "Play Again",
                        TextStyle {
                            font_size: 24.0,
                            color: Color::WHITE,
                            ..default()
                        },
                    ));
                });
        });
}

// Game over button behavior
fn game_over_button(
    mut interaction_query: Query<
        (&Interaction, &MenuButtonAction),
        (Changed<Interaction>, With<Button>),
    >,
    mut next_state: ResMut<NextState<GameState>>,
) {
    for (interaction, action) in &mut interaction_query {
        match (*interaction, action) {
            (Interaction::Pressed, MenuButtonAction::Restart) => {
                next_state.set(GameState::Playing);
            }
            _ => {}
        }
    }
}
