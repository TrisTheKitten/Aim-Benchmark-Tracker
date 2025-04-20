// Remove the import statement
// import { BenchmarkScore } from '../app/page';

// Define BenchmarkScore locally
interface BenchmarkScore {
  id: number;
  scenario: string;
  score: number;
  accuracy: number;
  date: string; // YYYY-MM-DD
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  notes?: string;
}

interface CurrentStats {
  avgScore: number;
  avgAcc: number;
  bestScore: number;
  count: number;
}

interface AiCoachInput {
  apiKey: string;
  userGame: string;
  userSensitivity: string;
  filterScenario: string;
  currentStats: CurrentStats;
  recentBenchmarks: BenchmarkScore[]; // This will now use the local interface
}

const SYSTEM_PROMPT = `You are an expert FPS aim coach analyzing aim trainer benchmark data. Your goal is to provide insightful, actionable feedback based ONLY on the provided data using the gpt-4o-mini model. 

Format your response using Markdown:
- Use headings (e.g., ### Analysis) for each section.
- Use paragraphs for explanations. Ensure clear separation between paragraphs by using a blank line (double newline) in the Markdown source.
- Use bullet points for suggestions or specific observations.

Follow this structure:

### Analysis : 
- Analyze the Score/Accuracy Relationship: Interpret what the average score and accuracy imply (e.g., fast but imprecise, slow but precise, good balance).
- Base these points strictly on the provided recent benchmark list.
- Look at the \`Recent Benchmark Scores\` list. Comment on any standout performances or patterns in specific scenarios 

### Game-based Suggestions :
- Briefly suggest how the observed patterns might translate to performance in the specified game.
- Focus on the biggest area for improvement (e.g., speed, precision under pressure, consistency).
- Provide 1-2 specific, constructive suggestions for in game improvement as bullet points.


### Overall Recommendations : 
- Provide 1-2 specific, constructive suggestions for improvement as bullet points.
- Focus on whether to prioritize speed, precision, or consistency based on the analysis.
- Suggest target scores or accuracy levels if appropriate.
- Provide 1-2 specific, constructive suggestions for improvement as bullet points.

Keep the feedback concise, encouraging, and easy to understand. Address the user directly.`;

function createUserPrompt(data: Omit<AiCoachInput, 'apiKey'>): string {
  return `
    Analyze my recent aim training performance:

    Game I'm training for: ${data.userGame}
    My Sensitivity: ${data.userSensitivity}
    Current Scenario Filter: ${data.filterScenario || 'All Scenarios'}

    Overall Stats (${data.filterScenario || 'All Scenarios'}):
    - Average Score: ${data.currentStats.avgScore.toLocaleString()}
    - Average Accuracy: ${data.currentStats.avgAcc}%
    - Best Score: ${data.currentStats.bestScore.toLocaleString()}
    - Total Entries Analyzed (within filter): ${data.currentStats.count}

    Recent Benchmark Scores (up to 10 most recent within filter):
    ${data.recentBenchmarks.length > 0
      ? data.recentBenchmarks.map(b =>
          `- ${b.date} | ${b.scenario} | Score: ${b.score.toLocaleString()} | Acc: ${b.accuracy}% | Diff: ${b.difficulty}${b.notes ? ` | Notes: "${b.notes}"` : ''}`
        ).join('\n')
      : 'No recent benchmark data available for this filter.'
    }

    Please provide coaching feedback based on this data, following the structured approach outlined.
  `;
}

export async function getAiCoachRecommendation(input: AiCoachInput): Promise<string> {
  const userPrompt = createUserPrompt(input);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${input.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', 
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.6,
        max_tokens: 4096 
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`OpenAI Error: ${errorData.error?.message || 'Unknown error. Status: ' + response.status}`);
    }

    const data = await response.json();
    const recommendation = data.choices?.[0]?.message?.content?.trim();

    if (!recommendation) {
        throw new Error('Received empty response from AI.');
    }

    return recommendation;

  } catch (error) {
    console.error('AI Coach Request Error:', error);
    if (error instanceof Error) {
        return `Failed to get AI recommendation: ${error.message}`;
    } 
    return 'Failed to connect to OpenAI API. Check network or console.';
  }
}