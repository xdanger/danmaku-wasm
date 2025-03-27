/**
 * 弹幕飞机游戏 - 2D版本
 * 使用Canvas API实现
 */

// 游戏状态枚举
const GameState = {
    MENU: 0,
    PLAYING: 1,
    GAME_OVER: 2
};

// 主游戏类
class Game {
    constructor() {
        // 获取canvas和上下文
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置canvas尺寸
        this.canvas.width = 480;
        this.canvas.height = 720;
        
        // 游戏状态
        this.state = GameState.MENU;
        this.survivalTime = 0; // 改为存活时间
        this.isDebug = false;
        this.isInvincible = false; // 无敌模式标志
        this.hasUsedInvincible = false; // 记录是否曾经使用过无敌模式
        
        // 记录最高时间
        this.bestTime = this.loadBestTime();
        
        // 游戏元素
        this.player = null;
        this.bullets = [];
        this.particles = [];
        this.enemies = [];
        
        // 初始化弹幕发射器
        this.bulletEmitter = new BulletEmitter(this);
        
        // 触摸控制相关变量
        this.isTouching = false;
        this.touchX = 0;
        this.touchY = 0;
        this.lastTouchX = 0;
        this.lastTouchY = 0;
        this.touchMoveX = 0;
        this.touchMoveY = 0;
        
        // 检测是否是移动设备
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 游戏参数
        this.bulletPatterns = [
            'circle', 'spiral', 'wave', 'heart', 'star', 'zigzag'
        ];
        
        // 设置游戏速度相关参数
        this.difficulty = 1.0; // 游戏难度
        this.maxDifficulty = 10.0; // 最大难度
        this.difficultyTimer = 0; // 难度增加计时器
        this.difficultyIncreaseInterval = 5000; // 每5秒增加难度
        
        // 弹幕频率参数
        this.bulletFrequencyMin = null; // 由难度动态计算
        this.bulletFrequencyMax = null; // 由难度动态计算
        this.nextBulletTime = 1000; // 下一个弹幕生成时间
        
        // 弹幕数量上限 - 用于性能优化
        this.maxBullets = 500;
        
        // 粒子效果
        this.initialMaxParticles = 300; // 初始粒子数量上限
        this.maxParticles = this.initialMaxParticles; // 当前粒子数量上限
        
        // 性能监控
        this.deltaTime = 0; // 帧间时间差（毫秒）
        this.lastTime = 0; // 上一帧时间
        this.fpsHistory = []; // 存储最近的FPS数据
        this.fpsHistoryMaxLength = 60; // 存储60帧的FPS数据
        this.performanceCheckTimer = 0;
        this.performanceCheckInterval = 2000; // 每2秒检查一次性能
        this.lowPerformanceMode = false; // 低性能模式标志
        
        // 获取游戏UI元素
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.timeDisplay = document.getElementById('time-value');
        this.finalTimeDisplay = document.getElementById('final-time');
        
        // 添加按钮事件监听器
        document.getElementById('start-button').addEventListener('click', () => this.startGame());
        document.getElementById('restart-button').addEventListener('click', () => this.restartGame());
        
        // 游戏循环标志
        this.isRunning = false;
        
        // 键盘事件
        this.keys = {};
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            // 特殊按键处理
            if (e.key === '0') {
                this.toggleDebug();
            }
            // 按I键切换无敌模式（调试模式下）
            if (e.key === 'i' || e.key === 'I') {
                this.toggleInvincible();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // 添加触摸事件监听器（用于移动设备）
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // 防止默认滚动行为
            this.isTouching = true;
            
            const touch = e.touches[0];
            this.touchX = touch.clientX;
            this.touchY = touch.clientY;
            this.lastTouchX = this.touchX;
            this.lastTouchY = this.touchY;
            this.touchMoveX = 0;
            this.touchMoveY = 0;
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault(); // 防止默认滚动行为
            if (!this.isTouching) return;
            
            const touch = e.touches[0];
            this.touchX = touch.clientX;
            this.touchY = touch.clientY;
            
            // 计算移动差值
            this.touchMoveX = this.touchX - this.lastTouchX;
            this.touchMoveY = this.touchY - this.lastTouchY;
            
            // 更新上一个触摸位置
            this.lastTouchX = this.touchX;
            this.lastTouchY = this.touchY;
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault(); // 防止默认滚动行为
            this.isTouching = false;
            this.touchMoveX = 0;
            this.touchMoveY = 0;
        }, { passive: false });
        
