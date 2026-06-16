(function (global) {
    'use strict';

    let audioContext = null;
    let masterGain = null;
    let isInitialized = false;

    function initAudio() {
        if (isInitialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            masterGain = audioContext.createGain();
            masterGain.gain.value = 0.5;
            masterGain.connect(audioContext.destination);
            isInitialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    function ensureAudio() {
        if (!audioContext) initAudio();
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        return audioContext;
    }

    function createExplosionSoundLayer(ctx, dest, startTime, options) {
        const {
            frequencyStart,
            frequencyEnd,
            duration,
            type,
            startGain,
            endGain,
            attack,
            release,
            filterFreq,
            filterQ
        } = options;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        let filter = null;

        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(frequencyStart, startTime);
        osc.frequency.exponentialRampToValueAtTime(
            Math.max(0.1, frequencyEnd),
            startTime + duration
        );

        const peakTime = startTime + attack;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(startGain, peakTime);
        gain.gain.setValueAtTime(startGain, startTime + duration - release);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, endGain), startTime + duration);

        if (filterFreq) {
            filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(filterFreq, startTime);
            filter.frequency.exponentialRampToValueAtTime(
                Math.max(10, filterFreq * 0.3),
                startTime + duration
            );
            if (filterQ) filter.Q.value = filterQ;
            osc.connect(filter);
            filter.connect(gain);
        } else {
            osc.connect(gain);
        }

        gain.connect(dest);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);

        return { osc, gain, filter };
    }

    function createNoiseBuffer(ctx, duration) {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.5);
        }
        return buffer;
    }

    function createNoiseLayer(ctx, dest, startTime, options) {
        const {
            duration,
            startGain,
            endGain,
            filterFreq,
            filterType,
            attack
        } = options;

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = createNoiseBuffer(ctx, duration + 1);

        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = filterType || 'bandpass';
        filter.frequency.setValueAtTime(filterFreq, startTime);
        filter.frequency.exponentialRampToValueAtTime(
            Math.max(50, filterFreq * 0.2),
            startTime + duration
        );
        filter.Q.value = 3;

        const peakTime = startTime + (attack || 0.05);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(startGain, peakTime);
        gain.gain.setValueAtTime(startGain, startTime + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, endGain), startTime + duration);

        noiseSource.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        noiseSource.start(startTime);
        noiseSource.stop(startTime + duration + 0.2);

        return { noiseSource, gain, filter };
    }

    function playExplosionSound(intensity) {
        const ctx = ensureAudio();
        if (!ctx) return null;

        const now = ctx.currentTime;
        const explosionGroup = ctx.createGain();
        explosionGroup.connect(masterGain);
        explosionGroup.gain.value = 0.8 + intensity * 0.4;

        const layers = [];

        layers.push(createExplosionSoundLayer(ctx, explosionGroup, now, {
            frequencyStart: 150,
            frequencyEnd: 20,
            duration: 0.3,
            type: 'sine',
            startGain: 0.6,
            endGain: 0.01,
            attack: 0.01,
            release: 0.15
        }));

        layers.push(createExplosionSoundLayer(ctx, explosionGroup, now, {
            frequencyStart: 80,
            frequencyEnd: 15,
            duration: 0.8,
            type: 'triangle',
            startGain: 0.4,
            endGain: 0.005,
            attack: 0.02,
            release: 0.4
        }));

        layers.push(createNoiseLayer(ctx, explosionGroup, now, {
            duration: 0.4,
            startGain: 0.5,
            endGain: 0.01,
            filterFreq: 3000,
            filterType: 'highpass',
            attack: 0.005
        }));

        layers.push(createNoiseLayer(ctx, explosionGroup, now + 0.05, {
            duration: 1.5,
            startGain: 0.35,
            endGain: 0.008,
            filterFreq: 500,
            filterType: 'lowpass',
            attack: 0.05
        }));

        layers.push(createExplosionSoundLayer(ctx, explosionGroup, now + 0.1, {
            frequencyStart: 40,
            frequencyEnd: 10,
            duration: 2.5,
            type: 'sine',
            startGain: 0.3,
            endGain: 0.003,
            attack: 0.1,
            release: 1.0,
            filterFreq: 80,
            filterQ: 2
        }));

        return {
            ctx: ctx,
            group: explosionGroup,
            layers: layers,
            startTime: now
        };
    }

    function playShockwaveSound(distance, intensity) {
        const ctx = ensureAudio();
        if (!ctx) return null;

        const now = ctx.currentTime;
        const delay = Math.min(distance * 0.03, 3.0);
        const playTime = now + delay;

        const shockwaveGroup = ctx.createGain();
        shockwaveGroup.connect(masterGain);

        const distanceFactor = Math.max(0.1, 1 - distance / 200);
        shockwaveGroup.gain.value = (0.4 + intensity * 0.3) * distanceFactor;

        const layers = [];

        layers.push(createExplosionSoundLayer(ctx, shockwaveGroup, playTime, {
            frequencyStart: 120,
            frequencyEnd: 25,
            duration: 0.8,
            type: 'triangle',
            startGain: 0.5,
            endGain: 0.01,
            attack: 0.05,
            release: 0.4,
            filterFreq: 400,
            filterQ: 1.5
        }));

        layers.push(createNoiseLayer(ctx, shockwaveGroup, playTime, {
            duration: 1.2,
            startGain: 0.25,
            endGain: 0.005,
            filterFreq: 200,
            filterType: 'lowpass',
            attack: 0.1
        }));

        return {
            ctx: ctx,
            group: shockwaveGroup,
            layers: layers,
            startTime: playTime
        };
    }

    function playQuakeSound(intensity, delay) {
        const ctx = ensureAudio();
        if (!ctx) return null;

        const now = ctx.currentTime;
        const playTime = now + (delay || 0);

        const quakeGroup = ctx.createGain();
        quakeGroup.connect(masterGain);
        quakeGroup.gain.value = 0.3 + intensity * 0.3;

        const layers = [];

        layers.push(createExplosionSoundLayer(ctx, quakeGroup, playTime, {
            frequencyStart: 50,
            frequencyEnd: 12,
            duration: 3.0,
            type: 'sine',
            startGain: 0.25,
            endGain: 0.003,
            attack: 0.2,
            release: 1.5,
            filterFreq: 60,
            filterQ: 2
        }));

        layers.push(createExplosionSoundLayer(ctx, quakeGroup, playTime + 0.3, {
            frequencyStart: 30,
            frequencyEnd: 8,
            duration: 4.0,
            type: 'triangle',
            startGain: 0.15,
            endGain: 0.002,
            attack: 0.3,
            release: 2.0,
            filterFreq: 40,
            filterQ: 3
        }));

        layers.push(createNoiseLayer(ctx, quakeGroup, playTime + 0.2, {
            duration: 2.5,
            startGain: 0.1,
            endGain: 0.002,
            filterFreq: 80,
            filterType: 'lowpass',
            attack: 0.3
        }));

        return {
            ctx: ctx,
            group: quakeGroup,
            layers: layers,
            startTime: playTime
        };
    }

    function playFlashSound() {
        const ctx = ensureAudio();
        if (!ctx) return null;

        const now = ctx.currentTime;

        const flashGroup = ctx.createGain();
        flashGroup.connect(masterGain);
        flashGroup.gain.value = 0.6;

        const layers = [];

        layers.push(createExplosionSoundLayer(ctx, flashGroup, now, {
            frequencyStart: 8000,
            frequencyEnd: 1000,
            duration: 0.15,
            type: 'sawtooth',
            startGain: 0.15,
            endGain: 0.001,
            attack: 0.001,
            release: 0.1
        }));

        layers.push(createNoiseLayer(ctx, flashGroup, now, {
            duration: 0.2,
            startGain: 0.2,
            endGain: 0.001,
            filterFreq: 8000,
            filterType: 'highpass',
            attack: 0.001
        }));

        return {
            ctx: ctx,
            group: flashGroup,
            layers: layers,
            startTime: now
        };
    }

    function playDebrisSound(intensity) {
        const ctx = ensureAudio();
        if (!ctx) return null;

        const now = ctx.currentTime;
        const debrisGroup = ctx.createGain();
        debrisGroup.connect(masterGain);
        debrisGroup.gain.value = 0.2 + intensity * 0.15;

        const layers = [];

        for (let i = 0; i < 5; i++) {
            const delay = 0.3 + Math.random() * 0.8;
            const freq = 2000 + Math.random() * 3000;
            layers.push(createExplosionSoundLayer(ctx, debrisGroup, now + delay, {
                frequencyStart: freq,
                frequencyEnd: freq * 0.5,
                duration: 0.1 + Math.random() * 0.1,
                type: 'square',
                startGain: 0.05 + Math.random() * 0.05,
                endGain: 0.001,
                attack: 0.005,
                release: 0.08
            }));
        }

        return {
            ctx: ctx,
            group: debrisGroup,
            layers: layers,
            startTime: now + 0.3
        };
    }

    function setMasterVolume(volume) {
        if (masterGain) {
            masterGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    function playExplosionAudioSequence(intensity, maxRadius) {
        const sounds = {};

        sounds.flash = playFlashSound();

        setTimeout(() => {
            sounds.explosion = playExplosionSound(intensity);
        }, 50);

        const shockwaveDelay = Math.min(maxRadius * 10, 3000);
        setTimeout(() => {
            sounds.shockwave = playShockwaveSound(0, intensity);
        }, shockwaveDelay);

        const quakeDelay = shockwaveDelay + 400;
        setTimeout(() => {
            sounds.quake = playQuakeSound(intensity, 0);
        }, quakeDelay);

        setTimeout(() => {
            sounds.debris = playDebrisSound(intensity);
        }, shockwaveDelay + 800);

        return sounds;
    }

    global.AudioManager = {
        init: initAudio,
        playExplosionSound: playExplosionSound,
        playShockwaveSound: playShockwaveSound,
        playQuakeSound: playQuakeSound,
        playFlashSound: playFlashSound,
        playDebrisSound: playDebrisSound,
        playExplosionAudioSequence: playExplosionAudioSequence,
        setMasterVolume: setMasterVolume
    };

})(window);
