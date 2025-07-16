# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the required environment variables in [.env.local](.env.local):
   - `API_KEY` - Your Gemini API key
   - `GOOGLE_GEMINI_BASE_URL` - Your Gemini API base URL
   - `GEMINI_MODEL` (optional) - Model to use (defaults to 'gemini-2.5-flash')
3. Run the app:
   `npm run dev`

## Environment Variables

- **API_KEY**: Required. Your Gemini API key for accessing the AI service.
- **GOOGLE_GEMINI_BASE_URL**: Required. The base URL for the Gemini API.
- **GEMINI_MODEL**: Optional. Specifies which Gemini model to use (default: 'gemini-2.5-flash').

Example `.env.local`:
```
API_KEY=your_gemini_api_key_here
GOOGLE_GEMINI_BASE_URL=https://your-gemini-endpoint.com
GEMINI_MODEL=gemini-2.5-flash
```

## Features

- **Streaming Responses**: The app uses streaming for real-time AI responses during story progression, NPC dialogue, and battle interactions for improved user experience.
- **Environment Configuration**: Easily switch between different Gemini models using environment variables.
