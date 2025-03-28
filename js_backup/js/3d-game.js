/**
 * 弹幕游戏 - 3D版本主游戏逻辑
 */

// 游戏状态
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'game_over'
};

// 主游戏类 - 3D版本
class Game {
    constructor() {
        try {
            console.log("开始初始化游戏...");
            
            // 获取DOM元素
            this.container = document.getElementById('three-container');
            if (!this.container) {
                throw new Error('找不到#three-container元素');
            }
            
            // 游戏状态
            this.state = GameState.MENU;
            this.isRunning = false;
            this.score = 0;
            this.difficulty = 2;
            this.difficultyIncreaseInterval = 5; // 每5秒增加难度
            this.difficultyTimer = 0;
            this.lastFrameTime = 0;
            
            // 调试模式，默认开启
            this.isDebug = true;
            
            // 视觉效果控制
            this.cameraShake = {
                active: false,
                duration: 0,
                intensity: 0,
                elapsed: 0
            };
            
            // 创建碰撞测试UI
            this.createCollisionDebugUI();
            
            // 显示弹幕计数信息
            this.bulletCountDisplay = document.createElement('div');
            this.bulletCountDisplay.style.cssText = 'position:absolute;top:10px;right:10px;color:white;background:rgba(0,0,0,0.5);padding:5px 10px;border-radius:5px;z-index:1000;';
            document.body.appendChild(this.bulletCountDisplay);
            
            // 显示调试模式状态
            this.debugModeDisplay = document.createElement('div');
            this.debugModeDisplay.style.cssText = 'position:absolute;top:50px;right:10px;color:yellow;background:rgba(0,0,0,0.5);padding:5px 10px;border-radius:5px;z-index:1000;';
            this.debugModeDisplay.textContent = '按数字0键或F9键切换调试模式';
            document.body.appendChild(this.debugModeDisplay);
            
            // 游戏元素
            this.player = null;
            this.bullets = [];
            this.effects = []; // 特效（爆炸等）
            
            // 初始化3D场景
            this.setupScene();
            
            // 控制器
            console.log("正在初始化控制器...");
            this.keyboardController = new KeyboardController(this);
            this.joystickController = new VirtualJoystickController(this);
            
            // 弹幕发射器
            console.log("正在初始化弹幕发射器...");
            // 添加检查确保BulletEmitter类存在
            if (typeof BulletEmitter === 'undefined') {
                console.error("错误: BulletEmitter类未定义！");
                // 显示错误消息
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'position:absolute;top:10px;left:10px;color:red;z-index:1000;background:rgba(0,0,0,0.7);padding:10px;';
                errorDiv.textContent = "初始化错误: BulletEmitter类未定义，请检查js文件加载顺序";
                document.body.appendChild(errorDiv);
                throw new Error('BulletEmitter类未定义');
            }
            
            this.bulletEmitter = new BulletEmitter(this);
            
            console.log("弹幕发射器模式列表:", Object.keys(this.bulletEmitter.patterns));
            
            this.bulletPatterns = [];
            this.nextBulletTime = 0; // 立即发射第一波弹幕，原先是200ms
            
            // 碰撞检测
            this.collisionDetection = this.collisionDetection.bind(this);
            
            // UI 元素
            this.startScreen = document.getElementById('start-screen');
            this.gameOverScreen = document.getElementById('game-over-screen');
            this.finalScoreElement = document.getElementById('final-score');
            this.timeElement = document.getElementById('time-survived');
            this.startButton = document.getElementById('start-button');
            this.restartButton = document.getElementById('restart-button');
            
            if (!this.startButton || !this.restartButton) {
                throw new Error('找不到开始或重新开始按钮');
            }
            
            // 事件监听
            this.startButton.addEventListener('click', this.startGame.bind(this));
            this.restartButton.addEventListener('click', this.restartGame.bind(this));
            window.addEventListener('resize', this.onWindowResize.bind(this));
            
            // 添加调试模式切换键
            window.addEventListener('keydown', (e) => {
                // 使用数字0键或F9键作为调试模式开关
                if (e.key === 'F9' || e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') {
                    this.isDebug = !this.isDebug;
                    console.log('调试模式: ' + (this.isDebug ? '开启' : '关闭'));
                    
                    // 显示/隐藏碰撞区域
                    if (this.player) {
                        this.player.showCollisionDebugMesh(this.isDebug);
                    }
                    this.bullets.forEach(bullet => {
                        bullet.showCollisionDebugMesh(this.isDebug);
                    });
                    
                    // 更新调试模式显示
                    this.debugModeDisplay.textContent = `调试模式: ${this.isDebug ? '开启' : '关闭'} (按0键切换)`;
                    this.debugModeDisplay.style.color = this.isDebug ? '#00ff00' : 'yellow';
                    
                    // 显示/隐藏碰撞测试面板
                    if (this.debugPanel) {
                        this.debugPanel.style.display = this.isDebug ? 'block' : 'none';
                    }
                    
                    // 显示调试模式状态提示
                    const statusText = document.createElement('div');
                    statusText.className = 'debug-status';
                    statusText.textContent = this.isDebug ? '调试模式：开启' : '调试模式：关闭';
                    statusText.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);color:white;background:rgba(0,0,0,0.7);padding:10px 20px;border-radius:5px;z-index:1000;font-size:24px;';
                    document.body.appendChild(statusText);
                    
                    // 2秒后自动移除提示
                    setTimeout(() => {
                        statusText.remove();
                    }, 2000);
                }
            });
            
            // 初始化游戏
            console.log("正在初始化游戏元素...");
            this.initializeGame();
            
            console.log("游戏初始化完成!");
        } catch (error) {
            console.error("游戏初始化失败:", error);
            // 显示错误信息在页面上
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position:absolute;top:10px;left:10px;color:red;z-index:1000;background:rgba(0,0,0,0.7);padding:10px;';
            errorDiv.textContent = `初始化错误: ${error.message}`;
            document.body.appendChild(errorDiv);
        }
    }
    
    setupScene() {
        try {
            console.log("正在设置3D场景...");
            
            // 检查Three.js是否正确加载
            if (typeof THREE === 'undefined') {
                throw new Error('Three.js未正确加载');
            }
            
            // 创建场景
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x000030);
            this.scene.fog = new THREE.FogExp2(0x000030, 0.002); // 添加雾效，增强深度感
            
            // 创建相机
            const aspect = window.innerWidth / window.innerHeight;
            this.camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 2000); // 增大FOV从60到70
            
            // 设置相机位置（游戏视角）
            this.camera.position.set(0, -120, 160); // 调整相机位置，提供更好的视角
            this.camera.lookAt(0, 20, 0); // 稍微往上看，可以看到更多弹幕
            
            // 创建渲染器
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            
            // 启用阴影
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            this.container.appendChild(this.renderer.domElement);
            
            // 检查WebGL支持
            if (!this.renderer.capabilities.isWebGL2) {
                console.log("不支持WebGL2，使用WebGL1...");
            }
            
            if (!this.renderer) {
                throw new Error('渲染器创建失败');
            }
            
            // 添加灯光
            this.setupLights();
            
            // 创建星空背景
            this.createStarfield();
            
            console.log("3D场景设置完成");
        } catch (error) {
            console.error("场景设置失败:", error);
            throw error; // 重新抛出错误以便上层处理
        }
    }
    
    setupLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x333333);
        this.scene.add(ambientLight);
        
        // 方向光（模拟太阳光）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 200, 100);
        directionalLight.castShadow = true;
        
        // 设置阴影属性
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -200;
        directionalLight.shadow.camera.right = 200;
        directionalLight.shadow.camera.top = 200;
        directionalLight.shadow.camera.bottom = -200;
        
        this.scene.add(directionalLight);
        
        // 游戏区域中心点光源
        const centerLight = new THREE.PointLight(0x6699ff, 0.8, 400);
        centerLight.position.set(0, 0, 0);
        centerLight.castShadow = true;
        this.scene.add(centerLight);
        
        // 玩家区域点光源
        this.playerLight = new THREE.PointLight(0x3388ff, 1, 200);
        this.playerLight.position.set(0, -150, 0);
        this.playerLight.castShadow = true;
        this.scene.add(this.playerLight);
    }
    
    createStarfield() {
        // 创建远处的星星
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            transparent: true,
            opacity: 0.8
        });
        
        const starCount = 2000;
        const radius = 1000;
        const positions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            
            // 在球面上均匀分布星星
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            positions[i3] = x;
            positions[i3 + 1] = y;
            positions[i3 + 2] = z;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        this.starfield = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.starfield);
    }
    
    initializeGame() {
        // 只在调试模式下输出
        if (this.isDebug) console.log("初始化游戏...");
        
        // 清空游戏元素
        this.cleanupGameElements();
        
        // 创建玩家
        this.player = new Player(0, -110, 0, this); // 调整初始位置
        
        // 初始化弹幕模式
        this.initializeBulletPatterns();
        
        // 重置计时和分数
        this.score = 0;
        this.difficulty = 2;
        this.difficultyTimer = 0;
        this.nextBulletTime = 0; // 立即发射第一波弹幕，原先是200ms
        
        // 更新分数显示
        this.updateScoreDisplay();
    }
    
    cleanupGameElements() {
        // 只在调试模式下输出
        if (this.isDebug) console.log("清理游戏元素...");
        
        // 清除所有弹幕
        if (this.isDebug) console.log(`清理弹幕: ${this.bullets.length}个`);
        this.bullets.forEach(bullet => bullet.remove());
        this.bullets = [];
        
        // 清除所有特效
        if (this.isDebug) console.log(`清理特效: ${this.effects.length}个`);
        this.effects.forEach(effect => effect.remove());
        this.effects = [];
        
        // 清除玩家
        if (this.player) {
            if (this.isDebug) console.log("清理玩家");
            this.player.remove();
            this.player = null;
        }
    }
    
    getBounds() {
        // 计算游戏边界
        // 根据相机视锥体计算可见区域的边界，扩大1.5倍以确保弹幕有足够空间
        const distanceToCamera = this.camera.position.z;
        const fov = this.camera.fov * (Math.PI / 180);
        const height = 2 * Math.tan(fov / 2) * distanceToCamera * 1.5; // 扩大高度
        const width = height * this.camera.aspect * 1.5; // 扩大宽度
        
        // 稍微缩小一点边界，给屏幕留一点边缘
        const margin = 10;
        
        return {
            minX: -width / 2 + margin,
            maxX: width / 2 - margin,
            minY: -height / 2 + margin,
            maxY: height / 2 - margin,
            minZ: -200, // 扩大深度范围
            maxZ: 200
        };
    }
    
    initializeBulletPatterns() {
        // 重置弹幕模式数组
        this.bulletPatterns = [];
        
        // 根据难度解锁不同的弹幕模式
        if (this.difficulty >= 1) {
            // 基础模式 - 直线弹幕
            this.bulletPatterns.push({
                pattern: "line",
                probability: 0.2, // 降低基础模式的概率，让更高级的模式出现频率更高
                config: {}
            });
        }
        
        if (this.difficulty >= 2) {
            // 交叉弹幕
            this.bulletPatterns.push({
                pattern: "cross",
                probability: 0.15,
                config: {}
            });
        }
        
        if (this.difficulty >= 3) {
            // 圆形弹幕
            this.bulletPatterns.push({
                pattern: "circle",
                probability: 0.15,
                config: {}
            });
        }
        
        // 添加深度波动弹幕 - 增强3D效果的关键模式
        if (this.difficulty >= 3) {
            this.bulletPatterns.push({
                pattern: "depthWave",
                probability: 0.2, // 较高概率，因为这是增强3D感的关键弹幕类型
                config: {}
            });
        }
        
        if (this.difficulty >= 4) {
            // 螺旋弹幕
            this.bulletPatterns.push({
                pattern: "spiral",
                probability: 0.15,
                config: {}
            });
        }
        
        // 添加3D螺旋弹幕
        if (this.difficulty >= 5) {
            this.bulletPatterns.push({
                pattern: "3dSpiral",
                probability: 0.15,
                config: {}
            });
        }
        
        if (this.difficulty >= 6) {
            // 随机追踪弹幕
            this.bulletPatterns.push({
                pattern: "tracking",
                probability: 0.1,
                config: {}
            });
        }
        
        if (this.difficulty >= 7) {
            // 全向爆发弹幕
            this.bulletPatterns.push({
                pattern: "burst",
                probability: 0.1,
                config: {}
            });
        }
        
        // 添加3D全向爆发弹幕
        if (this.difficulty >= 8) {
            this.bulletPatterns.push({
                pattern: "3dBurst",
                probability: 0.2,
                config: {}
            });
        }
        
        // 确保所有模式的概率总和为1
        let totalProbability = 0;
        this.bulletPatterns.forEach(pattern => {
            totalProbability += pattern.probability;
        });
        
        // 如果总和不为1，则进行调整
        if (Math.abs(totalProbability - 1) > 0.001) {
            const factor = 1 / totalProbability;
            this.bulletPatterns.forEach(pattern => {
                pattern.probability *= factor;
            });
        }
    }
    
    startGame() {
        // 只保留必要的日志
        if (this.isDebug) console.log("开始游戏...");
        
        // 隐藏开始界面
        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        
        // 初始化游戏
        this.initializeGame();
        
        // 检查弹幕发射器状态
        if (!this.bulletEmitter) {
            console.error("弹幕发射器未初始化");
            this.bulletEmitter = new BulletEmitter(this);
        }
        
        // 只在调试模式下输出
        if (this.isDebug) {
            console.log("弹幕发射器可用模式:", Object.keys(this.bulletEmitter.patterns));
            console.log("游戏弹幕模式数量:", this.bulletPatterns.length);
        }
        
        // 设置游戏状态
        this.state = GameState.PLAYING;
        this.isRunning = true;
        
        // 给玩家短暂无敌时间 - 在调试模式下减少无敌时间以便更快测试
        const invincibilityDuration = this.isDebug ? 200 : 1000; // 减少无敌时间到1秒，调试模式下仅200ms
        this.player.makeInvincible(invincibilityDuration);
        
        // 输出调试信息
        console.log("玩家初始无敌状态:", this.player.invincible);
        console.log("无敌时间设置为:", this.player.invincibleTime);
        
        // 在无敌结束后确认状态
        setTimeout(() => {
            console.log(`${invincibilityDuration}ms后玩家无敌状态:`, this.player.invincible);
            // 强制结束无敌状态（以防万一）
            if (this.player && this.player.invincible) {
                this.player.invincible = false;
                this.player.invincibleTime = 0;
                this.player.mesh.visible = true;
                console.log("已强制结束玩家无敌状态");
                
                if (this.isDebug) {
                    this.updateCollisionDebugInfo("已强制结束玩家无敌状态", false);
                }
            }
        }, invincibilityDuration + 100); // 比无敌时间多100ms，确保无敌状态已经处理过
        
        // 直接测试生成一批弹幕
        this.testDirectBulletGeneration();
        
        // 立即生成第一波弹幕 - 生成更多初始弹幕
        for (let i = 0; i < 5; i++) {
            this.generateBullets();
        }
        
        // 预先调度更多弹幕生成
        setTimeout(() => {
            for (let i = 0; i < 3; i++) {
                this.generateBullets();
            }
        }, 500);
        
        setTimeout(() => {
            for (let i = 0; i < 3; i++) {
                this.generateBullets();
            }
        }, 1000);
        
        // 开始游戏循环
        this.lastFrameTime = performance.now();
        this.gameLoop(this.lastFrameTime);
    }
    
    // 测试直接生成弹幕，跳过模式选择流程
    testDirectBulletGeneration() {
        if (this.isDebug) console.log("测试直接生成弹幕...");
        try {
            // 尝试直接使用circular模式
            const newBullets = this.bulletEmitter.emit(
                'circular', 
                0,    // x
                150,  // y 
                0,    // z
                20,   // count
                0.3,  // speed
                3     // radius
            );
            
            if (newBullets && newBullets.length > 0) {
                if (this.isDebug) console.log(`直接生成弹幕成功: ${newBullets.length}个`);
                this.bullets = this.bullets.concat(newBullets);
            } else {
                console.error("直接生成弹幕失败");
            }
        } catch (e) {
            console.error("直接生成弹幕出错:", e);
        }
    }
    
    gameLoop(currentTime) {
        if (!this.isRunning) return;
        
        // 计算帧间隔
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // 更新游戏状态
        this.update(deltaTime);
        
        // 渲染场景
        this.render();
        
        // 继续循环
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    update(deltaTime) {
        // 更新玩家
        if (this.player) {
            this.player.update(deltaTime);
            
            // 更新玩家光源位置
            if (this.playerLight) {
                this.playerLight.position.copy(this.player.position);
                this.playerLight.position.z += 20; // 稍微在玩家前方
            }
        }
        
        // 更新弹幕计数显示
        this.bulletCountDisplay.textContent = `弹幕数量: ${this.bullets.length}`;
        
        // 更新星空（慢速旋转）
        if (this.starfield) {
            this.starfield.rotation.y += 0.0001 * deltaTime;
            this.starfield.rotation.x += 0.00005 * deltaTime;
        }
        
        // 更新控制器
        this.keyboardController.update();
        this.joystickController.update();
        
        // 更新弹幕
        this.updateBullets(deltaTime);
        
        // 更新特效
        this.updateEffects(deltaTime);
        
        // 增加无敌状态日志
        if (this.player && this.player.invincible) {
            if (this.player.invincibleTime > 0) {
                // 在调试面板显示无敌剩余时间
                if (this.isDebug && this.collisionSummary) {
                    this.updateCollisionDebugInfo(`玩家处于无敌状态，剩余时间: ${this.player.invincibleTime.toFixed(0)}ms`);
                }
            }
        }
        
        // 碰撞检测
        this.collisionDetection();
        
        // 更新分数（生存时间）
        this.score += deltaTime / 1000; // 转为秒
        this.updateScoreDisplay();
        
        // 更新难度
        this.updateDifficulty(deltaTime);
    }
    
    updateBullets(deltaTime) {
        // 更新现有弹幕
        let removedCount = 0;
        
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update(deltaTime);
            
            // 更新调试碰撞区域
            if (this.isDebug) {
                this.bullets[i].showCollisionDebugMesh(true);
            }
            
            // 移除非活跃弹幕
            if (!this.bullets[i].active) {
                this.bullets[i].remove();
                this.bullets.splice(i, 1);
                removedCount++;
            }
        }
        
        // 只在调试模式下输出
        if (removedCount > 0 && this.isDebug) {
            console.log(`移除弹幕数量: ${removedCount}, 剩余弹幕数量: ${this.bullets.length}`);
        }
        
        // 设置弹幕总量上限，根据难度动态调整，但有最大值限制
        const maxBullets = Math.min(800, 400 + Math.floor(this.difficulty * 25)); // 降低基础数量和系数，设置绝对上限
        
        // 如果弹幕总量超过上限，不再生成新弹幕
        if (this.bullets.length >= maxBullets) {
            return;
        }
        
        // 生成新弹幕
        this.nextBulletTime -= deltaTime;
        if (this.nextBulletTime <= 0) {
            // 决定同时发射几种弹幕，降低多模式同时发射的概率，并限制高难度下最多同时2种
            const multiPatternCount = Math.min(2, this.difficulty > 15 ? 2 : (this.difficulty > 8 ? Math.random() < 0.25 ? 2 : 1 : 1));
            
            for (let i = 0; i < multiPatternCount; i++) {
                this.generateBullets();
            }
            
            // 根据难度设置下一次弹幕时间 (降低弹幕生成频率)，高难度时增加最小间隔
            const minInterval = Math.max(150, 450 - (this.difficulty * 20)); // 提高最小间隔
            const maxInterval = Math.max(250, 850 - (this.difficulty * 30)); // 提高最大间隔
            this.nextBulletTime = minInterval + Math.random() * (maxInterval - minInterval);
            
            // 只在调试模式下输出
            if (this.isDebug) {
                console.log(`设置下一次弹幕时间: ${this.nextBulletTime.toFixed(0)}ms, 当前弹幕数: ${this.bullets.length}/${maxBullets}`);
            }
        }
    }
    
    updateEffects(deltaTime) {
        // 更新特效
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].update(deltaTime);
            
            // 移除完成的特效
            if (!this.effects[i].active) {
                this.effects[i].remove();
                this.effects.splice(i, 1);
            }
        }
    }
    
    generateBullets() {
        const now = Date.now();
        if (now < this.nextBulletTime) return;
        
        // 根据难度增加生成速度
        const baseInterval = Math.max(1000 - (this.difficulty * 100), 300);
        this.nextBulletTime = now + baseInterval * (0.8 + Math.random() * 0.4);
        
        try {
            // 生成范围（相对于屏幕的视窗）
            const bounds = this.getBounds();
            
            // 选择一个弹幕模式（基于概率）
            let selectedPattern = null;
            let totalProbability = 0;
            
            // 计算总概率
            for (const pattern of this.bulletPatterns) {
                totalProbability += pattern.probability;
            }
            
            // 随机选择一个模式
            let randomValue = Math.random() * totalProbability;
            let cumulativeProbability = 0;
            
            for (const pattern of this.bulletPatterns) {
                cumulativeProbability += pattern.probability;
                if (randomValue <= cumulativeProbability) {
                    selectedPattern = pattern;
                    break;
                }
            }
            
            if (!selectedPattern) {
                console.warn("没有选中弹幕模式，使用默认直线模式");
                selectedPattern = { pattern: "line", config: {} };
            }
            
            // 基于选中的模式生成弹幕
            let bullets = [];
            const radiusMultiplier = Math.min(1 + this.difficulty * 0.05, 1.5); // 随难度略微增加弹幕大小上限
            
            // 记录最近生成的弹幕类型
            const patternName = selectedPattern.pattern;
            
            switch (patternName) {
                case "line": {
                    // 直线弹幕 - 从屏幕一侧发射
                    const sides = ["top", "right", "bottom", "left"];
                    const side = sides[Math.floor(Math.random() * sides.length)];
                    
                    // 基于难度调整弹幕数量
                    const count = 3 + Math.floor(this.difficulty * 0.7);
                    
                    let x, y, speedX, speedY;
                    
                    // 根据不同的边生成不同的起始位置和速度
                    switch (side) {
                        case "top":
                            x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
                            y = bounds.maxY + 20;
                            speedX = 0;
                            speedY = -(1 + Math.random() + this.difficulty * 0.1);
                            break;
                        case "right":
                            x = bounds.maxX + 20;
                            y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
                            speedX = -(1 + Math.random() + this.difficulty * 0.1);
                            speedY = 0;
                            break;
                        case "bottom":
                            x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
                            y = bounds.minY - 20;
                            speedX = 0;
                            speedY = 1 + Math.random() + this.difficulty * 0.1;
                            break;
                        case "left":
                            x = bounds.minX - 20;
                            y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
                            speedX = 1 + Math.random() + this.difficulty * 0.1;
                            speedY = 0;
                            break;
                    }
                    
                    // 生成一排弹幕
                    const direction = side === "top" || side === "bottom" ? "horizontal" : "vertical";
                    const spread = 30; // 扩散范围
                    
                    for (let i = 0; i < count; i++) {
                        let bulletX = x, bulletY = y;
                        let bulletSpeedX = speedX, bulletSpeedY = speedY;
                        
                        if (direction === "horizontal") {
                            bulletX = x + (i - (count - 1) / 2) * spread;
                        } else {
                            bulletY = y + (i - (count - 1) / 2) * spread;
                        }
                        
                        // 添加Z轴的随机偏移（增强3D效果）
                        const bulletZ = (Math.random() - 0.5) * 60;
                        const bulletSpeedZ = (Math.random() - 0.5) * 0.5;
                        
                        const bullet = new Bullet(
                            bulletX, bulletY, bulletZ, 
                            bulletSpeedX, bulletSpeedY, bulletSpeedZ,
                            (1 + Math.random() * 2) * radiusMultiplier,
                            this.bulletEmitter.getRandomColor(),
                            this
                        );
                        
                        bullets.push(bullet);
                    }
                    break;
                }
                
                case "circle": {
                    // 圆形弹幕 - 从中心点向四周发射
                    const centerX = bounds.minX + (bounds.maxX - bounds.minX) * Math.random();
                    const centerY = bounds.minY + (bounds.maxY - bounds.minY) * Math.random();
                    const centerZ = (Math.random() - 0.5) * 60; // 随机深度位置
                    
                    // 增加难度时增加弹幕数量
                    const bulletCount = 8 + Math.floor(this.difficulty);
                    const speed = 0.8 + Math.random() * 0.8 + this.difficulty * 0.1;
                    
                    bullets = this.bulletEmitter.emit(
                        "circle",
                        centerX, centerY, centerZ,
                        bulletCount,
                        speed,
                        (1 + Math.random()) * radiusMultiplier
                    );
                    break;
                }
                
                case "cross": {
                    // 十字交叉弹幕
                    const centerX = bounds.minX + (bounds.maxX - bounds.minX) * Math.random();
                    const centerY = bounds.minY + (bounds.maxY - bounds.minY) * Math.random();
                    const centerZ = (Math.random() - 0.5) * 50; // 随机深度位置
                    
                    const speed = 1 + Math.random() + this.difficulty * 0.1;
                    const bulletCount = 4 + Math.floor(this.difficulty * 0.5);
                    
                    // 水平线
                    for (let i = 0; i < bulletCount; i++) {
                        const offsetX = (i - (bulletCount - 1) / 2) * 20;
                        const bullet = new Bullet(
                            centerX + offsetX, centerY, centerZ,
                            0, -speed, 0,
                            (1 + Math.random()) * radiusMultiplier,
                            this.bulletEmitter.getRandomColor(),
                            this
                        );
                        bullets.push(bullet);
                    }
                    
                    // 垂直线
                    for (let i = 0; i < bulletCount; i++) {
                        const offsetY = (i - (bulletCount - 1) / 2) * 20;
                        const bullet = new Bullet(
                            centerX, centerY + offsetY, centerZ,
                            -speed, 0, 0,
                            (1 + Math.random()) * radiusMultiplier,
                            this.bulletEmitter.getRandomColor(),
                            this
                        );
                        bullets.push(bullet);
                    }
                    
                    // 添加一些具有Z轴速度的弹幕，增强3D效果
                    for (let i = 0; i < Math.floor(bulletCount / 2); i++) {
                        const offsetZ = (i - Math.floor(bulletCount / 4)) * 10;
                        const bullet = new Bullet(
                            centerX, centerY, centerZ + offsetZ,
                            -speed * 0.5, -speed * 0.5, (Math.random() - 0.5) * speed,
                            (1 + Math.random()) * radiusMultiplier,
                            this.bulletEmitter.getRandomColor(),
                            this
                        );
                        bullets.push(bullet);
                    }
                    break;
                }
                
                case "spiral": {
                    // 螺旋弹幕
                    const centerX = bounds.minX + (bounds.maxX - bounds.minX) * Math.random();
                    const centerY = bounds.minY + (bounds.maxY - bounds.minY) * Math.random();
                    const centerZ = (Math.random() - 0.5) * 40; // 随机深度位置
                    
                    const bulletCount = 15 + Math.floor(this.difficulty);
                    const speed = 0.8 + Math.random() * 0.5 + this.difficulty * 0.08;
                    
                    bullets = this.bulletEmitter.emit(
                        "spiral",
                        centerX, centerY, centerZ,
                        bulletCount,
                        speed,
                        (0.8 + Math.random() * 0.6) * radiusMultiplier
                    );
                    break;
                }
                
                case "tracking": {
                    // 追踪弹幕
                    // 从四周边缘随机位置生成朝向玩家的追踪弹幕
                    const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
                    
                    let x, y;
                    switch (side) {
                        case 0: // top
                            x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
                            y = bounds.maxY + 20;
                            break;
                        case 1: // right
                            x = bounds.maxX + 20;
                            y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
                            break;
                        case 2: // bottom
                            x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
                            y = bounds.minY - 20;
                            break;
                        case 3: // left
                            x = bounds.minX - 20;
                            y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
                            break;
                    }
                    
                    // 随机深度值，增强3D效果
                    const z = (Math.random() - 0.5) * 60;
                    
                    // 随机选择追踪类型
                    const trackingType = Math.random() > 0.3 ? 'active' : 'initial';
                    
                    // 根据难度调整追踪弹幕数量
                    const count = 1 + Math.floor(this.difficulty * 0.3);
                    
                    for (let i = 0; i < count; i++) {
                        // 计算初始速度（不重要，因为追踪弹幕会自行调整方向）
                        const speedX = (Math.random() - 0.5) * 2;
                        const speedY = (Math.random() - 0.5) * 2;
                        const speedZ = (Math.random() - 0.5) * 1; // Z轴速度较小
                        
                        const bullet = new Bullet(
                            x + (Math.random() - 0.5) * 20, 
                            y + (Math.random() - 0.5) * 20, 
                            z + (Math.random() - 0.5) * 20,
                            speedX, speedY, speedZ,
                            (1 + Math.random()) * radiusMultiplier,
                            this.bulletEmitter.getRandomColor(),
                            this,
                            trackingType
                        );
                        
                        bullets.push(bullet);
                    }
                    break;
                }
                
                case "burst": {
                    // 爆发弹幕
                    const centerX = bounds.minX + (bounds.maxX - bounds.minX) * Math.random();
                    const centerY = bounds.minY + (bounds.maxY - bounds.minY) * Math.random();
                    const centerZ = (Math.random() - 0.5) * 50; // 随机深度
                    
                    const bulletCount = 12 + Math.floor(this.difficulty * 0.8);
                    const speed = 1 + Math.random() * 0.8 + this.difficulty * 0.1;
                    
                    bullets = this.bulletEmitter.emit(
                        "circular",
                        centerX, centerY, centerZ,
                        bulletCount,
                        speed,
                        (0.8 + Math.random() * 0.6) * radiusMultiplier,
                        'none' // 不追踪
                    );
                    break;
                }
                
                // 新增的3D深度弹幕模式
                case "depthWave": {
                    // Z轴波动弹幕
                    const centerX = bounds.minX + (bounds.maxX - bounds.minX) * Math.random();
                    const centerY = bounds.minY + (bounds.maxY - bounds.minY) * Math.random();
                    const centerZ = (Math.random() - 0.5) * 40;
                    
                    const bulletCount = 15 + Math.floor(this.difficulty * 0.7);
                    const speed = 0.7 + Math.random() * 0.6 + this.difficulty * 0.08;
                    
                    bullets = this.bulletEmitter.emit(
                        "depthWave",
                        centerX, centerY, centerZ,
                        bulletCount,
                        speed,
                        (0.7 + Math.random() * 0.6) * radiusMultiplier
                    );
                    break;
                }
                
                case "3dSpiral": {
                    // 3D螺旋弹幕
                    const centerX = bounds.minX + (bounds.maxX - bounds.minX) * Math.random();
                    const centerY = bounds.minY + (bounds.maxY - bounds.minY) * Math.random();
                    const centerZ = (Math.random() - 0.5) * 50;
                    
                    const bulletCount = 20 + Math.floor(this.difficulty * 0.8);
                    const speed = 0.6 + Math.random() * 0.5 + this.difficulty * 0.07;
                    const revolutions = 2 + Math.floor(Math.random() * 3);
                    
                    bullets = this.bulletEmitter.emit(
                        "spiralDepth",
                        centerX, centerY, centerZ,
                        bulletCount,
                        speed,
                        (0.7 + Math.random() * 0.5) * radiusMultiplier,
                        'none',
                        revolutions
                    );
                    break;
                }
                
                case "3dBurst": {
                    // 全方向爆发弹幕
                    const centerX = bounds.minX + (bounds.maxX - bounds.minX) * Math.random();
                    const centerY = bounds.minY + (bounds.maxY - bounds.minY) * Math.random();
                    const centerZ = (Math.random() - 0.5) * 60;
                    
                    const bulletCount = 25 + Math.floor(this.difficulty * 1.2);
                    const speed = 0.7 + Math.random() * 0.6 + this.difficulty * 0.08;
                    
                    bullets = this.bulletEmitter.emit(
                        "burst3D",
                        centerX, centerY, centerZ,
                        bulletCount,
                        speed,
                        (0.6 + Math.random() * 0.6) * radiusMultiplier
                    );
                    break;
                }
                
                default:
                    console.warn("未知弹幕模式:", patternName);
                break;
            }
            
            // 将生成的弹幕添加到游戏中
            this.bullets.push(...bullets);
            
            // 更新弹幕计数显示
            this.updateBulletCountDisplay();
            
        } catch (error) {
            console.error("生成弹幕时出错:", error);
        }
    }
    
    updateDifficulty(deltaTime) {
        // 每隔一段时间增加难度
        this.difficultyTimer += deltaTime / 1000;
        
        if (this.difficultyTimer >= this.difficultyIncreaseInterval) {
            // 降低难度增加幅度，尤其是在高难度时
            const baseIncrease = 1.0;
            const difficultyIncrease = this.difficulty < 5 ? baseIncrease :
                                      this.difficulty < 10 ? baseIncrease * 0.6 :
                                      this.difficulty < 15 ? baseIncrease * 0.4 :
                                      this.difficulty < 20 ? baseIncrease * 0.2 :
                                      baseIncrease * 0.1;
                
            this.difficulty += difficultyIncrease;
            
            // 设置难度上限，防止游戏变得过于困难
            this.difficulty = Math.min(this.difficulty, 25);
            
            this.difficultyTimer = 0;
            
            // 只输出关键日志
            console.log(`难度提升: Level ${Math.floor(this.difficulty)}`);
            
            // 创建难度提升的视觉效果
            this.createDifficultyUpEffect();
        }
    }
    
    createDifficultyUpEffect() {
        // 从场景中心随机创建多个粒子爆炸
        const centerExplosion = new ExplosionEffect(0, 0, 0, 100, 0xffaa00, this);
        this.effects.push(centerExplosion);
        
        // 添加相机震动效果
        this.cameraShake.active = true;
        this.cameraShake.duration = 500; // 500ms
        this.cameraShake.intensity = 1.5; // 中等强度
        this.cameraShake.elapsed = 0;
        
        // 在场景边缘也添加一些爆炸效果
        const bounds = this.getBounds();
        const positions = [
            [bounds.minX / 2, bounds.minY / 2, 0],
            [bounds.maxX / 2, bounds.minY / 2, 0],
            [bounds.minX / 2, bounds.maxY / 2, 0],
            [bounds.maxX / 2, bounds.maxY / 2, 0]
        ];
        
        positions.forEach(pos => {
            const explosion = new ExplosionEffect(
                pos[0], pos[1], pos[2],
                50, // 粒子数
                0xffaa00, // 和主爆炸同色
                this
            );
            this.effects.push(explosion);
        });
    }
    
    collisionDetection() {
        // 简化的碰撞检测
        if (!this.player || this.player.invincible) {
            if (this.isDebug && this.player && this.player.invincible) {
                this.updateCollisionDebugInfo("玩家处于无敌状态，碰撞未检测");
            }
                return;
            }
            
        const playerBBox = this.player.getBoundingBox();
        
        // 记录最近的弹幕信息以显示在调试面板上
        const nearbyBullets = [];
        
        // 更新玩家调试信息
            if (this.isDebug) {
            this.updatePlayerDebugInfo(playerBBox);
        }
        
        for (let i = 0; i < this.bullets.length; i++) {
            const bullet = this.bullets[i];
            if (!bullet.active) continue;
            
            const bulletBBox = bullet.getBoundingBox();
            
            let collision = false;
            
            // 球体与球体碰撞（这是最常见的情况，玩家和弹幕都用球形碰撞盒）
            if (bulletBBox.type === 'sphere' && playerBBox.type === 'sphere') {
                // 计算仅在XY平面的距离，忽略Z轴差异的影响
                const distanceXY = new THREE.Vector2(
                    bulletBBox.position.x - playerBBox.position.x,
                    bulletBBox.position.y - playerBBox.position.y
                ).length();
                
                // 碰撞阈值
                const minDistance = bulletBBox.radius + playerBBox.radius;
                
                // 使用可调整的阈值比例参数
                const xyThreshold = this.xyCollisionThreshold || 0.8;
                const zThreshold = this.zCollisionThreshold || 2.0;
                
                // Z轴距离
                const zDistance = Math.abs(bulletBBox.position.z - playerBBox.position.z);
                
                // 正常的3D距离计算
                const distance3D = bulletBBox.position.distanceTo(playerBBox.position);
                
                // 如果选择忽略Z轴，只需要检查XY平面的距离
                if (this.ignoreZAxis) {
                    if (distanceXY < minDistance * xyThreshold) {
                        collision = true;
                    }
                } else {
                    // 使用两步判断：
                    // 1. XY平面距离必须小于设定的碰撞阈值
                    // 2. Z轴距离必须小于设定的碰撞阈值
                    if (distanceXY < minDistance * xyThreshold && zDistance < minDistance * zThreshold) {
                        collision = true;
                    }
                }
                
                // 保存附近弹幕的信息（XY距离小于阈值的2倍）
                if (distanceXY < minDistance * 2) {
                    nearbyBullets.push({
                        id: i,
                        distance3D: distance3D.toFixed(1),
                        distanceXY: distanceXY.toFixed(1),
                        zDistance: zDistance.toFixed(1),
                        minDistance: minDistance.toFixed(1),
                        xyRatio: (distanceXY / minDistance).toFixed(2),
                        zRatio: (zDistance / minDistance).toFixed(2),
                        collision: collision,
                        color: bullet.color.getHexString(),
                        ignoreZ: this.ignoreZAxis
                    });
                }
            } 
            // 可以添加更多类型的碰撞检测...
            
            if (collision) {
                // 调试日志
                    if (this.isDebug) {
                    console.log("碰撞检测：玩家与弹幕碰撞，位置:", this.player.position.x, this.player.position.y);
                    // 更新碰撞调试信息
                    this.updateCollisionDebugInfo("发生碰撞！", true);
                }
                
                // 开始相机震动
                this.cameraShake.active = true;
                this.cameraShake.duration = 300; // 300ms
                this.cameraShake.intensity = 2; // 震动强度
                this.cameraShake.elapsed = 0;
                
                // 创建爆炸特效
                const explosion = new ExplosionEffect(
                    this.player.position.x,
                    this.player.position.y,
                    this.player.position.z,
                    30, // 增加粒子数
                    bullet.color, // 使用击中弹幕的颜色
                    this
                );
                this.effects.push(explosion);
                
                // 游戏结束
                            this.gameOver();
                            return;
                        }
                    }
        
        // 更新附近弹幕信息
        if (this.isDebug) {
            this.updateNearbyBulletsInfo(nearbyBullets);
            
            // 如果没有碰撞发生，更新碰撞检测结果
            if (nearbyBullets.length > 0) {
                this.updateCollisionDebugInfo(`检测了${nearbyBullets.length}个附近弹幕，未发生碰撞，Z轴忽略: ${this.ignoreZAxis ? '是' : '否'}`);
            } else {
                this.updateCollisionDebugInfo("附近没有弹幕");
            }
        }
    }
    
    // 更新玩家调试信息
    updatePlayerDebugInfo(playerBBox) {
        if (!this.playerDebugInfo) return;
        
        const html = `
            <div>位置: X=${playerBBox.position.x.toFixed(1)}, Y=${playerBBox.position.y.toFixed(1)}, Z=${playerBBox.position.z.toFixed(1)}</div>
            <div>碰撞半径: ${playerBBox.radius.toFixed(1)}</div>
            <div>无敌状态: ${this.player.invincible ? '是' : '否'}</div>
            <div>无敌时间: ${this.player.invincibleTime.toFixed(0)}ms</div>
        `;
        
        this.playerDebugInfo.innerHTML = html;
    }
    
    // 更新附近弹幕信息
    updateNearbyBulletsInfo(nearbyBullets) {
        if (!this.nearbyBulletsInfo) return;
        
        if (nearbyBullets.length === 0) {
            this.nearbyBulletsInfo.innerHTML = "<div style='color:#999'>附近没有弹幕</div>";
            return;
        }
        
        // 按XY距离排序
        nearbyBullets.sort((a, b) => parseFloat(a.distanceXY) - parseFloat(b.distanceXY));
        
        let html = '';
        for (const bullet of nearbyBullets) {
            const color = bullet.collision ? '#ff5555' : '#ffffff';
            html += `
                <div style="margin-bottom:8px;border-left:3px solid #${bullet.color};padding-left:5px;color:${color}">
                    <div>弹幕#${bullet.id} ${bullet.collision ? '(发生碰撞!)' : ''}</div>
                    <div>3D距离: ${bullet.distance3D} (阈值: ${bullet.minDistance})</div>
                    <div>XY距离: ${bullet.distanceXY} (比例: ${bullet.xyRatio})</div>
                    <div>Z轴距离: ${bullet.zDistance} (比例: ${bullet.zRatio})</div>
                </div>
            `;
        }
        
        this.nearbyBulletsInfo.innerHTML = html;
    }
    
    // 更新碰撞检测结果
    updateCollisionDebugInfo(message, isCollision = false) {
        if (!this.collisionSummary) return;
        
        const time = new Date().toLocaleTimeString();
        const color = isCollision ? '#ff5555' : '#aaaaaa';
        
        this.collisionSummary.innerHTML = `
            <div style="color:${color}">
                ${time}: ${message}
            </div>
        `;
    }
    
    gameOver() {
        try {
            // 只输出关键信息
            if (this.isDebug) console.log("玩家死亡，游戏结束");
            
            // 创建爆炸效果
            const explosionPosition = this.player.position.clone();
            
            try {
                this.effects.push(new ExplosionEffect(
                    explosionPosition.x,
                    explosionPosition.y,
                    explosionPosition.z,
                    70, // 更多粒子
                    this.player ? (this.player.mesh && this.player.mesh.material ? this.player.mesh.material.color.getHex() : 0x009fd4) : 0x009fd4,
                    this
                ));
            } catch (error) {
                console.error("创建爆炸效果时出错");
            }
            
            // 设置游戏状态
            this.state = GameState.GAME_OVER;
            this.isRunning = false;
            
            // 显示游戏结束画面
            this.finalScoreElement.textContent = Math.floor(this.score);
            this.gameOverScreen.classList.remove('hidden');
        } catch (error) {
            console.error("游戏结束处理出错:", error);
        }
    }
    
    restartGame() {
        try {
            // 只在调试模式下输出
            if (this.isDebug) console.log("重新开始游戏...");
            
            // 确保游戏状态被正确重置
            this.state = GameState.MENU;
            this.isRunning = false;
            
            // 隐藏游戏结束画面
            if (this.gameOverScreen) {
                this.gameOverScreen.classList.add('hidden');
            }
            
            // 调用startGame开始新游戏
            this.startGame();
        } catch (error) {
            console.error("重新开始游戏时出错:", error);
            
            // 尝试强制重置游戏状态
            this.cleanupGameElements();
            location.reload(); // 如果所有尝试都失败，刷新页面
        }
    }
    
    render() {
        // 处理相机震动
        if (this.cameraShake.active) {
            this.cameraShake.elapsed += 16; // 假设16ms每帧
            
            if (this.cameraShake.elapsed < this.cameraShake.duration) {
                // 计算震动强度（随时间减弱）
                const intensity = this.cameraShake.intensity * 
                    (1 - this.cameraShake.elapsed / this.cameraShake.duration);
                
                // 应用随机偏移
                const shakeX = (Math.random() - 0.5) * intensity;
                const shakeY = (Math.random() - 0.5) * intensity;
                
                // 保存原始位置
                if (!this.cameraOriginalPosition) {
                    this.cameraOriginalPosition = this.camera.position.clone();
                }
                
                // 临时修改相机位置
                this.camera.position.x = this.cameraOriginalPosition.x + shakeX;
                this.camera.position.y = this.cameraOriginalPosition.y + shakeY;
            } else {
                // 震动结束，恢复原始位置
                if (this.cameraOriginalPosition) {
                    this.camera.position.copy(this.cameraOriginalPosition);
                    this.cameraOriginalPosition = null;
                }
                this.cameraShake.active = false;
            }
        }
        
        // 渲染场景
        this.renderer.render(this.scene, this.camera);
    }
    
    updateScoreDisplay() {
        document.getElementById('time-survived').textContent = Math.floor(this.score);
    }
    
    onWindowResize() {
        // 更新相机和渲染器尺寸
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // 添加updateBulletCountDisplay方法
    updateBulletCountDisplay() {
        if (this.bulletCountDisplay) {
            this.bulletCountDisplay.textContent = `弹幕数量: ${this.bullets.length}`;
        }
    }

    // 添加创建碰撞测试UI的方法
    createCollisionDebugUI() {
        // 创建调试UI容器
        this.debugPanel = document.createElement('div');
        this.debugPanel.style.cssText = 'position:absolute;top:100px;right:10px;background:rgba(0,0,0,0.7);color:white;padding:10px;border-radius:5px;z-index:1000;width:300px;font-size:12px;font-family:monospace;max-height:80vh;overflow-y:auto;';
        document.body.appendChild(this.debugPanel);
        
        // 添加测试标题
        const title = document.createElement('div');
        title.textContent = '碰撞测试面板';
        title.style.cssText = 'font-weight:bold;font-size:14px;margin-bottom:10px;text-align:center;';
        this.debugPanel.appendChild(title);
        
        // 添加玩家信息区域
        const playerSection = document.createElement('div');
        playerSection.innerHTML = '<div style="font-weight:bold;margin:5px 0;border-bottom:1px solid #444;">玩家信息</div>';
        this.playerDebugInfo = document.createElement('div');
        playerSection.appendChild(this.playerDebugInfo);
        this.debugPanel.appendChild(playerSection);
        
        // 添加弹幕信息区域
        const bulletSection = document.createElement('div');
        bulletSection.innerHTML = '<div style="font-weight:bold;margin:10px 0 5px;border-bottom:1px solid #444;">附近弹幕</div>';
        this.nearbyBulletsInfo = document.createElement('div');
        bulletSection.appendChild(this.nearbyBulletsInfo);
        this.debugPanel.appendChild(bulletSection);
        
        // 添加总结信息区域
        const summarySection = document.createElement('div');
        summarySection.innerHTML = '<div style="font-weight:bold;margin:10px 0 5px;border-bottom:1px solid #444;">碰撞检测结果</div>';
        this.collisionSummary = document.createElement('div');
        summarySection.appendChild(this.collisionSummary);
        this.debugPanel.appendChild(summarySection);
        
        // 添加参数调整区域
        const adjustSection = document.createElement('div');
        adjustSection.innerHTML = '<div style="font-weight:bold;margin:10px 0 5px;border-bottom:1px solid #444;">参数调整</div>';
        
        // XY平面碰撞阈值调整
        const xyThresholdDiv = document.createElement('div');
        xyThresholdDiv.style.margin = '5px 0';
        xyThresholdDiv.innerHTML = 'XY平面碰撞比例: <span id="xy-threshold-value">0.8</span>';
        const xySlider = document.createElement('input');
        xySlider.type = 'range';
        xySlider.min = '0.1';
        xySlider.max = '1.5';
        xySlider.step = '0.1';
        xySlider.value = '0.8';
        xySlider.style.width = '100%';
        xySlider.addEventListener('input', (e) => {
            this.xyCollisionThreshold = parseFloat(e.target.value);
            document.getElementById('xy-threshold-value').textContent = this.xyCollisionThreshold;
        });
        xyThresholdDiv.appendChild(xySlider);
        adjustSection.appendChild(xyThresholdDiv);
        this.xyCollisionThreshold = 0.8;
        
        // Z轴碰撞阈值调整
        const zThresholdDiv = document.createElement('div');
        zThresholdDiv.style.margin = '5px 0';
        zThresholdDiv.innerHTML = 'Z轴碰撞比例: <span id="z-threshold-value">2.0</span>';
        const zSlider = document.createElement('input');
        zSlider.type = 'range';
        zSlider.min = '0.5';
        zSlider.max = '5.0';
        zSlider.step = '0.5';
        zSlider.value = '2.0';
        zSlider.style.width = '100%';
        zSlider.addEventListener('input', (e) => {
            this.zCollisionThreshold = parseFloat(e.target.value);
            document.getElementById('z-threshold-value').textContent = this.zCollisionThreshold;
        });
        zThresholdDiv.appendChild(zSlider);
        adjustSection.appendChild(zThresholdDiv);
        this.zCollisionThreshold = 2.0;
        
        // 忽略Z轴选项
        const ignoreZDiv = document.createElement('div');
        ignoreZDiv.style.margin = '5px 0';
        const ignoreZCheckbox = document.createElement('input');
        ignoreZCheckbox.type = 'checkbox';
        ignoreZCheckbox.id = 'ignore-z-checkbox';
        ignoreZCheckbox.checked = false;
        ignoreZCheckbox.addEventListener('change', (e) => {
            this.ignoreZAxis = e.target.checked;
        });
        const ignoreZLabel = document.createElement('label');
        ignoreZLabel.htmlFor = 'ignore-z-checkbox';
        ignoreZLabel.textContent = ' 仅使用XY平面距离（忽略Z轴差异）';
        ignoreZDiv.appendChild(ignoreZCheckbox);
        ignoreZDiv.appendChild(ignoreZLabel);
        adjustSection.appendChild(ignoreZDiv);
        this.ignoreZAxis = false;
        
        // 添加强制碰撞按钮
        const forceCollisionBtn = document.createElement('button');
        forceCollisionBtn.textContent = '强制触发碰撞';
        forceCollisionBtn.style.cssText = 'margin-top:10px;padding:5px;background:#f00;color:white;border:none;border-radius:3px;cursor:pointer;width:100%;';
        forceCollisionBtn.addEventListener('click', () => {
            if (this.player) {
                this.forceCollision();
            }
        });
        adjustSection.appendChild(forceCollisionBtn);

        // 添加强制可被击中按钮
        const makeVulnerableBtn = document.createElement('button');
        makeVulnerableBtn.textContent = '结束无敌状态';
        makeVulnerableBtn.style.cssText = 'margin-top:5px;padding:5px;background:#ff9900;color:white;border:none;border-radius:3px;cursor:pointer;width:100%;';
        makeVulnerableBtn.addEventListener('click', () => {
            if (this.player && this.player.invincible) {
                this.player.invincible = false;
                this.player.invincibleTime = 0;
                this.player.mesh.visible = true;
                this.updateCollisionDebugInfo("玩家无敌状态被手动结束", false);
                console.log("玩家无敌状态被手动结束");
            } else {
                this.updateCollisionDebugInfo("玩家已经可被击中", false);
            }
        });
        adjustSection.appendChild(makeVulnerableBtn);
        
        this.debugPanel.appendChild(adjustSection);
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭调试面板';
        closeBtn.style.cssText = 'margin-top:10px;padding:5px;background:#444;color:white;border:none;border-radius:3px;cursor:pointer;width:100%;';
        closeBtn.addEventListener('click', () => {
            this.debugPanel.style.display = this.debugPanel.style.display === 'none' ? 'block' : 'none';
        });
        this.debugPanel.appendChild(closeBtn);
        
        // 默认隐藏调试面板
        this.debugPanel.style.display = 'none';
    }

    // 添加强制碰撞的方法
    forceCollision() {
        if (!this.player) return;
        
        console.log("强制触发碰撞");
        
        // 创建一个临时弹幕，位置与玩家相同
        const bullet = new Bullet(
            this.player.position.x,
            this.player.position.y,
            this.player.position.z,
            0, 0, 0,  // 不移动
            5,  // 较大的半径
            "#ff0000",
            this
        );
        
        // 创建爆炸特效
        const explosion = new ExplosionEffect(
            this.player.position.x,
            this.player.position.y,
            this.player.position.z,
            50, // 更多粒子
            0xff0000, // 红色
            this
        );
        this.effects.push(explosion);
        
        // 游戏结束
        this.gameOver();
    }
}

