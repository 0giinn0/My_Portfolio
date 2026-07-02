# Omer Bin Asif — Portfolio

Oh hey, you found the README. Look at you, reading documentation like a responsible adult. I'm just a portfolio site, but sure, let's pretend this matters.

**Repo:** https://github.com/0giinn0/My_Portfolio  
**Live site:** https://0giinn0.github.io/My_Portfolio

This is a bunch of HTML files held together by CSS, JavaScript, and sheer willpower. Dark theme. Monospace fonts. Very terminal. Very "I use Arch btw" energy. No frameworks were harmed in the making of this portfolio — mostly because there were none.

---

## The Pages (a.k.a. "Why Does This Exist")

| File | What It Does | Why You'd Care |
|------|-------------|----------------|
| `index.html` | Landing page with hero, about me, and projects | First impressions matter. Unless you're me. |
| `projects.html` | Filterable grid of all my work | Hover the cards. Trust me. Or don't. I'm not your mom. |
| `journey.html` | 3D globe + chapter cards | Spin the globe. Click countries. Feel cultured. |
| `skills.html` | My skills and tools | Yes, I know things. No, I won't fix your printer. |
| `resume.html` | My CV | The fancy version of "please hire me" |
| `contact.html` | Contact form | Slide into my inbox. Politely. |
| `minimal_loading_screen_v5.html` | Loading screen | Because every portfolio needs a dramatic intro |

---

## The Projects (a.k.a. "Stuff I Made")

### Portfolio Projects

| Project | File | One-Liner |
|---------|------|-----------|
| **Project Artemis** | `project-artemis.html` | A mobile app that actually works. Has a chat, charts, and settings. I'm as surprised as you are. |
| **Flux** | `project-flux.html` | Login system that remembers you. Big Brother vibes, but make it fashionable. |
| **Atlas Prediction** | `project-atlas.html` | Teaches computers to guess what you're thinking. Creepy? Maybe. Cool? Definitely. |
| **Cipher** | `project-cipher.html` | 4 levels of "good luck hacking this." Spoiler: you can't. I tested it. |
| **Echo Gallery** | `project-echo.html` | Drawing people who don't exist. It's called art, look it up. |
| **Hydra AI** | `project-hydra.html` | An AI that doesn't want to take over the world. Yet. Ask it anything (except about nuclear codes). |
| **Pulse Tracker** | `project-pulse.html` | Habit tracker mobile app. Will judge you silently for skipping leg day. |
| **X-Ray Reveal** | `project-xray.html` | Hover to peel back layers. Trail mask and CSS radial reveal — two ways to see what's beneath. |
| **NNIИ Cards** | `project-cards.html` | Custom playing card deck with original occult-eye artwork. You can play with them too. |
| **Arcade** | `project-games.html` | 8 games, golden spiral navigation, Urdu Wordle. Because portfolios should have a fun side. |
| **3D Models** | `project-mars.html` | 10 interactive 3D models in the browser. Rotate, zoom, spin. Three.js powered. |

### GitHub Projects

