'use strict';

// ===================== CONSTANTS =====================
const W = 960, H = 540;
const GROUND_Y = 500;
const GRAVITY = 1100;
const MOVE_SPEED = 240;
const JUMP_V = -540;
const JUMP_CUT_V = -220;
const MAX_FALL = 900;
const BULLET_SPEED = 620;
const FIRE_CD = 0.2, RAPID_FIRE_CD = 0.09;
const INVULN_TIME = 0.8;
const DOUBLE_JUMP_V = -470;
const DASH_SPEED = 620, DASH_TIME = 0.16, DASH_CD = 0.7;
const BULLET_LIFE = 1.6;

const C = {
  navy: '#070b24', cyan: '#29f0ff', pink: '#ff2e88', purple: '#b14cff',
  yellow: '#ffe066', white: '#e8f6ff', dim: '#7d86c7', ledge: '#1b1f5e', ground: '#0f1745',
};

// Timed weapon drops. shield and bomb are instant; the rest last `dur` seconds.
const WEAPONS = {
  spread: { name: 'SHARE BLAST', letter: 'S', color: C.yellow, dur: 10 },
  pierce: { name: 'FIREWALL BEAM', letter: 'F', color: '#ff8a3d', dur: 10 },
  homing: { name: 'RETARGETING ADS', letter: 'H', color: C.pink, dur: 10 },
  shield: { name: 'AD-BLOCKER', letter: 'A', color: C.cyan },
  bomb: { name: 'CTRL+ALT+DEL', letter: 'B', color: C.white },
};
const WEAPON_DROPS = ['spread', 'spread', 'pierce', 'pierce', 'homing', 'homing', 'shield', 'shield', 'bomb'];

// Ledge heights are ~90px apart so every level is reachable with one jump.
const PLATFORMS = [
  { x: 0, y: GROUND_Y, w: W, h: 40, solid: true },
  { x: 60, y: 410, w: 180, h: 14 },
  { x: 620, y: 410, w: 180, h: 14 },
  { x: 330, y: 320, w: 200, h: 14 },
  { x: 80, y: 230, w: 170, h: 14 },
  { x: 560, y: 230, w: 140, h: 14 },
];
const LEDGES = PLATFORMS.filter(p => !p.solid);

// Bullet heights when standing on: high ledge, mid ledge, low ledge, ground.
const SHOT_LANES = [212, 302, 392, 482];
// Horizontal laser lanes cover the high, mid and ground standing zones (low ledges are always safe).
const LASER_LANES = [194, 284, 464];

// ===================== STORY: THE TIMELINE =====================
// story.js (loaded first) provides FIRST_YEAR, LAST_YEAR, BOSS_YEARS, CHAPTERS and TIMELINE,
// the real incidents per year from timeline.js.
// Each real threat is played by an enemy that behaves and looks like it.
const THREAT_ENEMY = {
  botnet: 'drone', ransomware: 'lockwall', phishing: 'spam', hack: 'spam', worm: 'worm',
  virus: 'spinner', breach: 'turret', spyware: 'turret', misinfo: 'popup',
};
// Unlabelled enemies (fillers, boss summons, worm splits) still look like a real threat.
const DEFAULT_LOOK = { spam: 'phishing', drone: 'botnet', popup: 'misinfo', spinner: 'virus', turret: 'spyware', worm: 'worm', lockwall: 'ransomware' };
const THREAT_NAMES = {
  botnet: 'BOTNET', ransomware: 'RANSOMWARE', phishing: 'PHISHING', hack: 'HACKER', worm: 'WORM',
  virus: 'MALWARE', breach: 'DATA BREACH', spyware: 'SPYWARE', misinfo: 'MISINFO',
};
const FILLER_KINDS = ['spam', 'drone', 'popup', 'spinner', 'turret', 'worm'];
const RUN_SPACING = 240;    // px of scrolling between real incidents (~1.5 s apart)
const RUN_FIRST = 30;       // px before the first incident arrives (almost immediately)
const ANCHORED = new Set(['spam', 'worm', 'turret', 'popup', 'lockwall']); // ride the scrolling ground
const scrollSpeedFor = (year, diff) => (140 + (year - FIRST_YEAR) * 3.5) * (0.9 + 0.1 * diff);

const BOSS_ATTACKS = ['laser_sweep', 'drone_swarm', 'popup_wall'];
const SCORE = { spam: 100, popup: 150, drone: 200, spinner: 175, turret: 250, worm: 300, lockwall: 350, boss: 1000 };
const ENEMY_COLOR = { spam: C.pink, popup: C.white, drone: C.purple, spinner: '#ff4d4d', turret: C.white, worm: '#7dff6a', lockwall: C.yellow };

// Perks offered between waves (1 of 3). max_hp can stack; the rest are one-time.
const PERKS = {
  max_hp: { name: 'EXTRA HEART', desc: '+1 max heart and heal 1' },
  fire_rate: { name: 'OVERCLOCK', desc: 'Fire 20% faster' },
  long_dash: { name: 'LOW LATENCY', desc: 'Dash recharges 40% faster' },
  big_bullets: { name: 'BIG DATA', desc: 'Bigger, easier-to-land shots' },
  magnet: { name: 'CLICKBAIT', desc: 'Pickups fly toward you' },
  combo_window: { name: 'GOING VIRAL', desc: 'Combo timer lasts 1s longer' },
  iframes: { name: 'BUFFERING', desc: 'Longer invulnerability after hits' },
};
const PERK_IDS = Object.keys(PERKS);
const PERK_AUTO_PICK = 8; // seconds before the highlighted perk is installed automatically

const COMBO_WINDOW = 2;
const comboMult = chain => Math.min(5, 1 + Math.floor(chain / 4));


const TAUNTS = {
  low: ["Two hearts left? I've seen sturdier browser tabs.", "Don't worry, I'll send the gentle spam. I'm generous like that."],
  jumpy: ["So much jumping. The floor is starting to take it personally.", "You hop like an unpatched bunny. Drones, assemble."],
  accurate: ["Nice aim. Let's see how you handle pop-ups you can't close.", "Accuracy noted. Adjusting algorithm... smugly."],
  sloppy: ["Most of your shots are still out there, searching for meaning.", "Spray and pray? I prefer targeted ads."],
  generic: ["I've optimized your experience. You're welcome.", "Your engagement metrics are adorable."],
  boss: ["Enough data. Time to meet me in person.", "I have read your cookies. All of them."],
  bossDown: ["Error 404: my dignity not found.", "This is not the end. I'll be back after a short ad."],
};
const WIN_LINES = ['THE ALGORITHM has been unsubscribed.', 'The internet is back in its box. For now.'];
const LOSE_LINES = ['You have been successfully monetized.', 'Your session has expired. Please accept all cookies.'];

// ===================== SETUP =====================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // keep pixel art crisp when sprites are squashed

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const cx = e => e.x + e.w / 2;
const cy = e => e.y + e.h / 2;
const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// ===================== INPUT =====================
const keys = {};
const pressed = new Set();
let mouseDown = false;
let mouseX = W / 2, mouseY = H / 2; // in logical canvas pixels

const K = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space', 'KeyW', 'ArrowUp'],
  drop: ['KeyS', 'ArrowDown'],
  fire: ['KeyJ'],
  dash: ['ShiftLeft', 'ShiftRight', 'KeyK'],
  pause: ['KeyP', 'Escape'],
  restart: ['KeyR'],
  start: ['Enter', 'Space'],
  howto: ['KeyH'],
};
const BLOCKED_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace']);

window.addEventListener('keydown', e => {
  if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed.add(e.code);
  keys[e.code] = true;
  unlockAudio();
  // Matched on e.key too, so it works across keyboard layouts.
  if (!e.repeat && (e.key === '[' || e.code === 'BracketLeft' || e.code === 'PageUp')) pressed.add('LevelPrev');
  if (!e.repeat && (e.key === ']' || e.code === 'BracketRight' || e.code === 'PageDown')) pressed.add('LevelNext');
  if (e.repeat) return;
  if (e.code === 'KeyM') { muted = !muted; applyVolumes(); }
  if (e.code === 'KeyN') { musicOn = !musicOn; applyVolumes(); }
  if (e.code === 'KeyV') { voiceOn = !voiceOn; stopSpeech(); }
  if (e.code === 'KeyF') window.toggleAutoFire();
  if (e.code === 'KeyM' && muted) stopSpeech();
});

// ===================== AUDIO =====================
// Everything is synthesized (no asset files). The AudioContext can only start after a
// user gesture, so it is created on the first key press or click. SFX and music have
// their own gain buses so M (all sound) and N (music only) can toggle independently.
let audioCtx = null, masterBus = null, sfxBus = null, musicBus = null, noiseBuf = null;
let muted = false;
let musicOn = true;

function unlockAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new AudioContext();
    masterBus = audioCtx.createGain();
    masterBus.connect(audioCtx.destination);
    sfxBus = audioCtx.createGain();
    sfxBus.connect(masterBus);
    musicBus = audioCtx.createGain();
    musicBus.connect(masterBus);
    noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    applyVolumes();
    Music.start();
  } catch {
    audioCtx = null;
  }
}

function applyVolumes() {
  if (!masterBus) return;
  masterBus.gain.value = muted ? 0 : 1;
  musicBus.gain.value = musicOn ? 0.4 : 0;
}

// One oscillator note with an exponential decay; t0 is an absolute AudioContext time.
function osc(t0, freq, freqEnd, dur, type, vol, bus = sfxBus, lowpass = 0) {
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = o;
  if (lowpass) {
    const f = audioCtx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass;
    node = o.connect(f);
  }
  node.connect(g).connect(bus);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

// Filtered white-noise burst (explosions, drums, whooshes).
function noise(t0, dur, vol, freq, ftype = 'lowpass', bus = sfxBus) {
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuf;
  const f = audioCtx.createBiquadFilter();
  f.type = ftype;
  f.frequency.value = freq;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.02);
}

function tone(freq, freqEnd, dur, type, vol, delay = 0) {
  osc(audioCtx.currentTime + delay, freq, freqEnd, dur, type, vol);
}
const soon = (d = 0) => audioCtx.currentTime + d;

const SFX = {
  shoot: () => tone(880, 440, 0.06, 'square', 0.03),
  hit: () => { tone(260, 140, 0.05, 'square', 0.05); noise(soon(), 0.04, 0.06, 3000, 'highpass'); },
  kill: () => { tone(600, 90, 0.18, 'triangle', 0.12); noise(soon(), 0.15, 0.1, 1500); },
  hurt: () => { tone(220, 60, 0.3, 'sawtooth', 0.1); noise(soon(), 0.2, 0.15, 800); },
  pickup: () => { tone(520, 780, 0.08, 'sine', 0.12); tone(780, 1240, 0.1, 'sine', 0.12, 0.08); },
  weapon: () => [660, 880, 1320].forEach((f, i) => tone(f, f * 1.02, 0.08, 'square', 0.05, i * 0.06)),
  warn: () => { tone(330, 330, 0.12, 'square', 0.06); tone(330, 330, 0.12, 'square', 0.06, 0.2); },
  bossHit: () => tone(160, 90, 0.07, 'square', 0.07),
  explode: () => { noise(soon(), 0.9, 0.45, 900); tone(120, 25, 0.9, 'triangle', 0.2); noise(soon(0.1), 0.6, 0.2, 300); },
  dash: () => { noise(soon(), 0.14, 0.12, 2500, 'bandpass'); tone(300, 900, 0.1, 'sine', 0.05); },
  bomb: () => { noise(soon(), 1.3, 0.55, 500); tone(80, 20, 1.1, 'sine', 0.35); tone(1400, 100, 0.4, 'sawtooth', 0.06); },
  phase: () => { tone(110, 40, 1.0, 'sawtooth', 0.14); noise(soon(), 0.8, 0.25, 600); tone(55, 30, 1.2, 'square', 0.08, 0.2) },
  comboUp: () => tone(880, 1320, 0.08, 'sine', 0.07),
  director: () => { tone(440, 440, 0.07, 'sine', 0.06); tone(660, 660, 0.07, 'sine', 0.06, 0.1); tone(880, 880, 0.1, 'sine', 0.06, 0.2); },
  select: () => tone(700, 1050, 0.07, 'square', 0.05),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.12, i * 0.12)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.22, 'triangle', 0.12, i * 0.16)),
};

function sfx(name) {
  if (muted || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  SFX[name]();
}

// ---- Voice ----
// Boss lines are spoken with the browser's built-in speech synthesis (no API, no assets).
const canSpeak = 'speechSynthesis' in window;
let voiceOn = true;
let robotVoice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  robotVoice = vs.find(v => /^en/i.test(v.lang) && /Fred|Ralph|Albert/i.test(v.name))
    || vs.find(v => /^en[-_]US/i.test(v.lang))
    || vs.find(v => /^en/i.test(v.lang)) || null;
}
if (canSpeak) {
  pickVoice();
  speechSynthesis.addEventListener('voiceschanged', pickVoice);
}

function speak(line) {
  if (!canSpeak || !voiceOn || muted || !line) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(line);
  if (robotVoice) u.voice = robotVoice;
  u.pitch = 0.4;
  u.rate = 1.05;
  u.volume = 0.9;
  speechSynthesis.speak(u);
}

function stopSpeech() {
  if (canSpeak) speechSynthesis.cancel();
}

// ---- Music ----
// A tiny synthwave sequencer: 4 bars (Am F C G) of 16 steps, scheduled slightly ahead of
// time on the audio clock so timing stays tight regardless of frame rate.
// Modes: calm (title, director, results), wave, boss.
const CHORDS = [
  { root: 110.0, notes: [220.0, 261.63, 329.63] },  // Am
  { root: 87.31, notes: [174.61, 220.0, 261.63] },  // F
  { root: 130.81, notes: [261.63, 329.63, 392.0] }, // C
  { root: 98.0, notes: [196.0, 246.94, 293.66] },   // G
];
const MUSIC_BPM = { calm: 96, wave: 124, boss: 146 };

const Music = {
  mode: 'calm', step: 0, nextTime: 0, timer: null,
  start() {
    if (this.timer) return;
    this.nextTime = audioCtx.currentTime + 0.1;
    this.timer = setInterval(() => this.tick(), 25);
  },
  setMode(mode) { this.mode = mode; },
  tick() {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const stepDur = 60 / MUSIC_BPM[this.mode] / 4;
    if (this.nextTime < audioCtx.currentTime - 0.2) this.nextTime = audioCtx.currentTime + 0.05; // tab was hidden
    const silent = muted || !musicOn || (scene === 'play' && game && game.paused);
    while (this.nextTime < audioCtx.currentTime + 0.12) {
      if (!silent) this.play(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 64;
    }
  },
  play(i, t, sd) {
    const chord = CHORDS[Math.floor(i / 16)], s = i % 16, m = this.mode, bus = musicBus;
    if (m === 'calm') {
      if (s % 4 === 0) osc(t, chord.root, chord.root, sd * 3.5, 'sawtooth', 0.1, bus, 500);
      if (s % 2 === 0) { const f = chord.notes[(s / 2) % 3]; osc(t, f * 2, f * 2, sd * 1.8, 'sine', 0.05, bus); }
      if (s === 0 || s === 8) osc(t, 120, 40, 0.15, 'sine', 0.35, bus);
      if (s % 4 === 2) noise(t, 0.03, 0.04, 8000, 'highpass', bus);
      return;
    }
    const boss = m === 'boss';
    // Bass: driving 16ths with octave jumps.
    const bassF = s % 4 === 2 ? chord.root * 2 : chord.root;
    osc(t, bassF, bassF, sd * 0.9, 'sawtooth', boss ? 0.13 : 0.11, bus, boss ? 1100 : 750);
    // Arp lead.
    if (boss || s % 2 === 0) {
      const f = chord.notes[(boss ? s : s / 2) % 3] * (boss ? 4 : 2);
      osc(t, f, f, sd * 0.8, boss ? 'square' : 'triangle', boss ? 0.03 : 0.045, bus, 3000);
    }
    // Drums.
    if (s % 4 === 0 || (boss && s === 14)) osc(t, 150, 40, 0.14, 'sine', 0.45, bus);
    if (s === 4 || s === 12) { noise(t, 0.12, 0.2, 1800, 'bandpass', bus); osc(t, 190, 150, 0.08, 'triangle', 0.08, bus); }
    if (boss || s % 2 === 1) noise(t, 0.035, 0.05, 7500, 'highpass', bus);
  },
};
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  mouseDown = false;
});
// The canvas is CSS-scaled, so map client coordinates back to the 960x540 logical space.
function trackMouse(e) {
  const r = canvas.getBoundingClientRect();
  mouseX = ((e.clientX - r.left) * W) / r.width;
  mouseY = ((e.clientY - r.top) * H) / r.height;
}
canvas.addEventListener('mousemove', trackMouse);
canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  trackMouse(e);
  mouseDown = true;
  pressed.add('Mouse');
  unlockAudio();
});
window.addEventListener('mouseup', () => { mouseDown = false; });

const isDown = codes => codes.some(c => keys[c]);
const wasPressed = codes => codes.some(c => pressed.has(c));

// ===================== GAME STATE =====================
let scene = 'title'; // title | howto | play | results
let sceneTimer = 0;
let clock = 0;      // real seconds since load, drives background animation
let transition = 0; // seconds left of the glitch wipe between scenes
let game = null;

function makePlayer() {
  return {
    x: 140, y: GROUND_Y - 34, w: 24, h: 34, vx: 0, vy: 0, facing: 1, sq: 1,
    onGround: false, onSolid: false, hp: 5, maxHp: 5, invuln: 0,
    fireCd: 0, coyote: 0, jumpBuf: 0, dropTimer: 0,
    airJumps: 1, airDash: true, dashT: 0, dashCd: 0, dashDir: 1, aimAng: 0, shield: false, ghostT: 0, hurtT: 0,
  };
}

// ---- Story progress ----
// The year reached is saved after every cleared year so the story can be continued later.
const STORY_KEY = 'ia_story';
function loadStory() {
  try {
    const s = JSON.parse(localStorage.getItem(STORY_KEY) || 'null');
    if (!s || !Number.isInteger(s.year) || s.year < FIRST_YEAR || s.year > LAST_YEAR) return null;
    return {
      year: s.year,
      score: Math.max(0, Math.floor(Number(s.score) || 0)),
      perks: Array.isArray(s.perks) ? s.perks.filter(id => PERK_IDS.includes(id)).slice(0, 12) : [],
      continues: Math.max(0, Math.floor(Number(s.continues) || 0)),
    };
  } catch {
    return null;
  }
}
function saveStory(year) {
  try {
    localStorage.setItem(STORY_KEY, JSON.stringify({ year, score: game.score, perks: game.perks, continues: game.continues }));
  } catch { /* storage unavailable: progress just isn't kept */ }
  savedStory = loadStory();
}
function clearStory() {
  try { localStorage.removeItem(STORY_KEY); } catch { /* ignore */ }
  savedStory = null;
}
let savedStory = loadStory();

