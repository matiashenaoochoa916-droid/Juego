'use strict';
/* =========================================================
   SOFÍA PLUS ÁLVAREZ · OBBY SENA
   Motor completo: personaje articulado, personalización,
   5 niveles, checkpoints, agarraderas, portales y más.
   ========================================================= */

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SENA = { verde: '#39A900', verdeClaro: '#7ddc1f', azul: '#00304D', azulMedio: '#0a5a8a', cyan: '#50E5F9', amarillo: '#FDC300', naranja: '#FF8A00', rojo: '#ff2e63' };

function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return `rgb(${r},${g},${b})`;
}
function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

/* ---------- opciones de personalización ---------- */
const OPT = {
    skin: ['#ffdbb4', '#f1c27d', '#e0ac69', '#c68642', '#a86b3c', '#8d5524', '#5c3a1e', '#fde7d9'],
    hairStyle: ['Corto', 'Largo', 'Cola', 'Afro', 'Rapado', 'Mohicano', 'Rizos'],
    hairColor: ['#1b1b1b', '#4a2c17', '#8b5a2b', '#d9a441', '#c0392b', '#2e86de', '#39A900', '#e84393'],
    uniform: [
        { n: 'Azul oscuro', c: '#00304D', a: '#39A900', p: '#001e33' },
        { n: 'Verde SENA', c: '#39A900', a: '#00304D', p: '#00304D' },
        { n: 'Negro', c: '#171a20', a: '#39A900', p: '#0a0c10' }
    ],
    glasses: ['Ninguna', 'Redondas', 'De sol', 'Cuadradas', 'Corazón'],
    hat: ['Ninguno', 'Gorra', 'Vueltiao', 'Gorro', 'Casco', 'Sombrero copa'],
    pet: ['Ninguna', 'Perro', 'Gato', 'Loro', 'Robot', 'Slime']
};
const DEFAULT = { name: 'Sofía', skin: 1, hairStyle: 2, hairColor: 1, uniform: 0, glasses: 0, hat: 0, pet: 1 };
const PRESETS = [
    { name: 'Sofía', skin: 1, hairStyle: 2, hairColor: 1, uniform: 0, glasses: 0, hat: 0, pet: 1 },
    { name: 'Álvarez', skin: 3, hairStyle: 0, hairColor: 0, uniform: 2, glasses: 2, hat: 1, pet: 0 },
    { name: 'Camila', skin: 0, hairStyle: 1, hairColor: 3, uniform: 1, glasses: 1, hat: 0, pet: 3 },
    { name: 'Juan', skin: 4, hairStyle: 5, hairColor: 6, uniform: 0, glasses: 3, hat: 4, pet: 4 },
    { name: 'Valentina', skin: 2, hairStyle: 6, hairColor: 2, uniform: 1, glasses: 4, hat: 3, pet: 5 },
    { name: 'Mateo', skin: 5, hairStyle: 3, hairColor: 0, uniform: 2, glasses: 0, hat: 2, pet: 2 }
];
const LOOK_KEYS = ['skin', 'hairStyle', 'hairColor', 'uniform', 'glasses', 'hat', 'pet'];

let profile = { ...DEFAULT };
let maxLevel = 1;
try {
    const s = JSON.parse(localStorage.getItem('sofiaPlusAlvarez') || 'null');
    if (s) { profile = { ...DEFAULT, ...s.profile }; maxLevel = s.maxLevel || 1; }
} catch (e) { }
function sanitize() {
    for (const k of LOOK_KEYS) {
        const len = (OPT[k] || []).length;
        if (typeof profile[k] !== 'number' || profile[k] < 0 || profile[k] >= len) profile[k] = DEFAULT[k];
    }
    if (!profile.name || typeof profile.name !== 'string') profile.name = 'Jugador';
}
sanitize();
function save() { try { localStorage.setItem('sofiaPlusAlvarez', JSON.stringify({ profile, maxLevel })); } catch (e) { } }

/* ---------- audio ---------- */
let AC = null, muted = false;
function audio() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
}
function beep(f = 440, d = .12, type = 'square', v = .045, slide = 0, delay = 0) {
    if (muted) return; const a = audio(); if (!a) return;
    try {
        const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
        const startFreq = Math.max(30, f);
        o.type = type; o.frequency.setValueAtTime(startFreq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, startFreq + slide), t + d);
        g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .03);
    } catch (e) { }
}
const SFX = {
    jump: () => beep(360, .15, 'square', .035, 420),
    land: () => beep(120, .07, 'triangle', .05, -40),
    grab: () => beep(700, .08, 'triangle', .05, 300),
    boing: () => beep(200, .3, 'sine', .08, 900),
    die: () => { beep(420, .4, 'sawtooth', .05, -330); beep(90, .35, 'square', .05, -40, .05); },
    check: () => [523, 659, 784, 1046].forEach((f, i) => beep(f, .16, 'triangle', .06, 0, i * .08)),
    portal: () => { for (let i = 0; i < 8; i++) beep(300 + i * 110, .18, 'sine', .05, 200, i * .05); },
    click: () => beep(620, .06, 'triangle', .05, 160),
    start: () => [392, 523, 659, 784].forEach((f, i) => beep(f, .2, 'square', .04, 0, i * .09)),
    tick: () => beep(520, .14, 'square', .05),
    go: () => beep(1040, .4, 'square', .06, 400),
    crumble: () => beep(140, .12, 'sawtooth', .03, -60),
    win: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => beep(f, .22, 'triangle', .06, 0, i * .12))
};

/* =========================================================
   PERSONAJE ARTICULADO
   ========================================================= */
function limb(c, x, y, a, k, L1, L2, w1, w2, c1, c2) {
    const x1 = x + Math.sin(a) * L1, y1 = y + Math.cos(a) * L1;
    const a2 = a - k, x2 = x1 + Math.sin(a2) * L2, y2 = y1 + Math.cos(a2) * L2;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = w1; c.strokeStyle = c1; c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y1); c.stroke();
    c.lineWidth = w2; c.strokeStyle = c2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    return { x1, y1, x2, y2, a2 };
}
function heart(c, x, y, s) {
    c.beginPath(); c.moveTo(x, y + s * .9);
    c.bezierCurveTo(x - s * 1.7, y - s * .2, x - s * .8, y - s * 1.4, x, y - s * .5);
    c.bezierCurveTo(x + s * .8, y - s * 1.4, x + s * 1.7, y - s * .2, x, y + s * .9); c.fill();
}

function hairBack(c, st, hc, t, state) {
    c.fillStyle = hc;
    if (st === 1) { rr(c, -12.5, -53, 13.5, 28, 5); c.fill(); }
    else if (st === 2) {
        const sw = Math.sin(t * (state === 'run' ? 13 : 3)) * .3 + (state === 'run' ? .25 : 0);
        c.save(); c.translate(-8, -52); c.rotate(.95 + sw);
        c.beginPath(); c.ellipse(0, 9, 4.6, 10.5, 0, 0, TAU); c.fill(); c.restore();
    }
    else if (st === 3) { c.beginPath(); c.arc(-.5, -49, 14.5, 0, TAU); c.fill(); }
}
function hairFront(c, st, hc, skinD) {
    c.fillStyle = hc;
    const cap = (rx, ry) => { c.beginPath(); c.ellipse(1.5, -47, rx, ry, 0, Math.PI, TAU); c.fill(); };
    switch (st) {
        case 0: cap(10.4, 10.2); c.fillRect(-9, -47.5, 3.2, 6); c.beginPath(); c.moveTo(11, -47); c.quadraticCurveTo(7, -53, -1, -51); c.lineTo(3, -47); c.fill(); break;
        case 1: cap(10.4, 10.4); c.fillRect(-9, -47.5, 3.2, 8); break;
        case 2: cap(10.4, 10.2); c.fillRect(-9, -47.5, 3, 5); c.fillStyle = SENA.verde; c.beginPath(); c.arc(-8, -52, 2.6, 0, TAU); c.fill(); break;
        case 3: cap(10.4, 10.6); break;
        case 4: c.strokeStyle = hc; c.globalAlpha = .55; c.lineWidth = 2; c.beginPath(); c.ellipse(1.5, -47, 9.8, 9.8, 0, Math.PI * 1.02, Math.PI * 1.98); c.stroke(); c.globalAlpha = 1; break;
        case 5:
            c.globalAlpha = .45; cap(9.8, 9.6); c.globalAlpha = 1;
            for (let i = 0; i < 5; i++) { const x = -5 + i * 3.6; c.beginPath(); c.moveTo(x - 2.2, -54.5); c.lineTo(x + .2, -64 - (i % 2) * 2.5); c.lineTo(x + 2.4, -54.5); c.fill(); }
            break;
        case 6:
            cap(10.2, 10);
            for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; c.beginPath(); c.arc(1.5 + Math.cos(a) * 10, -47 + Math.sin(a) * 10, 4.3, 0, TAU); c.fill(); }
            break;
    }
}
function drawHat(c, h, acc) {
    switch (h) {
        case 1: // gorra
            c.fillStyle = acc; c.beginPath(); c.ellipse(1.5, -50.5, 10.9, 9, 0, Math.PI, TAU); c.fill();
            c.fillStyle = shade(acc, -.28); rr(c, 4, -52.6, 15, 3.4, 1.7); c.fill();
            c.fillStyle = '#fff'; c.beginPath(); c.arc(2, -57, 1.4, 0, TAU); c.fill(); break;
        case 2: // sombrero vueltiao
            c.fillStyle = '#f1e1b0'; c.beginPath(); c.ellipse(1.5, -53, 17.5, 4.6, 0, 0, TAU); c.fill();
            c.strokeStyle = '#222'; c.lineWidth = 1; c.beginPath(); c.ellipse(1.5, -53, 14.5, 3.4, 0, 0, TAU); c.stroke();
            c.fillStyle = '#f1e1b0'; rr(c, -6.5, -63, 16, 11, 3.5); c.fill();
            c.fillStyle = '#222'; c.fillRect(-6.5, -55.5, 16, 2.6); c.fillRect(-6.5, -60.2, 16, 1.2); c.fillRect(-6.5, -58, 16, 1.2); break;
        case 3: // gorro de lana
            c.fillStyle = acc; c.beginPath(); c.ellipse(1.5, -50.5, 10.7, 10.8, 0, Math.PI, TAU); c.fill();
            c.fillStyle = shade(acc, -.3); rr(c, -9.4, -52.8, 22, 4.6, 2); c.fill();
            c.fillStyle = '#fff'; c.beginPath(); c.arc(1.5, -62, 3.8, 0, TAU); c.fill(); break;
        case 4: // casco de seguridad
            c.fillStyle = '#FDC300'; c.beginPath(); c.ellipse(1.5, -51, 11.6, 10, 0, Math.PI, TAU); c.fill();
            c.fillStyle = '#d99f00'; c.fillRect(0, -61, 3.2, 8); rr(c, -11, -52.6, 25, 3.2, 1.6); c.fill();
            c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-3, -56, 3, 1.4, -.6, 0, TAU); c.fill(); break;
        case 5: // sombrero de copa
            c.fillStyle = '#14171c'; rr(c, -6.5, -73, 16, 20, 2.5); c.fill();
            c.fillStyle = acc; c.fillRect(-6.5, -60, 16, 4); c.fillStyle = '#14171c';
            c.beginPath(); c.ellipse(1.5, -53.5, 13.5, 3.4, 0, 0, TAU); c.fill(); break;
    }
}
function drawGlasses(c, g) {
    const eyes = [[4.2, -46.6], [8.8, -46.6]];
    switch (g) {
        case 1: c.strokeStyle = '#111'; c.lineWidth = 1.3; eyes.forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 3.4, 0, TAU); c.stroke(); });
            c.beginPath(); c.moveTo(7.4, -47); c.lineTo(5.6, -47); c.moveTo(.8, -46.8); c.lineTo(-4.6, -46); c.stroke(); break;
        case 2: c.fillStyle = '#0a0a0a'; rr(c, .6, -49.4, 6.4, 5.4, 2); c.fill(); rr(c, 6.3, -49.4, 6.4, 5.4, 2); c.fill();
            c.fillStyle = 'rgba(80,229,249,.55)'; c.fillRect(2, -48.6, 1.6, 2.4); c.fillRect(7.7, -48.6, 1.6, 2.4);
            c.strokeStyle = '#0a0a0a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(.6, -47.6); c.lineTo(-4.6, -46.4); c.stroke(); break;
        case 3: c.strokeStyle = SENA.verde; c.lineWidth = 1.5; c.strokeRect(.9, -49.4, 6, 5.2); c.strokeRect(6.5, -49.4, 6, 5.2);
            c.beginPath(); c.moveTo(.9, -47); c.lineTo(-4.6, -46.2); c.stroke(); break;
        case 4: c.fillStyle = '#ff4f9a'; heart(c, 4.3, -46.4, 3); heart(c, 9, -46.4, 3);
            c.strokeStyle = '#ff4f9a'; c.lineWidth = 1; c.beginPath(); c.moveTo(.5, -47); c.lineTo(-4.6, -46.2); c.stroke(); break;
    }
}

