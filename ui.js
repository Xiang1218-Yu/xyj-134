(function (global) {
    'use strict';

    const BOMB_TYPES = global.Physics.BOMB_TYPES;

    const controlElementIds = [
        'bombType', 'yieldSlider', 'yieldValue', 'burstHeight',
        'scaleSlider', 'scaleValue', 'showLabels', 'showLegend',
        'legend', 'detonateBtn', 'resetBtn',
        'explosionList', 'addExplosionBtn', 'removeExplosionBtn',
        'explosionCount', 'paramTarget',
        'statExplosionCount', 'statCombinedArea', 'statTotalArea', 'statOverlapArea',
        'terrainEnabled', 'terrainPreset', 'terrainIntensity', 'terrainIntensityValue',
        'showTerrainHeatmap', 'showTerrainContours', 'regenerateTerrainBtn',
        'mountainCount', 'hillCount', 'basinCount', 'maxElevation',
        'evacuationEnabled', 'shelterCount', 'warningTimeSlider', 'warningTimeValue',
        'roadCapacity', 'vehicleSpeed', 'recalcEvacBtn', 'addShelterBtn',
        'evacStartBtn', 'evacPauseBtn', 'evacResetBtn', 'evacSpeed',
        'evacTotalPop', 'evacEvacuated', 'evacStranded', 'evacRate',
        'evacProgress', 'evacProgressFill', 'evacTime', 'evacWarningTime',
        'evacModeBadge', 'evacuationPanel',
        'buildingTotalPop', 'buildingDestroyedPop', 'buildingAvgStrength',
        'buildingSurvivalRate', 'maxOverpressure', 'overpressureBar',
        'buildingTypeList', 'damageBarChart', 'damageStatsList',
        'buildingCitySelect', 'buildingSummaryView', 'buildingByTypeView', 'buildingByDamageView',
        'buildingPanel',
        'addZoneBtn', 'resetZonesBtn', 'zoneList',
        'zoneEditorModal', 'zoneEditorOverlay', 'zoneEditorClose',
        'zoneEditorCancel', 'zoneEditorSave', 'zoneEditorTitle',
        'zoneKey', 'zoneLabel', 'zoneColor', 'zoneColorText',
        'zoneDescription', 'zoneMinRadius', 'zoneRadiusFormula',
        'zoneHeightFactor', 'zoneDash', 'zoneOverpressure',
        'zoneAltitudeSens', 'zoneAltitudeSensValue',
        'zoneDestroyed', 'zoneDeathRate', 'zoneDeathRateValue',
        'zoneInjuryRate', 'zoneInjuryRateValue'
    ];

    function getControlElements() {
        const elements = {};
        controlElementIds.forEach(function (id) {
            elements[id] = document.getElementById(id);
        });
        return elements;
    }

    function getSelectedExplosion(state) {
        if (!state.selectedExplosionId) return null;
        return state.explosions.find(function (e) { return e.id === state.selectedExplosionId; }) || null;
    }

    function updateCalculationsForExplosion(explosion) {
        if (!explosion) return;
        explosion.radii = global.Physics.calculateRadii(explosion.yieldKilotons, explosion.burstHeight);
    }

    function updateAllCalculations(state) {
        state.explosions.forEach(updateCalculationsForExplosion);
    }

    function getBombTypeName(bombType, yieldKilotons) {
        if (bombType === 'custom') return '自定义 ' + yieldKilotons.toLocaleString() + 'kt';
        const bomb = BOMB_TYPES[bombType];
        return bomb ? bomb.name : '自定义';
    }

    function refreshExplosionList(state, elements) {
        const list = elements.explosionList;
        list.innerHTML = '';

        if (state.explosions.length === 0) {
            const tip = document.createElement('div');
            tip.className = 'empty-list-tip';
            tip.textContent = '点击「添加爆炸点」开始';
            list.appendChild(tip);
        } else {
            state.explosions.forEach(function (exp, index) {
                const item = document.createElement('div');
                item.className = 'explosion-item' + (exp.id === state.selectedExplosionId ? ' active' : '');
                item.dataset.id = exp.id;

                const left = document.createElement('div');
                left.className = 'explosion-item-left';

                const num = document.createElement('div');
                num.className = 'explosion-number';
                num.textContent = String(index + 1);

                const meta = document.createElement('div');
                meta.className = 'explosion-meta';
                const title = document.createElement('div');
                title.className = 'explosion-title';
                title.textContent = '爆炸点 #' + (index + 1);
                const sub = document.createElement('div');
                sub.className = 'explosion-sub';
                sub.textContent = getBombTypeName(exp.bombType, exp.yieldKilotons) + ' · ' + exp.burstHeight + 'm';
                meta.appendChild(title);
                meta.appendChild(sub);

                left.appendChild(num);
                left.appendChild(meta);

                const indicator = document.createElement('div');
                indicator.className = 'explosion-position-indicator ' + (exp.explosionCenter ? 'set' : 'unset');
                indicator.title = exp.explosionCenter ? '位置已设置' : '位置未设置';

                item.appendChild(left);
                item.appendChild(indicator);

                item.addEventListener('click', function () {
                    selectExplosion(state, exp.id, elements);
                });

                list.appendChild(item);
            });
        }

        elements.explosionCount.textContent = state.explosions.length;
        updateParamTargetLabel(state, elements);
    }

    function updateParamTargetLabel(state, elements) {
        const index = state.explosions.findIndex(function (e) { return e.id === state.selectedExplosionId; });
        if (index >= 0) {
            elements.paramTarget.textContent = '（爆炸点 #' + (index + 1) + '）';
        } else {
            elements.paramTarget.textContent = '（无选中）';
        }
    }

    function syncControlsFromSelected(state, elements) {
        const selected = getSelectedExplosion(state);
        if (!selected) return;

        elements.bombType.value = selected.bombType;
        elements.yieldSlider.value = selected.yieldKilotons;
        elements.yieldValue.textContent = selected.yieldKilotons.toLocaleString();
        elements.burstHeight.value = String(selected.burstHeight);
    }

    function syncTerrainControlsFromState(state, elements) {
        if (elements.terrainEnabled) elements.terrainEnabled.checked = state.terrainEnabled;
        if (elements.terrainPreset) elements.terrainPreset.value = state.terrainPreset;
        if (elements.terrainIntensity) elements.terrainIntensity.value = String(state.terrainIntensity);
        if (elements.terrainIntensityValue) elements.terrainIntensityValue.textContent = state.terrainIntensity.toFixed(1);
        if (elements.showTerrainHeatmap) elements.showTerrainHeatmap.checked = state.showTerrainHeatmap;
        if (elements.showTerrainContours) elements.showTerrainContours.checked = state.showTerrainContours;
        updateTerrainInfo(state, elements);
    }

    function syncStateFromTerrainControls(state, elements) {
        if (elements.terrainEnabled) state.terrainEnabled = elements.terrainEnabled.checked;
        if (elements.terrainPreset) state.terrainPreset = elements.terrainPreset.value;
        if (elements.terrainIntensity) state.terrainIntensity = parseFloat(elements.terrainIntensity.value);
        if (elements.showTerrainHeatmap) state.showTerrainHeatmap = elements.showTerrainHeatmap.checked;
        if (elements.showTerrainContours) state.showTerrainContours = elements.showTerrainContours.checked;
    }

    function updateTerrainInfo(state, elements) {
        if (!state.terrainData || !state.terrainData.features) {
            if (elements.mountainCount) elements.mountainCount.textContent = '0';
            if (elements.hillCount) elements.hillCount.textContent = '0';
            if (elements.basinCount) elements.basinCount.textContent = '0';
            if (elements.maxElevation) elements.maxElevation.textContent = '0';
            return;
        }

        const FEATURE_TYPES = global.Physics.TERRAIN_FEATURE_TYPES;
        let mountainCount = 0, hillCount = 0, basinCount = 0, maxElev = 0;

        state.terrainData.features.forEach(function (f) {
            if (f.type === FEATURE_TYPES.MOUNTAIN) mountainCount++;
            else if (f.type === FEATURE_TYPES.HILL) hillCount++;
            else if (f.type === FEATURE_TYPES.BASIN) basinCount++;
            if (f.heightPx > maxElev) maxElev = f.heightPx;
        });

        if (elements.mountainCount) elements.mountainCount.textContent = mountainCount;
        if (elements.hillCount) elements.hillCount.textContent = hillCount;
        if (elements.basinCount) elements.basinCount.textContent = basinCount;
        if (elements.maxElevation) elements.maxElevation.textContent = Math.round(maxElev).toLocaleString();
    }

    function regenerateTerrain(state, elements, mapCtx, mapWrapper, dataElements, forceNewSeed) {
        if (forceNewSeed) {
            state.terrainSeed = Math.floor(Math.random() * 100000);
        }
        global.App.regenerateTerrain();
        updateTerrainInfo(state, elements);
        global.DataDisplay.updateDataDisplay(dataElements, state);
        global.Renderer.drawMap(mapCtx, mapWrapper, state);
    }

    function syncSelectedFromControls(state, elements) {
        const selected = getSelectedExplosion(state);
        if (!selected) return;

        selected.bombType = elements.bombType.value;
        selected.yieldKilotons = parseInt(elements.yieldSlider.value, 10);
        selected.burstHeight = parseInt(elements.burstHeight.value, 10);
    }

    function selectExplosion(state, id, elements) {
        state.selectedExplosionId = id;
        syncControlsFromSelected(state, elements);
        refreshExplosionList(state, elements);
    }

    function addExplosion(state, elements, mapWrapper, position) {
        const rect = mapWrapper.getBoundingClientRect();
        let center;
        if (position) {
            center = position;
        } else {
            center = {
                x: rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.4,
                y: rect.height / 2 + (Math.random() - 0.5) * rect.height * 0.4
            };
        }
        const newExp = global.App.createExplosion({
            explosionCenter: center
        });
        updateCalculationsForExplosion(newExp);
        state.explosions.push(newExp);
        state.selectedExplosionId = newExp.id;
        syncControlsFromSelected(state, elements);
        refreshExplosionList(state, elements);
        return newExp;
    }

    function findNearestExplosion(x, y, state, thresholdPx) {
        let nearest = null;
        let nearestDist = Infinity;
        state.explosions.forEach(function (exp) {
            if (!exp.explosionCenter) return;
            const dx = x - exp.explosionCenter.x;
            const dy = y - exp.explosionCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < thresholdPx && dist < nearestDist) {
                nearestDist = dist;
                nearest = exp;
            }
        });
        return nearest;
    }

    function removeSelectedExplosion(state, elements) {
        if (state.explosions.length <= 1) {
            alert('至少需要保留 1 个爆炸点');
            return;
        }
        const index = state.explosions.findIndex(function (e) { return e.id === state.selectedExplosionId; });
        if (index < 0) return;

        state.explosions.splice(index, 1);
        const newSelected = state.explosions[Math.max(0, index - 1)];
        state.selectedExplosionId = newSelected ? newSelected.id : null;
        syncControlsFromSelected(state, elements);
        refreshExplosionList(state, elements);
    }

    function handleCanvasClick(e, mapCanvas, state, mapHint, dataElements, mapCtx, mapWrapper, elements) {
        if (state.isAnimating) return;

        const rect = mapCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (e.shiftKey) {
            const newExp = addExplosion(state, elements, mapWrapper, { x: x, y: y });
            mapHint.classList.add('hidden');
            global.DataDisplay.updateDataDisplay(dataElements, state);
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
            return;
        }

        const SELECT_THRESHOLD = 24;
        const nearest = findNearestExplosion(x, y, state, SELECT_THRESHOLD);
        if (nearest) {
            selectExplosion(state, nearest.id, elements);
        } else {
            const selected = getSelectedExplosion(state);
            if (!selected) {
                const firstWithPos = state.explosions.find(function (e) { return e.explosionCenter; });
                if (firstWithPos) {
                    selectExplosion(state, firstWithPos.id, elements);
                } else {
                    alert('请先选中一个爆炸点');
                    return;
                }
            }
            const currentSelected = getSelectedExplosion(state);
            currentSelected.explosionCenter = { x: x, y: y };
            mapHint.classList.add('hidden');
            updateCalculationsForExplosion(currentSelected);
            refreshExplosionList(state, elements);
        }

        global.DataDisplay.updateDataDisplay(dataElements, state);
        global.Renderer.drawMap(mapCtx, mapWrapper, state);
    }

    function triggerDetonate(state, elements, effectCtx, effectCanvas, mapWrapper, flashOverlay) {
        const positionedExplosions = state.explosions.filter(function (e) { return e.explosionCenter; });
        if (positionedExplosions.length === 0) {
            alert('请至少为一个爆炸点设置位置');
            return;
        }

        if (global.Timeline && global.Timeline.isActive()) {
            global.Timeline.stop();
        }

        global.Animation.animateExplosion(effectCtx, effectCanvas, mapWrapper, state, elements, flashOverlay);
    }

    function resetAll(state, elements, dataElements, effectCtx, mapWrapper, flashOverlay, mapHint, mapCtx) {
        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
        }

        if (global.Timeline && global.Timeline.isActive()) {
            global.Timeline.stop();
        }

        state.isAnimating = false;
        state.animationId = null;
        state.explosions = [];
        state.selectedExplosionId = null;

        elements.detonateBtn.disabled = false;
        flashOverlay.classList.remove('active');
        mapHint.classList.remove('hidden');

        const rect = mapWrapper.getBoundingClientRect();
        effectCtx.clearRect(0, 0, rect.width, rect.height);

        state.cities.forEach(function (city) { city.destroyed = false; });

        state.terrainSeed = Math.floor(Math.random() * 100000);
        syncStateFromTerrainControls(state, elements);
        global.App.regenerateTerrain();
        updateTerrainInfo(state, elements);

        const firstExp = global.App.createExplosion({
            explosionCenter: {
                x: rect.width / 2,
                y: rect.height / 2
            }
        });
        updateCalculationsForExplosion(firstExp);
        state.explosions.push(firstExp);
        state.selectedExplosionId = firstExp.id;

        mapHint.classList.add('hidden');
        syncControlsFromSelected(state, elements);
        syncTerrainControlsFromState(state, elements);
        refreshExplosionList(state, elements);
        updateAllCalculations(state);
        global.DataDisplay.updateDataDisplay(dataElements, state);
        global.Renderer.drawMap(mapCtx, mapWrapper, state);
    }

    function handleViewToggle(view, state, elements, dataElements) {
        state.viewMode = view;
        document.querySelectorAll('.toggle-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        const combinedStats = document.getElementById('combinedStats');
        if (combinedStats) {
            combinedStats.style.display = view === 'combined' ? 'block' : 'none';
        }
        global.DataDisplay.updateDataDisplay(dataElements, state);
    }

    function handleBuildingViewToggle(view, state, elements) {
        state.buildingViewMode = view;
        document.querySelectorAll('.building-toggle-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.buildingView === view);
        });

        if (elements.buildingSummaryView) {
            elements.buildingSummaryView.style.display = view === 'summary' ? 'block' : 'none';
        }
        if (elements.buildingByTypeView) {
            elements.buildingByTypeView.style.display = view === 'byType' ? 'block' : 'none';
        }
        if (elements.buildingByDamageView) {
            elements.buildingByDamageView.style.display = view === 'byDamage' ? 'block' : 'none';
        }
    }

    function recalculateEvacuation(state, elements, mapCtx, mapWrapper) {
        if (!state.evacuationEnabled || !state.shelters || state.shelters.length === 0) {
            state.evacuationPlan = null;
            return;
        }

        const roads = global.Physics.generateRoadNetwork(
            mapWrapper.clientWidth,
            mapWrapper.clientHeight,
            state.cities,
            state.shelters
        );
        state.evacuationRoads = roads;

        const capacityMultiplier = parseFloat(elements.roadCapacity ? elements.roadCapacity.value : 1);
        const adjustedRoads = roads.map(function (road) {
            return {
                ...road,
                capacity: road.capacity * capacityMultiplier
            };
        });

        const warningTime = parseInt(elements.warningTimeSlider ? elements.warningTimeSlider.value : 30, 10);

        const originalSpeed = global.Physics.VEHICLE_SPEED_KMH;
        const customSpeed = parseInt(elements.vehicleSpeed ? elements.vehicleSpeed.value : 60, 10);
        global.Physics.VEHICLE_SPEED_KMH = customSpeed;

        state.evacuationPlan = global.Physics.calculateEvacuationPlan(
            state.cities,
            state.shelters,
            adjustedRoads,
            state.scale,
            warningTime
        );

        global.Physics.VEHICLE_SPEED_KMH = originalSpeed;

        updateEvacuationDisplay(state, elements);
    }

    function updateEvacuationDisplay(state, elements) {
        const plan = state.evacuationPlan;
        if (!plan) {
            if (elements.evacTotalPop) elements.evacTotalPop.textContent = '0';
            if (elements.evacEvacuated) elements.evacEvacuated.textContent = '0';
            if (elements.evacStranded) elements.evacStranded.textContent = '0';
            if (elements.evacRate) elements.evacRate.textContent = '0%';
            if (elements.evacProgress) elements.evacProgress.textContent = '0%';
            if (elements.evacProgressFill) elements.evacProgressFill.style.width = '0%';
            if (elements.evacTime) elements.evacTime.textContent = '0.0 小时';
            return;
        }

        if (elements.evacTotalPop) {
            elements.evacTotalPop.textContent = formatNumberShort(plan.totalPopulation);
        }
        if (elements.evacEvacuated) {
            elements.evacEvacuated.textContent = formatNumberShort(plan.totalEvacuated);
        }
        if (elements.evacStranded) {
            elements.evacStranded.textContent = formatNumberShort(plan.totalStranded);
        }
        if (elements.evacRate) {
            const rate = plan.evacuationRate * 100;
            if (rate < 0.1) {
                elements.evacRate.textContent = '<0.1%';
            } else if (rate < 1) {
                elements.evacRate.textContent = rate.toFixed(1) + '%';
            } else {
                elements.evacRate.textContent = Math.round(rate) + '%';
            }
        }

        const warningTime = parseInt(elements.warningTimeSlider ? elements.warningTimeSlider.value : 30, 10);
        if (elements.evacWarningTime) {
            elements.evacWarningTime.textContent = warningTime + ' 分钟';
        }
    }

    function formatNumberShort(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return Math.round(num).toString();
    }

    function findNearestShelter(x, y, state, threshold) {
        if (!state.shelters) return null;
        let nearest = null;
        let minDist = Infinity;
        state.shelters.forEach(function (shelter, idx) {
            const dx = x - shelter.x;
            const dy = y - shelter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < threshold && dist < minDist) {
                minDist = dist;
                nearest = { shelter: shelter, index: idx };
            }
        });
        return nearest;
    }

    function handleEvacCanvasClick(e, mapCanvas, state, mapCtx, mapWrapper, elements) {
        if (!state.evacuationEnabled) return;

        const rect = mapCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const SHELTER_THRESHOLD = 30;
        const nearest = findNearestShelter(x, y, state, SHELTER_THRESHOLD);

        if (nearest) {
            state.selectedShelterIndex = nearest.index;
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
            return;
        }

        if (state.selectedShelterIndex !== undefined && state.selectedShelterIndex !== null) {
            const shelter = state.shelters[state.selectedShelterIndex];
            if (shelter) {
                shelter.x = x;
                shelter.y = y;
                recalculateEvacuation(state, elements, mapCtx, mapWrapper);
                global.Renderer.drawMap(mapCtx, mapWrapper, state);
            }
        }
    }

    function addShelter(state, elements, mapCtx, mapWrapper) {
        const rect = mapWrapper.getBoundingClientRect();
        const count = state.shelters ? state.shelters.length : 0;
        const angle = count * Math.PI * 0.5 + Math.random() * 0.5;
        const dist = Math.min(rect.width, rect.height) * (0.2 + Math.random() * 0.2);

        const newShelter = {
            id: count,
            x: rect.width / 2 + Math.cos(angle) * dist,
            y: rect.height / 2 + Math.sin(angle) * dist,
            capacity: 500000 + Math.floor(Math.random() * 500000),
            name: '避难所 #' + (count + 1)
        };

        if (!state.shelters) state.shelters = [];
        state.shelters.push(newShelter);
        state.selectedShelterIndex = state.shelters.length - 1;

        if (elements.shelterCount) {
            elements.shelterCount.value = String(state.shelters.length);
        }

        recalculateEvacuation(state, elements, mapCtx, mapWrapper);
        global.Renderer.drawMap(mapCtx, mapWrapper, state);
    }

    function updateShelterCount(state, elements, mapCtx, mapWrapper) {
        const count = parseInt(elements.shelterCount.value, 10);
        const rect = mapWrapper.getBoundingClientRect();

        if (!state.shelters || state.shelters.length !== count) {
            state.shelters = global.Physics.generateShelters(
                rect.width, rect.height, count
            );
            state.selectedShelterIndex = null;
            recalculateEvacuation(state, elements, mapCtx, mapWrapper);
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
        }
    }

    function startEvacAnimation(state, elements, effectCtx, effectCanvas) {
        if (!state.evacuationPlan) return;

        if (global.Evacuation.isEvacuating()) {
            global.Evacuation.stopEvacuationAnimation();
        }

        if (elements.evacStartBtn) {
            elements.evacStartBtn.disabled = true;
            elements.evacStartBtn.textContent = '▶ 播放中...';
        }
        if (elements.evacPauseBtn) {
            elements.evacPauseBtn.disabled = false;
        }
        if (elements.evacModeBadge) {
            elements.evacModeBadge.textContent = '播放中';
            elements.evacModeBadge.classList.add('playing');
        }

        const speed = parseFloat(elements.evacSpeed ? elements.evacSpeed.value : 1);
        global.Evacuation.setSpeed(speed);

        global.Evacuation.startEvacuationAnimation(
            effectCtx,
            effectCanvas,
            state,
            elements,
            state.evacuationPlan
        );
    }

    function pauseEvacAnimation(elements) {
        if (global.Evacuation.isEvacuating()) {
            global.Evacuation.stopEvacuationAnimation();
        }
        if (elements.evacStartBtn) {
            elements.evacStartBtn.disabled = false;
            elements.evacStartBtn.textContent = '▶ 继续播放';
        }
        if (elements.evacPauseBtn) {
            elements.evacPauseBtn.disabled = true;
        }
        if (elements.evacModeBadge) {
            elements.evacModeBadge.textContent = '已暂停';
            elements.evacModeBadge.classList.remove('playing');
        }
    }

    function resetEvacAnimation(state, elements, effectCtx, effectCanvas) {
        global.Evacuation.resetEvacuationAnimation(
            effectCtx,
            effectCanvas,
            state,
            state.evacuationPlan
        );
        if (elements.evacStartBtn) {
            elements.evacStartBtn.disabled = false;
            elements.evacStartBtn.textContent = '▶ 播放动画';
        }
        if (elements.evacPauseBtn) {
            elements.evacPauseBtn.disabled = true;
        }
        if (elements.evacModeBadge) {
            elements.evacModeBadge.textContent = '就绪';
            elements.evacModeBadge.classList.remove('playing');
        }
        if (elements.evacProgress) {
            elements.evacProgress.textContent = '0%';
        }
        if (elements.evacProgressFill) {
            elements.evacProgressFill.style.width = '0%';
        }
        if (elements.evacTime) {
            elements.evacTime.textContent = '0.0 小时';
        }
        updateEvacuationDisplay(state, elements);
    }

    function setupEventListeners(elements, dataElements, state, mapCanvas, mapCtx, effectCtx, effectCanvas, mapWrapper, flashOverlay, mapHint) {
        elements.bombType.addEventListener('change', function (e) {
            syncSelectedFromControls(state, elements);
            const selected = getSelectedExplosion(state);
            if (selected && e.target.value !== 'custom') {
                const bomb = BOMB_TYPES[e.target.value];
                if (bomb) {
                    selected.yieldKilotons = bomb.yield;
                    elements.yieldSlider.value = bomb.yield;
                    elements.yieldValue.textContent = bomb.yield.toLocaleString();
                }
            }
            updateCalculationsForExplosion(getSelectedExplosion(state));
            refreshExplosionList(state, elements);
            global.DataDisplay.updateDataDisplay(dataElements, state);
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
        });

        elements.yieldSlider.addEventListener('input', function (e) {
            syncSelectedFromControls(state, elements);
            elements.bombType.value = 'custom';
            const selected = getSelectedExplosion(state);
            if (selected) selected.bombType = 'custom';
            updateCalculationsForExplosion(getSelectedExplosion(state));
            refreshExplosionList(state, elements);
            global.DataDisplay.updateDataDisplay(dataElements, state);
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
        });

        elements.burstHeight.addEventListener('change', function () {
            syncSelectedFromControls(state, elements);
            updateCalculationsForExplosion(getSelectedExplosion(state));
            refreshExplosionList(state, elements);
            global.DataDisplay.updateDataDisplay(dataElements, state);
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
        });

        elements.scaleSlider.addEventListener('input', function (e) {
            state.scale = parseInt(e.target.value, 10);
            elements.scaleValue.textContent = state.scale;
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
        });

        elements.showLabels.addEventListener('change', function (e) {
            state.showLabels = e.target.checked;
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
        });

        elements.showLegend.addEventListener('change', function (e) {
            state.showLegend = e.target.checked;
            elements.legend.classList.toggle('hidden', !e.target.checked);
        });

        elements.addExplosionBtn.addEventListener('click', function () {
            if (state.isAnimating) return;
            addExplosion(state, elements, mapWrapper);
            global.DataDisplay.updateDataDisplay(dataElements, state);
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
        });

        elements.removeExplosionBtn.addEventListener('click', function () {
            if (state.isAnimating) return;
            removeSelectedExplosion(state, elements);
            global.DataDisplay.updateDataDisplay(dataElements, state);
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
        });

        document.querySelectorAll('.toggle-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                handleViewToggle(btn.dataset.view, state, elements, dataElements);
            });
        });

        elements.detonateBtn.addEventListener('click', function () {
            triggerDetonate(state, elements, effectCtx, effectCanvas, mapWrapper, flashOverlay);
        });

        elements.resetBtn.addEventListener('click', function () {
            resetAll(state, elements, dataElements, effectCtx, mapWrapper, flashOverlay, mapHint, mapCtx);
        });

        if (elements.terrainEnabled) {
            elements.terrainEnabled.addEventListener('change', function (e) {
                state.terrainEnabled = e.target.checked;
                regenerateTerrain(state, elements, mapCtx, mapWrapper, dataElements, false);
            });
        }

        if (elements.terrainPreset) {
            elements.terrainPreset.addEventListener('change', function (e) {
                state.terrainPreset = e.target.value;
                regenerateTerrain(state, elements, mapCtx, mapWrapper, dataElements, false);
            });
        }

        if (elements.terrainIntensity) {
            elements.terrainIntensity.addEventListener('input', function (e) {
                state.terrainIntensity = parseFloat(e.target.value);
                if (elements.terrainIntensityValue) {
                    elements.terrainIntensityValue.textContent = state.terrainIntensity.toFixed(1);
                }
                regenerateTerrain(state, elements, mapCtx, mapWrapper, dataElements, false);
            });
        }

        if (elements.showTerrainHeatmap) {
            elements.showTerrainHeatmap.addEventListener('change', function (e) {
                state.showTerrainHeatmap = e.target.checked;
                global.Renderer.drawMap(mapCtx, mapWrapper, state);
            });
        }

        if (elements.showTerrainContours) {
            elements.showTerrainContours.addEventListener('change', function (e) {
                state.showTerrainContours = e.target.checked;
                global.Renderer.drawMap(mapCtx, mapWrapper, state);
            });
        }

        if (elements.regenerateTerrainBtn) {
            elements.regenerateTerrainBtn.addEventListener('click', function () {
                regenerateTerrain(state, elements, mapCtx, mapWrapper, dataElements, true);
            });
        }

        if (elements.evacuationEnabled) {
            elements.evacuationEnabled.addEventListener('change', function (e) {
                state.evacuationEnabled = e.target.checked;
                if (state.evacuationEnabled && state.shelters && state.shelters.length > 0) {
                    recalculateEvacuation(state, elements, mapCtx, mapWrapper);
                }
                if (elements.evacuationPanel) {
                    elements.evacuationPanel.classList.toggle('hidden', !e.target.checked);
                }
                global.Renderer.drawMap(mapCtx, mapWrapper, state);
            });
        }

        if (elements.shelterCount) {
            elements.shelterCount.addEventListener('change', function () {
                updateShelterCount(state, elements, mapCtx, mapWrapper);
            });
        }

        if (elements.warningTimeSlider) {
            elements.warningTimeSlider.addEventListener('input', function (e) {
                const value = parseInt(e.target.value, 10);
                if (elements.warningTimeValue) {
                    elements.warningTimeValue.textContent = value;
                }
            });
            elements.warningTimeSlider.addEventListener('change', function () {
                recalculateEvacuation(state, elements, mapCtx, mapWrapper);
                global.Renderer.drawMap(mapCtx, mapWrapper, state);
                resetEvacAnimation(state, elements, effectCtx, effectCanvas);
            });
        }

        if (elements.roadCapacity) {
            elements.roadCapacity.addEventListener('change', function () {
                recalculateEvacuation(state, elements, mapCtx, mapWrapper);
                global.Renderer.drawMap(mapCtx, mapWrapper, state);
                resetEvacAnimation(state, elements, effectCtx, effectCanvas);
            });
        }

        if (elements.vehicleSpeed) {
            elements.vehicleSpeed.addEventListener('change', function () {
                recalculateEvacuation(state, elements, mapCtx, mapWrapper);
                global.Renderer.drawMap(mapCtx, mapWrapper, state);
                resetEvacAnimation(state, elements, effectCtx, effectCanvas);
            });
        }

        if (elements.recalcEvacBtn) {
            elements.recalcEvacBtn.addEventListener('click', function () {
                recalculateEvacuation(state, elements, mapCtx, mapWrapper);
                global.Renderer.drawMap(mapCtx, mapWrapper, state);
                resetEvacAnimation(state, elements, effectCtx, effectCanvas);
            });
        }

        if (elements.addShelterBtn) {
            elements.addShelterBtn.addEventListener('click', function () {
                addShelter(state, elements, mapCtx, mapWrapper);
                resetEvacAnimation(state, elements, effectCtx, effectCanvas);
            });
        }

        if (elements.evacStartBtn) {
            elements.evacStartBtn.addEventListener('click', function () {
                startEvacAnimation(state, elements, effectCtx, effectCanvas);
            });
        }

        if (elements.evacPauseBtn) {
            elements.evacPauseBtn.addEventListener('click', function () {
                pauseEvacAnimation(elements);
            });
        }

        if (elements.evacResetBtn) {
            elements.evacResetBtn.addEventListener('click', function () {
                resetEvacAnimation(state, elements, effectCtx, effectCanvas);
            });
        }

        if (elements.evacSpeed) {
            elements.evacSpeed.addEventListener('change', function (e) {
                const speed = parseFloat(e.target.value);
                global.Evacuation.setSpeed(speed);
            });
        }

        document.querySelectorAll('.building-toggle-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                handleBuildingViewToggle(btn.dataset.buildingView, state, elements);
            });
        });

        if (elements.buildingCitySelect) {
            elements.buildingCitySelect.addEventListener('change', function () {
                global.DataDisplay.updateBuildingDisplay(elements, state);
            });
        }

        mapCanvas.addEventListener('click', function (e) {
            if (state.evacuationEnabled && state.selectedShelterIndex !== undefined && state.selectedShelterIndex !== null) {
                handleEvacCanvasClick(e, mapCanvas, state, mapCtx, mapWrapper, elements);
                resetEvacAnimation(state, elements, effectCtx, effectCanvas);
            } else {
                handleCanvasClick(e, mapCanvas, state, mapHint, dataElements, mapCtx, mapWrapper, elements);
            }
            global.DataDisplay.updateBuildingDisplay(elements, state);
        });

        let resizeTimeout;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function () {
                global.Renderer.setupCanvas(mapCanvas, null, mapCtx, effectCtx, mapWrapper, state);
                updateAllCalculations(state);
                global.App.regenerateTerrain();
                updateTerrainInfo(state, elements);
                global.DataDisplay.updateDataDisplay(dataElements, state);
                global.Renderer.drawMap(mapCtx, mapWrapper, state);
            }, 200);
        });

        let editingZoneKey = null;
        let draggedZoneIndex = null;

        function rgbToHex(r, g, b) {
            return '#' + [r, g, b].map(function (x) {
                const hex = Math.round(x).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        }

        function refreshZoneList(state, elements, mapCtx, mapWrapper, dataElements) {
            if (!elements.zoneList) return;

            const zones = global.Physics.getZones();
            elements.zoneList.innerHTML = '';

            zones.forEach(function (zone, index) {
                const item = document.createElement('div');
                item.className = 'zone-item';
                item.draggable = true;
                item.dataset.zoneKey = zone.key;
                item.dataset.index = index;

                const color = zone.color || [128, 128, 128];
                const hexColor = rgbToHex(color[0], color[1], color[2]);

                item.innerHTML = `
                    <div class="zone-drag-handle" title="拖动排序">⋮⋮</div>
                    <div class="zone-color-preview" style="background: ${hexColor};"></div>
                    <div class="zone-info">
                        <div class="zone-name">${zone.label}</div>
                        <div class="zone-key">${zone.key} · ${zone.overpressureThreshold} psi</div>
                    </div>
                    <div class="zone-actions">
                        <button class="zone-edit-btn" title="编辑">✏️</button>
                        <button class="zone-delete-btn" title="删除">🗑️</button>
                    </div>
                `;

                item.addEventListener('dragstart', function (e) {
                    draggedZoneIndex = index;
                    item.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                });

                item.addEventListener('dragend', function () {
                    item.classList.remove('dragging');
                    draggedZoneIndex = null;
                    document.querySelectorAll('.zone-item').forEach(function (el) {
                        el.classList.remove('drag-over');
                    });
                });

                item.addEventListener('dragover', function (e) {
                    e.preventDefault();
                    if (draggedZoneIndex !== null && draggedZoneIndex !== index) {
                        item.classList.add('drag-over');
                    }
                });

                item.addEventListener('dragleave', function () {
                    item.classList.remove('drag-over');
                });

                item.addEventListener('drop', function (e) {
                    e.preventDefault();
                    item.classList.remove('drag-over');
                    if (draggedZoneIndex !== null && draggedZoneIndex !== index) {
                        const allZones = global.Physics.getZones();
                        const draggedKey = allZones[draggedZoneIndex].key;
                        global.Physics.moveZone(draggedKey, index);
                        refreshAllZoneRelated(state, elements, mapCtx, mapWrapper, dataElements);
                    }
                });

                const editBtn = item.querySelector('.zone-edit-btn');
                editBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    openZoneEditor(zone, elements);
                });

                const deleteBtn = item.querySelector('.zone-delete-btn');
                deleteBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (zones.length <= 1) {
                        alert('至少需要保留一个圈层！');
                        return;
                    }
                    if (confirm('确定要删除圈层 "' + zone.label + '" 吗？')) {
                        global.Physics.removeZone(zone.key);
                        refreshAllZoneRelated(state, elements, mapCtx, mapWrapper, dataElements);
                    }
                });

                elements.zoneList.appendChild(item);
            });
        }

        function refreshAllZoneRelated(state, elements, mapCtx, mapWrapper, dataElements) {
            updateAllCalculations(state);
            global.DataDisplay.generateDataPanels(dataElements);
            global.DataDisplay.generateLegend(dataElements);
            global.DataDisplay.updateDataDisplay(dataElements, state);
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
            refreshZoneList(state, elements, mapCtx, mapWrapper, dataElements);
        }

        function openZoneEditor(zone, elements) {
            editingZoneKey = zone ? zone.key : null;

            if (zone) {
                elements.zoneEditorTitle.textContent = '编辑圈层: ' + zone.label;
                elements.zoneKey.value = zone.key;
                elements.zoneLabel.value = zone.label;
                const colorHex = rgbToHex(zone.color[0], zone.color[1], zone.color[2]);
                elements.zoneColor.value = colorHex;
                elements.zoneColorText.value = colorHex;
                elements.zoneDescription.value = zone.description || '';
                elements.zoneMinRadius.value = zone.minRadius || 0.5;
                elements.zoneRadiusFormula.value = zone.radiusFormula || '';
                elements.zoneHeightFactor.value = zone.heightFactorType || 'height';
                elements.zoneDash.value = typeof zone.dash === 'string' ? zone.dash : (zone.dash ? 'dashed4' : 'solid');
                elements.zoneOverpressure.value = zone.overpressureThreshold || 5;
                elements.zoneAltitudeSens.value = zone.altitudeSensitivity || 0.3;
                elements.zoneAltitudeSensValue.textContent = (zone.altitudeSensitivity || 0.3).toFixed(2);
                elements.zoneDestroyed.checked = zone.casualtyRates ? zone.casualtyRates.destroyed : false;
                elements.zoneDeathRate.value = zone.casualtyRates ? zone.casualtyRates.deaths : 0.1;
                elements.zoneDeathRateValue.textContent = (zone.casualtyRates ? zone.casualtyRates.deaths : 0.1).toFixed(2);
                elements.zoneInjuryRate.value = zone.casualtyRates ? zone.casualtyRates.injured : 0.2;
                elements.zoneInjuryRateValue.textContent = (zone.casualtyRates ? zone.casualtyRates.injured : 0.2).toFixed(2);
            } else {
                elements.zoneEditorTitle.textContent = '新增圈层';
                elements.zoneKey.value = '';
                elements.zoneLabel.value = '';
                elements.zoneColor.value = '#ff6600';
                elements.zoneColorText.value = '#ff6600';
                elements.zoneDescription.value = '';
                elements.zoneMinRadius.value = 0.5;
                elements.zoneRadiusFormula.value = '1.0 * Math.pow(W, 0.4)';
                elements.zoneHeightFactor.value = 'height';
                elements.zoneDash.value = 'solid';
                elements.zoneOverpressure.value = 5;
                elements.zoneAltitudeSens.value = 0.3;
                elements.zoneAltitudeSensValue.textContent = '0.30';
                elements.zoneDestroyed.checked = false;
                elements.zoneDeathRate.value = 0.1;
                elements.zoneDeathRateValue.textContent = '0.10';
                elements.zoneInjuryRate.value = 0.2;
                elements.zoneInjuryRateValue.textContent = '0.20';
            }

            elements.zoneEditorModal.style.display = 'flex';
        }

        function closeZoneEditor(elements) {
            elements.zoneEditorModal.style.display = 'none';
            editingZoneKey = null;
        }

        function handleZoneSave(state, elements, mapCtx, mapWrapper, dataElements) {
            const key = elements.zoneKey.value.trim();
            const label = elements.zoneLabel.value.trim();

            if (!key || !label) {
                alert('圈层标识和名称不能为空！');
                return;
            }

            if (!/^[a-z_][a-z0-9_]*$/i.test(key)) {
                alert('圈层标识只能包含字母、数字和下划线，且必须以字母或下划线开头！');
                return;
            }

            const colorMatch = elements.zoneColorText.value.match(/^#?([0-9a-f]{6})$/i);
            if (!colorMatch) {
                alert('请输入有效的颜色值（如 #ff0000）！');
                return;
            }

            const colorHex = colorMatch[1];
            const color = [
                parseInt(colorHex.substr(0, 2), 16),
                parseInt(colorHex.substr(2, 2), 16),
                parseInt(colorHex.substr(4, 2), 16)
            ];

            let dashValue = elements.zoneDash.value;
            if (dashValue === 'solid') dashValue = null;

            const zoneDef = {
                key: key,
                label: label,
                color: color,
                description: elements.zoneDescription.value.trim(),
                minRadius: parseFloat(elements.zoneMinRadius.value) || 0.1,
                radiusFormula: elements.zoneRadiusFormula.value.trim(),
                heightFactorType: elements.zoneHeightFactor.value,
                dash: dashValue,
                overpressureThreshold: parseFloat(elements.zoneOverpressure.value) || 0,
                altitudeSensitivity: parseFloat(elements.zoneAltitudeSens.value) || 0,
                casualtyRates: {
                    deaths: parseFloat(elements.zoneDeathRate.value) || 0,
                    injured: parseFloat(elements.zoneInjuryRate.value) || 0,
                    destroyed: elements.zoneDestroyed.checked
                }
            };

            let result;
            if (editingZoneKey) {
                result = global.Physics.updateZone(editingZoneKey, zoneDef);
            } else {
                result = global.Physics.addZone(zoneDef);
            }

            if (result.success) {
                closeZoneEditor(elements);
                refreshAllZoneRelated(state, elements, mapCtx, mapWrapper, dataElements);
            } else {
                alert('保存失败: ' + result.error);
            }
        }

        if (elements.addZoneBtn) {
            elements.addZoneBtn.addEventListener('click', function () {
                openZoneEditor(null, elements);
            });
        }

        if (elements.resetZonesBtn) {
            elements.resetZonesBtn.addEventListener('click', function () {
                if (confirm('确定要恢复所有默认圈层设置吗？当前的自定义修改将丢失。')) {
                    global.Physics.resetZones();
                    refreshAllZoneRelated(state, elements, mapCtx, mapWrapper, dataElements);
                }
            });
        }

        if (elements.zoneEditorClose) {
            elements.zoneEditorClose.addEventListener('click', function () {
                closeZoneEditor(elements);
            });
        }

        if (elements.zoneEditorOverlay) {
            elements.zoneEditorOverlay.addEventListener('click', function () {
                closeZoneEditor(elements);
            });
        }

        if (elements.zoneEditorCancel) {
            elements.zoneEditorCancel.addEventListener('click', function () {
                closeZoneEditor(elements);
            });
        }

        if (elements.zoneEditorSave) {
            elements.zoneEditorSave.addEventListener('click', function () {
                handleZoneSave(state, elements, mapCtx, mapWrapper, dataElements);
            });
        }

        if (elements.zoneColor && elements.zoneColorText) {
            elements.zoneColor.addEventListener('input', function () {
                elements.zoneColorText.value = elements.zoneColor.value;
            });
            elements.zoneColorText.addEventListener('input', function () {
                if (/^#?[0-9a-f]{6}$/i.test(elements.zoneColorText.value)) {
                    elements.zoneColor.value = elements.zoneColorText.value.startsWith('#') 
                        ? elements.zoneColorText.value 
                        : '#' + elements.zoneColorText.value;
                }
            });
        }

        if (elements.zoneAltitudeSens && elements.zoneAltitudeSensValue) {
            elements.zoneAltitudeSens.addEventListener('input', function () {
                elements.zoneAltitudeSensValue.textContent = parseFloat(elements.zoneAltitudeSens.value).toFixed(2);
            });
        }

        if (elements.zoneDeathRate && elements.zoneDeathRateValue) {
            elements.zoneDeathRate.addEventListener('input', function () {
                elements.zoneDeathRateValue.textContent = parseFloat(elements.zoneDeathRate.value).toFixed(2);
            });
        }

        if (elements.zoneInjuryRate && elements.zoneInjuryRateValue) {
            elements.zoneInjuryRate.addEventListener('input', function () {
                elements.zoneInjuryRateValue.textContent = parseFloat(elements.zoneInjuryRate.value).toFixed(2);
            });
        }

        global.DataDisplay.generateDataPanels(dataElements);
        global.DataDisplay.generateLegend(dataElements);
        refreshZoneList(state, elements, mapCtx, mapWrapper, dataElements);
    }

    global.UI = {
        getControlElements: getControlElements,
        setupEventListeners: setupEventListeners,
        updateCalculations: updateCalculationsForExplosion,
        updateAllCalculations: updateAllCalculations,
        handleCanvasClick: handleCanvasClick,
        refreshExplosionList: refreshExplosionList,
        syncControlsFromSelected: syncControlsFromSelected,
        syncTerrainControlsFromState: syncTerrainControlsFromState,
        syncStateFromTerrainControls: syncStateFromTerrainControls,
        updateTerrainInfo: updateTerrainInfo,
        regenerateTerrain: regenerateTerrain,
        recalculateEvacuation: recalculateEvacuation,
        updateEvacuationDisplay: updateEvacuationDisplay,
        addShelter: addShelter,
        updateShelterCount: updateShelterCount,
        startEvacAnimation: startEvacAnimation,
        pauseEvacAnimation: pauseEvacAnimation,
        resetEvacAnimation: resetEvacAnimation,
        handleEvacCanvasClick: handleEvacCanvasClick,
        findNearestShelter: findNearestShelter
    };

})(window);