// resume: { year, score, perks, continues, stats?, boss? } to continue a saved or failed year.
function newGame(resume = null) {
  game = {
    phase: 'run', // run | director | boss | bossDying | playerDying
    paused: false, time: 0, score: resume ? resume.score : 0, diff: 1,
    player: makePlayer(),
    bullets: [], enemyBullets: [], enemies: [], pickups: [], lasers: [], fx: [],
    stats: resume && resume.stats ? { ...resume.stats }
      : { jumpCount: 0, shotsFired: 0, shotsHit: 0, kills: 0, maxCombo: 0, damageTaken: 0, patched: 0, incidents: 0 },
    year: FIRST_YEAR, chapter: '', run: null, platforms: PLATFORMS.map(pl => ({ ...pl })), travel: 0,
    fillerKind: 'spam', continues: resume ? resume.continues : 0, yearStart: null,
    director: null, boss: null,
    taunt: null, banner: null, controlsTimer: resume ? 0 : 5, rapidTimer: 0, endTimer: 0, result: null,
    shake: 0, hitStop: 0, slowmo: 0, aberr: 0, dieTimer: 0, screenFlash: 0,
    weapon: null, perks: resume ? [...resume.perks] : [], combo: { chain: 0, t: 0 },
    usedLines: [], sayCd: 0,
  };
  const p = game.player;
  p.maxHp = 5 + game.perks.filter(id => id === 'max_hp').length;
  p.hp = p.maxHp;
  stopSpeech();
  scene = 'play';
  sceneTimer = 0;
  transition = 0.45;

  let year = resume ? resume.year : FIRST_YEAR;
  let boss = !!(resume && resume.boss);
  // Dev start point from the dropdown: 'year:<y>' | 'boss:<y>' | 'boss:<y>:p2' | 'boss:<y>:p3'
  const dev = !resume && DEV && startPoint.match(/^(year|boss):(\d{4})(?::(p2|p3))?$/);
  if (dev) {
    year = clamp(Number(dev[2]), FIRST_YEAR, LAST_YEAR);
    boss = dev[1] === 'boss' && !!BOSS_YEARS[year];
  }
  game.year = year;
  game.yearsCleared = year - FIRST_YEAR;
  if (boss) {
    game.yearStart = { score: game.score, perks: [...game.perks], stats: { ...game.stats } };
    enterArena();
    startBoss({ difficulty: 2, bossAttackOrder: shuffle(BOSS_ATTACKS) });
    const b = game.boss;
    if (dev && dev[3] === 'p2' && b.maxPhase >= 2) b.hp = Math.floor(b.maxHp * 0.5);
    if (dev && dev[3] === 'p3' && b.maxPhase >= 3) b.hp = Math.floor(b.maxHp * 0.25);
  } else {
    startYear(year, { difficulty: 1, fillerKind: 'spam', chapterTitle: CHAPTERS[year] });
  }
}

// Start the current year again from its first second, with the score it started with.
// After a loss this counts as a continue; restarting from the pause menu doesn't.
function continueYear(penalty = true) {
  const snap = game.yearStart || { score: 0, perks: game.perks, stats: game.stats };
  newGame({
    year: game.year, score: snap.score, perks: snap.perks, stats: snap.stats,
    continues: game.continues + (penalty ? 1 : 0), boss: !!game.boss,
  });
}

// ===================== DEMO: LEVEL SKIPPING =====================
// Every stage in story order: each year's run, plus the boss fight in boss years.
const LEVELS = [];
for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
  LEVELS.push({ year: y, boss: false });
  if (BOSS_YEARS[y]) LEVELS.push({ year: y, boss: true });
}
const inStory = () => game && scene !== 'title' && scene !== 'howto';
// On the director screen between stages, the stage just cleared counts as current, so NEXT
// goes to the upcoming one (game.boss is already null there, which used to look like the year's run).
const levelIndex = () => {
  if (!inStory()) return -1;
  const d = game.director;
  if (d) return LEVELS.findIndex(l => l.year === d.nextYear && l.boss === (d.next === 'boss')) - 1;
  return LEVELS.findIndex(l => l.year === game.year && l.boss === !!game.boss);
};
const levelName = l => (l.boss ? `${l.year} BOSS` : String(l.year));

// Jumps to the previous/next stage, keeping score, perks and stats so the demo flows on.
function jumpLevel(delta) {
  const cur = levelIndex();
  const i = clamp(cur + delta, 0, LEVELS.length - 1);
  if (i === cur) return;
  const l = LEVELS[i];
  const keep = inStory();
  newGame({
    year: l.year, boss: l.boss, score: keep ? game.score : 0, perks: keep ? game.perks : [],
    stats: keep ? game.stats : undefined, continues: keep ? game.continues : 0,
  });
  sfx('select');
}
window.jumpLevel = jumpLevel;

// Demo auto-fire: keeps shooting in the facing (or mouse-aimed) direction. Toggle with F or the button.
let autoFire = true; // on by default for demos
window.toggleAutoFire = () => { autoFire = !autoFire; sfx('select'); return autoFire; };
window.isAutoFire = () => autoFire;
window.currentLevelName = () => (levelIndex() >= 0 ? levelName(LEVELS[levelIndex()]) : 'TITLE');

// ===================== DEV: START-POINT DROPDOWN =====================
let startPoint = '';
const DEV = new URLSearchParams(location.search).has('dev');
if (DEV) document.body.classList.add('dev');
const startSelect = document.getElementById('start-point');
if (startSelect && DEV) {
  startSelect.addEventListener('change', () => {
    startPoint = startSelect.value;
    startSelect.blur(); // otherwise arrow keys keep changing the dropdown while playing
    newGame();
  });
}

const hasPerk = id => !!(game && game.perks && game.perks.includes(id));

function collectStats() {
  const p = game.player, s = game.stats;
  return {
    hp: p.hp, maxHp: p.maxHp, jumpCount: s.jumpCount, shotsFired: s.shotsFired,
    shotsHit: s.shotsHit, kills: s.kills, time: Math.round(game.time),
    year: game.year, incidentsPatched: s.patched, incidentsSeen: s.incidents,
    maxCombo: s.maxCombo, perks: [...game.perks],
  };
}

// ===================== PHYSICS =====================
// Ledges are one-way (jump up through them); the ground is solid.
// While the world scrolls, enemies and pickups may leave the screen; only the player is kept on it.
function moveAndCollide(e, dt, ignoreLedges) {
  const free = game.phase === 'run' && e !== game.player;
  e.x = free ? e.x + e.vx * dt : clamp(e.x + e.vx * dt, 0, W - e.w);
  const prevBottom = e.y + e.h;
  e.y += e.vy * dt;
  e.onGround = false;
  e.onSolid = false;
  if (e.vy < 0) return;
  for (const pl of game.platforms) {
    if (ignoreLedges && !pl.solid) continue;
    if (e.x + e.w > pl.x && e.x < pl.x + pl.w && prevBottom <= pl.y + 1 && e.y + e.h >= pl.y) {
      e.y = pl.y - e.h;
      e.vy = 0;
      e.onGround = true;
      e.onSolid = !!pl.solid;
      break;
    }
  }
}

// ===================== PLAYER =====================
function updatePlayer(dt) {
  const p = game.player;
  const dir = (isDown(K.right) ? 1 : 0) - (isDown(K.left) ? 1 : 0);
  if (p.onGround) {
    p.airJumps = 1;
    p.airDash = true;
  }

  // Dash: short burst with i-frames; one per airtime.
  p.dashCd -= dt;
  if (wasPressed(K.dash) && p.dashCd <= 0 && p.dashT <= 0 && (p.onGround || p.airDash)) {
    p.dashT = DASH_TIME;
    p.dashDir = dir || p.facing;
    p.dashCd = DASH_CD * (hasPerk('long_dash') ? 0.6 : 1);
    if (!p.onGround) p.airDash = false;
    p.invuln = Math.max(p.invuln, DASH_TIME + 0.05);
    sfx('dash');
  }
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.vx = p.dashDir * DASH_SPEED;
    p.vy = 0;
    p.facing = p.dashDir;
    p.ghostT -= dt;
    if (p.ghostT <= 0) {
      p.ghostT = 0.03;
      const f = playerFrame(p);
      addFx('ghost', p.x, p.y, { img: p.facing > 0 ? f.r : f.l, life: 0.22 });
    }
  } else {
    p.vx = dir * MOVE_SPEED;
    if (dir) p.facing = dir;
  }

  p.coyote = p.onGround ? 0.08 : p.coyote - dt;
  p.jumpBuf = wasPressed(K.jump) ? 0.1 : p.jumpBuf - dt;
  if (wasPressed(K.drop) && p.onGround && !p.onSolid) p.dropTimer = 0.25;

  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.vy = JUMP_V;
    p.jumpBuf = 0;
    p.coyote = 0;
    p.sq = 1.3;
    game.stats.jumpCount++;
  } else if (p.jumpBuf > 0 && p.airJumps > 0 && !p.onGround && p.dashT <= 0) {
    p.vy = DOUBLE_JUMP_V;
    p.jumpBuf = 0;
    p.airJumps--;
    p.sq = 1.25;
    addFx('ring', cx(p), p.y + p.h, { color: C.cyan, life: 0.35 });
    game.stats.jumpCount++;
  }
  if (!isDown(K.jump) && p.vy < JUMP_CUT_V) p.vy = JUMP_CUT_V; // short hop on early release

  if (p.dashT <= 0) p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL);
  p.dropTimer -= dt;
  const wasGround = p.onGround, fallV = p.vy;
  moveAndCollide(p, dt, p.dropTimer > 0);
  if (!wasGround && p.onGround && fallV > 250) {
    p.sq = 0.72;
    addDust(cx(p), p.y + p.h, 5);
  }
  p.sq += (1 - p.sq) * Math.min(1, dt * 14);
  p.invuln -= dt;
  p.hurtT -= dt;

  // Aim: toward the cursor while the mouse button is held, otherwise straight ahead.
  if (mouseDown) {
    p.aimAng = Math.atan2(mouseY - (p.y + 16), mouseX - cx(p));
    if (p.dashT <= 0) p.facing = Math.cos(p.aimAng) >= 0 ? 1 : -1;
  } else {
    p.aimAng = p.facing > 0 ? 0 : Math.PI;
  }

  p.fireCd -= dt;
  const canFire = game.phase === 'run' || game.phase === 'boss';
  if (canFire && (isDown(K.fire) || mouseDown || autoFire) && p.fireCd <= 0) fireWeapon(p);
}

function fireWeapon(p) {
  const ang = p.aimAng;
  const wid = game.weapon ? game.weapon.id : null;
  const angles = wid === 'spread' ? [ang - 0.21, ang, ang + 0.21] : [ang];
  const big = hasPerk('big_bullets');
  const sz = big ? 12 : 8;
  for (const a of angles) {
    // Spawn from the player's centre so enemies overlapping the player still get hit.
    game.bullets.push({
      x: cx(p) - sz / 2, y: p.y + 16 - sz / 2, w: sz, h: sz,
      vx: Math.cos(a) * BULLET_SPEED, vy: Math.sin(a) * BULLET_SPEED, life: BULLET_LIFE,
      pierce: wid === 'pierce', homing: wid === 'homing', hits: wid === 'pierce' ? new Set() : null,
      big, color: wid && WEAPONS[wid].color,
    });
  }
  addFx('flash', cx(p) + Math.cos(ang) * 18, p.y + 16 + Math.sin(ang) * 18, { life: 0.06 });
  game.stats.shotsFired++;
  p.fireCd = (game.rapidTimer > 0 ? RAPID_FIRE_CD : FIRE_CD) * (hasPerk('fire_rate') ? 0.8 : 1);
  sfx('shoot');
}

function hurtPlayer() {
  const p = game.player;
  if (scene !== 'play' || p.invuln > 0 || game.phase === 'bossDying' || game.phase === 'playerDying') return;
  if (p.shield) {
    p.shield = false;
    p.invuln = INVULN_TIME;
    addFx('ring', cx(p), cy(p), { color: C.cyan, life: 0.5 });
    addSparks(cx(p), cy(p), C.cyan, 12);
    game.shake = 5;
    sfx('hit');
    return;
  }
  p.hp--;
  p.invuln = INVULN_TIME + (hasPerk('iframes') ? 0.4 : 0);
  p.hurtT = 0.25;
  game.stats.damageTaken++;
  if (game.combo.chain >= 4) addFx('text', cx(p), p.y - 16, { text: 'COMBO LOST', color: C.dim });
  game.combo.chain = 0;
  if (p.hp === 1) bossSay('player_low_hp');
  else if (p.hp > 1 && Math.random() < 0.5) bossSay('player_hit');
  p.vy = Math.min(p.vy, -260);
  addFx('text', cx(p), p.y, { text: '-1', color: C.pink });
  addSparks(cx(p), cy(p), C.cyan, 10);
  game.shake = 8;
  game.aberr = 0.25;
  sfx('hurt');
  if (p.hp <= 0) startPlayerDeath();
}

// Short slow-motion explosion before the results screen.
function startPlayerDeath() {
  const p = game.player;
  game.phase = 'playerDying';
  game.dieTimer = 1.5;
  game.slowmo = 1.2;
  game.bullets = [];
  addSparks(cx(p), cy(p), C.cyan, 30);
  addDebris(cx(p), cy(p), C.cyan, 14);
  addFx('ring', cx(p), cy(p), { color: C.pink, life: 1 });
  game.shake = 16;
  game.aberr = 0.6;
  sfx('explode');
}

// ===================== BULLETS =====================
function updateBullets(dt) {
  const b = game.boss;
  for (const bl of game.bullets) {
    if (bl.homing) steerBullet(bl, dt);
    bl.x += bl.vx * dt;
    bl.y += bl.vy * dt;
    bl.life -= dt;
    if (bl.life <= 0 || bl.x < -20 || bl.x > W + 20 || bl.y < -20 || bl.y > H + 20) { bl.dead = true; continue; }
    for (const e of game.enemies) {
      if (e.dead || e.tele > 0 || !overlaps(bl, e)) continue;
      if (e.type === 'turret' && turretBlocks(e, bl)) {
        bl.dead = true;
        addSparks(cx(bl), cy(bl), C.cyan, 5);
        break;
      }
      if (!bulletHits(bl, e)) continue;
      damageEnemy(e, Math.sign(bl.vx));
      if (bl.dead) break;
    }
    if (!bl.dead && b && game.phase === 'boss' && b.intro <= 0 && b.roar > 0 && overlaps(bl, b)) {
      bl.dead = true; // shielded while changing phase
      addSparks(cx(bl), cy(bl), C.cyan, 3);
    } else if (!bl.dead && b && game.phase === 'boss' && b.intro <= 0 && overlaps(bl, b) && bulletHits(bl, b)) {
      b.hp--;
      b.flash = 0.08;
      addSparks(cx(bl), cy(bl), C.white, 4);
      if (b.hp <= 0) bossDefeated();
      else { game.hitStop = 0.03; sfx('bossHit'); }
    }
  }
  game.bullets = game.bullets.filter(bl => !bl.dead);
}

// Registers a hit; piercing bullets hit each target once and keep flying.
function bulletHits(bl, target) {
  if (bl.hits) {
    if (bl.hits.has(target)) return false;
    bl.hits.add(target);
  } else bl.dead = true;
  if (!bl.counted) { game.stats.shotsHit++; bl.counted = true; }
  return true;
}

function steerBullet(bl, dt) {
  const bx = cx(bl), by = cy(bl);
  let best = null, bd = 420;
  for (const e of game.enemies) {
    if (e.dead || e.tele > 0) continue;
    const d = Math.hypot(cx(e) - bx, cy(e) - by);
    if (d < bd) { bd = d; best = e; }
  }
  const b = game.boss;
  if (b && game.phase === 'boss' && Math.hypot(cx(b) - bx, cy(b) - by) < bd) best = b;
  if (!best) return;
  const cur = Math.atan2(bl.vy, bl.vx);
  const want = Math.atan2(cy(best) - by, cx(best) - bx);
  const diff = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const a = cur + clamp(diff, -5 * dt, 5 * dt);
  bl.vx = Math.cos(a) * BULLET_SPEED;
  bl.vy = Math.sin(a) * BULLET_SPEED;
}

function updateEnemyBullets(dt) {
  const p = game.player;
  for (const bl of game.enemyBullets) {
    bl.x += bl.vx * dt;
    bl.y += bl.vy * dt;
    if (bl.x < -20 || bl.x > W + 20 || bl.y < -20 || bl.y > H + 20) bl.dead = true;
    else if (overlaps(bl, p)) { bl.dead = true; hurtPlayer(); }
  }
  game.enemyBullets = game.enemyBullets.filter(bl => !bl.dead);
}

// ===================== ENEMIES =====================
// Random x at least minDist from the player.
function farX(w, minDist) {
  const pc = cx(game.player);
  for (let i = 0; i < 20; i++) {
    const x = rand(20, W - w - 20);
    if (Math.abs(x + w / 2 - pc) >= minDist) return x;
  }
  return pc < W / 2 ? W - w - 20 : 20;
}