function drawChar(c, look, pose, x, y, face, s) {
    s = s || 1;
    const t = pose.t || 0, st = pose.state || 'idle';
    const U = OPT.uniform[look.uniform], skin = OPT.skin[look.skin], skinD = shade(skin, -.2), hc = OPT.hairColor[look.hairColor];
    const shirt = U.c, acc = U.a, pants = U.p;
    let aA = 0, kA = 0, aB = 0, kB = 0, sA = 0, eA = 0, sB = 0, eB = 0, bob = 0, lean = 0, open = false, lookY = 0;
    switch (st) {
        case 'run': {
            const p = t * 13;
            aA = Math.sin(p) * .85; aB = -aA;
            kA = .2 + .9 * Math.max(0, Math.cos(p)); kB = .2 + .9 * Math.max(0, -Math.cos(p));
            sA = -Math.sin(p) * .95; sB = -sA; eA = .75; eB = .75;
            bob = -Math.abs(Math.sin(p)) * 2.2; lean = .13; break;
        }
        case 'jump': aA = .75; kA = 1; aB = -.25; kB = .6; sA = 2.55; sB = 2.1; eA = .2; eB = .3; lean = .05; lookY = -.8; open = true; break;
        case 'fall': aA = .35; kA = .3; aB = -.3; kB = .35; sA = 1.6 + Math.sin(t * 14) * .2; sB = 1.2 - Math.sin(t * 14) * .2; eA = .2; eB = .2; open = true; lookY = .5; break;
        case 'hang': {
            const mv = pose.moving, sw = Math.sin(t * (mv ? 9 : 2.5)) * (mv ? .5 : .12);
            sA = Math.PI - .1; sB = Math.PI + .1; aA = .12 + sw; aB = -.12 - sw * .8; kA = .3 + Math.abs(sw); kB = .3; lookY = -.6; break;
        }
        case 'wave': aA = .05; aB = -.05; sA = .1; eA = .2; sB = 2.55 + Math.sin(t * 11) * .35; eB = -.4; bob = Math.sin(t * 3) * .8; break;
        case 'dance': {
            const d = Math.sin(t * 8); aA = d * .5; aB = -d * .5; kA = .4 + Math.abs(d) * .5; kB = .4 + Math.abs(d) * .5;
            sA = 2.7 + d * .5; sB = 2.7 - d * .5; eA = .3; eB = .3; bob = -Math.abs(d) * 3.4; lean = d * .08; break;
        }
        default: bob = Math.sin(t * 3) * .8; sA = .08 + Math.sin(t * 3) * .05; sB = -.08; eA = .15; eB = .15; aA = .05; aB = -.05; kA = .05; kB = .05;
    }
    const blink = (t % 3.3) < .12;
    c.save(); c.translate(x, y); c.scale(face * s, s); c.translate(0, bob);
    // piernas
    const shoe = (e, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(e.x2 + 2.8, e.y2 + .5, 5.8, 3.1, 0, 0, TAU); c.fill(); c.fillStyle = acc; c.fillRect(e.x2 - 2.5, e.y2 + 2.3, 11, 1.2); };
    shoe(limb(c, 0, -20, aB, kB, 10, 10, 7.5, 7, shade(pants, -.3), shade(pants, -.3)), '#cfd8dc');
    shoe(limb(c, 0, -20, aA, kA, 10, 10, 7.5, 7, pants, pants), '#ffffff');
    // cuerpo superior
    c.save(); c.translate(0, -20); c.rotate(lean); c.translate(0, 20);
    const arm = (a, e, col, sk) => { const q = limb(c, 0, -36.5, a, -e, 9, 9, 5.8, 4.7, col, sk); c.fillStyle = sk; c.beginPath(); c.arc(q.x2, q.y2, 2.8, 0, TAU); c.fill(); };
    arm(sB, eB, shade(shirt, -.3), shade(skin, -.28));
    hairBack(c, look.hairStyle, hc, t, st);
    // torso
    c.fillStyle = skinD; c.fillRect(-2.5, -40, 5.5, 4);
    c.fillStyle = shirt; rr(c, -7.6, -38.6, 15.2, 19.8, 3.6); c.fill();
    c.fillStyle = acc; c.fillRect(-7.6, -26.8, 15.2, 2.6);
    c.beginPath(); c.arc(2.6, -33.2, 2.7, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(2.6, -33.2, 1, 0, TAU); c.fill();
    // cabeza
    c.fillStyle = skin; c.beginPath(); c.ellipse(1.5, -46, 9.6, 9.8, 0, 0, TAU); c.fill();
    c.fillStyle = skinD; c.beginPath(); c.arc(-5.2, -45.5, 2.4, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,90,110,.28)'; c.beginPath(); c.arc(3.4, -42.6, 2, 0, TAU); c.fill();
    hairFront(c, look.hairStyle, hc, skinD);
    // ojos
    [[4.2, -46.6], [8.8, -46.6]].forEach(([ex, ey]) => {
        if (blink) { c.strokeStyle = '#222'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(ex - 2, ey); c.lineTo(ex + 2, ey); c.stroke(); return; }
        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, 2.5, 3, 0, 0, TAU); c.fill();
        c.fillStyle = '#17202a'; c.beginPath(); c.arc(ex + .9, ey + lookY, 1.6, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + 1.4, ey + lookY - .6, .5, 0, TAU); c.fill();
    });
    c.strokeStyle = shade(hc, -.2); c.lineWidth = 1.1; c.beginPath(); c.moveTo(2.2, -50.6); c.lineTo(6, -50.8); c.moveTo(7.4, -50.8); c.lineTo(11, -50.2); c.stroke();
    // boca
    if (open) { c.fillStyle = '#6b1a1a'; c.beginPath(); c.ellipse(7, -41.4, 1.6, 2.1, 0, 0, TAU); c.fill(); }
    else { c.strokeStyle = '#7a2e2e'; c.lineWidth = 1.2; c.beginPath(); c.arc(6.8, -43, 2.6, .2, Math.PI - .2); c.stroke(); }
    drawGlasses(c, look.glasses);
    drawHat(c, look.hat, acc);
    arm(sA, eA, shirt, skin);
    c.restore();
    c.restore();
}

/* ---------- mascotas ---------- */
function drawPet(c, type, x, y, face, t, mv) {
    if (!type) return;
    c.save(); c.translate(x, y); c.scale(face, 1);
    const hop = mv ? Math.abs(Math.sin(t * 10)) * 3 : 0;
    c.lineCap = 'round';
    switch (type) {
        case 1: { // perro
            c.translate(0, -hop); const lg = mv ? Math.sin(t * 16) : 0;
            c.strokeStyle = '#8a5a2b'; c.lineWidth = 3;
            [[-5, lg], [-2, -lg], [4, -lg], [7, lg]].forEach(([lx, s]) => { c.beginPath(); c.moveTo(lx, -6); c.lineTo(lx + s * 3, 0); c.stroke(); });
            c.fillStyle = '#d9a066'; c.beginPath(); c.ellipse(0, -9, 9.5, 5.5, 0, 0, TAU); c.fill();
            c.strokeStyle = '#c98b4a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-8, -11); c.quadraticCurveTo(-13, -16 + Math.sin(t * 14) * 3, -12, -19); c.stroke();
            c.fillStyle = '#e8b27a'; c.beginPath(); c.arc(9, -14, 5.2, 0, TAU); c.fill();
            c.fillStyle = '#8a5a2b'; c.beginPath(); c.ellipse(6.5, -18.5, 2.2, 3.8, .4, 0, TAU); c.fill();
            c.fillStyle = '#fff'; c.beginPath(); c.ellipse(13, -12.5, 3, 2.4, 0, 0, TAU); c.fill();
            c.fillStyle = '#111'; c.beginPath(); c.arc(15, -13, 1.1, 0, TAU); c.fill(); c.beginPath(); c.arc(10.5, -15, 1, 0, TAU); c.fill();
            c.fillStyle = SENA.verde; c.fillRect(5, -10.5, 4.6, 2); break;
        }
        case 2: { // gato
            c.translate(0, -hop); const lg = mv ? Math.sin(t * 16) : 0;
            c.strokeStyle = '#6f7a88'; c.lineWidth = 3;
            [[-5, lg], [-2, -lg], [4, -lg], [7, lg]].forEach(([lx, s]) => { c.beginPath(); c.moveTo(lx, -6); c.lineTo(lx + s * 3, 0); c.stroke(); });
            c.strokeStyle = '#8f9aa8'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-8, -9); c.quadraticCurveTo(-17, -10 + Math.sin(t * 5) * 3, -13, -22); c.stroke();
            c.fillStyle = '#9aa5b3'; c.beginPath(); c.ellipse(0, -9, 9, 5, 0, 0, TAU); c.fill();
            c.fillStyle = '#7d8896'; c.fillRect(-4, -13.5, 2, 4); c.fillRect(0, -14, 2, 4.5);
            c.fillStyle = '#aab4c0'; c.beginPath(); c.arc(9, -14, 5, 0, TAU); c.fill();
            c.fillStyle = '#aab4c0'; c.beginPath(); c.moveTo(5.2, -17.5); c.lineTo(5.8, -23.5); c.lineTo(9, -18.5); c.fill(); c.beginPath(); c.moveTo(9.5, -18.5); c.lineTo(12.6, -23.5); c.lineTo(13.4, -16.5); c.fill();
            c.fillStyle = '#7ddc1f'; c.beginPath(); c.ellipse(10.8, -14.8, 1.3, 1.7, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(7, -14.8, 1.2, 1.6, 0, 0, TAU); c.fill();
            c.fillStyle = '#ff7aa8'; c.beginPath(); c.arc(13, -12.6, .9, 0, TAU); c.fill();
            c.fillStyle = SENA.amarillo; c.beginPath(); c.arc(9.4, -9.4, 1.4, 0, TAU); c.fill(); break;
        }
        case 3: { // loro volador
            const fl = Math.sin(t * 14);
            c.fillStyle = '#e0443a'; c.beginPath(); c.moveTo(-3, -4); c.lineTo(-13, 6); c.lineTo(-6, 0); c.fill();
            c.fillStyle = '#2e86de'; c.beginPath(); c.moveTo(-2, -3); c.lineTo(-11, 2); c.lineTo(-5, -1); c.fill();
            c.fillStyle = '#2ecc40'; c.beginPath(); c.ellipse(0, -9, 5.4, 8, .3, 0, TAU); c.fill();
            c.fillStyle = '#e0443a'; c.beginPath(); c.arc(3, -17, 4.4, 0, TAU); c.fill();
            c.fillStyle = '#FDC300'; c.beginPath(); c.moveTo(6.5, -18); c.lineTo(11, -16); c.lineTo(6.8, -14.4); c.fill();
            c.fillStyle = '#fff'; c.beginPath(); c.arc(4, -18, 1.3, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(4.3, -18, .7, 0, TAU); c.fill();
            c.save(); c.translate(-1, -11); c.rotate(-.4 + fl * .7); c.fillStyle = '#1f9d34'; c.beginPath(); c.ellipse(-4, 0, 7, 3.2, 0, 0, TAU); c.fill(); c.restore(); break;
        }
        case 4: { // robot
            const hv = Math.sin(t * 6) * 1.5;
            c.translate(0, hv);
            c.strokeStyle = '#6a7d90'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -20); c.lineTo(0, -25); c.stroke();
            c.fillStyle = Math.sin(t * 8) > 0 ? '#ff2e63' : '#7a1230'; c.beginPath(); c.arc(0, -26, 2, 0, TAU); c.fill();
            c.fillStyle = '#9fb3c8'; rr(c, -8, -20, 16, 12, 3); c.fill();
            c.fillStyle = '#0b2538'; rr(c, -5.5, -17.5, 11.5, 6, 2); c.fill();
            c.fillStyle = SENA.cyan; c.beginPath(); c.arc(-2, -14.5, 1.4, 0, TAU); c.fill(); c.beginPath(); c.arc(3, -14.5, 1.4, 0, TAU); c.fill();
            c.fillStyle = SENA.verde; c.fillRect(-8, -9.5, 16, 2);
            c.fillStyle = '#4a5a6a'; c.beginPath(); c.arc(-4, -5, 2.6, 0, TAU); c.fill(); c.beginPath(); c.arc(4, -5, 2.6, 0, TAU); c.fill();
            c.fillStyle = 'rgba(80,229,249,.35)'; c.beginPath(); c.ellipse(0, -1, 6, 2, 0, 0, TAU); c.fill(); break;
        }
        case 5: { // slime
            const q = Math.sin(t * (mv ? 10 : 3)), sx = 1 + q * .12, sy = 1 - q * .12;
            c.translate(0, -hop);
            c.fillStyle = 'rgba(125,220,31,.9)'; c.beginPath(); c.ellipse(0, -7 * sy, 10.5 * sx, 8 * sy, 0, Math.PI, TAU); c.lineTo(10.5 * sx, 0); c.lineTo(-10.5 * sx, 0); c.fill();
            c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-4, -11 * sy, 2.6, 1.6, -.5, 0, TAU); c.fill();
            c.fillStyle = '#073b00'; c.beginPath(); c.arc(-2, -6 * sy, 1.5, 0, TAU); c.fill(); c.beginPath(); c.arc(4, -6 * sy, 1.5, 0, TAU); c.fill();
            c.strokeStyle = '#073b00'; c.lineWidth = 1; c.beginPath(); c.arc(1, -4 * sy, 2, .2, Math.PI - .2); c.stroke(); break;
        }
    }
    c.restore();
}
const PET_FLY = { 3: 30, 4: 22 };

