(function (global) {
    'use strict';

    const rgba = global.DataDisplay.rgba;

    const ZONE_DEFS = [
        { key: 'thermal',  label: '热辐射',   dash: [8, 4] },
        { key: 'light',    label: '轻度破坏', dash: null },
        { key: 'moderate', label: '中度破坏', dash: null },
        { key: 'severe',   label: '严重破坏', dash: null },
        { key: 'radiation',label: '致命辐射', dash: [4, 4] },
        { key: 'fireball', label: '火球',     dash: null }
    ];

    function getZoneColors(key, tintIndex) {
        const palettes = [
            { thermal: [255,102,170], light: [255,221,0], moderate: [255,136,0], severe: [255,0,0],   radiation: [0,255,136], fireball: [255,69,0]  },
            { thermal: [102,170,255], light: [0,221,255], moderate: [0,136,255], severe: [0,85,255],  radiation: [170,102,255], fireball: [255,140,0] },
            { thermal: [170,255,102], light: [100,255,100], moderate: [50,200,100], severe: [0,160,60], radiation: [255,255,100], fireball: [255,90,90] },
            { thermal: [255,200,102], light: [255,200,150], moderate: [255,150,80], severe: [220,80,0], radiation: [255,100,255], fireball: [255,160,0] }
        ];
        const pal = palettes[tintIndex % palettes.length];
        const c = pal[key];
        return {
            fill: rgba(c[0], c[1], c[2], 0.16),
            border: rgba(c[0], c[1], c[2], 0.55)
        };
    }

    function setupCanvas(mapCanvas, effectCanvas, mapCtx, effectCtx, mapWrapper, state) {
        const rect = mapWrapper.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        mapCanvas.width = rect.width * dpr;
        mapCanvas.height = rect.height * dpr;
        mapCanvas.style.width = rect.width + 'px';
        mapCanvas.style.height = rect.height + 'px';
        mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (effectCanvas) {
            effectCanvas.width = rect.width * dpr;
            effectCanvas.height = rect.height * dpr;
            effectCanvas.style.width = rect.width + 'px';
            effectCanvas.style.height = rect.height + 'px';
            effectCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        const width = rect.width;
        const height = rect.height;

        state.cities = global.Physics.generateCities(width, height);
        drawMap(mapCtx, mapWrapper, state);
    }

    function drawMap(mapCtx, mapWrapper, state) {
        const rect = mapWrapper.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        mapCtx.clearRect(0, 0, width, height);

        drawTerrain(mapCtx, width, height);
        drawGrid(mapCtx, width, height, state.scale);
        drawWaterBodies(mapCtx, width, height);
        drawRoadsLayer(mapCtx, width, height, state.cities);
        drawCities(mapCtx, state);
        drawExplosionZones(mapCtx, width, height, state);
    }

    function drawTerrain(mapCtx, width, height) {
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

    function drawGrid(mapCtx, width, height, scale) {
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

    function drawWaterBodies(mapCtx, width, height) {
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

    function drawRoadsLayer(mapCtx, width, height, cities) {
        const roads = global.Physics.generateRoads(width, height, cities);
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

    function drawCities(mapCtx, state) {
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

    function drawExplosionZones(mapCtx, width, height, state) {
        if (!state.explosions || state.explosions.length === 0) return;

        state.explosions.forEach(function (exp, index) {
            if (!exp.explosionCenter || !exp.radii) return;
            drawOneExplosionZones(mapCtx, exp, index, state);
        });

        state.explosions.forEach(function (exp, index) {
            if (!exp.explosionCenter) return;
            const isSelected = exp.id === state.selectedExplosionId;
            drawExplosionMarker(mapCtx, exp.explosionCenter.x, exp.explosionCenter.y, index + 1, isSelected);
        });
    }

    function drawOneExplosionZones(mapCtx, exp, tintIndex, state) {
        const cx = exp.explosionCenter.x;
        const cy = exp.explosionCenter.y;
        const scale = state.scale;
        const radii = exp.radii;
        const isSelected = exp.id === state.selectedExplosionId;

        ZONE_DEFS.forEach(function (zone) {
            const colors = getZoneColors(zone.key, tintIndex);
            const pxRadius = radii[zone.key] * scale;

            mapCtx.beginPath();
            mapCtx.arc(cx, cy, pxRadius, 0, Math.PI * 2);
            mapCtx.fillStyle = colors.fill;
            mapCtx.fill();

            mapCtx.strokeStyle = colors.border;
            mapCtx.lineWidth = isSelected ? 2.5 : 1.5;
            if (zone.dash) {
                mapCtx.setLineDash(zone.dash);
            } else {
                mapCtx.setLineDash([]);
            }
            mapCtx.stroke();
            mapCtx.setLineDash([]);

            if (state.showLabels && pxRadius > 30 && isSelected) {
                const labelX = cx + pxRadius * 0.707;
                const labelY = cy - pxRadius * 0.707;
                const labelText = zone.label + ' ' + radii[zone.key].toFixed(1) + 'km';
                const textWidth = mapCtx.measureText(labelText).width;
                mapCtx.fillStyle = rgba(0, 0, 0, 0.6);
                mapCtx.fillRect(labelX - 2, labelY - 10, textWidth + 8, 16);
                mapCtx.fillStyle = colors.border;
                mapCtx.font = 'bold 11px sans-serif';
                mapCtx.textAlign = 'left';
                mapCtx.fillText(labelText, labelX + 2, labelY + 2);
            }
        });
    }

    function drawExplosionMarker(mapCtx, cx, cy, number, isSelected) {
        const ringRadius = isSelected ? 12 : 9;
        const innerRadius = isSelected ? 9 : 6;

        if (isSelected) {
            mapCtx.beginPath();
            mapCtx.arc(cx, cy, ringRadius + 4, 0, Math.PI * 2);
            mapCtx.strokeStyle = rgba(255, 255, 255, 0.4);
            mapCtx.lineWidth = 2;
            mapCtx.setLineDash([4, 3]);
            mapCtx.stroke();
            mapCtx.setLineDash([]);
        }

        mapCtx.beginPath();
        mapCtx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        const centerGrad = mapCtx.createRadialGradient(cx, cy, 0, cx, cy, ringRadius);
        if (isSelected) {
            centerGrad.addColorStop(0, '#ffffff');
            centerGrad.addColorStop(0.5, '#ffdd00');
            centerGrad.addColorStop(1, '#ff8800');
        } else {
            centerGrad.addColorStop(0, '#ffffff');
            centerGrad.addColorStop(0.5, '#ff6666');
            centerGrad.addColorStop(1, '#cc2222');
        }
        mapCtx.fillStyle = centerGrad;
        mapCtx.fill();

        mapCtx.strokeStyle = rgba(255, 255, 255, 0.9);
        mapCtx.lineWidth = 2;
        mapCtx.stroke();

        mapCtx.beginPath();
        mapCtx.moveTo(cx - 10, cy);
        mapCtx.lineTo(cx + 10, cy);
        mapCtx.moveTo(cx, cy - 10);
        mapCtx.lineTo(cx, cy + 10);
        mapCtx.strokeStyle = rgba(0, 0, 0, 0.6);
        mapCtx.lineWidth = 1;
        mapCtx.stroke();

        mapCtx.fillStyle = '#ffffff';
        mapCtx.font = 'bold ' + (isSelected ? '12px' : '11px') + ' sans-serif';
        mapCtx.textAlign = 'center';
        mapCtx.textBaseline = 'middle';
        mapCtx.strokeStyle = rgba(0, 0, 0, 0.8);
        mapCtx.lineWidth = 3;
        mapCtx.strokeText('#' + number, cx, cy);
        mapCtx.fillText('#' + number, cx, cy);
        mapCtx.textBaseline = 'alphabetic';

        if (isSelected) {
            mapCtx.fillStyle = rgba(255, 221, 0, 0.95);
            mapCtx.font = 'bold 10px sans-serif';
            mapCtx.textAlign = 'center';
            const label = '爆炸点 #' + number;
            const tw = mapCtx.measureText(label).width;
            const lx = cx;
            const ly = cy - ringRadius - 10;
            mapCtx.fillStyle = rgba(0, 0, 0, 0.75);
            mapCtx.fillRect(lx - tw / 2 - 6, ly - 12, tw + 12, 16);
            mapCtx.fillStyle = '#ffdd00';
            mapCtx.fillText(label, lx, ly);
        }
    }

    global.Renderer = {
        setupCanvas: setupCanvas,
        drawMap: drawMap
    };

})(window);
