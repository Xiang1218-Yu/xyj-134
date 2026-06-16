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

    const TERRAIN_FEATURE_TYPES = {
        MOUNTAIN: 'mountain',
        HILL: 'hill',
        BASIN: 'basin',
        PLAIN: 'plain'
    };

    const TERRAIN_PRESETS = {
        flat: { name: '平坦地形', mountainCount: 0, hillCount: 0, basinCount: 0, elevationScale: 0.0 },
        gentle: { name: '丘陵地形', mountainCount: 1, hillCount: 6, basinCount: 3, elevationScale: 0.5 },
        mountainous: { name: '多山地形', mountainCount: 4, hillCount: 4, basinCount: 2, elevationScale: 1.0 },
        extreme: { name: '极端地形', mountainCount: 6, hillCount: 8, basinCount: 4, elevationScale: 1.5 }
    };

    const BUILDING_TYPES = {
        temporary: {
            name: '临时建筑',
            shortName: '临建',
            color: '#8b7355',
            description: '临时工棚、简易房屋',
            structureFactor: 0.15,
            collapsePsi: 0.8,
            severeDamagePsi: 0.5,
            moderateDamagePsi: 0.3,
            lightDamagePsi: 0.15,
            indoorSurvivalRate: {
                intact: 0.99,
                light: 0.9,
                moderate: 0.6,
                severe: 0.2,
                destroyed: 0.05
            }
        },
        wood: {
            name: '木结构',
            shortName: '木构',
            color: '#a0522d',
            description: '传统木质结构住宅',
            structureFactor: 0.35,
            collapsePsi: 2.0,
            severeDamagePsi: 1.2,
            moderateDamagePsi: 0.7,
            lightDamagePsi: 0.35,
            indoorSurvivalRate: {
                intact: 0.99,
                light: 0.95,
                moderate: 0.75,
                severe: 0.35,
                destroyed: 0.1
            }
        },
        brick: {
            name: '砖混结构',
            shortName: '砖混',
            color: '#b22222',
            description: '砖砌体结构房屋',
            structureFactor: 0.55,
            collapsePsi: 4.0,
            severeDamagePsi: 2.5,
            moderateDamagePsi: 1.5,
            lightDamagePsi: 0.7,
            indoorSurvivalRate: {
                intact: 0.995,
                light: 0.97,
                moderate: 0.82,
                severe: 0.45,
                destroyed: 0.15
            }
        },
        rc_frame: {
            name: '钢筋混凝土框架',
            shortName: '砼框架',
            color: '#708090',
            description: '钢筋混凝土框架结构',
            structureFactor: 0.8,
            collapsePsi: 8.0,
            severeDamagePsi: 5.0,
            moderateDamagePsi: 3.0,
            lightDamagePsi: 1.5,
            indoorSurvivalRate: {
                intact: 0.998,
                light: 0.98,
                moderate: 0.88,
                severe: 0.55,
                destroyed: 0.22
            }
        },
        steel: {
            name: '钢结构',
            shortName: '钢构',
            color: '#4682b4',
            description: '钢结构建筑',
            structureFactor: 1.0,
            collapsePsi: 12.0,
            severeDamagePsi: 7.5,
            moderateDamagePsi: 4.5,
            lightDamagePsi: 2.2,
            indoorSurvivalRate: {
                intact: 0.998,
                light: 0.985,
                moderate: 0.9,
                severe: 0.6,
                destroyed: 0.25
            }
        },
        rc_core: {
            name: '钢筋混凝土核心筒',
            shortName: '核心筒',
            color: '#2f4f4f',
            description: '超高层核心筒结构',
            structureFactor: 1.3,
            collapsePsi: 18.0,
            severeDamagePsi: 11.0,
            moderateDamagePsi: 6.5,
            lightDamagePsi: 3.2,
            indoorSurvivalRate: {
                intact: 0.999,
                light: 0.99,
                moderate: 0.92,
                severe: 0.65,
                destroyed: 0.3
            }
        },
        blast_resistant: {
            name: '防爆人防工程',
            shortName: '人防',
            color: '#556b2f',
            description: '人防工程、防爆建筑',
            structureFactor: 2.5,
            collapsePsi: 35.0,
            severeDamagePsi: 22.0,
            moderateDamagePsi: 12.0,
            lightDamagePsi: 6.0,
            indoorSurvivalRate: {
                intact: 0.999,
                light: 0.995,
                moderate: 0.97,
                severe: 0.85,
                destroyed: 0.5
            }
        }
    };

    const BUILDING_TYPE_ORDER = ['temporary', 'wood', 'brick', 'rc_frame', 'steel', 'rc_core', 'blast_resistant'];

    const DAMAGE_LEVELS = {
        intact: { name: '完好', color: '#4caf50', order: 0 },
        light: { name: '轻微破坏', color: '#ffeb3b', order: 1 },
        moderate: { name: '中度破坏', color: '#ff9800', order: 2 },
        severe: { name: '严重破坏', color: '#f44336', order: 3 },
        destroyed: { name: '完全摧毁', color: '#9c27b0', order: 4 }
    };

    function getBuildingDamageLevel(buildingType, overpressurePsi) {
        const bt = BUILDING_TYPES[buildingType];
        if (!bt) return 'destroyed';

        const op = overpressurePsi;

        if (op >= bt.collapsePsi) return 'destroyed';
        if (op >= bt.severeDamagePsi) return 'severe';
        if (op >= bt.moderateDamagePsi) return 'moderate';
        if (op >= bt.lightDamagePsi) return 'light';
        return 'intact';
    }

    function getOverpressureAtDistance(yieldKilotons, distanceKm, burstHeight) {
        const W_megatons = yieldKilotons / 1000;

        if (distanceKm <= 0) return 100;

        const scaledDist = distanceKm / Math.pow(W_megatons, 1 / 3);

        let overpressure;
        if (scaledDist < 0.1) {
            overpressure = 200;
        } else if (scaledDist < 0.5) {
            overpressure = 30 * Math.pow(0.1 / scaledDist, 1.5);
        } else if (scaledDist < 2) {
            overpressure = 10 * Math.pow(0.5 / scaledDist, 1.3);
        } else if (scaledDist < 10) {
            overpressure = 2 * Math.pow(2 / scaledDist, 1.1);
        } else {
            overpressure = 0.3 * Math.pow(10 / scaledDist, 1.0);
        }

        const heightFactor = burstHeight > 0 ? Math.exp(-burstHeight / 3000) : 1.0;
        overpressure *= (0.8 + heightFactor * 0.4);

        return Math.max(0.01, overpressure);
    }

    function calculateBuildingCasualties(population, buildingType, overpressurePsi, indoorRatio) {
        const bt = BUILDING_TYPES[buildingType];
        if (!bt) return { deaths: 0, injured: 0, damageLevel: 'destroyed' };

        const damageLevel = getBuildingDamageLevel(buildingType, overpressurePsi);
        const indoorPop = population * (indoorRatio !== undefined ? indoorRatio : 0.85);
        const outdoorPop = population - indoorPop;

        const indoorSurvival = bt.indoorSurvivalRate[damageLevel];
        const indoorDeaths = indoorPop * (1 - indoorSurvival);

        const outdoorSurvival = Math.max(0, 1 - overpressurePsi / 3);
        const outdoorDeaths = outdoorPop * Math.max(0, 1 - outdoorSurvival);

        const totalDeaths = indoorDeaths + outdoorDeaths;
        const injuredRatio = {
            intact: 0.02,
            light: 0.08,
            moderate: 0.2,
            severe: 0.35,
            destroyed: 0.25
        }[damageLevel] || 0;

        const totalInjured = population * injuredRatio * (1 - totalDeaths / population);

        return {
            deaths: totalDeaths,
            injured: Math.max(0, totalInjured),
            damageLevel: damageLevel,
            buildingType: buildingType,
            overpressure: overpressurePsi
        };
    }

    const ZONE_PRIORITY = ['fireball', 'radiation', 'severe', 'moderate', 'light', 'thermal'];

    const ZONE_ALTITUDE_SENSITIVITY = {
        fireball: 0.05,
        radiation: 0.30,
        severe: 0.50,
        moderate: 0.40,
        light: 0.30,
        thermal: 0.15
    };

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

    function generateBuildingDistribution(isCentral, size) {
        const dist = {};

        if (isCentral) {
            dist.temporary = 0.02;
            dist.wood = 0.05;
            dist.brick = 0.18;
            dist.rc_frame = 0.40;
            dist.steel = 0.20;
            dist.rc_core = 0.12;
            dist.blast_resistant = 0.03;
        } else if (size > 35) {
            dist.temporary = 0.04;
            dist.wood = 0.08;
            dist.brick = 0.25;
            dist.rc_frame = 0.35;
            dist.steel = 0.15;
            dist.rc_core = 0.10;
            dist.blast_resistant = 0.03;
        } else if (size > 25) {
            dist.temporary = 0.06;
            dist.wood = 0.12;
            dist.brick = 0.35;
            dist.rc_frame = 0.28;
            dist.steel = 0.10;
            dist.rc_core = 0.07;
            dist.blast_resistant = 0.02;
        } else {
            dist.temporary = 0.10;
            dist.wood = 0.20;
            dist.brick = 0.40;
            dist.rc_frame = 0.18;
            dist.steel = 0.06;
            dist.rc_core = 0.04;
            dist.blast_resistant = 0.02;
        }

        const jitter = 0.03;
        let total = 0;
        BUILDING_TYPE_ORDER.forEach(function (type) {
            const jitterAmount = (Math.random() - 0.5) * 2 * jitter;
            dist[type] = Math.max(0.01, dist[type] + jitterAmount);
            total += dist[type];
        });

        BUILDING_TYPE_ORDER.forEach(function (type) {
            dist[type] = dist[type] / total;
        });

        return dist;
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
                const buildingDist = generateBuildingDistribution(false, size);
                cities.push({
                    x: x,
                    y: y,
                    size: size,
                    population: population,
                    name: getCityName(i),
                    destroyed: false,
                    buildingDistribution: buildingDist
                });
            }
        }

        const centralCity = {
            x: centerX + (Math.random() - 0.5) * 100,
            y: centerY + (Math.random() - 0.5) * 100,
            size: 55,
            population: 3000000,
            name: '中心都市',
            destroyed: false,
            buildingDistribution: generateBuildingDistribution(true, 55)
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

    function calculateCityBuildingDamage(city, explosions, scale, terrain) {
        let maxOverpressure = 0;
        let worstFireball = false;
        let worstRadiation = false;

        explosions.forEach(function (exp) {
            if (!exp.explosionCenter || !exp.radii) return;
            const dx = city.x - exp.explosionCenter.x;
            const dy = city.y - exp.explosionCenter.y;
            const distPx = Math.sqrt(dx * dx + dy * dy);
            const distKm = distPx / scale;

            let effectiveDistKm = distKm;
            if (terrain && terrain.features && terrain.features.length > 0) {
                const attenuationResult = calculatePathAttenuation(
                    exp.explosionCenter.x, exp.explosionCenter.y,
                    city.x, city.y,
                    terrain, 'severe', scale, exp.burstHeight
                );
                effectiveDistKm = distKm / Math.max(0.3, attenuationResult.attenuation);
            }

            const op = getOverpressureAtDistance(exp.yieldKilotons, effectiveDistKm, exp.burstHeight);
            if (op > maxOverpressure) {
                maxOverpressure = op;
            }

            if (distKm <= exp.radii.fireball) {
                worstFireball = true;
            }
            if (distKm <= exp.radii.radiation) {
                worstRadiation = true;
            }
        });

        const buildingResults = {};
        let totalDeaths = 0;
        let totalInjured = 0;
        let totalDestroyedPop = 0;
        let totalAffectedPop = 0;

        const distByDamage = {
            intact: 0,
            light: 0,
            moderate: 0,
            severe: 0,
            destroyed: 0
        };

        BUILDING_TYPE_ORDER.forEach(function (buildingType) {
            const ratio = city.buildingDistribution[buildingType] || 0;
            const popInBuilding = city.population * ratio;

            let adjustedOverpressure = maxOverpressure;
            if (worstFireball) {
                adjustedOverpressure = Math.max(adjustedOverpressure, 50);
            }

            const result = calculateBuildingCasualties(
                popInBuilding,
                buildingType,
                adjustedOverpressure
            );

            buildingResults[buildingType] = {
                population: popInBuilding,
                damageLevel: result.damageLevel,
                deaths: result.deaths,
                injured: result.injured,
                overpressure: adjustedOverpressure
            };

            totalDeaths += result.deaths;
            totalInjured += result.injured;

            if (result.damageLevel === 'destroyed') {
                totalDestroyedPop += popInBuilding;
            }
            if (result.damageLevel !== 'intact') {
                totalAffectedPop += popInBuilding;
            }

            distByDamage[result.damageLevel] = (distByDamage[result.damageLevel] || 0) + popInBuilding;
        });

        if (worstRadiation) {
            totalDeaths += city.population * 0.05;
            totalInjured += city.population * 0.08;
        }

        const avgStructureFactor = calculateAvgStructureFactor(city.buildingDistribution);

        return {
            city: city,
            maxOverpressure: maxOverpressure,
            avgStructureFactor: avgStructureFactor,
            buildingResults: buildingResults,
            totalDeaths: totalDeaths,
            totalInjured: totalInjured,
            totalDestroyedPop: totalDestroyedPop,
            totalAffectedPop: totalAffectedPop,
            distByDamage: distByDamage,
            inFireball: worstFireball,
            inRadiation: worstRadiation,
            survivalRate: city.population > 0 ? 1 - totalDeaths / city.population : 0
        };
    }

    function calculateAvgStructureFactor(buildingDistribution) {
        let total = 0;
        let weightedSum = 0;
        BUILDING_TYPE_ORDER.forEach(function (type) {
            const ratio = buildingDistribution[type] || 0;
            if (ratio > 0) {
                const bt = BUILDING_TYPES[type];
                weightedSum += bt.structureFactor * ratio;
                total += ratio;
            }
        });
        return total > 0 ? weightedSum / total : 0.5;
    }

    function calculateAllCitiesBuildingDamage(cities, explosions, scale, terrain) {
        const results = [];
        let totalDeaths = 0;
        let totalInjured = 0;
        let totalDestroyedPop = 0;

        const totalByDamage = {
            intact: 0,
            light: 0,
            moderate: 0,
            severe: 0,
            destroyed: 0
        };

        const totalByBuildingType = {};
        BUILDING_TYPE_ORDER.forEach(function (type) {
            totalByBuildingType[type] = { population: 0, deaths: 0, injured: 0 };
        });

        cities.forEach(function (city) {
            const result = calculateCityBuildingDamage(city, explosions, scale, terrain);
            results.push(result);

            totalDeaths += result.totalDeaths;
            totalInjured += result.totalInjured;
            totalDestroyedPop += result.totalDestroyedPop;

            Object.keys(totalByDamage).forEach(function (level) {
                totalByDamage[level] += result.distByDamage[level] || 0;
            });

            BUILDING_TYPE_ORDER.forEach(function (type) {
                if (result.buildingResults[type]) {
                    totalByBuildingType[type].population += result.buildingResults[type].population;
                    totalByBuildingType[type].deaths += result.buildingResults[type].deaths;
                    totalByBuildingType[type].injured += result.buildingResults[type].injured;
                }
            });

            if (result.totalDestroyedPop > city.population * 0.5) {
                city.destroyed = true;
            }
        });

        const totalPopulation = cities.reduce(function (sum, city) {
            return sum + city.population;
        }, 0);

        return {
            cityResults: results,
            totalDeaths: Math.round(totalDeaths),
            totalInjured: Math.round(totalInjured),
            totalDestroyedPop: Math.round(totalDestroyedPop),
            totalPopulation: totalPopulation,
            totalByDamage: totalByDamage,
            totalByBuildingType: totalByBuildingType,
            overallSurvivalRate: totalPopulation > 0 ? 1 - totalDeaths / totalPopulation : 0
        };
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

    function mulberry32(seed) {
        return function () {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function generateTerrainFeatures(width, height, presetName, elevationScale, seed) {
        const preset = TERRAIN_PRESETS[presetName] || TERRAIN_PRESETS.flat;
        const rand = mulberry32(seed || Date.now() & 0xffffffff);
        const scale = (elevationScale !== undefined ? elevationScale : 1) * preset.elevationScale;

        const features = [];

        function addFeature(type, x, y, radius, height) {
            features.push({
                type: type,
                x: x,
                y: y,
                radius: radius,
                height: height * scale,
                width: radius * 2,
                heightPx: height * scale
            });
        }

        for (let i = 0; i < preset.mountainCount; i++) {
            const x = width * (0.1 + rand() * 0.8);
            const y = height * (0.1 + rand() * 0.8);
            const radius = Math.min(width, height) * (0.06 + rand() * 0.1);
            const heightVal = 3000 + rand() * 5000;
            addFeature(TERRAIN_FEATURE_TYPES.MOUNTAIN, x, y, radius, heightVal);

            const subPeaks = 1 + Math.floor(rand() * 3);
            for (let j = 0; j < subPeaks; j++) {
                const ang = rand() * Math.PI * 2;
                const dist = radius * (0.6 + rand() * 0.8);
                addFeature(
                    TERRAIN_FEATURE_TYPES.MOUNTAIN,
                    x + Math.cos(ang) * dist,
                    y + Math.sin(ang) * dist,
                    radius * (0.35 + rand() * 0.35),
                    1500 + rand() * 2500
                );
            }
        }

        for (let i = 0; i < preset.hillCount; i++) {
            const x = width * (0.05 + rand() * 0.9);
            const y = height * (0.05 + rand() * 0.9);
            const radius = Math.min(width, height) * (0.03 + rand() * 0.06);
            const heightVal = 300 + rand() * 800;
            addFeature(TERRAIN_FEATURE_TYPES.HILL, x, y, radius, heightVal);
        }

        for (let i = 0; i < preset.basinCount; i++) {
            const x = width * (0.1 + rand() * 0.8);
            const y = height * (0.1 + rand() * 0.8);
            const radius = Math.min(width, height) * (0.05 + rand() * 0.09);
            const depthVal = 200 + rand() * 600;
            addFeature(TERRAIN_FEATURE_TYPES.BASIN, x, y, radius, -depthVal);
        }

        return {
            features: features,
            width: width,
            height: height,
            scale: scale,
            presetName: presetName
        };
    }

    function getElevationAt(x, y, terrain) {
        if (!terrain || !terrain.features || terrain.features.length === 0) return 0;

        let elevation = 0;
        terrain.features.forEach(function (f) {
            const dx = x - f.x;
            const dy = y - f.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist >= f.radius * 2.5) return;

            const normDist = dist / f.radius;
            let factor;

            if (f.type === TERRAIN_FEATURE_TYPES.MOUNTAIN) {
                if (normDist < 0.3) {
                    factor = 1 - normDist * 0.5;
                } else if (normDist < 1) {
                    factor = Math.cos((normDist - 0.3) / 0.7 * Math.PI / 2) * 0.95 + 0.05;
                } else if (normDist < 2.5) {
                    factor = (1 - (normDist - 1) / 1.5) * 0.15;
                } else {
                    factor = 0;
                }
            } else if (f.type === TERRAIN_FEATURE_TYPES.HILL) {
                if (normDist < 1) {
                    factor = Math.cos(normDist * Math.PI / 2) * 0.9 + 0.1;
                } else if (normDist < 1.8) {
                    factor = (1 - (normDist - 1) / 0.8) * 0.1;
                } else {
                    factor = 0;
                }
            } else if (f.type === TERRAIN_FEATURE_TYPES.BASIN) {
                if (normDist < 0.2) {
                    factor = 1;
                } else if (normDist < 1) {
                    factor = Math.cos((normDist - 0.2) / 0.8 * Math.PI / 2);
                } else if (normDist < 2) {
                    factor = (1 - (normDist - 1)) * 0.2;
                } else {
                    factor = 0;
                }
            }

            elevation += f.heightPx * factor;
        });

        return elevation;
    }

    function calculatePathAttenuation(fromX, fromY, toX, toY, terrain, zoneName, scale, burstHeightMeters) {
        if (!terrain || !terrain.features || terrain.features.length === 0) {
            return { attenuation: 1, maxObstacleHeight: 0, pathLengthKm: 0 };
        }

        const dx = toX - fromX;
        const dy = toY - fromY;
        const distPx = Math.sqrt(dx * dx + dy * dy);
        const distKm = distPx / scale;

        if (distKm < 0.1) {
            return { attenuation: 1, maxObstacleHeight: 0, pathLengthKm: distKm };
        }

        const samples = Math.max(8, Math.min(64, Math.floor(distPx / 10)));
        const sensitivity = ZONE_ALTITUDE_SENSITIVITY[zoneName] || 0.2;
        const burstHeight = burstHeightMeters || 0;

        let totalObstruction = 0;
        let maxHeightDiff = 0;

        for (let i = 1; i <= samples; i++) {
            const t = i / samples;
            const px = fromX + dx * t;
            const py = fromY + dy * t;
            const elev = getElevationAt(px, py, terrain);
            const currentDistKm = distKm * t;

            const lineOfSightHeight = burstHeight + ((elev > burstHeight ? 0 : 0) - burstHeight) * t;
            const heightDiff = elev - burstHeight;

            if (heightDiff > 0) {
                const shieldFactor = 1 - currentDistKm / Math.max(distKm, 0.5);
                const obstruction = (heightDiff / 500) * sensitivity * shieldFactor;
                totalObstruction += obstruction;
            }

            if (heightDiff > maxHeightDiff) {
                maxHeightDiff = heightDiff;
            }
        }

        const avgObstruction = totalObstruction / samples;
        let attenuation = 1 - avgObstruction;

        if (maxHeightDiff > 1500) {
            const majorBlock = (maxHeightDiff - 1500) / 4000 * sensitivity;
            attenuation -= majorBlock;
        }

        if (zoneName === 'radiation') {
            const radiationScatter = Math.max(0, maxHeightDiff / 3000) * 0.3;
            attenuation -= radiationScatter;
        }

        if (zoneName === 'thermal') {
            const thermalBlock = Math.max(0, maxHeightDiff / 2000) * 0.25;
            attenuation -= thermalBlock;
        }

        attenuation = Math.max(0.2, Math.min(1, attenuation));

        return {
            attenuation: attenuation,
            maxObstacleHeight: maxHeightDiff,
            pathLengthKm: distKm
        };
    }

    function calculateEffectiveRadius(explosion, targetX, targetY, zoneName, terrain, scale) {
        const baseRadius = explosion.radii ? explosion.radii[zoneName] : 0;
        if (!explosion.explosionCenter || baseRadius <= 0) return 0;

        const fromX = explosion.explosionCenter.x;
        const fromY = explosion.explosionCenter.y;

        const result = calculatePathAttenuation(
            fromX, fromY, targetX, targetY,
            terrain, zoneName, scale, explosion.burstHeight
        );

        return baseRadius * result.attenuation;
    }

    function generateTerrainBoundaryPolygon(explosion, zoneName, terrain, scale, segments) {
        if (!explosion.explosionCenter || !explosion.radii) return null;

        const segs = segments || 72;
        const baseRadius = explosion.radii[zoneName] * scale;
        const cx = explosion.explosionCenter.x;
        const cy = explosion.explosionCenter.y;

        const points = [];
        for (let i = 0; i < segs; i++) {
            const angle = (i / segs) * Math.PI * 2;
            const targetX = cx + Math.cos(angle) * baseRadius;
            const targetY = cy + Math.sin(angle) * baseRadius;

            const attenuation = calculatePathAttenuation(
                cx, cy, targetX, targetY,
                terrain, zoneName, scale, explosion.burstHeight
            ).attenuation;

            const effectiveRadiusPx = baseRadius * attenuation;
            points.push({
                x: cx + Math.cos(angle) * effectiveRadiusPx,
                y: cy + Math.sin(angle) * effectiveRadiusPx,
                angle: angle,
                attenuation: attenuation
            });
        }

        return points;
    }

    function checkPointInAnyZoneTerrainAware(point, explosions, terrain, scale) {
        let worstZoneIndex = -1;
        let worstExplosionId = null;

        explosions.forEach(function (exp) {
            if (!exp.explosionCenter || !exp.radii) return;

            const dx = point.x - exp.explosionCenter.x;
            const dy = point.y - exp.explosionCenter.y;
            const distPx = Math.sqrt(dx * dx + dy * dy);
            const distKm = distPx / scale;

            for (let i = 0; i < ZONE_PRIORITY.length; i++) {
                const zoneName = ZONE_PRIORITY[i];
                const effectiveRadius = calculateEffectiveRadius(exp, point.x, point.y, zoneName, terrain, scale);

                if (distKm <= effectiveRadius) {
                    if (worstZoneIndex < 0 || i < worstZoneIndex) {
                        worstZoneIndex = i;
                        worstExplosionId = exp.id;
                    }
                    break;
                }
            }
        });

        return worstZoneIndex >= 0 ? ZONE_PRIORITY[worstZoneIndex] : null;
    }

    function getWorstZoneForCityTerrain(city, explosions, scale, terrain) {
        if (!terrain || !terrain.features || terrain.features.length === 0) {
            return getWorstZoneForCity(city, explosions, scale);
        }
        return checkPointInAnyZoneTerrainAware(city, explosions, terrain, scale);
    }

    function calculateCasualtiesTerrainAware(cities, explosions, scale, terrain) {
        let deaths = 0;
        let injured = 0;

        if (!explosions || explosions.length === 0 || !cities || cities.length === 0) {
            return { deaths: 0, injured: 0 };
        }

        const useTerrain = terrain && terrain.features && terrain.features.length > 0;

        cities.forEach(function (city) {
            const worstZone = useTerrain
                ? checkPointInAnyZoneTerrainAware(city, explosions, terrain, scale)
                : getWorstZoneForCity(city, explosions, scale);
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

    function calculateShockwaveRadiusAtAngle(explosion, angle, zoneKey, terrain, scale, baseRadiusPx) {
        if (!terrain || !terrain.features || terrain.features.length === 0) {
            return baseRadiusPx;
        }
        if (!explosion.explosionCenter) return baseRadiusPx;

        const cx = explosion.explosionCenter.x;
        const cy = explosion.explosionCenter.y;
        const targetX = cx + Math.cos(angle) * baseRadiusPx;
        const targetY = cy + Math.sin(angle) * baseRadiusPx;

        const result = calculatePathAttenuation(
            cx, cy, targetX, targetY,
            terrain, zoneKey, scale, explosion.burstHeight
        );

        return baseRadiusPx * result.attenuation;
    }

    const ROAD_BASE_CAPACITY = 2000;
    const VEHICLE_SPEED_KMH = 60;
    const PEOPLE_PER_VEHICLE = 3;

    function buildEvacuationGraph(cities, shelters, roads, capacityMultiplier) {
        const capMult = capacityMultiplier !== undefined ? capacityMultiplier : 1;
        const nodes = [];
        const nodeMap = {};
        let nodeId = 0;

        cities.forEach(function (city, idx) {
            const node = {
                id: nodeId,
                type: 'city',
                ref: city,
                refIndex: idx,
                x: city.x,
                y: city.y,
                population: city.population,
                edges: []
            };
            nodes.push(node);
            nodeMap['city_' + idx] = nodeId;
            nodeId++;
        });

        shelters.forEach(function (shelter, idx) {
            const node = {
                id: nodeId,
                type: 'shelter',
                ref: shelter,
                refIndex: idx,
                x: shelter.x,
                y: shelter.y,
                capacity: shelter.capacity,
                edges: []
            };
            nodes.push(node);
            nodeMap['shelter_' + idx] = nodeId;
            nodeId++;
        });

        roads.forEach(function (road) {
            const dx = road.x2 - road.x1;
            const dy = road.y2 - road.y1;
            const lengthPx = Math.sqrt(dx * dx + dy * dy);

            let node1Id = null, node2Id = null;
            nodes.forEach(function (node) {
                const d1 = Math.sqrt(Math.pow(node.x - road.x1, 2) + Math.pow(node.y - road.y1, 2));
                const d2 = Math.sqrt(Math.pow(node.x - road.x2, 2) + Math.pow(node.y - road.y2, 2));
                if (d1 < 30) node1Id = node.id;
                if (d2 < 30) node2Id = node.id;
            });

            if (node1Id !== null && node2Id !== null) {
                const capacity = (road.capacity || ROAD_BASE_CAPACITY) * capMult;
                const lanes = road.lanes || 2;
                const edge1 = {
                    from: node1Id,
                    to: node2Id,
                    lengthPx: lengthPx,
                    capacity: capacity * lanes,
                    lanes: lanes,
                    flow: 0,
                    density: 0
                };
                const edge2 = {
                    from: node2Id,
                    to: node1Id,
                    lengthPx: lengthPx,
                    capacity: capacity * lanes,
                    lanes: lanes,
                    flow: 0,
                    density: 0
                };
                nodes[node1Id].edges.push(edge1);
                nodes[node2Id].edges.push(edge2);
            }
        });

        nodes.forEach(function (node, i) {
            nodes.forEach(function (other, j) {
                if (i === j) return;
                if (node.type !== 'city' || other.type !== 'city') return;

                const dx = other.x - node.x;
                const dy = other.y - node.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let hasEdge = false;
                node.edges.forEach(function (e) {
                    if (e.to === other.id) hasEdge = true;
                });

                if (!hasEdge && dist < 200) {
                    const capacity = ROAD_BASE_CAPACITY * 1.5 * capMult;
                    node.edges.push({
                        from: node.id,
                        to: other.id,
                        lengthPx: dist,
                        capacity: capacity,
                        lanes: 2,
                        flow: 0,
                        density: 0
                    });
                }
            });
        });

        return { nodes: nodes, nodeMap: nodeMap };
    }

    function dijkstra(graph, sourceId) {
        const dist = {};
        const prev = {};
        const visited = {};
        const nodes = graph.nodes;

        nodes.forEach(function (node) {
            dist[node.id] = Infinity;
            prev[node.id] = null;
            visited[node.id] = false;
        });
        dist[sourceId] = 0;

        while (true) {
            let minDist = Infinity;
            let currentId = null;

            nodes.forEach(function (node) {
                if (!visited[node.id] && dist[node.id] < minDist) {
                    minDist = dist[node.id];
                    currentId = node.id;
                }
            });

            if (currentId === null) break;
            visited[currentId] = true;

            const currentNode = nodes[currentId];
            currentNode.edges.forEach(function (edge) {
                if (visited[edge.to]) return;
                const alt = dist[currentId] + edge.lengthPx;
                if (alt < dist[edge.to]) {
                    dist[edge.to] = alt;
                    prev[edge.to] = { from: currentId, edge: edge };
                }
            });
        }

        return { dist: dist, prev: prev };
    }

    function findNearestShelter(graph, cityNodeId) {
        const nodes = graph.nodes;
        let nearestShelterId = null;
        let minDist = Infinity;
        let shortestPath = null;

        nodes.forEach(function (node) {
            if (node.type !== 'shelter') return;

            const result = dijkstra(graph, cityNodeId);
            const dist = result.dist[node.id];

            if (dist < minDist) {
                minDist = dist;
                nearestShelterId = node.id;

                const path = [];
                let curr = node.id;
                while (result.prev[curr]) {
                    path.unshift(result.prev[curr].edge);
                    curr = result.prev[curr].from;
                }
                shortestPath = path;
            }
        });

        return {
            shelterId: nearestShelterId,
            distancePx: minDist,
            path: shortestPath
        };
    }

    function calculateEvacuationPlan(cities, shelters, roads, scale, warningTimeMinutes, roadCapacityMultiplier, vehicleSpeedKmh) {
        const capMult = roadCapacityMultiplier !== undefined ? roadCapacityMultiplier : 1;
        const vehSpeed = vehicleSpeedKmh !== undefined ? vehicleSpeedKmh : VEHICLE_SPEED_KMH;

        const graph = buildEvacuationGraph(cities, shelters, roads, capMult);
        const nodes = graph.nodes;
        const roadUsage = {};
        const cityPlans = [];
        let totalPopulation = 0;
        let totalEvacuated = 0;
        let totalStranded = 0;

        const warningTimeHours = warningTimeMinutes / 60;

        cities.forEach(function (city, cityIdx) {
            const cityNodeId = graph.nodeMap['city_' + cityIdx];
            const cityNode = nodes[cityNodeId];
            totalPopulation += city.population;

            const nearest = findNearestShelter(graph, cityNodeId);

            if (!nearest.path || nearest.path.length === 0) {
                cityPlans.push({
                    cityIndex: cityIdx,
                    population: city.population,
                    shelterId: null,
                    distanceKm: 0,
                    path: [],
                    evacuated: 0,
                    stranded: city.population,
                    travelTimeHours: Infinity
                });
                totalStranded += city.population;
                return;
            }

            let totalLengthPx = 0;
            nearest.path.forEach(function (edge) {
                totalLengthPx += edge.lengthPx;
            });
            const distanceKm = totalLengthPx / scale;
            const travelTimeHours = distanceKm / vehSpeed;

            const canEvacuate = travelTimeHours <= warningTimeHours;

            let roadCapacityFactor = 1;
            let minCapacityRatio = 1;
            nearest.path.forEach(function (edge) {
                const capacityPerHour = edge.capacity * PEOPLE_PER_VEHICLE;
                const requiredFlow = city.population / travelTimeHours;
                const ratio = capacityPerHour / requiredFlow;
                if (ratio < minCapacityRatio) minCapacityRatio = ratio;
            });
            roadCapacityFactor = Math.min(1, minCapacityRatio);

            let evacuated;
            if (canEvacuate) {
                evacuated = Math.floor(city.population * Math.min(1, roadCapacityFactor * 0.8));
            } else {
                const timeRatio = warningTimeHours / travelTimeHours;
                evacuated = Math.floor(city.population * timeRatio * Math.min(1, roadCapacityFactor * 0.8));
            }
            const stranded = city.population - evacuated;

            nearest.path.forEach(function (edge) {
                const key = edge.from + '_' + edge.to;
                const reverseKey = edge.to + '_' + edge.from;
                if (!roadUsage[key]) {
                    roadUsage[key] = {
                        edge: edge,
                        totalFlow: 0,
                        density: 0
                    };
                }
                roadUsage[key].totalFlow += evacuated;
                roadUsage[key].density = roadUsage[key].totalFlow / (edge.capacity * PEOPLE_PER_VEHICLE);

                if (roadUsage[reverseKey]) {
                    roadUsage[key].density += roadUsage[reverseKey].totalFlow / (edge.capacity * PEOPLE_PER_VEHICLE) * 0.3;
                }
            });

            totalEvacuated += evacuated;
            totalStranded += stranded;

            cityPlans.push({
                cityIndex: cityIdx,
                population: city.population,
                shelterId: nearest.shelterId,
                distanceKm: distanceKm,
                path: nearest.path,
                evacuated: evacuated,
                stranded: stranded,
                travelTimeHours: travelTimeHours,
                canEvacuate: canEvacuate
            });
        });

        const roadDensities = [];
        Object.keys(roadUsage).forEach(function (key) {
            const usage = roadUsage[key];
            roadDensities.push({
                edge: usage.edge,
                density: Math.min(2, usage.density),
                flow: usage.totalFlow
            });
        });

        return {
            graph: graph,
            cityPlans: cityPlans,
            roadDensities: roadDensities,
            totalPopulation: totalPopulation,
            totalEvacuated: totalEvacuated,
            totalStranded: totalStranded,
            evacuationRate: totalPopulation > 0 ? totalEvacuated / totalPopulation : 0,
            strandedRate: totalPopulation > 0 ? totalStranded / totalPopulation : 0
        };
    }

    function generateShelters(width, height, count) {
        const shelters = [];
        const n = count || 3;
        const centerX = width / 2;
        const centerY = height / 2;

        for (let i = 0; i < n; i++) {
            const angle = (i / n) * Math.PI * 2 + Math.PI / 6;
            const dist = Math.min(width, height) * (0.35 + Math.random() * 0.1);
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            shelters.push({
                id: i,
                x: Math.max(50, Math.min(width - 50, x)),
                y: Math.max(50, Math.min(height - 50, y)),
                capacity: 500000 + Math.floor(Math.random() * 500000),
                name: '避难所 #' + (i + 1)
            });
        }

        return shelters;
    }

    function generateRoadNetwork(width, height, cities, shelters) {
        const roads = [];
        const allNodes = [];

        cities.forEach(function (city, i) {
            allNodes.push({ x: city.x, y: city.y, type: 'city', index: i });
        });

        shelters.forEach(function (shelter, i) {
            allNodes.push({ x: shelter.x, y: shelter.y, type: 'shelter', index: i });
        });

        for (let i = 0; i < allNodes.length; i++) {
            const distances = [];
            for (let j = 0; j < allNodes.length; j++) {
                if (i === j) continue;
                const dx = allNodes[j].x - allNodes[i].x;
                const dy = allNodes[j].y - allNodes[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                distances.push({ index: j, dist: dist });
            }
            distances.sort(function (a, b) { return a.dist - b.dist; });

            const connectCount = allNodes[i].type === 'shelter' ? 4 : 2;
            for (let k = 0; k < Math.min(connectCount, distances.length); k++) {
                const j = distances[k].index;
                if (j <= i) continue;

                let exists = false;
                roads.forEach(function (r) {
                    if ((r.x1 === allNodes[i].x && r.y1 === allNodes[i].y && r.x2 === allNodes[j].x && r.y2 === allNodes[j].y) ||
                        (r.x2 === allNodes[i].x && r.y2 === allNodes[i].y && r.x1 === allNodes[j].x && r.y1 === allNodes[j].y)) {
                        exists = true;
                    }
                });

                if (!exists) {
                    const isShelterRoad = allNodes[i].type === 'shelter' || allNodes[j].type === 'shelter';
                    roads.push({
                        x1: allNodes[i].x,
                        y1: allNodes[i].y,
                        x2: allNodes[j].x,
                        y2: allNodes[j].y,
                        capacity: isShelterRoad ? ROAD_BASE_CAPACITY * 2 : ROAD_BASE_CAPACITY,
                        lanes: isShelterRoad ? 4 : 2,
                        isShelterAccess: isShelterRoad
                    });
                }
            }
        }

        return roads;
    }

    global.Physics = {
        BOMB_TYPES: BOMB_TYPES,
        ZONE_PRIORITY: ZONE_PRIORITY,
        TERRAIN_FEATURE_TYPES: TERRAIN_FEATURE_TYPES,
        TERRAIN_PRESETS: TERRAIN_PRESETS,
        ZONE_ALTITUDE_SENSITIVITY: ZONE_ALTITUDE_SENSITIVITY,
        ROAD_BASE_CAPACITY: ROAD_BASE_CAPACITY,
        VEHICLE_SPEED_KMH: VEHICLE_SPEED_KMH,
        PEOPLE_PER_VEHICLE: PEOPLE_PER_VEHICLE,
        BUILDING_TYPES: BUILDING_TYPES,
        BUILDING_TYPE_ORDER: BUILDING_TYPE_ORDER,
        DAMAGE_LEVELS: DAMAGE_LEVELS,
        calculateRadii: calculateRadii,
        generateCities: generateCities,
        generateBuildingDistribution: generateBuildingDistribution,
        generateRoads: generateRoads,
        generateRoadNetwork: generateRoadNetwork,
        generateShelters: generateShelters,
        buildEvacuationGraph: buildEvacuationGraph,
        dijkstra: dijkstra,
        findNearestShelter: findNearestShelter,
        calculateEvacuationPlan: calculateEvacuationPlan,
        generateTerrainFeatures: generateTerrainFeatures,
        getElevationAt: getElevationAt,
        calculatePathAttenuation: calculatePathAttenuation,
        calculateEffectiveRadius: calculateEffectiveRadius,
        generateTerrainBoundaryPolygon: generateTerrainBoundaryPolygon,
        calculateShockwaveRadiusAtAngle: calculateShockwaveRadiusAtAngle,
        checkPointInAnyZoneTerrainAware: checkPointInAnyZoneTerrainAware,
        getBuildingDamageLevel: getBuildingDamageLevel,
        getOverpressureAtDistance: getOverpressureAtDistance,
        calculateBuildingCasualties: calculateBuildingCasualties,
        calculateCityBuildingDamage: calculateCityBuildingDamage,
        calculateAllCitiesBuildingDamage: calculateAllCitiesBuildingDamage,
        calculateAvgStructureFactor: calculateAvgStructureFactor,
        calculateCasualties: calculateCasualties,
        calculateCombinedCasualties: calculateCombinedCasualties,
        calculateCasualtiesTerrainAware: calculateCasualtiesTerrainAware,
        getWorstZoneForCity: getWorstZoneForCity,
        getWorstZoneForCityTerrain: getWorstZoneForCityTerrain,
        calculateEnergy: calculateEnergy,
        calculateTotalEnergy: calculateTotalEnergy,
        calculateAffectedArea: calculateAffectedArea,
        calculateCombinedArea: calculateCombinedArea,
        calculateTotalAreaSum: calculateTotalAreaSum,
        calculateOverlapArea: calculateOverlapArea,
        calculateAllCombinedStats: calculateAllCombinedStats,
        calculateCombinedAreaPerZone: calculateCombinedAreaPerZone,
        mulberry32: mulberry32
    };

})(window);
