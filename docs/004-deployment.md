# Deployment Guide

This guide explains how to deploy Yoel The G using Docker, Docker Compose, and Coolify.

---

## Prerequisites

- **Docker** installed on your server (version 20+ recommended)
- **Coolify** installed on your VPS (if using Coolify for deployment)
- A server with at least 512 MB of RAM (1 GB recommended)

---

## Environment Variables

| Variable         | Required | Description                     | Example          |
| ---------------- | -------- | ------------------------------- | ---------------- |
| `ADMIN_PASSWORD` | Yes      | Password for the admin panel    | `my-secret-pass` |

Set this variable in your `.env.local` file for local development, or in your deployment platform's environment settings for production.

---

## Docker Build

### Build and Run Manually

Build the Docker image:

```bash
docker build -t yoel-the-g .
```

Run the container:

```bash
docker run -p 3000:3000 \
  -v ./data:/app/data \
  -e ADMIN_PASSWORD=your-secret \
  yoel-the-g
```

This starts the platform on port 3000. Open `http://localhost:3000` in your browser to see it.

**Flags explained:**
- `-p 3000:3000` -- Maps port 3000 on your machine to port 3000 in the container.
- `-v ./data:/app/data` -- Mounts a local `data` directory so the SQLite database persists across container restarts.
- `-e ADMIN_PASSWORD=your-secret` -- Sets the admin password.

---

## Docker Compose

For a simpler setup, use Docker Compose. The project includes a `docker-compose.yml` file.

### Start the Platform

```bash
docker-compose up -d
```

This builds the image (if needed) and starts the container in the background.

### Stop the Platform

```bash
docker-compose down
```

### View Logs

```bash
docker-compose logs -f
```

### Rebuild After Code Changes

```bash
docker-compose up -d --build
```

Make sure the `docker-compose.yml` file includes the `ADMIN_PASSWORD` environment variable and the volume mount for `/app/data`.

---

## Coolify Setup

Coolify is a self-hosted platform that makes deployment easy. Here is how to set up Yoel The G on Coolify:

### Step 1: Add a New Project

In the Coolify dashboard, click **New Project** and give it a name (e.g., "Yoel The G").

### Step 2: Connect Your Source

Choose how to get the code into Coolify:

- **Git Repository** -- Connect your GitHub, GitLab, or other Git provider and select the repository.
- **Upload Source** -- Upload the project files directly.

### Step 3: Set the Build Pack

Set the build pack to **Docker**. Coolify will use the `Dockerfile` in the project root to build the application.

### Step 4: Add Environment Variables

In the project settings, add the following environment variable:

- **Key**: `ADMIN_PASSWORD`
- **Value**: Your chosen admin password

### Step 5: Set the Port

Configure the exposed port to **3000**. This is the port the Next.js server listens on inside the container.

### Step 6: Add a Persistent Volume

This is important! The SQLite database needs to survive container restarts and redeployments.

Add a persistent volume:
- **Source**: A path on your server (Coolify will suggest one)
- **Destination**: `/app/data`

This maps the container's data directory to a permanent location on your server.

### Step 7: Deploy

Click **Deploy**. Coolify will:
1. Pull the code from your Git repository (or use the uploaded source).
2. Build the Docker image using the Dockerfile.
3. Start the container with your environment variables and volumes.
4. Make the platform available at your configured domain.

---

## Data Persistence

The SQLite database is stored at `/app/data/yoel-the-g.db` inside the container. To keep your data safe:

- **Always** mount a volume at `/app/data` so the database file lives on the host machine.
- If you forget the volume mount, the database will be lost when the container is restarted or redeployed.
- To back up the database, simply copy the `yoel-the-g.db` file from the mounted volume directory.

### What is stored in the database

- All game metadata (titles, descriptions, categories, file paths)
- All developer records
- All player profiles (nicknames, XP, levels)
- All play session history

The actual game HTML files live in `public/games/` and are baked into the Docker image. If you add new games via the admin panel after deployment, they are written to the container's filesystem and will persist as long as the volume is mounted.

---

## Updating the Platform

### With Coolify (Git-connected)

1. Push new code to your Git repository.
2. Coolify detects the change and automatically rebuilds and redeploys.
3. The database is preserved because it lives on the persistent volume.

### With Docker (Manual)

1. Pull the latest code.
2. Rebuild the image: `docker build -t yoel-the-g .`
3. Stop the old container: `docker stop <container-id>`
4. Start a new container with the same volume mount.

### With Docker Compose

```bash
git pull
docker-compose up -d --build
```

---

## Offline / PWA Support

Yoel The G is a Progressive Web App (PWA). This means:

- Players can "install" it on their phone's home screen like a real app.
- The service worker caches pages and game files for offline play.
- Once a game has been loaded at least once, it can be played without an internet connection.

The PWA is configured through `public/manifest.json` and the Next.js PWA plugin. No extra setup is needed for deployment -- it works automatically.

---

## Troubleshooting

### The site shows an error on first load

The database is created automatically on first request. If you see an error, check that:
- The `/app/data` directory is writable inside the container.
- The volume mount is configured correctly.

### Admin login does not work

Make sure the `ADMIN_PASSWORD` environment variable is set. Check with:

```bash
docker exec <container-id> printenv ADMIN_PASSWORD
```

### Games are missing after redeployment

Games uploaded via the admin panel are stored in the container's filesystem. If you did not mount a volume for game files, they will be lost on redeployment. The database keeps the records, but the HTML files need to be re-uploaded. Consider keeping game files in your Git repository under `public/games/`.

### Port conflict

If port 3000 is already in use, map to a different port:

```bash
docker run -p 8080:3000 -v ./data:/app/data -e ADMIN_PASSWORD=your-secret yoel-the-g
```

Then access the platform at `http://localhost:8080`.
