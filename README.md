# Aim Benchmark Tracker

A web application built with Next.js, React, and TypeScript to track, visualize, and analyze your aiming benchmark scores.

## Features

-   **Score Tracking:** Log benchmark scores including scenario, score, accuracy, difficulty, date, and optional notes.
-   **KovaaK's CSV Import:** Automatically import KovaaK's session stats from `.csv` files located in a configured directory.
-   **Data Visualization:** View progress with an interactive chart showing score and accuracy trends over time.
-   **Chart Filtering:** Filter chart data by scenario and select time periods (7 Days, 30 Days, All Time).
-   **Statistics:** Automatically calculates average score, average accuracy, best score, and total entries, filterable by scenario.
-   **List Filtering & Sorting:** Easily filter the history list by scenario and sort by any data column (score, accuracy, date, etc.).
-   **List Pagination:** View history list in chunks (e.g., 20 items) with "Show More", "Show All", and "Show Default" controls.
-   **Add, Edit, Delete & Clone:** Manage your benchmark entries with intuitive controls.
-   **Bulk Add:** Quickly add multiple scores across different scenarios using a dedicated modal.
-   **Favorites System:** Mark frequent scenarios as favorites for quick access and adding new scores.
-   **AI Coach:** Get personalized training recommendations based on your performance data (requires an AI provider API key). Data sent respects the current scenario filter.
-   **PDF Export:** Generate and download a PDF report summarizing your stats, history, and AI recommendations.
-   **Light/Dark Theme:** Toggle between light and dark mode for comfortable viewing.
-   **Local Storage:** All data is saved directly in your browser's local storage.
-   **Customization:** Input your primary game and sensitivity for context in AI analysis.

## Technologies Used

-   [Next.js](https://nextjs.org/) (App Router)
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
-   **KovaaK's Stats Import:**
    -   To import KovaaK's data, place your KovaaK's `.csv` stat files in a directory.
    -   By default, the app looks for a folder named `stats` in the root of the project directory.
    -   Alternatively, you can specify an absolute path to your KovaaK's stats directory by creating a `.env.local` file in the project root with the following content (adjust the path accordingly):
        ```
        # .env.local
        KOVAAK_STATS_DIR="C:/Path/To/Your/Kovaaks/FPSAimTrainer/stats"
        ```
        *(Remember to restart the development server after creating or modifying `.env.local`)*
    -   The importer expects standard KovaaK's `Stats.csv` files (often named like `Scenario Name - Challenge - YYYY.MM.DD-HH.MM.SS Stats.csv`).
    -   It parses the summary section at the bottom of the file, looking for lines starting with `Score:`, `Hit Count:`, and `Miss Count:` to extract the relevant data.
-   **Data Storage:** All benchmark data (manual entries and imported) is stored in your browser's `localStorage`. Clearing your browser data will remove your tracked scores.
