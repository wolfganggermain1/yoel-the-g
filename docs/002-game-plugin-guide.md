# Game Plugin Guide

This guide explains how to create new games for the Yoel The G platform using the built-in Plugin Wizard. You don't need to be a programmer -- the wizard generates a prompt that an AI tool (like Claude) can turn into a working game for you.

---

## Using the Plugin Wizard

The Plugin Wizard is located at `/admin/plugin` in the admin panel. It walks you through a series of choices to build a custom AI prompt.

### Step 1: Choose a Game Type

Pick the kind of game you want to create:

- **Platformer** -- Jump between platforms, avoid obstacles
- **Puzzle** -- Solve brain teasers and logic challenges
- **Memory** -- Match cards or remember sequences
- **Runner** -- Run and dodge in an endless-style game
- **Shooter** -- Aim and shoot at targets (kid-friendly, no violence)
- **Drawing** -- Free drawing or creative art activities

### Step 2: Choose a Theme

Pick a visual world for your game:

- **Space** -- Stars, rockets, planets
- **Ocean** -- Fish, coral, waves
- **Forest** -- Trees, animals, nature
- **City** -- Buildings, cars, streets
- **Fantasy** -- Castles, dragons, magic

### Step 3: Choose Difficulty

- **Easy** -- Great for younger players (ages 3-5)
- **Medium** -- A good challenge for most players
- **Hard** -- For players who want a tough challenge

### Step 4: Select Features

Check which features your game should include:

- **Score** -- Keep track of points
- **Timer** -- Add a countdown or elapsed time
- **Levels** -- Multiple stages that get harder
- **Power-ups** -- Special items that help the player
- **Sound** -- Sound effects and music

### Step 5: Enter Game Details

- **Game Title** -- A fun name for your game (e.g., "Space Bounce")
- **Developer Name** -- Your name (e.g., "Ezekiel" or "Areli")

### Step 6: Copy the Generated Prompt

The wizard combines all your choices into a detailed prompt. Click the **Copy** button to copy it to your clipboard.

### Step 7: Paste into an AI Tool

Open [Claude](https://claude.ai), ChatGPT, or another AI tool and paste the prompt. The AI will generate a complete HTML game file based on your choices.

### Step 8: Save the HTML File

Copy the AI's output and save it as an HTML file on your computer. Name it something like `space-bounce.html`.

### Step 9: Upload via Admin

Go to **Admin > Games** and upload the HTML file. Fill in the game details (title, description, category, developer, emoji) and publish it. Your game is now live on the platform!

---

## Game Requirements

Every game uploaded to the platform must follow these rules:

### Single HTML File

The game must be a **single, self-contained HTML file**. All CSS, JavaScript, images (as data URIs or inline SVGs), and audio (as base64 data URIs) must be included in that one file. No external scripts, stylesheets, or assets.

Good:
```html
<style>
  canvas { display: block; margin: 0 auto; }
</style>
<script>
  // All game code here
</script>
```

Not allowed:
```html
<link rel="stylesheet" href="styles.css">
<script src="game.js"></script>
<img src="player.png">
```

### HTML5 Canvas

Games should use the **HTML5 Canvas API** for rendering. This gives the best performance and works consistently across browsers and devices.

```html
<canvas id="game"></canvas>
<script>
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  // Draw your game here
</script>
```

### Touch Controls for Mobile

Many players will be on phones and tablets, so games **must support touch input**. Use touch events alongside mouse/keyboard events:

```js
// Handle both mouse and touch
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

function handleInput(e) {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  // Use x, y for game input
}
```

### Responsive Canvas Sizing

The canvas should resize to fill the screen and adapt when the window size changes:

```js
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
```

### No External Dependencies

Do not use any external libraries, CDN links, or API calls. The game must work completely offline and load instantly.

### XP Reporting via postMessage

Games can report XP and game events to the platform using `window.parent.postMessage`. This is optional but recommended.

**Report XP earned** (the platform also awards 10 XP per minute automatically):

```js
// Report bonus XP to the platform
window.parent.postMessage({ type: 'xp', amount: 10 }, '*');
```

**Report game over** (with final score):

```js
// Tell the platform the game ended
window.parent.postMessage({ type: 'gameOver', score: 100 }, '*');
```

You can report XP at any point during gameplay -- for example, when the player completes a level, defeats a boss, or collects a special item.

---

## Minimal Game Template

Here is a basic template you can start from:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Game</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: #000; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // --- Game State ---
    let score = 0;

    // --- Input ---
    canvas.addEventListener('mousedown', handleInput);
    canvas.addEventListener('touchstart', handleInput, { passive: false });

    function handleInput(e) {
      e.preventDefault();
      // Handle player input here
    }

    // --- Game Loop ---
    function update() {
      // Update game logic
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw game objects here
    }

    function gameLoop() {
      update();
      draw();
      requestAnimationFrame(gameLoop);
    }

    gameLoop();
  </script>
</body>
</html>
```

---

## Testing Locally

Before uploading your game, test it in your browser:

1. Save your HTML file (e.g., `my-game.html`).
2. Double-click the file to open it in Chrome, Safari, or Firefox.
3. Check that:
   - The game loads without errors (open the browser console with F12 to check).
   - It fills the screen properly.
   - Touch/click controls work.
   - The game is fun to play!
4. If something looks wrong, go back to the AI tool and ask it to fix the issue.

Once everything works, the game is ready to upload through the admin panel.
