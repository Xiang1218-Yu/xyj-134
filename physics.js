(function (global) {
    'use strict';

    const BOMB_TYPES = {
        custom: { yield: 15000, name: '自定义' },
        little_boy: { yield: 15, name: '小男孩' },
        fat_man: { yield: 21, name: '胖子' },
        tsar_bomba: { yield: 50000, name: '沙皇炸弹' },
        b83: { yield: 1200, name: 'B83' },
        w88: { yield: 475, name: 'W88' },
        trinity: { yield: 20, name: '三位一体' },
        castle_bravo: { yield: 15000, name: '喝彩城堡' }
    };

    const ZONE_PRIORITY = ['fireball', 'radiation', 'severe', 'moderate', 'light', 'thermal'];

    function calculateRadii(yieldKilotons, burstHeight) {
        const W_megatons = yieldKilotons / 1000;

        const fireballRadius = 0.14 * Math.pow(W_megatons, 0.4);
        const radiationRadius = 1.2 * Math.pow(W_megatons, 1 / 3) * (burstHeight < 300 ? 1.3 : 1.0);
        const severeRadius = 0.7 * Math.pow(W_megatons, 1 / 3) * 2.5;
        const moderateRadius = 0.7 * Math.pow(W_megatons, 1 / 3) * 4.5;
        const lightRadius = 0.7 * Math.pow(W_megatons, 1 / 3) * 8;
        const thermalRadius = 2.8 * Math.pow(W_megatons, 0.41);

        const heightFactor = Math.max(0.85, 1 - (burstHeight / 10000));
        const pressureFactor = Math.exp(-burstHeight / 2000);

        return {
            fireball: Math.max(0.1, fireballRadius * heightFactor),
            radiation: Math.max(0.3, radiationRadius * pressureFactor),
            severe: Math.max(0.5, severeRadius * heightFactor),
            moderate: Math.max(1.0, moderateRadius * heightFactor),
            light: Math.max(2.0, lightRadius * heightFactor),
            thermal: Math.max(1.0, thermalRadius * (burstHeight > 0 ? 1.15 : 0.9))
        };
    }

    function generateCities(width, height) {
        const cities = [];
        const cityCount = 80;
        const centerX = width / 2;
        const centerY = height / 2;

        for (let i = 0; i < cityCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * Math.min(width, height) * 0.45 + 50;
            const x = centerX + Math.cos(angle) * dist * (0.5 + Math.random() * 0.8);
            const y = centerY + Math.sin(angle) * dist * (0.5 + Math.random() * 0.8);

            if (x > 50 && x < width - 50 && y > 50 && y < height - 50) {
                const size = Math.random() * 30 + 15;
                const population = Math.floor(Math.random() * 500000 + 50000);
                cities.push({
                    x: x,
                    y: y,
                    size: size,
                    population: population,
                    name: getCityName(i),
                    destroyed: false
                });
            }
        }

        const centralCity = {
            x: centerX + (Math.random() - 0.5) * 100,
            y: centerY + (Math.random() - 0.5) * 100,
            size: 55,
            population: 3000000,
            name: '中心都市',
            destroyed: false
        };
        cities.unshift(centralCity);

        return cities;
    }

    function getCityName(index) {
        const prefixes = ['北', '南', '东', '西', '中', '新', '古', '大', '小', '青'];
        const suffixes = ['京', '城', '都', '市', '镇', '港', '州', '府', '里', '区'];
        return prefixes[index % prefixes.length] + suffixes[Math.floor(index / prefixes.length) % suffixes.length];
    }

    function generateRoads(width, height, cities) {
        const roads = [];
        for (let i = 0; i < cities.length; i++) {
            for (let j = i + 1; j < Math.min(i + 3, cities.length); j++) {
                if (Math.random() < 0.3) {
                    roads.push({
                        x1: cities[i].x,
                        y1: cities[i].y,
                        x2: cities[j].x,
                        y2: cities[j].y
                    });
                }
            }
        }
        return roads;
    }

    function getWorstZoneForCity(city, explosions, scale) {
        let worstZoneIndex = -1;

        explosions.forEach(function (exp) {
            if (!exp.explosionCenter || !exp.radii) return;
            const dx = city.x - exp.explosionCenter.x;
            const dy = city.y - exp.explosionCenter.y;
            const distPx = Math.sqrt(dx * dx + dy * dy);
            const distKm = distPx / scale;

            for (let i = 0; i < ZONE_PRIORITY.length; i++) {
                const zoneName = ZONE_PRIORITY[i];
                if (distKm <= exp.radii[zoneName]) {
                    if (worstZoneIndex < 0 || i < worstZoneIndex) {
                        worstZoneIndex = i;
                    }
                    break;
                }
            }
        });

        return worstZoneIndex >= 0 ? ZONE_PRIORITY[worstZoneIndex] : null;
    }

    function calculateCasualtiesForZone(pop, zoneName) {
        switch (zoneName) {
            case 'fireball':
                return { deaths: pop * 0.99, injured: 0, destroyed: true };
            case 'radiation':
                return { deaths: pop * 0.85, injured: pop * 0.1, destroyed: true };
            case 'severe':
                return { deaths: pop * 0.5, injured: pop * 0.4, destroyed: true };
            case 'moderate':
                return { deaths: pop * 0.15, injured: pop * 0.5, destroyed: false };
            case 'light':
                return { deaths: pop * 0.02, injured: pop * 0.2, destroyed: false };
            case 'thermal':
                return { deaths: 0, injured: pop * 0.05, destroyed: false };
            default:
                return { deaths: 0, injured: 0, destroyed: false };
        }
    }

    function calculateCasualties(cities, explosionCenter, radii, scale) {
        let deaths = 0;
        let injured = 0;

        if (!explosionCenter || !cities || cities.length === 0) {
            return { deaths: 0, injured: 0 };
        }

        const r = radii;
        cities.forEach(function (city) {
            const dx = city.x - explosionCenter.x;
            const dy = city.y - explosionCenter.y;
            const distPx = Math.sqrt(dx * dx + dy * dy);
            const distKm = distPx / scale;
            const pop = city.population;

            if (distKm <= r.fireball) {
                deaths += pop * 0.99;
                city.destroyed = true;
            } else if (distKm <= r.radiation) {
                deaths += pop * 0.85;
                injured += pop * 0.1;
                city.destroyed = true;
            } else if (distKm <= r.severe) {
                deaths += pop * 0.5;
                injured += pop * 0.4;
                city.destroyed = true;
            } else if (distKm <= r.moderate) {
                deaths += pop * 0.15;
                injured += pop * 0.5;
            } else if (distKm <= r.light) {
                deaths += pop * 0.02;
                injured += pop * 0.2;
            } else if (distKm <= r.thermal) {
                injured += pop * 0.05;
            }
        });

        return {
            deaths: Math.round(deaths),
            injured: Math.round(injured)
        };
    }

    function calculateCombinedCasualties(cities, explosions, scale) {
        let deaths = 0;
        let injured = 0;

        if (!explosions || explosions.length === 0 || !cities || cities.length === 0) {
            return { deaths: 0, injured: 0 };
        }

        cities.forEach(function (city) {
            const worstZone = getWorstZoneForCity(city, explosions, scale);
            if (!worstZone) return;

            const pop = city.population;
            const result = calculateCasualtiesForZone(pop, worstZone);
            deaths += result.deaths;
            injured += result.injured;
            if (result.destroyed) city.destroyed = true;
        });

        return {
            deaths: Math.round(deaths),
            injured: Math.round(injured)
        };
    }

    function calculateEnergy(yieldKilotons) {
        return Math.round(yieldKilotons * 4.184);
    }

    function calculateTotalEnergy(explosions) {
        let total = 0;
        explosions.forEach(function (exp) {
            total += calculateEnergy(exp.yieldKilotons);
        });
        return Math.round(total);
    }

    function calculateAffectedArea(radii) {
        return Math.round(Math.PI * radii.thermal * radii.thermal);
    }

    function circleIntersectionArea(d, r1, r2) {
        if (d >= r1 + r2) return 0;
        if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) * Math.min(r1, r2);

        const r1sq = r1 * r1;
        const r2sq = r2 * r2;
        const dsq = d * d;

        const a1 = Math.acos((dsq + r1sq - r2sq) / (2 * d * r1));
        const a2 = Math.acos((dsq + r2sq - r1sq) / (2 * d * r2));

        const part1 = r1sq * a1;
        const part2 = r2sq * a2;
        const part3 = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));

        return part1 + part2 - part3;
    }

    function calculateCircleUnionAreaInclusion(circles) {
        const n = circles.length;
        if (n === 0) return 0;
        if (n === 1) return Math.PI * circles[0].r * circles[0].r;

        let totalArea = 0;
        circles.forEach(function (c) {
            totalArea += Math.PI * c.r * c.r;
        });

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dx = circles[i].x - circles[j].x;
                const dy = circles[i].y - circles[j].y;
                const d = Math.sqrt(dx * dx + dy * dy);
                totalArea -= circleIntersectionArea(d, circles[i].r, circles[j].r);
            }
        }

        return Math.max(0, totalArea);
    }

    function calculateCombinedAreaPerZone(explosions, scale, zoneName) {
        const circles = [];
        explosions.forEach(function (exp) {
            if (!exp.explosionCenter || !exp.radii) return;
            const radiusPx = exp.radii[zoneName] * scale;
            circles.push({
                x: exp.explosionCenter.x,
                y: exp.explosionCenter.y,
                r: radiusPx
            });
        });

        const unionAreaPx = calculateCircleUnionAreaInclusion(circles);
        const kmPerPx = 1 / scale;
        const km2PerPx2 = kmPerPx * kmPerPx;
        return Math.round(unionAreaPx * km2PerPx2);
    }

    function calculateCombinedArea(explosions, scale) {
        return calculateCombinedAreaPerZone(explosions, scale, 'thermal');
    }

    function calculateTotalAreaSum(explosions) {
        let total = 0;
        explosions.forEach(function (exp) {
            if (!exp.radii) return;
            total += calculateAffectedArea(exp.radii);
        });
        return total;
    }

    function calculateOverlapArea(explosions, scale) {
        const combined = calculateCombinedArea(explosions, scale);
        const sum = calculateTotalAreaSum(explosions);
        return Math.max(0, sum - combined);
    }

    function calculateAllCombinedStats(explosions, scale) {
        const thermalCombined = calculateCombinedAreaPerZone(explosions, scale, 'thermal');
        const totalArea = calculateTotalAreaSum(explosions);
        return {
            count: explosions.filter(function (e) { return e.explosionCenter; }).length,
            combinedArea: thermalCombined,
            totalArea: totalArea,
            overlapArea: Math.max(0, totalArea - thermalCombined),
            totalEnergy: calculateTotalEnergy(explosions),
            perZone: {
                fireball: calculateCombinedAreaPerZone(explosions, scale, 'fireball'),
                radiation: calculateCombinedAreaPerZone(explosions, scale, 'radiation'),
                severe: calculateCombinedAreaPerZone(explosions, scale, 'severe'),
                moderate: calculateCombinedAreaPerZone(explosions, scale, 'moderate'),
                light: calculateCombinedAreaPerZone(explosions, scale, 'light'),
                thermal: thermalCombined
            }
        };
    }

    global.Physics = {
        BOMB_TYPES: BOMB_TYPES,
        ZONE_PRIORITY: ZONE_PRIORITY,
        calculateRadii: calculateRadii,
        generateCities: generateCities,
        generateRoads: generateRoads,
        calculateCasualties: calculateCasualties,
        calculateCombinedCasualties: calculateCombinedCasualties,
        getWorstZoneForCity: getWorstZoneForCity,
        calculateEnergy: calculateEnergy,
        calculateTotalEnergy: calculateTotalEnergy,
        calculateAffectedArea: calculateAffectedArea,
        calculateCombinedArea: calculateCombinedArea,
        calculateTotalAreaSum: calculateTotalAreaSum,
        calculateOverlapArea: calculateOverlapArea,
        calculateAllCombinedStats: calculateAllCombinedStats,
        calculateCombinedAreaPerZone: calculateCombinedAreaPerZone
    };

})(window);
