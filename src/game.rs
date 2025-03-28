use crate::bullet::Bullet;
use crate::collision::check_all_collisions;
use crate::patterns::create_circle_pattern;
use crate::player::Player;
use js_sys::Math;
use wasm_bindgen::prelude::*;

// Game state enum
#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq)]
pub enum GameState {
    Menu,
    Playing,
    GameOver,
}

// Main game class
#[wasm_bindgen]
pub struct DanmakuGame {
    width: f64,
    height: f64,
    player: Player,
    bullets: Vec<Bullet>,
    state: GameState,
    survival_time: f64,
    spawn_timer: f64,
    difficulty: f64,
}

// Implementation exposed to JavaScript
#[wasm_bindgen]
impl DanmakuGame {
    // Create a new game instance
    #[wasm_bindgen(constructor)]
    pub fn new(width: f64, height: f64) -> Self {
        let player = Player::new(width / 2.0, height * 0.8);

        Self {
            width,
            height,
            player,
            bullets: Vec::new(),
            state: GameState::Menu,
            survival_time: 0.0,
            spawn_timer: 0.0,
            difficulty: 1.0,
        }
    }

    // Start the game
    pub fn start_game(&mut self) {
        self.state = GameState::Playing;
        self.survival_time = 0.0;
        self.bullets.clear();
        self.player = Player::new(self.width / 2.0, self.height * 0.8);
    }

    // Reset the game
    pub fn reset(&mut self) {
        self.state = GameState::Menu;
        self.survival_time = 0.0;
        self.bullets.clear();
        self.difficulty = 1.0;
    }

    // Update game state each frame
    pub fn update(&mut self, delta_time: f64) -> JsValue {
        let ms_delta = delta_time / 1000.0; // Convert to seconds

        if self.state == GameState::Playing {
            // Update survival time
            self.survival_time += ms_delta;

            // Update player
            self.player.update(ms_delta, self.width, self.height);

            // Update bullets
            let mut bullets_to_remove = Vec::new();
            for (i, bullet) in self.bullets.iter_mut().enumerate() {
                bullet.update(ms_delta);

                // Remove bullets that are out of bounds
                if bullet.position.x < -50.0
                    || bullet.position.x > self.width + 50.0
                    || bullet.position.y < -50.0
                    || bullet.position.y > self.height + 50.0
                {
                    bullets_to_remove.push(i);
                }
            }

            // Remove bullets from back to front to avoid index issues
            for &i in bullets_to_remove.iter().rev() {
                if i < self.bullets.len() {
                    self.bullets.swap_remove(i);
                }
            }

            // Spawn new bullets
            self.spawn_timer -= ms_delta;
            if self.spawn_timer <= 0.0 {
                self.spawn_bullets();
                self.spawn_timer = 0.5 / self.difficulty; // Adjust spawn rate with difficulty
            }

            // Check for collisions
            if check_all_collisions(&self.player, &self.bullets) {
                self.state = GameState::GameOver;
            }

            // Increase difficulty over time
            self.difficulty = 1.0 + (self.survival_time / 15.0);
        }

        // Return a JS object with render data
        self.get_render_data()
    }

    // Move player based on keyboard input
    pub fn set_player_velocity(&mut self, dx: f64, dy: f64) {
        self.player.velocity.x = dx * 200.0; // Adjust speed as needed
        self.player.velocity.y = dy * 200.0;
    }

    // Get current game state
    pub fn get_state(&self) -> GameState {
        self.state
    }

    // Get survival time
    pub fn get_survival_time(&self) -> f64 {
        self.survival_time
    }

