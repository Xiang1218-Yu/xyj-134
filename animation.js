(function (global) {
    'use strict';

    const rgba = global.DataDisplay.rgba;
    const hexToRgba = global.DataDisplay.hexToRgba;

    function animateExplosion(effectCtx, effectCanvas, mapWrapper, state, elements, flashOverlay) {
        if (!state.explosionCenter || state.isAnimating) return;

        state.isAnimating = true;
        elements.detonateBtn.disabled = true;

        flashOverlay.classList.add('active');

        const rect = mapWrapper.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const cx = state.explosionCenter.x;
        const cy = state.explosionCenter.y;
        const scale = state.scale;
        const radii = state.radii;

        const totalDuration = 5000;
        const startTime = performance.now();

        const maxShockwave = radii.thermal * scale * 1.2;

        const particles = [];
        const particleCount = 150;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = (2 + Math.random() * 4);
            const size = 2 + Math.random() * 6;
            const colorRand = Math.random();
            let pcolor;
            if (colorRand < 0.33) pcolor = '#ffdd00';
            else if (colorRand < 0.66) pcolor = '#ff6600';
            else pcolor = '#ff0000';
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

        function drawPersistentFireball(baseAlphaMul) {
            const fbRadius = radii.fireball * scale * (1 + Math.sin(baseAlphaMul * Math.PI) * 0.1);
            const fbAlpha = 0.7 * (1 - baseAlphaMul * 0.5);
            const fbGrad = effectCtx.createRadialGradient(cx, cy, 0, cx, cy, fbRadius);
            fbGrad.addColorStop(0, rgba(255, 255, 220, fbAlpha));
            fbGrad.addColorStop(0.4, rgba(255, 180, 80, fbAlpha * 0.8));
            fbGrad.addColorStop(0.7, rgba(255, 100, 30, fbAlpha * 0.5));
            fbGrad.addColorStop(1, rgba(255, 50, 0, 0));
            effectCtx.beginPath();
            effectCtx.arc(cx, cy, fbRadius, 0, Math.PI * 2);
            effectCtx.fillStyle = fbGrad;
            effectCtx.fill();
        }

        function draw(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);
            effectCtx.clearRect(0, 0, width, height);

            if (progress <= 0.05) {
                const p = progress;
                const flashAlpha = 1 - (p / 0.05);
                effectCtx.fillStyle = rgba(255, 255, 255, flashAlpha * 0.3);
                effectCtx.fillRect(0, 0, width, height);

                const fireballP = (p / 0.05);
                const currentFireballRadius = Math.pow(fireballP, 0.5) * radii.fireball * scale;
                if (currentFireballRadius > 0) {
                    const fbGrad = effectCtx.createRadialGradient(cx, cy, 0, cx, cy, currentFireballRadius);
                    fbGrad.addColorStop(0, rgba(255, 255, 255, 1));
                    fbGrad.addColorStop(0.3, rgba(255, 255, 200, 0.9));
                    fbGrad.addColorStop(0.6, rgba(255, 200, 100, 0.8));
                    fbGrad.addColorStop(0.85, rgba(255, 100, 0, 0.6));
                    fbGrad.addColorStop(1, rgba(255, 50, 0, 0));
                    effectCtx.beginPath();
                    effectCtx.arc(cx, cy, currentFireballRadius, 0, Math.PI * 2);
                    effectCtx.fillStyle = fbGrad;
                    effectCtx.fill();
                }
            } else if (progress <= 0.2) {
                const p = progress;
                const fireballP = (p / 0.2);
                const currentFireballRadius = radii.fireball * scale * (fireballP < 1 ? Math.pow(fireballP, 0.5) : 1);

                drawPersistentFireball(0.2);

                if (fireballP < 1) {
                    const fbGrad = effectCtx.createRadialGradient(cx, cy, 0, cx, cy, currentFireballRadius * 0.9);
                    fbGrad.addColorStop(0, rgba(255, 255, 255, 0.95));
                    fbGrad.addColorStop(0.4, rgba(255, 240, 180, 0.9));
                    fbGrad.addColorStop(0.7, rgba(255, 180, 80, 0.7));
                    fbGrad.addColorStop(1, rgba(255, 80, 0, 0));
                    effectCtx.beginPath();
                    effectCtx.arc(cx, cy, currentFireballRadius * 0.9, 0, Math.PI * 2);
                    effectCtx.fillStyle = fbGrad;
                    effectCtx.fill();
                }
            } else if (progress <= 0.5) {
                const p = progress;
                const swP = (p - 0.2) / 0.3;
                const currentSW = Math.pow(swP, 0.5) * maxShockwave;

                const swAlpha = 1 - swP;

                drawPersistentFireball(0.5);

                effectCtx.beginPath();
                effectCtx.arc(cx, cy, currentSW, 0, Math.PI * 2);
                effectCtx.strokeStyle = rgba(255, 200, 100, swAlpha * 0.8);
                effectCtx.lineWidth = 8;
                effectCtx.stroke();

                for (let i = 0; i < 4; i++) {
                    const innerSW = currentSW * (1 - (i + 1) * 0.15);
                    if (innerSW > 0) {
                        effectCtx.beginPath();
                        effectCtx.arc(cx, cy, innerSW, 0, Math.PI * 2);
                        effectCtx.strokeStyle = rgba(255, 100, 50, swAlpha * 0.4);
                        effectCtx.lineWidth = 3;
                        effectCtx.stroke();
                    }
                }

                particles.forEach(function (particle) {
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
            } else {
                const p = progress;
                const mp = (p - 0.5) / 0.5;

                drawPersistentFireball(0.5 + mp * 0.5);

                const cloudY = cy - mp * 150 * scale / 20;
                const cloudBaseWidth = radii.fireball * scale * (1.5 + mp * 2);
                const cloudHeight = radii.fireball * scale * (0.8 + mp * 1.5);
                const stemWidth = radii.fireball * scale * (0.8 - mp * 0.4);

                const stemGrad = effectCtx.createLinearGradient(cx, cy, cx, cloudY);
                stemGrad.addColorStop(0, rgba(100, 60, 30, 0.8 * (1 - mp * 0.3)));
                stemGrad.addColorStop(1, rgba(80, 50, 20, 0.4 * (1 - mp * 0.5)));
                effectCtx.fillStyle = stemGrad;
                effectCtx.beginPath();
                effectCtx.moveTo(cx - stemWidth * 0.6, cy);
                effectCtx.quadraticCurveTo(cx - stemWidth * 0.3, cloudY + (cy - cloudY) * 0.5, cx - stemWidth * 0.2, cloudY);
                effectCtx.lineTo(cx + stemWidth * 0.2, cloudY);
                effectCtx.quadraticCurveTo(cx + stemWidth * 0.3, cloudY + (cy - cloudY) * 0.5, cx + stemWidth * 0.6, cy);
                effectCtx.closePath();
                effectCtx.fill();

                const cloudGrad = effectCtx.createRadialGradient(
                    cx, cloudY, 0,
                    cx, cloudY, cloudBaseWidth
                );
                cloudGrad.addColorStop(0, rgba(140, 90, 50, 0.85 * (1 - mp * 0.4)));
                cloudGrad.addColorStop(0.5, rgba(100, 70, 40, 0.7 * (1 - mp * 0.5)));
                cloudGrad.addColorStop(1, rgba(60, 50, 40, 0));
                effectCtx.fillStyle = cloudGrad;
                effectCtx.beginPath();
                for (let a = 0; a < 8; a++) {
                    const angle = (a / 8) * Math.PI * 2;
                    const wobble = Math.sin(mp * Math.PI * 4 + a) * cloudBaseWidth * 0.15;
                    const r = cloudBaseWidth + wobble;
                    const x = cx + Math.cos(angle) * r;
                    const y = cloudY + Math.sin(angle) * cloudHeight * 0.6;
                    if (a === 0) effectCtx.moveTo(x, y);
                    else effectCtx.quadraticCurveTo(
                        cx + Math.cos(angle - Math.PI / 8) * (cloudBaseWidth * 1.1),
                        cloudY + Math.sin(angle - Math.PI / 8) * cloudHeight * 0.7,
                        x, y
                    );
                }
                effectCtx.closePath();
                effectCtx.fill();

                if (mp > 0.3) {
                    const debrisAlpha = (mp - 0.3) / 0.7 * 0.6;
                    for (let i = 0; i < 50; i++) {
                        const angle = (i / 50) * Math.PI * 2 + mp * 2;
                        const dist = cloudBaseWidth * (0.5 + (i * 0.017) % 0.8);
                        const dx = cx + Math.cos(angle) * dist;
                        const dy = cloudY + Math.sin(angle) * cloudHeight * 0.4 + (mp - 0.3) * 30;
                        const ds = 2 + (i * 0.17) % 4;
                        effectCtx.beginPath();
                        effectCtx.arc(dx, dy, ds, 0, Math.PI * 2);
                        effectCtx.fillStyle = rgba(80, 60, 40, debrisAlpha * (0.5 + (i * 0.013) % 0.5));
                        effectCtx.fill();
                    }
                }
            }

            if (progress < 1) {
                state.animationId = requestAnimationFrame(draw);
            } else {
                setTimeout(function () {
                    state.isAnimating = false;
                    elements.detonateBtn.disabled = false;
                    flashOverlay.classList.remove('active');
                }, 500);
            }
        }

        state.animationId = requestAnimationFrame(draw);
    }

    global.Animation = {
        animateExplosion: animateExplosion
    };

})(window);