/* =========================================================
   NIVELES
   Coordenadas: x = izquierda, y = parte superior de la plataforma
   (el personaje tiene 26 x 52 px). Salto máx. ≈ 160 px alto, 220 px largo.
   ========================================================= */
const LEVELS = [
    { // ---------- NIVEL 1 ----------
        name: 'Primeros Pasos', sub: 'Aprende a saltar y evita los fosos y picos', subtle: false, deathY: 800, spawn: [80, 400],
        plats: [
            [0, 400, 260], [390, 400, 110], [630, 380, 110], [870, 360, 110],
            [1440, 360, 120], [1690, 340, 120], [1950, 320, 120],
            [2570, 320, 110], [2820, 300, 110], [3070, 300, 110]
        ],
        kills: [[260, 520, 130], [500, 520, 130], [2430, 520, 140]],
        cps: [[1120, 360, 220], [2210, 320, 240]],
        spikes: [[1470, 360, 60]],
        goal: [3310, 300, 260],
        hints: [
            { x: 130, y: 330, t: '← → moverte · ESPACIO saltar' },
            { x: 1500, y: 280, t: '¡Salta sobre los picos con cuidado!' },
            { x: 2330, y: 250, t: '★ Buen ritmo: plataformas amplias y bien separadas ★' }
        ]
    },
    { // ---------- NIVEL 2 ----------
        name: 'Agarraderas y Mecanismos', sub: 'Barras, esferas giratorias, láseres y trampolines', subtle: false, deathY: 800, spawn: [80, 420],
        plats: [
            [0, 420, 260], [2540, 400, 120]
        ],
        kills: [[260, 530, 420], [880, 530, 460], [1500, 530, 840], [2600, 530, 650]],
        rails: [
            [360, 300, 260],
            [980, 300, 280],
            [1760, 210, 260]
        ],
        pads: [[1620, 420, 90]],
        movers: [
            { x: 2180, y: 380, w: 120, ax: 70, ay: 0, sp: 1.3, ph: 0 }
        ],
        lasers: [
            { x: 1180, y: 150, h: 220, on: 1.1, off: 1.3, ph: 0 }
        ],
        orbs: [
            { cx: 1100, cy: 390, rad: 65, sp: 1.7, ph: 0 }
        ],
        saws: [
            { x: 2870, y: 340, r: 20, ax: 45, ay: 0, sp: 2.1, ph: 0 }
        ],
        crumbles: [
            [2720, 390, 90], [2890, 370, 90], [3060, 350, 90]
        ],
        cps: [
            [680, 420, 200],
            [1340, 420, 160],
            [2340, 400, 200]
        ],
        goal: [3280, 350, 260],
        hints: [
            { x: 360, y: 250, t: 'Salta a la barra amarilla y deslízate con ← →' },
            { x: 1080, y: 240, t: '¡Atención al láser y a la esfera giratoria!' },
            { x: 1620, y: 360, t: '¡Salta al trampolín para impulsarte a la barra alta!' },
            { x: 2890, y: 300, t: '¡Plataformas desmoronadizas y sierra móvil!' }
        ]
    },
    { // ---------- NIVEL 3 ----------
        name: 'Plataformas Móviles', sub: 'Timing y sincronización sobre plataformas celestes', subtle: false, deathY: 800, spawn: [80, 420],
        plats: [
            [0, 420, 240], [1360, 360, 140], [2200, 340, 480], [3380, 320, 440]
        ],
        kills: [[240, 530, 640], [1500, 530, 700], [2980, 530, 400]],
        movers: [
            { x: 420, y: 420, w: 120, ax: 110, ay: 0, sp: 1.2, ph: 0 },
            { x: 740, y: 390, w: 110, ax: 90, ay: 0, sp: 1.3, ph: Math.PI },
            { x: 1080, y: 370, w: 110, ax: 0, ay: 60, sp: 1.4, ph: 0 },
            { x: 1680, y: 350, w: 120, ax: 100, ay: 0, sp: 1.2, ph: 0 },
            { x: 1960, y: 340, w: 110, ax: 90, ay: 0, sp: 1.3, ph: Math.PI },
            { x: 3080, y: 340, w: 110, ax: 60, ay: 0, sp: 1.3, ph: 0 },
            { x: 3260, y: 330, w: 110, ax: 60, ay: 0, sp: 1.3, ph: Math.PI }
        ],
        cps: [[880, 400, 200], [1360, 360, 140], [2760, 340, 220]],
        lasers: [
            { x: 2360, y: 120, h: 220, on: 1.0, off: 1.3, ph: 0 },
            { x: 2500, y: 120, h: 220, on: 1.0, off: 1.3, ph: 1.1 },
            { x: 2640, y: 120, h: 220, on: 1.0, off: 1.3, ph: 2.2 }
        ],
        saws: [
            { x: 3520, y: 298, r: 22, ax: 50, ay: 0, sp: 2.2, ph: 0 },
            { x: 3720, y: 298, r: 22, ax: 50, ay: 0, sp: 2.2, ph: Math.PI }
        ],
        goal: [3940, 320, 260],
        hints: [
            { x: 260, y: 360, t: 'Súbete a las plataformas celestes en movimiento' },
            { x: 2360, y: 90, t: 'Pasa cuando el láser se apague' },
            { x: 3120, y: 280, t: '¡Cruza el abismo en las plataformas móviles!' },
            { x: 3560, y: 236, t: '¡Calcula tu salto sobre las sierras!' }
        ]
    },
    { // ---------- NIVEL 4 ----------
        name: 'El Gran Abismo', sub: 'Saltos amplios, trampolines propulsores y orbes', subtle: false, deathY: 800, spawn: [80, 420],
        plats: [
            [0, 420, 260], [420, 400, 110], [690, 380, 110], [960, 360, 110],
            [1560, 220, 220], [2260, 200, 220]
        ],
        kills: [[260, 530, 920], [1780, 460, 480], [2480, 460, 740]],
        pads: [[1380, 360, 90]],
        cps: [[1130, 360, 200], [1560, 220, 220], [2260, 200, 220]],
        rails: [[1840, 120, 320]],
        orbs: [
            { cx: 1960, cy: 230, rad: 60, sp: 1.6, ph: 0 },
            { cx: 2080, cy: 230, rad: 60, sp: 1.6, ph: Math.PI }
        ],
        crumbles: [[2580, 200, 90], [2760, 220, 90]],
        movers: [{ x: 2960, y: 240, w: 100, ax: 70, ay: 0, sp: 1.3, ph: 0 }],
        goal: [3240, 240, 260],
        hints: [
            { x: 300, y: 350, t: 'Saltos bien espaciados: mantén el impulso' },
            { x: 1380, y: 300, t: 'Trampolín: ¡te impulsará hasta la repisa alta!' },
            { x: 1840, y: 70, t: 'Barra superior sobre el vacío' }
        ]
    },
    { // ---------- NIVEL 5 ----------
        name: 'Sincronía Láser', sub: 'Coordina tus movimientos con los rayos de luz', subtle: false, deathY: 800, spawn: [80, 420],
        plats: [
            [0, 420, 260], [420, 400, 120], [690, 380, 120],
            [940, 360, 220], [1820, 340, 220], [2840, 300, 220]
        ],
        movers: [
            { x: 1260, y: 360, w: 110, ax: 100, ay: 0, sp: 1.2, ph: 0 },
            { x: 1540, y: 350, w: 110, ax: 90, ay: 0, sp: 1.3, ph: Math.PI },
            { x: 2150, y: 320, w: 110, ax: 100, ay: 0, sp: 1.2, ph: 0 },
            { x: 2480, y: 310, w: 110, ax: 100, ay: 0, sp: 1.2, ph: Math.PI }
        ],
        lasers: [
            { x: 1400, y: 160, h: 220, on: 1.1, off: 1.2, ph: 0 },
            { x: 2040, y: 120, h: 220, on: 0.9, off: 1.3, ph: 0 },
            { x: 2310, y: 120, h: 220, on: 0.9, off: 1.3, ph: 0.8 },
            { x: 2630, y: 120, h: 220, on: 0.9, off: 1.3, ph: 1.6 }
        ],
        spikes: [[450, 400, 60], [720, 380, 60]],
        kills: [[260, 530, 680], [1160, 530, 660], [2040, 530, 800]],
        cps: [[940, 360, 220], [1820, 340, 220]],
        goal: [3180, 300, 260],
        hints: [
            { x: 300, y: 350, t: '¡Pisa con precisión en las plataformas con picos!' },
            { x: 1400, y: 120, t: 'Avanza en la plataforma móvil cuando el láser se corte' },
            { x: 2310, y: 80, t: 'Serie de láseres sincronizados: mantén la calma' }
        ]
    },
    { // ---------- NIVEL 6 ----------
        name: 'Vértigo y Trampolines', sub: 'Propulsión aérea hacia barras elevadas', subtle: false, deathY: 800, spawn: [80, 440],
        plats: [
            [0, 440, 240], [580, 320, 200], [880, 320, 200],
            [1760, 260, 220], [2740, 240, 200]
        ],
        pads: [
            [360, 440, 90],
            [1200, 320, 90],
            [2080, 260, 90]
        ],
        rails: [
            [1380, 120, 280]
        ],
        orbs: [
            { cx: 1520, cy: 230, rad: 55, sp: 1.8, ph: 0 }
        ],
        saws: [
            { x: 680, y: 298, r: 20, ax: 40, ay: 0, sp: 2.0, ph: 0 }
        ],
        crumbles: [
            [2280, 240, 90], [2450, 240, 90], [2620, 240, 90]
        ],
        kills: [[240, 540, 640], [1080, 540, 680], [1980, 540, 760]],
        cps: [[880, 320, 200], [1760, 260, 220]],
        goal: [3040, 240, 260],
        hints: [
            { x: 360, y: 380, t: '¡El trampolín te impulsa con gran fuerza a la siguiente plataforma!' },
            { x: 1200, y: 260, t: 'Propúlsate a la barra aérea y esquiva el orbe' },
            { x: 2280, y: 180, t: '¡Puente inestable a gran altitud!' }
        ]
    },
    { // ---------- NIVEL 7 ----------
        name: 'Paso Inestable', sub: 'Cadenas de plataformas que caen tras pisarlas', subtle: false, deathY: 800, spawn: [80, 420],
        plats: [
            [0, 420, 240], [1060, 400, 220], [1920, 360, 220], [2780, 320, 220]
        ],
        crumbles: [
            [360, 420, 90], [530, 400, 90], [700, 380, 90], [870, 380, 90],
            [1390, 380, 90], [1570, 360, 90], [1740, 360, 90],
            [2250, 340, 90], [2430, 320, 90], [2610, 320, 90]
        ],
        rails: [
            [1340, 260, 220]
        ],
        orbs: [
            { cx: 615, cy: 290, rad: 60, sp: 2.0, ph: 0 },
            { cx: 1570, cy: 270, rad: 55, sp: 1.8, ph: Math.PI }
        ],
        saws: [
            { x: 2430, y: 270, r: 20, ax: 40, ay: 0, sp: 2.2, ph: 0 }
        ],
        kills: [[240, 530, 820], [1280, 530, 640], [2140, 530, 640]],
        cps: [[1060, 400, 220], [1920, 360, 220]],
        goal: [3100, 320, 260],
        hints: [
            { x: 360, y: 350, t: '¡No te detengas! Estas plataformas se desmoronan' },
            { x: 1340, y: 200, t: 'Puedes optar por la barra de rescate en lo alto' },
            { x: 2250, y: 260, t: '¡Último esfuerzo antes del reto final!' }
        ]
    },
    { // ---------- NIVEL 8 ----------
        name: 'El Desafío Maestro SENA', sub: 'La gran prueba: todas las mecánicas en su máxima expresión', subtle: false, deathY: 800, spawn: [80, 420],
        plats: [
            [0, 420, 240], [390, 420, 110], [650, 400, 110], [910, 380, 110],
            [1150, 380, 220], [1820, 400, 220], [2800, 340, 220], [3760, 220, 200],
            [4180, 200, 780]
        ],
        rails: [
            [1380, 280, 340]
        ],
        orbs: [
            { cx: 1550, cy: 380, rad: 65, sp: 1.8, ph: 0 }
        ],
        pads: [
            [2120, 400, 90],
            [4030, 220, 90],
            [5020, 200, 90]
        ],
        movers: [
            { x: 2360, y: 340, w: 120, ax: 110, ay: 0, sp: 1.4, ph: 0 }
        ],
        lasers: [
            { x: 3100, y: 140, h: 220, on: 1.0, off: 1.2, ph: 0 },
            { x: 3260, y: 140, h: 220, on: 1.0, off: 1.2, ph: 0.9 },
            { x: 3420, y: 140, h: 220, on: 1.0, off: 1.2, ph: 1.8 }
        ],
        crumbles: [
            [3180, 340, 90], [3340, 340, 90], [3500, 340, 90], [3650, 340, 90]
        ],
        saws: [
            { x: 4380, y: 178, r: 22, ax: 45, ay: 0, sp: 2.2, ph: 0 },
            { x: 4600, y: 178, r: 22, ax: 45, ay: 0, sp: 2.2, ph: Math.PI },
            { x: 4820, y: 178, r: 22, ax: 45, ay: 0, sp: 2.2, ph: 0 }
        ],
        kills: [
            [240, 520, 910], [1760, 520, 1040], [3020, 520, 740], [3960, 520, 220], [4960, 520, 300]
        ],
        cps: [
            [1150, 380, 220],
            [1820, 400, 220],
            [2800, 340, 220],
            [3760, 220, 200]
        ],
        goal: [5250, 200, 260],
        hints: [
            { x: 390, y: 360, t: '¡Gran Final! Todas las habilidades a prueba' },
            { x: 1380, y: 220, t: 'Barra y orbe giratorio' },
            { x: 2120, y: 340, t: '¡Trampolín hacia la plataforma móvil!' },
            { x: 3120, y: 100, t: 'Láseres triples con plataformas que caen' },
            { x: 4030, y: 160, t: '¡Trampolín hacia la pista de sierras!' },
            { x: 4400, y: 130, t: '¡Sprint final: salta las 3 sierras hacia la meta!' }
        ]
    }
];

