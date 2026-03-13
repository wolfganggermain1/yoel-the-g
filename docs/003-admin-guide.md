# Admin Guide

This guide covers how to use the admin panel to manage the Yoel The G platform. Only Yoel (or someone with the admin password) can access these features.

---

## Accessing Admin

1. Open the platform in your browser.
2. Navigate to `/admin` (e.g., `https://your-site.com/admin`).
3. Enter the admin password when prompted.
4. You will see the admin panel with a sidebar (on desktop) or top navigation (on mobile).

If you enter the wrong password, you will see an error message. Try again or check your `.env.local` file for the correct password.

To log out, click the **Logout** button in the admin header bar.

---

## Dashboard

The admin dashboard (`/admin`) shows an overview of platform stats:

- **Total Games** -- How many games are on the platform (published and unpublished).
- **Total Developers** -- How many developers are registered.
- **Total Play Sessions** -- How many times games have been played across all players.

This gives you a quick snapshot of how the platform is doing.

---

## Managing Games

Go to **Admin > Games** to manage the game library.

### Uploading a New Game

1. Click **Add Game** or find the upload form.
2. Fill in the game details:
   - **Title** -- The name of the game (e.g., "Ocean Explorer").
   - **Description** -- A short sentence about what the game is (e.g., "Swim through the ocean and collect treasure!").
   - **Category** -- Choose from: Arcade, Puzzle, Adventure, or Creative.
   - **Developer** -- Select the developer who made the game (must be an approved developer).
   - **Emoji** -- Pick an emoji to use as the game's thumbnail (e.g., "🐙").
   - **HTML File** -- Upload the game's HTML file.
3. Click **Save** or **Upload**.
4. The game will appear in the games list.

The uploaded HTML file is placed in `public/games/[slug]/index.html`, where the slug is automatically generated from the game title.

### Publishing and Unpublishing

- **Publish**: Makes the game visible on the home page. Players can find and play it.
- **Unpublish**: Hides the game from the home page. It still exists in the system but players cannot see or play it.

Toggle the publish status by clicking the publish/unpublish button next to the game.

### Deleting a Game

Click the **Delete** button next to a game to remove it permanently. This deletes the game record from the database and removes the HTML file from the server.

Be careful -- this action cannot be undone!

---

## Managing Developers

Go to **Admin > Developers** to manage who can publish games.

### Pre-Approved Developers

Ezekiel and Areli are pre-approved as developers when the platform is first set up. They are ready to have games published under their names.

### Adding a New Developer

1. Find the "Add Developer" form.
2. Enter the developer's **name** (e.g., "Cousin Maya").
3. Enter an **emoji** to use as their avatar (e.g., "🦋").
4. Click **Add**.
5. The developer appears in the list with a "Pending" status.

### Approving a Developer

New developers start as "Pending" and cannot have games published under their name until approved.

1. Find the developer in the list.
2. Click the **Approve** button.
3. The developer is now approved and can be selected when uploading games.

### Removing a Developer

Click the **Remove** button next to a developer to delete them. If they have games published, you should reassign or delete those games first.

---

## Game Plugin Wizard

The Plugin Wizard at **Admin > Plugin** helps generate AI prompts for creating new games. See [002-game-plugin-guide.md](./002-game-plugin-guide.md) for a full walkthrough.

---

## Admin Password

The admin password is controlled by the `ADMIN_PASSWORD` environment variable.

### Setting the Password Locally

Create or edit the `.env.local` file in the project root:

```
ADMIN_PASSWORD=your-secret-password
```

Restart the development server after changing this value.

### Setting the Password in Production

If deploying with Coolify or Docker, set the `ADMIN_PASSWORD` environment variable in your deployment configuration. See [004-deployment.md](./004-deployment.md) for details.

### Password Tips

- Use a password that is easy for Yoel to remember but hard for others to guess.
- Do not share the password with players -- it is only for platform administration.
- If you forget the password, check the environment variable in your deployment settings or `.env.local` file.