function spawnEnemy(type, opts = {}) {
  const p = game.player, d = game.diff, i = opts.i || 0;
  let e;
  if (type === 'spam') {
    const w = 26, h = 22;
    let x, y;
    if (opts.sky) {
      x = farX(w, 150);
      y = -h - 4;
    } else {
      const pc = cx(p);
      const bothFar = pc > 250 && pc < W - 250;
      const left = bothFar ? Math.random() < 0.5 : pc > W / 2;
      x = left ? 0 : W - w;
      y = GROUND_Y - h;
    }
    if (opts.at) {
      x = clamp(opts.at.x, 0, W - w);
      y = Math.min(opts.at.y, GROUND_Y - h);
    }
    e = { type, x, y, w, h, vx: 0, vy: opts.at ? -300 : 0, hp: 1, speed: 65 + 20 * d, tele: opts.at ? 0.15 : 0.5 + i * 0.6, sky: !!opts.sky };
  } else if (type === 'popup') {
    const w = opts.w || 80, h = 56;
    let x = opts.x, y = opts.y;
    if (x == null) {
      for (let tries = 0; tries < 30; tries++) {
        y = pick(SHOT_LANES) - 28;
        x = rand(30, W - w - 30);
        if (Math.hypot(x + w / 2 - cx(p), y + h / 2 - cy(p)) >= 170) break;
      }
    }
    e = { type, x, y, w, h, hp: 2, tele: 0.8, life: opts.life || 7, seed: Math.floor(rand(0, 4)) };
  } else if (type === 'drone') {
    let x, y;
    if (opts.fromBoss && game.boss) {
      x = game.boss.x < W / 2 ? game.boss.x + game.boss.w + 6 : game.boss.x - 40;
      y = game.boss.y + 50;
    } else {
      x = cx(p) > W / 2 ? 20 : W - 54;
      y = rand(150, 360);
    }
    e = {
      type, x, y, w: 34, h: 20, hp: 2, baseY: rand(150, 360), t: rand(0, 6),
      dir: x < W / 2 ? 1 : -1, speed: 80 + 20 * d, shootCd: rand(1.8, 3), tele: 0.6 + i * 0.3,
    };
  } else if (type === 'spinner') {
    // Loading Spinner: drifts toward the player, locks on, then charges in a straight line.
    e = {
      type, x: farX(28, 200), y: rand(70, 200), w: 28, h: 28, hp: 2, tele: 0.7 + i * 0.4,
      state: 'drift', st: rand(1.4, 2.4), vx: 0, vy: 0, spin: 0, speed: 380 + 30 * d, tx: 0, ty: 0,
    };
  } else if (type === 'turret') {
    // Captcha Turret: sits on the free ledge farthest from the player; shielded from the front.
    const ledges = game.platforms.filter(l => !l.solid && l.x + l.w > 40 && l.x < W - 40);
    const used = game.enemies.filter(o => o.type === 'turret').map(o => o.ledge);
    const free = ledges.filter(l => !used.includes(l));
    const dist = l => Math.abs(l.x + l.w / 2 - cx(p)) + Math.abs(l.y - p.y);
    const pl = free.sort((a, b) => dist(b) - dist(a))[0] || pick(ledges.length ? ledges : LEDGES);
    e = {
      type, ledge: pl, x: pl.x + pl.w / 2 - 15, y: pl.y - 30, w: 30, h: 30, hp: 3, tele: 0.9,
      facing: cx(p) > pl.x + pl.w / 2 ? 1 : -1, cd: 2, burst: 0, burstT: 0,
    };
  } else if (type === 'worm') {
    // Malware Worm: crawls along the ground trailing a damaging tail; splits into spam on death.
    const left = cx(p) > W / 2;
    e = {
      type, x: left ? 10 : W - 36, y: GROUND_Y - 20, w: 26, h: 20, hp: 3, tele: 0.8,
      dir: left ? 1 : -1, speed: 75 + 15 * d, t: 0, trail: [],
    };
  } else if (type === 'lockwall') {
    // Ransomware: a padlocked barrier across the lane. It blocks the way and soaks up shots.
    const hp = 5 + Math.floor((game.year - FIRST_YEAR) / 4);
    e = { type, x: opts.x ?? W + 10, y: 60, w: 56, h: GROUND_Y - 60, hp, maxHp: hp, tele: 0 };
  }
  e.flash = 0;
  e.look = opts.look || DEFAULT_LOOK[type];
  e.label = opts.label || null;
  game.enemies.push(e);
  return e;
}

function damageEnemy(e, dir = 0) {
  e.hp--;
  e.flash = 0.1;
  if (dir && e.type !== 'popup' && e.type !== 'lockwall' && e.type !== 'turret') e.x = clamp(e.x + dir * 7, 0, W - e.w); // knockback
  if (e.hp > 0) { sfx('hit'); return; }
  e.dead = true;
  const pts = addKillScore(SCORE[e.type]);
  game.stats.kills++;
  if (e.label) {
    game.stats.patched++;
    if (game.run) game.run.patched++;
    addFx('text', cx(e), e.y - 18, { text: `${e.label.toUpperCase()} PATCHED`, color: C.cyan, life: 1.2 });
  }
  maybeDropWeapon(e);
  game.hitStop = 0.03;
  const col = ENEMY_COLOR[e.type];
  addSparks(cx(e), cy(e), col, 14);
  addDebris(cx(e), cy(e), col, 6);
  sfx('kill');
  addFx(e.type === 'popup' || e.type === 'turret' || e.type === 'lockwall' ? 'x' : 'ring', cx(e), cy(e), { color: e.type === 'popup' ? C.pink : col });
  if (e.type === 'worm') for (const k of [-1, 1]) spawnEnemy('spam', { at: { x: e.x + k * 16, y: e.y } });
  if (e.type === 'lockwall') { addDebris(cx(e), cy(e) + 80, C.yellow, 10); game.shake = Math.max(game.shake, 6); }
  addFx('text', cx(e), e.y, { text: `+${pts}`, color: C.yellow });
}

// Kills chained within the combo window raise a "VIRAL" multiplier (max x5).
function addKillScore(base) {
  const c = game.combo, before = comboMult(c.chain);
  c.chain++;
  c.t = COMBO_WINDOW + (hasPerk('combo_window') ? 1 : 0);
  game.stats.maxCombo = Math.max(game.stats.maxCombo, c.chain);
  const mult = comboMult(c.chain);
  if (mult > before) {
    addFx('text', cx(game.player), game.player.y - 26, { text: `VIRAL x${mult}!`, color: C.pink, life: 1 });
    sfx('comboUp');
    if (mult === 5) bossSay('combo_big');
  }
  const pts = base * mult;
  game.score += pts;
  return pts;
}

function updateEnemies(dt) {
  const p = game.player;
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (e.tele > 0) { e.tele -= dt; continue; }
    e.flash -= dt;

    if (e.type === 'spam') {
      const dx = cx(p) - cx(e);
      // When the player is below, keep walking the same way until falling off the ledge.
      const playerBelow = p.y > e.y + e.h && !e.onSolid;
      if (!playerBelow || e.vx === 0) e.vx = (Math.sign(dx) || 1) * e.speed;
      if (e.onGround && p.y + p.h < e.y - 30 && Math.abs(dx) < 160 && Math.random() < dt * 1.5) e.vy = -520;
      e.vy = Math.min(e.vy + GRAVITY * dt, MAX_FALL);
      moveAndCollide(e, dt, false);
    } else if (e.type === 'popup') {
      e.life -= dt;
      if (e.life <= 0) {
        e.dead = true;
        addFx('ring', cx(e), cy(e), { color: C.dim });
      }
    } else if (e.type === 'drone') {
      e.t += dt;
      e.x += e.dir * e.speed * dt;
      if (e.x < 20) { e.x = 20; e.dir = 1; }
      else if (e.x > W - e.w - 20) { e.x = W - e.w - 20; e.dir = -1; }
      const targetY = e.baseY + Math.sin(e.t * 2.2) * 30;
      e.y += (targetY - e.y) * Math.min(1, dt * 3);
      e.shootCd -= dt;
      if (e.shootCd <= 0) {
        const ang = Math.atan2(cy(p) - cy(e), cx(p) - cx(e));
        const sp = 160 + 20 * game.diff;
        game.enemyBullets.push({ x: cx(e) - 4, y: cy(e) - 4, w: 8, h: 8, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp });
        e.shootCd = rand(2.6, 3.6) - 0.3 * game.diff;
      }
    } else if (e.type === 'spinner') {
      updateSpinner(e, dt);
    } else if (e.type === 'turret') {
      updateTurret(e, dt);
    } else if (e.type === 'worm') {
      updateWorm(e, dt);
    }

    // Scrolled off the left edge or fell into a pit: the incident got away.
    if (game.phase === 'run' && (e.y > H + 40 || (ANCHORED.has(e.type) && e.x + e.w < -60))) { e.dead = true; continue; }
    if (!e.dead && e.type !== 'lockwall' && overlaps(e, p)) hurtPlayer();
  }
  game.enemies = game.enemies.filter(e => !e.dead);
}

function updateSpinner(e, dt) {
  const p = game.player;
  e.spin += dt * (e.state === 'drift' ? 5 : e.state === 'stun' ? 1 : 16);
  e.st -= dt;
  if (e.state === 'drift') {
    const ang = Math.atan2(cy(p) - cy(e), cx(p) - cx(e));
    e.x = clamp(e.x + Math.cos(ang) * 45 * dt, 0, W - e.w);
    e.y = clamp(e.y + Math.sin(ang) * 45 * dt, 20, GROUND_Y - e.h - 30);
    if (e.st <= 0) { e.state = 'aim'; e.st = 0.65; e.tx = cx(p); e.ty = cy(p); }
  } else if (e.state === 'aim') {
    // Track the player, then lock the target for the last moment so the charge is dodgeable.
    if (e.st > 0.25) { e.tx = cx(p); e.ty = cy(p); }
    if (e.st <= 0) {
      const ang = Math.atan2(e.ty - cy(e), e.tx - cx(e));
      e.vx = Math.cos(ang) * e.speed;
      e.vy = Math.sin(ang) * e.speed;
      e.state = 'charge';
    }
  } else if (e.state === 'charge') {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.x < 0 || e.x > W - e.w || e.y < 0 || e.y > GROUND_Y - e.h) {
      e.x = clamp(e.x, 0, W - e.w);
      e.y = clamp(e.y, 0, GROUND_Y - e.h);
      e.state = 'stun';
      e.st = 0.6;
      addSparks(cx(e), cy(e), C.cyan, 8);
      game.shake = Math.max(game.shake, 3);
    }
  } else if (e.st <= 0) {
    e.state = 'drift';
    e.st = rand(1.6, 2.6);
  }
}

function updateTurret(e, dt) {
  const p = game.player;
  if (e.burst > 0) {
    e.burstT -= dt;
    if (e.burstT <= 0) {
      e.burst--;
      e.burstT = 0.16;
      const ox = cx(e) + e.facing * 14, oy = e.y + 12;
      const ang = Math.atan2(cy(p) - oy, cx(p) - ox);
      const sp = 200 + 15 * game.diff;
      game.enemyBullets.push({ x: ox - 4, y: oy - 4, w: 8, h: 8, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp });
      // Turn to face the player only after a full burst, leaving a window to get behind it.
      if (e.burst === 0) e.facing = cx(p) > cx(e) ? 1 : -1;
    }
    return;
  }
  e.cd -= dt;
  if (e.cd <= 0) {
    e.burst = 3;
    e.burstT = 0;
    e.cd = 2.8 - 0.25 * game.diff;
  }
}

// Bullets travelling mostly horizontally into the shielded face are deflected.
function turretBlocks(e, bl) {
  if (e.noShield) return false; // a leaking database has no shield
  return Math.abs(bl.vy) < Math.abs(bl.vx) * 1.2 && Math.sign(bl.vx) === -e.facing;
}

function wormSegments(e) {
  const segs = [];
  for (let i = 1; i <= 4; i++) {
    const tp = e.trail[Math.min(e.trail.length - 1, i * 5)];
    if (!tp) break;
    const r = 9 - i;
    segs.push({ x: tp.x + 13 - r, y: tp.y + 10 - r + 2, w: r * 2, h: r * 2 });
  }
  return segs;
}

function updateWorm(e, dt) {
  e.t += dt;
  e.x += e.dir * e.speed * dt;
  if (e.x < 0 && game.phase !== 'run') { e.x = 0; e.dir = 1; }
  else if (e.x > W - e.w && (game.phase !== 'run' || e.dir > 0)) { e.x = W - e.w; e.dir = -1; }
  e.y = GROUND_Y - e.h - Math.abs(Math.sin(e.t * 6)) * 6;
  e.trail.unshift({ x: e.x, y: e.y });
  if (e.trail.length > 24) e.trail.pop();
  for (const seg of wormSegments(e)) if (overlaps(seg, game.player)) hurtPlayer();
}

function clearEnemies() {
  for (const e of game.enemies) if (e.tele <= 0) addFx('ring', cx(e), cy(e), { color: C.dim });
  game.enemies = [];
}

// ===================== THE YEAR RUN =====================
// Each year is an auto-scrolling level. The world (terrain, grounded enemies, pickups) slides
// left while the player stays on screen, and that year's real incidents arrive one by one.

// Small seeded RNG so a year's terrain is the same on every attempt.
function seededRng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function startYear(year, dec) {
  const items = TIMELINE.years[year] || [];
  game.phase = 'run';
  game.year = year;
  game.diff = dec.difficulty || 1;
  game.fillerKind = FILLER_KINDS.includes(dec.fillerKind) ? dec.fillerKind : 'spam';
  game.chapter = dec.chapterTitle || CHAPTERS[year] || '';
  game.yearStart = { score: game.score, perks: [...game.perks], stats: { ...game.stats } };
  game.boss = null;
  game.lasers = [];
  game.enemies = [];
  game.enemyBullets = [];
  // One real incident every RUN_SPACING px, with a little director-picked filler in between.
  const end = RUN_FIRST + items.length * RUN_SPACING;
  const queue = items.map((item, i) => ({ at: RUN_FIRST + i * RUN_SPACING, item }));
  for (let at = RUN_FIRST + RUN_SPACING / 2; at < end - 100; at += RUN_SPACING) queue.push({ at, filler: true });
  queue.sort((a, b) => a.at - b.at);
  game.run = {
    dist: 0, length: end + 350, speed: scrollSpeedFor(year, game.diff), queue, idx: 0,
    rng: seededRng(year * 7919), genX: 0, gate: null, patched: 0, total: items.length,
  };
  game.stats.incidents += items.length;
  // A safe runway, then generated terrain.
  game.platforms = [{ x: 0, y: GROUND_Y, w: W + 200, h: 40, solid: true }];
  game.run.genX = W + 200;
  while (game.run.genX < W + 400) genChunk();
  const p = game.player;
  Object.assign(p, { x: 140, y: GROUND_Y - p.h, vx: 0, vy: 0, dashT: 0 });
  Music.setMode('wave');
  game.banner = { title: String(year), sub: game.chapter.toUpperCase(), t: 3 };
}

// Ground with jumpable pits (<= 110 px) and one-way ledges ~90 px apart, like the arena.
function genChunk() {
  const r = game.run.rng, x0 = game.run.genX;
  const seg = 360 + r() * 420;
  game.platforms.push({ x: x0, y: GROUND_Y, w: seg, h: 40, solid: true });
  if (r() < 0.75) {
    const lw = 130 + r() * 80;
    game.platforms.push({ x: x0 + 30 + r() * Math.max(10, seg - lw - 60), y: 410, w: lw, h: 14 });
  }
  if (r() < 0.4) {
    const lw = 120 + r() * 70;
    game.platforms.push({ x: x0 + r() * Math.max(10, seg - lw), y: 320, w: lw, h: 14 });
  }
  const pit = r() < 0.55 ? 70 + r() * 40 : 0;
  game.run.genX = x0 + seg + pit;
}

function scrollWorld(dx) {
  for (const pl of game.platforms) pl.x -= dx;
  game.platforms = game.platforms.filter(pl => pl.x + pl.w > -40);
  game.run.genX -= dx;
  for (const e of game.enemies) {
    if (!ANCHORED.has(e.type)) continue;
    e.x -= dx;
    if (e.trail) for (const tp of e.trail) tp.x -= dx;
  }
  for (const pu of game.pickups) pu.x -= dx;
  for (const f of game.fx) f.x -= dx;
  if (game.run.gate) game.run.gate.x -= dx;
  game.travel += dx;
}

const groundAt = (x, w = 40) => game.platforms.find(pl => pl.solid && pl.x <= x && pl.x + pl.w >= x + w);

// Brings in one incident (or a filler) at the right edge. Returns false to retry next frame,
// e.g. when a pit is passing under the spawn point.
function spawnThreat(ev) {
  const item = ev.item;
  const type = item ? THREAT_ENEMY[item.threat] || 'spam' : game.fillerKind;
  const opts = { look: item ? item.threat : DEFAULT_LOOK[type], label: item ? item.name : null };
  const edge = W + 10;
  if ((type === 'spam' || type === 'worm' || type === 'lockwall') && !groundAt(edge)) return false;
  let e;
  if (type === 'spam') {
    e = spawnEnemy('spam', opts);
    Object.assign(e, { x: edge, y: GROUND_Y - e.h, tele: 0, sky: false, vy: 0 });
    if (item) e.hp = 2;
  } else if (type === 'worm') {
    e = spawnEnemy('worm', opts);
    Object.assign(e, { x: edge, dir: -1, tele: 0 });
  } else if (type === 'lockwall') {
    e = spawnEnemy('lockwall', { ...opts, x: edge });
  } else if (type === 'drone') {
    e = spawnEnemy('drone', opts);
    Object.assign(e, { x: W - 60, dir: -1 });
    if (item && item.threat === 'botnet') {
      const d2 = spawnEnemy('drone', { look: 'botnet', i: 1 }); // a botnet never travels alone
      Object.assign(d2, { x: W - 110, dir: -1, baseY: clamp(e.baseY + 90, 150, 360) });
    }
  } else if (type === 'spinner') {
    e = spawnEnemy('spinner', opts);
    Object.assign(e, { x: W - 80, y: rand(80, 220) });
  } else if (type === 'turret') {
    const ledge = game.platforms
      .filter(l => !l.solid && l.x > W * 0.45 && l.x < W - 60)
      .sort((a, b) => b.x - a.x)[0];
    const ground = ledge ? null : groundAt(W - 80);
    if (!ledge && !ground) return false;
    e = spawnEnemy('turret', opts);
    const pl = ledge || ground;
    const x = ledge ? Math.min(pl.x + pl.w / 2, W - 40) - 15 : W - 80;
    Object.assign(e, { ledge: pl, x, y: pl.y - 30, facing: -1, noShield: item ? item.threat === 'breach' : false });
  } else {
    e = spawnEnemy('popup', { ...opts, x: W - 100 - rand(0, 80), y: pick(SHOT_LANES) - 28, life: 12 });
  }
  return true;
}

