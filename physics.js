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

    function calculateRadii(yieldKilotons, burstHeight) {
        const W = yieldKilotons;
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

    function calculateEnergy(yieldKilotons) {
        return Math.round(yieldKilotons * 4.184);
    }

    function calculateAffectedArea(radii) {
        return Math.round(Math.PI * radii.thermal * radii.thermal);
    }

    global.Physics = {
        BOMB_TYPES: BOMB_TYPES,
        calculateRadii: calculateRadii,
        generateCities: generateCities,
        generateRoads: generateRoads,
        calculateCasualties: calculateCasualties,
        calculateEnergy: calculateEnergy,
        calculateAffectedArea: calculateAffectedArea
    };

})(window);
