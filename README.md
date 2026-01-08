# SVG Design Frontend
Frontend React application for SVG design management.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
npm run preview
```

## Environment Variables

Create a `.env` file if you need to change the API URL:

```
VITE_API_URL=http://localhost:3001/api
```

## Deployment

This repo includes a GitHub Actions workflow that builds the site and deploys the `dist/` folder to **GitHub Pages** on pushes to the `main` branch.

- Build happens with `npm run build`
- After pushing to `main`, check the repository's **Actions** tab and **Pages** settings to see the published site URL.