function updateRun(dt) {
  const r = game.run, p = game.player;
  const dx = r.speed * dt;
  r.dist += dx;
  scrollWorld(dx);
  while (r.genX < W + 400) genChunk();
  while (r.idx < r.queue.length && r.queue[r.idx].at <= r.dist) {
    if (!spawnThreat(r.queue[r.idx])) break;
    r.idx++;
  }

  // Ransomware walls push the player back; pinned against the screen edge costs a heart.
  for (const e of game.enemies) {
    if (e.type !== 'lockwall' || e.dead) continue;
    if (p.x + p.w > e.x && p.x < e.x + e.w && p.y + p.h > e.y) {
      if (cx(p) > cx(e)) p.x = e.x + e.w;
      else p.x = e.x - p.w;
      if (p.x < 0) {
        p.x = 0;
        e.dead = true; // the wall gives way, but the incident isn't patched
        addDebris(cx(e), cy(e), C.yellow, 10);
        addFx('text', cx(p) + 30, p.y - 10, { text: 'RANSOM PAID', color: C.pink, life: 1.2 });
        hurtPlayer();
      }
    }
  }

  // Pits: falling off the bottom costs a heart, then a respawn on solid ground.
  if (p.y > H + 10) {
    hurtPlayer();
    const g = game.platforms.filter(pl => pl.solid && pl.x + pl.w > 160 && pl.x < 520).sort((a, b) => a.x - b.x)[0];
    p.x = g ? clamp(Math.max(g.x + 20, 120), 0, W - p.w) : 140;
    p.y = 220;
    p.vy = 0;
    p.dashT = 0;
  }

  // The year gate scrolls in after the last incident.
  if (!r.gate && r.idx >= r.queue.length && r.dist >= r.length) r.gate = { x: W + 40 };
  if (r.gate && r.gate.x <= cx(p) && game.phase === 'run') finishYear();
}

function finishYear() {
  game.yearTally = { patched: game.run.patched, total: game.run.total };
  clearEnemies();
  game.enemyBullets = [];
  game.screenFlash = 0.25;
  sfx('win');
  openDirector(BOSS_YEARS[game.year] ? 'boss' : 'year');
}

// Boss years end in the classic single-screen arena.
function enterArena() {
  game.platforms = PLATFORMS.map(pl => ({ ...pl }));
  game.enemies = [];
  game.pickups = [];
  game.run = null;
  const p = game.player;
  Object.assign(p, { x: 140, y: GROUND_Y - p.h, vx: 0, vy: 0, dashT: 0 });
  transition = 0.45;
}

// ===================== AI DIRECTOR =====================
// Picks the next stage from the player's stats.
function localDirector(stats, next) {
  const acc = stats.shotsFired ? stats.shotsHit / stats.shotsFired : 0;
  const jumpy = stats.jumpCount / Math.max(1, stats.time) > 0.35;
  const low = stats.hp <= 2;
  const strong = stats.hp >= 4 && acc >= 0.5;

  const fillerKind = low ? 'spam'
    : jumpy ? pick(['drone', 'spinner'])
    : acc >= 0.55 ? pick(['popup', 'turret'])
    : pick(['spam', 'worm']);
  const difficulty = low ? 1 : strong ? 3 : 2;
  const pickup = low ? 'health' : stats.hp < stats.maxHp ? pick(['health', 'rapid_fire']) : 'rapid_fire';
  const bossAttackOrder = low ? ['popup_wall', 'laser_sweep', 'drone_swarm'] : shuffle(BOSS_ATTACKS);

  let taunt;
  if (next === 'boss') taunt = pick(TAUNTS.boss);
  else if (low) taunt = pick(TAUNTS.low);
  else if (jumpy) taunt = pick(TAUNTS.jumpy);
  else if (acc >= 0.55) taunt = pick(TAUNTS.accurate);
  else if (stats.shotsFired > 20) taunt = pick(TAUNTS.sloppy);
  else taunt = pick(TAUNTS.generic);

  const nextYear = next === 'boss' ? stats.year : stats.year + 1;
  const perkOffer = offersPerks(next, stats.year) ? randomPerkOffer(stats.perks) : [];
  return { fillerKind, difficulty, pickup, bossAttackOrder, taunt, chapterTitle: CHAPTERS[nextYear] || '', perkOffer, source: 'fallback' };
}

// Perks every other year and before every boss, so the build grows across the story.
const offersPerks = (next, year) => next === 'boss' || year % 2 === 1;

function availablePerks(owned) {
  return PERK_IDS.filter(id => id === 'max_hp' || !owned.includes(id));
}

function randomPerkOffer(owned) {
  return shuffle(availablePerks(owned)).slice(0, 3);
}

// ---- Boss commentary ----
// Short lines per fight event, spoken by THE ALGORITHM during the boss fight.
const BOSS_LINES = {
  player_hit: ["Ouch. That's going on your permanent record.", 'Hit registered. Engagement up 12%.', 'Did that hurt? Rate your experience 1 to 5.'],
  boss_phase2: ['Installing update 2 of 3. Do not turn off your hero.', 'You found my weak point. I found more lasers.'],
  boss_phase3: ['FATAL ERROR. Just kidding. Mostly.', "Blue screen mode. Now it's personal."],
  player_low_hp: ['One heart left. Want to buy more? Only 9.99.', 'Low battery detected. Please connect to a charger.'],
  combo_big: ["A x5 combo? Okay, now you're just showing off.", "You're going viral. I hate it."],
  near_win: ["Wait. Let's talk about a premium subscription.", 'I can offer you ad-free. Please. Stop.'],
};

// ---- End-of-run report ----
function localReport(r, s) {
  const report = r.win
    ? `You beat me with ${r.accuracy}% accuracy and a ${r.maxCombo}-kill combo. I'm filing a bug report against you.`
    : `You lasted ${fmtTime(r.time)} and landed ${r.accuracy}% of your shots. Your session has been archived for training data.`;
  const tip = r.accuracy < 40 ? 'Hold the mouse button to aim. My screen is a big target.'
    : s.damageTaken >= 5 ? "Dash through attacks: you're invulnerable while dashing."
    : r.maxCombo < 6 ? 'Chain kills within 2 seconds to go VIRAL for up to x5 points.'
    : 'Grab weapon drops. The Firewall Beam pierces right through pop-ups.';
  return { text: report, tip, source: 'fallback', pending: false };
}

function openDirector(next) {
  game.phase = 'director';
  Music.setMode('calm');
  sfx('director');
  game.enemyBullets = [];
  game.lasers = [];
  const stats = collectStats();
  const nextYear = next === 'boss' ? game.year : game.year + 1;
  // A cleared year is saved, so the story can be continued from the title screen.
  if (next === 'year') saveStory(nextYear);
  game.director = {
    t: 0, next, nextYear, stats, decision: localDirector(stats, next), readyAt: 0, chosen: null, chosenAt: 0, sel: 0,
    patched: game.yearTally ? game.yearTally.patched : 0, total: game.yearTally ? game.yearTally.total : 0,
  };
}

function updateDirector(dt) {
  const d = game.director;
  d.t += dt;
  if (d.decision && !d.readyAt) d.readyAt = Math.max(d.t, 1.5);
  if (!d.readyAt || d.t < d.readyAt) return;
  const offer = d.decision.perkOffer;
  if (d.chosen == null) {
    if (!offer.length) { d.chosen = -1; d.chosenAt = d.t; return; }
    // Pick with 1/2/3, ←/→ + Enter, or a click on a card; auto-installs after a few seconds.
    ['Digit1', 'Digit2', 'Digit3'].forEach((code, i) => { if (pressed.has(code) && i < offer.length) choosePerk(d, i); });
    if (wasPressed(K.left)) { d.sel = (d.sel + offer.length - 1) % offer.length; sfx('select'); }
    if (wasPressed(K.right)) { d.sel = (d.sel + 1) % offer.length; sfx('select'); }
    if (pressed.has('Enter')) choosePerk(d, d.sel);
    if (pressed.has('Mouse')) {
      const i = offer.findIndex((_, k) => overlaps({ x: mouseX, y: mouseY, w: 1, h: 1 }, perkCardRect(k, offer.length)));
      if (i >= 0) choosePerk(d, i);
    }
    if (d.chosen == null && d.t >= d.readyAt + PERK_AUTO_PICK) choosePerk(d, d.sel);
  } else if (d.t >= d.chosenAt + 0.8) {
    applyDecision(d.decision, d.next);
  }
}

function perkCardRect(i, n) {
  const w = 170, gap = 15, x0 = W / 2 - (n * w + (n - 1) * gap) / 2;
  return { x: x0 + i * (w + gap), y: 312, w, h: 108 };
}

function choosePerk(d, i) {
  if (d.chosen != null) return;
  d.chosen = i;
  d.chosenAt = d.t;
  const id = d.decision.perkOffer[i];
  const p = game.player;
  game.perks.push(id);
  if (id === 'max_hp') { p.maxHp++; p.hp = Math.min(p.maxHp, p.hp + 1); }
  addFx('text', cx(p), p.y - 10, { text: PERKS[id].name, color: C.cyan, life: 1.2 });
  sfx('pickup');
}

function applyDecision(dec, next) {
  const nextYear = game.director.nextYear;
  game.director = null;
  game.taunt = { text: dec.taunt, t: 5 };
  speak(dec.taunt);
  if (next === 'year') startYear(nextYear, dec);
  else {
    enterArena();
    startBoss(dec);
  }
  spawnPickup(dec.pickup);
}

// ===================== BOSS =====================
function startBoss(dec) {
  game.phase = 'boss';
  Music.setMode('boss');
  game.diff = dec.difficulty;
  // THE ALGORITHM levels up every era: more health, and more phases unlocked.
  const cfg = BOSS_YEARS[game.year] || BOSS_YEARS[LAST_YEAR];
  game.boss = {
    x: 790, y: -170, w: 140, h: 130, hp: cfg.hp, maxHp: cfg.hp, t: 0, flash: 0, intro: 2.2,
    baseOrder: dec.bossAttackOrder, order: dec.bossAttackOrder, ai: 0, cd: 1.2, attack: null, laserCount: 0,
    phase: 1, roar: 0, targetX: 790, attacksDone: 0, maxPhase: cfg.maxPhase, version: cfg.version,
  };
  game.banner = { title: `BOSS · ${game.year}`, sub: `THE ALGORITHM ${cfg.version}`, t: 2.5 };
}

// Phase 2 at 50% HP adds a bullet spiral and movement; phase 3 at 25% is the "Blue Screen".
function enterBossPhase(n) {
  const b = game.boss, base = b.baseOrder;
  b.phase = n;
  b.roar = 1.2;
  b.attack = null;
  b.cd = 1;
  b.ai = 0;
  b.order = n === 2 ? [...base, 'scroll_spiral'] : ['bsod_barrage', base[0], 'scroll_spiral', base[1], 'bsod_barrage', base[2]];
  game.enemyBullets = [];
  game.lasers = [];
  game.banner = n === 2
    ? { title: 'PHASE 2', sub: 'THE ALGORITHM IS UPDATING...', t: 2 }
    : { title: 'BLUE SCREEN', sub: 'FATAL EXCEPTION: PLAYER DETECTED', t: 2 };
  game.shake = 12;
  game.aberr = 0.5;
  Music.setMode('boss');
  sfx('phase');
  bossSay(n === 2 ? 'boss_phase2' : 'boss_phase3');
}

function updateBoss(dt) {
  const b = game.boss, p = game.player;
  b.t += dt;
  b.flash -= dt;
  b.x += (b.targetX - b.x) * Math.min(1, dt * 1.6);
  const moving = Math.abs(b.targetX - b.x) > 12;
  // Rise above the high ledges while crossing the arena.
  const targetY = moving ? 30 : 120 + (Math.sin(b.t * 1.2) + 1) * 40;
  b.y += (targetY - b.y) * Math.min(1, dt * (b.intro > 0 ? 2.5 : 5));
  if (b.intro > 0) { b.intro -= dt; return; }

  if (overlaps(b, p)) hurtPlayer();

  if (b.phase === 1 && b.maxPhase >= 2 && b.hp <= b.maxHp * 0.5) enterBossPhase(2);
  else if (b.phase === 2 && b.maxPhase >= 3 && b.hp <= b.maxHp * 0.25) enterBossPhase(3);
  if (b.roar > 0) { b.roar -= dt; return; }
  if (!b.saidNearWin && b.hp <= 3) { b.saidNearWin = true; bossSay('near_win'); }

  if (b.attack) {
    b.attack.t -= dt;
    updateBossAttack(b, dt);
    if (b.attack.t <= 0) {
      b.attack = null;
      b.attacksDone++;
      b.cd = (2.4 - 0.35 * game.diff) * (b.phase === 1 ? 1 : b.phase === 2 ? 0.7 : 0.6);
      // From phase 2 on, switch sides every other attack.
      if (b.phase >= 2 && b.attacksDone % 2 === 0) b.targetX = b.targetX > W / 2 ? 30 : 790;
    }
    return;
  }
  if (Math.abs(b.targetX - b.x) > 12) return; // finish moving before attacking
  b.cd -= dt;
  if (b.cd <= 0) bossAttack(b.order[b.ai++ % b.order.length]);
}

function bossAttack(id) {
  const b = game.boss, p = game.player;
  b.attack = { id, t: 1 };
  sfx('warn');
  if (id === 'laser_sweep') {
    b.attack.t = 1.7;
    if (b.laserCount++ % 2 === 1) {
      game.lasers.push({ x: clamp(cx(p) - 35, 0, W - 70), y: 0, w: 70, h: GROUND_Y, warn: 1.1, active: 0.45 });
    } else {
      const y = LASER_LANES.find(l => p.y + p.h > l && p.y < l + 38) ?? pick(LASER_LANES);
      const left = b.x < W / 2;
      game.lasers.push({ x: left ? b.x + b.w : 0, y, w: left ? W - b.x - b.w : b.x, h: 38, warn: 1.1, active: 0.45 });
    }
  } else if (id === 'drone_swarm') {
    const existing = game.enemies.filter(e => e.type === 'drone').length;
    const n = Math.min(2 + (game.diff >= 3 ? 1 : 0), 4 - existing);
    for (let i = 0; i < n; i++) spawnEnemy('drone', { fromBoss: true, i });
  } else if (id === 'popup_wall') {
    const pc = cx(p);
    const x = clamp(pc < W / 2 ? pc + 200 : pc - 270, 260, 700);
    for (let i = 0; i < 3; i++) spawnEnemy('popup', { x, y: 170 + i * 60, w: 70, life: 5 });
  } else if (id === 'scroll_spiral') {
    // Telegraphed glow, then rotating rings of slow bullets with wide gaps.
    Object.assign(b.attack, { t: 2.6, tele: 1, rings: 3, next: 0, rot: rand(0, 1) });
  } else if (id === 'bsod_barrage') {
    // Six columns; two stay safe, one of them next to the player so it's always reachable.
    b.attack.t = 1.9;
    const colW = W / 6;
    const pcol = clamp(Math.floor(cx(p) / colW), 0, 5);
    const near = pcol === 0 ? 1 : pcol === 5 ? 4 : pcol + pick([-1, 1]);
    const other = pick([0, 1, 2, 3, 4, 5].filter(c => c !== near && Math.abs(c - near) > 1));
    for (let c = 0; c < 6; c++) {
      if (c === near || c === other) continue;
      game.lasers.push({ x: c * colW, y: 0, w: colW, h: GROUND_Y, warn: 1.1, active: 0.5, bsod: true });
    }
  }
}

function updateBossAttack(b, dt) {
  const a = b.attack;
  if (a.id !== 'scroll_spiral') return;
  a.tele -= dt;
  if (a.tele > 0 || a.rings <= 0) return;
  a.next -= dt;
  if (a.next > 0) return;
  a.next = 0.45;
  a.rings--;
  const n = 10, sp = 140 + 20 * game.diff;
  for (let i = 0; i < n; i++) {
    const ang = a.rot + (i * Math.PI * 2) / n;
    game.enemyBullets.push({
      x: cx(b) - 4 + Math.cos(ang) * 50, y: cy(b) - 4 + Math.sin(ang) * 50, w: 8, h: 8,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
    });
  }
  a.rot += 0.31;
  sfx('bossHit');
}

function updateLasers(dt) {
  const p = game.player;
  for (const l of game.lasers) {
    if (l.warn > 0) { l.warn -= dt; continue; }
    l.active -= dt;
    const hitbox = { x: l.x + 4, y: l.y + 4, w: l.w - 8, h: l.h - 8 };
    if (overlaps(hitbox, p)) hurtPlayer();
  }
  game.lasers = game.lasers.filter(l => l.warn > 0 || l.active > 0);
}

// Plays a line from the commentary pack for a fight event, with a cooldown so it never spams.
function bossSay(event) {
  if (!game || !game.boss || game.phase !== 'boss' || !BOSS_LINES[event]) return;
  const important = event === 'boss_phase2' || event === 'boss_phase3';
  if (game.sayCd > 0 && !important) return;
  const pool = BOSS_LINES[event];
  const fresh = pool.filter(t => !game.usedLines.includes(t));
  const line = pick(fresh.length ? fresh : pool);
  game.usedLines.push(line);
  game.taunt = { text: line, t: 3.5 };
  game.sayCd = 4;
  speak(line);
}

function bossDefeated() {
  const b = game.boss;
  game.phase = 'bossDying';
  game.endTimer = 2;
  const pts = addKillScore(SCORE.boss);
  game.stats.kills++;
  clearEnemies();
  game.lasers = [];
  game.enemyBullets = [];
  game.taunt = { text: pick(TAUNTS.bossDown), t: 3 };
  speak(game.taunt.text);
  addFx('text', cx(b), b.y, { text: `+${pts}`, color: C.yellow, life: 1.5 });
  addSparks(cx(b), cy(b), C.pink, 40);
  addDebris(cx(b), cy(b), C.purple, 20);
  game.shake = 14;
  game.slowmo = 0.9;
  game.aberr = 0.5;
  sfx('explode');
}

function updateBossDying(dt) {
  const b = game.boss;
  game.endTimer -= dt;
  if (Math.random() < dt * 12) {
    addFx('ring', b.x + rand(0, b.w), b.y + rand(0, b.h), { color: pick([C.pink, C.cyan, C.yellow]) });
  }
  if (game.endTimer > 0) return;
  // Beating the final form ends the story; earlier versions just reboot and wait for next era.
  if (game.year >= LAST_YEAR) endGame(true);
  else {
    game.boss = null;
    openDirector('year');
  }
}

// ===================== PICKUPS & FX =====================
function spawnPickup(kind) {
  if (!kind || kind === 'none') return;
  if (game.phase === 'run') {
    // Drops from the sky ahead of the player and rides the scrolling ground.
    game.pickups.push({ kind, x: W * 0.7, y: 40, w: 20, h: 20, t: 0, vx: 0, vy: 0, life: 14, falls: true });
    return;
  }
  const pl = pick(LEDGES);
  game.pickups.push({ kind, x: pl.x + pl.w / 2 - 10, y: pl.y - 24, w: 20, h: 20, t: 0 });
}