        // 响应窗口大小变化
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }
    
    bindEvents() {
        // 按钮事件
        this.startButton.addEventListener('click', () => this.startGame());
        this.restartButton.addEventListener('click', () => this.restartGame());
        
        // 键盘事件
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            // 特殊按键处理
            if (e.key === '0') {
                this.toggleDebug();
            }
            // 按I键切换无敌模式（调试模式下）
            if (e.key === 'i' || e.key === 'I') {
                this.toggleInvincible();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // 响应窗口大小变化
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }
    
    handleResize() {
        // 保持游戏画布在容器中居中
        const container = document.getElementById('game-container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 保持canvas尺寸不变，但根据窗口大小调整缩放
        const scale = Math.min(
            containerWidth / this.canvas.width,
            containerHeight / this.canvas.height
        );
        
        const scaledWidth = this.canvas.width * scale;
        const scaledHeight = this.canvas.height * scale;
        
        this.canvas.style.width = `${scaledWidth}px`;
        this.canvas.style.height = `${scaledHeight}px`;
    }
    
    toggleDebug() {
        this.isDebug = !this.isDebug;
        
        // 如果退出调试模式，同时关闭无敌模式
        if (!this.isDebug) {
            this.isInvincible = false;
        }
    }
    
    // 添加切换无敌模式的方法
    toggleInvincible() {
        // 只有在调试模式下才能开启无敌模式
        if (this.isDebug) {
            this.isInvincible = !this.isInvincible;
            console.log('无敌模式:', this.isInvincible ? '开启' : '关闭');
            
            // 如果开启了无敌模式，记录使用过无敌模式
            if (this.isInvincible) {
                this.hasUsedInvincible = true;
            }
        } else {
            console.log('请先开启调试模式');
        }
    }

    startGame() {
        // 隐藏开始界面
        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        
        // 隐藏新纪录提示
        const newRecordElement = document.getElementById('new-record');
        if (newRecordElement) {
            newRecordElement.classList.add('hidden');
            newRecordElement.classList.remove('new-record');
        }
        
        // 重置游戏状态
        this.survivalTime = 0;
        this.difficulty = 1;
        this.difficultyTimer = 0;
        this.bullets = [];
        this.particles = [];
        this.enemies = [];
        this.hasUsedInvincible = false; // 重置无敌模式使用标志
        
        // 重置弹幕生成系统
        this.nextBulletTime = 2000; // 给玩家2秒准备时间
        this.bulletFrequencyMin = null;
        this.bulletFrequencyMax = null;
        
        // 重置性能监控
        this.fpsHistory = [];
        this.lowPerformanceMode = false;
        this.maxParticles = this.initialMaxParticles;
        
        // 更新UI
        this.updateUI();
        
        // 创建玩家
        this.player = new Player(this.canvas.width / 2, this.canvas.height - 100, this);
        
        // 设置游戏状态
        this.state = GameState.PLAYING;
        
        // 启动游戏循环
        if (!this.isRunning) {
        this.isRunning = true;
            this.lastTime = performance.now();
            this.gameLoop();
        }
    }
    
    restartGame() {
        this.startGame();
    }
    
    gameOver() {
        this.state = GameState.GAME_OVER;
        
        // 获取DOM元素
        const bestTimeDisplay = document.getElementById('best-time');
        const newRecordElement = document.getElementById('new-record');
        
        // 如果曾经启用过无敌模式，则不显示最终时间
        if (this.hasUsedInvincible) {
            this.finalTimeDisplay.textContent = "无敌模式使用过";
            bestTimeDisplay.textContent = this.formatTime(this.bestTime);
            newRecordElement.classList.add('hidden');
            newRecordElement.classList.remove('new-record');
        } else {
            // 显示游戏时间
            this.finalTimeDisplay.textContent = this.formatTime(this.survivalTime);
            
            // 检查是否创造了新纪录
            const isNewRecord = this.saveBestTime(this.survivalTime);
            
            // 显示最高记录
            bestTimeDisplay.textContent = this.formatTime(this.bestTime);
            
            // 如果创造了新纪录，显示恭喜信息
            if (isNewRecord) {
                newRecordElement.classList.remove('hidden');
                newRecordElement.classList.add('new-record');
            } else {
                newRecordElement.classList.add('hidden');
                newRecordElement.classList.remove('new-record');
            }
        }
        
        this.gameOverScreen.classList.remove('hidden');
        
        // 创建爆炸效果（仅在非极低性能模式下）
        if (this.maxParticles > 0) {
            this.createExplosion(this.player.x, this.player.y, 50);
        }
    }
    
    createExplosion(x, y, count) {
        // 如果在极低性能模式下(maxParticles为0)，跳过爆炸效果
        if (this.maxParticles === 0) return;
        
        // 在低性能模式下减少爆炸粒子数量
        if (this.lowPerformanceMode) {
            count = Math.floor(count * 0.5);
        }
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const size = 2 + Math.random() * 3;
            const lifetime = 500 + Math.random() * 1000;
            const color = this.player.color;
            
            // 检查粒子数量限制
            if (this.particles.length >= this.maxParticles) break;
            
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size, color, lifetime, this
            ));
        }
    }

    gameLoop(currentTime) {
        if (!this.isRunning) return;
        
        // 计算时间差
        if (!currentTime) currentTime = performance.now();
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // 更新游戏状态
        this.update();
        
        // 渲染游戏
        this.render();
        
        // 继续下一帧
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update() {
        // 如果游戏已结束，不更新
        if (this.state !== GameState.PLAYING) return;
        
        // 更新玩家
        this.updatePlayer();
        
        // 更新弹幕
        this.updateBullets();
        
        // 只有在允许粒子的情况下才更新粒子
        if (this.maxParticles > 0) {
            this.updateParticles();
        }
        
        // 检测碰撞
        this.checkCollisions();
        
        // 更新难度
        this.updateDifficulty();
        
        // 更新游戏时间
        this.survivalTime += this.deltaTime / 1000;
        
        // 性能监控
        this.monitorPerformance();
        
        // 更新UI
        this.updateUI();
    }
    
    updatePlayer() {
        if (!this.player) return;
        
        // 移动设备上使用触摸控制
        if (this.isMobile && this.isTouching) {
            // 获取画布在网页中的位置
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            // 使用触摸移动差值计算移动方向
            let moveX = this.touchMoveX * scaleX * 0.1; // 缩放移动速度
            let moveY = this.touchMoveY * scaleY * 0.1;
            
            // 限制最大移动速度
            const maxSpeed = 1;
            if (Math.abs(moveX) > maxSpeed) moveX = Math.sign(moveX) * maxSpeed;
            if (Math.abs(moveY) > maxSpeed) moveY = Math.sign(moveY) * maxSpeed;
            
            this.player.setVelocity(moveX, moveY);
        } else {
            // 处理键盘输入
            let moveX = 0;
            let moveY = 0;
            
            // 方向键
            if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) moveX -= 1;
            if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) moveX += 1;
            if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) moveY -= 1;
            if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) moveY += 1;
            
            // 设置玩家速度
            this.player.setVelocity(moveX, moveY);
        }
        
        // 更新玩家
        this.player.update(this.deltaTime);
    }
    
    updateBullets() {
        // 更新现有弹幕
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update(this.deltaTime);
            
            // 移除非活跃弹幕
            if (!this.bullets[i].active) {
                this.bullets.splice(i, 1);
            }
        }
        
        // 如果弹幕数量超过最大限制，移除最早的一些弹幕
        if (this.bullets.length > this.maxBullets) {
            const excessCount = this.bullets.length - this.maxBullets;
            this.bullets.splice(0, excessCount);
            console.log(`弹幕数量超过限制，移除${excessCount}个最早的弹幕`);
        }
        
        // 生成新弹幕
        this.nextBulletTime -= this.deltaTime;
        if (this.nextBulletTime <= 0) {
            this.generateBullets();
            
            // 根据难度设置下一次弹幕时间
            this.setNextBulletTime();
        }
    }
    
    // 新增方法：设置下一次弹幕生成时间
    setNextBulletTime() {
        // 根据难度调整的弹幕频率上下限
        const minInterval = this.bulletFrequencyMin || Math.max(400, 2000 - Math.log(Math.min(15, this.difficulty) + 1) * 800);
        const maxInterval = this.bulletFrequencyMax || Math.max(800, 3000 - Math.log(Math.min(15, this.difficulty) + 1) * 1000);
        
        // 当弹幕数量接近上限时，延长生成间隔
        const bulletRatio = this.bullets.length / this.maxBullets;
        let intervalMultiplier = 1;
        
        if (bulletRatio > 0.8) {
            // 从80%开始逐渐增加间隔
            intervalMultiplier = 1 + (bulletRatio - 0.8) * 5; // 最多可以增加到2倍
        }
        
        // 随机化下一次弹幕时间，但保证至少有最小间隔
        let nextTime = (minInterval + Math.random() * (maxInterval - minInterval)) * intervalMultiplier;
        
        // 强制最小间隔，即使在高难度下也不会太频繁
        const absoluteMinInterval = 300; // 绝对最小间隔300毫秒
        this.nextBulletTime = Math.max(absoluteMinInterval, nextTime);
    }

    generateBullets() {
        // 如果弹幕数量已达上限，不再生成新弹幕
        if (this.bullets.length >= this.maxBullets) {
            console.log(`达到最大弹幕数量限制(${this.maxBullets})，暂停生成新弹幕`);
            return;
        }
        
        // 根据难度选择弹幕模式
        const patterns = [
            { pattern: 'circular', weight: 1.0, minDifficulty: 0 },
            { pattern: 'arc', weight: 1.0, minDifficulty: 0 },
            { pattern: 'random', weight: 0.8, minDifficulty: 0.5 },
            { pattern: 'spiral', weight: 0.7, minDifficulty: 1.5 },
            { pattern: 'heart', weight: 0.5, minDifficulty: 2.5 },
            { pattern: 'star', weight: 0.6, minDifficulty: 2 },
            { pattern: 'multiSpiral', weight: 0.6, minDifficulty: 3 },
            { pattern: 'homing', weight: 0.3, minDifficulty: 4 },
            { pattern: 'multiDirection', weight: 0.7, minDifficulty: 2.5 }
        ];
        
        // 过滤可用的模式（基于当前难度）
        const availablePatterns = patterns.filter(p => p.minDifficulty <= this.difficulty);
        
        // 在低性能模式下减少复杂弹幕的权重
        if (this.lowPerformanceMode) {
            for (const pattern of availablePatterns) {
                if (['heart', 'star', 'multiSpiral', 'homing'].includes(pattern.pattern)) {
                    pattern.weight *= 0.5; // 降低复杂弹幕的权重
                }
            }
        }
        
        // 根据权重选择模式
        const totalWeight = availablePatterns.reduce((sum, p) => sum + p.weight, 0);
        let randomWeight = Math.random() * totalWeight;
        
        for (const pattern of availablePatterns) {
            randomWeight -= pattern.weight;
            if (randomWeight <= 0) {
                // 执行选中的弹幕模式
                switch (pattern.pattern) {
                    case 'circular':
                        this.emitCircularBullets();
                        break;
                    case 'arc':
                        this.emitArcBullets();
                        break;
                    case 'random':
                        this.emitRandomBullets();
                        break;
                    case 'spiral':
                        this.emitSpiralBullets();
                        break;
                    case 'heart':
                        this.emitHeartBullets();
                        break;
                    case 'star':
                        this.emitStarBullets();
                        break;
                    case 'multiSpiral':
                        this.emitMultiSpiralBullets();
                        break;
                    case 'homing':
                        this.emitHomingBullets();
                        break;
                    case 'multiDirection':
                        this.emitMultiDirectionBullets();
                break;
            }
                
                // 随机决定是否添加第二种弹幕（高难度时概率更高）
                if (this.difficulty > 4 && Math.random() < (this.difficulty - 4) * 0.1) {
                    setTimeout(() => {
                        this.generateBullets();
                    }, 500); // 0.5秒后添加第二波弹幕
                }
                
                break;
            }
        }
    }
    
    emitCircularBullets() {
        // 获取玩家位置，确定安全区域
        const safeZone = this.getSafeZone();
        
        // 在安全区域外随机选择位置，但设置最大尝试次数避免无限循环
        let x, y;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            x = Math.random() * this.canvas.width;
            y = 50;
            attempts++;
            // 如果尝试次数过多，则强制跳出循环
            if (attempts >= maxAttempts) break;
        } while (this.isInSafeZone(x, y, safeZone));
        
        // 根据当前弹幕数量与上限的比例，动态调整生成数量
        const bulletRatio = this.bullets.length / this.maxBullets;
        const countReductionFactor = bulletRatio > 0.7 ? 1 - (bulletRatio - 0.7) * 3 : 1; // 当达到70%上限时开始减少数量
        
        // 基础数量公式改为对数增长而非线性增长
        const baseCount = 8 + Math.floor(Math.log(this.difficulty + 1) * 5);
        // 应用减少因子
        const count = Math.max(3, Math.floor(baseCount * countReductionFactor));
        
        const speed = 2 + this.difficulty * 0.08; // 减小速度增长系数，从0.15降至0.08
        const radius = 5;
        
        // 高难度时有小概率添加追踪
        const trackingType = this.difficulty > 5 && Math.random() < 0.1 ? 'initial' : 'none';
        
        const newBullets = this.bulletEmitter.emitCircular(x, y, count, speed, radius, trackingType);
        this.bullets = this.bullets.concat(newBullets);
    }
    
    emitArcBullets() {
        // 获取玩家位置，确定安全区域
        const safeZone = this.getSafeZone();
        
        // 在安全区域外随机选择位置，但设置最大尝试次数避免无限循环
        let x, y;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            x = Math.random() * this.canvas.width;
            y = 50;
            attempts++;
            // 如果尝试次数过多，则强制跳出循环
            if (attempts >= maxAttempts) break;
        } while (this.isInSafeZone(x, y, safeZone));
        
        // 根据当前弹幕数量与上限的比例，动态调整生成数量
        const bulletRatio = this.bullets.length / this.maxBullets;
        const countReductionFactor = bulletRatio > 0.7 ? 1 - (bulletRatio - 0.7) * 3 : 1; // 当达到70%上限时开始减少数量
        
        // 基础数量公式改为对数增长而非线性增长
        const baseCount = 6 + Math.floor(Math.log(this.difficulty + 1) * 4);
        // 应用减少因子
        const count = Math.max(3, Math.floor(baseCount * countReductionFactor));
        
        const speed = 2 + this.difficulty * 0.08; // 减小速度增长系数，从0.15降至0.08
        const startAngle = Math.PI / 4;
        const endAngle = Math.PI * 3 / 4;
        const radius = 6;
        
        const newBullets = this.bulletEmitter.emitArc(x, y, count, speed, startAngle, endAngle, radius);
        this.bullets = this.bullets.concat(newBullets);
    }
    
    emitRandomBullets() {
        // 获取玩家位置，确定安全区域
        const safeZone = this.getSafeZone();
        
        // 在安全区域外随机选择位置，但设置最大尝试次数避免无限循环
        let x, y;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            x = Math.random() * this.canvas.width;
            y = 50;
            attempts++;
            // 如果尝试次数过多，则强制跳出循环
            if (attempts >= maxAttempts) break;
        } while (this.isInSafeZone(x, y, safeZone));
        
        // 根据当前弹幕数量与上限的比例，动态调整生成数量
        const bulletRatio = this.bullets.length / this.maxBullets;
        const countReductionFactor = bulletRatio > 0.7 ? 1 - (bulletRatio - 0.7) * 3 : 1; // 当达到70%上限时开始减少数量
        
        // 基础数量公式改为对数增长而非线性增长
        const baseCount = 10 + Math.floor(Math.log(this.difficulty + 1) * 6);
        // 应用减少因子
        const count = Math.max(5, Math.floor(baseCount * countReductionFactor));
        
        const minSpeed = 1 + this.difficulty * 0.05; // 减小速度增长系数，从0.1降至0.05
        const maxSpeed = 2.5 + this.difficulty * 0.08; // 减小速度增长系数，从0.15降至0.08
        const radius = 4;
        
        const newBullets = this.bulletEmitter.emitRandom(x, y, count, minSpeed, maxSpeed, radius);
        this.bullets = this.bullets.concat(newBullets);
    }
    
    emitSpiralBullets() {
        // 获取玩家位置，确定安全区域
        const safeZone = this.getSafeZone();
        
        // 在安全区域外随机选择位置，但设置最大尝试次数避免无限循环
        let x, y;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            x = this.canvas.width / 2;
            y = 50;
            attempts++;
            // 如果尝试次数过多，则强制跳出循环
            if (attempts >= maxAttempts) break;
        } while (this.isInSafeZone(x, y, safeZone));
        
        // 根据当前弹幕数量与上限的比例，动态调整生成数量
        const bulletRatio = this.bullets.length / this.maxBullets;
        const countReductionFactor = bulletRatio > 0.7 ? 1 - (bulletRatio - 0.7) * 3 : 1; // 当达到70%上限时开始减少数量
        
        // 基础数量公式改为对数增长而非线性增长
        const baseCount = 12 + Math.floor(Math.log(this.difficulty + 1) * 5);
        // 应用减少因子
        const count = Math.max(6, Math.floor(baseCount * countReductionFactor));
        
        const speed = 2 + this.difficulty * 0.08; // 减小速度增长系数，从0.15降至0.08
        const radius = 5;
        const rotations = 2 + Math.min(3, Math.floor(Math.log(this.difficulty + 1))); // 使用对数函数限制旋转次数增长
        
        const newBullets = this.bulletEmitter.emitSpiral(x, y, count, speed, radius, rotations);
        this.bullets = this.bullets.concat(newBullets);
    }
    
    emitHeartBullets() {
        // 获取玩家位置，确定安全区域
        const safeZone = this.getSafeZone();
        
        // 在安全区域外随机选择位置，但设置最大尝试次数避免无限循环
        let x, y;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            x = this.canvas.width / 2;
            y = 100;
            attempts++;
            // 如果尝试次数过多，则强制跳出循环
            if (attempts >= maxAttempts) break;
        } while (this.isInSafeZone(x, y, safeZone));
        
        // 根据当前弹幕数量与上限的比例，动态调整生成数量
        const bulletRatio = this.bullets.length / this.maxBullets;
        const countReductionFactor = bulletRatio > 0.7 ? 1 - (bulletRatio - 0.7) * 3 : 1; // 当达到70%上限时开始减少数量
        
        // 基础数量公式改为对数增长而非线性增长
        const baseCount = 15 + Math.floor(Math.log(this.difficulty + 1) * 5);
        // 应用减少因子
        const count = Math.max(8, Math.floor(baseCount * countReductionFactor));
        
        const speed = 1 + this.difficulty * 0.05; // 减小速度增长系数，从0.1降至0.05
        const size = 1 + this.difficulty * 0.1; // 保持尺寸增长系数不变
        
        const newBullets = this.bulletEmitter.emitHeart(x, y, count, speed, size);
        this.bullets = this.bullets.concat(newBullets);
    }
    
    emitStarBullets() {
        // 获取玩家位置，确定安全区域
        const safeZone = this.getSafeZone();
        
        // 在安全区域外随机选择位置，但设置最大尝试次数避免无限循环
        let x, y;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            x = this.canvas.width / 2;
            y = 100;
            attempts++;
            // 如果尝试次数过多，则强制跳出循环
            if (attempts >= maxAttempts) break;
        } while (this.isInSafeZone(x, y, safeZone));
        
        // 根据当前弹幕数量与上限的比例，动态调整生成数量
        const bulletRatio = this.bullets.length / this.maxBullets;
        const countReductionFactor = bulletRatio > 0.7 ? 1 - (bulletRatio - 0.7) * 3 : 1; // 当达到70%上限时开始减少数量
        
        // 基础数量公式改为对数增长而非线性增长
        const baseCount = 18 + Math.floor(Math.log(this.difficulty + 1) * 6);
        // 应用减少因子
        const count = Math.max(10, Math.floor(baseCount * countReductionFactor));
        
        const points = 5 + Math.floor(Math.random() * 3); // 5-7角星
        const speed = 1.5 + this.difficulty * 0.05; // 减小速度增长系数，从0.1降至0.05
        const radius = 4;
        
        const newBullets = this.bulletEmitter.emitStar(x, y, points, count, speed, radius);
        this.bullets = this.bullets.concat(newBullets);
    }
    
    emitMultiSpiralBullets() {
        // 获取玩家位置，确定安全区域
        const safeZone = this.getSafeZone();
        
        // 在安全区域外随机选择位置，但设置最大尝试次数避免无限循环
        let x, y;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            x = this.canvas.width / 2;
            y = 50;
            attempts++;
            // 如果尝试次数过多，则强制跳出循环
            if (attempts >= maxAttempts) break;
        } while (this.isInSafeZone(x, y, safeZone));
        
        // 根据当前弹幕数量与上限的比例，动态调整生成数量
        const bulletRatio = this.bullets.length / this.maxBullets;
        const countReductionFactor = bulletRatio > 0.7 ? 1 - (bulletRatio - 0.7) * 3 : 1; // 当达到70%上限时开始减少数量
        
        // 使用对数函数限制旋转臂数量
        const armCount = Math.min(5, 2 + Math.floor(Math.log(this.difficulty + 1)));
        // 使用对数函数限制每臂弹幕数量
        const baseCount = 4 + Math.floor(Math.log(this.difficulty + 1) * 3);
        // 应用减少因子
        const bulletsPerArm = Math.max(3, Math.floor(baseCount * countReductionFactor));
        
        const speed = 2 + this.difficulty * 0.06; // 减小速度增长系数，从0.12降至0.06
        const radius = 4;
        
        const newBullets = this.bulletEmitter.emitMultiSpiral(x, y, armCount, bulletsPerArm, speed, radius);
        this.bullets = this.bullets.concat(newBullets);
    }
    
    emitHomingBullets() {
        // 获取玩家位置，确定安全区域
        const safeZone = this.getSafeZone();
        
        // 随机位置，但要避开安全区域，并设置最大尝试次数避免无限循环
        let x, y;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            // 随机选择生成位置
            if (Math.random() < 0.5) {
                // 顶部边缘
                x = Math.random() * this.canvas.width;
                y = 10;
            } else if (Math.random() < 0.5) {
                // 左边缘
                x = 10;
                y = Math.random() * this.canvas.height * 0.7;
            } else {
                // 右边缘
                x = this.canvas.width - 10;
                y = Math.random() * this.canvas.height * 0.7;
            }
            
            attempts++;
            // 如果尝试次数过多，则强制跳出循环
            if (attempts >= maxAttempts) break;
        } while (this.isInSafeZone(x, y, safeZone));
        
        // 追踪弹幕的数量不随难度而指数增长，而是有上限
        // 根据当前弹幕数量与上限的比例，进一步限制
        const bulletRatio = this.bullets.length / this.maxBullets;
        const countReductionFactor = bulletRatio > 0.7 ? 1 - (bulletRatio - 0.7) * 3 : 1; // 当达到70%上限时开始减少数量
        
        // 追踪弹幕数量极其有限，最多3个
        const count = Math.min(3, 1 + Math.floor(Math.log(this.difficulty) * 0.5));
        // 如果接近上限，可能会减少到0个，即不生成追踪弹幕
        const finalCount = Math.max(0, Math.floor(count * countReductionFactor));
        
        if (finalCount > 0) {
            const speed = 1 + this.difficulty * 0.04; // 大幅减小追踪弹幕速度增长，从0.08降至0.04
            const radius = 6; // 较大的弹幕半径
            
            const newBullets = this.bulletEmitter.emitHoming(x, y, finalCount, speed, radius);
            this.bullets = this.bullets.concat(newBullets);
        }
    }
    
    emitMultiDirectionBullets() {
        // 获取玩家位置，确定安全区域
        const safeZone = this.getSafeZone();
        
        // 随机选择2-4个方向，但排除玩家所在的方向
        const allDirections = ['top', 'left', 'right', 'bottom'];
        let availableDirections = allDirections.filter(dir => !this.isSafeDirection(dir, safeZone));
        
        // 如果没有可用方向（极端情况），使用所有方向但减少危险方向的权重
        if (availableDirections.length === 0) {
            availableDirections = allDirections;
        }
        
        const selectedDirs = [];
        
        // 选择方向数量，根据难度和当前弹幕比例动态调整
        const bulletRatio = this.bullets.length / this.maxBullets;
        const countReductionFactor = bulletRatio > 0.7 ? 1 - (bulletRatio - 0.7) * 3 : 1; // 当达到70%上限时开始减少数量
        
        // 根据难度选择2-4个方向，但接近上限时可能减少
        const maxDirCount = Math.min(4, 2 + Math.floor(Math.log(this.difficulty + 1)));
        const dirCount = Math.max(1, Math.min(availableDirections.length, Math.floor(maxDirCount * countReductionFactor)));
        
        for (let i = 0; i < dirCount; i++) {
            const randomIndex = Math.floor(Math.random() * availableDirections.length);
            selectedDirs.push(availableDirections.splice(randomIndex, 1)[0]);
            if (availableDirections.length === 0) break;
        }
        
        // 基础数量公式改为对数增长
        const baseCount = 3 + Math.floor(Math.log(this.difficulty + 1) * 3);
        // 应用减少因子
        const bulletCount = Math.max(2, Math.floor(baseCount * countReductionFactor));
        
        const speed = 2 + this.difficulty * 0.06; // 减小速度增长系数，从0.12降至0.06
        const radius = 5;
        
        const trackingType = this.difficulty > 7 && Math.random() < 0.08 ? 'initial' : 'none';
        
        const newBullets = this.bulletEmitter.emitMultiDirection(selectedDirs, bulletCount, speed, radius, trackingType);
        this.bullets = this.bullets.concat(newBullets);
    }
    
    // 获取玩家周围的安全区域
    getSafeZone() {
        if (!this.player) return null;
        
        // 计算玩家位置相对于屏幕的位置
        const playerX = this.player.x / this.canvas.width;
        const playerY = this.player.y / this.canvas.height;
        
        // 安全区域比例（减小一点，确保始终有空间生成弹幕）
        const safeRatio = 0.25; // 从0.3减小到0.25
        
        // 根据玩家位置，确定哪个方向是安全区域
        const safeZone = {
            left: playerX < safeRatio,    // 玩家靠近左边
            right: playerX > (1 - safeRatio),   // 玩家靠近右边
            top: playerY < safeRatio,     // 玩家靠近上边
            bottom: playerY > (1 - safeRatio),  // 玩家靠近下边
            playerX,
            playerY
        };
        
        return safeZone;
    }
    
    // 检查位置是否在安全区域内
    isInSafeZone(x, y, safeZone) {
        if (!safeZone) return false;
        
        const relativeX = x / this.canvas.width;
        const relativeY = y / this.canvas.height;
        const safeRatio = 0.25; // 从0.3减小到0.25
        
        // 检查位置是否在任何安全区域内
        return (safeZone.left && relativeX < safeRatio) ||
               (safeZone.right && relativeX > (1 - safeRatio)) ||
               (safeZone.top && relativeY < safeRatio) ||
               (safeZone.bottom && relativeY > (1 - safeRatio));
    }
    
    // 检查方向是否是安全方向（即玩家所在的方向）
    isSafeDirection(direction, safeZone) {
        if (!safeZone) return false;
        
        switch(direction) {
            case 'left': return safeZone.left;
            case 'right': return safeZone.right;
            case 'top': return safeZone.top;
            case 'bottom': return safeZone.bottom;
            default: return false;
        }
    }
    
    updateParticles() {
        // 更新所有粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(this.deltaTime);
            
            // 移除非活跃粒子
            if (!this.particles[i].active) {
                this.particles.splice(i, 1);
            }
        }
        
        // 如果粒子数量超过最大限制，移除最早创建的粒子
        if (this.particles.length > this.maxParticles) {
            // 计算需要移除的粒子数量
            const excessCount = this.particles.length - this.maxParticles;
            // 移除最早添加的粒子（数组前面的元素）
            this.particles.splice(0, excessCount);
        }
    }
    
    updateDifficulty() {
        // 随时间增加难度
        this.difficultyTimer += this.deltaTime;
        
        if (this.difficultyTimer >= this.difficultyIncreaseInterval) {
            // 难度增长速度调整，更加平缓，使用自然对数函数
            const currentLevelFactor = Math.max(0.2, 1 / Math.log(this.difficulty + Math.E));
            const difficultyIncrease = Math.max(0.2, currentLevelFactor * 1.5);
            
            this.difficulty += difficultyIncrease;
            this.difficultyTimer = 0;
            
            // 难度值上限
            if (this.difficulty > 25) {
                this.difficulty = 25;
            }
            
            // 随着难度增加调整弹幕频率
            this.adjustBulletFrequency();
        }
    }
    
    // 修改弹幕频率调整，让前期弹幕发射更频繁
    adjustBulletFrequency() {
        // 优先调整弹幕生成间隔，但随着难度，调整幅度减小
        // 使用对数函数，确保即使难度很高，弹幕间隔也不会太短
        const difficultyFactor = Math.min(15, this.difficulty); // 限制影响因子最大值
        
        // 应用S型曲线使频率增长在后期更平缓
        // 难度小于10时增长较快，难度大于10时增长变得非常缓慢
        let growthFactor;
        if (difficultyFactor < 10) {
            growthFactor = difficultyFactor / 10; // 0到1的线性增长
        } else {
            // 10到15的难度区间映射到0.9到1.0的增长因子
            growthFactor = 0.9 + (difficultyFactor - 10) / 50; // 非常缓慢的增长
        }
        
        // 最大间隔时间，随难度降低但有下限
        this.bulletFrequencyMax = Math.max(800, 3000 - 2000 * growthFactor);
        
        // 最小间隔时间，随难度降低但有下限
        this.bulletFrequencyMin = Math.max(500, 2000 - 1500 * growthFactor);
        
        // 测试值，可以在控制台查看
        console.log(`难度: ${this.difficulty.toFixed(1)}, 弹幕间隔: ${this.bulletFrequencyMin.toFixed(0)}~${this.bulletFrequencyMax.toFixed(0)}ms`);
    }
    
    checkCollisions() {
        if (!this.player) return;
        
        // 调试模式下的无敌模式：完全跳过碰撞检测
        if (this.isDebug && this.isInvincible) return;
        
        for (const bullet of this.bullets) {
            if (this.isColliding(this.player, bullet)) {
                this.handlePlayerHit();
                break;
            }
        }
    }
    
    isColliding(player, bullet) {
        // 圆形碰撞检测
        const dx = player.x - bullet.x;
        const dy = player.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (player.collisionRadius + bullet.radius);
    }
    
    handlePlayerHit() {
        // 创建爆炸效果（仅在非极低性能模式下）
        if (this.maxParticles > 0) {
            this.createExplosion(this.player.x, this.player.y, 50);
        }
        
        // 直接结束游戏
        this.gameOver();
    }
    
    updateUI() {
        // 只在游戏中才更新时间显示
        if (this.state === GameState.PLAYING) {
            try {
                // 更新时间显示，格式为秒.毫秒
                this.timeDisplay.textContent = this.formatTime(this.survivalTime);
            } catch (error) {
                console.error("更新时间显示出错:", error);
            }
        }
    }

    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制背景
        this.drawBackground();
        
        // 绘制玩家
        if (this.player) {
            this.player.draw(this.ctx);
        }
        
        // 绘制弹幕
        for (const bullet of this.bullets) {
            bullet.draw(this.ctx);
        }
        
        // 只有在允许粒子的情况下才绘制粒子
        if (this.maxParticles > 0) {
        for (const particle of this.particles) {
            particle.draw(this.ctx);
            }
        }
        
        // 调试模式
        if (this.isDebug) {
            this.drawDebugInfo();
        }
    }

    drawBackground() {
        // 绘制渐变背景 - 赛博朋克风格深色背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#000420'); // 深蓝黑色
        gradient.addColorStop(0.5, '#041025'); // 中间深蓝色
        gradient.addColorStop(1, '#080118'); // 深紫黑色
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 添加网格线效果 - 赛博朋克风格
        this.drawGrid();
        
        // 绘制星星和电子粒子
        this.drawStars();
    }

    // 添加网格线方法
    drawGrid() {
        // 设置网格线属性
        this.ctx.strokeStyle = 'rgba(0, 255, 200, 0.1)'; // 青色网格，透明度低
        this.ctx.lineWidth = 0.5;
        
        // 绘制水平网格线
        const gridSize = 40; // 网格大小
        const time = this.survivalTime * 0.05; // 使网格随时间移动
        const offsetY = time % gridSize;

        // 水平线
        for (let y = offsetY; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // 垂直线 - 较少的垂直线，更符合科幻感
        const verticalLines = 12;
        const verticalSpacing = this.canvas.width / verticalLines;
        
        for (let i = 0; i <= verticalLines; i++) {
            const x = i * verticalSpacing;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // 添加远景透视地平线效果
        const horizonY = this.canvas.height * 0.7;
        const grd = this.ctx.createLinearGradient(0, horizonY - 20, 0, horizonY + 20);
        grd.addColorStop(0, 'rgba(0, 255, 200, 0)');
        grd.addColorStop(0.5, 'rgba(0, 255, 200, 0.2)');
        grd.addColorStop(1, 'rgba(0, 255, 200, 0)');
        
        this.ctx.fillStyle = grd;
        this.ctx.fillRect(0, horizonY - 20, this.canvas.width, 40);
    }

    drawStars() {
        // 使用伪随机函数生成稳定的星星位置
        const seed = Math.floor(this.survivalTime); // 改为每秒更新一次，而不是每10秒
        const random = (n) => ((seed * 9301 + 49297) % 233280) / 233280 * n;
        
        // 添加普通星星 - 降低亮度
        this.ctx.fillStyle = 'white';
        
        for (let i = 0; i < 60; i++) {
            const x = random(this.canvas.width);
            const y = (random(this.canvas.height * 2) + this.survivalTime * 5) % this.canvas.height;
            const size = random(2) + 0.5; // 减小星星尺寸
            
            this.ctx.globalAlpha = 0.2 + random(0.3); // 降低不透明度使星星更淡
            this.ctx.fillRect(x, y, size, size);
        }
        
        // 修改霓虹色闪烁星星为淡色系
        // 使用更淡雅、柔和的颜色，减少色彩数量
        const softColors = ['rgba(120, 140, 180, 0.5)', 'rgba(130, 160, 200, 0.5)', 'rgba(140, 170, 210, 0.5)']; 
        
        for (let i = 0; i < 15; i++) { // 减少数量
            // 使用连续的时间而不是离散的seed来计算位置
            const timeOffset = i * 0.5; // 每个星星有不同的时间偏移
            const x = (this.canvas.width * 0.1) + (this.canvas.width * 0.8) * ((Math.sin(this.survivalTime * 0.05 + timeOffset) + 1) / 2);
            const y = (this.canvas.height * 0.1) + (this.canvas.height * 0.7) * ((Math.cos(this.survivalTime * 0.03 + timeOffset) + 1) / 2);
            
            // 使星星大小略有变化，但整体更小
            const size = 2 + Math.sin(this.survivalTime * 0.2 + i) * 0.3;
            const colorIndex = (Math.floor(i + this.survivalTime * 0.1) % softColors.length);
            const pulseRate = 0.3 + (i % 3) * 0.1; // 降低闪烁频率
            
            // 使用正弦函数创建闪烁效果，但降低整体亮度
            const flickerAlpha = 0.3 + 0.2 * Math.sin(this.survivalTime * pulseRate);
            
            // 绘制霓虹星星 - 中心+发光效果
            this.ctx.globalAlpha = flickerAlpha;
            this.ctx.fillStyle = softColors[colorIndex];
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 添加发光效果，但减小光晕范围，降低亮度
            this.ctx.globalAlpha = flickerAlpha * 0.3;
            const gradient = this.ctx.createRadialGradient(x, y, size * 0.5, x, y, size * 2);
            gradient.addColorStop(0, softColors[colorIndex]);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // 添加电子粒子效果 - 使用更淡的颜色
        for (let i = 0; i < 10; i++) { // 减少数量
            const timeOffset = i * 1000; // 每个粒子有不同的时间偏移
            const x = (this.canvas.width * 0.1) + (this.canvas.width * 0.8) * ((Math.sin(this.survivalTime * 0.001 + timeOffset) + 1) / 2);
            const y = (this.canvas.height * 0.1) + (this.canvas.height * 0.7) * ((Math.cos(this.survivalTime * 0.0015 + timeOffset) + 1) / 2);
            const size = 0.8 + Math.sin(this.survivalTime * 0.01 + i) * 0.3;
            
            this.ctx.globalAlpha = 0.4 + Math.sin(this.survivalTime * 0.005 + i) * 0.2;
            this.ctx.fillStyle = 'rgba(120, 180, 210, 0.3)'; // 更淡的蓝色
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1;
    }

    drawDebugInfo() {
        // 绘制碰撞区域
        if (this.player) {
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.collisionRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.isInvincible ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)'; // 无敌时显示绿色，否则为红色
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        for (const bullet of this.bullets) {
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        // 绘制FPS和对象数量信息
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '12px Arial';
        
        // 计算当前FPS
        const currentFps = Math.round(1000 / this.deltaTime);
        
        // 确定性能状态颜色
        let fpsColor;
        if (currentFps < 30) {
            fpsColor = 'rgba(255, 0, 0, 0.8)'; // 红色表示低帧率
        } else if (currentFps < 45) {
            fpsColor = 'rgba(255, 255, 0, 0.8)'; // 黄色表示较低帧率
        } else {
            fpsColor = 'rgba(0, 255, 0, 0.8)'; // 绿色表示高帧率
        }
        
        // 绘制FPS
        this.ctx.fillStyle = fpsColor;
        this.ctx.fillText(`FPS: ${currentFps}`, 10, this.canvas.height - 90);
        
        // 绘制性能模式状态
        let performanceMode = "标准";
        let performanceColor = 'rgba(0, 255, 0, 0.8)';
        
        if (this.lowPerformanceMode) {
            if (this.maxParticles === 0) {
                performanceMode = "极低";
                performanceColor = 'rgba(255, 0, 0, 0.8)';
            } else {
                performanceMode = "低";
                performanceColor = 'rgba(255, 128, 0, 0.8)';
            }
        }
        
        this.ctx.fillStyle = performanceColor;
        this.ctx.fillText(`性能模式: ${performanceMode}`, 10, this.canvas.height - 75);
        
        // 绘制无敌模式状态（移除了按I键切换的提示）
        this.ctx.fillStyle = this.isInvincible ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillText(`无敌模式: ${this.isInvincible ? '开启' : '关闭'}`, 10, this.canvas.height - 60);
        
        // 绘制对象数量信息
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillText(`弹幕数: ${this.bullets.length}/${this.maxBullets}`, 10, this.canvas.height - 45);
        this.ctx.fillText(`粒子数: ${this.particles.length}/${this.maxParticles}`, 10, this.canvas.height - 30);
        this.ctx.fillText(`难度: ${this.difficulty.toFixed(1)}`, 10, this.canvas.height - 15);
    }
    
    // 格式化时间为秒.毫秒
    formatTime(timeInSeconds) {
        // 处理undefined或NaN的情况
        if (timeInSeconds === undefined || isNaN(timeInSeconds)) {
            return "00.00";
        }
        
        // 确保时间是一个有效的数字
        timeInSeconds = Math.max(0, timeInSeconds);
        
        const seconds = Math.floor(timeInSeconds);
        const milliseconds = Math.floor((timeInSeconds % 1) * 100);
        
        return `${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }
    
    // 新增：性能监控与自适应
    monitorPerformance() {
        // 计算当前FPS
        const currentFps = 1000 / this.deltaTime;
        
        // 添加到历史记录
        this.fpsHistory.push(currentFps);
        if (this.fpsHistory.length > this.fpsHistoryMaxLength) {
            this.fpsHistory.shift();
        }
        
        // 定期检查性能
        this.performanceCheckTimer += this.deltaTime;
        if (this.performanceCheckTimer >= this.performanceCheckInterval) {
            this.performanceCheckTimer = 0;
            this.adjustForPerformance();
        }
    }
    
    // 根据性能调整游戏参数
    adjustForPerformance() {
        // 计算平均FPS
        const avgFps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
        
        // 如果帧率极低（低于30FPS），进入极低性能模式，完全关闭粒子效果
        if (avgFps < 30 && (!this.lowPerformanceMode || this.maxParticles > 0)) {
            this.lowPerformanceMode = true;
            this.maxParticles = 0; // 完全关闭粒子效果
            console.log("进入极低性能模式: 完全关闭粒子效果");
            
            // 清除所有现有粒子
            this.particles = [];
            
            // 确保所有弹幕的尾迹标志设置为false
            for (const bullet of this.bullets) {
                bullet.hasTrail = false;
            }
        }
        // 如果帧率低（30-50FPS之间），进入低性能模式
        else if (avgFps >= 30 && avgFps < 50 && !this.lowPerformanceMode) {
            this.lowPerformanceMode = true;
            this.maxParticles = Math.floor(this.initialMaxParticles * 0.3); // 将粒子减少到30%
            console.log("进入低性能模式: 减少粒子数量和视觉效果");
            
            // 减少屏幕上的粒子数量
            if (this.particles.length > this.maxParticles) {
                const excessCount = this.particles.length - this.maxParticles;
                this.particles.splice(0, excessCount);
            }
        } 
        // 如果帧率恢复，退出低性能模式
        else if (avgFps > 59 && this.lowPerformanceMode) {
            this.lowPerformanceMode = false;
            this.maxParticles = this.initialMaxParticles;
            console.log("恢复正常性能模式");
        }
    }
    
    // 从localStorage加载最高时间记录
    loadBestTime() {
        const savedTime = localStorage.getItem('danmakuGameBestTime');
        return savedTime ? parseFloat(savedTime) : 0;
    }
    
    // 保存最高时间记录到localStorage
    saveBestTime(time) {
        if (!this.hasUsedInvincible && time > this.bestTime) {
            this.bestTime = time;
            localStorage.setItem('danmakuGameBestTime', time.toString());
            return true; // 返回true表示创造了新纪录
        }
        return false;
    }
}

// 玩家类
class Player {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.game = game;
        this.width = 30;
        this.height = 40;
        this.collisionRadius = 7.2; // 碰撞半径减少10%，从8减小到7.2
        this.color = '#00ffff';
        this.speed = 5; // 使用固定速度
        this.velocityX = 0;
        this.velocityY = 0;
        
        // 尾焰粒子
        this.trailTimer = 0;
        this.trailInterval = 40; // 更频繁的尾焰粒子
        
        // 倾斜动画 - 简化为固定值
        this.tilt = 0;
        
        // 碰撞点可视化（调试用）
        this.collisionPoint = {
            x: this.x,
            y: this.y,
            visible: false
        };
        
        // 尾部粒子系统
        this.tailParticles = [];
        for (let i = 0; i < 10; i++) {
            this.tailParticles.push({
                x: this.x,
                y: this.y + this.height / 2, // 将位置初始化在飞机底部中心
                size: 2 + Math.random() * 2,
                alpha: 0, // 初始为透明（隐藏）
                color: this.getRandomTailColor(),
                offsetX: (Math.random() - 0.5) * 5,
                offsetY: (Math.random() * 5) + 5 // 向下偏移，确保在尾焰区域
            });
        }
    }
    
    update(deltaTime) {
        // 计算移动
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // 边界检测
        if (this.x - this.width / 2 < 0) this.x = this.width / 2;
        if (this.x + this.width / 2 > this.game.canvas.width) this.x = this.game.canvas.width - this.width / 2;
        if (this.y - this.height / 2 < 0) this.y = this.height / 2;
        if (this.y + this.height / 2 > this.game.canvas.height) this.y = this.game.canvas.height - this.height / 2;
        
        // 设置倾斜角度 - 简化为仅基于左右移动方向的固定值
        if (this.velocityX > 0) {
            this.tilt = -0.1; // 向右倾斜
        } else if (this.velocityX < 0) {
            this.tilt = 0.1; // 向左倾斜
        } else {
            this.tilt = 0; // 没有倾斜
        }
        
        // 在极低性能模式下完全跳过粒子处理
        if (this.game.maxParticles > 0) {
            // 检查飞机是否在移动
            const isMoving = Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1;
            
            // 只有在飞机移动时生成尾焰粒子
            if (isMoving) {
                this.trailTimer += deltaTime;
                if (this.trailTimer >= this.trailInterval) {
                    this.createTrailParticle();
                    this.trailTimer = 0;
                }
            }
            
            // 更新尾部粒子系统
            for (let i = 0; i < this.tailParticles.length; i++) {
                const particle = this.tailParticles[i];
                
                // 只有在飞机移动时才更新和显示尾焰粒子
                if (isMoving) {
                    // 计算尾焰的位置 - 考虑飞机的运动方向
                    const moveAngle = Math.atan2(this.velocityY, this.velocityX);
                    const oppositeAngle = moveAngle + Math.PI; // 运动方向的反方向
                    
                    // 确定尾焰的基准位置（飞机底部中心）
                    const baseX = this.x;
                    const baseY = this.y + this.height / 2;
                    
                    // 根据飞机的运动方向，调整尾焰的位置
                    particle.x = baseX + particle.offsetX + Math.cos(oppositeAngle) * 3;
                    particle.y = baseY + particle.offsetY + Math.sin(oppositeAngle) * 3;
                    
                    particle.alpha = 0.7; // 恢复可见性
                    
                    // 仅稍微调整粒子位置
                    if (Math.random() < 0.1) {
                        particle.offsetX += (Math.random() - 0.5) * 0.5;
                        if (Math.abs(particle.offsetX) > 6) {
                            particle.offsetX = Math.sign(particle.offsetX) * 6;
                        }
                    }
                } else {
                    // 飞机静止时，设置尾焰粒子为透明（隐藏）
                    particle.alpha = 0;
                }
            }
        } else {
            // 在极低性能模式下，确保尾焰粒子不可见
            for (let i = 0; i < this.tailParticles.length; i++) {
                this.tailParticles[i].alpha = 0;
            }
        }
        
        // 更新碰撞点位置
        this.collisionPoint.x = this.x;
        this.collisionPoint.y = this.y;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 应用简化的倾斜角度
        ctx.rotate(this.tilt);
        
        // 仅在非极低性能模式下绘制尾部粒子
        if (this.game.maxParticles > 0) {
            for (const particle of this.tailParticles) {
                const dx = particle.x - this.x;
                const dy = particle.y - this.y;
                
                ctx.fillStyle = particle.color;
                ctx.globalAlpha = particle.alpha;
                ctx.beginPath();
                ctx.arc(dx, dy, particle.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // 重置透明度
        ctx.globalAlpha = 1;
        
        // 绘制飞机主体（三角形）
        // 主体
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // 机翼
        ctx.fillStyle = '#80d8ff';
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, this.height / 4);
        ctx.lineTo(-this.width * 0.8, this.height / 3);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(this.width / 2, this.height / 4);
        ctx.lineTo(this.width * 0.8, this.height / 3);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // 驾驶舱
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 添加发光效果
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width);
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.width, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // 绘制碰撞点（调试用）
        if (this.game.isDebug && this.collisionPoint.visible) {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(this.collisionPoint.x, this.collisionPoint.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    setVelocity(x, y) {
        // 设置速度向量，并且归一化对角线移动
        if (x !== 0 && y !== 0) {
            // 对角线移动，归一化速度
            const length = Math.sqrt(x * x + y * y);
            x /= length;
            y /= length;
        }
        
        this.velocityX = x * this.speed;
        this.velocityY = y * this.speed;
    }
    
    createTrailParticle() {
        // 只有飞机移动时才产生尾焰
        if (Math.abs(this.velocityX) < 0.1 && Math.abs(this.velocityY) < 0.1) return;
        
        // 如果在极低性能模式下(maxParticles为0)，跳过尾焰粒子
        if (this.game.maxParticles === 0) return;
        
        // 检查粒子数量限制
        if (this.game.particles.length >= this.game.maxParticles) return;
        
        // 在低性能模式下减少产生的粒子数量
        if (this.game.lowPerformanceMode && Math.random() > 0.5) return;
        
        // 计算飞机的运动方向角度
        const moveAngle = Math.atan2(this.velocityY, this.velocityX);
        const oppositeAngle = moveAngle + Math.PI; // 反方向
        
        // 确定尾焰的生成位置（飞机底部中心）
        const baseX = this.x;
        const baseY = this.y + this.height / 2;
        
        // 在尾焰位置生成粒子（向运动反方向偏移一些距离）
        const offset = 5;
        const particleX = baseX + Math.cos(oppositeAngle) * offset;
        const particleY = baseY + Math.sin(oppositeAngle) * offset;
        
        // 粒子速度稍慢于飞机，产生拖尾效果
        const speedFactor = 0.5;
        const particleVelocityX = -this.velocityX * speedFactor;
        const particleVelocityY = -this.velocityY * speedFactor;
        
        // 随机大小和生命周期
        const size = 2 + Math.random() * 3;
        const lifetime = 300 + Math.random() * 500;
        
        // 尾焰颜色（黄到红）
        const color = this.getRandomTailColor();
        
        // 创建粒子
        this.game.particles.push(new Particle(
            particleX, particleY,
            particleVelocityX, particleVelocityY,
            size, color, lifetime, this.game
        ));
    }
    
    getRandomTailColor() {
        const colors = ['#ff9900', '#ff6600', '#ff3300', '#ffcc00'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

// 弹幕类
class Bullet {
    constructor(x, y, velocityX, velocityY, radius, color, game, trackingType = 'none') {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.radius = radius || 5;
        this.color = color || '#ff0000';
        this.game = game;
        this.active = true;
        
        // 追踪相关属性
        this.trackingType = trackingType; // none, initial, active
        this.trackingSpeed = 0.05; // 追踪速度
        this.maxTrackingDuration = 3000; // 最大追踪时间
        this.trackingDuration = this.maxTrackingDuration;
        
        // 追踪尾迹
        this.hasTrail = trackingType !== 'none' || Math.random() > 0.6; // 追踪类型或40%的弹幕有尾迹
        this.trailTimer = 0;
        this.trailInterval = 30; // 每30ms生成一个尾迹粒子
    }
    
    update(deltaTime) {
        // 如果是主动追踪类型，更新速度方向朝向玩家
        if (this.trackingType === 'active' && this.game.player && this.trackingDuration > 0) {
            const playerX = this.game.player.x;
            const playerY = this.game.player.y;
            
            // 计算到玩家的方向
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                // 计算当前速度和目标速度
                const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
                const targetDirectionX = dx / distance;
                const targetDirectionY = dy / distance;
                
                // 逐渐调整速度方向
                this.velocityX += (targetDirectionX * currentSpeed - this.velocityX) * this.trackingSpeed;
                this.velocityY += (targetDirectionY * currentSpeed - this.velocityY) * this.trackingSpeed;
                
                // 保持速度大小不变
                const newSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
                if (newSpeed > 0) {
                    this.velocityX = (this.velocityX / newSpeed) * currentSpeed;
                    this.velocityY = (this.velocityY / newSpeed) * currentSpeed;
                }
            }
            
            // 更新追踪持续时间
            this.trackingDuration -= deltaTime;
        }
        
        // 更新位置
        this.x += this.velocityX * (deltaTime / 16);
        this.y += this.velocityY * (deltaTime / 16);
        
        // 在极低性能模式下完全跳过尾迹粒子逻辑
        if (this.game.maxParticles > 0 && this.hasTrail) {
            this.trailTimer += deltaTime;
            const interval = this.game.lowPerformanceMode ? this.trailInterval * 2 : this.trailInterval;
            if (this.trailTimer >= interval) {
                this.createTrailParticle();
                this.trailTimer = 0;
            }
        }
        
        // 边界检测
        const margin = this.radius * 2;
        if (this.x < -margin || 
            this.x > this.game.canvas.width + margin || 
            this.y < -margin || 
            this.y > this.game.canvas.height + margin) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        // 获取基于时间的脉冲效果
        const pulseSize = 1 + Math.sin(this.game.survivalTime * 0.01) * 0.1;
        
        // 绘制弹幕主体
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // 增强的霓虹发光效果
        // 内发光
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.4 * pulseSize, 0, Math.PI * 2);
        const innerGlow = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.2,
            this.x, this.y, this.radius * 1.4
        );
        
        // 获取颜色分量
        let r, g, b;
        if (this.color.startsWith('#')) {
            r = parseInt(this.color.slice(1, 3), 16);
            g = parseInt(this.color.slice(3, 5), 16);
            b = parseInt(this.color.slice(5, 7), 16);
        } else {
            // 默认霓虹色
            r = 255; g = 100; b = 200;
        }
        
        innerGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
        innerGlow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.3)`);
        innerGlow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = innerGlow;
        ctx.fill();
        
        // 外部光晕
        if (this.trackingType !== 'none') {
            // 追踪弹幕有额外的外部发光效果
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 2.5 * pulseSize, 0, Math.PI * 2);
            const outerGlow = ctx.createRadialGradient(
                this.x, this.y, this.radius * 1.3,
                this.x, this.y, this.radius * 2.5
            );
            
            outerGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.2)`);
            outerGlow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            ctx.fillStyle = outerGlow;
            ctx.fill();
        }
        
        // 添加霓虹边缘线
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${Math.min(255, r+50)}, ${Math.min(255, g+50)}, ${Math.min(255, b+50)}, 0.8)`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    createTrailParticle() {
        // 如果在极低性能模式下(maxParticles为0)，跳过尾迹粒子
        if (this.game.maxParticles === 0) return;
        
        // 检查粒子数量限制
        if (this.game.particles.length >= this.game.maxParticles) return;
        
        // 在低性能模式下减少产生的粒子数量
        if (this.game.lowPerformanceMode && Math.random() > 0.5) return;
        
        const angle = Math.atan2(this.velocityY, this.velocityX) + Math.PI; // 反方向
        const distance = this.radius * 0.5;
        const particleX = this.x + Math.cos(angle) * distance;
        const particleY = this.y + Math.sin(angle) * distance;
        
        // 粒子速度为弹幕速度的一小部分，产生拖尾效果
        const speedFactor = 0.2;
        const particleVelocityX = this.velocityX * speedFactor;
        const particleVelocityY = this.velocityY * speedFactor;
        
        // 随机大小和生命周期
        const size = this.radius * 0.4 + Math.random() * this.radius * 0.3;
        const lifetime = 200 + Math.random() * 300;
        
        // 尾迹颜色（基于弹幕颜色但更淡）
        let color = this.color;
        if (typeof color === 'string' && color.startsWith('#')) {
            // 如果是十六进制颜色，创建更淡的版本
            let r = parseInt(color.slice(1, 3), 16);
            let g = parseInt(color.slice(3, 5), 16);
            let b = parseInt(color.slice(5, 7), 16);
            
            // 增加亮度
            r = Math.min(255, r + 100);
            g = Math.min(255, g + 100);
            b = Math.min(255, b + 100);
            
            color = `rgba(${r}, ${g}, ${b}, 0.7)`;
        }
        
        // 创建粒子
        this.game.particles.push(new Particle(
            particleX, particleY,
            -particleVelocityX, -particleVelocityY,
            size, color, lifetime, this.game
        ));
    }
}

// 粒子类
class Particle {
    constructor(x, y, velocityX, velocityY, size, color, lifetime, game) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.size = size;
        this.initialSize = size;
        this.color = color;
        this.lifetime = lifetime;
        this.age = 0;
        this.game = game;
        this.active = true;
    }
    
    update(deltaTime) {
        // 更新位置
        this.x += this.velocityX * (deltaTime / 16);
        this.y += this.velocityY * (deltaTime / 16);
        
        // 更新年龄
        this.age += deltaTime;
        
        // 随着年龄增长，粒子会缩小
        this.size = this.initialSize * (1 - this.age / this.lifetime);
        
        // 如果年龄超过生命周期，标记为非活跃
        if (this.age >= this.lifetime) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        // 根据年龄计算透明度
        const alpha = 1 - (this.age / this.lifetime);
        
        // 解析颜色以设置透明度
        let r, g, b;
        if (typeof this.color === 'string') {
            if (this.color.startsWith('#')) {
                r = parseInt(this.color.slice(1, 3), 16);
                g = parseInt(this.color.slice(3, 5), 16);
                b = parseInt(this.color.slice(5, 7), 16);
            } else if (this.color.startsWith('rgb')) {
                const matches = this.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (matches) {
                    r = parseInt(matches[1]);
                    g = parseInt(matches[2]);
                    b = parseInt(matches[3]);
                } else {
                    r = 255; g = 255; b = 255;
                }
            } else if (this.color.startsWith('rgba')) {
                const matches = this.color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),/);
                if (matches) {
                    r = parseInt(matches[1]);
                    g = parseInt(matches[2]);
                    b = parseInt(matches[3]);
                } else {
                    r = 255; g = 255; b = 255;
                }
            } else {
                r = 255; g = 255; b = 255;
            }
        } else {
            r = 255; g = 255; b = 255;
        }
        
        // 霓虹粒子效果
        const sizeMultiplier = 1 + Math.sin(this.game.survivalTime * 0.01) * 0.1;
        
        // 内核
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * sizeMultiplier, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill();
        
        // 外发光
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2 * sizeMultiplier, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
            this.x, this.y, this.size * 0.5,
            this.x, this.y, this.size * 2
        );
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.7})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

