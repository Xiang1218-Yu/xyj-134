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
        cities: [],
        terrainEnabled: true,
        terrainPreset: 'mountainous',
        terrainIntensity: 1.0,
        terrainSeed: Math.floor(Math.random() * 100000),
        terrainData: null,
        showTerrainContours: true,
        showTerrainHeatmap: true,
        evacuationEnabled: true,
        shelters: [],
        selectedShelterIndex: null,
        evacuationPlan: null,
        evacuationRoads: []
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

    function regenerateTerrain() {
        const rect = mapWrapper.getBoundingClientRect();
        if (state.terrainEnabled) {
            state.terrainData = window.Physics.generateTerrainFeatures(
                rect.width, rect.height,
                state.terrainPreset,
                state.terrainIntensity,
                state.terrainSeed
            );
        } else {
            state.terrainData = window.Physics.generateTerrainFeatures(
                rect.width, rect.height,
                'flat', 0, state.terrainSeed
            );
        }
    }

    function init() {
        const elements = window.UI.getControlElements();
        const dataElements = window.DataDisplay.getElements();

        window.Renderer.setupCanvas(mapCanvas, effectCanvas, mapCtx, effectCtx, mapWrapper, state);
        window.UI.setupEventListeners(elements, dataElements, state, mapCanvas, mapCtx, effectCtx, effectCanvas, mapWrapper, flashOverlay, mapHint);

        const rect = mapWrapper.getBoundingClientRect();

        regenerateTerrain();

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
        window.UI.syncTerrainControlsFromState(state, elements);
        window.UI.updateAllCalculations(state);
        window.DataDisplay.updateDataDisplay(dataElements, state);
        window.DataDisplay.populateBuildingCitySelect(elements, state.cities);

        initEvacuation(elements, rect.width, rect.height);

        window.Renderer.drawMap(mapCtx, mapWrapper, state);
    }

    function initEvacuation(elements, width, height) {
        const shelterCount = elements.shelterCount
            ? parseInt(elements.shelterCount.value, 10)
            : 3;

        state.shelters = window.Physics.generateShelters(width, height, shelterCount);
        state.evacuationRoads = window.Physics.generateRoadNetwork(width, height, state.cities, state.shelters);

        const warningTime = elements.warningTimeSlider
            ? parseInt(elements.warningTimeSlider.value, 10)
            : 30;

        const roadCapMultiplier = elements.roadCapacity
            ? parseFloat(elements.roadCapacity.value)
            : 1;

        const vehSpeed = elements.vehicleSpeed
            ? parseInt(elements.vehicleSpeed.value, 10)
            : 60;

        state.evacuationPlan = window.Physics.calculateEvacuationPlan(
            state.cities,
            state.shelters,
            state.evacuationRoads,
            state.scale,
            warningTime,
            roadCapMultiplier,
            vehSpeed
        );

        window.UI.updateEvacuationDisplay(state, elements);

        if (elements.evacuationPanel) {
            elements.evacuationPanel.classList.toggle('hidden', !state.evacuationEnabled);
        }
    }

    window.App = {
        createExplosion: createExplosion,
        getSelectedExplosion: getSelectedExplosion,
        getExplosionById: getExplosionById,
        regenerateTerrain: regenerateTerrain,
        get state() { return state; }
    };

    document.addEventListener('DOMContentLoaded', init);
})();