// Enemies sometimes drop a weapon that falls to the nearest platform.
function maybeDropWeapon(e) {
  if (game.phase !== 'run' && game.phase !== 'boss') return;
  if (game.pickups.some(pu => WEAPONS[pu.kind])) return;
  if (Math.random() > (e.type === 'drone' ? 0.2 : 0.12)) return;
  dropWeapon(pick(WEAPON_DROPS), cx(e), cy(e));
}

function dropWeapon(kind, x, y) {
  game.pickups.push({ kind, x: clamp(x - 10, 10, W - 30), y: Math.max(20, y - 10), w: 20, h: 20, t: 0, vx: 0, vy: -150, life: 8, falls: true });
}

function updatePickups(dt) {
  const p = game.player;
  for (const pu of game.pickups) {
    pu.t += dt;
    if (pu.falls) {
      pu.vy = Math.min(pu.vy + GRAVITY * 0.6 * dt, 500);
      moveAndCollide(pu, dt, false);
      pu.life -= dt;
      if (pu.life <= 0) { pu.dead = true; continue; }
    }
    if (hasPerk('magnet')) {
      const dx = cx(p) - cx(pu), dy = cy(p) - cy(pu), d = Math.hypot(dx, dy);
      if (d < 220 && d > 1) { pu.x += (dx / d) * 260 * dt; pu.y += (dy / d) * 260 * dt; }
    }
    if (!overlaps(pu, p)) continue;
    pu.dead = true;
    if (pu.kind === 'health') {
      p.hp = Math.min(p.maxHp, p.hp + 1);
      addFx('text', cx(p), p.y, { text: '+1 HEART', color: C.pink });
      sfx('pickup');
    } else if (pu.kind === 'rapid_fire') {
      game.rapidTimer = 8;
      addFx('text', cx(p), p.y, { text: 'RAPID FIRE', color: C.yellow });
      sfx('pickup');
    } else applyWeapon(pu.kind);
  }
  game.pickups = game.pickups.filter(pu => !pu.dead);
}

function applyWeapon(kind) {
  const p = game.player, wpn = WEAPONS[kind];
  addFx('text', cx(p), p.y - 10, { text: wpn.name, color: wpn.color, life: 1.2 });
  sfx('weapon');
  if (kind === 'shield') p.shield = true;
  else if (kind === 'bomb') detonateBomb();
  else game.weapon = { id: kind, t: wpn.dur };
}

// Clears the screen of enemies and bullets; chips the boss but can never finish it.
function detonateBomb() {
  for (const e of game.enemies) {
    if (e.dead || e.tele > 0) continue;
    e.hp = 1;
    damageEnemy(e);
  }
  game.enemyBullets = [];
  const b = game.boss;
  if (b && game.phase === 'boss' && b.intro <= 0 && !(b.roar > 0)) {
    b.hp -= Math.min(2, b.hp - 1);
    b.flash = 0.2;
  }
  game.screenFlash = 0.35;
  game.shake = 14;
  game.aberr = 0.4;
  sfx('bomb');
}

if (DEV) window.devPickup = kind => game && dropWeapon(kind, cx(game.player), game.player.y + 20);

function addFx(kind, x, y, extra = {}) {
  game.fx.push({ kind, x, y, t: 0, life: 0.8, ...extra });
}

function addSparks(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const ang = rand(0, Math.PI * 2), sp = rand(80, 280);
    addFx('spark', x, y, { color, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 80, life: rand(0.3, 0.6) });
  }
}

// Chunky spinning pieces for kills.
function addDebris(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const ang = rand(-Math.PI, 0), sp = rand(120, 320);
    addFx('spark', x, y, {
      color, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: rand(0.5, 0.9),
      size: rand(4, 8), spin: rand(-12, 12), rot: rand(0, 6),
    });
  }
}

function addDust(x, y, n) {
  for (let i = 0; i < n; i++) {
    addFx('spark', x + rand(-8, 8), y - 2, {
      color: 'rgba(125, 134, 199, 0.8)', vx: rand(-70, 70), vy: rand(-50, -10), life: rand(0.25, 0.45), size: rand(3, 5), grav: 60,
    });
  }
}

function updateFx(dt) {
  for (const f of game.fx) {
    f.t += dt;
    if (f.kind === 'spark') {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += (f.grav ?? 700) * dt;
      if (f.spin) f.rot += f.spin * dt;
    }
  }
  game.fx = game.fx.filter(f => f.t < f.life);
  if (game.fx.length > 400) game.fx.splice(0, game.fx.length - 400);
}

// ===================== END =====================
// Letter grade from a 0-100ish point total: how far into the timeline, how cleanly.
function computeRank(win, accuracy, hp, yearsCleared, patchedPct, maxCombo, continues) {
  let pts = accuracy * 0.2 + yearsCleared * 2.2 + patchedPct * 0.15 - continues * 4;
  if (win) pts += 10 + hp * 2;
  pts += maxCombo >= 12 ? 8 : maxCombo >= 8 ? 5 : maxCombo >= 4 ? 2 : 0;
  return pts >= 85 ? 'S' : pts >= 70 ? 'A' : pts >= 50 ? 'B' : pts >= 30 ? 'C' : 'D';
}

function endGame(win) {
  const s = game.stats;
  const hpBonus = win ? game.player.hp * 200 : 0;
  game.score += hpBonus;
  const accuracy = s.shotsFired ? Math.min(100, Math.round((100 * s.shotsHit) / s.shotsFired)) : 0;
  const yearsCleared = game.year - FIRST_YEAR + (win ? 1 : 0);
  const patchedPct = s.incidents ? Math.round((100 * s.patched) / s.incidents) : 0;
  const rank = computeRank(win, accuracy, game.player.hp, yearsCleared, patchedPct, s.maxCombo, game.continues);
  game.result = {
    win, hpBonus, score: game.score, time: game.time, kills: s.kills, accuracy, rank, maxCombo: s.maxCombo,
    yearsCleared, patched: s.patched, incidents: s.incidents,
    line: pick(win ? WIN_LINES : LOSE_LINES),
    // A lost year can be retried.
    canContinue: !win,
  };
  if (win) clearStory();
  scene = 'results';
  sceneTimer = 0;
  Music.setMode('calm');
  transition = 0.45;
  game.result.report = localReport(game.result, game.stats);
  sfx(win ? 'win' : 'lose');
}

// ===================== UPDATE =====================
function update(dt) {
  sceneTimer += dt;
  // [ and ] (or Page Up / Page Down) skip between levels, from anywhere (see the keydown listener).
  if (pressed.has('LevelPrev')) { jumpLevel(-1); return; }
  if (pressed.has('LevelNext')) { jumpLevel(1); return; }
  if (scene === 'title') {
    if (pressed.has('KeyC') && savedStory) newGame(savedStory);
    else if (wasPressed(K.start) || pressed.has('Mouse')) { clearStory(); newGame(); }
    else if (wasPressed(K.howto)) scene = 'howto';
    return;
  }
  if (scene === 'howto') {
    if (wasPressed(K.start) || pressed.has('Mouse')) newGame();
    else if (wasPressed(['Escape', 'KeyH', 'Backspace'])) scene = 'title';
    return;
  }
  if (scene === 'results') {
    const res = game.result;
    if (res.canContinue) {
      // C retries the year that was lost; Enter ends the story here.
      if (sceneTimer > 0.8 && pressed.has('KeyC')) continueYear();
      else if (sceneTimer > 0.8 && pressed.has('Enter')) { res.canContinue = false; clearStory(); sceneTimer = 0.5; }
      return;
    }
    if (sceneTimer > 0.8 && wasPressed([...K.restart, 'Enter'])) { clearStory(); newGame(); }
    return;
  }
  updatePlay(dt);
}

function updatePlay(dt) {
  if (wasPressed(K.pause)) {
    game.paused = !game.paused;
    if (game.paused) stopSpeech();
  }
  if (game.paused) {
    if (wasPressed(K.restart)) continueYear(false);
    return;
  }
  game.shake = Math.max(0, game.shake - dt * 40);
  game.aberr -= dt;
  if (game.hitStop > 0) { game.hitStop -= dt; return; } // brief freeze makes hits feel heavier
  const realDt = dt;
  if (game.slowmo > 0) { game.slowmo -= realDt; dt *= 0.35; }
  game.time += dt;
  game.controlsTimer -= dt;
  game.rapidTimer -= dt;
  game.screenFlash -= dt;
  if ((game.combo.t -= dt) <= 0) game.combo.chain = 0;
  game.sayCd -= dt;
  if (game.weapon && (game.weapon.t -= dt) <= 0) game.weapon = null;
  if (game.taunt) game.taunt.t -= dt;
  if (game.banner) game.banner.t -= dt;

  if (game.phase !== 'playerDying') updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updateEnemyBullets(dt);
  updateLasers(dt);
  updatePickups(dt);
  updateFx(dt);
  if (scene !== 'play') return;

  switch (game.phase) {
    case 'run': updateRun(dt); break;
    case 'director': updateDirector(dt); break;
    case 'boss': updateBoss(dt); break;
    case 'bossDying': updateBossDying(dt); break;
    case 'playerDying':
      game.dieTimer -= realDt;
      if (game.dieTimer <= 0) endGame(false);
      break;
  }
}

// ===================== RENDER HELPERS =====================
function text(str, x, y, { size = 16, color = C.white, align = 'left', bold = true } = {}) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px "Courier New", monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function wrapText(str, maxW, size) {
  ctx.font = `bold ${size}px "Courier New", monospace`;
  const lines = [];
  let line = '';
  for (const word of str.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function panel(x, y, w, h, border = C.purple) {
  ctx.fillStyle = 'rgba(7, 11, 36, 0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

const HEART = ['01100110', '11111111', '11111111', '01111110', '00111100', '00011000'];
function drawHeart(x, y, s, filled) {
  ctx.fillStyle = filled ? C.pink : '#2a2f66';
  for (let r = 0; r < HEART.length; r++) {
    for (let c = 0; c < HEART[r].length; c++) {
      if (HEART[r][c] === '1') ctx.fillRect(x + c * s, y + r * s, s, s);
    }
  }
}

const blink = (t, rate = 8) => Math.floor(t * rate) % 2 === 0;

// Offscreen canvas helper used by sprites, glows and background layers.
function layer(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'));
  return c;
}

// ===================== SPRITES =====================
// Pixel art is written as rows of palette keys ('.' = transparent), like HEART above, and
// rendered once into offscreen canvases. Each sprite gets a mirrored copy and a white
// silhouette (for hit flashes), so drawing a frame is a single drawImage.
function makeSprite(rows, pal, s = 2) {
  const cols = Math.max(...rows.map(r => r.length));
  return layer(cols * s, rows.length * s, g => {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (!pal[row[x]]) continue;
        g.fillStyle = pal[row[x]];
        g.fillRect(x * s, y * s, s, s);
      }
    });
  });
}

function mirror(src) {
  return layer(src.width, src.height, g => {
    g.translate(src.width, 0);
    g.scale(-1, 1);
    g.drawImage(src, 0, 0);
  });
}

function sprite(rows, pal, s = 2) {
  const r = makeSprite(rows, pal, s);
  const white = {};
  for (const k in pal) white[k] = '#ffffff';
  const wr = makeSprite(rows, white, s);
  return { r, l: mirror(r), wr, wl: mirror(wr) };
}

const PLAYER_BODY = [
  '....CCCCC...',
  '...CCCCCCC..',
  '...CCWNNNN..',
  '...CCNNNNN..',
  '...CCCCCCC..',
  '....CCCCC...',
  '..DCCCCCCD..',
  '.DCCCCCCCCD.',
  '.DCCWCCCCCD.',
  '.DCCWCCCCCD.',
  '..CCCCCCCC..',
  '..CCCPPCCC..',
  '..CCCCCCCC..',
];
const PLAYER_LEGS = {
  idle: ['..DDD..DDD..', '..DDD..DDD..', '..DDD..DDD..', '.DDDD..DDDD.'],
  run1: ['..DDD..DDD..', '.DDD....DDD.', 'DDD......DD.', 'DD.......DDD'],
  run2: ['...DDDDDD...', '...DDD.DD...', '...DD..DD...', '..DDD..DDD..'],
  jump: ['..DDD.DDD...', '..DD...DDD..', '...DD..DD...', '............'],
  fall: ['..DDD..DDD..', '..DD....DD..', '.DD......DD.', '.DD......DD.'],
};
const PLAYER_PAL = { C: C.cyan, D: '#1fb8c8', W: C.white, N: C.navy, P: C.pink };
const HURT_PAL = { C: C.white, D: '#ffb3d1', W: C.white, N: C.pink, P: C.pink };

const SPAM_TOP = [
  'KKKKKKKKKKKKK',
  'KNKKKKKKKKKNK',
  'KKNKKKKKKKNKK',
  'KKKNKKKKKNKKK',
  'KYYKNKKKNKYYK',
  'KYYKKNKNKKYYK',
  'KKKKKKNKKKKKK',
  'KKKKKKKKKKKKK',
  'KKKKKKKKKKKKK',
];
const SPAM_PAL = { K: C.pink, N: C.navy, Y: C.yellow };

const DRONE_BODY = [
  '....M.......M....',
  '....PPPPPPPPP....',
  '..PPPPPPPPPPPPP..',
  '.PPPEEEEEEEEEPPP.',
  '.PPPEEEEEEEEEPPP.',
  '..PPPPPPPPPPPPP..',
  '....PPPPPPPPP....',
  '.....P.....P.....',
  '....PP.....PP....',
];
const DRONE_PAL = { P: C.purple, E: '#3a1466', M: C.dim };

const SPR = {
  player: {
    idle: sprite([...PLAYER_BODY, ...PLAYER_LEGS.idle], PLAYER_PAL),
    run: [sprite([...PLAYER_BODY, ...PLAYER_LEGS.run1], PLAYER_PAL), sprite([...PLAYER_BODY, ...PLAYER_LEGS.run2], PLAYER_PAL)],
    jump: sprite([...PLAYER_BODY, ...PLAYER_LEGS.jump], PLAYER_PAL),
    fall: sprite([...PLAYER_BODY, ...PLAYER_LEGS.fall], PLAYER_PAL),
    hurt: sprite([...PLAYER_BODY, ...PLAYER_LEGS.idle], HURT_PAL),
  },
  spam: [
    sprite([...SPAM_TOP, '.NN.......NN.', '.NN.......NN.'], SPAM_PAL),
    sprite([...SPAM_TOP, '..NN.....NN..', '..NN.....NN..'], SPAM_PAL),
  ],
  drone: [
    sprite(['.MMMMM.....MMMMM.', ...DRONE_BODY], DRONE_PAL),
    sprite(['...MMM.....MMM...', ...DRONE_BODY], DRONE_PAL),
  ],
};

// Soft additive glows, cached per colour/radius. Much cheaper than shadowBlur per object.
const glowCache = {};
function glowSprite(color, r) {
  const key = color + r;
  if (!glowCache[key]) {
    glowCache[key] = layer(r * 2, r * 2, g => {
      const grad = g.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, r * 2, r * 2);
    });
  }
  return glowCache[key];
}

function drawGlow(x, y, color, r, alpha = 0.5) {
  r = Math.round(r);
  const prev = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = prev * alpha;
  ctx.drawImage(glowSprite(color, r), x - r, y - r);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = prev;
}

// ===================== BACKGROUND =====================
// Layers are pre-rendered once; each frame only scrolls them and draws a few animated bits.
const bgSky = layer(W, H, b => {
  const grad = b.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#05081c');
  grad.addColorStop(0.65, '#170a3d');
  grad.addColorStop(1, '#2a0c4a');
  b.fillStyle = grad;
  b.fillRect(0, 0, W, H);
  for (let i = 0; i < 110; i++) {
    b.fillStyle = `rgba(232, 246, 255, ${rand(0.15, 0.7)})`;
    const s = Math.random() < 0.1 ? 3 : 2;
    b.fillRect(rand(0, W), rand(0, 320), s, s);
  }
  // Synthwave sun: striped disc behind the skyline.
  const r = 110;
  const sun = layer(r * 2, r * 2, g => {
    const sg = g.createLinearGradient(0, 0, 0, r * 2);
    sg.addColorStop(0, C.yellow);
    sg.addColorStop(0.55, C.pink);
    sg.addColorStop(1, C.purple);
    g.fillStyle = sg;
    g.beginPath();
    g.arc(r, r, r, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 7; k++) g.fillRect(0, r + 14 + k * 13, r * 2, 2 + k);
  });
  const sx = W * 0.62, sy = 300;
  b.globalCompositeOperation = 'lighter';
  const halo = b.createRadialGradient(sx, sy, r * 0.6, sx, sy, r * 2);
  halo.addColorStop(0, 'rgba(255, 46, 136, 0.16)');
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  b.fillStyle = halo;
  b.fillRect(0, 0, W, H);
  b.globalCompositeOperation = 'source-over';
  b.globalAlpha = 0.5;
  b.drawImage(sun, sx - r, sy - r);
  b.globalAlpha = 1;
});

const NEAR_WINDOWS = [];
function cityStrip(color, minH, maxH, winAlpha, flicker) {
  const sw = W * 2;
  return layer(sw, H, b => {
    let x = 0;
    while (x < sw) {
      const bw = rand(40, 100), bh = rand(minH, maxH);
      b.fillStyle = color;
      b.fillRect(x, GROUND_Y - bh, bw - 4, bh);
      if (Math.random() < 0.3) b.fillRect(x + bw / 2 - 1, GROUND_Y - bh - 16, 2, 16);
      for (let wy = GROUND_Y - bh + 10; wy < GROUND_Y - 10; wy += 14) {
        for (let wx = x + 6; wx < x + bw - 12; wx += 12) {
          if (Math.random() >= 0.3) continue;
          const cyan = Math.random() < 0.5;
          b.fillStyle = cyan ? `rgba(41, 240, 255, ${winAlpha})` : `rgba(255, 46, 136, ${winAlpha})`;
          b.fillRect(wx, wy, 5, 6);
          if (flicker && flicker.length < 70 && Math.random() < 0.12) {
            flicker.push({ x: wx, y: wy, cyan, ph: rand(0, 10), f: rand(0.6, 2.2) });
          }
        }
      }
      x += bw;
    }
  });
}
const bgFar = cityStrip('#090d2a', 150, 300, 0.12);
const bgNear = cityStrip('#0b1134', 80, 220, 0.22, NEAR_WINDOWS);

