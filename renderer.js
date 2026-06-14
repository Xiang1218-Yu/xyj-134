(function (global) {
    'use strict';

    const rgba = global.DataDisplay.rgba;

    function setupCanvas(mapCanvas, effectCanvas, mapCtx, effectCtx, mapWrapper, state) {
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

    global.Renderer = {
        setupCanvas: setupCanvas,
        drawMap: drawMap
    };

})(window);