/* =========================================================
   ESTADO GLOBAL
   ========================================================= */
const MOVE = 280, GRAV = 2000, JUMP = 800, STEP = 1 / 90;
const cv = $('#game'), ctx = cv.getContext('2d');
const G = {
    state: 'menu', token: 0, lvl: 0, L: null, p: null, pet: null, cam: { x: 0, y: 0 }, clock: 0,
    time: 0, deaths: 0, deathsByLevel: [0, 0, 0, 0, 0, 0, 0, 0], parts: [], shake: 0, flash: 0, deadT: 0, respawn: { x: 0, y: 0 }, spawnFx: null,
    jbuf: 0, W: 1, H: 1, scale: 1, vw: 960, vh: 540, hudT: 0, previewState: 0, previewFace: 1, endT: 0, fwT: 0
};
const keys = {}, touch = {};

/* ---------- sistema de puntuaciones y gráfica ---------- */
const DEFAULT_SCORES = [
    { name: 'Matías', pct: 100, time: '3:15', deaths: 2 },
    { name: 'Mafe', pct: 88, time: '4:20', deaths: 6 },
    { name: 'Sofía', pct: 75, time: '3:45', deaths: 7 },
    { name: 'Camilo', pct: 50, time: '2:10', deaths: 4 },
    { name: 'Valentina', pct: 25, time: '1:15', deaths: 3 }
];
let highScores = [];
try {
    const raw = JSON.parse(localStorage.getItem('sofiaPlusAlvarez_scores') || 'null');
    if (Array.isArray(raw) && raw.length > 0) highScores = raw; else highScores = [...DEFAULT_SCORES];
} catch (e) {
    highScores = [...DEFAULT_SCORES];
}
function saveScores() {
    try { localStorage.setItem('sofiaPlusAlvarez_scores', JSON.stringify(highScores)); } catch (e) { }
}
function calcPlayerPct() {
    if (G.state === 'win') return 100;
    if (!G.L) return Math.min(100, Math.round(((maxLevel - 1) / LEVELS.length) * 100));
    const pr = G.p ? clamp((G.p.x - G.L.d.spawn[0]) / (G.L.goal.x - G.L.d.spawn[0]), 0, 1) : 0;
    return Math.min(100, Math.max(0, Math.round(((G.lvl + pr) / LEVELS.length) * 100)));
}
function updatePlayerScore() {
    const curPct = calcPlayerPct();
    const curName = profile.name || 'Jugador';
    const curTime = fmtTime(G.time);
    const curDeaths = G.deaths;
    const existing = highScores.find(s => s.name.toLowerCase() === curName.toLowerCase());
    if (existing) {
        if (curPct > existing.pct || (curPct === existing.pct && curDeaths < existing.deaths)) {
            existing.pct = curPct;
            existing.time = curTime;
            existing.deaths = curDeaths;
        }
    } else {
        highScores.push({ name: curName, pct: curPct, time: curTime, deaths: curDeaths });
    }
    highScores.sort((a, b) => b.pct - a.pct || a.deaths - b.deaths);
    if (highScores.length > 10) highScores.length = 10;
    saveScores();
}
function drawDeathsChart() {
    const cv = $('#deathsCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);

    // Fondo
    ctx.fillStyle = '#011524';
    ctx.fillRect(0, 0, w, h);

    const data = (G.deathsByLevel && G.deathsByLevel.length) ? G.deathsByLevel : Array(LEVELS.length).fill(0);
    const maxVal = Math.max(4, ...data);

    const padLeft = 36, padRight = 16, padTop = 26, padBottom = 30;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    // Líneas guía
    ctx.strokeStyle = 'rgba(80, 229, 249, 0.15)';
    ctx.lineWidth = 1;
    ctx.font = '600 11px Fredoka, sans-serif';
    ctx.fillStyle = 'rgba(157, 214, 238, 0.6)';
    ctx.textAlign = 'right';
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
        const val = Math.round((maxVal / steps) * i);
        const y = padTop + chartH - (i / steps) * chartH;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();
        ctx.fillText(val, padLeft - 6, y + 4);
    }

    // Barras
    const barCount = LEVELS.length;
    const slotW = chartW / barCount;
    const barW = Math.min(32, slotW * 0.65);

    data.forEach((val, i) => {
        const barH = (val / maxVal) * chartH;
        const x = padLeft + i * slotW + (slotW - barW) / 2;
        const y = padTop + chartH - barH;

        let fillGrad = ctx.createLinearGradient(0, y, 0, padTop + chartH);
        if (val === 0) {
            fillGrad.addColorStop(0, '#5fe013');
            fillGrad.addColorStop(1, '#1b5e20');
        } else if (val <= 3) {
            fillGrad.addColorStop(0, '#FDC300');
            fillGrad.addColorStop(1, '#e65100');
        } else {
            fillGrad.addColorStop(0, '#ff2e63');
            fillGrad.addColorStop(1, '#880e4f');
        }

        ctx.fillStyle = fillGrad;
        rr(ctx, x, Math.min(y, padTop + chartH - 4), barW, Math.max(4, barH), 4);
        ctx.fill();

        ctx.strokeStyle = val === 0 ? 'rgba(95,224,19,.5)' : (val <= 3 ? 'rgba(253,195,0,.5)' : 'rgba(255,46,99,.5)');
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = val === 0 ? '#7ddc1f' : (val <= 3 ? '#FDC300' : '#ff4f79');
        ctx.textAlign = 'center';
        ctx.font = '700 12px Fredoka, sans-serif';
        ctx.fillText(val, x + barW / 2, Math.min(y - 5, padTop + chartH - 6));

        ctx.fillStyle = (i === G.lvl && G.state !== 'menu') ? '#50E5F9' : '#ffffff';
        ctx.font = (i === G.lvl && G.state !== 'menu') ? '700 12px Fredoka, sans-serif' : '600 11px Fredoka, sans-serif';
        ctx.fillText(`N${i + 1}`, x + barW / 2, h - 10);
    });
}
function renderScoresList() {
    const box = $('#scoresList');
    if (!box) return;
    box.innerHTML = '';
    const curName = (profile.name || 'Jugador').toLowerCase();

    highScores.forEach((item, idx) => {
        const row = document.createElement('div');
        const isCurrent = item.name.toLowerCase() === curName;
        row.className = 'score-row' + (isCurrent ? ' current-user' : '');
        const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx + 1}.`));

        row.innerHTML = `
            <span class="score-rank">${medal}</span>
            <div class="score-info">
                <div class="score-name-row">
                    <span>${item.name} ${isCurrent ? '<b>(Tú)</b>' : ''}</span>
                    <span style="font-size:12px;color:#9fd6ee;">⏱ ${item.time || '0:00'} · 💀 ${item.deaths ?? 0}</span>
                </div>
                <div class="score-bar-bg">
                    <div class="score-bar-fill" style="width: ${item.pct}%;"></div>
                </div>
            </div>
            <span class="score-pct">${item.pct}%</span>
        `;
        box.appendChild(row);
    });
}
function openStatsModal() {
    updatePlayerScore();
    showScreen('statsModal');
    renderScoresList();
    setTimeout(drawDeathsChart, 40);
}

/* ---------- fondo del vacío ---------- */
const stars = Array.from({ length: 220 }, () => ({ x: Math.random() * 3000, y: Math.random(), z: rand(.03, .5), r: rand(.5, 1.9), ph: rand(0, TAU), c: Math.random() < .2 ? SENA.verdeClaro : Math.random() < .3 ? SENA.cyan : '#ffffff' }));
const debris = Array.from({ length: 26 }, () => ({ x: Math.random() * 3000, y: Math.random(), z: rand(.12, .45), s: rand(8, 26), rot: rand(0, TAU), vr: rand(-.6, .6), c: Math.random() < .5 ? SENA.azulMedio : SENA.verde, sides: 3 + Math.floor(Math.random() * 3) }));
const motes = Array.from({ length: 50 }, () => ({ x: Math.random() * 2000, y: Math.random(), s: rand(1, 3), sp: rand(10, 40), c: Math.random() < .5 ? SENA.verdeClaro : SENA.cyan }));

function drawBackground(c, camx, camy, t) {
    const vw = G.vw, vh = G.vh;
    const g = c.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, '#00101c'); g.addColorStop(.55, '#032240'); g.addColorStop(1, '#05314a');
    c.fillStyle = g; c.fillRect(0, 0, vw, vh);
    // nebulosas
    let r = c.createRadialGradient(vw * .25 - camx * .02, vh * .35, 10, vw * .25 - camx * .02, vh * .35, vw * .5);
    r.addColorStop(0, 'rgba(57,169,0,.20)'); r.addColorStop(1, 'rgba(57,169,0,0)'); c.fillStyle = r; c.fillRect(0, 0, vw, vh);
    r = c.createRadialGradient(vw * .8 - camx * .03, vh * .3, 10, vw * .8 - camx * .03, vh * .3, vw * .45);
    r.addColorStop(0, 'rgba(80,229,249,.16)'); r.addColorStop(1, 'rgba(80,229,249,0)'); c.fillStyle = r; c.fillRect(0, 0, vw, vh);
    // planeta con anillo
    const px = vw * .78 - camx * .04, py = vh * .26 - camy * .02;
    r = c.createRadialGradient(px - 22, py - 22, 6, px, py, 78);
    r.addColorStop(0, '#9dff4d'); r.addColorStop(.5, SENA.verde); r.addColorStop(1, '#0a3d00');
    c.fillStyle = r; c.beginPath(); c.arc(px, py, 70, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(253,195,0,.8)'; c.lineWidth = 5; c.beginPath(); c.ellipse(px, py, 118, 26, -.4, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(80,229,249,.4)'; c.lineWidth = 2; c.beginPath(); c.ellipse(px, py, 138, 32, -.4, 0, TAU); c.stroke();
    // anillos giratorios gigantes
    c.save(); c.translate(vw * .35 - camx * .05, vh * .6 - camy * .03); c.rotate(t * .05);
    c.strokeStyle = 'rgba(57,169,0,.16)'; c.lineWidth = 10; c.setLineDash([40, 24]); c.beginPath(); c.arc(0, 0, 210, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(80,229,249,.12)'; c.lineWidth = 4; c.setLineDash([12, 18]); c.beginPath(); c.arc(0, 0, 260, 0, TAU); c.stroke(); c.setLineDash([]); c.restore();
    // estrellas
    for (const s of stars) {
        const sx = ((s.x - camx * s.z) % vw + vw) % vw, sy = ((s.y * vh - camy * s.z * .3) % vh + vh) % vh;
        c.globalAlpha = .45 + .55 * Math.abs(Math.sin(t * 1.3 + s.ph)); c.fillStyle = s.c; c.fillRect(sx, sy, s.r, s.r);
    }
    c.globalAlpha = 1;
    // escombros flotantes
    for (const d of debris) {
        const dx = ((d.x - camx * d.z) % (vw + 200) + vw + 200) % (vw + 200) - 100, dy = d.y * vh + Math.sin(t * .6 + d.x) * 10 - camy * d.z * .3;
        c.save(); c.translate(dx, dy); c.rotate(d.rot + t * d.vr); c.fillStyle = d.c; c.globalAlpha = .35;
        c.beginPath(); for (let i = 0; i < d.sides; i++) { const a = i / d.sides * TAU; c.lineTo(Math.cos(a) * d.s, Math.sin(a) * d.s); } c.fill(); c.restore();
    }
    c.globalAlpha = 1;
    // niebla del abismo
    const fog = c.createLinearGradient(0, vh * .7, 0, vh);
    fog.addColorStop(0, 'rgba(57,169,0,0)'); fog.addColorStop(1, `rgba(57,169,0,${.22 + Math.sin(t * 1.5) * .05})`);
    c.fillStyle = fog; c.fillRect(0, vh * .7, vw, vh * .3);
    for (const m of motes) {
        const mx = ((m.x - camx * .5) % vw + vw) % vw, my = vh - (((m.y * vh + t * m.sp) % vh));
        c.globalAlpha = .6; c.fillStyle = m.c; c.beginPath(); c.arc(mx, my, m.s, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
}

/* ---------- partículas ---------- */
function burst(x, y, n, cols, sp = 220, life = .8, size = 4, g = 700) {
    for (let i = 0; i < n; i++) {
        const a = rand(0, TAU), v = rand(.2, 1) * sp;
        G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * .25, life: rand(.5, 1) * life, max: life, c: cols[Math.floor(Math.random() * cols.length)], s: rand(size * .5, size), g, sq: Math.random() < .5 });
    }
}
function updateParts(dt) {
    for (let i = G.parts.length - 1; i >= 0; i--) {
        const q = G.parts[i]; q.life -= dt; if (q.life <= 0) { G.parts.splice(i, 1); continue; }
        q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    }
}
function drawParts(c) {
    for (const q of G.parts) {
        c.globalAlpha = clamp(q.life / q.max, 0, 1); c.fillStyle = q.c;
        if (q.sq) c.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); else { c.beginPath(); c.arc(q.x, q.y, q.s / 2, 0, TAU); c.fill(); }
    }
    c.globalAlpha = 1;
}
const SENA_COLS = [SENA.verde, SENA.verdeClaro, SENA.azulMedio, SENA.amarillo, SENA.cyan, '#ffffff'];

/* =========================================================
   CONSTRUCCIÓN Y CARGA DE NIVEL
   ========================================================= */
function buildLevel(i) {
    const d = LEVELS[i];
    const L = { d, i, plats: [], spikes: d.spikes || [], rails: (d.rails || []).map(r => ({ x: r[0], y: r[1], w: r[2] })), orbs: d.orbs || [], lasers: d.lasers || [], saws: d.saws || [], cps: [], hints: d.hints || [], t: 0, goal: null, width: 0 };
    const add = (a, kind, extra) => { const pl = { x: a[0], y: a[1], w: a[2], h: 24, kind, ox: a[0], oy: a[1], dx: 0, dy: 0, st: 'idle', tm: 0, fy: 0, vy: 0, squash: 0, back: 0, ...extra }; L.plats.push(pl); return pl; };
    const seen = new Set();
    (d.plats || []).forEach(a => { const k = a.join(','); if (seen.has(k)) return; seen.add(k); add(a, 'safe'); });
    (d.kills || []).forEach(a => add(a, 'kill'));
    (d.crumbles || []).forEach(a => add(a, 'crumble'));
    (d.pads || []).forEach(a => add(a, 'pad'));
    (d.cps || []).forEach((a, k) => { add(a, 'cp'); L.cps.push({ x: a[0] + a[2] / 2, y: a[1], on: false, anim: 0, k }); });
    (d.movers || []).forEach(m => { const pl = add([m.x, m.y, m.w], 'move'); pl.m = m; });
    // el plano de la meta o plataformas que tapen pads se filtran para no solaparse
    const gl = add(d.goal, 'goal');
    L.plats = L.plats.filter(pl => pl === gl || !(pl.kind === 'safe' && (
        (pl.x === gl.x && pl.y === gl.y && pl.w === gl.w) ||
        L.plats.some(other => other.kind === 'pad' && Math.abs(pl.y - other.y) < 10 && pl.x < other.x + other.w && pl.x + pl.w > other.x)
    )));
    L.goal = { x: d.goal[0] + d.goal[2] * .6, y: d.goal[1], a: 0 };
    L.width = d.goal[0] + d.goal[2] + 300;
    return L;
}
function newPlayer(x, y) {
    return { x, y, vx: 0, vy: 0, w: 26, h: 52, face: 1, onGround: false, ground: null, coyote: 0, hang: null, grabCd: 0, state: 'idle', t: 0, idleT: 0, dead: false, jumping: false, moving: false, dustT: 0, scale: 1, rot: 0 };
}
function loadLevel(i) {
    G.lvl = i; G.L = buildLevel(i);
    const sp = G.L.d.spawn; G.respawn = { x: sp[0], y: sp[1] };
    G.p = newPlayer(sp[0], sp[1]); G.p.spawnT = 0;
    G.pet = { x: sp[0] - 40, y: sp[1], face: 1, t: 0 };
    G.spawnFx = { x: sp[0], y: sp[1], t: 0 }; G.parts.length = 0;
    G.cam.x = sp[0] - G.vw * .36; G.cam.y = sp[1] - G.vh * .62; G.deadT = 0;
    burst(sp[0], sp[1] - 30, 40, SENA_COLS, 300, 1, 5, 200);
}

/* ---------- física ---------- */
const isSolid = pl => pl.kind !== 'kill' && !(pl.kind === 'crumble' && (pl.st === 'fall' || pl.st === 'gone'));
function inp() {
    return {
        left: !!(keys.KeyA || keys.ArrowLeft || touch.left), right: !!(keys.KeyD || keys.ArrowRight || touch.right),
        jump: !!(keys.Space || keys.ArrowUp || keys.KeyW || touch.jump), down: !!(keys.KeyS || keys.ArrowDown || touch.down)
    };
}
function stepWorld(dt) {
    const L = G.L; L.t += dt;
    for (const pl of L.plats) {
        if (pl.kind === 'move') {
            const m = pl.m, s = Math.sin(m.sp * L.t + m.ph), nx = pl.ox + m.ax * s, ny = pl.oy + m.ay * s;
            pl.dx = nx - pl.x; pl.dy = ny - pl.y; pl.x = nx; pl.y = ny;
        } else if (pl.kind === 'crumble') {
            if (pl.st === 'shake') { pl.tm += dt; if (pl.tm > .45) { pl.st = 'fall'; pl.tm = 0; pl.vy = 0; } }
            else if (pl.st === 'fall') { pl.tm += dt; pl.vy += 1400 * dt; pl.fy += pl.vy * dt; if (pl.tm > 1.2) { pl.st = 'gone'; pl.tm = 0; } }
            else if (pl.st === 'gone') { pl.tm += dt; if (pl.tm > 2) { pl.st = 'idle'; pl.fy = 0; pl.vy = 0; pl.tm = 0; pl.back = .4; } }
            if (pl.back > 0) pl.back -= dt;
        }
        if (pl.squash > 0) pl.squash = Math.max(0, pl.squash - dt * 4);
    }
    for (const cp of L.cps) if (cp.on) cp.anim = Math.min(1, cp.anim + dt * 3);
}
const orbPos = (o, t) => ({ x: o.cx + Math.cos(o.sp * t + o.ph) * o.rad, y: o.cy + Math.sin(o.sp * t + o.ph) * o.rad });
const sawPos = (s, t) => ({ x: s.x + Math.sin(s.sp * t + s.ph) * s.ax, y: s.y + Math.sin(s.sp * t + s.ph) * s.ay });
const laserOn = (l, t) => { const per = l.on + l.off; return (((t + l.ph) % per) + per) % per < l.on; };
const laserWarn = (l, t) => { const per = l.on + l.off, m = (((t + l.ph) % per) + per) % per; return m >= l.on && (per - m) < .4; };

function hazardHit(p, L) {
    const l = p.x - 13 + 4, r = p.x + 13 - 4, t = p.y - 52 + 4, b = p.y - 1;
    for (const s of L.spikes) { const sx = s[0] + 3, sw = s[2] - 6, sy = s[1]; if (r > sx && l < sx + sw && b > sy - 18 && t < sy) return true; }
    for (const o of L.orbs) {
        const q = orbPos(o, L.t), cx = clamp(q.x, l, r), cy = clamp(q.y, t, b);
        if ((q.x - cx) ** 2 + (q.y - cy) ** 2 < 12 * 12) return true;
    }
    for (const s of L.saws) {
        const q = sawPos(s, L.t), cx = clamp(q.x, l, r), cy = clamp(q.y, t, b);
        if ((q.x - cx) ** 2 + (q.y - cy) ** 2 < (s.r - 3) ** 2) return true;
    }
    for (const la of L.lasers) if (laserOn(la, L.t) && r > la.x - 7 && l < la.x + 7 && b > la.y && t < la.y + la.h) return true;
    for (const pl of L.plats) if (pl.kind === 'kill' && r > pl.x && l < pl.x + pl.w && b > pl.y - 1 && t < pl.y + pl.h) return true;
    return false;
}

function die() {
    const p = G.p; if (p.dead || G.state !== 'play') return;
    p.dead = true; p.hang = null; G.deaths++; G.deadT = .8; G.shake = .35;
    if (!G.deathsByLevel) G.deathsByLevel = Array(LEVELS.length).fill(0);
    G.deathsByLevel[G.lvl] = (G.deathsByLevel[G.lvl] || 0) + 1;
    updatePlayerScore();
    burst(p.x, p.y - 26, 46, SENA_COLS, 380, 1.1, 6, 900);
    SFX.die();
}
function doRespawn() {
    const L = G.L;
    for (const pl of L.plats) if (pl.kind === 'crumble') { pl.st = 'idle'; pl.fy = 0; pl.vy = 0; pl.tm = 0; }
    G.p = newPlayer(G.respawn.x, G.respawn.y);
    G.spawnFx = { x: G.respawn.x, y: G.respawn.y, t: 0 };
    G.pet.x = G.respawn.x - 40; G.pet.y = G.respawn.y;
    burst(G.respawn.x, G.respawn.y - 26, 26, SENA_COLS, 240, .9, 5, 300);
}

function stepPlayer(dt) {
    const p = G.p, L = G.L, K = inp();
    p.t += dt;
    p.grabCd -= dt; G.jbuf -= dt;
    const dir = (K.right ? 1 : 0) - (K.left ? 1 : 0);

    // --- colgado en una barra ---
    if (p.hang) {
        const r = p.hang; p.vx = 0; p.vy = 0;
        p.x = clamp(p.x + dir * 150 * dt, r.x + 4, r.x + r.w - 4); p.y = r.y + 56;
        if (dir) p.face = dir; p.moving = dir !== 0;
        if (G.jbuf > 0) { p.hang = null; p.vy = -700; p.vx = dir * MOVE; p.grabCd = .3; G.jbuf = 0; p.jumping = false; SFX.jump(); burst(p.x, p.y - 56, 8, ['#FDC300', '#fff'], 120, .5, 3, 400); }
        else if (K.down) { p.hang = null; p.grabCd = .35; }
        p.state = p.hang ? 'hang' : 'fall';
        return;
    }

    // --- movimiento horizontal ---
    const gnd = p.ground;
    if (gnd && gnd.kind === 'crumble' && (gnd.st === 'fall' || gnd.st === 'gone')) { p.onGround = false; p.ground = null; }
    if (p.onGround && p.ground && p.ground.kind === 'move') { p.x += p.ground.dx; p.y = p.ground.y; }
    p.vx += (dir * MOVE - p.vx) * Math.min(1, (p.onGround ? 20 : 12) * dt);
    if (!dir && Math.abs(p.vx) < 6) p.vx = 0;
    if (dir) p.face = dir;
    p.vy = Math.min(p.vy + GRAV * dt, 1100);

    // --- salto (coyote + buffer) ---
    if (p.onGround) p.coyote = .1; else p.coyote -= dt;
    if (G.jbuf > 0 && p.coyote > 0) {
        p.vy = -JUMP; p.onGround = false; p.ground = null; p.coyote = 0; G.jbuf = 0; p.jumping = true; SFX.jump();
        burst(p.x, p.y, 6, ['#ffffff', SENA.verdeClaro], 90, .4, 3, 200);
    }
    if (!K.jump && p.jumping && p.vy < -260) { p.vy = -260; p.jumping = false; }
    if (p.vy >= 0) p.jumping = false;

    // --- X ---
    p.x += p.vx * dt;
    for (const pl of L.plats) {
        if (!isSolid(pl)) continue;
        const l = p.x - 13, r = p.x + 13, t = p.y - 52, b = p.y;
        if (r > pl.x && l < pl.x + pl.w && b > pl.y + .5 && t < pl.y + pl.h) {
            if (p.vx > 0 || (p.vx === 0 && p.x < pl.x + pl.w / 2)) p.x = pl.x - 13; else p.x = pl.x + pl.w + 13;
            p.vx = 0;
        }
    }
    // --- Y ---
    const wasGround = p.onGround, prevB = p.y, prevT = p.y - 52;
    p.y += p.vy * dt; p.onGround = false; p.ground = null;
    for (const pl of L.plats) {
        if (!isSolid(pl)) continue;
        const l = p.x - 13, r = p.x + 13, t = p.y - 52, b = p.y;
        if (r > pl.x + .5 && l < pl.x + pl.w - .5 && b > pl.y && t < pl.y + pl.h) {
            if (p.vy >= 0 && prevB <= pl.y - pl.dy + 6) {
                p.y = pl.y; p.vy = 0; p.onGround = true; p.ground = pl;
                if (!wasGround) { SFX.land(); burst(p.x, p.y, 5, ['#ffffff', '#9ad6ff'], 70, .35, 3, 250); }
                if (pl.kind === 'pad') { p.vy = -1180; p.onGround = false; p.ground = null; p.jumping = false; pl.squash = 1; SFX.boing(); burst(p.x, p.y, 18, [SENA.cyan, '#fff', SENA.amarillo], 240, .7, 5, 300); }
                if (pl.kind === 'crumble' && pl.st === 'idle') { pl.st = 'shake'; pl.tm = 0; SFX.crumble(); }
            } else if (p.vy < 0 && prevT >= pl.y + pl.h - 2) {
                p.y = pl.y + pl.h + 52; p.vy = 0;
            }
        }
    }
    // --- agarraderas (auto) ---
    if (!p.onGround && p.grabCd <= 0 && !K.down) {
        for (const r of L.rails) {
            const ht = p.y - 52;
            if (p.x > r.x - 6 && p.x < r.x + r.w + 6 && ht > r.y - 10 && ht < r.y + 14) {
                p.hang = r; p.vx = 0; p.vy = 0; p.x = clamp(p.x, r.x + 4, r.x + r.w - 4); p.y = r.y + 56; p.jumping = false; G.jbuf = 0;
                SFX.grab(); burst(p.x, r.y, 10, ['#FDC300', '#fff'], 140, .5, 3, 300); break;
            }
        }
    }
    // --- polvo al correr ---
    p.dustT -= dt;
    if (p.onGround && Math.abs(p.vx) > 150 && p.dustT <= 0) { p.dustT = .1; burst(p.x - p.face * 8, p.y, 2, ['#ffffff', '#7fb8d6'], 40, .35, 3, 80); }

    // --- animación / orientación (mira hacia los retos) ---
    p.moving = Math.abs(p.vx) > 20;
    if (p.onGround) p.state = p.moving ? 'run' : 'idle'; else p.state = p.vy < 0 ? 'jump' : 'fall';
    if (p.state === 'idle') { p.idleT += dt; if (p.idleT > .3) p.face = (L.goal.x - p.x) >= 0 ? 1 : -1; } else p.idleT = 0;

    // --- checkpoints ---
    for (const cp of L.cps) {
        if (!cp.on && p.onGround && Math.abs(p.x - cp.x) < 70 && Math.abs(p.y - cp.y) < 6) {
            cp.on = true; G.respawn = { x: cp.x, y: cp.y }; SFX.check(); banner('✔ ¡Punto de regeneración!');
            burst(cp.x, cp.y - 40, 40, SENA_COLS, 320, 1.1, 5, 400);
        }
    }
    // --- meta ---
    const gl = L.goal;
    if (Math.abs(p.x - gl.x) < 28 && p.y > gl.y - 70 && p.y < gl.y + 8) { startLevelEnd(); return; }
    // --- muerte ---
    if (hazardHit(p, L) || p.y > L.d.deathY) die();
}

function updatePet(dt) {
    const p = G.p, pe = G.pet; if (!pe || !p) return;
    pe.t += dt;
    const tx = p.x - p.face * 38, fly = PET_FLY[profile.pet] || 0, ty = p.y - fly + (fly ? Math.sin(pe.t * 3) * 4 : 0);
    if (Math.abs(pe.x - p.x) > 500) { pe.x = tx; pe.y = ty; }
    const px = pe.x; pe.x += (tx - pe.x) * Math.min(1, dt * 5); pe.y += (ty - pe.y) * Math.min(1, dt * 8);
    const dxp = pe.x - px; if (Math.abs(dxp) > .05) pe.face = dxp > 0 ? 1 : -1; else if (Math.abs(p.x - pe.x) > 6) pe.face = p.x > pe.x ? 1 : -1;
    pe.mv = Math.abs(dxp) / dt > 25 || Math.abs(pe.y - ty) > 4;
}
function updateCam(dt, snap) {
    const p = G.p, L = G.L; if (!p || !L) return;
    const tx = p.x - G.vw * .36, ty = p.y - G.vh * .62, k = snap ? 1 : 1 - Math.pow(.0008, dt);
    G.cam.x += (tx - G.cam.x) * k; G.cam.y += (ty - G.cam.y) * k;
    G.cam.x = clamp(G.cam.x, -140, Math.max(-140, L.width - G.vw + 160)); G.cam.y = clamp(G.cam.y, -260, 260);
}

/* ---------- fin de nivel ---------- */
function startLevelEnd() {
    if (G.state !== 'play') return;
    G.state = 'levelEnd'; G.endT = 0; G.p.hang = null; G.p.vx = 0; G.p.vy = 0; SFX.portal();
    banner('★ ¡Nivel completado! ★');
}
function stepEnd(dt) {
    const p = G.p, gl = G.L.goal; G.endT += dt;
    p.x += (gl.x - p.x) * Math.min(1, dt * 6); p.y += ((gl.y - 6) - p.y) * Math.min(1, dt * 6);
    p.scale = clamp(1 - G.endT / 1.1, 0, 1); p.rot += dt * 14; p.state = 'dance'; p.t += dt;
    if (Math.random() < .6) burst(gl.x, gl.y - 40, 2, [SENA.verdeClaro, SENA.amarillo, SENA.cyan], 160, .7, 4, 0);
    if (G.endT > 1.1) finishLevel();
}
async function finishLevel() {
    const token = ++G.token; G.state = 'wait'; G.flash = 1;
    const next = G.lvl + 1;
    if (next >= LEVELS.length) { winGame(); return; }
    maxLevel = Math.max(maxLevel, next + 1); save();
    loadLevel(next); SFX.start();
    await levelIntro(next, token); if (token !== G.token) return;
    G.state = 'play';
}
function winGame() {
    G.state = 'win'; G.fwT = 0; SFX.win();
    maxLevel = LEVELS.length; save();
    updatePlayerScore();
    $('#winTitle').textContent = `¡Felicitaciones, ${profile.name}!`;
    $('#winTime').textContent = fmtTime(G.time); $('#winDeaths').textContent = G.deaths;
    $('#hud').classList.add('hidden'); $('#touch').classList.add('hidden');
    showScreen('win');
}

/* =========================================================
   RENDER DEL MUNDO
   ========================================================= */
function slab(c, x, y, w, h, top, body, glow, studs) {
    c.save(); c.shadowColor = glow; c.shadowBlur = 16;
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, body); g.addColorStop(1, shade(body, -.45));
    c.fillStyle = g; rr(c, x, y, w, h, 6); c.fill(); c.restore();
    c.fillStyle = top; rr(c, x, y, w, 8, 4); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 4, y + 1.5, w - 8, 1.6);
    if (studs) { c.fillStyle = 'rgba(0,0,0,.22)'; for (let i = 12; i < w - 6; i += 20) { c.beginPath(); c.arc(x + i, y + 4, 2.2, 0, TAU); c.fill(); } }
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 6, y + 16); c.lineTo(x + w - 6, y + 16); c.stroke();
}
function drawPlat(c, pl, L, t) {
    let { x, y } = pl; const w = pl.w, h = pl.h;
    switch (pl.kind) {
        case 'kill': {
            slab(c, x, y, w, h, SENA.rojo, '#4a0b1c', SENA.rojo, false);
            c.save(); rr(c, x, y, w, h, 6); c.clip(); c.fillStyle = 'rgba(255,255,255,.18)';
            for (let i = -h; i < w + h; i += 16) { c.beginPath(); c.moveTo(x + i + (t * 18 % 16), y); c.lineTo(x + i + 8 + (t * 18 % 16), y); c.lineTo(x + i - 8 + (t * 18 % 16), y + h); c.lineTo(x + i - 16 + (t * 18 % 16), y + h); c.fill(); }
            c.restore();
            break;
        }
        case 'crumble': {
            if (pl.st === 'gone') return;
            let ox = 0, oy = pl.fy, al = 1;
            if (pl.st === 'shake') { ox = rand(-2, 2); oy = rand(-1.5, 1.5); }
            if (pl.st === 'fall') al = clamp(1 - pl.tm / 1.2, 0, 1);
            c.save(); c.globalAlpha = al * (pl.back > 0 ? .6 : 1);
            slab(c, x + ox, y + oy, w, h, SENA.naranja, '#5a2d10', '#ff8a00', false);
            c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + ox + w * .3, y + oy + 8); c.lineTo(x + ox + w * .4, y + oy + 16); c.lineTo(x + ox + w * .33, y + oy + 24);
            c.moveTo(x + ox + w * .7, y + oy + 8); c.lineTo(x + ox + w * .6, y + oy + 15); c.stroke(); c.restore(); break;
        }
        case 'pad': {
            const sq = pl.squash; slab(c, x, y + 10, w, 14, SENA.cyan, '#0a5a8a', SENA.cyan, false);
            c.strokeStyle = '#d8f8ff'; c.lineWidth = 3; const hh = 10 - sq * 6;
            for (let i = 14; i < w - 8; i += 22) { c.beginPath(); c.moveTo(x + i, y + 10); c.lineTo(x + i + 6, y + 10 - hh * .5); c.lineTo(x + i, y + 10 - hh); c.lineTo(x + i + 6, y + 10 - hh * 1.5); c.stroke(); }
            c.fillStyle = SENA.amarillo; rr(c, x - 2, y + 8 - hh * 1.5 - 2 + sq * 2, w + 4, 6, 3); c.fill();
            c.fillStyle = '#5a4300'; c.font = '700 11px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText('▲ ▲ ▲', x + w / 2, y + 7 - hh * 1.5 + sq * 2); break;
        }
        case 'move': {
            slab(c, x, y, w, h, SENA.cyan, '#0a5a8a', SENA.cyan, false);
            c.fillStyle = 'rgba(255,255,255,.75)'; const m = pl.m;
            c.font = '700 13px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText(m.ay > m.ax ? '▲ ▼' : '◀ ▶', x + w / 2, y + 20); break;
        }
        case 'cp': slab(c, x, y, w, h, SENA.amarillo, '#00304D', SENA.amarillo, true); break;
        case 'goal': slab(c, x, y, w, h, SENA.amarillo, '#0b5a1a', SENA.verdeClaro, true); break;
        default: slab(c, x, y, w, h, SENA.verde, '#0b3a5a', SENA.verde, true);
    }
}
function drawCheckpoint(c, cp, t) {
    const x = cp.x, y = cp.y;
    c.strokeStyle = '#cfd8dc'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 52); c.stroke();
    c.fillStyle = cp.on ? SENA.verdeClaro : '#7b8794'; c.beginPath(); c.arc(x, y - 54, 4, 0, TAU); c.fill();
    const fy = y - 50 + (1 - cp.anim) * 26, wv = Math.sin(t * 6) * 3;
    c.fillStyle = cp.on ? SENA.verde : '#59636e';
    c.beginPath(); c.moveTo(x, fy); c.quadraticCurveTo(x + 14, fy - 5 + wv, x + 26, fy + 2); c.quadraticCurveTo(x + 14, fy + 8 - wv, x + 26, fy + 14); c.lineTo(x, fy + 14); c.fill();
    if (cp.on) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 8, fy + 7, 2.4, 0, TAU); c.fill(); c.strokeStyle = `rgba(125,220,31,${.5 + .3 * Math.sin(t * 4)})`; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 30 + Math.sin(t * 3) * 3, 6, 0, 0, TAU); c.stroke(); }
}
function drawRail(c, r, t) {
    c.save(); c.shadowColor = SENA.amarillo; c.shadowBlur = 14;
    const g = c.createLinearGradient(0, r.y - 5, 0, r.y + 5); g.addColorStop(0, '#fff3a8'); g.addColorStop(.5, SENA.amarillo); g.addColorStop(1, '#b58900');
    c.fillStyle = g; rr(c, r.x, r.y - 5, r.w, 10, 5); c.fill(); c.restore();
    c.fillStyle = 'rgba(0,0,0,.28)'; for (let i = 16; i < r.w - 8; i += 20) c.fillRect(r.x + i, r.y - 5, 3, 10);
    c.fillStyle = SENA.verde; c.beginPath(); c.arc(r.x, r.y, 7, 0, TAU); c.fill(); c.beginPath(); c.arc(r.x + r.w, r.y, 7, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(r.x, r.y, 2.6, 0, TAU); c.fill(); c.beginPath(); c.arc(r.x + r.w, r.y, 2.6, 0, TAU); c.fill();
}
function drawSpikes(c, s, t) {
    const n = Math.floor(s[2] / 14), x = s[0], y = s[1], w = s[2] / n;
    c.save(); c.shadowColor = SENA.rojo; c.shadowBlur = 10;
    for (let i = 0; i < n; i++) {
        const g = c.createLinearGradient(0, y - 22, 0, y); g.addColorStop(0, '#ff6b8c'); g.addColorStop(.35, '#e8eef2'); g.addColorStop(1, '#8794a0');
        c.fillStyle = g; c.beginPath(); c.moveTo(x + i * w, y); c.lineTo(x + i * w + w / 2, y - 22); c.lineTo(x + (i + 1) * w, y); c.fill();
    }
    c.restore();
}
function drawOrb(c, o, L, t) {
    const q = orbPos(o, L.t);
    c.strokeStyle = 'rgba(255,46,99,.18)'; c.lineWidth = 1.5; c.setLineDash([4, 8]); c.beginPath(); c.arc(o.cx, o.cy, o.rad, 0, TAU); c.stroke(); c.setLineDash([]);
    c.strokeStyle = 'rgba(255,138,0,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(o.cx, o.cy); c.lineTo(q.x, q.y); c.stroke();
    c.fillStyle = '#ff8a00'; c.beginPath(); c.arc(o.cx, o.cy, 4, 0, TAU); c.fill();
    c.save(); c.shadowColor = SENA.rojo; c.shadowBlur = 22;
    const g = c.createRadialGradient(q.x - 3, q.y - 3, 1, q.x, q.y, 14); g.addColorStop(0, '#fff'); g.addColorStop(.35, '#ff9a3c'); g.addColorStop(1, SENA.rojo);
    c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, 13, 0, TAU); c.fill(); c.restore();
}
function drawSaw(c, s, L, t) {
    const q = sawPos(s, L.t);
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2; c.beginPath(); c.moveTo(s.x - s.ax, s.y - s.ay); c.lineTo(s.x + s.ax, s.y + s.ay); c.stroke();
    c.save(); c.translate(q.x, q.y); c.rotate(L.t * 9); c.shadowColor = SENA.rojo; c.shadowBlur = 16;
    c.fillStyle = '#d9e2e8'; c.beginPath();
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, rad = i % 2 ? s.r - 4 : s.r + 3; c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } c.fill();
    c.shadowBlur = 0; c.fillStyle = '#5b6b78'; c.beginPath(); c.arc(0, 0, s.r * .62, 0, TAU); c.fill();
    c.fillStyle = SENA.rojo; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(-s.r * .5, 0); c.lineTo(s.r * .5, 0); c.stroke(); c.restore();
}
function drawLaser(c, l, L, t) {
    const on = laserOn(l, L.t), warn = laserWarn(l, L.t);
    c.fillStyle = '#2b3a47'; rr(c, l.x - 11, l.y - 12, 22, 14, 3); c.fill(); rr(c, l.x - 11, l.y + l.h - 2, 22, 8, 3); c.fill();
    c.fillStyle = on ? SENA.rojo : '#6b1a2a'; c.beginPath(); c.arc(l.x, l.y - 5, 3.5, 0, TAU); c.fill();
    if (on) {
        c.save(); c.shadowColor = SENA.rojo; c.shadowBlur = 24; c.fillStyle = `rgba(255,46,99,${.75 + .25 * Math.sin(t * 40)})`; c.fillRect(l.x - 6, l.y, 12, l.h);
        c.fillStyle = '#fff'; c.fillRect(l.x - 2, l.y, 4, l.h); c.restore();
    } else {
        c.strokeStyle = warn && Math.sin(t * 40) > 0 ? 'rgba(255,46,99,.95)' : 'rgba(255,46,99,.18)'; c.lineWidth = warn ? 2 : 1; c.setLineDash([5, 7]);
        c.beginPath(); c.moveTo(l.x, l.y); c.lineTo(l.x, l.y + l.h); c.stroke(); c.setLineDash([]);
    }
}
function drawPortal(c, g, t, scaleUp) {
    const x = g.x, y = g.y - 44, s = scaleUp || 1;
    c.save(); c.translate(x, y); c.scale(s, s);
    const glow = c.createRadialGradient(0, 0, 4, 0, 0, 80); glow.addColorStop(0, 'rgba(125,220,31,.55)'); glow.addColorStop(1, 'rgba(125,220,31,0)'); c.fillStyle = glow; c.fillRect(-80, -80, 160, 160);
    for (let i = 0; i < 4; i++) {
        c.save(); c.rotate(t * (1.2 + i * .5) * (i % 2 ? -1 : 1));
        c.strokeStyle = [SENA.verdeClaro, SENA.amarillo, SENA.cyan, '#fff'][i]; c.lineWidth = 4 - i * .6; c.shadowColor = c.strokeStyle; c.shadowBlur = 14;
        c.beginPath(); c.ellipse(0, 0, 24 - i * 3.5, 46 - i * 6, 0, 0, TAU * .72); c.stroke(); c.restore();
    }
    const core = c.createRadialGradient(0, 0, 1, 0, 0, 24); core.addColorStop(0, '#fff'); core.addColorStop(.5, 'rgba(125,220,31,.9)'); core.addColorStop(1, 'rgba(0,48,77,.2)');
    c.fillStyle = core; c.beginPath(); c.ellipse(0, 0, 15, 36, 0, 0, TAU); c.fill(); c.restore();
    for (let i = 0; i < 6; i++) { const a = t * 2 + i * 1.05, rr2 = 30 + (i % 3) * 8; c.fillStyle = [SENA.amarillo, SENA.verdeClaro, SENA.cyan][i % 3]; c.beginPath(); c.arc(x + Math.cos(a) * rr2 * .6, y + Math.sin(a) * rr2, 2.2, 0, TAU); c.fill(); }
    c.fillStyle = '#fff'; c.font = '700 13px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText('SIGUIENTE ▸', x, y - 62 + Math.sin(t * 3) * 3);
}
function drawHint(c, h) {
    c.font = '600 14px Fredoka, sans-serif'; c.textAlign = 'center';
    const w = c.measureText(h.t).width + 24;
    c.fillStyle = 'rgba(0,28,48,.78)'; rr(c, h.x - w / 2, h.y - 17, w, 26, 13); c.fill();
    c.strokeStyle = 'rgba(57,169,0,.9)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#e8fbff'; c.fillText(h.t, h.x, h.y + 1);
}
function drawNameTag(c, name, x, y) {
    c.font = '700 13px Fredoka, sans-serif'; c.textAlign = 'center';
    const w = c.measureText(name).width + 18;
    c.fillStyle = 'rgba(0,16,28,.75)'; rr(c, x - w / 2, y - 12, w, 20, 10); c.fill();
    c.strokeStyle = SENA.verde; c.lineWidth = 1.8; c.stroke();
    c.fillStyle = '#fff'; c.fillText(name, x, y + 3);
}

function renderGame() {
    const c = ctx, L = G.L, p = G.p, t = G.clock;
    drawBackground(c, G.cam.x, G.cam.y, t);
    let sx = 0, sy = 0; if (G.shake > 0) { sx = rand(-1, 1) * G.shake * 14; sy = rand(-1, 1) * G.shake * 14; }
    c.save(); c.translate(-G.cam.x + sx, -G.cam.y + sy);
    const x0 = G.cam.x - 120, x1 = G.cam.x + G.vw + 120;
    for (const h of L.hints) if (h.x > x0 - 200 && h.x < x1 + 200) drawHint(c, h);
    for (const pl of L.plats) { if (pl.x + pl.w < x0 || pl.x > x1) continue; drawPlat(c, pl, L, t); }
    for (const cp of L.cps) if (cp.x > x0 && cp.x < x1) drawCheckpoint(c, cp, t);
    for (const r of L.rails) if (r.x + r.w > x0 && r.x < x1) drawRail(c, r, t);
    for (const s of L.spikes) if (s[0] + s[2] > x0 && s[0] < x1) drawSpikes(c, s, t);
    for (const l of L.lasers) if (l.x > x0 && l.x < x1) drawLaser(c, l, L, t);
    for (const o of L.orbs) if (o.cx + o.rad > x0 && o.cx - o.rad < x1) drawOrb(c, o, L, t);
    for (const s of L.saws) if (s.x + s.ax + 30 > x0 && s.x - s.ax - 30 < x1) drawSaw(c, s, L, t);
    drawPortal(c, L.goal, t);
    // rayo de reaparición
    if (G.spawnFx) {
        const f = G.spawnFx, a = clamp(1 - f.t / 1, 0, 1);
        if (a > 0) {
            const g = c.createLinearGradient(0, f.y - 400, 0, f.y); g.addColorStop(0, 'rgba(125,220,31,0)'); g.addColorStop(1, `rgba(180,255,120,${a * .8})`);
            c.fillStyle = g; c.fillRect(f.x - 20 * a - 4, f.y - 400, 40 * a + 8, 400);
            c.strokeStyle = `rgba(253,195,0,${a})`; c.lineWidth = 3; c.beginPath(); c.ellipse(f.x, f.y, 14 + f.t * 60, 4 + f.t * 12, 0, 0, TAU); c.stroke();
        }
    }
    // sombra del personaje
    if (!p.dead) {
        // mascota
        const pet = G.pet; if (profile.pet) drawPet(c, profile.pet, pet.x, pet.y + (PET_FLY[profile.pet] ? 0 : 0), pet.face, pet.t, pet.mv);
        c.save();
        if (p.rot) { c.translate(p.x, p.y - 26); c.rotate(p.rot); c.translate(-p.x, -(p.y - 26)); }
        const vis = !(G.spawnFx && G.spawnFx.t < .25 && Math.floor(G.spawnFx.t * 30) % 2);
        if (vis) drawChar(c, profile, { state: p.state, t: p.t, moving: p.moving }, p.x, p.y, p.face, p.scale || 1);
        c.restore();
        if (G.state !== 'levelEnd') drawNameTag(c, profile.name, p.x, p.y - 74);
    }
    drawParts(c);
    c.restore();
    if (G.flash > 0) { c.fillStyle = `rgba(200,255,160,${G.flash})`; c.fillRect(0, 0, G.vw, G.vh); }
}

/* ---------- escena del menú ---------- */
const menuPet = { x: 0, y: 0, t: 0 };
function renderMenu() {
    const c = ctx, t = G.clock, vw = G.vw, vh = G.vh, portrait = G.W < 860;
    drawBackground(c, t * 40, 0, t);
    const cx = portrait ? vw * .5 : vw * .74, cy = portrait ? vh * .9 : vh * .72, sc = portrait ? 2.6 : 3.4;
    // plataforma flotante
    const fy = Math.sin(t * 1.4) * 5;
    c.save(); c.translate(cx, cy + 12 + fy);
    c.shadowColor = SENA.verde; c.shadowBlur = 40; const g = c.createLinearGradient(0, 0, 0, 40); g.addColorStop(0, '#0b3a5a'); g.addColorStop(1, '#021a2c');
    c.fillStyle = g; c.beginPath(); c.moveTo(-130, 0); c.lineTo(130, 0); c.lineTo(90, 36); c.lineTo(0, 60); c.lineTo(-90, 36); c.fill(); c.shadowBlur = 0;
    c.fillStyle = SENA.verde; rr(c, -130, -4, 260, 12, 6); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-120, -2, 240, 2);
    c.restore();
    const cyc = Math.floor(t / 2.8) % 3, state = ['wave', 'dance', 'idle'][cyc];
    drawChar(c, profile, { state, t }, cx, cy + fy + 6, 1, sc);
    if (profile.pet) drawPet(c, profile.pet, cx - 80 * sc / 3.4, cy + fy + 6 + (PET_FLY[profile.pet] ? -30 + Math.sin(t * 3) * 4 : 0), 1, t, false);
    drawNameTag(c, profile.name, cx, cy + fy - 52 * sc - 22);
    // confeti ambiente
    if (Math.random() < .25) G.parts.push({ x: rand(0, vw), y: -10, vx: rand(-20, 20), vy: rand(30, 80), life: 6, max: 6, c: SENA_COLS[Math.floor(Math.random() * 6)], s: rand(3, 6), g: 0, sq: true });
    drawParts(c);
}
function renderWin() {
    const c = ctx, t = G.clock;
    drawBackground(c, t * 60, 0, t);
    G.fwT -= 1 / 60; if (G.fwT <= 0) { G.fwT = rand(.25, .6); burst(rand(80, G.vw - 80), rand(60, G.vh * .55), 50, SENA_COLS, 320, 1.6, 5, 280); SFX.check && beep(rand(500, 1200), .15, 'triangle', .03); }
    drawParts(c);
}

/* =========================================================
   BUCLE PRINCIPAL
   ========================================================= */
function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    G.W = window.innerWidth; G.H = window.innerHeight;
    cv.width = Math.floor(G.W * dpr); cv.height = Math.floor(G.H * dpr);
    G.scale = Math.min(G.H / 540, G.W / 640); G.vw = G.W / G.scale; G.vh = G.H / G.scale;
    ctx.setTransform(dpr * G.scale, 0, 0, dpr * G.scale, 0, 0);
}
window.addEventListener('resize', resize);

let acc = 0, lastT = performance.now();
function update(dt) {
    G.clock += dt; if (G.shake > 0) G.shake = Math.max(0, G.shake - dt); if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 1.6);
    updateParts(dt);
    const st = G.state;
    if (st === 'play' || st === 'wait' || st === 'levelEnd') {
        acc += dt; let n = 0;
        while (acc >= STEP && n++ < 8) {
            acc -= STEP; stepWorld(STEP);
            const cur = G.state;
            if (cur === 'play') {
                if (G.p.dead) { G.deadT -= STEP; if (G.deadT <= 0) doRespawn(); }
                else { stepPlayer(STEP); G.time += STEP; }
            } else if (cur === 'levelEnd') stepEnd(STEP);
        }
        if (G.spawnFx) { G.spawnFx.t += dt; if (G.spawnFx.t > 1) G.spawnFx = null; }
        if (G.state === 'wait') { G.p.t += dt; G.p.state = 'idle'; G.p.face = 1; }
        updatePet(dt); updateCam(dt, false);
        G.hudT -= dt; if (G.hudT <= 0) { G.hudT = .15; updateHUD(); }
    }
}
function frame(now) {
    const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
    update(dt);
    ctx.save();
    const s = G.state;
    if (s === 'menu' || s === 'custom') renderMenu();
    else if (s === 'win') renderWin();
    else if (G.L) renderGame();
    ctx.restore();
    if (s === 'custom') renderPreview(dt);
    requestAnimationFrame(frame);
}

/* =========================================================
   INTERFAZ
   ========================================================= */
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function showScreen(id) {
    $$('.screen').forEach(s => s.classList.add('hidden'));
    if (id) $('#' + id).classList.remove('hidden');
}
let bannerTimer = 0;
function banner(txt) {
    const b = $('#banner'); b.textContent = txt; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('show'), 2000);
}
function updateHUD() {
    if (!G.L) return;
    $('#hudLevel').textContent = `${G.lvl + 1}/${LEVELS.length}`; $('#hudName').textContent = G.L.d.name;
    $('#hudTime').textContent = fmtTime(G.time); $('#hudDeaths').textContent = G.deaths;
    const pr = G.p ? clamp((G.p.x - G.L.d.spawn[0]) / (G.L.goal.x - G.L.d.spawn[0]), 0, 1) : 0;
    $('#hudBar').style.width = (pr * 100).toFixed(1) + '%';
}
async function levelIntro(i, token) {
    const d = LEVELS[i], el = $('#intro');
    el.innerHTML = `<small>NIVEL ${i + 1} / ${LEVELS.length}</small><h2>${d.name}</h2><p>${d.sub}</p>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    await sleep(1900); el.classList.remove('show');
    return token === G.token;
}
async function countdown(token) {
    const el = $('#count');
    for (const n of ['3', '2', '1', '¡YA!']) {
        if (token !== G.token) return false;
        el.textContent = n; el.classList.toggle('ya', n === '¡YA!'); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
        if (n === '¡YA!') { SFX.go(); G.flash = .5; G.shake = .25; confettiBurst(); } else SFX.tick();
        await sleep(750);
    }
    return token === G.token;
}
function confettiBurst() {
    for (let k = 0; k < 4; k++) burst(G.cam.x + rand(.1, .9) * G.vw, G.cam.y + rand(.1, .5) * G.vh, 40, SENA_COLS, 420, 1.6, 7, 500);
}
async function startGame(i, fresh) {
    audio(); SFX.start();
    const token = ++G.token;
    const curtain = $('#curtain'); curtain.className = 'go';
    await sleep(750); if (token !== G.token) return;
    if (fresh) { G.deaths = 0; G.time = 0; G.deathsByLevel = Array(LEVELS.length).fill(0); }
    loadLevel(i); G.state = 'wait';
    showScreen(null); $('#hud').classList.remove('hidden'); $('#touch').classList.remove('hidden'); $('#pause').classList.add('hidden');
    updateHUD(); updateCam(0, true);
    await sleep(200); curtain.className = 'out';
    if (!(await levelIntro(i, token))) return;
    if (!(await countdown(token))) return;
    G.state = 'play';
}
function goMenu() {
    G.token++; G.state = 'menu'; G.parts.length = 0;
    $('#hud').classList.add('hidden'); $('#touch').classList.add('hidden'); $('#intro').classList.remove('show'); $('#count').classList.remove('go'); $('#curtain').className = '';
    showScreen('menu'); refreshMenu();
}
function togglePause() {
    if (G.state === 'play') { G.state = 'paused'; showScreen('pause'); }
    else if (G.state === 'paused') { G.state = 'play'; showScreen(null); }
}

/* ---------- título animado ---------- */
function buildTitle() {
    const t = $('#title'); t.innerHTML = '';
    const words = [['SOFÍA', ''], ['PLUS', 'plus'], ['ÁLVAREZ', 'alv']]; let n = 0;
    for (const [w, cls] of words) {
        const d = document.createElement('span'); d.className = 'word ' + cls;
        for (const ch of w) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; s.style.animationDelay = (n++ * .09) + 's'; d.appendChild(s); }
        t.appendChild(d);
    }
}
function refreshMenu() {
    $('#chipName').textContent = profile.name;
    const box = $('#levelChips'); box.innerHTML = '';
    LEVELS.forEach((l, i) => {
        const b = document.createElement('button'); b.textContent = i + 1; b.title = l.name; b.disabled = i + 1 > maxLevel;
        b.onclick = () => { SFX.click(); startGame(i, true); }; box.appendChild(b);
    });
}