const GLYPHS = ['0', '1', '<', '>', '/', '#', '@'].map(ch => layer(8, 12, g => {
  g.font = 'bold 11px "Courier New", monospace';
  g.fillStyle = C.cyan;
  g.textBaseline = 'top';
  g.fillText(ch, 0, 0);
}));
const RAIN = Array.from({ length: 16 }, () => ({
  x: Math.round(rand(0, W)), ph: rand(0, H + 200), sp: rand(30, 90), len: 4 + Math.floor(rand(0, 6)), seed: Math.floor(rand(0, 50)),
}));

function scrollLayer(img, off) {
  const x = -(off % img.width);
  ctx.drawImage(img, x, 0);
  if (x + img.width < W) ctx.drawImage(img, x + img.width, 0);
}

function drawBackground(t) {
  ctx.drawImage(bgSky, 0, 0);
  // Data rain falls behind the skyline.
  ctx.globalAlpha = 0.16;
  for (const r of RAIN) {
    const y = ((t * r.sp + r.ph) % (GROUND_Y + 160)) - 60;
    for (let i = 0; i < r.len; i++) {
      ctx.drawImage(GLYPHS[(r.seed + i + Math.floor(t * 3)) % GLYPHS.length], r.x, y - i * 12);
    }
  }
  ctx.globalAlpha = 1;
  const travel = game && scene !== 'title' && scene !== 'howto' ? game.travel : 0;
  scrollLayer(bgFar, t * 6 + travel * 0.12);
  scrollLayer(bgNear, t * 15 + travel * 0.3);
  const off = (t * 15 + travel * 0.3) % bgNear.width;
  for (const w of NEAR_WINDOWS) {
    if (Math.sin(t * w.f + w.ph) < 0.8) continue;
    let x = w.x - off;
    if (x < -8) x += bgNear.width;
    if (x > W) continue;
    ctx.fillStyle = w.cyan ? 'rgba(41, 240, 255, 0.6)' : 'rgba(255, 46, 136, 0.6)';
    ctx.fillRect(x, w.y, 5, 6);
  }
}

// Scanlines and vignette, drawn over everything.
const crt = layer(W, H, b => {
  b.fillStyle = 'rgba(0, 0, 0, 0.13)';
  for (let y = 0; y < H; y += 3) b.fillRect(0, y, W, 1);
  const g = b.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  b.fillStyle = g;
  b.fillRect(0, 0, W, H);
});

// ===================== RENDER WORLD =====================
function drawPlatforms() {
  const list = game && scene !== 'title' && scene !== 'howto' ? game.platforms : PLATFORMS;
  const travel = game && scene !== 'title' && scene !== 'howto' ? game.travel : 0;
  for (const pl of list) {
    if (pl.x > W || pl.x + pl.w < 0) continue;
    if (pl.solid) {
      ctx.fillStyle = C.ground;
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      // Perspective grid rolling toward the viewer (and sideways while the world scrolls).
      ctx.save();
      ctx.beginPath();
      ctx.rect(pl.x, pl.y, pl.w, pl.h);
      ctx.clip();
      ctx.strokeStyle = 'rgba(41, 240, 255, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = -W - (travel % 60); gx <= 2 * W; gx += 60) {
        ctx.moveTo(W / 2 + (gx - W / 2) * 0.35, pl.y + 3);
        ctx.lineTo(gx, pl.y + pl.h);
      }
      for (let k = 0; k < 4; k++) {
        const f = (clock * 0.6 + k / 4) % 1;
        const y = pl.y + 3 + f * f * (pl.h - 3);
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = C.cyan;
      ctx.fillRect(pl.x, pl.y, pl.w, 3);
      ctx.fillStyle = 'rgba(41, 240, 255, 0.25)';
      ctx.fillRect(pl.x, pl.y - 3, pl.w, 3);
    } else {
      ctx.fillStyle = 'rgba(3, 5, 15, 0.5)';
      ctx.fillRect(pl.x + 4, pl.y + pl.h, pl.w - 8, 5);
      ctx.fillStyle = '#2a2580';
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      drawGlow(pl.x + pl.w / 2, pl.y, C.purple, 40, 0.25);
      ctx.fillStyle = '#d58cff';
      ctx.fillRect(pl.x, pl.y, pl.w, 4);
      const on = blink(clock + pl.x * 0.01, 2);
      ctx.fillStyle = on ? C.cyan : C.pink;
      ctx.fillRect(pl.x + 2, pl.y + 6, 4, 4);
      ctx.fillRect(pl.x + pl.w - 6, pl.y + 6, 4, 4);
    }
  }
}

function playerFrame(p) {
  if (p.hurtT > 0) return SPR.player.hurt;
  if (!p.onGround) return p.vy < 0 ? SPR.player.jump : SPR.player.fall;
  if (p.vx !== 0) return SPR.player.run[Math.floor(game.time * 10) % 2];
  return SPR.player.idle;
}

