(function (global) {
    'use strict';

    const rgba = global.DataDisplay.rgba;

    function getZoneDefs() {
        return global.Physics.getZones();
    }

    function getZoneColors(key, tintIndex) {
        const zones = getZoneDefs();
        const zone = zones.find(function (z) { return z.key === key; });
        let baseColor = zone && zone.color ? zone.color : [128, 128, 128];

        const tintMultipliers = [
            [1.0, 1.0, 1.0],
            [0.4, 0.67, 1.0],
            [0.67, 1.0, 0.4],
            [1.0, 0.78, 0.4]
        ];
        const mult = tintMultipliers[tintIndex % tintMultipliers.length];
        const c = [
            Math.min(255, Math.round(baseColor[0] * mult[0])),
            Math.min(255, Math.round(baseColor[1] * mult[1])),
            Math.min(255, Math.round(baseColor[2] * mult[2]))
        ];

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

        if (state.showTerrainHeatmap) {
            drawTerrainHeatmap(mapCtx, width, height, state.terrainData);
        }

        drawGrid(mapCtx, width, height, state.scale);
        drawWaterBodies(mapCtx, width, height);

        if (state.showTerrainContours) {
            drawTerrainContours(mapCtx, width, height, state.terrainData);
        }

        if (state.evacuationEnabled && state.evacuationPlan && state.evacuationPlan.roadDensities) {
            drawEvacuationRoads(mapCtx, state);
        } else {
            drawRoadsLayer(mapCtx, width, height, state.cities);
        }

        drawCities(mapCtx, state);

        if (state.evacuationEnabled && state.shelters && state.shelters.length > 0) {
            drawSheltersOnMap(mapCtx, state);
        }

        if (!state.isAnimating) {
            drawExplosionZones(mapCtx, width, height, state);
        }
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

    function getTerrainColor(elevation) {
        if (elevation <= -100) {
            return { r: 30, g: 50, b: 90 };
        } else if (elevation <= 0) {
            const t = (elevation - (-100)) / 100;
            return {
                r: Math.round(30 + t * 40),
                g: Math.round(50 + t * 40),
                b: Math.round(90 - t * 40)
            };
        } else if (elevation <= 200) {
            const t = elevation / 200;
            return {
                r: Math.round(70 + t * 20),
                g: Math.round(90 + t * 50),
                b: Math.round(50 - t * 10)
            };
        } else if (elevation <= 800) {
            const t = (elevation - 200) / 600;
            return {
                r: Math.round(90 + t * 60),
                g: Math.round(140 + t * 30),
                b: Math.round(40 - t * 10)
            };
        } else if (elevation <= 2000) {
            const t = (elevation - 800) / 1200;
            return {
                r: Math.round(150 + t * 60),
                g: Math.round(170 - t * 30),
                b: Math.round(30 + t * 30)
            };
        } else if (elevation <= 4000) {
            const t = (elevation - 2000) / 2000;
            return {
                r: Math.round(210 + t * 30),
                g: Math.round(140 - t * 30),
                b: Math.round(60 + t * 50)
            };
        } else {
            const t = Math.min(1, (elevation - 4000) / 3000);
            return {
                r: Math.round(240 - t * 20),
                g: Math.round(110 + t * 130),
                b: Math.round(110 + t * 130)
            };
        }
    }

    function drawTerrainHeatmap(mapCtx, width, height, terrain) {
        if (!terrain || !terrain.features || terrain.features.length === 0) return;

        const step = 8;
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const elev = global.Physics.getElevationAt(x + step / 2, y + step / 2, terrain);
                if (Math.abs(elev) < 5) continue;

                const color = getTerrainColor(elev);
                const intensity = Math.min(0.35, Math.abs(elev) / 8000 + 0.05);
                mapCtx.fillStyle = rgba(color.r, color.g, color.b, intensity);
                mapCtx.fillRect(x, y, step, step);
            }
        }

        const FEATURE_TYPES = global.Physics.TERRAIN_FEATURE_TYPES;
        terrain.features.forEach(function (f) {
            if (f.type === FEATURE_TYPES.MOUNTAIN) {
                const innerGrad = mapCtx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * 1.2);
                innerGrad.addColorStop(0, rgba(200, 180, 160, 0.2));
                innerGrad.addColorStop(0.3, rgba(180, 120, 90, 0.15));
                innerGrad.addColorStop(0.7, rgba(90, 130, 60, 0.1));
                innerGrad.addColorStop(1, rgba(0, 0, 0, 0));
                mapCtx.fillStyle = innerGrad;
                mapCtx.beginPath();
                mapCtx.arc(f.x, f.y, f.radius * 1.2, 0, Math.PI * 2);
                mapCtx.fill();

                mapCtx.strokeStyle = rgba(255, 255, 255, 0.35);
                mapCtx.lineWidth = 1.5;
                mapCtx.beginPath();
                mapCtx.arc(f.x, f.y, f.radius * 0.25, 0, Math.PI * 2);
                mapCtx.stroke();
            } else if (f.type === FEATURE_TYPES.HILL) {
                const grad = mapCtx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
                grad.addColorStop(0, rgba(140, 160, 80, 0.18));
                grad.addColorStop(0.6, rgba(100, 130, 60, 0.1));
                grad.addColorStop(1, rgba(0, 0, 0, 0));
                mapCtx.fillStyle = grad;
                mapCtx.beginPath();
                mapCtx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
                mapCtx.fill();
            } else if (f.type === FEATURE_TYPES.BASIN) {
                const grad = mapCtx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * 1.5);
                grad.addColorStop(0, rgba(60, 100, 140, 0.25));
                grad.addColorStop(0.5, rgba(40, 70, 110, 0.15));
                grad.addColorStop(1, rgba(0, 0, 0, 0));
                mapCtx.fillStyle = grad;
                mapCtx.beginPath();
                mapCtx.arc(f.x, f.y, f.radius * 1.5, 0, Math.PI * 2);
                mapCtx.fill();
            }
        });

        terrain.features.forEach(function (f) {
            if (f.height > 1000) {
                const dx = f.radius * 0.6;
                const dy = f.radius * 0.6;
                mapCtx.fillStyle = 'rgba(255,255,255,0.03)';
                mapCtx.beginPath();
                mapCtx.moveTo(f.x - dx, f.y + dy);
                mapCtx.lineTo(f.x + dx, f.y + dy);
                mapCtx.lineTo(f.x, f.y - dy * 0.8);
                mapCtx.closePath();
                mapCtx.fill();
            }
        });
    }

    function drawTerrainContours(mapCtx, width, height, terrain) {
        if (!terrain || !terrain.features || terrain.features.length === 0) return;

        const contourLevels = [300, 600, 1000, 1500, 2500, 4000];
        const contourColors = [
            rgba(100, 180, 100, 0.25),
            rgba(140, 170, 80, 0.28),
            rgba(180, 150, 60, 0.30),
            rgba(200, 120, 80, 0.32),
            rgba(200, 90, 110, 0.35),
            rgba(180, 180, 220, 0.40)
        ];

        const step = 5;

        contourLevels.forEach(function (level, levelIdx) {
            mapCtx.strokeStyle = contourColors[levelIdx];
            mapCtx.lineWidth = levelIdx >= 4 ? 1.2 : 0.8;
            mapCtx.beginPath();

            for (let y = step; y < height - step; y += step * 2) {
                for (let x = step; x < width - step; x += step * 2) {
                    const e0 = global.Physics.getElevationAt(x, y, terrain);
                    const e1 = global.Physics.getElevationAt(x + step, y, terrain);
                    const e2 = global.Physics.getElevationAt(x + step, y + step, terrain);
                    const e3 = global.Physics.getElevationAt(x, y + step, terrain);

                    let crossings = [];
                    const pairs = [
                        [e0, e1, x, y, x + step, y],
                        [e1, e2, x + step, y, x + step, y + step],
                        [e2, e3, x + step, y + step, x, y + step],
                        [e3, e0, x, y + step, x, y]
                    ];

                    pairs.forEach(function (pair) {
                        const [ea, eb, xa, ya, xb, yb] = pair;
                        if ((ea < level && eb >= level) || (ea >= level && eb < level)) {
                            const t = (level - ea) / (eb - ea);
                            crossings.push({
                                x: xa + (xb - xa) * t,
                                y: ya + (yb - ya) * t
                            });
                        }
                    });

                    if (crossings.length >= 2) {
                        mapCtx.moveTo(crossings[0].x, crossings[0].y);
                        mapCtx.lineTo(crossings[1].x, crossings[1].y);
                    }
                }
            }
            mapCtx.stroke();
        });

        const FEATURE_TYPES = global.Physics.TERRAIN_FEATURE_TYPES;
        terrain.features.forEach(function (f) {
            let label, color;
            if (f.type === FEATURE_TYPES.MOUNTAIN && f.height > 1500) {
                label = '▲ ' + Math.round(f.height) + 'm';
                color = rgba(220, 220, 255, 0.7);
            } else if (f.type === FEATURE_TYPES.BASIN && f.height < -200) {
                label = '▼ ' + Math.round(Math.abs(f.height)) + 'm';
                color = rgba(100, 160, 220, 0.7);
            } else {
                return;
            }

            if (f.radius > 40) {
                mapCtx.font = '10px sans-serif';
                mapCtx.textAlign = 'center';
                mapCtx.fillStyle = rgba(0, 0, 0, 0.55);
                const tw = mapCtx.measureText(label).width;
                mapCtx.fillRect(f.x - tw / 2 - 3, f.y - 4, tw + 6, 13);
                mapCtx.fillStyle = color;
                mapCtx.fillText(label, f.x, f.y + 5);
            }
        });
    }

    function drawPolygonPathFromPoints(ctx, points, close) {
        if (!points || points.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const midX = (prev.x + curr.x) / 2;
            const midY = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
        if (close !== false) {
            const last = points[points.length - 1];
            const first = points[0];
            const midX = (last.x + first.x) / 2;
            const midY = (last.y + first.y) / 2;
            ctx.quadraticCurveTo(last.x, last.y, midX, midY);
            ctx.closePath();
        }
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

    function drawEvacuationRoads(mapCtx, state) {
        const roadDensities = state.evacuationPlan.roadDensities;
        const nodes = state.evacuationPlan.graph.nodes;

        roadDensities.forEach(function (rd) {
            const edge = rd.edge;
            const density = rd.density;

            const fromNode = nodes[edge.from];
            const toNode = nodes[edge.to];

            if (!fromNode || !toNode) return;

            let color;
            let lineWidth;

            if (density < 0.3) {
                color = rgba(100, 200, 100, 0.6);
                lineWidth = 3;
            } else if (density < 0.6) {
                color = rgba(255, 200, 50, 0.7);
                lineWidth = 4;
            } else if (density < 1) {
                color = rgba(255, 100, 50, 0.8);
                lineWidth = 5;
            } else {
                color = rgba(255, 50, 50, 0.9);
                lineWidth = 6;
            }

            mapCtx.strokeStyle = color;
            mapCtx.lineWidth = lineWidth;
            mapCtx.lineCap = 'round';

            mapCtx.beginPath();
            mapCtx.moveTo(fromNode.x, fromNode.y);
            mapCtx.lineTo(toNode.x, toNode.y);
            mapCtx.stroke();
        });

        drawEvacuationArrows(mapCtx, state);
    }

    function drawEvacuationArrows(mapCtx, state) {
        const cityPlans = state.evacuationPlan.cityPlans;
        const nodes = state.evacuationPlan.graph.nodes;

        cityPlans.forEach(function (plan) {
            if (!plan.path || plan.path.length === 0 || plan.evacuated <= 0) return;

            plan.path.forEach(function (edge) {
                const fromNode = nodes[edge.from];
                const toNode = nodes[edge.to];
                if (!fromNode || !toNode) return;

                const midX = (fromNode.x + toNode.x) / 2;
                const midY = (fromNode.y + toNode.y) / 2;

                const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
                const arrowSize = 10;

                const arrowAlpha = plan.canEvacuate ? 0.7 : 0.4;

                mapCtx.save();
                mapCtx.translate(midX, midY);
                mapCtx.rotate(angle);

                mapCtx.fillStyle = plan.canEvacuate
                    ? rgba(100, 200, 255, arrowAlpha)
                    : rgba(255, 100, 100, arrowAlpha);

                mapCtx.beginPath();
                mapCtx.moveTo(arrowSize, 0);
                mapCtx.lineTo(-arrowSize / 2, -arrowSize / 2);
                mapCtx.lineTo(-arrowSize / 2, arrowSize / 2);
                mapCtx.closePath();
                mapCtx.fill();

                mapCtx.restore();
            });
        });
    }

    function drawSheltersOnMap(mapCtx, state) {
        state.shelters.forEach(function (shelter, idx) {
            const x = shelter.x;
            const y = shelter.y;
            const size = 22;
            const isSelected = state.selectedShelterIndex === idx;

            const glowGrad = mapCtx.createRadialGradient(x, y, 0, x, y, size * 2.5);
            glowGrad.addColorStop(0, rgba(0, 255, 136, isSelected ? 0.4 : 0.2));
            glowGrad.addColorStop(1, rgba(0, 255, 136, 0));
            mapCtx.fillStyle = glowGrad;
            mapCtx.beginPath();
            mapCtx.arc(x, y, size * 2.5, 0, Math.PI * 2);
            mapCtx.fill();

            if (isSelected) {
                mapCtx.beginPath();
                mapCtx.arc(x, y, size + 6, 0, Math.PI * 2);
                mapCtx.strokeStyle = rgba(255, 255, 255, 0.6);
                mapCtx.lineWidth = 2;
                mapCtx.setLineDash([6, 4]);
                mapCtx.stroke();
                mapCtx.setLineDash([]);
            }

            const bgGrad = mapCtx.createRadialGradient(x, y, 0, x, y, size);
            bgGrad.addColorStop(0, '#00ff88');
            bgGrad.addColorStop(0.7, '#00cc6a');
            bgGrad.addColorStop(1, '#007744');
            mapCtx.fillStyle = bgGrad;
            mapCtx.beginPath();
            mapCtx.arc(x, y, size, 0, Math.PI * 2);
            mapCtx.fill();

            mapCtx.strokeStyle = isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)';
            mapCtx.lineWidth = isSelected ? 3 : 2;
            mapCtx.stroke();

            mapCtx.fillStyle = '#ffffff';
            mapCtx.font = 'bold 18px sans-serif';
            mapCtx.textAlign = 'center';
            mapCtx.textBaseline = 'middle';
            mapCtx.fillText('🏠', x, y);

            if (state.showLabels) {
                mapCtx.fillStyle = 'rgba(0,0,0,0.75)';
                const label = shelter.name;
                mapCtx.font = '11px sans-serif';
                const tw = mapCtx.measureText(label).width;
                mapCtx.fillRect(x - tw / 2 - 6, y + size + 4, tw + 12, 18);
                mapCtx.fillStyle = '#00ff88';
                mapCtx.fillText(label, x, y + size + 15);

                const capLabel = formatCapacity(shelter.capacity);
                mapCtx.fillStyle = 'rgba(0,0,0,0.6)';
                mapCtx.font = '10px sans-serif';
                const capTw = mapCtx.measureText(capLabel).width;
                mapCtx.fillRect(x - capTw / 2 - 6, y + size + 22, capTw + 12, 16);
                mapCtx.fillStyle = 'rgba(255,255,255,0.8)';
                mapCtx.fillText(capLabel, x, y + size + 32);
            }
        });

        mapCtx.textBaseline = 'alphabetic';
    }

    function formatCapacity(cap) {
        if (cap >= 1000000) return (cap / 1000000).toFixed(1) + 'M 人';
        if (cap >= 1000) return (cap / 1000).toFixed(0) + 'K 人';
        return cap + ' 人';
    }

    function drawCities(mapCtx, state) {
        const BUILDING_TYPES = global.Physics.BUILDING_TYPES;
        const BUILDING_TYPE_ORDER = global.Physics.BUILDING_TYPE_ORDER;

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

            if (city.buildingDistribution && size > 18) {
                const ringRadius = size + 4;
                const ringWidth = 3;
                let startAngle = -Math.PI / 2;

                BUILDING_TYPE_ORDER.forEach(function (type) {
                    const ratio = city.buildingDistribution[type] || 0;
                    if (ratio <= 0.01) return;

                    const bt = BUILDING_TYPES[type];
                    const arcAngle = ratio * Math.PI * 2;

                    mapCtx.beginPath();
                    mapCtx.arc(city.x, city.y, ringRadius, startAngle, startAngle + arcAngle);
                    mapCtx.strokeStyle = bt.color;
                    mapCtx.lineWidth = ringWidth;
                    mapCtx.stroke();

                    startAngle += arcAngle;
                });
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

        drawAllOverlapHighlights(mapCtx, state);

        state.explosions.forEach(function (exp, index) {
            if (!exp.explosionCenter) return;
            const isSelected = exp.id === state.selectedExplosionId;
            drawExplosionMarker(mapCtx, exp.explosionCenter.x, exp.explosionCenter.y, index + 1, isSelected);
        });
    }

    function getOverlayHatchColors() {
        const zones = getZoneDefs();
        const result = {};
        const angles = [Math.PI / 5, -Math.PI / 5, Math.PI / 4, -Math.PI / 4, Math.PI / 3, 0, Math.PI / 6, -Math.PI / 6];
        const spacings = [9, 9, 8, 7, 7, 6, 8, 7];

        zones.forEach(function (zone, index) {
            const color = zone.color || [128, 128, 128];
            const angle = angles[index % angles.length];
            const spacing = spacings[index % spacings.length];
            result[zone.key] = {
                line: rgba(color[0], color[1], color[2], 0.55 + (index % 3) * 0.05),
                fill: rgba(color[0], color[1], color[2], 0.10 + (index % 3) * 0.02),
                angle: angle,
                spacing: spacing
            };
        });

        return result;
    }

    const OVERLAP_LEVEL_STYLES = {
        2: null,
        3: {
            fillBase: [
                'rgba(255, 255, 255, 0.25)',
                'rgba(255, 255, 255, 0.27)',
                'rgba(255, 255, 255, 0.29)',
                'rgba(255, 255, 255, 0.30)',
                'rgba(255, 255, 255, 0.31)',
                'rgba(255, 255, 255, 0.33)'
            ],
            hatch2: true,
            lineAlpha: 0.85,
            lineWidth: 2.0,
            spacing2: 6,
            outline: true,
            outlineColor: 'rgba(255, 255, 255, 0.55)',
            outlineWidth: 2.0,
            label: '3圆'
        },
        4: {
            fillBase: [
                'rgba(255, 220, 80, 0.28)',
                'rgba(255, 210, 70, 0.30)',
                'rgba(255, 200, 60, 0.32)',
                'rgba(255, 190, 50, 0.34)',
                'rgba(255, 180, 40, 0.36)',
                'rgba(255, 170, 30, 0.38)'
            ],
            hatch2: true,
            lineAlpha: 0.92,
            lineWidth: 2.2,
            spacing2: 5,
            outline: true,
            outlineColor: 'rgba(255, 230, 120, 0.80)',
            outlineWidth: 2.5,
            label: '4圆+'
        }
    };

    function generateCombinations(arr, k) {
        const result = [];
        const n = arr.length;
        if (k > n) return result;
        const idx = [];
        for (let i = 0; i < k; i++) idx.push(i);
        while (true) {
            result.push(idx.map(function (i) { return arr[i]; }));
            let pos = k - 1;
            while (pos >= 0 && idx[pos] === n - k + pos) pos--;
            if (pos < 0) break;
            idx[pos]++;
            for (let j = pos + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
        }
        return result;
    }

    function drawMultiCircleOverlap(ctx, circles, zoneIndex, level) {
        const cw = ctx.canvas.width / (window.devicePixelRatio || 1);
        const ch = ctx.canvas.height / (window.devicePixelRatio || 1);
        const diag = Math.sqrt(cw * cw + ch * ch);
        const cx = cw / 2;
        const cy = ch / 2;

        for (let c = 0; c < circles.length; c++) {
            const r = circles[c].r;
            if (r <= 1) return;
        }

        ctx.save();
        for (let c = 0; c < circles.length; c++) {
            ctx.beginPath();
            ctx.arc(circles[c].cx, circles[c].cy, circles[c].r, 0, Math.PI * 2);
            ctx.clip();
        }

        const lvlStyle = OVERLAP_LEVEL_STYLES[level];
        if (!lvlStyle) {
            ctx.restore();
            return;
        }

        if (lvlStyle.fillBase) {
            ctx.fillStyle = lvlStyle.fillBase[zoneIndex % lvlStyle.fillBase.length];
            ctx.fillRect(0, 0, cw, ch);
        }

        if (lvlStyle.hatch2) {
            const zoneDefs = getZoneDefs();
            const overlayHatchColors = getOverlayHatchColors();
            const baseStyle = overlayHatchColors[zoneDefs[zoneIndex].key];
            const lineRgbMatch = baseStyle.line.match(/rgba?\(([^)]+)\)/);
            let lineColor = baseStyle.line;
            if (lineRgbMatch) {
                const parts = lineRgbMatch[1].split(',').map(function (s) { return s.trim(); });
                lineColor = 'rgba(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ',' + lvlStyle.lineAlpha + ')';
            }
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = lvlStyle.lineWidth || 1.5;
            ctx.beginPath();
            const angle2 = -baseStyle.angle + Math.PI / 2;
            const cos1 = Math.cos(baseStyle.angle);
            const sin1 = Math.sin(baseStyle.angle);
            const cos2 = Math.cos(angle2);
            const sin2 = Math.sin(angle2);
            const sp1 = baseStyle.spacing;
            const sp2 = lvlStyle.spacing2;
            for (let t = -diag; t <= diag; t += sp1) {
                ctx.moveTo(cx + (-diag) * cos1 + t * (-sin1), cy + (-diag) * sin1 + t * cos1);
                ctx.lineTo(cx + diag * cos1 + t * (-sin1), cy + diag * sin1 + t * cos1);
            }
            for (let t = -diag; t <= diag; t += sp2) {
                ctx.moveTo(cx + (-diag) * cos2 + t * (-sin2), cy + (-diag) * sin2 + t * cos2);
                ctx.lineTo(cx + diag * cos2 + t * (-sin2), cy + diag * sin2 + t * cos2);
            }
            ctx.stroke();
        }

        ctx.restore();

        if (lvlStyle.outline) {
            const color = lvlStyle.outlineColor;
            const width = lvlStyle.outlineWidth || 2.0;
            const k = circles.length;
            for (let i = 0; i < k; i++) {
                ctx.save();
                for (let j = 0; j < k; j++) {
                    if (j === i) continue;
                    ctx.beginPath();
                    ctx.arc(circles[j].cx, circles[j].cy, circles[j].r, 0, Math.PI * 2);
                    ctx.clip();
                }
                ctx.beginPath();
                ctx.arc(circles[i].cx, circles[i].cy, circles[i].r, 0, Math.PI * 2);
                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    function buildCircleIntersectionPath(ctx, x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d >= r1 + r2 - 0.5) return false;
        if (d <= Math.abs(r1 - r2) + 0.5) {
            const minR = Math.min(r1, r2);
            const cx = r1 < r2 ? x1 : x2;
            const cy = r1 < r2 ? y1 : y2;
            ctx.beginPath();
            ctx.arc(cx, cy, minR, 0, Math.PI * 2);
            return true;
        }

        const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
        const hSq = r1 * r1 - a * a;
        if (hSq < 0) return false;
        const h = Math.sqrt(hSq);

        const px = x1 + a * dx / d;
        const py = y1 + a * dy / d;
        const ix = -h * dy / d;
        const iy = h * dx / d;

        const p1x = px + ix, p1y = py + iy;
        const p2x = px - ix, p2y = py - iy;

        const angA1 = Math.atan2(p1y - y1, p1x - x1);
        const angA2 = Math.atan2(p2y - y1, p2x - x1);
        const angB1 = Math.atan2(p1y - y2, p1x - x2);
        const angB2 = Math.atan2(p2y - y2, p2x - x2);

        ctx.beginPath();
        ctx.arc(x1, y1, r1, angA1, angA2, false);
        ctx.arc(x2, y2, r2, angB2, angB1, false);
        ctx.closePath();
        return true;
    }

    function drawHatchInsidePath(ctx, style) {
        ctx.save();
        ctx.clip();

        const bbox = ctx.canvas.getBoundingClientRect();
        const cw = ctx.canvas.width / (window.devicePixelRatio || 1);
        const ch = ctx.canvas.height / (window.devicePixelRatio || 1);

        const diag = Math.sqrt(cw * cw + ch * ch);
        const cos = Math.cos(style.angle);
        const sin = Math.sin(style.angle);
        const cx = cw / 2;
        const cy = ch / 2;

        ctx.strokeStyle = style.line;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let t = -diag; t <= diag; t += style.spacing) {
            const sx = cx + (-diag) * cos + t * (-sin);
            const sy = cy + (-diag) * sin + t * cos;
            const ex = cx + diag * cos + t * (-sin);
            const ey = cy + diag * sin + t * cos;
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
        }
        ctx.stroke();

        ctx.restore();
    }

    function drawAllOverlapHighlights(mapCtx, state) {
        const scaled = [];
        state.explosions.forEach(function (exp) {
            if (!exp.explosionCenter || !exp.radii) return;
            const circles = {};
            getZoneDefs().forEach(function (zone) {
                circles[zone.key] = exp.radii[zone.key] * state.scale;
            });
            scaled.push({ cx: exp.explosionCenter.x, cy: exp.explosionCenter.y, r: circles });
        });

        if (scaled.length < 2) return;

        const n = scaled.length;
        const maxLevel = Math.min(n, 6);
        const zoneDefs = getZoneDefs();
        const overlayHatchColors = getOverlayHatchColors();

        zoneDefs.forEach(function (zone, zoneIndex) {
            const zk = zone.key;
            const baseStyle = overlayHatchColors[zk];

            for (let level = 2; level <= maxLevel; level++) {
                const combos = generateCombinations(scaled, level);
                for (let ci = 0; ci < combos.length; ci++) {
                    const combo = combos[ci];
                    const circlesWithR = [];
                    for (let k = 0; k < combo.length; k++) {
                        const r = combo[k].r[zk];
                        if (r > 1) {
                            circlesWithR.push({ cx: combo[k].cx, cy: combo[k].cy, r: r });
                        }
                    }
                    if (circlesWithR.length < level) continue;

                    if (level === 2) {
                        const A = circlesWithR[0];
                        const B = circlesWithR[1];
                        const hasInt = buildCircleIntersectionPath(mapCtx, A.cx, A.cy, A.r, B.cx, B.cy, B.r);
                        if (hasInt) {
                            mapCtx.fillStyle = baseStyle.fill;
                            mapCtx.fill();
                            drawHatchInsidePath(mapCtx, baseStyle);
                        }
                    } else {
                        drawMultiCircleOverlap(mapCtx, circlesWithR, zoneIndex, level);
                    }
                }
            }
        });
    }

    function drawOneExplosionZones(mapCtx, exp, tintIndex, state) {
        const cx = exp.explosionCenter.x;
        const cy = exp.explosionCenter.y;
        const scale = state.scale;
        const radii = exp.radii;
        const isSelected = exp.id === state.selectedExplosionId;
        const terrain = state.terrainData;
        const useTerrain = terrain && terrain.features && terrain.features.length > 0;
        const zoneDefs = getZoneDefs();

        const boundaryCache = {};
        if (useTerrain) {
            zoneDefs.forEach(function (zone) {
                boundaryCache[zone.key] = global.Physics.generateTerrainBoundaryPolygon(
                    exp, zone.key, terrain, scale, 72
                );
            });
        }

        zoneDefs.forEach(function (zone) {
            const colors = getZoneColors(zone.key, tintIndex);
            const pxRadius = radii[zone.key] * scale;

            let dashStyle = zone.dash;
            if (typeof dashStyle === 'string') {
                switch (dashStyle) {
                    case 'dashed4': dashStyle = [4, 4]; break;
                    case 'dashed8': dashStyle = [8, 4]; break;
                    case 'dotted': dashStyle = [2, 2]; break;
                    case 'solid':
                    default: dashStyle = null; break;
                }
            }

            if (useTerrain && boundaryCache[zone.key]) {
                const points = boundaryCache[zone.key];
                drawPolygonPathFromPoints(mapCtx, points, true);
                mapCtx.fillStyle = colors.fill;
                mapCtx.fill();

                drawPolygonPathFromPoints(mapCtx, points, true);
                mapCtx.strokeStyle = colors.border;
                mapCtx.lineWidth = isSelected ? 2.5 : 1.5;
                if (dashStyle) {
                    mapCtx.setLineDash(dashStyle);
                } else {
                    mapCtx.setLineDash([]);
                }
                mapCtx.stroke();
                mapCtx.setLineDash([]);
            } else {
                mapCtx.beginPath();
                mapCtx.arc(cx, cy, pxRadius, 0, Math.PI * 2);
                mapCtx.fillStyle = colors.fill;
                mapCtx.fill();

                mapCtx.strokeStyle = colors.border;
                mapCtx.lineWidth = isSelected ? 2.5 : 1.5;
                if (dashStyle) {
                    mapCtx.setLineDash(dashStyle);
                } else {
                    mapCtx.setLineDash([]);
                }
                mapCtx.stroke();
                mapCtx.setLineDash([]);
            }

            if (state.showLabels && pxRadius > 30 && isSelected) {
                const labelAngle = -Math.PI / 4;
                let labelRadius = pxRadius;
                if (useTerrain && boundaryCache[zone.key]) {
                    const points = boundaryCache[zone.key];
                    let closestIdx = 0;
                    let closestDiff = Infinity;
                    for (let i = 0; i < points.length; i++) {
                        const ang = points[i].angle;
                        let diff = Math.abs(ang - labelAngle);
                        if (diff > Math.PI) diff = Math.PI * 2 - diff;
                        if (diff < closestDiff) {
                            closestDiff = diff;
                            closestIdx = i;
                        }
                    }
                    const pt = points[closestIdx];
                    labelRadius = Math.sqrt(
                        Math.pow(pt.x - cx, 2) + Math.pow(pt.y - cy, 2)
                    );
                }
                const labelX = cx + Math.cos(labelAngle) * labelRadius * 0.8;
                const labelY = cy + Math.sin(labelAngle) * labelRadius * 0.8;
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
        drawMap: drawMap,
        drawOneExplosionZones: drawOneExplosionZones,
        drawAllOverlapHighlights: drawAllOverlapHighlights,
        drawPolygonPathFromPoints: drawPolygonPathFromPoints,
        getZoneColors: getZoneColors,
        getZoneDefs: getZoneDefs,
        getOverlayHatchColors: getOverlayHatchColors
    };

})(window);
