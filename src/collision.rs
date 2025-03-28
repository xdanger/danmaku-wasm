use crate::bullet::Bullet;
use crate::player::Player;

// Check collision between a player and a bullet
pub fn check_collision(player: &Player, bullet: &Bullet) -> bool {
    // Calculate distance between centers
    let distance = (player.position - bullet.position).magnitude();

    // Check if distance is less than the sum of radii
    distance < (player.size + bullet.radius)
}

// Check all collisions between player and bullets
pub fn check_all_collisions(player: &Player, bullets: &[Bullet]) -> bool {
    // If player is invincible, no collisions happen
    if player.is_invincible {
        return false;
    }

    // Check each bullet for collision with player
    bullets.iter().any(|bullet| check_collision(player, bullet))
}