function drawPlayer() {
  const p = game.player;
  if (game.phase === 'playerDying') return;
  if (p.invuln > 0 && !(p.dashT > 0) && !blink(p.invuln, 16)) return;
  const frame = playerFrame(p);
  const img = p.facing > 0 ? frame.r : frame.l;
  const sq = p.sq || 1;
  const dw = img.width / sq, dh = img.height * sq;
  ctx.drawImage(img, cx(p) - dw / 2, p.y + p.h - dh, dw, dh);
  if (p.shield) {
    drawGlow(cx(p), cy(p), C.cyan, 34, 0.35);
    ctx.strokeStyle = `rgba(41, 240, 255, ${0.5 + 0.3 * Math.sin(game.time * 8)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx(p), cy(p), 24, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Blaster arm, rotated toward the aim direction.
  const ang = p.aimAng ?? (p.facing > 0 ? 0 : Math.PI);
  ctx.save();
  ctx.translate(cx(p), p.y + p.h - dh + 16 * sq);
  ctx.rotate(ang);
  ctx.fillStyle = '#1fb8c8';
  ctx.fillRect(0, -2, 8, 5);
  ctx.fillStyle = game.rapidTimer > 0 || game.weapon ? C.yellow : C.white;
  ctx.fillRect(6, -3, 10, 6);
  ctx.restore();
}

function drawEnemy(e) {
  if (e.tele > 0) {
    ctx.strokeStyle = blink(e.tele, 12) ? C.pink : 'rgba(255, 46, 136, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(e.x, Math.max(e.y, 0), e.w, e.h);
    ctx.setLineDash([]);
    if (e.sky) {
      ctx.fillStyle = C.pink;
      ctx.beginPath();
      ctx.moveTo(cx(e) - 8, 4);
      ctx.lineTo(cx(e) + 8, 4);
      ctx.lineTo(cx(e), 16);
      ctx.fill();
    }
    return;
  }
  const { x, y, w, h } = e;
  const flash = e.flash > 0;
  const looks = LOOK_DRAW[e.look];
  if (looks) {
    looks(e, flash);
    if (e.label) drawThreatLabel(e);
    return;
  }
  if (e.type === 'spam') {
    const f = SPR.spam[Math.floor(game.time * 8 + e.x * 0.02) % 2];
    const left = e.vx < 0;
    ctx.drawImage(flash ? (left ? f.wl : f.wr) : (left ? f.l : f.r), x, y);
  } else if (e.type === 'popup') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(x + 5, y + 5, w, h);
    ctx.fillStyle = C.white;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.pink;
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = C.navy;
    ctx.fillRect(x + w - 12, y + 1, 10, 10);
    text('x', x + w - 7, y + 10, { size: 10, align: 'center' });
    text('FREE $$$', x + w / 2, y + 32, { size: 11, color: C.navy, align: 'center' });
    text('CLICK!!', x + w / 2, y + 47, { size: 10, color: C.pink, align: 'center' });
    if (e.life < 1.5 && blink(e.life, 10)) {
      ctx.fillStyle = 'rgba(7, 11, 36, 0.4)';
      ctx.fillRect(x, y, w, h);
    }
    if (flash) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(x, y, w, h);
    }
  } else if (e.type === 'drone') {
    const f = SPR.drone[Math.floor(game.time * 20) % 2];
    ctx.drawImage(flash ? f.wr : f.r, x, y);
    const charging = e.shootCd < 0.4;
    const eye = charging && blink(e.shootCd, 16) ? C.pink : C.cyan;
    drawGlow(cx(e), cy(e) + 1, eye, charging ? 16 : 10, 0.6);
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(cx(e), cy(e) + 1, 4, 0, Math.PI * 2);
    ctx.fill();
    if (Math.random() < 0.12) {
      ctx.fillStyle = 'rgba(41, 240, 255, 0.6)';
      ctx.fillRect(x + rand(-6, 6), y + rand(0, h), w, 2);
    }
  } else if (e.type === 'spinner') {
    drawSpinner(e, flash);
  } else if (e.type === 'turret') {
    drawTurret(e, flash);
  } else if (e.type === 'worm') {
    drawWorm(e, flash);
  }
}

// ---- Real-threat looks ----
// Every enemy is drawn as the real threat it stands for; behaviour comes from its type.
function drawThreatLabel(e) {
  const ly = e.type === 'lockwall' ? GROUND_Y - 236 : e.y - 14;
  const label = e.label.toUpperCase();
  ctx.font = 'bold 10px "Courier New", monospace';
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(3, 5, 15, 0.7)';
  ctx.fillRect(cx(e) - tw / 2 - 4, ly - 19, tw + 8, 23);
  text(THREAT_NAMES[e.look] || '', cx(e), ly - 10, { size: 7, color: C.pink, align: 'center' });
  text(label, cx(e), ly + 1, { size: 10, color: C.yellow, align: 'center' });
}

function drawPhish(e, flash) {
  // A spam email with a fishing hook through it.
  const { x, w, h } = e;
  const y = e.y + Math.sin(game.time * 10 + x * 0.05) * 1.5;
  ctx.strokeStyle = 'rgba(232, 246, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y - 26);
  ctx.lineTo(x + w / 2, y - 4);
  ctx.stroke();
  ctx.fillStyle = flash ? C.white : '#f3f6ff';
  ctx.fillRect(x, y + 4, w, h - 8);
  ctx.strokeStyle = C.pink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 1, y + 5);
  ctx.lineTo(x + w / 2, y + 13);
  ctx.lineTo(x + w - 1, y + 5);
  ctx.stroke();
  ctx.strokeStyle = C.yellow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y - 4);
  ctx.lineTo(x + w / 2, y + 8);
  ctx.arc(x + w / 2 + 4, y + 8, 4, Math.PI, 0, true);
  ctx.lineTo(x + w / 2 + 8, y + 5);
  ctx.stroke();
  ctx.fillStyle = C.navy;
  const step = Math.floor(game.time * 8 + x * 0.02) % 2 ? 2 : 0;
  ctx.fillRect(x + 4 + step, y + h - 4, 4, 4);
  ctx.fillRect(x + w - 8 - step, y + h - 4, 4, 4);
}

function drawHacker(e, flash) {
  // Hooded figure with a glowing terminal for a face.
  const { x, y, w, h } = e;
  ctx.fillStyle = flash ? C.white : '#2b1b4d';
  ctx.beginPath();
  ctx.moveTo(x + 3, y + h);
  ctx.lineTo(x + 2, y + 9);
  ctx.quadraticCurveTo(x + w / 2, y - 8, x + w - 2, y + 9);
  ctx.lineTo(x + w - 3, y + h);
  ctx.fill();
  ctx.fillStyle = '#05060f';
  ctx.fillRect(x + 7, y + 6, w - 14, 9);
  drawGlow(cx(e), y + 10, '#3dff7a', 14, 0.5);
  text(blink(game.time, 3) ? '>_' : '>', x + 9, y + 14, { size: 8, color: '#3dff7a' });
  ctx.fillStyle = '#9aa4d9';
  ctx.fillRect(x + 4, y + h - 7, w - 8, 3);
}

function drawBot(e, flash) {
  // Botnet node: a little propeller robot with a red scanning eye.
  const { x, y, w, h } = e;
  const spin = Math.floor(game.time * 20) % 2;
  ctx.fillStyle = C.dim;
  ctx.fillRect(x + (spin ? 2 : 5), y - 5, spin ? 12 : 6, 2);
  ctx.fillRect(x + w - (spin ? 14 : 11), y - 5, spin ? 12 : 6, 2);
  ctx.fillRect(x + 7, y - 4, 2, 5);
  ctx.fillRect(x + w - 9, y - 4, 2, 5);
  ctx.fillStyle = flash ? C.white : '#8f9bd6';
  ctx.fillRect(x + 3, y, w - 6, h);
  ctx.fillStyle = '#5c6699';
  ctx.fillRect(x + 3, y + h - 4, w - 6, 4);
  ctx.fillStyle = '#10142e';
  ctx.fillRect(x + 7, y + 3, w - 14, 7);
  const charging = e.shootCd < 0.4;
  const eye = charging && blink(e.shootCd, 16) ? C.yellow : '#ff3b3b';
  const ex = x + 9 + ((Math.sin(game.time * 3) + 1) / 2) * (w - 22);
  drawGlow(ex + 2, y + 6, eye, charging ? 16 : 10, 0.7);
  ctx.fillStyle = eye;
  ctx.fillRect(ex, y + 4, 5, 5);
  text('BOT', cx(e), y + h - 5, { size: 7, color: '#10142e', align: 'center' });
}

function drawVirus(e, flash) {
  // Malware: a spiky virus particle that locks on and charges.
  const hot = e.state === 'aim' || e.state === 'charge';
  if (e.state === 'aim') {
    ctx.strokeStyle = blink(e.st, 14) ? C.pink : 'rgba(255, 46, 136, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(cx(e), cy(e));
    ctx.lineTo(e.tx, e.ty);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const color = flash ? C.white : e.state === 'stun' ? C.dim : hot ? '#ff2e2e' : '#ff6b6b';
  drawGlow(cx(e), cy(e), color, hot ? 30 : 20, 0.5);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  for (let k = 0; k < 8; k++) {
    const a = e.spin * 0.3 + (k * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx(e) + Math.cos(a) * 8, cy(e) + Math.sin(a) * 8);
    ctx.lineTo(cx(e) + Math.cos(a) * 13, cy(e) + Math.sin(a) * 13);
    ctx.stroke();
    ctx.fillRect(cx(e) + Math.cos(a) * 14 - 2, cy(e) + Math.sin(a) * 14 - 2, 4, 4);
  }
  ctx.beginPath();
  ctx.arc(cx(e), cy(e), 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a0f2a';
  ctx.beginPath();
  ctx.arc(cx(e) - 2, cy(e) - 1, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawDatabase(e, flash) {
  // Data breach: a database cylinder leaking records, firing them at the player.
  const { x, y, w, h } = e;
  const charging = e.burst > 0 || e.cd < 0.5;
  if (charging) drawGlow(cx(e), y + 8, C.pink, 20, 0.6);
  for (let i = 0; i < 3; i++) {
    const k = (game.time * 0.8 + i / 3) % 1;
    ctx.globalAlpha = 1 - k;
    text(i % 2 ? '1' : '0', x + 6 + i * 9, y + h + k * 26, { size: 9, color: C.cyan });
  }
  ctx.globalAlpha = 1;
  const body = flash ? C.white : '#4fd1ff';
  ctx.fillStyle = body;
  ctx.fillRect(x + 2, y + 5, w - 4, h - 8);
  ctx.beginPath();
  ctx.ellipse(cx(e), y + h - 3, w / 2 - 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flash ? C.white : '#b5ecff';
  ctx.beginPath();
  ctx.ellipse(cx(e), y + 5, w / 2 - 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a6b8f';
  ctx.lineWidth = 2;
  for (const ry of [y + 13, y + 21]) {
    ctx.beginPath();
    ctx.ellipse(cx(e), ry, w / 2 - 2, 3, 0, 0, Math.PI);
    ctx.stroke();
  }
  // Crack the records leak out of.
  ctx.strokeStyle = C.pink;
  ctx.beginPath();
  ctx.moveTo(x + w - 9, y + 9);
  ctx.lineTo(x + w - 13, y + 15);
  ctx.lineTo(x + w - 8, y + 19);
  ctx.stroke();
}

function drawCCTV(e, flash) {
  // Spyware: a surveillance camera on a mount, shielded from the front.
  const { x, y, w, h } = e;
  const f = e.facing;
  const charging = e.burst > 0 || e.cd < 0.5;
  ctx.fillStyle = '#5c6699';
  ctx.fillRect(cx(e) - 2, y + 14, 4, h - 14);
  ctx.fillRect(cx(e) - 8, y + h - 4, 16, 4);
  ctx.save();
  ctx.translate(cx(e), y + 12);
  ctx.rotate(f > 0 ? 0.15 : -0.15);
  ctx.fillStyle = flash ? C.white : '#d9e2ff';
  ctx.fillRect(-14, -8, 28, 14);
  ctx.fillStyle = '#10142e';
  ctx.fillRect(f > 0 ? 10 : -16, -6, 6, 10);
  ctx.restore();
  const lx = cx(e) + f * 14;
  if (charging) drawGlow(lx, y + 11, C.pink, 18, 0.7);
  ctx.fillStyle = charging && blink(e.cd, 12) ? C.pink : '#3a7bff';
  ctx.beginPath();
  ctx.arc(lx, y + 11, 3, 0, Math.PI * 2);
  ctx.fill();
  if (blink(game.time, 2)) {
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(cx(e) - f * 9 - 2, y + 6, 4, 4);
  }
  const sx = f > 0 ? x + w + 6 : x - 10;
  drawGlow(sx + 2, y + h / 2, C.cyan, 22, 0.45);
  ctx.fillStyle = C.cyan;
  ctx.fillRect(sx, y - 2, 4, h + 4);
}

const MISINFO_TEXT = [['FAKE NEWS', 'SHARE NOW!'], ['YOU WON!', 'CLAIM $$$'], ['DEEPFAKE', '100% REAL'], ['BREAKING', "DON'T CHECK"]];
function drawMisinfo(e, flash) {
  // Misinformation: an ad/pop-up window pushing something false. Blocks shots.
  const { x, y, w, h } = e;
  const [t1, t2] = MISINFO_TEXT[(e.seed || 0) % MISINFO_TEXT.length];
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(x + 5, y + 5, w, h);
  ctx.fillStyle = C.white;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.yellow;
  ctx.fillRect(x, y, w, 12);
  text('!', x + 6, y + 10, { size: 10, color: C.navy });
  ctx.fillStyle = C.navy;
  ctx.fillRect(x + w - 12, y + 1, 10, 10);
  text('x', x + w - 7, y + 10, { size: 10, align: 'center' });
  text(t1, x + w / 2, y + 32, { size: 11, color: '#d11a5b', align: 'center' });
  text(t2, x + w / 2, y + 47, { size: 9, color: C.navy, align: 'center' });
  if (e.life < 1.5 && blink(e.life, 10)) {
    ctx.fillStyle = 'rgba(7, 11, 36, 0.4)';
    ctx.fillRect(x, y, w, h);
  }
  if (flash) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillRect(x, y, w, h);
  }
}

function drawLockwall(e, flash) {
  // Ransomware: a padlocked barrier that stops everything until it's shot open.
  const { x, y, w, h } = e;
  ctx.fillStyle = flash ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 46, 136, 0.18)';
  ctx.fillRect(x, y, w, h);
  // Chain-link mesh.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 46, 136, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k < w + h; k += 16) {
    ctx.moveTo(x + k, y);
    ctx.lineTo(x + k - h, y + h);
    ctx.moveTo(x + k - h, y);
    ctx.lineTo(x + k, y + h);
  }
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = C.pink;
  ctx.fillRect(x, y, 3, h);
  ctx.fillRect(x + w - 3, y, 3, h);
  const ly = GROUND_Y - 190;
  drawGlow(cx(e), ly + 30, C.yellow, 50, 0.35);
  ctx.strokeStyle = flash ? C.white : '#c9a227';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx(e), ly + 16, 15, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = flash ? C.white : C.yellow;
  ctx.fillRect(x + 4, ly + 14, w - 8, 44);
  ctx.fillStyle = C.navy;
  ctx.beginPath();
  ctx.arc(cx(e), ly + 30, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx(e) - 2, ly + 30, 4, 10);
  text('PAY ₿', cx(e), ly + 54, { size: 10, color: '#7a1f00', align: 'center' });
  // Health pips under the lock.
  for (let i = 0; i < e.maxHp; i++) {
    ctx.fillStyle = i < e.hp ? C.yellow : '#2a2f66';
    ctx.fillRect(x + 4 + i * ((w - 8) / e.maxHp), ly + 64, (w - 8) / e.maxHp - 2, 4);
  }
}

const LOOK_DRAW = {
  phishing: drawPhish, hack: drawHacker, botnet: drawBot, virus: drawVirus, breach: drawDatabase,
  spyware: drawCCTV, misinfo: drawMisinfo, ransomware: drawLockwall, worm: (e, flash) => drawWorm(e, flash),
};

// End-of-year portal that scrolls in after the last incident.
function drawGate(g) {
  const x = g.x, top = 70;
  drawGlow(x + 20, (top + GROUND_Y) / 2, C.cyan, 140, 0.35);
  ctx.fillStyle = 'rgba(41, 240, 255, 0.12)';
  ctx.fillRect(x, top, 40, GROUND_Y - top);
  ctx.fillStyle = C.cyan;
  for (let i = 0; i < 6; i++) {
    const yy = top + (((clock * 120) + i * 70) % (GROUND_Y - top));
    ctx.fillRect(x + 4, yy, 32, 3);
  }
  ctx.fillRect(x, top, 4, GROUND_Y - top);
  ctx.fillRect(x + 36, top, 4, GROUND_Y - top);
  text(`${game.year + 1} →`, x + 20, top - 12, { size: 22, color: C.cyan, align: 'center' });
}

function drawSpinner(e, flash) {
  const hot = e.state === 'aim' || e.state === 'charge';
  const color = flash ? C.white : e.state === 'stun' ? C.dim : hot ? C.pink : C.cyan;
  if (e.state === 'aim') {
    ctx.strokeStyle = blink(e.st, 14) ? C.pink : 'rgba(255, 46, 136, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(cx(e), cy(e));
    ctx.lineTo(e.tx, e.ty);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  drawGlow(cx(e), cy(e), color, hot ? 30 : 20, 0.5);
  // A literal loading spinner: 8 dots fading around the ring.
  for (let k = 0; k < 8; k++) {
    const a = e.spin + (k * Math.PI) / 4;
    ctx.globalAlpha = 0.25 + (k / 8) * 0.75;
    ctx.fillStyle = color;
    ctx.fillRect(cx(e) + Math.cos(a) * 10 - 3, cy(e) + Math.sin(a) * 10 - 3, 6, 6);
  }
  ctx.globalAlpha = 1;
}

function drawTurret(e, flash) {
  const { x, y, w, h } = e;
  const charging = e.burst > 0 || e.cd < 0.5;
  if (charging) drawGlow(cx(e) + e.facing * 14, y + 12, C.pink, 18, 0.7);
  ctx.fillStyle = flash ? C.white : '#d9e2ff';
  ctx.fillRect(x, y + 4, w, h - 4);
  ctx.fillStyle = C.navy;
  ctx.fillRect(x + 4, y + 10, 10, 10);
  ctx.strokeStyle = '#3ddc84';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 15);
  ctx.lineTo(x + 9, y + 18);
  ctx.lineTo(x + 13, y + 11);
  ctx.stroke();
  // Barrel and shield on the facing side.
  ctx.fillStyle = charging && blink(e.cd, 12) ? C.pink : C.navy;
  ctx.fillRect(e.facing > 0 ? x + w - 2 : x - 8, y + 10, 10, 5);
  const sx = e.facing > 0 ? x + w + 6 : x - 10;
  drawGlow(sx + 2, y + h / 2, C.cyan, 22, 0.45);
  ctx.fillStyle = C.cyan;
  ctx.fillRect(sx, y - 2, 4, h + 4);
  text('CAPTCHA', cx(e), y + h - 2, { size: 7, color: C.navy, align: 'center' });
}

function drawWorm(e, flash) {
  const segs = wormSegments(e);
  for (let i = segs.length - 1; i >= 0; i--) {
    const sg = segs[i];
    ctx.fillStyle = i % 2 ? '#3fa83a' : '#7dff6a';
    ctx.fillRect(sg.x, sg.y, sg.w, sg.h);
    ctx.fillStyle = 'rgba(3, 5, 15, 0.5)';
    ctx.fillRect(sg.x, sg.y + sg.h - 3, sg.w, 3);
  }
  drawGlow(cx(e), cy(e), '#7dff6a', 22, 0.35);
  ctx.fillStyle = flash ? C.white : '#7dff6a';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = C.navy;
  const ex = e.dir > 0 ? e.x + 14 : e.x + 4;
  ctx.fillRect(ex, e.y + 4, 8, 6);
  ctx.fillStyle = C.pink;
  ctx.fillRect(ex + (e.dir > 0 ? 4 : 0), e.y + 5, 4, 4);
  ctx.fillStyle = C.navy;
  ctx.fillRect(e.dir > 0 ? e.x + e.w - 6 : e.x, e.y + 13, 6, 3);
}

function drawBoss() {
  const b = game.boss;
  if (game.phase === 'bossDying' && !blink(game.endTimer, 14)) return;
  const { x, y, w, h } = b;
  const angry = !!b.attack || b.roar > 0 || game.lasers.some(l => l.warn > 0);
  const bsod = b.phase === 3;
  drawGlow(cx(b), cy(b), bsod ? '#3d6bff' : angry ? C.pink : C.purple, 120, 0.35);
  if (b.attack && b.attack.id === 'scroll_spiral' && b.attack.tele > 0) {
    drawGlow(cx(b), cy(b), C.yellow, 90, 0.6);
    ctx.strokeStyle = C.yellow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx(b), cy(b), 40 + b.attack.tele * 90, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (b.roar > 0) ctx.translate(rand(-3, 3), rand(-3, 3));
  ctx.fillStyle = C.dim;
  ctx.fillRect(x + w / 2 - 2, y - 18, 4, 18);
  ctx.fillStyle = angry ? C.pink : C.cyan;
  ctx.fillRect(x + w / 2 - 5, y - 24, 10, 8);
  ctx.fillStyle = C.ledge;
  ctx.fillRect(x + w / 2 - 15, y + h, 30, 12);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.purple;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.fillStyle = bsod ? '#1f4fff' : '#050818';
  ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
  if (bsod) {
    text(':(', x + 30, y + 62, { size: 34, color: C.white });
    text('YOUR PC RAN INTO', x + 22, y + 82, { size: 8, color: C.white });
    text('A PLAYER', x + 22, y + 94, { size: 8, color: C.white });
    text(`STOP 0x${(b.maxHp - Math.max(0, b.hp)).toString(16).toUpperCase().padStart(4, '0')}`, x + 22, y + 108, { size: 8, color: '#bcd0ff' });
    if (b.flash > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(x, y, w, h);
    }
    return;
  }
  ctx.fillStyle = 'rgba(41, 240, 255, 0.06)';
  for (let sy = y + 12; sy < y + h - 10; sy += 4) ctx.fillRect(x + 10, sy, w - 20, 1);
  const eye = angry ? (blink(b.t, 10) ? C.pink : '#ff7ab4') : C.cyan;
  drawGlow(x + 41, y + 46, eye, 26, 0.5);
  drawGlow(x + w - 41, y + 46, eye, 26, 0.5);
  // Scan line sweeping down the screen.
  ctx.fillStyle = 'rgba(41, 240, 255, 0.18)';
  ctx.fillRect(x + 10, y + 10 + ((b.t * 60) % (h - 22)), w - 20, 3);
  ctx.fillStyle = eye;
  ctx.fillRect(x + 30, y + 40, 22, angry ? 8 : 14);
  ctx.fillRect(x + w - 52, y + 40, 22, angry ? 8 : 14);
  ctx.fillRect(x + 40, y + 86, w - 80, 5);
  if (!angry) ctx.fillRect(x + w - 44, y + 80, 6, 6);
  if (b.flash > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(x, y, w, h);
  }
}

function drawLaser(l) {
  if (l.bsod && l.warn <= 0) {
    // Falling blue-screen blocks instead of a beam.
    ctx.fillStyle = 'rgba(31, 79, 255, 0.35)';
    ctx.fillRect(l.x, l.y, l.w, l.h);
    const k = 1 - l.active / 0.5;
    for (let i = 0; i < 4; i++) {
      const by = ((k * 2 + i / 4) % 1) * l.h - 30;
      ctx.fillStyle = '#1f4fff';
      ctx.fillRect(l.x + 20, by, l.w - 40, 34);
      text(':(', l.x + l.w / 2, by + 24, { size: 18, color: C.white, align: 'center' });
    }
    return;
  }
  if (l.warn > 0) {
    ctx.fillStyle = `rgba(255, 46, 136, ${blink(l.warn, 10) ? 0.3 : 0.14})`;
    ctx.fillRect(l.x, l.y, l.w, l.h);
    ctx.strokeStyle = C.pink;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(l.x + 1, l.y + 1, l.w - 2, l.h - 2);
    ctx.setLineDash([]);
    text('!', l.x + l.w / 2, l.y + l.h / 2 + 8, { size: 24, color: C.pink, align: 'center' });
    return;
  }
  ctx.save();
  ctx.shadowColor = C.pink;
  ctx.shadowBlur = 20;
  ctx.fillStyle = C.pink;
  ctx.fillRect(l.x, l.y, l.w, l.h);
  ctx.restore();
  ctx.fillStyle = C.white;
  if (l.w > l.h) ctx.fillRect(l.x, l.y + l.h / 2 - 4, l.w, 8);
  else ctx.fillRect(l.x + l.w / 2 - 4, l.y, 8, l.h);
}

function drawPickup(pu) {
  if (pu.falls && pu.life < 2 && !blink(pu.life, 8)) return;
  const y = pu.y + (pu.falls ? 0 : Math.sin(pu.t * 4) * 3);
  const wpn = WEAPONS[pu.kind];
  const color = pu.kind === 'health' ? C.pink : wpn ? wpn.color : C.yellow;
  drawGlow(pu.x + pu.w / 2, y + pu.h / 2, color, wpn ? 28 : 22, 0.5);
  ctx.fillStyle = C.navy;
  ctx.fillRect(pu.x, y, pu.w, pu.h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(pu.x, y, pu.w, pu.h);
  if (pu.kind === 'health') drawHeart(pu.x + 2, y + 4, 2, true);
  else text(wpn ? wpn.letter : 'R', pu.x + pu.w / 2, y + 16, { size: 15, color, align: 'center' });
}

function drawFx(f) {
  const k = f.t / f.life;
  ctx.globalAlpha = 1 - k;
  if (f.kind === 'text') {
    text(f.text, f.x, f.y - 30 * k, { size: 14, color: f.color, align: 'center' });
  } else if (f.kind === 'ring') {
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 6 + 34 * k, 0, Math.PI * 2);
    ctx.stroke();
  } else if (f.kind === 'spark') {
    const sz = f.size || 4;
    ctx.fillStyle = f.color;
    if (f.spin) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    } else ctx.fillRect(f.x - sz / 2, f.y - sz / 2, sz, sz);
  } else if (f.kind === 'flash') {
    drawGlow(f.x, f.y, C.white, 16, 0.9 * (1 - k));
    ctx.fillStyle = C.white;
    ctx.fillRect(f.x - 4, f.y - 4, 8, 8);
  } else if (f.kind === 'ghost') {
    ctx.globalAlpha = 0.45 * (1 - k);
    ctx.drawImage(f.img, f.x, f.y);
  } else if (f.kind === 'x') {
    const s = 10 + 20 * k;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(f.x - s, f.y - s); ctx.lineTo(f.x + s, f.y + s);
    ctx.moveTo(f.x + s, f.y - s); ctx.lineTo(f.x - s, f.y + s);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Player bullets are drawn as a glowing streak along their velocity, so any angle reads well.
function drawBullet(bl) {
  const bx = bl.x + bl.w / 2, by = bl.y + bl.h / 2;
  const sp = Math.hypot(bl.vx, bl.vy || 0) || 1;
  const dx = bl.vx / sp, dy = (bl.vy || 0) / sp;
  const color = bl.color || C.cyan;
  const size = bl.big ? 1.6 : 1;
  drawGlow(bx, by, color, 16 * size, 0.5);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 4 * size;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx - dx * 26, by - dy * 26);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 3 * size;
  ctx.beginPath();
  ctx.moveTo(bx - dx * 6, by - dy * 6);
  ctx.lineTo(bx + dx * 6, by + dy * 6);
  ctx.stroke();
}

function drawWorld() {
  drawPlatforms();
  if (game.run && game.run.gate) drawGate(game.run.gate);
  for (const pu of game.pickups) drawPickup(pu);
  for (const l of game.lasers) drawLaser(l);
  for (const e of game.enemies) drawEnemy(e);
  if (game.boss) {
    ctx.save();
    drawBoss();
    ctx.restore();
  }
  for (const bl of game.bullets) drawBullet(bl);
  for (const bl of game.enemyBullets) {
    drawGlow(bl.x + bl.w / 2, bl.y + bl.h / 2, C.yellow, 14, 0.55);
    ctx.fillStyle = C.yellow;
    ctx.beginPath();
    ctx.arc(bl.x + bl.w / 2, bl.y + bl.h / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.fillRect(bl.x + bl.w / 2 - 1.5, bl.y + bl.h / 2 - 1.5, 3, 3);
  }
  drawPlayer();
  for (const f of game.fx) drawFx(f);
}

// ===================== RENDER HUD & SCREENS =====================
function drawHUD() {
  const p = game.player;
  for (let i = 0; i < p.maxHp; i++) drawHeart(16 + i * 30, 16, 3, i < p.hp);
  if (p.shield) text('AD-BLOCKER', 16 + p.maxHp * 30, 30, { size: 11, color: C.cyan });
  // Dash cooldown bar.
  const dashK = clamp(1 - p.dashCd / (DASH_CD * (hasPerk('long_dash') ? 0.6 : 1)), 0, 1);
  ctx.fillStyle = '#2a2f66';
  ctx.fillRect(16, 40, 60, 4);
  ctx.fillStyle = dashK >= 1 ? C.cyan : C.dim;
  ctx.fillRect(16, 40, 60 * dashK, 4);
  text('DASH', 82, 45, { size: 9, color: dashK >= 1 ? C.cyan : C.dim });
  let hy = 62;
  if (game.weapon) {
    const wpn = WEAPONS[game.weapon.id];
    text(wpn.name, 16, hy, { size: 13, color: wpn.color });
    ctx.fillStyle = wpn.color;
    ctx.fillRect(16, hy + 4, 120 * (game.weapon.t / wpn.dur), 3);
    hy += 22;
  }
  if (game.rapidTimer > 0) text(`RAPID FIRE ${Math.ceil(game.rapidTimer)}s`, 16, hy, { size: 13, color: C.yellow });

  text(`SCORE ${String(game.score).padStart(6, '0')}`, W - 16, 30, { size: 16, align: 'right' });
  text(`TIME ${fmtTime(game.time)}`, W - 16, 50, { size: 13, color: C.dim, align: 'right' });
  const combo = game.combo;
  if (combo.chain > 0 && combo.t > 0) {
    const mult = comboMult(combo.chain);
    const win = COMBO_WINDOW + (hasPerk('combo_window') ? 1 : 0);
    text(mult > 1 ? `VIRAL x${mult}` : `CHAIN ${combo.chain}`, W - 16, 72, { size: mult > 1 ? 16 : 12, color: mult > 1 ? C.pink : C.dim, align: 'right' });
    ctx.fillStyle = mult > 1 ? C.pink : C.dim;
    ctx.fillRect(W - 116, 78, 100 * clamp(combo.t / win, 0, 1), 3);
  }
  if (game.perks.length && scene === 'play') {
    const label = game.perks.map(id => PERKS[id].name).join(' · ');
    text(label, 16, H - 14, { size: 10, color: C.dim });
  }
  if (scene === 'play') text(`M: SOUND ${muted ? 'OFF' : 'ON'}  N: MUSIC ${musicOn ? 'ON' : 'OFF'}  V: VOICE ${voiceOn ? 'ON' : 'OFF'}`, W - 16, H - 14, { size: 11, color: C.dim, align: 'right' });

  let label;
  if (game.phase === 'director') label = 'AI DIRECTOR';
  else if (game.boss) label = `${game.year} · THE ALGORITHM ${game.boss.version}`;
  else label = `${game.year} · ${game.chapter.toUpperCase()}`;
  text(label, W / 2, 26, { size: 15, color: C.cyan, align: 'center' });

  const b = game.boss;
  if (b) {
    const bw = 360, bx = W / 2 - bw / 2;
    ctx.fillStyle = '#2a2f66';
    ctx.fillRect(bx, 36, bw, 10);
    ctx.fillStyle = b.phase === 3 ? '#3d6bff' : C.pink;
    ctx.fillRect(bx, 36, (bw * Math.max(0, b.hp)) / b.maxHp, 10);
    ctx.fillStyle = C.white;
    if (b.maxPhase >= 2) ctx.fillRect(bx + bw * 0.5, 34, 2, 14); // phase thresholds
    if (b.maxPhase >= 3) ctx.fillRect(bx + bw * 0.25, 34, 2, 14);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, 36.5, bw - 1, 9);
  } else if (game.run) {
    // Progress through the year, from one January to the next.
    const r = game.run, bw = 300, bx = W / 2 - bw / 2;
    const k = clamp(r.dist / r.length, 0, 1);
    text(String(game.year), bx - 8, 46, { size: 11, color: C.dim, align: 'right' });
    text(String(game.year + 1), bx + bw + 8, 46, { size: 11, color: C.dim });
    ctx.fillStyle = '#2a2f66';
    ctx.fillRect(bx, 39, bw, 6);
    ctx.fillStyle = C.cyan;
    ctx.fillRect(bx, 39, bw * k, 6);
    for (const ev of r.queue) {
      if (!ev.item) continue;
      ctx.fillStyle = ev.at <= r.dist ? C.dim : C.pink;
      ctx.fillRect(bx + bw * clamp(ev.at / r.length, 0, 1) - 1, 37, 2, 10);
    }
    text(`PATCHED ${r.patched}/${r.total}`, W / 2, 60, { size: 10, color: C.dim, align: 'center' });
  }

  if (game.taunt && game.taunt.t > 0) {
    ctx.globalAlpha = Math.min(1, game.taunt.t);
    const lines = wrapText(`THE ALGORITHM: "${game.taunt.text}"`, 560, 14);
    const ph = lines.length * 18 + 14;
    panel(W / 2 - 300, 58, 600, ph, C.pink);
    lines.forEach((ln, i) => text(ln, W / 2, 78 + i * 18, { size: 14, align: 'center' }));
    ctx.globalAlpha = 1;
  }
}

function drawOverlays() {
  if (game.banner && game.banner.t > 0) {
    ctx.globalAlpha = Math.min(1, game.banner.t * 2);
    text(game.banner.title, W / 2, 200, { size: 44, color: C.cyan, align: 'center' });
    text(game.banner.sub, W / 2, 230, { size: 18, align: 'center' });
    ctx.globalAlpha = 1;
  }

  if (game.controlsTimer > 0 && scene === 'play' && game.phase !== 'director') {
    ctx.globalAlpha = Math.min(1, game.controlsTimer) * 0.9;
    panel(W / 2 - 270, 290, 540, 118, C.cyan);
    text('A/D or ←/→  MOVE     SPACE/W/↑  JUMP (x2 IN AIR)', W / 2, 318, { size: 14, align: 'center' });
    text('J  FIRE     CLICK  AIM + FIRE     SHIFT/K  DASH', W / 2, 342, { size: 14, align: 'center' });
    text('S/↓  DROP DOWN     P/ESC  PAUSE', W / 2, 366, { size: 14, align: 'center' });
    text('M  SOUND     N  MUSIC     V  VOICE', W / 2, 390, { size: 14, color: C.dim, align: 'center' });
    ctx.globalAlpha = 1;
  }

  const d = game.director;
  if (game.phase === 'director' && d) drawDirectorPanel(d);

  if (game.paused) {
    ctx.fillStyle = 'rgba(3, 5, 15, 0.7)';
    ctx.fillRect(0, 0, W, H);
    text('PAUSED', W / 2, 250, { size: 40, color: C.cyan, align: 'center' });
    text(`P / ESC to resume  ·  R to restart ${game.year}`, W / 2, 290, { size: 16, align: 'center' });
  }
}

function drawTitleParade() {
  // A few monsters marching along the ground and a drone patrolling the sky.
  for (let i = 0; i < 4; i++) {
    const x = ((sceneTimer * 70 + i * 260) % (W + 80)) - 40;
    const f = SPR.spam[Math.floor(sceneTimer * 8 + i) % 2];
    ctx.drawImage(f.r, x, GROUND_Y - 22);
  }
  const dx = W - (((sceneTimer * 90) % (W + 120)) - 60);
  const d = SPR.drone[Math.floor(sceneTimer * 20) % 2];
  ctx.drawImage(d.r, dx, 70 + Math.sin(sceneTimer * 2) * 14);
}

function drawGlitchText(str, x, y, size, color) {
  // Every so often the logo tears into offset colour channels.
  const glitch = Math.sin(sceneTimer * 7.3) > 0.93 || Math.sin(sceneTimer * 2.1 + 1) > 0.985;
  if (glitch) {
    ctx.globalAlpha = 0.7;
    text(str, x + rand(-8, 8), y, { size, color: C.pink, align: 'center' });
    text(str, x + rand(-8, 8), y + rand(-2, 2), { size, color: C.cyan, align: 'center' });
    ctx.globalAlpha = 1;
  }
  drawGlow(x, y - size * 0.35, color, 170, 0.18);
  text(str, x + (glitch ? rand(-3, 3) : 0), y, { size, color, align: 'center' });
}

// Pads/truncates to a pixel width at the current font.
function fitText(str, maxW, size) {
  ctx.font = `bold ${size}px "Courier New", monospace`;
  if (ctx.measureText(str).width <= maxW) return str;
  let t = str;
  while (t.length > 4 && ctx.measureText(`${t}...`).width > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

function drawDirectorPanel(d) {
  panel(W / 2 - 320, 66, 640, 440);
  const head = d.next === 'boss' ? `${game.year}: THE ALGORITHM IS WAITING` : `${game.year} COMPLETE`;
  text(head, W / 2, 98, { size: 22, color: C.cyan, align: 'center' });
  text(`INCIDENTS PATCHED ${d.patched}/${d.total}`, W / 2, 118, { size: 12, color: C.dim, align: 'center' });
  const dots = '.'.repeat(Math.floor(d.t * 3) % 4);
  text(`THE ALGORITHM IS ANALYZING YOU${dots}`, W / 2 - 170, 142, { size: 14, color: C.pink });
  const s = d.stats;
  const acc = s.shotsFired ? Math.round((100 * s.shotsHit) / s.shotsFired) : 0;
  text(`ACCURACY ${acc}%   JUMPS ${s.jumpCount}   KILLS ${s.kills}   BEST COMBO ${s.maxCombo}   HP ${s.hp}/${s.maxHp}`, W / 2, 160, { size: 12, color: C.dim, align: 'center' });
  if (!d.readyAt || d.t < d.readyAt) return;
  const dec = d.decision;
  const boss = BOSS_YEARS[d.nextYear];
  const nextLabel = d.next === 'boss' ? `BOSS: THE ALGORITHM ${boss.version}` : `${d.nextYear}: ${(dec.chapterTitle || CHAPTERS[d.nextYear] || '').toUpperCase()}`;
  text(`NEXT  ${nextLabel}`, W / 2, 190, { size: 19, color: C.yellow, align: 'center' });
  const diff = '■'.repeat(dec.difficulty) + '□'.repeat(3 - dec.difficulty);
  text(`DIFFICULTY ${diff}    PICKUP: ${dec.pickup.replace('_', ' ').toUpperCase()}`, W / 2, 210, { size: 12, align: 'center' });

  // The real events behind the next stage, with where they come from.
  const events = (TIMELINE.years[d.nextYear] || []).slice(0, 3);
  text(d.next === 'boss' ? `REAL INCIDENTS OF ${d.nextYear} THAT FED IT:` : `REAL INCIDENTS AHEAD IN ${d.nextYear}:`, W / 2 - 300, 234, { size: 11, color: C.pink });
  events.forEach((ev, i) => {
    const detail = ev.blurb && ev.blurb.toLowerCase() !== ev.name.toLowerCase() ? ` — ${ev.blurb}` : '';
    text(fitText(`${THREAT_NAMES[ev.threat]}: ${ev.name}${detail}`, 600, 11), W / 2 - 300, 252 + i * 16, { size: 11, color: C.white });
  });
  const src = events.find(ev => ev.real) ? `SOURCES: ${[...new Set(events.filter(ev => ev.real).map(ev => ev.source))].join(' · ')}` : 'SOURCE: BUILT-IN TIMELINE';
  text(fitText(src, 600, 9), W / 2 - 300, 300, { size: 9, color: C.dim });

  const offer = dec.perkOffer;
  offer.forEach((id, i) => {
    const r = perkCardRect(i, offer.length);
    const chosen = d.chosen === i, faded = d.chosen != null && !chosen;
    ctx.globalAlpha = faded ? 0.35 : 1;
    panel(r.x, r.y, r.w, r.h, chosen ? C.yellow : d.sel === i ? C.cyan : C.dim);
    if (chosen || (d.chosen == null && d.sel === i)) drawGlow(r.x + r.w / 2, r.y + r.h / 2, chosen ? C.yellow : C.cyan, 90, 0.15);
    text(String(i + 1), r.x + 12, r.y + 24, { size: 18, color: C.yellow });
    text(PERKS[id].name, r.x + r.w / 2, r.y + 50, { size: 15, color: C.cyan, align: 'center' });
    wrapText(PERKS[id].desc, r.w - 20, 12).forEach((ln, k) => text(ln, r.x + r.w / 2, r.y + 74 + k * 16, { size: 12, align: 'center' }));
    ctx.globalAlpha = 1;
  });
  if (offer.length && d.chosen == null) {
    const left = Math.ceil(d.readyAt + PERK_AUTO_PICK - d.t);
    text(`INSTALL A PERK: 1 / 2 / 3  or  ←/→ + ENTER   (auto in ${left})`, W / 2, 446, { size: 13, color: C.yellow, align: 'center' });
  } else if (offer.length) {
    text(`INSTALLED: ${PERKS[offer[d.chosen]].name}`, W / 2, 446, { size: 14, color: C.yellow, align: 'center' });
  } else {
    const nextPick = d.nextYear % 2 === 1 || BOSS_YEARS[d.nextYear] ? d.nextYear : d.nextYear + 1;
    text(`NEXT PERK PICK: AFTER ${nextPick}`, W / 2, 360, { size: 12, color: C.dim, align: 'center' });
  }
  text('MONSTERS ARE FICTION, INCIDENTS ARE REAL', W / 2, 484, { size: 10, color: C.dim, align: 'center' });
}

function drawTitle() {
  drawPlatforms();
  drawTitleParade();
  drawGlitchText('INTERNET', W / 2, 170, 64, C.cyan);
  drawGlitchText('APOCALYPSE', W / 2, 240, 64, C.pink);
  text(`Run through ${FIRST_YEAR}–${LAST_YEAR}. Shoot down the real threats that broke the internet.`, W / 2, 285, { size: 15, align: 'center' });
  if (blink(sceneTimer, 2)) text(`ENTER — NEW STORY FROM ${FIRST_YEAR}`, W / 2, 352, { size: 20, color: C.yellow, align: 'center' });
  if (savedStory) text(`C — CONTINUE FROM ${savedStory.year}  (SCORE ${savedStory.score})`, W / 2, 376, { size: 15, color: C.cyan, align: 'center' });
  text('H — HOW TO PLAY', W / 2, 398, { size: 15, color: C.dim, align: 'center' });
  text(`M — SOUND ${muted ? 'OFF' : 'ON'}   N — MUSIC ${musicOn ? 'ON' : 'OFF'}   V — VOICE ${voiceOn ? 'ON' : 'OFF'}`, W / 2, 420, { size: 15, color: C.dim, align: 'center' });
  const fetched = TIMELINE.generatedAt ? `, FETCHED ${TIMELINE.generatedAt}` : '';
  const tlLabel = TIMELINE.real ? `TIMELINE: ${TIMELINE.real} REAL INCIDENTS (WIKIPEDIA + HACKER NEWS)${fetched}` : 'TIMELINE: BUILT-IN';
  text(tlLabel, W / 2, 488, { size: 12, color: C.dim, align: 'center' });
}

function drawHowTo() {
  drawPlatforms();
  panel(W / 2 - 360, 30, 720, 470, C.cyan);
  text('HOW TO PLAY', W / 2, 72, { size: 28, color: C.cyan, align: 'center' });
  const lines = [
    ['MOVE', 'A / D  or  ← / →'],
    ['JUMP', 'SPACE / W / ↑   (again in the air: double jump)'],
    ['DROP', 'S / ↓  through a ledge'],
    ['FIRE', 'J  straight ahead  ·  hold mouse button to aim'],
    ['DASH', 'SHIFT / K   (invulnerable while dashing)'],
    ['PERKS', '1 / 2 / 3  between years'],
    ['PAUSE', 'P / ESC'],
    ['AUDIO', 'M  all sound   N  music   V  boss voice'],
  ];
  lines.forEach(([k, v], i) => {
    text(k, W / 2 - 300, 116 + i * 27, { size: 16, color: C.yellow });
    text(v, W / 2 - 190, 116 + i * 27, { size: 16 });
  });
  text(`Each level is a year, ${FIRST_YEAR} to ${LAST_YEAR}. The world scrolls; jump the pits.`, W / 2, 344, { size: 14, align: 'center' });
  text('Every monster is a real incident: botnets, ransomware walls, phishing, breaches...', W / 2, 366, { size: 14, color: C.dim, align: 'center' });
  text('Shoot ransomware walls before they pin you. THE ALGORITHM waits in 2013, 2017, 2021, 2026.', W / 2, 388, { size: 13, color: C.pink, align: 'center' });
  text('Chain kills for a VIRAL combo. Perks every other year. C continues a lost year.', W / 2, 410, { size: 13, color: C.dim, align: 'center' });
  text('ENTER to play  ·  ESC to go back', W / 2, 464, { size: 16, color: C.yellow, align: 'center' });
}

function drawResults() {
  const r = game.result;
  ctx.fillStyle = 'rgba(3, 5, 15, 0.8)';
  ctx.fillRect(0, 0, W, H);
  const col = r.win ? C.cyan : C.pink;
  panel(W / 2 - 340, 30, 680, 470, col);
  text(r.win ? 'SYSTEM RESTORED' : `CONNECTION LOST IN ${game.year}`, W / 2, 78, { size: 34, color: col, align: 'center' });
  text(r.line, W / 2, 104, { size: 14, align: 'center' });

  const rows = [
    ['SCORE', String(r.score)],
    ['YEARS CLEARED', `${r.yearsCleared}/${LAST_YEAR - FIRST_YEAR + 1}`],
    ['INCIDENTS PATCHED', `${r.patched}/${r.incidents}`],
    ['ACCURACY', `${r.accuracy}%`],
    ['BEST COMBO', String(r.maxCombo)],
  ];
  if (r.win) rows.splice(1, 0, ['HEART BONUS', `+${r.hpBonus}`]);
  rows.forEach(([k, v], i) => {
    text(k, W / 2 - 310, 146 + i * 27, { size: 16, color: C.dim });
    text(v, W / 2 - 40, 146 + i * 27, { size: 16, align: 'right' });
  });

  // Rank letter pops in.
  const pop = clamp(sceneTimer / 0.4, 0, 1);
  const rankCol = { S: C.yellow, A: C.cyan, B: C.purple, C: C.dim, D: C.pink }[r.rank];
  text('RANK', W / 2 + 170, 140, { size: 13, color: C.dim, align: 'center' });
  drawGlow(W / 2 + 170, 192, rankCol, 60, 0.4 * pop);
  text(r.rank, W / 2 + 170, 222, { size: Math.round(84 * (2 - pop)), color: rankCol, align: 'center' });

  drawReport(r);

  if (r.canContinue) {
    if (sceneTimer > 0.8 && blink(sceneTimer, 2)) text(`C — CONTINUE ${game.year}   ·   ENTER — END STORY`, W / 2, 478, { size: 17, color: C.yellow, align: 'center' });
  } else if (sceneTimer > 0.8 && blink(sceneTimer, 2)) {
    text('R / ENTER — PLAY AGAIN', W / 2, 478, { size: 17, color: C.yellow, align: 'center' });
  }

  // Make clear which part is fiction (the monsters) and which is real (the incidents).
  const src = TIMELINE.real ? 'Wikipedia and Hacker News' : 'a built-in list';
  text(`The monsters are fiction. The incidents they're named after are real, from ${src}.`, W / 2, 522, { size: 10, color: C.dim, align: 'center' });
}

function drawReport(r) {
  const rep = r.report;
  if (!rep) return;
  ctx.fillStyle = 'rgba(255, 46, 136, 0.35)';
  ctx.fillRect(W / 2 - 310, 318, 620, 1);
  text("THE ALGORITHM'S PERFORMANCE REVIEW", W / 2 - 310, 342, { size: 13, color: C.pink });
  const lines = wrapText(`"${rep.text}"`, 620, 13).slice(0, 3);
  lines.forEach((ln, i) => text(ln, W / 2 - 310, 368 + i * 18, { size: 13 }));
  text(`TIP: ${rep.tip}`, W / 2 - 310, 378 + lines.length * 18, { size: 13, color: C.cyan });
}

function render() {
  drawBackground(clock);
  if (scene === 'title') drawTitle();
  else if (scene === 'howto') drawHowTo();
  else {
    ctx.save();
    if (game.shake > 0) ctx.translate(rand(-game.shake, game.shake), rand(-game.shake, game.shake));
    drawWorld();
    ctx.restore();
    if (game.screenFlash > 0) {
      ctx.fillStyle = `rgba(232, 246, 255, ${game.screenFlash * 2})`;
      ctx.fillRect(0, 0, W, H);
    }
    drawHUD();
    if (scene === 'play') drawOverlays();
    else if (scene === 'results') drawResults();
    // Chromatic split on big hits: overlay offset copies of the frame.
    if (game.aberr > 0) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = Math.min(0.35, game.aberr);
      ctx.drawImage(canvas, 4, 0);
      ctx.drawImage(canvas, -4, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  if (transition > 0) drawTransition();
  ctx.drawImage(crt, 0, 0);
}

// Glitchy horizontal bars that fade out after a scene change.
function drawTransition() {
  const k = transition / 0.45;
  ctx.fillStyle = `rgba(3, 5, 15, ${0.6 * k})`;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 10; i++) {
    ctx.globalAlpha = 0.6 * k;
    ctx.fillStyle = pick([C.cyan, C.pink, C.purple, C.navy]);
    ctx.fillRect(rand(-60, 0), rand(0, H), W + 60, rand(3, 28));
  }
  ctx.globalAlpha = 1;
}

// ===================== MAIN LOOP =====================
let last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 1 / 30); // rAF time can precede "last" on the first frame
  last = now;
  clock += dt;
  transition = Math.max(0, transition - dt);
  update(dt);
  render();
  pressed.clear();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
