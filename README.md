# Productivity

AI-powered task manager with Brain Dump → Task conversion.

## How to see the front end

1. Open a terminal in this project folder:
   ```bash
   cd /workspace/Productivity
   ```
2. Start the app:
   ```bash
   npm start
   ```
3. Open the frontend in your browser:
   - Local: [http://localhost:3000](http://localhost:3000)

The server serves `public/index.html` at `/`, so opening `http://localhost:3000` loads the UI.

## Optional: enable AI conversion

The app works without an API key for manual task creation.
To use Brain Dump → AI task extraction, start with:

```bash
OPENAI_API_KEY=your_key_here npm start
```

## Optional: get a public internet link

If you want to share your local frontend outside your machine, run one of these tunnel tools in a second terminal **after** starting the app:

```bash
cloudflared tunnel --url http://localhost:3000
```

or

```bash
ngrok http 3000
```

Use the generated HTTPS URL to open your frontend like a public website.
