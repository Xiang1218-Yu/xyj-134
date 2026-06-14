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
        if (num >= 100000000) return (num / 100000000).toFixed(2) + ' 亿';
        if (num >= 10000) return (num / 10000).toFixed(1) + ' 万';
        return num.toLocaleString();
    }

    const elementIds = [
        'fireballRadius', 'fireballDiameter', 'radiationRadius',
        'severeRadius', 'moderateRadius', 'lightRadius', 'thermalRadius',
        'estimatedDeaths', 'estimatedInjured', 'affectedArea', 'energyReleased'
    ];

    function getElements() {
        const elements = {};
        elementIds.forEach(function (id) {
            elements[id] = document.getElementById(id);
        });
        return elements;
    }

    function updateDataDisplay(elements, state) {
        if (!state.radii) return;

        const r = state.radii;
        elements.fireballRadius.textContent = r.fireball.toFixed(2);
        elements.fireballDiameter.textContent = (r.fireball * 2).toFixed(2);
        elements.radiationRadius.textContent = r.radiation.toFixed(2);
        elements.severeRadius.textContent = r.severe.toFixed(2);
        elements.moderateRadius.textContent = r.moderate.toFixed(2);
        elements.lightRadius.textContent = r.light.toFixed(2);
        elements.thermalRadius.textContent = r.thermal.toFixed(2);

        const W_terajoules = global.Physics.calculateEnergy(state.yieldKilotons);
        elements.energyReleased.textContent = formatNumber(W_terajoules);

        const totalArea = global.Physics.calculateAffectedArea(r);
        elements.affectedArea.textContent = formatNumber(totalArea);

        const casualties = global.Physics.calculateCasualties(
            state.cities,
            state.explosionCenter,
            state.radii,
            state.scale
        );

        elements.estimatedDeaths.textContent = formatNumber(casualties.deaths);
        elements.estimatedInjured.textContent = formatNumber(casualties.injured);
    }

    global.DataDisplay = {
        rgba: rgba,
        hexToRgba: hexToRgba,
        formatNumber: formatNumber,
        getElements: getElements,
        updateDataDisplay: updateDataDisplay
    };

})(window);
