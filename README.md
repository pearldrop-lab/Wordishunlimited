# Wordish Unlimited — Clean Build

A simple, stable Wordle-style game you can play **as many times as you like**. Drop these files into a GitHub repo and enable **GitHub Pages**.

## Features
- Unlimited games
- Shows the **answer** in the Stats popup when you lose
- Loads **`words.txt`** with cache-busting so updates always take effect
- Stats (played, wins, streak, best), share emoji grid
- Dark/light theme toggle
- Settings: hard mode, guesses 3–10, allow-any-guess

## Deploy on GitHub Pages
1. Create a new repo (e.g., `wordish-unlimited`).
2. Upload these files to the repo root:
   - `index.html`
   - `style.css`
   - `script.js`
   - `words.txt`
   - `README.md`
3. In GitHub: **Settings → Pages** → set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, then **Save**.

## Using a bigger word list
Replace `words.txt` with your own (one lowercase five-letter word per line). The game will show a toast like **“Loaded 12972 words”** if it picks up your file. If it doesn't, do a hard refresh or append `?v=1` to your game URL to force a fresh load.

## Licence
MIT. Not affiliated with or endorsed by The New York Times.
