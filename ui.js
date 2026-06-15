(function (global) {
    'use strict';

    const BOMB_TYPES = global.Physics.BOMB_TYPES;

    const controlElementIds = [
        'bombType', 'yieldSlider', 'yieldValue', 'burstHeight',
        'scaleSlider', 'scaleValue', 'showLabels', 'showLegend',
        'legend', 'detonateBtn', 'resetBtn',
        'explosionList', 'addExplosionBtn', 'removeExplosionBtn',
        'explosionCount', 'paramTarget',
        'statExplosionCount', 'statCombinedArea', 'statTotalArea', 'statOverlapArea'
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
        global.Animation.animateExplosion(effectCtx, effectCanvas, mapWrapper, state, elements, flashOverlay);
    }

    function resetAll(state, elements, dataElements, effectCtx, mapWrapper, flashOverlay, mapHint, mapCtx) {
        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
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

    function setupEventListeners(elements, dataElements, state, mapCanvas, mapCtx, effectCtx, mapWrapper, flashOverlay, mapHint) {
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
            triggerDetonate(state, elements, effectCtx, null, mapWrapper, flashOverlay);
        });

        elements.resetBtn.addEventListener('click', function () {
            resetAll(state, elements, dataElements, effectCtx, mapWrapper, flashOverlay, mapHint, mapCtx);
        });

        mapCanvas.addEventListener('click', function (e) {
            handleCanvasClick(e, mapCanvas, state, mapHint, dataElements, mapCtx, mapWrapper, elements);
        });

        let resizeTimeout;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function () {
                global.Renderer.setupCanvas(mapCanvas, null, mapCtx, effectCtx, mapWrapper, state);
                updateAllCalculations(state);
                global.DataDisplay.updateDataDisplay(dataElements, state);
                global.Renderer.drawMap(mapCtx, mapWrapper, state);
            }, 200);
        });
    }

    global.UI = {
        getControlElements: getControlElements,
        setupEventListeners: setupEventListeners,
        updateCalculations: updateCalculationsForExplosion,
        updateAllCalculations: updateAllCalculations,
        handleCanvasClick: handleCanvasClick,
        refreshExplosionList: refreshExplosionList,
        syncControlsFromSelected: syncControlsFromSelected
    };

})(window);
