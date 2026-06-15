(function () {
    'use strict';

    let explosionIdCounter = 0;

    function createExplosion(defaults) {
        explosionIdCounter++;
        return Object.assign({
            id: explosionIdCounter,
            bombType: 'castle_bravo',
            yieldKilotons: 15000,
            burstHeight: 1000,
            explosionCenter: null,
            radii: null
        }, defaults || {});
    }

    const state = {
        explosions: [],
        selectedExplosionId: null,
        viewMode: 'combined',
        scale: 20,
        showLabels: true,
        showLegend: true,
        isAnimating: false,
        animationId: null,
        cities: []
    };

    function getSelectedExplosion() {
        if (!state.selectedExplosionId) return null;
        return state.explosions.find(function (e) { return e.id === state.selectedExplosionId; }) || null;
    }

    function getExplosionById(id) {
        return state.explosions.find(function (e) { return e.id === id; }) || null;
    }

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

        const rect = mapWrapper.getBoundingClientRect();
        const firstExplosion = createExplosion({
            explosionCenter: {
                x: rect.width / 2,
                y: rect.height / 2
            }
        });
        firstExplosion.radii = window.Physics.calculateRadii(firstExplosion.yieldKilotons, firstExplosion.burstHeight);
        state.explosions.push(firstExplosion);
        state.selectedExplosionId = firstExplosion.id;

        mapHint.classList.add('hidden');

        window.UI.refreshExplosionList(state, elements);
        window.UI.syncControlsFromSelected(state, elements);
        window.UI.updateAllCalculations(state);
        window.DataDisplay.updateDataDisplay(dataElements, state);
        window.Renderer.drawMap(mapCtx, mapWrapper, state);
    }

    window.App = {
        createExplosion: createExplosion,
        getSelectedExplosion: getSelectedExplosion,
        getExplosionById: getExplosionById,
        get state() { return state; }
    };

    document.addEventListener('DOMContentLoaded', init);
})();
