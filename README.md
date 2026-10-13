# Internet Apocalypse

**Play it now: <https://internetapocalypse.url2.at/>**

A retro arcade side-scroller where you run through internet history, one year per level from 2010 to 2026, shooting down monsters named after real incidents that broke the internet: botnets, ransomware, data breaches, phishing waves and more.

Along the way, THE ALGORITHM, a sarcastic AI villain, sizes up how you play, taunts you between years, and fights you in person four times as it "updates" itself.

It's plain HTML5 canvas and JavaScript: no engine, no build step, no dependencies. All graphics and sound are generated in code.

The game was created as part of the [Claude for Games](https://luma.com/claudeforgames) event held in San Francisco on 12 October 2026.

## Play locally

Serve the folder with any static file server, for example:

```bash
python3 -m http.server 8123
```

Then open <http://localhost:8123>.

## Controls

| Action | Keys |
|---|---|
| Move | A / D or ← / → |
| Jump | Space / W / ↑ (press again in the air to double jump) |
| Drop through a ledge | S / ↓ |
| Fire | J fires straight ahead; hold the mouse button to aim |
| Dash | Shift / K (you're invulnerable while dashing) |
| Pick a perk | 1 / 2 / 3, or ← / → and Enter |
| Pause | P / Esc |
| Sound | M all sound, N music, V boss voice |
| Auto fire | F (on by default) |
| Skip level | [ / ] or Page Up / Page Down, or the ◀ PREV / NEXT ▶ buttons |

## How it works

- **Each level is a year.** The world scrolls; jump the pits and patch that year's incidents before you reach the year gate.
- **Every monster is a real incident.** The monster's type matches the threat:

  | Threat | Monster |
  |---|---|
  | Botnet | Flying drones that shoot back |
  | Ransomware | Walls that push you back; shoot them before they pin you |
  | Phishing, hacker | Ground chasers |
  | Worm | Ground crawlers with a damaging tail that split into chasers when destroyed |
  | Virus, malware | Spinners that charge at you |
  | Data breach, spyware | Shielded turrets on ledges |
  | Misinformation | Pop-up windows that block your shots |

- **Perks.** Between years (every other year, and before each boss) THE ALGORITHM offers three perks, such as an extra heart, faster fire, a quicker dash or bigger shots.
- **Weapon drops.** Enemies sometimes drop a Share Blast (spread shot), Firewall Beam (piercing), Retargeting Ads (homing), an Ad-Blocker shield or a Ctrl+Alt+Del screen-clearing bomb.
- **Combos.** Chain kills within 2 seconds to "go viral" for up to ×5 points.
- **Boss fights.** THE ALGORITHM shows up in 2013 (v1.0), 2017 (v2.0), 2021 (v3.0) and 2026 (Final Form). Each version has more health and more phases, ending with a Blue Screen phase.
- **Progress is saved.** Every cleared year is saved in your browser, so you can continue from the title screen with C. If you lose, press C on the results screen to retry that year.
- **Rank.** At the end you get a rank from S to D based on accuracy, years cleared, incidents patched, combos and continues used.

## Project files

| File | What it is |
|---|---|
| `index.html` | The page, canvas and level-skip controls |
| `game.js` | The whole game: engine, enemies, bosses, director, audio and rendering |
| `story.js` | Years, boss versions, chapter titles and a built-in fallback list of incidents |
| `timeline.js` | The real incidents for each year, with source links |

For a start-point menu that jumps to any year or boss phase, open the game with `?dev` at the end of the URL.

## Hosting

The game is a static site, so any static host works, such as GitHub Pages, Netlify, Cloudflare Pages or Vercel. Serve the repository root as-is: there's no build command, and the output directory is the root.

## Credits

The incidents and their years are real, collected from Wikipedia's lists of security incidents and from Hacker News. The monsters that represent them, and THE ALGORITHM, are fiction.
