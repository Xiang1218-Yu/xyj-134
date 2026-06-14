(function () {
    'use strict';

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

    function init() {
        const elements = window.UI.getControlElements();
        const dataElements = window.DataDisplay.getElements();

        window.Renderer.setupCanvas(mapCanvas, effectCanvas, mapCtx, effectCtx, mapWrapper, state);
        window.UI.setupEventListeners(elements, dataElements, state, mapCanvas, mapCtx, effectCtx, mapWrapper, flashOverlay, mapHint);
        window.UI.updateCalculations(state);
        window.DataDisplay.updateDataDisplay(dataElements, state);

        const rect = mapWrapper.getBoundingClientRect();
        state.explosionCenter = {
            x: rect.width / 2,
            y: rect.height / 2
        };
        mapHint.classList.add('hidden');
        window.UI.updateCalculations(state);
        window.DataDisplay.updateDataDisplay(dataElements, state);
        window.Renderer.drawMap(mapCtx, mapWrapper, state);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
