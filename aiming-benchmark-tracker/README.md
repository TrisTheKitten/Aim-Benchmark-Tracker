# Aim Benchmark Tracker

A web application built with Next.js, React, and TypeScript to track, visualize, and analyze your aiming benchmark scores.

## Features

-   **Score Tracking:** Log benchmark scores including scenario, score, accuracy, difficulty, date, and optional notes.
-   **Data Visualization:** View progress with an interactive chart showing score and accuracy trends over time.
-   **Statistics:** Automatically calculates average score, average accuracy, best score, and total entries, filterable by scenario.
-   **Filtering & Sorting:** Easily filter results by scenario and sort by any data column (score, accuracy, date, etc.).
-   **Add, Edit, Delete & Clone:** Manage your benchmark entries with intuitive controls.
-   **Bulk Add:** Quickly add multiple scores across different scenarios using a dedicated modal.
-   **Favorites System:** Mark frequent scenarios as favorites for quick access and adding new scores.
-   **AI Coach:** Get personalized training recommendations based on your performance data (requires an AI provider API key).
-   **PDF Export:** Generate and download a PDF report summarizing your stats, history, and AI recommendations.
-   **Light/Dark Theme:** Toggle between light and dark mode for comfortable viewing.
-   **Local Storage:** All data is saved directly in your browser's local storage.
-   **Customization:** Input your primary game and sensitivity for context in AI analysis.

## Technologies Used

-   [Next.js](https://nextjs.org/)
-   [React](https://react.dev/)
-   [TypeScript](https://www.typescriptlang.org/)
-   [Tailwind CSS](https://tailwindcss.com/)
-   [Recharts](https://recharts.org/)
-   [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)
-   [Lucide React](https://lucide.dev/)
-   [react-markdown](https://github.com/remarkjs/react-markdown)

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the main page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Configuration

-   **AI API Key:** The AI Coach feature requires an API key from a supported AI provider. Enter this key in the "AI Coach" section of the application. The key is stored locally in your browser's session storage and is not sent anywhere other than the AI provider.
-   **Data Storage:** All benchmark data is stored in your browser's `localStorage`. Clearing your browser data will remove your tracked scores.

## Learn More (Next.js)

To learn more about Next.js, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
