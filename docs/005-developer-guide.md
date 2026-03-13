# Developer Guide

Welcome! This guide is for anyone who wants to create and publish games on the Yoel The G platform. You do not need to know how to code -- the platform has a built-in wizard that helps you create games using AI.

---

## Who Can Publish Games

The platform is a family project. These people can publish games:

- **Ezekiel** -- Co-creator and game developer
- **Areli** -- Co-creator and game developer
- **Yoel-approved developers** -- Anyone Yoel adds and approves in the admin panel

If you want to publish games, ask Yoel to add you as a developer.

---

## Getting Access

Here is how to become a developer on the platform:

### Step 1: Ask Yoel

Talk to Yoel and let him know you want to make games for the platform. Tell him what name you want to go by and pick a fun emoji to represent you.

### Step 2: Yoel Adds You

Yoel goes to **Admin > Developers** and adds your name and emoji. For example:
- Name: "Cousin Maya"
- Emoji: a butterfly or star or whatever you like

### Step 3: Yoel Approves Your Account

New developers start as "Pending." Yoel clicks the **Approve** button next to your name, and you are now an official Yoel The G developer!

Once approved, your name appears in the developer dropdown when uploading games.

---

## Creating a Game

You do not need to write code by hand. The platform has a **Game Plugin Wizard** that builds an AI prompt for you.

### Step 1: Open the Plugin Wizard

Go to **Admin > Plugin** in the admin panel (ask Yoel if you need access).

### Step 2: Follow the Prompts

The wizard asks you a series of fun questions:

- **What kind of game?** Pick from Platformer, Puzzle, Memory, Runner, Shooter, or Drawing.
- **What world?** Pick from Space, Ocean, Forest, City, or Fantasy.
- **How hard?** Easy, Medium, or Hard.
- **What features?** Check the boxes for Score, Timer, Levels, Power-ups, and/or Sound.
- **What is the game called?** Give it a cool name.
- **Who made it?** Enter your developer name.

### Step 3: Copy the Generated Prompt

The wizard creates a detailed prompt based on your choices. Click the **Copy** button to copy it.

### Step 4: Paste into an AI Tool

Open [Claude](https://claude.ai) (or another AI tool like ChatGPT) and paste the prompt. The AI will write a complete game as an HTML file.

### Step 5: Save the HTML File

Copy everything the AI gives you and save it as a `.html` file on your computer. Name it something that matches your game (e.g., `space-bounce.html`).

### Step 6: Test in Your Browser

Double-click the HTML file to open it in Chrome, Safari, or Firefox. Play it and make sure:
- It loads without a blank screen.
- You can interact with it (clicking or tapping works).
- It looks good and fills the screen.
- It is fun!

If something is not right, go back to the AI and tell it what to fix. You can say things like "the player moves too fast" or "add a start screen" and the AI will update the game.

### Step 7: Upload the Game

Ask Yoel to upload your game through **Admin > Games**. He will:
1. Enter the game title, description, and category.
2. Select your name as the developer.
3. Pick an emoji for the game thumbnail.
4. Upload your HTML file.
5. Publish the game so everyone can play it.

And that is it -- your game is live!

---

## Game Rules

All games on Yoel The G must follow these rules:

### Age-Appropriate Content (Ages 3+)

Games must be safe and fun for young kids. This means:
- No scary monsters, horror themes, or jump scares.
- No violence, blood, or weapons that look realistic.
- No mean language or bullying.
- Keep it positive and encouraging!

### Mobile-Friendly

Many players use phones and tablets. Your game must:
- Work with touch controls (tapping and swiping).
- Resize properly on different screen sizes.
- Not require a keyboard to play.

### Single HTML File

The game must be one self-contained HTML file. This means all the code, styles, and images are inside that single file. No separate files, no links to other websites, no loading things from the internet.

### No External Dependencies

The game cannot load scripts, images, or anything else from the internet. Everything must be included in the HTML file. This ensures games work offline and load instantly.

### Fun and Colorful

Games should be bright, colorful, and engaging. Use happy colors, fun sounds, and encouraging messages. Remember, the youngest players are 3 years old, so keep things simple and delightful.

---

## Game Categories

When uploading a game, it gets placed in one of these categories:

| Category      | What It Means                                       |
| ------------- | --------------------------------------------------- |
| **Arcade**    | Fast-paced action games (runners, shooters, etc.)   |
| **Puzzle**    | Brain teasers, matching, logic games                |
| **Adventure** | Exploration, story-driven, platformers              |
| **Creative**  | Drawing, building, open-ended creativity            |

Pick the category that best fits your game. If you are not sure, Yoel can help you decide.

---

## Tips for Great Games

- **Start simple.** A fun game with one mechanic is better than a complex game that is confusing.
- **Add a start screen.** Show the game name, a "Play" button, and brief instructions.
- **Show the score.** Players like seeing their points go up.
- **Give feedback.** Play a sound or flash colors when the player does something good.
- **Make it replayable.** Games that are quick and fun to replay keep players coming back.
- **Test on a phone.** Open the HTML file on a phone to make sure touch controls work.

---

## Need Help?

- **Game is not working?** Ask the AI to fix it. Describe the problem clearly (e.g., "the canvas is blank" or "touch controls do not respond").
- **Want to add a feature?** Ask the AI to add it (e.g., "add a high score display" or "make the background scroll").
- **Not sure what to make?** Use the Plugin Wizard for inspiration -- try different combinations of game types and themes!
- **Something else?** Ask Yoel. He is happy to help.
