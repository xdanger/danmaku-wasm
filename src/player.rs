use nalgebra::Vector2;

pub struct Player {
    pub position: Vector2<f64>,
    pub velocity: Vector2<f64>,
    pub size: f64,
    pub is_invincible: bool,
    invincibility_timer: f64,
}

impl Player {
    pub fn new(x: f64, y: f64) -> Self {
        Self {
            position: Vector2::new(x, y),
            velocity: Vector2::new(0.0, 0.0),
            size: 10.0,
            is_invincible: false,
            invincibility_timer: 0.0,
        }
    }

    pub fn update(&mut self, delta_time: f64, width: f64, height: f64) {
        // Update position based on velocity
        self.position += self.velocity * delta_time;

        // Boundary checks
        self.position.x = self.position.x.max(self.size).min(width - self.size);
        self.position.y = self.position.y.max(self.size).min(height - self.size);

        // Handle invincibility timer
        if self.is_invincible {
            self.invincibility_timer -= delta_time;
            if self.invincibility_timer <= 0.0 {
                self.is_invincible = false;
            }
        }
    }
    #[allow(dead_code)]
    pub fn make_invincible(&mut self, duration: f64) {
        self.is_invincible = true;
        self.invincibility_timer = duration;
    }
}
