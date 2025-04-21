import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// Define the BenchmarkScore type based on page.tsx
type BenchmarkScore = {
  id: number | string; // Allow string ID for imported data
  scenario: string;
  score: number;
  accuracy: number;
  date: string; // YYYY-MM-DD
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  notes?: string;
};

// Use GET without the request parameter as it's not used
export async function GET() {
  // Read from env or fallback to ./stats in the project root
  const statsDir = process.env.KOVAAK_STATS_DIR || path.join(process.cwd(), 'stats');
  console.log(`Attempting to read stats from: ${statsDir}`);

  const allEntries: BenchmarkScore[] = []; // Array to hold one entry per valid file

  try {
    // Check if the determined stats directory exists
    try {
      await fs.access(statsDir);
    } catch {
      console.error(`Stats directory not found: ${statsDir}`);
      // Provide a more specific error message if the directory doesn't exist
      return NextResponse.json({ error: `Stats directory not found at the specified path: ${statsDir}. Please ensure the path is correct in your .env.local file or create the default 'stats' directory.` }, { status: 404 });
    }

    const files = await fs.readdir(statsDir);
    console.log(`Found files in ${statsDir}: ${files.join(', ')}`);

    for (const file of files) {
      const fullPath = path.join(statsDir, file);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) continue; // Skip directories

      // Filter for KovaaK's challenge result CSVs (adjust pattern if needed)
      if (!file.endsWith('.csv') || !file.includes(' - Challenge - ')) {
          console.log(`Skipping file (not a challenge CSV): ${file}`);
          continue;
      }

      // Basic parsing logic from the provided snippet
      // Example filename: "Cata IC Long Strafes - Challenge - 2023.11.15-18.28.41 - Report.csv"
      const scenarioMatch = file.match(/^(.*?) - Challenge - /);
      if (!scenarioMatch || !scenarioMatch[1]) {
          console.log(`Skipping file (could not extract scenario): ${file}`);
          continue;
      }
      const scenarioName = scenarioMatch[1].trim();

      // Attempt to extract date - this might need refinement based on exact filename formats
      const dateMatch = file.match(/(\d{4}\.\d{2}\.\d{2})/);
      // Format as YYYY-MM-DD or use a placeholder if not found
      const date = dateMatch ? dateMatch[1].replace(/\./g, '-') : new Date().toISOString().split('T')[0]; 

      console.log(`Processing scenario: ${scenarioName}, date: ${date} from file: ${file}`);

      // Read the whole file
      const text = await fs.readFile(fullPath, 'utf-8');
      // Split lines robustly (handles \n and \r\n)
      const lines = text.trim().split(/\r?\n/); 
      
      let score: number | null = null;
      let hits: number | null = null;
      let misses: number | null = null;

      // Find the summary lines (Case-insensitive)
      for (const line of lines) {
          const trimmedLine = line.trim();
          const lowerTrimmedLine = trimmedLine.toLowerCase(); // Use lowercase for matching
          
          // Log every non-empty line being checked in the summary part (for debugging)
          if (trimmedLine.length > 0) {
            // Limit logging to avoid spamming too much for very large files
            if (score === null || hits === null || misses === null) {
              console.log(`Checking line: "${trimmedLine}"`);
            }
          }

          // Case-insensitive checks
          if (lowerTrimmedLine.startsWith('score:')) {
              // Split by colon, take second part, trim, remove leading comma, trim again, parse
              const parts = trimmedLine.split(':');
              if (parts.length > 1) {
                  const scoreValueRaw = parts[1].trim();
                  const scoreValue = scoreValueRaw.startsWith(',') ? scoreValueRaw.substring(1).trim() : scoreValueRaw;
                  score = parseFloat(scoreValue);
                  console.log(`  Found Score: ${scoreValueRaw} -> Cleaned: ${scoreValue} -> Parsed: ${score}`);
              } else {
                  console.log(`  Warning: Found 'score:' line but could not split by colon: "${trimmedLine}"`);
              }
          } else if (lowerTrimmedLine.startsWith('hit count:')) {
              const parts = trimmedLine.split(':');
              if (parts.length > 1) {
                  const hitsValueRaw = parts[1].trim();
                  const hitsValue = hitsValueRaw.startsWith(',') ? hitsValueRaw.substring(1).trim() : hitsValueRaw;
                  hits = parseInt(hitsValue, 10);
                  console.log(`  Found Hit Count: ${hitsValueRaw} -> Cleaned: ${hitsValue} -> Parsed: ${hits}`);
              } else {
                   console.log(`  Warning: Found 'hit count:' line but could not split by colon: "${trimmedLine}"`);
              }
          } else if (lowerTrimmedLine.startsWith('miss count:')) {
              const parts = trimmedLine.split(':');
              if (parts.length > 1) {
                  const missesValueRaw = parts[1].trim();
                  const missesValue = missesValueRaw.startsWith(',') ? missesValueRaw.substring(1).trim() : missesValueRaw;
                  misses = parseInt(missesValue, 10);
                  console.log(`  Found Miss Count: ${missesValueRaw} -> Cleaned: ${missesValue} -> Parsed: ${misses}`);
              } else {
                  console.log(`  Warning: Found 'miss count:' line but could not split by colon: "${trimmedLine}"`);
              }
          }
          
          if (score !== null && hits !== null && misses !== null) {
              console.log('  Found all required summary lines.');
              break; // Stop searching once all are found
          }
      }

      // Validate required fields (check for NaN as well)
      if (score === null || isNaN(score)) {
          console.log(`Skipping file (Could not find valid 'Score:' line): ${file}`);
          continue;
      }
       if (hits === null || isNaN(hits) || misses === null || isNaN(misses)) {
          console.log(`Skipping file (Could not find valid 'Hit Count:' or 'Miss Count:' lines): ${file}`);
          continue;
      }

      // Calculate accuracy
      const totalShots = hits + misses;
      const accuracy = totalShots > 0 ? parseFloat(((hits / totalShots) * 100).toFixed(1)) : 0;

      // Create ONE entry for this file
      const entry: BenchmarkScore = {
        id: `${file}-${date}`, // Unique ID based on filename and date
        scenario: scenarioName,
        score: score,
        accuracy: accuracy, 
        date: date, 
        difficulty: 'Medium', // Assign a default difficulty
        notes: `Imported from ${file}`, 
      };
      
      allEntries.push(entry);
      console.log(`Successfully parsed entry from ${file}: Score=${score}, Accuracy=${accuracy}%`);
    }

    console.log(`Successfully processed ${allEntries.length} valid KovaaK's stat files.`);
    return NextResponse.json(allEntries);

  } catch (err: unknown) {
    console.error(`Error reading Kovaak stats from ${statsDir}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    // Updated error message as requested
    return NextResponse.json({ error: `Could not read statsDir (${statsDir}): ${errorMessage}` }, { status: 500 });
  }
} 