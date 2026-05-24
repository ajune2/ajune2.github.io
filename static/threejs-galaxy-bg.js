// threejs-galaxy-bg.js
// three.js 银河系漩涡粒子背景
(function(){
    if (!window.THREE) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2.5;
    camera.position.y = 1.0;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: false,
        powerPreference: "low-power"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.id = 'three-bg-canvas';
    document.body.prepend(renderer.domElement);

    // 默认参数，夜晚主题
    const parameters = {
        count: 4500,
        radius: 5,
        innerColor: '#ffffff',  // 中心白
        midColor: '#ffaec9',    // 粉色
        outerColor: '#00e1ff'   // 蓝色
    };

    // 主题切换时的参数
    function setGalaxyColorsByTheme(theme) {
        if (theme === 'light') {
            parameters.innerColor = '#e0f2ff'; // 更亮的蓝白
            parameters.midColor = '#90cdf4';  // 浅蓝
            parameters.outerColor = '#2563eb'; // 深蓝
        } else {
            parameters.innerColor = '#ffffff';
            parameters.midColor = '#ffaec9';
            parameters.outerColor = '#00e1ff';
        }
    }

    // 重新生成银河
    function refreshGalaxy() {
        generateGalaxy();
    }

    let geometry = null;
    let material = null;
    let points = null;
    let originalPositions = [];

    const createParticleTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.15, 'rgba(255,255,255,1)'); 
        gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)'); 
        gradient.addColorStop(0.7, 'rgba(255,255,255,0.1)'); 
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    };

    const getParticleColor = (radius) => {
        const colorInner = new THREE.Color(parameters.innerColor);
        const colorMid = new THREE.Color(parameters.midColor);
        const colorOuter = new THREE.Color(parameters.outerColor);
        const t = radius / parameters.radius;
        const mixedColor = new THREE.Color();
        if (t < 0.5) {
            mixedColor.copy(colorInner).lerp(colorMid, t * 2.0);
        } else {
            mixedColor.copy(colorMid).lerp(colorOuter, (t - 0.5) * 2.0);
        }
        const noiseFactor = 0.4;
        const randomChoice = Math.random();
        if (randomChoice < noiseFactor) {
            const blendRatio = Math.random() * 0.5;
            if (randomChoice < noiseFactor * 0.33) {
                mixedColor.lerp(colorInner, blendRatio);
            } else if (randomChoice < noiseFactor * 0.66) {
                mixedColor.lerp(colorMid, blendRatio);
            } else {
                mixedColor.lerp(colorOuter, blendRatio);
            }
        }
        return mixedColor;
    };

    const generateGalaxy = () => {
        if (points !== null) {
            geometry.dispose();
            material.dispose();
            scene.remove(points);
        }
        geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(parameters.count * 3);
        const colors = new Float32Array(parameters.count * 3);
        const alphas = new Float32Array(parameters.count);
        originalPositions = [];
        for (let i = 0; i < parameters.count; i++) {
            const r = Math.random() * parameters.radius;
            const angle = Math.random() * Math.PI * 2;
            const pColor = getParticleColor(r);
            colors[i * 3 + 0] = pColor.r;
            colors[i * 3 + 1] = pColor.g;
            colors[i * 3 + 2] = pColor.b;
            alphas[i] = 1.0;
            originalPositions.push({
                radius: r,
                angle: angle,
                y: (Math.random() - 0.5) * 0.4 * (1.0 - r / parameters.radius),
                baseSize: 0.3 + Math.random() * 1.3,
                customSpeedFactor: 0.02 + Math.random() * 0.04,
                blinkSpeed: 3 + Math.random() * 7,
                blinkOffset: Math.random() * Math.PI * 2,
                breathScale: Math.random() < 0.01 ? 1 : 0
            });
            positions[i * 3 + 0] = Math.cos(angle) * r;
            positions[i * 3 + 1] = originalPositions[i].y;
            positions[i * 3 + 2] = Math.sin(angle) * r;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(parameters.count), 1));
        material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uSize: { value: 0.09 * window.devicePixelRatio },
                uTexture: { value: createParticleTexture() }
            },
            vertexShader: `
                attribute float alpha;
                attribute float size;
                varying vec3 vColor;
                varying float vAlpha;
                uniform float uSize;
                void main() {
                    vColor = color;
                    vAlpha = alpha;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = uSize * size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D uTexture;
                varying vec3 vColor;
                varying float vAlpha;
                void main() {
                    gl_FragColor = vec4(vColor, vAlpha) * texture2D(uTexture, gl_PointCoord);
                }
            `,
            vertexColors: true
        });
        points = new THREE.Points(geometry, material);
        scene.add(points);
    };

    // 主题检测与切换
    function getCurrentTheme() {
        const html = document.documentElement;
        return html.getAttribute('data-theme') || 'auto';
    }
    function handleThemeChange() {
        const theme = getCurrentTheme();
        setGalaxyColorsByTheme(theme);
        refreshGalaxy();
    }

    // 初始主题
    setGalaxyColorsByTheme(getCurrentTheme());
    generateGalaxy();

    // 监听 data-theme 属性变化
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === 'attributes' && m.attributeName === 'data-theme') {
                handleThemeChange();
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });

    // 交互物理引擎核心变量
    let mouseEnergy = 0;
    let lastMouseX = null;
    let lastMouseY = null;
    let globalVirtualTime = 0;
    window.addEventListener('mousemove', (e) => {
        if (lastMouseX !== null && lastMouseY !== null) {
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            const speed = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (speed > 1.5) {
                mouseEnergy += speed * 0.015;
            }
        }
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });
    // 鼠标滚轮滚动时也增加能量，影响速率
    window.addEventListener('wheel', (e) => {
        mouseEnergy += Math.abs(e.deltaY) * 0.01;
    });
    window.addEventListener('mouseleave', () => {
        lastMouseX = null;
        lastMouseY = null;
    });
    const clock = new THREE.Clock();
    let lastTime = 0;
    const fpsThreshold = 1 / 60;
    const animate = () => {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();
        const delta = elapsedTime - lastTime;
        if (delta < fpsThreshold) return;
        lastTime = elapsedTime;
        if (points) {
            mouseEnergy *= 0.94;
            if (mouseEnergy < 0.001) mouseEnergy = 0;
            const finalSpeedFactor = 0.12 + THREE.MathUtils.clamp(mouseEnergy, 0, 6.0);
            globalVirtualTime += delta * finalSpeedFactor;
            points.rotation.y = globalVirtualTime * 0.025;
            const positionAttribute = geometry.attributes.position;
            const posArray = positionAttribute.array;
            const alphaAttribute = geometry.attributes.alpha;
            const alphaArray = alphaAttribute.array;
            const colorAttribute = geometry.attributes.color;
            const colorArray = colorAttribute.array;
            const sizeAttribute = geometry.getAttribute('size');
            const sizeArray = sizeAttribute.array;
            for (let i = 0; i < parameters.count; i++) {
                const pt = originalPositions[i];
                const currentStepSpeed = pt.customSpeedFactor * finalSpeedFactor;
                pt.radius -= 0.075 * currentStepSpeed;
                pt.angle += (0.225 / (pt.radius + 0.08)) * currentStepSpeed;
                if (pt.radius <= 0.05) {
                    pt.radius = parameters.radius * (0.8 + Math.random() * 0.2);
                    pt.angle = Math.random() * Math.PI * 2;
                    const newColor = getParticleColor(pt.radius);
                    colorArray[i * 3 + 0] = newColor.r;
                    colorArray[i * 3 + 1] = newColor.g;
                    colorArray[i * 3 + 2] = newColor.b;
                    colorAttribute.needsUpdate = true; 
                }
                posArray[i * 3 + 0] = Math.cos(pt.angle) * pt.radius;
                posArray[i * 3 + 1] = pt.y;
                posArray[i * 3 + 2] = Math.sin(pt.angle) * pt.radius;
                const breathe = 0.65 + Math.sin(globalVirtualTime * pt.blinkSpeed + pt.blinkOffset) * 0.35;
                let opacityFactor = breathe;
                if (pt.radius < 0.8) {
                    opacityFactor = Math.max(0.0, (pt.radius - 0.05) / 0.75) * breathe;
                }
                alphaArray[i] = opacityFactor;
                if (pt.breathScale) {
                    sizeArray[i] = pt.baseSize * (1 + Math.abs(Math.sin(globalVirtualTime * pt.blinkSpeed + pt.blinkOffset)));
                } else {
                    sizeArray[i] = pt.baseSize;
                }
            }
            positionAttribute.needsUpdate = true;
            alphaAttribute.needsUpdate = true;
            sizeAttribute.needsUpdate = true;
        }
        renderer.render(scene, camera);
    };
    animate();
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();