| Project | Link | One-Liner |
|---------|------|-----------|
| **OmriCode** | [github.com/0giinn0/OmriCode](https://github.com/0giinn0/OmriCode) | Fully local, unrestricted AI IDE — Electron desktop app with code editor, terminal, 3D viewer, AI chat, 12 personality profiles, and 9+ LLM providers. |
| **Aud.io** | [github.com/0giinn0/Aud.io](https://github.com/0giinn0/Aud.io) | Flutter music player with golden spiral navigation, bento box UI, 7 themes. Node.js server with yt-dlp. |
| **PhreeDee** | [github.com/0giinn0/Pfree_Dee](https://github.com/0giinn0/Pfree_Dee) | Local AI-powered 3D mesh generation — converts images into 3D models using Hunyuan3D on your GPU. |
| **AR Deko** | [github.com/0giinn0/Placement_AR](https://github.com/0giinn0/Placement_AR) | AR room redecorator — place furniture in your real space before buying. React + Three.js + WebXR. |
| **Rou Tein** | [github.com/0giinn0/Rou_Tein](https://github.com/0giinn0/Rou_Tein) | Habit tracking application — build consistency, track streaks, and stay on top of your goals. In development. |

---

## Experimental Stuff (a.k.a. "I Was Bored")

| File | What It Is | Should You Open It? |
|------|-----------|-------------------|
| `xray_trail_mask.html` | Trail mask reveal effect | Yes. Move your mouse around. You'll get it. |
| `xray_hover_effect.html` | Hover reveal effect | Also yes. Same vibe, different flavor. |

---

## Assets (a.k.a. "The Junk Drawer")

| Folder | Contains | vibe |
|--------|----------|------|
| `3D Models/` | GLB files | Very three-dimensional. |
| `Drawings/` | 80+ PNGs + 20 GIFs | Pencil go brrr |
| `Cards/` | Playing card images | Occult vibes, 52 cards, one tuck box |
| `XRAY CSS image/` | Dark/light mode overlays | For the project card x-ray thing. You saw it. You liked it. |

---

## Design System (a.k.a. "The Aesthetic")

Everything looks like a terminal because I have commitment issues and chose dark mode before it was cool. Actually, dark mode has ALWAYS been cool. Light mode people are just built different. And by different, I mean wrong.

```
Background:     #0a0a0a   (void energy)
Surfaces:       #111111   (slightly less void)
                #1a1a1a   (void with a hint of surface)
                #242424   (okay this is getting specific)
Text:           #d0d0d0   (readable, believe it or not)
                #999999   (secondary, for when you whisper)
                #666666   (muted, for the things I don't want you to see)
Borders:        #222222   (subtle, like my emotional walls)
Font:           SF Mono / Fira Code / Cascadia Code
                (monospace, because I'm not a monster)
Nav:            Fixed, backdrop-blur, rgba(10,10,10,0.85)
                (it follows you. like my past.)
```

Each project page keeps its own accent color because even I need to express myself sometimes. Amber, green, blue, purple, coral — it's like a bag of Skittles, but make it ✨aesthetic✨.

---

## Tech Stack (a.k.a. "How This Magic Works")

- **HTML5** — No frameworks. Just me, my keyboard, and 47 `<div>`s per page.
- **CSS3** — Custom properties, grid, flexbox, backdrop-filter, CSS masks. The holy trinity plus extras.
- **Vanilla JavaScript** — ES5-compatible because I like my code like I like my coffee: compatible with everything.
- **[globe.gl](https://github.com/vasturiano/globe.gl)** — 3D globe that does the spinny thing. Countries light up. Arcs fly. It's dramatic.
- **[topojson-client](https://github.com/topojson/topojson-client)** — Parses world data. Makes the globe know where France is. (It's in Europe, apparently.)
- **Canvas 2D API** — For the X-ray stuff. Radial gradients, mask compositing, procedural textures. Very sci-fi. Very "I watched a YouTube tutorial."
- **[Three.js](https://threejs.org)** (CDN) — Powers the 3D model viewer. GLB files, OrbitControls, lights, the works. No textures though. We don't talk about textures.
- **Flutter** — Pulse Tracker source lives in `pulse_app/`. Yes, there's a full mobile app in here. No, I don't know how it got here either.

---

## Running This Thing Locally (a.k.a. "Just Do It")

No build step. No npm install. No "wait, why is node_modules 2GB." Just open a file:

```bash
# The lazy way (double-click index.html, you animal)

# The slightly less lazy way
python -m http.server 8000

# If you're fancy
npx serve .

# If you're PHP-fancy
php -S localhost:8000
```

Then open `http://localhost:8000` and pretend you're reviewing code for a living.

---

## Browser Support (a.kaka. "Will It Work?")

Tested on Chrome, Firefox, Safari, and Edge. If it breaks on Internet Explorer, that's not my problem — that's a *you* problem.

Things this uses:
- CSS `backdrop-filter` — makes the nav blurry. Like my vision after 3 AM coding sessions.
- CSS `mask-image` — for the X-ray reveal. Very dramatic. Very cinematic.
- `requestAnimationFrame` — smooth animations. Because 15fps is for quitters.
- Canvas 2D `createRadialGradient` — circles that fade. Like my hopes and dreams.
- ES6 features — arrow functions, const/let, template literals. If your browser doesn't support these, upgrade it. It's 2026.

---

## Folder Structure (a.kaka. "The Map")

```
├── index.html                  # The front door
├── projects.html               # The trophy room
├── journey.html                # The globe room (yes, that's a room now)
├── skills.html                 # The "I know stuff" room
├── resume.html                 # The "please hire me" room
├── contact.html                # The "talk to me" room
├── project-artemis.html        # Individual project rooms
├── project-atlas.html          # (there are a bunch of them)
├── project-cipher.html         # (I'm not listing all of them)
├── project-echo.html           # (you get the idea)
├── project-flux.html
├── project-hydra.html
├── project-pulse.html
├── project-xray.html
├── project-cards.html
├── project-games.html
├── project-mars.html           # 3D model viewer (Three.js)
├── 3D Models/                  # GLBs. Very spiky.
├── Drawings/                   # 80+ PNGs + 20 GIFs. Very inky.
├── Cards/                      # Playing card images. Very shuffly.
├── XRAY CSS image/             # The x-ray overlays
└── README.md                   # This file. You're reading it. Hi.
```

---

## Author

**Omer Bin Asif** — AI & Design student at IUBH, Bonn, Germany

Making things that look cool and occasionally work. Sometimes both at the same time. It's a process.

- Portfolio: [index.html](index.html) — go on, click it
- Contact: [contact.html](contact.html) — I dare you

---

*If you've read this far, you either really like READMEs or you have way too much free time. Either way, I respect it.* 🫡
