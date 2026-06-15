(function (global) {
    'use strict';

    const rgba = global.DataDisplay.rgba;
    const formatNumber = global.DataDisplay.formatNumber;

    const TIMELINE_STAGES = [
        {
            id: 0,
            name: '爆炸瞬间',
            timeLabel: 'T+0',
            description: '核爆炸发生的瞬间，冲击波、热辐射和初始核辐射立即释放',
            falloutRadiusFactor: 0.1,
            deathFactor: 0.6,
            injuredFactor: 0.3
        },
        {
            id: 1,
            name: '早期沉降',
            timeLabel: '1小时',
            description: '大颗粒放射性尘埃在爆炸后数小时内沉降到爆炸点附近',
            falloutRadiusFactor: 0.35,
            deathFactor: 0.78,
            injuredFactor: 0.55
        },
        {
            id: 2,
            name: '中期扩散',
            timeLabel: '1天',
            description: '放射性云团随风扩散，中等颗粒沉降到更远区域',
            falloutRadiusFactor: 0.65,
            deathFactor: 0.88,
            injuredFactor: 0.75
        },
        {
            id: 3,
            name: '晚期沉降',
            timeLabel: '1周',
            description: '细小放射性颗粒随大气环流扩散，造成大范围污染',
            falloutRadiusFactor: 0.85,
            deathFactor: 0.94,
            injuredFactor: 0.88
        },
        {
            id: 4,
            name: '长期影响',
            timeLabel: '1月',
            description: '长期放射性沾染，致癌和遗传效应逐渐显现',
            falloutRadiusFactor: 1.0,
            deathFactor: 1.0,
            injuredFactor: 1.0
        }
    ];

    const WIN_DIRECTIONS = [
        { angle: 0, name: '东风' },
        { angle: Math.PI / 4, name: '东南风' },
        { angle: Math.PI / 2, name: '南风' },
        { angle: Math.PI * 3 / 4, name: '西南风' },
        { angle: Math.PI, name: '西风' },
        { angle: Math.PI * 5 / 4, name: '西北风' },
        { angle: Math.PI * 3 / 2, name: '北风' },
        { angle: Math.PI * 7 / 4, name: '东北风' }
    ];

    let timelineState = {
        isActive: false,
        isPlaying: false,
        currentProgress: 0,
        speed: 1,
        animationId: null,
        lastTimestamp: 0,
        baseCasualties: { deaths: 0, injured: 0 },
        baseFalloutRadius: 0,
        windDirection: 0,
        windStrength: 1,
        explosions: [],
        cities: [],
        scale: 20,
        terrainData: null
    };

    let elements = {};
    let effectCtx = null;
    let effectCanvas = null;
    let trendChartCtx = null;
    let trendChartCanvas = null;

    function initTimeline() {
        const elementIds = [
            'timelinePanel', 'timelineModeBadge', 'timelineStages',
            'timelinePlayBtn', 'timelineResetBtn', 'timelineSlider', 'timelineSpeed',
            'timelineCurrentTime', 'timelineDeaths', 'timelineInjured', 'timelineFalloutArea',
            'trendChartCanvas', 'effectCanvas'
        ];

        elementIds.forEach(function (id) {
            elements[id] = document.getElementById(id);
        });

        effectCanvas = elements.effectCanvas;
        if (effectCanvas) {
            effectCtx = effectCanvas.getContext('2d');
        }

        trendChartCanvas = elements.trendChartCanvas;
        if (trendChartCanvas) {
            trendChartCtx = trendChartCanvas.getContext('2d');
            setupTrendChartCanvas();
        }

        setupEventListeners();
    }

    function setupTrendChartCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = trendChartCanvas.getBoundingClientRect();
        trendChartCanvas.width = rect.width * dpr;
        trendChartCanvas.height = 180 * dpr;
        trendChartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function setupEventListeners() {
        if (elements.timelinePlayBtn) {
            elements.timelinePlayBtn.addEventListener('click', togglePlay);
        }

        if (elements.timelineResetBtn) {
            elements.timelineResetBtn.addEventListener('click', resetTimeline);
        }

        if (elements.timelineSlider) {
            elements.timelineSlider.addEventListener('input', function (e) {
                if (!timelineState.isActive) return;
                const progress = parseInt(e.target.value, 10) / 1000;
                setTimelineProgress(progress);
            });
        }

        if (elements.timelineSpeed) {
            elements.timelineSpeed.addEventListener('change', function (e) {
                timelineState.speed = parseFloat(e.target.value);
            });
        }

        if (elements.timelineStages) {
            elements.timelineStages.querySelectorAll('.stage-dot').forEach(function (dot) {
                dot.addEventListener('click', function () {
                    if (!timelineState.isActive) return;
                    const stageId = parseInt(dot.dataset.stage, 10);
                    const progress = stageId / (TIMELINE_STAGES.length - 1);
                    setTimelineProgress(progress);
                });
            });
        }

        let resizeTimeout;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function () {
                if (trendChartCanvas) {
                    setupTrendChartCanvas();
                    drawTrendChart();
                }
            }, 200);
        });
    }

    function startTimelineMode(state, ctx, canvas) {
        const activeExplosions = state.explosions.filter(function (e) {
            return e.explosionCenter && e.radii;
        });

        if (activeExplosions.length === 0) return;

        timelineState.isActive = true;
        timelineState.isPlaying = false;
        timelineState.currentProgress = 0;
        timelineState.explosions = activeExplosions;
        timelineState.cities = state.cities;
        timelineState.scale = state.scale;
        timelineState.terrainData = state.terrainData;

        const casualties = global.Physics.calculateCasualtiesTerrainAware(
            state.cities, activeExplosions, state.scale, state.terrainData
        );
        timelineState.baseCasualties = casualties;

        let maxFalloutRadius = 0;
        activeExplosions.forEach(function (exp) {
            const falloutR = exp.radii.thermal * 2.5;
            if (falloutR > maxFalloutRadius) maxFalloutRadius = falloutR;
        });
        timelineState.baseFalloutRadius = maxFalloutRadius;

        const randIdx = Math.floor(Math.random() * WIN_DIRECTIONS.length);
        timelineState.windDirection = WIN_DIRECTIONS[randIdx].angle;
        timelineState.windStrength = 0.8 + Math.random() * 0.6;

        if (ctx) effectCtx = ctx;
        if (canvas) effectCanvas = canvas;

        enableControls(true);
        updateModeBadge(true);
        setTimelineProgress(0);
        drawTrendChart();
    }

    function stopTimelineMode() {
        if (timelineState.animationId) {
            cancelAnimationFrame(timelineState.animationId);
            timelineState.animationId = null;
        }

        timelineState.isActive = false;
        timelineState.isPlaying = false;
        timelineState.currentProgress = 0;

        enableControls(false);
        updateModeBadge(false);
        clearFalloutOverlay();
    }

    function enableControls(enabled) {
        if (elements.timelinePlayBtn) elements.timelinePlayBtn.disabled = !enabled;
        if (elements.timelineResetBtn) elements.timelineResetBtn.disabled = !enabled;
        if (elements.timelineSlider) elements.timelineSlider.disabled = !enabled;
        if (elements.timelineSpeed) elements.timelineSpeed.disabled = !enabled;

        elements.timelineStages.querySelectorAll('.stage-dot').forEach(function (dot) {
            if (enabled) {
                dot.classList.remove('disabled');
            } else {
                dot.classList.add('disabled');
            }
        });
    }

    function updateModeBadge(active) {
        if (!elements.timelineModeBadge) return;
        if (active) {
            elements.timelineModeBadge.textContent = '推演模式';
            elements.timelineModeBadge.classList.add('active');
        } else {
            elements.timelineModeBadge.textContent = '待机中';
            elements.timelineModeBadge.classList.remove('active');
        }
    }

    function togglePlay() {
        if (!timelineState.isActive) return;

        if (timelineState.isPlaying) {
            pauseTimeline();
        } else {
            playTimeline();
        }
    }

    function playTimeline() {
        if (!timelineState.isActive) return;
        if (timelineState.currentProgress >= 1) {
            timelineState.currentProgress = 0;
        }

        timelineState.isPlaying = true;
        timelineState.lastTimestamp = null;

        if (elements.timelinePlayBtn) {
            elements.timelinePlayBtn.innerHTML = '<span class="btn-icon">⏸</span> 暂停';
            elements.timelinePlayBtn.classList.add('playing');
        }

        timelineState.animationId = requestAnimationFrame(animateTimeline);
    }

    function pauseTimeline() {
        timelineState.isPlaying = false;

        if (timelineState.animationId) {
            cancelAnimationFrame(timelineState.animationId);
            timelineState.animationId = null;
        }

        if (elements.timelinePlayBtn) {
            elements.timelinePlayBtn.innerHTML = '<span class="btn-icon">▶</span> 播放';
            elements.timelinePlayBtn.classList.remove('playing');
        }
    }

    function resetTimeline() {
        if (!timelineState.isActive) return;
        pauseTimeline();
        setTimelineProgress(0);
    }

    function animateTimeline(timestamp) {
        if (!timelineState.isPlaying) return;

        if (!timelineState.lastTimestamp) {
            timelineState.lastTimestamp = timestamp;
        }

        const delta = timestamp - timelineState.lastTimestamp;
        timelineState.lastTimestamp = timestamp;

        const progressIncrement = (delta / 1000) * 0.1 * timelineState.speed;
        let newProgress = timelineState.currentProgress + progressIncrement;

        if (newProgress >= 1) {
            newProgress = 1;
            setTimelineProgress(1);
            pauseTimeline();
            return;
        }

        setTimelineProgress(newProgress);
        timelineState.animationId = requestAnimationFrame(animateTimeline);
    }

    function setTimelineProgress(progress) {
        timelineState.currentProgress = Math.max(0, Math.min(1, progress));

        if (elements.timelineSlider) {
            elements.timelineSlider.value = Math.round(timelineState.currentProgress * 1000);
        }

        updateStageIndicators();
        updateTimelineInfo();
        drawFalloutOverlay();
        drawTrendChart();
    }

    function updateStageIndicators() {
        const stageCount = TIMELINE_STAGES.length;
        const currentStageFloat = timelineState.currentProgress * (stageCount - 1);
        const currentStageIdx = Math.round(currentStageFloat);

        elements.timelineStages.querySelectorAll('.stage-dot').forEach(function (dot, idx) {
            dot.classList.remove('active', 'completed');

            if (idx < currentStageIdx) {
                dot.classList.add('completed');
            } else if (idx === currentStageIdx) {
                dot.classList.add('active');
            }
        });

        const stageLines = elements.timelineStages.querySelectorAll('.stage-line');
        stageLines.forEach(function (line, idx) {
            if (idx < currentStageIdx) {
                line.classList.add('filled');
            } else {
                line.classList.remove('filled');
            }
        });
    }

    function getInterpolatedValues(progress) {
        const stageCount = TIMELINE_STAGES.length;
        const stageFloat = progress * (stageCount - 1);
        const stageIdx = Math.floor(stageFloat);
        const stageProgress = stageFloat - stageIdx;

        if (stageIdx >= stageCount - 1) {
            const last = TIMELINE_STAGES[stageCount - 1];
            return {
                stage: last,
                falloutRadiusFactor: last.falloutRadiusFactor,
                deathFactor: last.deathFactor,
                injuredFactor: last.injuredFactor
            };
        }

        const current = TIMELINE_STAGES[stageIdx];
        const next = TIMELINE_STAGES[stageIdx + 1];

        const easeProgress = easeInOutCubic(stageProgress);

        return {
            stage: current,
            nextStage: next,
            stageProgress: stageProgress,
            falloutRadiusFactor: lerp(current.falloutRadiusFactor, next.falloutRadiusFactor, easeProgress),
            deathFactor: lerp(current.deathFactor, next.deathFactor, easeProgress),
            injuredFactor: lerp(current.injuredFactor, next.injuredFactor, easeProgress)
        };
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function updateTimelineInfo() {
        const values = getInterpolatedValues(timelineState.currentProgress);
        const stageIdx = Math.round(timelineState.currentProgress * (TIMELINE_STAGES.length - 1));
        const stage = TIMELINE_STAGES[stageIdx];

        const deaths = Math.round(timelineState.baseCasualties.deaths * values.deathFactor);
        const injured = Math.round(timelineState.baseCasualties.injured * values.injuredFactor);
        const falloutRadius = timelineState.baseFalloutRadius * values.falloutRadiusFactor;
        const falloutArea = Math.round(Math.PI * falloutRadius * falloutRadius);

        if (elements.timelineCurrentTime) {
            elements.timelineCurrentTime.textContent = stage.name + ' (' + stage.timeLabel + ')';
        }
        if (elements.timelineDeaths) {
            elements.timelineDeaths.textContent = formatNumber(deaths);
        }
        if (elements.timelineInjured) {
            elements.timelineInjured.textContent = formatNumber(injured);
        }
        if (elements.timelineFalloutArea) {
            elements.timelineFalloutArea.textContent = formatNumber(falloutArea) + ' km²';
        }
    }

    function drawFalloutOverlay() {
        if (!effectCtx || !effectCanvas) return;

        const rect = effectCanvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        effectCtx.clearRect(0, 0, width, height);

        if (!timelineState.isActive) return;

        const values = getInterpolatedValues(timelineState.currentProgress);

        timelineState.explosions.forEach(function (exp, expIdx) {
            const cx = exp.explosionCenter.x;
            const cy = exp.explosionCenter.y;
            const baseRadius = exp.radii.thermal * timelineState.scale * 1.5;
            const currentRadius = baseRadius * values.falloutRadiusFactor;

            drawFalloutCloud(cx, cy, currentRadius, expIdx, values.falloutRadiusFactor);
        });
    }

    function drawFalloutCloud(cx, cy, radius, expIndex, intensity) {
        if (radius <= 0) return;

        const windAngle = timelineState.windDirection;
        const windStrength = timelineState.windStrength;
        const driftX = Math.cos(windAngle) * radius * 0.4 * windStrength;
        const driftY = Math.sin(windAngle) * radius * 0.4 * windStrength;

        const cloudGrad = effectCtx.createRadialGradient(
            cx + driftX * 0.3, cy + driftY * 0.3, 0,
            cx + driftX * 0.5, cy + driftY * 0.5, radius
        );

        const baseAlpha = 0.15 + intensity * 0.25;

        cloudGrad.addColorStop(0, rgba(180, 200, 100, baseAlpha * 0.8));
        cloudGrad.addColorStop(0.3, rgba(140, 170, 80, baseAlpha * 0.6));
        cloudGrad.addColorStop(0.6, rgba(100, 140, 60, baseAlpha * 0.4));
        cloudGrad.addColorStop(1, rgba(80, 120, 50, 0));

        effectCtx.beginPath();
        effectCtx.ellipse(
            cx + driftX * 0.5,
            cy + driftY * 0.5,
            radius * (1 + windStrength * 0.2),
            radius * (1 - windStrength * 0.1),
            windAngle,
            0, Math.PI * 2
        );
        effectCtx.fillStyle = cloudGrad;
        effectCtx.fill();

        const innerRadius = radius * 0.5;
        const innerGrad = effectCtx.createRadialGradient(
            cx, cy, 0,
            cx, cy, innerRadius
        );
        innerGrad.addColorStop(0, rgba(255, 255, 150, baseAlpha * 0.5));
        innerGrad.addColorStop(0.5, rgba(200, 220, 100, baseAlpha * 0.3));
        innerGrad.addColorStop(1, rgba(150, 180, 80, 0));

        effectCtx.beginPath();
        effectCtx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
        effectCtx.fillStyle = innerGrad;
        effectCtx.fill();

        if (intensity > 0.3) {
            const particleCount = Math.floor(30 + intensity * 50);
            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * radius * 0.8;
                const px = cx + Math.cos(angle) * dist + driftX * (dist / radius);
                const py = cy + Math.sin(angle) * dist + driftY * (dist / radius);
                const psize = 1 + Math.random() * 2;
                const palpha = 0.3 + Math.random() * 0.4;

                effectCtx.beginPath();
                effectCtx.arc(px, py, psize, 0, Math.PI * 2);
                effectCtx.fillStyle = rgba(180, 255, 120, palpha * intensity);
                effectCtx.fill();
            }
        }

        if (intensity > 0.2) {
            const ringAlpha = intensity * 0.3;
            effectCtx.strokeStyle = rgba(0, 255, 136, ringAlpha);
            effectCtx.lineWidth = 2;
            effectCtx.setLineDash([6, 4]);
            effectCtx.beginPath();
            effectCtx.ellipse(
                cx + driftX * 0.5,
                cy + driftY * 0.5,
                radius * (1 + windStrength * 0.2),
                radius * (1 - windStrength * 0.1),
                windAngle,
                0, Math.PI * 2
            );
            effectCtx.stroke();
            effectCtx.setLineDash([]);
        }
    }

    function clearFalloutOverlay() {
        if (!effectCtx || !effectCanvas) return;
        const rect = effectCanvas.getBoundingClientRect();
        effectCtx.clearRect(0, 0, rect.width, rect.height);
    }

    function drawTrendChart() {
        if (!trendChartCtx || !trendChartCanvas) return;

        const rect = trendChartCanvas.getBoundingClientRect();
        const width = rect.width;
        const height = 180;
        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        trendChartCtx.clearRect(0, 0, width, height);

        const dataPoints = generateTrendData();
        const maxValue = Math.max(
            dataPoints.deaths[dataPoints.deaths.length - 1],
            dataPoints.injured[dataPoints.injured.length - 1]
        ) * 1.1 || 1;

        drawChartGrid(trendChartCtx, padding, chartWidth, chartHeight, maxValue);
        drawTrendLine(trendChartCtx, dataPoints.deaths, padding, chartWidth, chartHeight, maxValue, '#ff4444', 0.15);
        drawTrendLine(trendChartCtx, dataPoints.injured, padding, chartWidth, chartHeight, maxValue, '#ffaa00', 0.1);

        const currentIdx = Math.floor(timelineState.currentProgress * (dataPoints.deaths.length - 1));
        drawCurrentIndicator(
            trendChartCtx,
            currentIdx,
            dataPoints,
            padding,
            chartWidth,
            chartHeight,
            maxValue
        );

        drawXLabels(trendChartCtx, padding, chartWidth, chartHeight);
    }

    function generateTrendData() {
        const pointCount = 50;
        const deaths = [];
        const injured = [];

        for (let i = 0; i < pointCount; i++) {
            const progress = i / (pointCount - 1);
            const values = getInterpolatedValues(progress);
            deaths.push(timelineState.baseCasualties.deaths * values.deathFactor);
            injured.push(timelineState.baseCasualties.injured * values.injuredFactor);
        }

        return { deaths: deaths, injured: injured };
    }

    function drawChartGrid(ctx, padding, chartWidth, chartHeight, maxValue) {
        ctx.strokeStyle = rgba(100, 100, 140, 0.15);
        ctx.lineWidth = 1;

        const gridLines = 4;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();

            const value = maxValue * (1 - i / gridLines);
            ctx.fillStyle = rgba(160, 160, 184, 0.7);
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(formatNumber(Math.round(value)), padding.left - 8, y + 3);
        }
    }

    function drawTrendLine(ctx, data, padding, chartWidth, chartHeight, maxValue, color, fillAlpha) {
        if (data.length < 2) return;

        const points = data.map(function (value, idx) {
            const x = padding.left + (chartWidth / (data.length - 1)) * idx;
            const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
            return { x: x, y: y };
        });

        const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
        const colorMatch = color.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
        if (colorMatch) {
            const r = parseInt(colorMatch[1], 16);
            const g = parseInt(colorMatch[2], 16);
            const b = parseInt(colorMatch[3], 16);
            grad.addColorStop(0, rgba(r, g, b, fillAlpha));
            grad.addColorStop(1, rgba(r, g, b, 0));
        }

        ctx.beginPath();
        ctx.moveTo(points[0].x, padding.top + chartHeight);
        for (let i = 0; i < points.length; i++) {
            if (i === 0) {
                ctx.lineTo(points[i].x, points[i].y);
            } else {
                const prev = points[i - 1];
                const curr = points[i];
                const midX = (prev.x + curr.x) / 2;
                const midY = (prev.y + curr.y) / 2;
                ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
            }
        }
        ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            if (i === 0) {
                ctx.moveTo(points[i].x, points[i].y);
            } else {
                const prev = points[i - 1];
                const curr = points[i];
                const midX = (prev.x + curr.x) / 2;
                const midY = (prev.y + curr.y) / 2;
                ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
            }
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function drawCurrentIndicator(ctx, idx, data, padding, chartWidth, chartHeight, maxValue) {
        if (idx < 0 || idx >= data.deaths.length) return;

        const x = padding.left + (chartWidth / (data.deaths.length - 1)) * idx;

        ctx.strokeStyle = rgba(255, 255, 255, 0.3);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        const deathY = padding.top + chartHeight - (data.deaths[idx] / maxValue) * chartHeight;
        const injuredY = padding.top + chartHeight - (data.injured[idx] / maxValue) * chartHeight;

        ctx.beginPath();
        ctx.arc(x, deathY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, injuredY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffaa00';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function drawXLabels(ctx, padding, chartWidth, chartHeight) {
        ctx.fillStyle = rgba(160, 160, 184, 0.7);
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';

        const labelCount = TIMELINE_STAGES.length;
        for (let i = 0; i < labelCount; i++) {
            const x = padding.left + (chartWidth / (labelCount - 1)) * i;
            const y = padding.top + chartHeight + 18;
            ctx.fillText(TIMELINE_STAGES[i].timeLabel, x, y);
        }
    }

    global.Timeline = {
        init: initTimeline,
        start: startTimelineMode,
        stop: stopTimelineMode,
        play: playTimeline,
        pause: pauseTimeline,
        reset: resetTimeline,
        togglePlay: togglePlay,
        setProgress: setTimelineProgress,
        isActive: function () { return timelineState.isActive; },
        isPlaying: function () { return timelineState.isPlaying; },
        getCurrentProgress: function () { return timelineState.currentProgress; },
        STAGES: TIMELINE_STAGES
    };

    document.addEventListener('DOMContentLoaded', initTimeline);

})(window);
