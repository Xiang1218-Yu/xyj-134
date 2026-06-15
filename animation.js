(function (global) {
    'use strict';

    const rgba = global.DataDisplay.rgba;
    const hexToRgba = global.DataDisplay.hexToRgba;

    function createExplosionAnimState(explosion, index, scale) {
        const cx = explosion.explosionCenter.x;
        const cy = explosion.explosionCenter.y;
        const radii = explosion.radii;
        const tint = index;

        const paletteColors = [
            { p1: '#ffdd00', p2: '#ff6600', p3: '#ff0000', smoke: [140,90,50] },
            { p1: '#00ffff', p2: '#6688ff', p3: '#0044ff', smoke: [90,90,140] },
            { p1: '#ccff88', p2: '#88ff00', p3: '#00cc44', smoke: [90,130,80] },
            { p1: '#ffcc66', p2: '#ff9944', p3: '#dd5500', smoke: [150,100,70] }
        ];
        const colors = paletteColors[tint % paletteColors.length];

        const particles = [];
        const particleCount = 120;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = (2 + Math.random() * 4);
            const size = 2 + Math.random() * 6;
            const colorRand = Math.random();
            let pcolor;
            if (colorRand < 0.33) pcolor = colors.p1;
            else if (colorRand < 0.66) pcolor = colors.p2;
            else pcolor = colors.p3;
            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (1 + Math.random() * 3),
                size: size,
                life: 0.6 + Math.random() * 0.4,
                color: pcolor
            });
        }

        return {
            cx: cx,
            cy: cy,
            scale: scale,
            radii: radii,
            particles: particles,
            smoke: colors.smoke,
            maxShockwave: radii.thermal * scale * 1.2
        };
    }

    function drawPersistentFireball(effectCtx, a, baseAlphaMul) {
        const fbRadius = a.radii.fireball * a.scale * (1 + Math.sin(baseAlphaMul * Math.PI) * 0.1);
        const fbAlpha = 0.7 * (1 - baseAlphaMul * 0.5);
        const fbGrad = effectCtx.createRadialGradient(a.cx, a.cy, 0, a.cx, a.cy, fbRadius);
        fbGrad.addColorStop(0, rgba(255, 255, 220, fbAlpha));
        fbGrad.addColorStop(0.4, rgba(255, 180, 80, fbAlpha * 0.8));
        fbGrad.addColorStop(0.7, rgba(255, 100, 30, fbAlpha * 0.5));
        fbGrad.addColorStop(1, rgba(255, 50, 0, 0));
        effectCtx.beginPath();
        effectCtx.arc(a.cx, a.cy, fbRadius, 0, Math.PI * 2);
        effectCtx.fillStyle = fbGrad;
        effectCtx.fill();
    }

    function animateExplosion(effectCtx, effectCanvas, mapWrapper, state, elements, flashOverlay) {
        if (state.isAnimating) return;

        const activeExplosions = state.explosions.filter(function (e) {
            return e.explosionCenter && e.radii;
        });
        if (activeExplosions.length === 0) return;

        state.isAnimating = true;
        elements.detonateBtn.disabled = true;

        flashOverlay.classList.add('active');

        const rect = mapWrapper.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const animStates = activeExplosions.map(function (exp, idx) {
            return createExplosionAnimState(exp, idx, state.scale);
        });

        const totalDuration = 5500;
        const startTime = performance.now();

        function drawPhase0(progress, a) {
            const p = progress;
            const fireballP = p / 0.05;
            const currentFireballRadius = Math.pow(fireballP, 0.5) * a.radii.fireball * a.scale;
            if (currentFireballRadius > 0) {
                const fbGrad = effectCtx.createRadialGradient(a.cx, a.cy, 0, a.cx, a.cy, currentFireballRadius);
                fbGrad.addColorStop(0, rgba(255, 255, 255, 1));
                fbGrad.addColorStop(0.3, rgba(255, 255, 200, 0.9));
                fbGrad.addColorStop(0.6, rgba(255, 200, 100, 0.8));
                fbGrad.addColorStop(0.85, rgba(255, 100, 0, 0.6));
                fbGrad.addColorStop(1, rgba(255, 50, 0, 0));
                effectCtx.beginPath();
                effectCtx.arc(a.cx, a.cy, currentFireballRadius, 0, Math.PI * 2);
                effectCtx.fillStyle = fbGrad;
                effectCtx.fill();
            }
        }

        function drawPhase1(progress, a) {
            const p = progress;
            const fireballP = p / 0.2;
            const currentFireballRadius = a.radii.fireball * a.scale * (fireballP < 1 ? Math.pow(fireballP, 0.5) : 1);

            drawPersistentFireball(effectCtx, a, 0.2);

            if (fireballP < 1) {
                const fbGrad = effectCtx.createRadialGradient(a.cx, a.cy, 0, a.cx, a.cy, currentFireballRadius * 0.9);
                fbGrad.addColorStop(0, rgba(255, 255, 255, 0.95));
                fbGrad.addColorStop(0.4, rgba(255, 240, 180, 0.9));
                fbGrad.addColorStop(0.7, rgba(255, 180, 80, 0.7));
                fbGrad.addColorStop(1, rgba(255, 80, 0, 0));
                effectCtx.beginPath();
                effectCtx.arc(a.cx, a.cy, currentFireballRadius * 0.9, 0, Math.PI * 2);
                effectCtx.fillStyle = fbGrad;
                effectCtx.fill();
            }
        }

        function drawPhase2(progress, a) {
            const p = progress;
            const swP = (p - 0.2) / 0.3;
            const currentSW = Math.pow(swP, 0.5) * a.maxShockwave;
            const swAlpha = 1 - swP;

            drawPersistentFireball(effectCtx, a, 0.5);

            effectCtx.beginPath();
            effectCtx.arc(a.cx, a.cy, currentSW, 0, Math.PI * 2);
            effectCtx.strokeStyle = rgba(255, 200, 100, swAlpha * 0.8);
            effectCtx.lineWidth = 8;
            effectCtx.stroke();

            for (let i = 0; i < 4; i++) {
                const innerSW = currentSW * (1 - (i + 1) * 0.15);
                if (innerSW > 0) {
                    effectCtx.beginPath();
                    effectCtx.arc(a.cx, a.cy, innerSW, 0, Math.PI * 2);
                    effectCtx.strokeStyle = rgba(255, 100, 50, swAlpha * 0.4);
                    effectCtx.lineWidth = 3;
                    effectCtx.stroke();
                }
            }

            a.particles.forEach(function (particle) {
                particle.x += particle.vx * (1 + swP * 3);
                particle.y += particle.vy * (1 + swP * 2);
                particle.vy += 0.05;
                const particleAlpha = particle.life * (1 - swP * 0.8);
                if (particleAlpha > 0) {
                    effectCtx.beginPath();
                    effectCtx.arc(particle.x, particle.y, particle.size * (1 + swP * 0.5), 0, Math.PI * 2);
                    effectCtx.fillStyle = hexToRgba(particle.color, particleAlpha);
                    effectCtx.fill();
                }
            });
        }

        function drawPhase3(progress, a) {
            const p = progress;
            const mp = (p - 0.5) / 0.5;

            drawPersistentFireball(effectCtx, a, 0.5 + mp * 0.5);

            const cloudY = a.cy - mp * 150 * a.scale / 20;
            const cloudBaseWidth = a.radii.fireball * a.scale * (1.5 + mp * 2);
            const cloudHeight = a.radii.fireball * a.scale * (0.8 + mp * 1.5);
            const stemWidth = a.radii.fireball * a.scale * (0.8 - mp * 0.4);

            const sr = a.smoke;
            const stemGrad = effectCtx.createLinearGradient(a.cx, a.cy, a.cx, cloudY);
            stemGrad.addColorStop(0, rgba(sr[0]*0.7, sr[1]*0.5, sr[2]*0.4, 0.8 * (1 - mp * 0.3)));
            stemGrad.addColorStop(1, rgba(sr[0]*0.5, sr[1]*0.35, sr[2]*0.25, 0.4 * (1 - mp * 0.5)));
            effectCtx.fillStyle = stemGrad;
            effectCtx.beginPath();
            effectCtx.moveTo(a.cx - stemWidth * 0.6, a.cy);
            effectCtx.quadraticCurveTo(a.cx - stemWidth * 0.3, cloudY + (a.cy - cloudY) * 0.5, a.cx - stemWidth * 0.2, cloudY);
            effectCtx.lineTo(a.cx + stemWidth * 0.2, cloudY);
            effectCtx.quadraticCurveTo(a.cx + stemWidth * 0.3, cloudY + (a.cy - cloudY) * 0.5, a.cx + stemWidth * 0.6, a.cy);
            effectCtx.closePath();
            effectCtx.fill();

            const cloudGrad = effectCtx.createRadialGradient(
                a.cx, cloudY, 0,
                a.cx, cloudY, cloudBaseWidth
            );
            cloudGrad.addColorStop(0, rgba(sr[0], sr[1], sr[2], 0.85 * (1 - mp * 0.4)));
            cloudGrad.addColorStop(0.5, rgba(sr[0]*0.75, sr[1]*0.55, sr[2]*0.35, 0.7 * (1 - mp * 0.5)));
            cloudGrad.addColorStop(1, rgba(sr[0]*0.45, sr[1]*0.4, sr[2]*0.3, 0));
            effectCtx.fillStyle = cloudGrad;
            effectCtx.beginPath();
            for (let ang = 0; ang < 8; ang++) {
                const angle = (ang / 8) * Math.PI * 2;
                const wobble = Math.sin(mp * Math.PI * 4 + ang) * cloudBaseWidth * 0.15;
                const r = cloudBaseWidth + wobble;
                const x = a.cx + Math.cos(angle) * r;
                const y = cloudY + Math.sin(angle) * cloudHeight * 0.6;
                if (ang === 0) effectCtx.moveTo(x, y);
                else effectCtx.quadraticCurveTo(
                    a.cx + Math.cos(angle - Math.PI / 8) * (cloudBaseWidth * 1.1),
                    cloudY + Math.sin(angle - Math.PI / 8) * cloudHeight * 0.7,
                    x, y
                );
            }
            effectCtx.closePath();
            effectCtx.fill();

            if (mp > 0.3) {
                const debrisAlpha = (mp - 0.3) / 0.7 * 0.6;
                for (let i = 0; i < 40; i++) {
                    const angle = (i / 40) * Math.PI * 2 + mp * 2;
                    const dist = cloudBaseWidth * (0.5 + (i * 0.017) % 0.8);
                    const dx = a.cx + Math.cos(angle) * dist;
                    const dy = cloudY + Math.sin(angle) * cloudHeight * 0.4 + (mp - 0.3) * 30;
                    const ds = 2 + (i * 0.17) % 4;
                    effectCtx.beginPath();
                    effectCtx.arc(dx, dy, ds, 0, Math.PI * 2);
                    effectCtx.fillStyle = rgba(sr[0]*0.6, sr[1]*0.5, sr[2]*0.4, debrisAlpha * (0.5 + (i * 0.013) % 0.5));
                    effectCtx.fill();
                }
            }
        }

        function draw(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);
            effectCtx.clearRect(0, 0, width, height);

            if (progress <= 0.05) {
                const p = progress;
                const flashAlpha = 1 - (p / 0.05);
                effectCtx.fillStyle = rgba(255, 255, 255, flashAlpha * 0.4);
                effectCtx.fillRect(0, 0, width, height);
                animStates.forEach(function (a) { drawPhase0(p, a); });
            } else if (progress <= 0.2) {
                animStates.forEach(function (a) { drawPhase1(progress, a); });
            } else if (progress <= 0.5) {
                animStates.forEach(function (a) { drawPhase2(progress, a); });
            } else {
                animStates.forEach(function (a) { drawPhase3(progress, a); });
            }

            if (progress < 1) {
                state.animationId = requestAnimationFrame(draw);
            } else {
                setTimeout(function () {
                    state.isAnimating = false;
                    elements.detonateBtn.disabled = false;
                    flashOverlay.classList.remove('active');
                }, 600);
            }
        }

        state.animationId = requestAnimationFrame(draw);
    }

    global.Animation = {
        animateExplosion: animateExplosion
    };

})(window);