// DOM加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    // 显示加载提示
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-screen';
    loadingDiv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);color:#fff;display:flex;justify-content:center;align-items:center;z-index:9999;';
    loadingDiv.innerHTML = '<div style="text-align:center;"><h2>正在加载游戏...</h2><p>按数字0键或F9键可以打开调试模式</p></div>';
    document.body.appendChild(loadingDiv);
    
    try {
        const gameInstance = new Game();
        
        // 添加全局样式
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .difficulty-up {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #ffff00;
                font-size: 24px;
                font-weight: bold;
                text-shadow: 0 0 10px #ff0, 0 0 20px #ff0;
                animation: fadeInOut 2s ease-in-out;
                z-index: 15;
            }
            
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                30% { transform: translate(-50%, -50%) scale(1); }
                80% { opacity: 1; }
                100% { opacity: 0; }
            }
            
            #three-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
            }
            
            #debug-hint {
                position: absolute;
                bottom: 10px;
                right: 10px;
                background: rgba(0,0,0,0.5);
                color: #fff;
                padding: 5px 10px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 100;
            }
        `;
        document.head.appendChild(styleElement);
        
        // 添加调试模式提示
        const debugHint = document.createElement('div');
        debugHint.id = 'debug-hint';
        debugHint.textContent = '按数字0键或F9键开关调试模式';
        document.body.appendChild(debugHint);
        
        // 游戏加载完成后移除加载提示
        setTimeout(() => {
            loadingDiv.remove();
        }, 1000);
    } catch (error) {
        loadingDiv.innerHTML = `<div style="text-align:center;"><h2>加载失败</h2><p>${error.message}</p></div>`;
    }
}); 