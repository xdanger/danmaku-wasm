use nalgebra::Vector2;

pub struct Bullet {
    pub position: Vector2<f64>,
    pub velocity: Vector2<f64>,
    pub radius: f64,
    pub color: String,
}

#[allow(dead_code)]impl Bullet {
    pub fn new(x: f64, y: f64, vx: f64, vy: f64, radius: f64, color: &str) -> Self {
        Self {
            position: Vector2::new(x, y),
            velocity: Vector2::new(vx, vy),
            radius,
            color: color.to_string(),
        }
    }

    pub fn update(&mut self, delta_time: f64) {
        // Update position based on velocity
        self.position += self.velocity * delta_time;
    }
}