// 弹幕发射器类
class BulletEmitter {
    constructor(game) {
        this.game = game;
        this.colorPalette = [
            '#ff0066', // 霓虹粉红
            '#00ffff', // 青色
            '#ff00ff', // 品红
            '#33ffaa', // 霓虹绿
            '#3377ff', // 霓虹蓝
            '#ff3377', // 霓虹红
            '#88ff00'  // 霓虹黄绿
        ];
    }
    
    getRandomColor() {
        return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    }
    
    emitCircular(x, y, count, speed, radius, trackingType = 'none') {
        const bullets = [];
        const angleStep = (Math.PI * 2) / count;
        
        for (let i = 0; i < count; i++) {
            const angle = angleStep * i;
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;
            
            bullets.push(new Bullet(
                x, y,
                velocityX, velocityY,
                radius,
                this.getRandomColor(),
                this.game,
                trackingType
            ));
        }
        
        return bullets;
    }
    
    emitArc(x, y, count, speed, startAngle, endAngle, radius, trackingType = 'none') {
        const bullets = [];
        const angleStep = (endAngle - startAngle) / Math.max(1, count - 1);
        
        for (let i = 0; i < count; i++) {
            const angle = startAngle + angleStep * i;
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;
            
            bullets.push(new Bullet(
                x, y,
                velocityX, velocityY,
                radius,
                this.getRandomColor(),
                this.game,
                trackingType
            ));
        }
        
        return bullets;
    }
    
