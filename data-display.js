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
        'statExplosionCount', 'statCombinedArea', 'statTotalArea', 'statOverlapArea',
        'buildingTotalPop', 'buildingDestroyedPop', 'buildingAvgStrength',
        'buildingSurvivalRate', 'maxOverpressure', 'overpressureBar',
        'buildingTypeList', 'damageBarChart', 'damageStatsList',
        'buildingCitySelect', 'buildingSummaryView', 'buildingByTypeView', 'buildingByDamageView'
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
            if (elements.buildingSummaryView) {
                updateBuildingDisplay(elements, state);
            }
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

        if (elements.buildingSummaryView) {
            updateBuildingDisplay(elements, state);
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

    function getBuildingDamageData(state, elements) {
        const explosions = state.explosions || [];
        const cities = state.cities || [];
        const terrain = state.terrainData;
        const scale = state.scale;
        const selectedCityIndex = elements.buildingCitySelect ? elements.buildingCitySelect.value : '';

        if (!explosions || explosions.length === 0 || !cities || cities.length === 0) {
            return null;
        }

        const positionedExplosions = explosions.filter(function (e) { return e.explosionCenter; });
        if (positionedExplosions.length === 0) return null;

        if (selectedCityIndex && selectedCityIndex !== '') {
            const cityIdx = parseInt(selectedCityIndex, 10);
            const city = cities[cityIdx];
            if (city) {
                const result = global.Physics.calculateCityBuildingDamage(city, positionedExplosions, scale, terrain);
                return {
                    cityResults: [result],
                    totalDeaths: Math.round(result.totalDeaths),
                    totalInjured: Math.round(result.totalInjured),
                    totalDestroyedPop: Math.round(result.totalDestroyedPop),
                    totalPopulation: city.population,
                    totalByDamage: result.distByDamage,
                    totalByBuildingType: result.buildingResults,
                    overallSurvivalRate: result.survivalRate,
                    maxOverpressure: result.maxOverpressure,
                    avgStructureFactor: result.avgStructureFactor,
                    isSingleCity: true,
                    cityName: city.name
                };
            }
        }

        return global.Physics.calculateAllCitiesBuildingDamage(cities, positionedExplosions, scale, terrain);
    }

    function updateBuildingDisplay(elements, state) {
        if (!elements.buildingSummaryView) return;

        const data = getBuildingDamageData(state, elements);

        if (!data) {
            elements.buildingTotalPop.textContent = formatNumber(state.cities.reduce(function (sum, c) { return sum + c.population; }, 0));
            elements.buildingDestroyedPop.textContent = '0';
            elements.buildingAvgStrength.textContent = '—';
            elements.buildingSurvivalRate.textContent = '—';
            elements.maxOverpressure.textContent = '0 psi';
            elements.overpressureBar.style.width = '0%';
            elements.buildingTypeList.innerHTML = '';
            elements.damageBarChart.innerHTML = '';
            elements.damageStatsList.innerHTML = '';
            return;
        }

        elements.buildingTotalPop.textContent = formatNumber(data.totalPopulation);
        elements.buildingDestroyedPop.textContent = formatNumber(data.totalDestroyedPop);

        const avgStrength = data.avgStructureFactor !== undefined
            ? data.avgStructureFactor.toFixed(2)
            : calculateOverallStructureFactor(state.cities).toFixed(2);
        elements.buildingAvgStrength.textContent = avgStrength;

        const survivalPct = (data.overallSurvivalRate * 100).toFixed(1);
        elements.buildingSurvivalRate.textContent = survivalPct + '%';

        const maxOp = data.maxOverpressure || getMaxOverpressure(state);
        elements.maxOverpressure.textContent = maxOp.toFixed(2) + ' psi';
        const opPercent = Math.min(100, (maxOp / 20) * 100);
        elements.overpressureBar.style.width = opPercent + '%';

        updateBuildingTypeList(elements, data);
        updateDamageDistribution(elements, data);
    }

    function calculateOverallStructureFactor(cities) {
        let totalPop = 0;
        let weightedFactor = 0;
        cities.forEach(function (city) {
            const factor = global.Physics.calculateAvgStructureFactor(city.buildingDistribution);
            totalPop += city.population;
            weightedFactor += factor * city.population;
        });
        return totalPop > 0 ? weightedFactor / totalPop : 0;
    }

    function getMaxOverpressure(state) {
        const explosions = state.explosions || [];
        const cities = state.cities || [];
        let maxOp = 0;
        explosions.forEach(function (exp) {
            if (!exp.explosionCenter) return;
            cities.forEach(function (city) {
                const dx = city.x - exp.explosionCenter.x;
                const dy = city.y - exp.explosionCenter.y;
                const distPx = Math.sqrt(dx * dx + dy * dy);
                const distKm = distPx / state.scale;
                const op = global.Physics.getOverpressureAtDistance(exp.yieldKilotons, distKm, exp.burstHeight);
                if (op > maxOp) maxOp = op;
            });
        });
        return maxOp;
    }

    function updateBuildingTypeList(elements, data) {
        if (!elements.buildingTypeList) return;

        const BUILDING_TYPES = global.Physics.BUILDING_TYPES;
        const BUILDING_TYPE_ORDER = global.Physics.BUILDING_TYPE_ORDER;
        const DAMAGE_LEVELS = global.Physics.DAMAGE_LEVELS;

        let html = '';
        let totalPop = data.totalPopulation;

        BUILDING_TYPE_ORDER.forEach(function (type) {
            const bt = BUILDING_TYPES[type];
            let typeData;

            if (data.isSingleCity) {
                typeData = data.totalByBuildingType[type];
            } else {
                typeData = data.totalByBuildingType[type];
            }

            if (!typeData) return;

            const pop = typeData.population || 0;
            const deaths = typeData.deaths || 0;
            const injured = typeData.injured || 0;
            const damageLevel = typeData.damageLevel || getOverallDamageLevel(typeData);
            const pct = totalPop > 0 ? (pop / totalPop * 100).toFixed(1) : 0;

            html += '<div class="building-type-item" style="border-left-color: ' + bt.color + ';">';
            html += '  <div class="building-type-header">';
            html += '    <div class="building-type-name">';
            html += '      <span class="building-type-color" style="background: ' + bt.color + ';"></span>';
            html += '      ' + bt.name;
            html += '    </div>';
            html += '    <div class="building-type-pop">' + formatNumber(pop) + ' (' + pct + '%)</div>';
            html += '  </div>';
            html += '  <div class="building-type-bar-container">';
            html += '    <div class="building-type-bar" style="width: ' + pct + '%; background: ' + bt.color + ';"></div>';
            html += '  </div>';
            html += '  <div class="building-type-stats">';
            html += '    <span class="building-type-damage" style="color: ' + DAMAGE_LEVELS[damageLevel].color + ';">';
            html += '      破坏：' + DAMAGE_LEVELS[damageLevel].name;
            html += '    </span>';
            html += '    <span>';
            html += '      <span class="building-type-deaths">死亡 ' + formatNumber(Math.round(deaths)) + '</span>';
            html += '      <span style="margin: 0 6px; color: var(--text-muted);">|</span>';
            html += '      <span class="building-type-injured">受伤 ' + formatNumber(Math.round(injured)) + '</span>';
            html += '    </span>';
            html += '  </div>';
            html += '</div>';
        });

        elements.buildingTypeList.innerHTML = html;
    }

    function getOverallDamageLevel(typeData) {
        if (typeData.damageLevel) return typeData.damageLevel;

        const pop = typeData.population || 1;
        const deaths = typeData.deaths || 0;
        const deathRate = deaths / pop;

        if (deathRate > 0.7) return 'destroyed';
        if (deathRate > 0.4) return 'severe';
        if (deathRate > 0.15) return 'moderate';
        if (deathRate > 0.03) return 'light';
        return 'intact';
    }

    function updateDamageDistribution(elements, data) {
        if (!elements.damageBarChart || !elements.damageStatsList) return;

        const DAMAGE_LEVELS = global.Physics.DAMAGE_LEVELS;
        const damageOrder = ['intact', 'light', 'moderate', 'severe', 'destroyed'];
        const totalPop = data.totalPopulation;

        let maxValue = 0;
        damageOrder.forEach(function (level) {
            const val = data.totalByDamage[level] || 0;
            if (val > maxValue) maxValue = val;
        });

        let barHtml = '';
        damageOrder.forEach(function (level) {
            const dl = DAMAGE_LEVELS[level];
            const val = data.totalByDamage[level] || 0;
            const heightPct = maxValue > 0 ? (val / maxValue * 100) : 0;
            const pct = totalPop > 0 ? (val / totalPop * 100).toFixed(1) : 0;

            barHtml += '<div class="damage-bar-item">';
            barHtml += '  <div class="damage-bar-value">' + formatNumber(Math.round(val)) + '</div>';
            barHtml += '  <div class="damage-bar-fill" style="height: ' + Math.max(4, heightPct) + '%; background: ' + dl.color + ';"></div>';
            barHtml += '  <div class="damage-bar-label">' + dl.name + '</div>';
            barHtml += '</div>';
        });
        elements.damageBarChart.innerHTML = barHtml;

        let statsHtml = '';
        damageOrder.forEach(function (level) {
            const dl = DAMAGE_LEVELS[level];
            const val = data.totalByDamage[level] || 0;
            const pct = totalPop > 0 ? (val / totalPop * 100).toFixed(1) : 0;

            statsHtml += '<div class="damage-stat-row">';
            statsHtml += '  <div class="damage-stat-name">';
            statsHtml += '    <span class="damage-dot" style="background: ' + dl.color + ';"></span>';
            statsHtml += '    ' + dl.name;
            statsHtml += '  </div>';
            statsHtml += '  <div>';
            statsHtml += '    <span class="damage-stat-value">' + formatNumber(Math.round(val)) + ' 人</span>';
            statsHtml += '    <span class="damage-stat-percent">' + pct + '%</span>';
            statsHtml += '  </div>';
            statsHtml += '</div>';
        });
        elements.damageStatsList.innerHTML = statsHtml;
    }

    function populateBuildingCitySelect(elements, cities) {
        if (!elements.buildingCitySelect) return;

        const currentValue = elements.buildingCitySelect.value;
        let html = '<option value="">全部城市汇总</option>';

        cities.forEach(function (city, idx) {
            html += '<option value="' + idx + '">' + city.name + ' (' + formatNumber(city.population) + '人)</option>';
        });

        elements.buildingCitySelect.innerHTML = html;
        if (currentValue) {
            elements.buildingCitySelect.value = currentValue;
        }
    }

    global.DataDisplay = {
        rgba: rgba,
        hexToRgba: hexToRgba,
        formatNumber: formatNumber,
        getElements: getElements,
        updateDataDisplay: updateDataDisplay,
        updateBuildingDisplay: updateBuildingDisplay,
        populateBuildingCitySelect: populateBuildingCitySelect
    };

})(window);
