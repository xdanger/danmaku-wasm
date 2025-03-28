/**
 * 游戏控制器 - 3D版本
 */

// 键盘控制器
class KeyboardController {
    constructor(game) {
        this.game = game;
        this.keys = {};
        
        // 绑定键盘事件
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    handleKeyDown(event) {
        this.keys[event.key] = true;
    }

    handleKeyUp(event) {
        this.keys[event.key] = false;
    }

    update() {
        // 如果游戏没有运行，不处理按键
        if (!this.game.isRunning) return;
        if (!this.game.player) return;

        let dirX = 0;
        let dirY = 0;

        // WASD 控制 - 修正上下方向
        if (this.keys['w'] || this.keys['W'] || this.keys['ArrowUp']) dirY = 1; // 原来是-1，反向了
        if (this.keys['s'] || this.keys['S'] || this.keys['ArrowDown']) dirY = -1; // 原来是1，反向了
        if (this.keys['a'] || this.keys['A'] || this.keys['ArrowLeft']) dirX = -1;
        if (this.keys['d'] || this.keys['D'] || this.keys['ArrowRight']) dirX = 1;

        // 对角线移动时，归一化向量以保持一致的速度
        if (dirX !== 0 && dirY !== 0) {
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            dirX /= length;
            dirY /= length;
        }

        // 设置玩家速度
        this.game.player.setVelocity(dirX, dirY);
    }
}

// 虚拟摇杆控制器
class VirtualJoystickController {
    constructor(game) {
        this.game = game;
        this.joystickElement = document.getElementById('virtual-joystick');
        this.baseElement = document.getElementById('joystick-base');
        this.thumbElement = document.getElementById('joystick-thumb');
        
        this.active = false;
        this.centerX = 0;
        this.centerY = 0;
        this.currentX = 0;
        this.currentY = 0;
        
        this.maxDistance = 40; // 摇杆最大移动距离

        // 检测是否为移动设备
        this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (this.isMobileDevice) {
            this.joystickElement.classList.remove('hidden');
            
            // 绑定触摸事件
            this.baseElement.addEventListener('touchstart', this.handleTouchStart.bind(this));
            document.addEventListener('touchmove', this.handleTouchMove.bind(this));
            document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        }
    }

    handleTouchStart(event) {
        if (!this.game.isRunning || !this.game.player) return;
        
        event.preventDefault();
        
        const touch = event.touches[0];
        const rect = this.baseElement.getBoundingClientRect();
        
        this.active = true;
        this.centerX = rect.left + rect.width / 2;
        this.centerY = rect.top + rect.height / 2;
        this.currentX = this.centerX;
        this.currentY = this.centerY;
        
        this.updateJoystickPosition(touch.clientX, touch.clientY);
    }

    handleTouchMove(event) {
        if (!this.active || !this.game.isRunning || !this.game.player) return;
        
        event.preventDefault();
        
        const touch = event.touches[0];
        this.updateJoystickPosition(touch.clientX, touch.clientY);
    }

    handleTouchEnd(event) {
        if (!this.active || !this.game.player) return;
        
        this.active = false;
        
        // 重置摇杆位置
        this.thumbElement.style.transform = 'translate(-50%, -50%)';
        
        // 停止玩家移动
        this.game.player.setVelocity(0, 0);
    }

    updateJoystickPosition(touchX, touchY) {
        // 计算与中心的距离
        let deltaX = touchX - this.centerX;
        let deltaY = touchY - this.centerY;
        
        // 计算距离
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 如果超出最大距离，进行归一化
        if (distance > this.maxDistance) {
            deltaX = deltaX / distance * this.maxDistance;
            deltaY = deltaY / distance * this.maxDistance;
        }
        
        // 更新摇杆图形位置
        this.thumbElement.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
        
        // 计算归一化的方向向量
        const dirX = distance > 0 ? deltaX / this.maxDistance : 0;
        const dirY = distance > 0 ? -deltaY / this.maxDistance : 0; // 反转Y轴方向，向上为正
        
        // 更新玩家速度
        this.game.player.setVelocity(dirX, dirY);
    }

    update() {
        // 虚拟摇杆的状态更新在触摸事件中处理
    }
} 