    emitRandom(x, y, count, minSpeed, maxSpeed, radius, trackingType = 'none') {
        const bullets = [];
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;
            
            bullets.push(new Bullet(
                x, y,
                velocityX, velocityY,
                radius,
                this.getRandomColor(),
                this.game,
                trackingType
            ));
        }
        
        return bullets;
    }
    
    emitSpiral(x, y, count, speed, radius, rotations, trackingType = 'none') {
        const bullets = [];
        const angleStep = (Math.PI * 2 * rotations) / count;
        
        for (let i = 0; i < count; i++) {
            const angle = angleStep * i;
            const distance = 20 + (i / count) * 30; // 螺旋距离
            const bulletX = x + Math.cos(angle) * distance;
            const bulletY = y + Math.sin(angle) * distance;
            
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;
            
            bullets.push(new Bullet(
                bulletX, bulletY,
                velocityX, velocityY,
                radius,
                this.getRandomColor(),
                this.game,
                trackingType
            ));
        }
        
        return bullets;
    }
    
    emitHeart(x, y, count, speed, size, trackingType = 'none') {
        const bullets = [];
        const angleStep = (Math.PI * 2) / count;
        
        for (let i = 0; i < count; i++) {
            const angle = angleStep * i;
            // 心形公式
            const heartX = x + size * 16 * Math.pow(Math.sin(angle), 3);
            const heartY = y - size * (13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle));
            
            // 从心形向外的速度
            const dirX = heartX - x;
            const dirY = heartY - y;
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            const normalizedDirX = dirX / length;
            const normalizedDirY = dirY / length;
            
            bullets.push(new Bullet(
                heartX, heartY,
                normalizedDirX * speed,
                normalizedDirY * speed,
                4,
                '#ff00aa', // 霓虹粉红色
                this.game,
                trackingType
            ));
        }
        
        return bullets;
    }
    
    // 新增：星形弹幕
    emitStar(x, y, points, count, speed, radius, trackingType = 'none') {
        const bullets = [];
        const angleStep = (Math.PI * 2) / count;
        
        for (let i = 0; i < count; i++) {
            const angle = angleStep * i;
            const r = (Math.abs(Math.cos(points * angle / 2)) * 0.5 + 0.5) * 50; // 星形公式
            const starX = x + Math.cos(angle) * r;
            const starY = y + Math.sin(angle) * r;
            
            // 从星形向外的速度
            const dirX = starX - x;
            const dirY = starY - y;
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            const normalizedDirX = dirX / length;
            const normalizedDirY = dirY / length;
            
            bullets.push(new Bullet(
                starX, starY,
                normalizedDirX * speed,
                normalizedDirY * speed,
                radius,
                this.getRandomColor(),
                this.game,
                trackingType
            ));
        }
        
        return bullets;
    }
    
    // 新增：多重螺旋弹幕
    emitMultiSpiral(x, y, armCount, bulletsPerArm, speed, radius, trackingType = 'none') {
        const bullets = [];
        const armAngleStep = (Math.PI * 2) / armCount;
        const bulletAngleStep = (Math.PI * 2) / bulletsPerArm;
        
        for (let arm = 0; arm < armCount; arm++) {
            const armAngle = armAngleStep * arm;
            
            for (let i = 0; i < bulletsPerArm; i++) {
                const bulletAngle = armAngle + bulletAngleStep * i;
                const distance = 10 + i * 5; // 螺旋距离
                
                const bulletX = x + Math.cos(bulletAngle) * distance;
                const bulletY = y + Math.sin(bulletAngle) * distance;
                
                const velocityX = Math.cos(bulletAngle) * speed;
                const velocityY = Math.sin(bulletAngle) * speed;
                
                bullets.push(new Bullet(
                    bulletX, bulletY,
                    velocityX, velocityY,
                    radius,
                    this.getRandomColor(),
                    this.game,
                    trackingType
                ));
            }
        }
        
        return bullets;
    }
    
    // 新增：纯追踪弹幕
    emitHoming(x, y, count, speed, radius) {
        const bullets = [];
        const angleStep = (Math.PI * 2) / count;
        
        for (let i = 0; i < count; i++) {
            const angle = angleStep * i;
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;
            
            bullets.push(new Bullet(
                x, y,
                velocityX, velocityY,
                radius,
                '#ff0033', // 鲜艳的霓虹红，表示危险
                this.game,
                'active' // 设置为主动追踪
            ));
        }
        
        return bullets;
    }
    
    // 新增：多向弹幕
    emitMultiDirection(directions, bulletCount, speed, radius, trackingType = 'none') {
        const bullets = [];
        
        // 从各个方向发射弹幕
        if (directions.includes('top')) {
            // 从顶部发射
            const startX = this.game.canvas.width / 2;
            const startY = 10;
            const angle = Math.PI / 2; // 向下
            
            for (let i = 0; i < bulletCount; i++) {
                const spreadAngle = angle - Math.PI / 4 + (Math.PI / 2) * (i / (bulletCount - 1));
                const velocityX = Math.cos(spreadAngle) * speed;
                const velocityY = Math.sin(spreadAngle) * speed;
                
                bullets.push(new Bullet(
                    startX, startY,
                    velocityX, velocityY,
                    radius,
                    this.getRandomColor(),
                    this.game,
                    trackingType
                ));
            }
        }
        
        if (directions.includes('left')) {
            // 从左侧发射
            const startX = 10;
            const startY = this.game.canvas.height / 2;
            const angle = 0; // 向右
            
            for (let i = 0; i < bulletCount; i++) {
                const spreadAngle = angle - Math.PI / 4 + (Math.PI / 2) * (i / (bulletCount - 1));
                const velocityX = Math.cos(spreadAngle) * speed;
                const velocityY = Math.sin(spreadAngle) * speed;
                
                bullets.push(new Bullet(
                    startX, startY,
                    velocityX, velocityY,
                    radius,
                    this.getRandomColor(),
                    this.game,
                    trackingType
                ));
            }
        }
        
        if (directions.includes('right')) {
            // 从右侧发射
            const startX = this.game.canvas.width - 10;
            const startY = this.game.canvas.height / 2;
            const angle = Math.PI; // 向左
            
            for (let i = 0; i < bulletCount; i++) {
                const spreadAngle = angle - Math.PI / 4 + (Math.PI / 2) * (i / (bulletCount - 1));
                const velocityX = Math.cos(spreadAngle) * speed;
                const velocityY = Math.sin(spreadAngle) * speed;
                
                bullets.push(new Bullet(
                    startX, startY,
                    velocityX, velocityY,
                    radius,
                    this.getRandomColor(),
                    this.game,
                    trackingType
                ));
            }
        }
        
        if (directions.includes('bottom')) {
            // 从底部发射
            const startX = this.game.canvas.width / 2;
            const startY = this.game.canvas.height - 10;
            const angle = -Math.PI / 2; // 向上
            
            for (let i = 0; i < bulletCount; i++) {
                const spreadAngle = angle - Math.PI / 4 + (Math.PI / 2) * (i / (bulletCount - 1));
                const velocityX = Math.cos(spreadAngle) * speed;
                const velocityY = Math.sin(spreadAngle) * speed;
                
                bullets.push(new Bullet(
                    startX, startY,
                    velocityX, velocityY,
                    radius,
                    this.getRandomColor(),
                    this.game,
                    trackingType
                ));
            }
        }
        
        return bullets;
    }
}

// 游戏初始化
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
}); 