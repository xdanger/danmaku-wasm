use crate::bullet::Bullet;
use nalgebra::Vector2;
use std::f64::consts::PI;

// Create a circle pattern of bullets
pub fn create_circle_pattern(
    center: Vector2<f64>,
    bullets_count: usize,
    speed: f64,
) -> Vec<Bullet> {
    let mut bullets = Vec::with_capacity(bullets_count);

    for i in 0..bullets_count {
        let angle = 2.0 * PI * (i as f64) / (bullets_count as f64);
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

#[allow(dead_code)]// Create a spiral pattern of bullets
pub fn create_spiral_pattern(
    center: Vector2<f64>,
    bullets_count: usize,
    speed: f64,
    turns: f64,
) -> Vec<Bullet> {
    let mut bullets = Vec::with_capacity(bullets_count);

    for i in 0..bullets_count {
        let angle = turns * 2.0 * PI * (i as f64) / (bullets_count as f64);
        let velocity = Vector2::new(angle.cos() * speed, angle.sin() * speed);

        bullets.push(Bullet {
            position: center,
            velocity,
            radius: 5.0,
            color: "#FFFF00".to_string(),
        });
    }

    bullets
}

#[allow(dead_code)]// Create a wave pattern of bullets
pub fn create_wave_pattern(
    start_x: f64,
    start_y: f64,
    bullets_count: usize,
    speed: f64,
    amplitude: f64,
    frequency: f64,
) -> Vec<Bullet> {
    let mut bullets = Vec::with_capacity(bullets_count);

    for i in 0..bullets_count {
        let phase = (i as f64) * frequency;
        let x = start_x + (i as f64) * 15.0; // Horizontal spacing
        let y = start_y + amplitude * (phase).sin();

        bullets.push(Bullet {
            position: Vector2::new(x, y),
            velocity: Vector2::new(0.0, speed),
            radius: 4.0,
            color: "#00FF00".to_string(),
        });
    }

    bullets
}
