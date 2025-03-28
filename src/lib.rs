mod bullet;
mod collision;
mod game;
mod patterns;
mod player;
mod utils;

use wasm_bindgen::prelude::*;

// Initialize panic hook for better error messages in WASM
#[wasm_bindgen(start)]
pub fn start() {
    utils::set_panic_hook();
}

// Re-export game types for JavaScript
pub use game::DanmakuGame;
pub use game::GameState;

pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
