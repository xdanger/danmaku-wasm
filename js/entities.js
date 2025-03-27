/**
 * 游戏实体类
 */

// 玩家飞机类
class Player {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 5; // 基础移动速度
        this.game = game;
        this.velocityX = 0;
        this.velocityY = 0;
        this.invincible = false;
        this.invincibleTime = 0;
        this.color = '#3498db';
        
        // 碰撞半径 - 使用小于视觉大小的半径，提供更精确的碰撞
        this.collisionRadius = Math.min(this.width, this.height) * 0.4;
    }

    update(deltaTime) {
        // 根据当前速度更新位置
        this.x += this.velocityX;
        this.y += this.velocityY;

        // 边界检测，防止飞机飞出屏幕
        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
        if (this.x + this.width > this.game.canvas.width) this.x = this.game.canvas.width - this.width;
        if (this.y + this.height > this.game.canvas.height) this.y = this.game.canvas.height - this.height;

        // 处理无敌状态
        if (this.invincible) {
            this.invincibleTime -= deltaTime;
            if (this.invincibleTime <= 0) {
                this.invincible = false;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        
        // 飞机主体
        if (this.invincible) {
            // 无敌状态闪烁效果
            if (Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.globalAlpha = 0.5;
            }
        }
        
        // 飞机三角形
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // 引擎效果
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width * 0.3, this.y + this.height);
        ctx.lineTo(this.x + this.width * 0.5, this.y + this.height + 10);
        ctx.lineTo(this.x + this.width * 0.7, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    setVelocity(x, y) {
        this.velocityX = x * this.speed;
        this.velocityY = y * this.speed;
    }

    makeInvincible(duration) {
        this.invincible = true;
        this.invincibleTime = duration;
    }

    getBoundingBox() {
        // 返回圆形碰撞区域
        return {
            type: 'circle',
            x: this.x + this.width / 2,  // 中心点 X
            y: this.y + this.height * 0.6,  // 中心点 Y (稍微靠下一点，更符合飞机形状)
            radius: this.collisionRadius
        };
    }
    
    // 添加一个方法用于调试碰撞区域
    drawCollisionArea(ctx) {
        if (!this.game.isDebug) return;
        
        const box = this.getBoundingBox();
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 1;
        
        // 绘制碰撞圆形
        ctx.beginPath();
        ctx.arc(box.x, box.y, box.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}

// 弹幕类
class Bullet {
    constructor(x, y, speedX, speedY, radius, color, game, trackingType = 'none', rotationSpeed = 0) {
        this.x = x;
        this.y = y;
        this.speedX = speedX;
        this.speedY = speedY;
        this.radius = radius || 5;
        this.color = color || "#ff0000";
        this.game = game;
        this.active = true;
        
        // 追踪类型: none(无视玩家), initial(初始位置追踪), active(实时追踪)
        this.trackingType = trackingType;
        
        // 保存追踪目标位置
        if (trackingType === 'initial' && game.player) {
            this.targetX = game.player.x + game.player.width / 2;
            this.targetY = game.player.y + game.player.height / 2;
        }
        
        // 旋转速度 (弧度/帧)
        this.rotationSpeed = rotationSpeed;
        this.angle = Math.atan2(speedY, speedX);
        
        // 基础速度大小(用于追踪时保持一致的速度)
        this.speed = Math.sqrt(speedX * speedX + speedY * speedY);
    }

    update(deltaTime) {
        if (this.trackingType === 'active' && this.game.player) {
            // 实时追踪玩家
            const targetX = this.game.player.x + this.game.player.width / 2;
            const targetY = this.game.player.y + this.game.player.height / 2;
            
            // 计算方向
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // 更新角度（缓慢转向玩家）
            const targetAngle = Math.atan2(dy, dx);
            const angleDiff = targetAngle - this.angle;
            
            // 处理角度跨越 -PI 到 PI 的边界
            let normalizedDiff = angleDiff;
            if (angleDiff > Math.PI) normalizedDiff -= Math.PI * 2;
            if (angleDiff < -Math.PI) normalizedDiff += Math.PI * 2;
            
            // 逐渐调整角度
            this.angle += normalizedDiff * 0.02;
            
            // 更新速度
            this.speedX = Math.cos(this.angle) * this.speed;
            this.speedY = Math.sin(this.angle) * this.speed;
            
        } else if (this.trackingType === 'initial') {
            // 向初始记录的玩家位置移动
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) { // 当距离足够近时停止调整
                const targetAngle = Math.atan2(dy, dx);
                const angleDiff = targetAngle - this.angle;
                
                // 处理角度跨越 -PI 到 PI 的边界
                let normalizedDiff = angleDiff;
                if (angleDiff > Math.PI) normalizedDiff -= Math.PI * 2;
                if (angleDiff < -Math.PI) normalizedDiff += Math.PI * 2;
                
                // 逐渐调整角度
                this.angle += normalizedDiff * 0.01;
                
                // 更新速度
                this.speedX = Math.cos(this.angle) * this.speed;
                this.speedY = Math.sin(this.angle) * this.speed;
            }
        } else if (this.rotationSpeed !== 0) {
            // 旋转弹幕
            this.angle += this.rotationSpeed * deltaTime * 0.01;
            this.speedX = Math.cos(this.angle) * this.speed;
            this.speedY = Math.sin(this.angle) * this.speed;
        }
        
        // 更新位置
        this.x += this.speedX * deltaTime;
        this.y += this.speedY * deltaTime;

        // 弹幕超出屏幕边界时标记为非活跃
        if (this.x < -this.radius * 2 || 
            this.x > this.game.canvas.width + this.radius * 2 || 
            this.y < -this.radius * 2 || 
            this.y > this.game.canvas.height + this.radius * 2) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // 追踪弹幕特效（显示追踪尾迹）
        if (this.trackingType === 'active') {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x - Math.cos(this.angle) * this.radius * 2,
                this.y - Math.sin(this.angle) * this.radius * 2
            );
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.radius * 0.7;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    getBoundingBox() {
        // 返回圆形碰撞区域
        return {
            type: 'circle',
            x: this.x,
            y: this.y,
            radius: this.radius * 0.9 // 稍微缩小碰撞半径，让游戏更友好
        };
    }
    
    // 添加一个方法用于调试碰撞区域
    drawCollisionArea(ctx) {
        if (!this.game.isDebug) return;
        
        const box = this.getBoundingBox();
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 1;
        
        // 绘制碰撞圆形
        ctx.beginPath();
        ctx.arc(box.x, box.y, box.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}

// 弹幕发射器类
class BulletEmitter {
    constructor(game) {
        this.game = game;
        this.patterns = {
            // 全方向发射
            circular: (x, y, count, speed, radius, trackingType = 'none') => {
                const bullets = [];
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2;
                    const speedX = Math.cos(angle) * speed;
                    const speedY = Math.sin(angle) * speed;
                    bullets.push(new Bullet(x, y, speedX, speedY, radius, this.getRandomColor(), this.game, trackingType));
                }
                return bullets;
            },
            
            // 扇形弹幕
            arc: (x, y, count, speed, angleStart, angleEnd, radius, trackingType = 'none') => {
                const bullets = [];
                for (let i = 0; i < count; i++) {
                    const angle = angleStart + (i / (count - 1)) * (angleEnd - angleStart);
                    const speedX = Math.cos(angle) * speed;
                    const speedY = Math.sin(angle) * speed;
                    bullets.push(new Bullet(x, y, speedX, speedY, radius, this.getRandomColor(), this.game, trackingType));
                }
                return bullets;
            },
            
            // 直线弹幕
            line: (startX, startY, endX, endY, count, speed, radius, trackingType = 'none') => {
                const bullets = [];
                for (let i = 0; i < count; i++) {
                    const x = startX + (endX - startX) * (i / (count - 1));
                    const y = startY + (endY - startY) * (i / (count - 1));
                    
                    // 计算朝向玩家的方向
                    let dx, dy, length;
                    if (trackingType === 'initial' || trackingType === 'active') {
                        dx = this.game.player.x - x;
                        dy = this.game.player.y - y;
                        length = Math.sqrt(dx * dx + dy * dy);
                        dx = dx / length;
                        dy = dy / length;
                    } else {
                        // 预设方向（向下）
                        dx = 0;
                        dy = 1;
                    }
                    
                    bullets.push(new Bullet(x, y, dx * speed, dy * speed, radius, this.getRandomColor(), this.game, trackingType));
                }
                return bullets;
            },
            
            // 随机散射
            random: (x, y, count, minSpeed, maxSpeed, radius, trackingType = 'none') => {
                const bullets = [];
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
                    const speedX = Math.cos(angle) * speed;
                    const speedY = Math.sin(angle) * speed;
                    bullets.push(new Bullet(x, y, speedX, speedY, radius, this.getRandomColor(), this.game, trackingType));
                }
                return bullets;
            },
            
            // 螺旋弹幕
            spiral: (x, y, count, speed, radius, rotations, trackingType = 'none') => {
                const bullets = [];
                const angleStep = (Math.PI * 2 * rotations) / count;
                
                for (let i = 0; i < count; i++) {
                    const angle = i * angleStep;
                    const speedX = Math.cos(angle) * speed;
                    const speedY = Math.sin(angle) * speed;
                    bullets.push(new Bullet(x, y, speedX, speedY, radius, this.getRandomColor(), this.game, trackingType));
                }
                
                return bullets;
            },
            
            // 心形弹幕
            heart: (x, y, count, speed, size, trackingType = 'none') => {
                const bullets = [];
                const angleStep = (Math.PI * 2) / count;
                
                for (let i = 0; i < count; i++) {
                    const angle = i * angleStep;
                    // 心形参数方程
                    const heartX = size * 16 * Math.pow(Math.sin(angle), 3);
                    const heartY = size * (13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle));
                    
                    // 计算方向（从中心向外）
                    const length = Math.sqrt(heartX * heartX + heartY * heartY);
                    const dirX = heartX / length;
                    const dirY = heartY / length;
                    
                    // 创建弹幕
                    bullets.push(new Bullet(x, y, dirX * speed, dirY * speed, 4 + Math.random() * 3, this.getRandomColor(), this.game, trackingType));
                }
                
                return bullets;
            },
            
            // 星形弹幕
            star: (x, y, points, count, speed, size, trackingType = 'none') => {
                const bullets = [];
                const angleStep = (Math.PI * 2) / count;
                
                for (let i = 0; i < count; i++) {
                    const angle = i * angleStep;
                    let radius = size;
                    
                    // 星形效果
                    if (i % (count / points) < (count / points) / 2) {
                        radius = size * 0.4;
                    }
                    
                    const starX = Math.cos(angle) * radius;
                    const starY = Math.sin(angle) * radius;
                    
                    // 计算方向（从中心向外）
                    const dirX = starX / radius;
                    const dirY = starY / radius;
                    
                    // 创建弹幕
                    bullets.push(new Bullet(x, y, dirX * speed, dirY * speed, 3 + Math.random() * 4, this.getRandomColor(), this.game, trackingType));
                }
                
                return bullets;
            },
            
            // 多重螺旋
            multiSpiral: (x, y, arms, bulletsPerArm, speed, radius, rotationSpeed, trackingType = 'none') => {
                const bullets = [];
                const angleStep = (Math.PI * 2) / arms;
                
                for (let arm = 0; arm < arms; arm++) {
                    const baseAngle = arm * angleStep;
                    
                    for (let i = 0; i < bulletsPerArm; i++) {
                        const distance = i * radius * 0.3;
                        const angle = baseAngle + i * 0.1; // 略微旋转每个弹幕以形成螺旋
                        const bulletX = x + Math.cos(angle) * distance;
                        const bulletY = y + Math.sin(angle) * distance;
                        
                        const speedX = Math.cos(angle) * speed;
                        const speedY = Math.sin(angle) * speed;
                        
                        // 创建带旋转的弹幕
                        bullets.push(new Bullet(bulletX, bulletY, speedX, speedY, radius, this.getRandomColor(), this.game, trackingType, rotationSpeed));
                    }
                }
                
                return bullets;
            },
            
            // 网格弹幕
            grid: (startX, startY, width, height, rows, cols, speed, radius, direction, trackingType = 'none') => {
                const bullets = [];
                const stepX = width / (cols - 1);
                const stepY = height / (rows - 1);
                
                // 方向角度
                let angle;
                if (direction === 'down') angle = Math.PI * 0.5;
                else if (direction === 'up') angle = Math.PI * 1.5;
                else if (direction === 'left') angle = Math.PI;
                else if (direction === 'right') angle = 0;
                else angle = Math.random() * Math.PI * 2;
                
                // 速度向量
                const speedX = Math.cos(angle) * speed;
                const speedY = Math.sin(angle) * speed;
                
                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < cols; col++) {
                        const x = startX + col * stepX;
                        const y = startY + row * stepY;
                        
                        bullets.push(new Bullet(x, y, speedX, speedY, radius, this.getRandomColor(), this.game, trackingType));
                    }
                }
                
                return bullets;
            },
            
            // 追踪弹幕
            homing: (x, y, count, speed, radius) => {
                const bullets = [];
                const angleStep = (Math.PI * 2) / count;
                
                for (let i = 0; i < count; i++) {
                    const angle = i * angleStep;
                    const speedX = Math.cos(angle) * speed;
                    const speedY = Math.sin(angle) * speed;
                    
                    // 创建主动追踪型弹幕
                    bullets.push(new Bullet(x, y, speedX, speedY, radius, '#ff0000', this.game, 'active'));
                }
                
                return bullets;
            }
        };
    }

    getRandomColor() {
        const colors = ["#ff0000", "#ff7700", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff"];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    emit(pattern, ...args) {
        if (this.patterns[pattern]) {
            return this.patterns[pattern](...args);
        }
        return [];
    }
}

// 粒子效果
class Particle {
    constructor(x, y, velocityX, velocityY, size, color, lifetime, game) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.size = size;
        this.color = color;
        this.lifetime = lifetime;
        this.age = 0;
        this.game = game;
        this.active = true;
    }

    update(deltaTime) {
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        this.age += deltaTime;
        
        if (this.age >= this.lifetime) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.globalAlpha = 1 - (this.age / this.lifetime);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
} 