    // Get render data for JavaScript
    fn get_render_data(&self) -> JsValue {
        let obj = js_sys::Object::new();

        // Add player data
        js_sys::Reflect::set(
            &obj,
            &JsValue::from_str("playerX"),
            &JsValue::from_f64(self.player.position.x),
        )
        .unwrap();

        js_sys::Reflect::set(
            &obj,
            &JsValue::from_str("playerY"),
            &JsValue::from_f64(self.player.position.y),
        )
        .unwrap();

        // Add game state
        js_sys::Reflect::set(
            &obj,
            &JsValue::from_str("gameState"),
            &JsValue::from_f64(self.state as u32 as f64),
        )
        .unwrap();

        // Add survival time
        js_sys::Reflect::set(
            &obj,
            &JsValue::from_str("survivalTime"),
            &JsValue::from_f64(self.survival_time),
        )
        .unwrap();

        // Add bullets array
        let bullets_array = js_sys::Array::new();
        for bullet in &self.bullets {
            let bullet_obj = js_sys::Object::new();

            js_sys::Reflect::set(
                &bullet_obj,
                &JsValue::from_str("x"),
                &JsValue::from_f64(bullet.position.x),
            )
            .unwrap();

            js_sys::Reflect::set(
                &bullet_obj,
                &JsValue::from_str("y"),
                &JsValue::from_f64(bullet.position.y),
            )
            .unwrap();

            js_sys::Reflect::set(
                &bullet_obj,
                &JsValue::from_str("radius"),
                &JsValue::from_f64(bullet.radius),
            )
            .unwrap();

            js_sys::Reflect::set(
                &bullet_obj,
                &JsValue::from_str("color"),
                &JsValue::from_str(&bullet.color),
            )
            .unwrap();

            // 添加速度信息 - 便于在前端创建更好的视觉效果
            let velocity_obj = js_sys::Object::new();
            js_sys::Reflect::set(
                &velocity_obj,
                &JsValue::from_str("x"),
                &JsValue::from_f64(bullet.velocity.x),
            )
            .unwrap();
            js_sys::Reflect::set(
                &velocity_obj,
                &JsValue::from_str("y"),
                &JsValue::from_f64(bullet.velocity.y),
            )
            .unwrap();
            js_sys::Reflect::set(&bullet_obj, &JsValue::from_str("velocity"), &velocity_obj)
                .unwrap();

            bullets_array.push(&bullet_obj);
        }

        js_sys::Reflect::set(&obj, &JsValue::from_str("bullets"), &bullets_array).unwrap();

        obj.into()
    }

    // Spawn new bullets
    fn spawn_bullets(&mut self) {
        // Randomly choose a bullet pattern
        let pattern_type = (Math::random() * 3.0).floor() as i32;

        match pattern_type {
            0 => {
                // Circle pattern from top of screen
                let x = Math::random() * self.width;
                let center = nalgebra::Vector2::new(x, 50.0);
                let count = 8 + (self.difficulty as u32 % 8);
                let speed = 80.0 + (self.difficulty * 10.0);

                let mut new_bullets = create_circle_pattern(center, count as usize, speed);
                self.bullets.append(&mut new_bullets);
            }
            1 => {
                // Random bullets from sides
                let side = (Math::random() * 2.0).floor() as i32;
                let mut x = 0.0;
                let mut vx = 1.0;

                if side == 1 {
                    x = self.width;
                    vx = -1.0;
                }

                let y = Math::random() * self.height * 0.7;
                let position = nalgebra::Vector2::new(x, y);
                let angle =
                    Math::random() * std::f64::consts::PI / 2.0 - std::f64::consts::PI / 4.0;
                let speed = 100.0 + (self.difficulty * 20.0);
                let velocity =
                    nalgebra::Vector2::new(vx * angle.cos() * speed, angle.sin() * speed);

                self.bullets.push(Bullet {
                    position,
                    velocity,
                    radius: 6.0,
                    color: "#00FFFF".to_string(),
                });
            }
            _ => {
                // Aimed at player
                let x = Math::random() * self.width;
                let position = nalgebra::Vector2::new(x, 10.0);

                // Calculate direction to player
                let mut direction = self.player.position - position;
                if direction.magnitude() > 0.0 {
                    direction = direction.normalize();
                }

                let speed = 120.0 + (self.difficulty * 15.0);
                let velocity = direction * speed;

                self.bullets.push(Bullet {
                    position,
                    velocity,
                    radius: 8.0,
                    color: "#FF0000".to_string(),
                });
            }
        }
    }
}
