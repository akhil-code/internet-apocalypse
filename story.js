'use strict';
// Story-mode content: the years, the bosses, chapter titles, and the timeline loader.
// timeline.js holds the real incidents (from Wikipedia and Hacker News);
// FALLBACK_TIMELINE keeps the story playable offline or without it.

const FIRST_YEAR = 2010;
const LAST_YEAR = 2026;
const BOSS_YEARS = {
  2013: { version: 'v1.0', hp: 25, maxPhase: 1 },
  2017: { version: 'v2.0', hp: 32, maxPhase: 2 },
  2021: { version: 'v3.0', hp: 40, maxPhase: 3 },
  2026: { version: 'FINAL FORM', hp: 45, maxPhase: 3 },
};
const THREATS = ['ransomware', 'botnet', 'worm', 'phishing', 'misinfo', 'spyware', 'virus', 'breach', 'hack'];

// Fictional chapter titles; THE ALGORITHM narrates the real events between them.
const CHAPTERS = {
  2010: 'The Algorithm Wakes Up', 2011: 'Hacktivist Summer', 2012: 'Password Leakageddon',
  2013: 'Version 1.0', 2014: 'Heartbleed and Hollywood', 2015: 'The Breach Buffet',
  2016: 'Attack of the Smart Toasters', 2017: 'Version 2.0', 2018: 'Your Data, Their Product',
  2019: 'Ransom Notes', 2020: 'Everyone Works From Home', 2021: 'Version 3.0',
  2022: 'Crypto Winter', 2023: 'Supply Chain Reaction', 2024: 'The Blue Screen Summer',
  2025: 'Agents of Chaos', 2026: 'The Final Update',
};

// Well-known incidents, used when timeline.js is missing or a year comes back thin.
const FALLBACK_TIMELINE = {
  2010: [['Stuxnet', 'worm'], ['Operation Aurora', 'hack'], ['Operation Payback', 'botnet']],
  2011: [['PlayStation Network', 'breach'], ['LulzSec', 'hack'], ['DigiNotar', 'hack']],
  2012: [['LinkedIn hack', 'breach'], ['Flame', 'virus'], ['Shamoon', 'virus']],
  2013: [['CryptoLocker', 'ransomware'], ['Target breach', 'breach'], ['Yahoo breach', 'breach']],
  2014: [['Heartbleed', 'hack'], ['Sony Pictures hack', 'hack'], ['eBay breach', 'breach']],
  2015: [['OPM breach', 'breach'], ['Anthem breach', 'breach'], ['VTech breach', 'breach']],
  2016: [['Mirai botnet', 'botnet'], ['Dyn DDoS', 'botnet'], ['Locky', 'ransomware']],
  2017: [['WannaCry', 'ransomware'], ['NotPetya', 'ransomware'], ['Equifax breach', 'breach']],
  2018: [['Meltdown and Spectre', 'hack'], ['Marriott breach', 'breach'], ['VPNFilter', 'botnet']],
  2019: [['Capital One breach', 'breach'], ['Baltimore ransomware', 'ransomware'], ['WhatsApp spyware', 'spyware']],
  2020: [['SolarWinds hack', 'hack'], ['Twitter account hack', 'phishing'], ['Zoombombing', 'hack']],
  2021: [['Colonial Pipeline', 'ransomware'], ['Log4Shell', 'hack'], ['Pegasus Project', 'spyware']],
  2022: [['Lapsus$', 'hack'], ['LastPass breach', 'breach'], ['Optus breach', 'breach']],
  2023: [['MOVEit breach', 'breach'], ['23andMe breach', 'breach'], ['Deepfake scams', 'misinfo']],
  2024: [['CrowdStrike outage', 'virus'], ['XZ Utils backdoor', 'virus'], ['Change Healthcare', 'ransomware']],
  2025: [['Shai-Hulud worm', 'worm'], ['Deepfake CEO calls', 'misinfo'], ['Botnet DDoS records', 'botnet']],
  2026: [['AI phishing wave', 'phishing'], ['Data broker leak', 'breach'], ['Agent hijacking', 'hack']],
};

// timeline.js is untrusted data, so every field is checked here before the game uses it.
function loadTimeline() {
  const raw = window.INTERNET_TIMELINE && typeof window.INTERNET_TIMELINE === 'object' ? window.INTERNET_TIMELINE : null;
  const clean = s => String(s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  const years = {};
  let real = 0;
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    const list = raw && raw.years && Array.isArray(raw.years[y]) ? raw.years[y] : [];
    const items = list
      .filter(t => t && typeof t.name === 'string')
      .map(t => ({
        name: clean(t.name).slice(0, 24),
        blurb: typeof t.blurb === 'string' ? clean(t.blurb).slice(0, 160) : '',
        threat: THREATS.includes(t.threat) ? t.threat : 'hack',
        source: typeof t.source === 'string' ? clean(t.source).slice(0, 60) : null,
        sourceUrl: typeof t.sourceUrl === 'string' && t.sourceUrl.startsWith('https://') ? t.sourceUrl : null,
        real: true,
      }))
      .filter(t => t.name)
      .slice(0, 8);
    real += items.length;
    if (items.length < 3) {
      for (const [name, threat] of FALLBACK_TIMELINE[y]) {
        if (items.length >= 3) break;
        items.push({ name, blurb: '', threat, source: 'built-in', sourceUrl: null, real: false });
      }
    }
    years[y] = items;
  }
  const generatedAt = raw && typeof raw.generatedAt === 'string' ? raw.generatedAt.slice(0, 10) : null;
  return { years, real, generatedAt };
}
const TIMELINE = loadTimeline();