/* ---------- personalización ---------- */
const GROUPS = [
    { k: 'skin', label: 'Piel', type: 'sw', vals: OPT.skin },
    { k: 'hairStyle', label: 'Cabello', type: 'chip', vals: OPT.hairStyle },
    { k: 'hairColor', label: 'Color de cabello', type: 'sw', vals: OPT.hairColor },
    { k: 'uniform', label: 'Uniforme SENA', type: 'chip', vals: OPT.uniform.map(u => u.n), dots: OPT.uniform.map(u => u.c) },
    { k: 'glasses', label: 'Gafas', type: 'chip', vals: OPT.glasses },
    { k: 'hat', label: 'Gorros y sombreros', type: 'chip', vals: OPT.hat },
    { k: 'pet', label: 'Mascota', type: 'chip', vals: OPT.pet }
];
const pv = { cv: $('#preview'), pose: 0, t: 0, face: 1 };
const POSES = ['idle', 'run', 'jump', 'wave', 'dance', 'hang'];
function buildCustomize() {
    const box = $('#optionPanels'); box.innerHTML = '';
    // personajes predefinidos
    const g0 = document.createElement('div'); g0.className = 'group'; g0.innerHTML = '<h3>Personajes</h3>';
    const row0 = document.createElement('div'); row0.className = 'opts';
    PRESETS.forEach(pr => {
        const b = document.createElement('button'); b.className = 'preset'; const cc = document.createElement('canvas'); cc.width = 96; cc.height = 116; b.appendChild(cc);
        const sp = document.createElement('span'); sp.textContent = pr.name; b.appendChild(sp);
        const x = cc.getContext('2d'); x.fillStyle = '#04283f'; x.fillRect(0, 0, 96, 116); drawChar(x, pr, { state: 'idle', t: 0 }, 48, 100, 1, 1.45);
        b.onclick = () => { LOOK_KEYS.forEach(k => profile[k] = pr[k]); save(); SFX.click(); refreshOptions(); };
        row0.appendChild(b);
    });
    g0.appendChild(row0); box.appendChild(g0);
    GROUPS.forEach(gr => {
        const g = document.createElement('div'); g.className = 'group'; g.innerHTML = `<h3>${gr.label}</h3>`;
        const row = document.createElement('div'); row.className = 'opts';
        gr.vals.forEach((v, i) => {
            const b = document.createElement('button'); b.dataset.k = gr.k; b.dataset.i = i;
            if (gr.type === 'sw') { b.className = 'sw'; b.style.background = v; b.title = gr.label + ' ' + (i + 1); }
            else { b.className = 'chip'; if (gr.dots) { const d = document.createElement('span'); d.className = 'dot'; d.style.background = gr.dots[i]; b.appendChild(d); } b.appendChild(document.createTextNode(v)); }
            b.onclick = () => { profile[gr.k] = i; save(); SFX.click(); refreshOptions(); };
            row.appendChild(b);
        });
        g.appendChild(row); box.appendChild(g);
    });
    refreshOptions();
}
function refreshOptions() {
    $$('#optionPanels [data-k]').forEach(b => b.classList.toggle('on', profile[b.dataset.k] === +b.dataset.i));
    $('#previewName').textContent = profile.name;
}
function renderPreview(dt) {
    const c = pv.cv.getContext('2d'); pv.t += dt; const W = 320, H = 380;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#00101c'); g.addColorStop(1, '#06405e'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 24; i++) { c.fillStyle = `rgba(255,255,255,${.3 + .5 * Math.abs(Math.sin(pv.t + i))})`; c.fillRect((i * 97) % W, (i * 53) % (H - 80), 2, 2); }
    const rg = c.createRadialGradient(W / 2, 270, 10, W / 2, 270, 170); rg.addColorStop(0, 'rgba(57,169,0,.4)'); rg.addColorStop(1, 'rgba(57,169,0,0)'); c.fillStyle = rg; c.fillRect(0, 100, W, 280);
    const state = POSES[pv.pose], y = 318, bob = state === 'jump' ? -Math.abs(Math.sin(pv.t * 4)) * 36 : 0;
    c.fillStyle = '#0b3a5a'; c.beginPath(); c.ellipse(W / 2, y + 4, 120, 16, 0, 0, TAU); c.fill();
    c.fillStyle = SENA.verde; c.beginPath(); c.ellipse(W / 2, y, 120, 14, 0, 0, TAU); c.fill();
    let cy = y + bob; if (state === 'hang') { cy = 250; c.strokeStyle = SENA.amarillo; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(W / 2 - 90, 190); c.lineTo(W / 2 + 90, 190); c.stroke(); }
    const sc = 4.3;
    if (profile.pet) drawPet(c, profile.pet, W / 2 - pv.face * 95, y + (PET_FLY[profile.pet] ? -60 : 0), pv.face, pv.t, state === 'run');
    drawChar(c, profile, { state, t: pv.t, moving: true }, W / 2, cy, pv.face, sc);
}

