(function (global) {
    'use strict';

    const BOMB_TYPES = global.Physics.BOMB_TYPES;

    const controlElementIds = [
        'bombType', 'yieldSlider', 'yieldValue', 'burstHeight',
        'scaleSlider', 'scaleValue', 'showLabels', 'showLegend',
        'legend', 'detonateBtn', 'resetBtn'
    ];

    function getControlElements() {
        const elements = {};
        controlElementIds.forEach(function (id) {
            elements[id] = document.getElementById(id);
        });
        return elements;
    }

    function updateCalculations(state) {
        state.radii = global.Physics.calculateRadii(state.yieldKilotons, state.burstHeight);
    }

    function handleCanvasClick(e, mapCanvas, state, mapHint, dataElements, mapCtx, mapWrapper) {
        if (state.isAnimating) return;

        const rect = mapCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        state.explosionCenter = { x: x, y: y };

        mapHint.classList.add('hidden');
        updateCalculations(state);
        global.DataDisplay.updateDataDisplay(dataElements, state);
        global.Renderer.drawMap(mapCtx, mapWrapper, state);
    }

    function setupEventListeners(elements, dataElements, state, mapCanvas, mapCtx, effectCtx, mapWrapper, flashOverlay, mapHint) {
        elements.bombType.addEventListener('change', function (e) {
            state.bombType = e.target.value;
            if (state.bombType !== 'custom') {
                const bomb = BOMB_TYPES[state.bombType];
                state.yieldKilotons = bomb.yield;
                elements.yieldSlider.value = bomb.yield;
                elements.yieldValue.textContent = bomb.yield.toLocaleString();
            }
            updateCalculations(state);
            global.DataDisplay.updateDataDisplay(dataElements, state);
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
        });

        elements.yieldSlider.addEventListener('input', function (e) {
            state.yieldKilotons = parseInt(e.target.value, 10);
            elements.yieldValue.textContent = state.yieldKilotons.toLocaleString();
            elements.bombType.value = 'custom';
            state.bombType = 'custom';
            updateCalculations(state);
            global.DataDisplay.updateDataDisplay(dataElements, state);
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
        });

        elements.burstHeight.addEventListener('change', function (e) {
            state.burstHeight = parseInt(e.target.value, 10);
            updateCalculations(state);
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

        elements.detonateBtn.addEventListener('click', function () {
            if (!state.explosionCenter) {
                alert('请先点击地图选择爆炸位置');
                return;
            }
            global.Animation.animateExplosion(effectCtx, null, mapWrapper, state, elements, flashOverlay);
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

            updateCalculations(state);
            global.DataDisplay.updateDataDisplay(dataElements, state);
            global.Renderer.drawMap(mapCtx, mapWrapper, state);
        });

        mapCanvas.addEventListener('click', function (e) {
            handleCanvasClick(e, mapCanvas, state, mapHint, dataElements, mapCtx, mapWrapper);
        });

        let resizeTimeout;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function () {
                global.Renderer.setupCanvas(mapCanvas, null, mapCtx, effectCtx, mapWrapper, state);
                if (state.explosionCenter) {
                    updateCalculations(state);
                    global.DataDisplay.updateDataDisplay(dataElements, state);
                    global.Renderer.drawMap(mapCtx, mapWrapper, state);
                }
            }, 200);
        });
    }

    global.UI = {
        getControlElements: getControlElements,
        setupEventListeners: setupEventListeners,
        updateCalculations: updateCalculations,
        handleCanvasClick: handleCanvasClick
    };

})(window);
