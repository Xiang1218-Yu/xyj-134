(function () {
    'use strict';

    const BOMB_TYPES = {
        custom: { yield: 15000, name: '自定义' },
        little_boy: { yield: 15, name: '小男孩' },
        fat_man: { yield: 21, name: '胖子' },
        tsar_bomba: { yield: 50000, name: '沙皇炸弹' },
        b83: { yield: 1200, name: 'B83' },
        w88: { yield: 475, name: 'W88' },
        trinity: { yield: 20, name: '三位一体' },
        castle_bravo: { yield: 15000, name: '喝彩城堡' }
    };

    const state = {
        bombType: 'castle_bravo',
        yieldKilotons: 15000,
        burstHeight: 1000,
        scale: 20,
        showLabels: true,
        showLegend: true,
        explosionCenter: null,
        isAnimating: false,
        animationId: null,
        radii: null,
        cities: []
    };

    const mapCanvas = document.getElementById('mapCanvas');
    const effectCanvas = document.getElementById('effectCanvas');
    const mapCtx = mapCanvas.getContext('2d');
    const effectCtx = effectCanvas.getContext('2d');
    const mapWrapper = document.getElementById('mapWrapper');
    const flashOverlay = document.getElementById('flashOverlay');
    const mapHint = document.getElementById('mapHint');

    const elements = {
        bombType: document.getElementById('bombType'),
        yieldSlider: document.getElementById('yieldSlider'),
        yieldValue: document.getElementById('yieldValue'),
        burstHeight: document.getElementById('burstHeight'),
        scaleSlider: document.getElementById('scaleSlider'),
        scaleValue: document.getElementById('scaleValue'),
        showLabels: document.getElementById('showLabels'),
        showLegend: document.getElementById('showLegend'),
        legend: document.getElementById('legend'),
        detonateBtn: document.getElementById('detonateBtn'),
        resetBtn: document.getElementById('resetBtn'),
        fireballRadius: document.getElementById('fireballRadius'),
        fireballDiameter: document.getElementById('fireballDiameter'),
        radiationRadius: document.getElementById('radiationRadius'),
        severeRadius: document.getElementById('severeRadius'),
        moderateRadius: document.getElementById('moderateRadius'),
        lightRadius: document.getElementById('lightRadius'),
        thermalRadius: document.getElementById('thermalRadius'),
        estimatedDeaths: document.getElementById('estimatedDeaths'),
        estimatedInjured: document.getElementById('estimatedInjured'),
        affectedArea: document.getElementById('affectedArea'),
        energyReleased: document.getElementById('energyReleased')
    };

    function rgba(r, g, b, a) {
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    function calculateRadii(yieldKilotons, burstHeight) {
        const W = yieldKilotons;
        const W_megatons = yieldKilotons / 1000;

        const fireballRadius = 0.14 * Math.pow(W_megatons, 0.4);
        const radiationRadius = 1.2 * Math.pow(W_megatons, 1 / 3) * (burstHeight < 300 ? 1.3 : 1.0);
        const severeRadius = 0.7 * Math.pow(W_megatons, 1 / 3) * 2.5;
        const moderateRadius = 0.7 * Math.pow(W_megatons, 1 / 3) * 4.5;
        const lightRadius = 0.7 * Math.pow(W_megatons, 1 / 3) * 8;
        const thermalRadius = 2.8 * Math.pow(W_megatons, 0.41);

        const heightFactor = Math.max(0.85, 1 - (burstHeight / 10000));
        const pressureFactor = Math.exp(-burstHeight / 2000);

        return {
            fireball: Math.max(0.1, fireballRadius * heightFactor),
            radiation: Math.max(0.3, radiationRadius * pressureFactor),
            severe: Math.max(0.5, severeRadius * heightFactor),
            moderate: Math.max(1.0, moderateRadius * heightFactor),
            light: Math.max(2.0, lightRadius * heightFactor),
            thermal: Math.max(1.0, thermalRadius * (burstHeight > 0 ? 1.15 : 0.9))
        };
    }

    function generateCities(width, height) {
        const cities = [];
        const cityCount = 80;
        const centerX = width / 2;
        const centerY = height / 2;

        for (let i = 0; i < cityCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * Math.min(width, height) * 0.45 + 50;
            const x = centerX + Math.cos(angle) * dist * (0.5 + Math.random() * 0.8);
            const y = centerY + Math.sin(angle) * dist * (0.5 + Math.random() * 0.8);

            if (x > 50 && x < width - 50 && y > 50 && y < height - 50) {
                const size = Math.random() * 30 + 15;
                const population = Math.floor(Math.random() * 500000 + 50000);
                cities.push({
                    x: x,
                    y: y,
                    size: size,
                    population: population,
                    name: getCityName(i),
                    destroyed: false
                });
            }
        }

        const centralCity = {
            x: centerX + (Math.random() - 0.5) * 100,
            y: centerY + (Math.random() - 0.5) * 100,
            size: 55,
            population: 3000000,
            name: '中心都市',
            destroyed: false
        };
        cities.unshift(centralCity);

        return cities;
    }

    function getCityName(index) {
        const prefixes = ['北', '南', '东', '西', '中', '新', '古', '大', '小', '青'];
        const suffixes = ['京', '城', '都', '市', '镇', '港', '州', '府', '里', '区'];
        return prefixes[index % prefixes.length] + suffixes[Math.floor(index / prefixes.length) % suffixes.length];
    }

    function generateRoads(width, height, cities) {
        const roads = [];
        for (let i = 0; i < cities.length; i++) {
            for (let j = i + 1; j < Math.min(i + 3, cities.length); j++) {
                if (Math.random() < 0.3) {
                    roads.push({
                        x1: cities[i].x,
                        y1: cities[i].y,
                        x2: cities[j].x,
                        y2: cities[j].y
                    });
                }
            }
        }
        return roads;
    }

    function setupCanvas() {
        const rect = mapWrapper.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        mapCanvas.width = rect.width * dpr;
        mapCanvas.height = rect.height * dpr;
        mapCanvas.style.width = rect.width + 'px';
        mapCanvas.style.height = rect.height + 'px';
        mapCtx.scale(dpr, dpr);

        effectCanvas.width = rect.width * dpr;
        effectCanvas.height = rect.height * dpr;
        effectCanvas.style.width = rect.width + 'px';
        effectCanvas.style.height = rect.height + 'px';
        effectCtx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        state.cities = generateCities(width, height);
        drawMap();
    }

    function drawMap() {
        const rect = mapWrapper.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        mapCtx.clearRect(0, 0, width, height);

        drawTerrain(width, height);
        drawGrid(width, height);
        drawWaterBodies(width, height);
        drawRoadsLayer(width, height);
        drawCities();
        drawExplosionZones(width, height);
    }

    function drawTerrain(width, height) {
        const gradient = mapCtx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) * 0.7
        );
        gradient.addColorStop(0, '#2a3a2a');
        gradient.addColorStop(0.5, '#1e2e1e');
        gradient.addColorStop(1, '#141f14');

        mapCtx.fillStyle = gradient;
        mapCtx.fillRect(0, 0, width, height);

        mapCtx.globalAlpha = 0.1;
        for (let i = 0; i < 200; i++) {
            const x = (i * 137.5) % width;
            const y = (i * 89.3) % height;
            const r = 20 + (i * 17) % 60;
            mapCtx.beginPath();
            mapCtx.arc(x, y, r, 0, Math.PI * 2);
            const terrainType = i % 3;
            if (terrainType === 0) {
                mapCtx.fillStyle = '#3a4a3a';
            } else if (terrainType === 1) {
                mapCtx.fillStyle = '#2a3a4a';
            } else {
                mapCtx.fillStyle = '#4a3a2a';
            }
            mapCtx.fill();
        }
        mapCtx.globalAlpha = 1;
    }

    function drawGrid(width, height) {
        const scale = state.scale;
        const step = scale * 5;

        mapCtx.strokeStyle = rgba(255, 255, 255, 0.04);
        mapCtx.lineWidth = 1;

        mapCtx.beginPath();
        for (let x = 0; x <= width; x += step) {
            mapCtx.moveTo(x, 0);
            mapCtx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += step) {
            mapCtx.moveTo(0, y);
            mapCtx.lineTo(width, y);
        }
        mapCtx.stroke();

        mapCtx.strokeStyle = rgba(255, 255, 255, 0.1);
        mapCtx.lineWidth = 1;
        const bigStep = step * 4;
        mapCtx.beginPath();
        for (let x = 0; x <= width; x += bigStep) {
            mapCtx.moveTo(x, 0);
            mapCtx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += bigStep) {
            mapCtx.moveTo(0, y);
            mapCtx.lineTo(width, y);
        }
        mapCtx.stroke();

        mapCtx.fillStyle = rgba(255, 255, 255, 0.15);
        mapCtx.font = '10px monospace';
        mapCtx.textAlign = 'center';
        for (let x = bigStep; x <= width; x += bigStep) {
            const km = Math.round((x - width / 2) / scale);
            mapCtx.fillText(km + 'km', x, height - 6);
        }
        mapCtx.textAlign = 'right';
        for (let y = bigStep; y <= height; y += bigStep) {
            const km = Math.round((height / 2 - y) / scale);
            mapCtx.fillText(km + 'km', width - 6, y + 3);
        }
    }

    function drawWaterBodies(width, height) {
        mapCtx.fillStyle = rgba(40, 60, 90, 0.6);

        mapCtx.beginPath();
        mapCtx.ellipse(width * 0.15, height * 0.85, width * 0.12, height * 0.08, -0.3, 0, Math.PI * 2);
        mapCtx.fill();

        mapCtx.beginPath();
        mapCtx.ellipse(width * 0.85, height * 0.15, width * 0.1, height * 0.06, 0.5, 0, Math.PI * 2);
        mapCtx.fill();

        mapCtx.strokeStyle = rgba(100, 140, 180, 0.3);
        mapCtx.lineWidth = 8;
        mapCtx.beginPath();
        mapCtx.moveTo(0, height * 0.3);
        mapCtx.bezierCurveTo(
            width * 0.3, height * 0.4,
            width * 0.5, height * 0.2,
            width, height * 0.35
        );
        mapCtx.stroke();
    }

    function drawRoadsLayer(width, height) {
        const roads = generateRoads(width, height, state.cities);
        mapCtx.strokeStyle = rgba(150, 140, 100, 0.25);
        mapCtx.lineWidth = 2;
        mapCtx.setLineDash([]);
        roads.forEach(function (road) {
            mapCtx.beginPath();
            mapCtx.moveTo(road.x1, road.y1);
            mapCtx.lineTo(road.x2, road.y2);
            mapCtx.stroke();
        });
    }

    function drawCities() {
        state.cities.forEach(function (city, index) {
            const isCentral = index === 0;
            const size = city.size;

            const buildingGradient = mapCtx.createRadialGradient(
                city.x, city.y, 0,
                city.x, city.y, size
            );
            buildingGradient.addColorStop(0, isCentral ? '#8888aa' : '#666677');
            buildingGradient.addColorStop(0.6, isCentral ? '#555577' : '#444455');
            buildingGradient.addColorStop(1, rgba(60, 60, 80, 0));

            mapCtx.fillStyle = buildingGradient;
            mapCtx.beginPath();
            mapCtx.arc(city.x, city.y, size, 0, Math.PI * 2);
            mapCtx.fill();

            const blocks = isCentral ? 15 : 8;
            mapCtx.fillStyle = isCentral ? '#aaaacc' : '#888899';
            for (let i = 0; i < blocks; i++) {
                const angle = (i / blocks) * Math.PI * 2;
                const dist = size * (0.2 + Math.random() * 0.6);
                const bx = city.x + Math.cos(angle) * dist;
                const by = city.y + Math.sin(angle) * dist;
                const bs = (isCentral ? 4 : 3) + Math.random() * 3;
                mapCtx.fillRect(bx - bs / 2, by - bs / 2, bs, bs);
            }

            if (city.destroyed) {
                mapCtx.fillStyle = rgba(100, 30, 20, 0.7);
                mapCtx.beginPath();
                mapCtx.arc(city.x, city.y, size, 0, Math.PI * 2);
                mapCtx.fill();
            }

            if (state.showLabels && size > 20) {
                mapCtx.fillStyle = rgba(255, 255, 255, 0.6);
                mapCtx.font = (isCentral ? 'bold 11px' : '10px') + ' sans-serif';
                mapCtx.textAlign = 'center';
                mapCtx.fillText(city.name, city.x, city.y + size + 14);
            }
        });
    }

    function drawExplosionZones(width, height) {
        if (!state.explosionCenter || !state.radii) return;

        const cx = state.explosionCenter.x;
        const cy = state.explosionCenter.y;
        const scale = state.scale;
        const radii = state.radii;

        const zones = [
            { radius: radii.thermal, colorFill: rgba(255, 102, 170, 0.15), colorBorder: rgba(255, 102, 170, 0.5), label: '热辐射', dash: [8, 4] },
            { radius: radii.light, colorFill: rgba(255, 221, 0, 0.18), colorBorder: rgba(255, 221, 0, 0.5), label: '轻度破坏' },
            { radius: radii.moderate, colorFill: rgba(255, 136, 0, 0.22), colorBorder: rgba(255, 136, 0, 0.55), label: '中度破坏' },
            { radius: radii.severe, colorFill: rgba(255, 0, 0, 0.28), colorBorder: rgba(255, 0, 0, 0.6), label: '严重破坏' },
            { radius: radii.radiation, colorFill: rgba(0, 255, 136, 0.18), colorBorder: rgba(0, 255, 136, 0.5), label: '致命辐射', dash: [4, 4] },
            { radius: radii.fireball, colorFill: rgba(255, 69, 0, 0.5), colorBorder: rgba(255, 255, 200, 0.7), label: '火球' }
        ];

        zones.forEach(function (zone) {
            const pxRadius = zone.radius * scale;

            mapCtx.beginPath();
            mapCtx.arc(cx, cy, pxRadius, 0, Math.PI * 2);
            mapCtx.fillStyle = zone.colorFill;
            mapCtx.fill();

            mapCtx.strokeStyle = zone.colorBorder;
            mapCtx.lineWidth = 1.5;
            if (zone.dash) {
                mapCtx.setLineDash(zone.dash);
            } else {
                mapCtx.setLineDash([]);
            }
            mapCtx.stroke();
            mapCtx.setLineDash([]);

            if (state.showLabels && pxRadius > 30) {
                const labelX = cx + pxRadius * 0.707;
                const labelY = cy - pxRadius * 0.707;
                const labelText = zone.label + ' ' + zone.radius.toFixed(1) + 'km';
                const textWidth = mapCtx.measureText(labelText).width;
                mapCtx.fillStyle = rgba(0, 0, 0, 0.6);
                mapCtx.fillRect(labelX - 2, labelY - 10, textWidth + 8, 16);
                mapCtx.fillStyle = zone.colorBorder;
                mapCtx.font = 'bold 11px sans-serif';
                mapCtx.textAlign = 'left';
                mapCtx.fillText(labelText, labelX + 2, labelY + 2);
            }
        });

        mapCtx.beginPath();
        mapCtx.arc(cx, cy, 6, 0, Math.PI * 2);
        const centerGrad = mapCtx.createRadialGradient(cx, cy, 0, cx, cy, 6);
        centerGrad.addColorStop(0, '#ffffff');
        centerGrad.addColorStop(0.5, '#ff4444');
        centerGrad.addColorStop(1, '#cc0000');
        mapCtx.fillStyle = centerGrad;
        mapCtx.fill();
        mapCtx.strokeStyle = rgba(255, 255, 255, 0.8);
        mapCtx.lineWidth = 2;
        mapCtx.stroke();

        mapCtx.beginPath();
        mapCtx.moveTo(cx - 12, cy);
        mapCtx.lineTo(cx + 12, cy);
        mapCtx.moveTo(cx, cy - 12);
        mapCtx.lineTo(cx, cy + 12);
        mapCtx.strokeStyle = rgba(255, 255, 255, 0.6);
        mapCtx.lineWidth = 1;
        mapCtx.stroke();
    }

    function updateDataDisplay() {
        if (!state.radii) return;

        const r = state.radii;
        elements.fireballRadius.textContent = r.fireball.toFixed(2);
        elements.fireballDiameter.textContent = (r.fireball * 2).toFixed(2);
        elements.radiationRadius.textContent = r.radiation.toFixed(2);
        elements.severeRadius.textContent = r.severe.toFixed(2);
        elements.moderateRadius.textContent = r.moderate.toFixed(2);
        elements.lightRadius.textContent = r.light.toFixed(2);
        elements.thermalRadius.textContent = r.thermal.toFixed(2);

        const W_terajoules = state.yieldKilotons * 4.184;
        elements.energyReleased.textContent = formatNumber(Math.round(W_terajoules));

        const totalArea = Math.PI * r.thermal * r.thermal;
        elements.affectedArea.textContent = formatNumber(Math.round(totalArea));

        let deaths = 0;
        let injured = 0;

        if (state.explosionCenter && state.cities.length > 0) {
            const scale = state.scale;
            state.cities.forEach(function (city) {
                const dx = city.x - state.explosionCenter.x;
                const dy = city.y - state.explosionCenter.y;
                const distPx = Math.sqrt(dx * dx + dy * dy);
                const distKm = distPx / scale;
                const pop = city.population;

                if (distKm <= r.fireball) {
                    deaths += pop * 0.99;
                    city.destroyed = true;
                } else if (distKm <= r.radiation) {
                    deaths += pop * 0.85;
                    injured += pop * 0.1;
                    city.destroyed = true;
                } else if (distKm <= r.severe) {
                    deaths += pop * 0.5;
                    injured += pop * 0.4;
                    city.destroyed = true;
                } else if (distKm <= r.moderate) {
                    deaths += pop * 0.15;
                    injured += pop * 0.5;
                } else if (distKm <= r.light) {
                    deaths += pop * 0.02;
                    injured += pop * 0.2;
                } else if (distKm <= r.thermal) {
                    injured += pop * 0.05;
                }
            });
        }

        elements.estimatedDeaths.textContent = formatNumber(Math.round(deaths));
        elements.estimatedInjured.textContent = formatNumber(Math.round(injured));
    }

    function formatNumber(num) {
        if (num >= 100000000) return (num / 100000000).toFixed(2) + ' 亿';
        if (num >= 10000) return (num / 10000).toFixed(1) + ' 万';
        return num.toLocaleString();
    }

    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return rgba(r, g, b, alpha);
    }

    function animateExplosion() {
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

    function handleCanvasClick(e) {
        if (state.isAnimating) return;

        const rect = mapCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        state.explosionCenter = { x: x, y: y };

        mapHint.classList.add('hidden');
        updateCalculations();
        drawMap();
    }

    function updateCalculations() {
        state.radii = calculateRadii(state.yieldKilotons, state.burstHeight);
        updateDataDisplay();
    }

    function setupEventListeners() {
        elements.bombType.addEventListener('change', function (e) {
            state.bombType = e.target.value;
            if (state.bombType !== 'custom') {
                const bomb = BOMB_TYPES[state.bombType];
                state.yieldKilotons = bomb.yield;
                elements.yieldSlider.value = bomb.yield;
                elements.yieldValue.textContent = bomb.yield.toLocaleString();
            }
            updateCalculations();
            drawMap();
        });

        elements.yieldSlider.addEventListener('input', function (e) {
            state.yieldKilotons = parseInt(e.target.value, 10);
            elements.yieldValue.textContent = state.yieldKilotons.toLocaleString();
            elements.bombType.value = 'custom';
            state.bombType = 'custom';
            updateCalculations();
            drawMap();
        });

        elements.burstHeight.addEventListener('change', function (e) {
            state.burstHeight = parseInt(e.target.value, 10);
            updateCalculations();
            drawMap();
        });

        elements.scaleSlider.addEventListener('input', function (e) {
            state.scale = parseInt(e.target.value, 10);
            elements.scaleValue.textContent = state.scale;
            drawMap();
        });

        elements.showLabels.addEventListener('change', function (e) {
            state.showLabels = e.target.checked;
            drawMap();
        });

        elements.showLegend.addEventListener('change', function (e) {
            state.showLegend = e.target.checked;
            elements.legend.classList.toggle('hidden', !e.target.checked);
        });

        elements.detonateBtn.addEventListener('click', function () {
            if (!state.explosionCenter) {
                alert('请先点击地图选择爆炸位置');
                return;
            }
            animateExplosion();
        });

        elements.resetBtn.addEventListener('click', function () {
            if (state.animationId) {
                cancelAnimationFrame(state.animationId);
            }
            state.isAnimating = false;
            state.explosionCenter = null;
            state.animationId = null;
            elements.detonateBtn.disabled = false;
            flashOverlay.classList.remove('active');
            mapHint.classList.remove('hidden');

            const rect = mapWrapper.getBoundingClientRect();
            effectCtx.clearRect(0, 0, rect.width, rect.height);

            state.cities.forEach(function (city) { city.destroyed = false; });

            updateCalculations();
            drawMap();
        });

        mapCanvas.addEventListener('click', handleCanvasClick);

        let resizeTimeout;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function () {
                setupCanvas();
                if (state.explosionCenter) {
                    updateCalculations();
                    drawMap();
                }
            }, 200);
        });
    }

    function init() {
        setupCanvas();
        setupEventListeners();
        updateCalculations();

        const rect = mapWrapper.getBoundingClientRect();
        state.explosionCenter = {
            x: rect.width / 2,
            y: rect.height / 2
        };
        mapHint.classList.add('hidden');
        updateCalculations();
        drawMap();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