/* ---------- eventos de UI ---------- */
function bindUI() {
    buildTitle(); refreshMenu();
    $('#btnPlay').onclick = () => { SFX.click(); startGame(0, true); };
    $('#btnCustom').onclick = () => { SFX.click(); G.state = 'custom'; showScreen('customize'); buildCustomize(); };
    $('#btnCustomDone').onclick = () => { SFX.click(); G.state = 'menu'; showScreen('menu'); refreshMenu(); };
    $('#btnName').onclick = () => { SFX.click(); showScreen('nameModal'); const i = $('#nameInput'); i.value = profile.name; setTimeout(() => { i.focus(); i.select(); }, 50); };
    const saveName = () => { const v = $('#nameInput').value.trim().slice(0, 14); profile.name = v || 'Jugador'; save(); SFX.check(); showScreen('menu'); refreshMenu(); };
    $('#btnNameSave').onclick = saveName;
    $('#btnNameCancel').onclick = () => { SFX.click(); showScreen('menu'); };
    $('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveName(); e.stopPropagation(); });
    $('#btnPose').onclick = () => { pv.pose = (pv.pose + 1) % POSES.length; SFX.click(); };
    pv.cv.onclick = () => { pv.pose = (pv.pose + 1) % POSES.length; };
    $('#btnTurn').onclick = () => { pv.face *= -1; SFX.click(); };
    $('#btnRandom').onclick = () => { LOOK_KEYS.forEach(k => profile[k] = Math.floor(Math.random() * OPT[k].length)); save(); SFX.start(); refreshOptions(); };
    $('#btnMute').onclick = () => { muted = !muted; $('#btnMute').textContent = muted ? '🔇' : '🔊'; };
    $('#btnPause').onclick = () => togglePause();
    $('#btnResume').onclick = () => togglePause();
    $('#btnRestart').onclick = () => { SFX.click(); startGame(G.lvl, false); };
    $('#btnToMenu').onclick = () => { SFX.click(); goMenu(); };
    $('#btnWinAgain').onclick = () => { SFX.click(); startGame(0, true); };
    $('#btnWinMenu').onclick = () => { SFX.click(); goMenu(); };
    $('#btnStats').onclick = () => { SFX.click(); openStatsModal(); };
    $('#btnPauseStats').onclick = () => { SFX.click(); openStatsModal(); };
    $('#btnWinStats').onclick = () => { SFX.click(); openStatsModal(); };
    $('#btnStatsClose').onclick = () => {
        SFX.click();
        if (G.state === 'paused') showScreen('pause');
        else if (G.state === 'win') showScreen('win');
        else { G.state = 'menu'; showScreen('menu'); refreshMenu(); }
    };
    // táctil
    $$('#touch button').forEach(b => {
        const k = b.dataset.k;
        b.addEventListener('pointerdown', e => { e.preventDefault(); touch[k] = true; if (k === 'jump') G.jbuf = .12; audio(); });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, () => { touch[k] = false; }));
    });
}
window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) {
        keys[e.code] = true;
        if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) G.jbuf = .12;
        if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
        if (e.code === 'KeyM') { muted = !muted; $('#btnMute').textContent = muted ? '🔇' : '🔊'; }
        if (e.code === 'KeyR' && G.state === 'play') die();
        audio();
    }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; for (const k in touch) touch[k] = false; if (G.state === 'play') togglePause(); });

/* ---------- arranque ---------- */
resize(); bindUI();
requestAnimationFrame(t => { lastT = t; requestAnimationFrame(frame); });
window.__obby = { G, LEVELS, loadLevel, update, stepPlayer, stepWorld, keys, inp, profile };