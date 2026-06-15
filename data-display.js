(function (global) {
    'use strict';

    function rgba(r, g, b, a) {
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return rgba(r, g, b, alpha);
    }

    function formatNumber(num) {
        if (!isFinite(num)) return '0';
        if (num >= 100000000) return (num / 100000000).toFixed(2) + ' 亿';
        if (num >= 10000) return (num / 10000).toFixed(1) + ' 万';
        return Math.round(num).toLocaleString();
    }

    const elementIds = [
        'fireballRadius', 'fireballDiameter', 'radiationRadius',
        'severeRadius', 'moderateRadius', 'lightRadius', 'thermalRadius',
        'estimatedDeaths', 'estimatedInjured', 'affectedArea', 'energyReleased',
        'statExplosionCount', 'statCombinedArea', 'statTotalArea', 'statOverlapArea'
    ];

    function getElements() {
        const elements = {};
        elementIds.forEach(function (id) {
            elements[id] = document.getElementById(id);
        });
        return elements;
    }

    function getSelectedExplosion(state) {
        if (!state.selectedExplosionId) return null;
        return state.explosions.find(function (e) { return e.id === state.selectedExplosionId; }) || null;
    }

    function updateRadiiDisplay(elements, radii) {
        if (!radii) radii = { fireball:0, radiation:0, severe:0, moderate:0, light:0, thermal:0 };
        elements.fireballRadius.textContent = radii.fireball.toFixed(2);
        elements.fireballDiameter.textContent = (radii.fireball * 2).toFixed(2);
        elements.radiationRadius.textContent = radii.radiation.toFixed(2);
        elements.severeRadius.textContent = radii.severe.toFixed(2);
        elements.moderateRadius.textContent = radii.moderate.toFixed(2);
        elements.lightRadius.textContent = radii.light.toFixed(2);
        elements.thermalRadius.textContent = radii.thermal.toFixed(2);
    }

    function updateCombinedStats(elements, stats) {
        elements.statExplosionCount.textContent = stats.count;
        elements.statCombinedArea.textContent = formatNumber(stats.combinedArea);
        elements.statTotalArea.textContent = formatNumber(stats.totalArea);
        elements.statOverlapArea.textContent = formatNumber(stats.overlapArea);
    }

    function updateDataDisplay(elements, state) {
        const viewMode = state.viewMode || 'combined';

        if (!state.explosions || state.explosions.length === 0) {
            updateRadiiDisplay(elements, null);
            elements.estimatedDeaths.textContent = '0';
            elements.estimatedInjured.textContent = '0';
            elements.affectedArea.textContent = '0';
            elements.energyReleased.textContent = '0';
            updateCombinedStats(elements, { count: 0, combinedArea: 0, totalArea: 0, overlapArea: 0 });
            return;
        }

        if (viewMode === 'selected') {
            const selected = getSelectedExplosion(state);
            if (selected) {
                const r = selected.radii || global.Physics.calculateRadii(selected.yieldKilotons, selected.burstHeight);
                updateRadiiDisplay(elements, r);

                const casualties = global.Physics.calculateCasualtiesTerrainAware(
                    state.cities,
                    [selected],
                    state.scale,
                    state.terrainData
                );
                elements.estimatedDeaths.textContent = formatNumber(casualties.deaths);
                elements.estimatedInjured.textContent = formatNumber(casualties.injured);

                const area = global.Physics.calculateAffectedArea(r);
                elements.affectedArea.textContent = formatNumber(area);

                const energy = global.Physics.calculateEnergy(selected.yieldKilotons);
                elements.energyReleased.textContent = formatNumber(energy);
            } else {
                updateRadiiDisplay(elements, null);
                elements.estimatedDeaths.textContent = '0';
                elements.estimatedInjured.textContent = '0';
                elements.affectedArea.textContent = '0';
                elements.energyReleased.textContent = '0';
            }
        } else {
            const stats = global.Physics.calculateAllCombinedStats(state.explosions, state.scale);

            const casualties = global.Physics.calculateCasualtiesTerrainAware(
                state.cities,
                state.explosions,
                state.scale,
                state.terrainData
            );

            const maxRadiiPerZone = getMaxRadiiAcrossExplosions(state.explosions);
            updateRadiiDisplay(elements, maxRadiiPerZone);

            elements.estimatedDeaths.textContent = formatNumber(casualties.deaths);
            elements.estimatedInjured.textContent = formatNumber(casualties.injured);
            elements.affectedArea.textContent = formatNumber(stats.combinedArea);
            elements.energyReleased.textContent = formatNumber(stats.totalEnergy);

            updateCombinedStats(elements, stats);
        }
    }

    function getMaxRadiiAcrossExplosions(explosions) {
        const keys = ['fireball', 'radiation', 'severe', 'moderate', 'light', 'thermal'];
        const result = { fireball: 0, radiation: 0, severe: 0, moderate: 0, light: 0, thermal: 0 };
        explosions.forEach(function (exp) {
            if (!exp.radii) return;
            keys.forEach(function (k) {
                if (exp.radii[k] > result[k]) result[k] = exp.radii[k];
            });
        });
        return result;
    }

    global.DataDisplay = {
        rgba: rgba,
        hexToRgba: hexToRgba,
        formatNumber: formatNumber,
        getElements: getElements,
        updateDataDisplay: updateDataDisplay
    };

})(window);
