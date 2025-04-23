"use client";

import { useState, useMemo, useEffect } from 'react';
import { Target, TrendingUp, Calendar, Star, ChevronDown, ChevronUp, Filter, X, PlusCircle, BrainCircuit, BarChart2, List, Download, RefreshCw, Sun, Moon, Trash2, Copy, Library, CheckSquare, UploadCloud, ListPlus, ListMinus, ListEnd, History, Hexagon } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAiCoachRecommendation } from '../lib/ai-coach'; 
import ReactMarkdown from 'react-markdown'; 



export type BenchmarkScore = {
  id: number | string; 
  scenario: string;
  score: number;
  accuracy: number;
  date: string; 
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  notes?: string;
};

type Theme = 'light' | 'dark';



const DifficultyBadge: React.FC<{ difficulty: BenchmarkScore['difficulty']; theme: Theme }> = ({ difficulty, theme }) => {
  let colorClasses = '';
  if (theme === 'dark') {
    switch (difficulty) {
      case 'Easy':
        colorClasses = 'bg-green-800 text-green-100';
        break;
      case 'Medium':
        colorClasses = 'bg-yellow-800 text-yellow-100';
        break;
      case 'Hard':
        colorClasses = 'bg-orange-800 text-orange-100';
        break;
      case 'Insane':
        colorClasses = 'bg-red-800 text-red-100';
        break;
    }
  } else {
    switch (difficulty) {
      case 'Easy':
        colorClasses = 'bg-green-100 text-green-800';
        break;
      case 'Medium':
        colorClasses = 'bg-yellow-100 text-yellow-800';
        break;
      case 'Hard':
        colorClasses = 'bg-orange-100 text-orange-800';
        break;
      case 'Insane':
        colorClasses = 'bg-red-100 text-red-800';
        break;
    }
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorClasses}`}>{difficulty}</span>;
};



export default function AimTrackerPage() {
  
  const [benchmarks, setBenchmarks] = useState<BenchmarkScore[]>([]);
  const [sortKey, setSortKey] = useState<keyof BenchmarkScore | null>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScenarioSelector, setShowScenarioSelector] = useState(false); 
  const [newScore, setNewScore] = useState<Partial<BenchmarkScore>>({ date: new Date().toISOString().split('T')[0], difficulty: 'Medium' });
  const [viewMode, setViewMode] = useState<'list' | 'area' | 'spider'>('list');
  const [userGame, setUserGame] = useState('Valorant');
  const [userIngameSens, setUserIngameSens] = useState<number | string>('0.3');
  const [userDPI, setUserDPI] = useState<number | string>(800);
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState('Enter API key and analyze performance.');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false); // State for copy feedback
  const [theme, setTheme] = useState<Theme>('dark');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false); 
  const [displayLimit, setDisplayLimit] = useState(20);
  const [chartTimePeriod, setChartTimePeriod] = useState<'7d' | '30d' | 'all'>('all'); 
  const [scenarioSearchTerm, setScenarioSearchTerm] = useState('');

  // Define the constant used for limiting data for AI context
  const MAX_ENTRIES_FOR_AI = 100;
  
  useEffect(() => {
    
    const storedBenchmarks = localStorage.getItem('aimBenchmarks');
    if (storedBenchmarks) {
      try {
        const parsedBenchmarks = JSON.parse(storedBenchmarks);
        
        if (Array.isArray(parsedBenchmarks) && parsedBenchmarks.every(b => typeof b.id === 'number' || typeof b.id === 'string')) {
           setBenchmarks(parsedBenchmarks);
        } else {
            console.error("Invalid data found in localStorage for aimBenchmarks");
            localStorage.removeItem('aimBenchmarks');
        }
      } catch (error) {
        console.error("Failed to parse benchmarks from localStorage:", error);
        localStorage.removeItem('aimBenchmarks');
      }
    }

    
    localStorage.removeItem('aimScenarioTemplates');

    
    const storedFavorites = localStorage.getItem('aimFavorites');
    if (storedFavorites) {
      try {
        const parsedFavorites = JSON.parse(storedFavorites);
        if (Array.isArray(parsedFavorites) && parsedFavorites.every(fav => typeof fav === 'string')) {
          console.log('Loaded favorites from localStorage:', parsedFavorites);
          setFavorites(parsedFavorites);
        } else {
          console.error("Invalid data found in localStorage for aimFavorites");
          localStorage.removeItem('aimFavorites');
        }
      } catch (error) {
        console.error("Failed to parse favorites from localStorage:", error);
        localStorage.removeItem('aimFavorites');
      }
    } else {
      console.log('No favorites found in localStorage.');
    }

    
    const storedTheme = localStorage.getItem('aimTheme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
        setTheme(storedTheme);
    }
    const storedGame = localStorage.getItem('aimUserGame');
    if (storedGame) setUserGame(storedGame);
    const storedSens = localStorage.getItem('aimUserIngameSens');
    if (storedSens) setUserIngameSens(storedSens);
    const storedDPI = localStorage.getItem('aimUserDPI');
    if (storedDPI) setUserDPI(storedDPI);

  }, []);

  
  useEffect(() => {
    if (benchmarks.length > 0 || localStorage.getItem('aimBenchmarks')) {
      localStorage.setItem('aimBenchmarks', JSON.stringify(benchmarks));
    }
  }, [benchmarks]);

  
  useEffect(() => {
    console.log('Saving favorites to localStorage:', favorites);
    localStorage.setItem('aimFavorites', JSON.stringify(favorites));
  }, [favorites]);

  
  useEffect(() => {
    localStorage.setItem('aimTheme', theme);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('aimUserGame', userGame);
    localStorage.setItem('aimUserIngameSens', String(userIngameSens));
    localStorage.setItem('aimUserDPI', String(userDPI));
  }, [userGame, userIngameSens, userDPI]);

  
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  
  const uniqueScenarios = useMemo(() => [...new Set(benchmarks.map((b) => b.scenario))].sort(), [benchmarks]);

  
  const sortedAndFilteredBenchmarks = useMemo(() => {
    let filtered = benchmarks;
    if (selectedScenarios.length > 0) {
      filtered = filtered.filter((b) => selectedScenarios.includes(b.scenario));
    }
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === undefined || valB === undefined) return 0;
      if (typeof valA === 'number' && typeof valB === 'number') return sortOrder === 'asc' ? valA - valB : valB - valA;
      if (typeof valA === 'string' && typeof valB === 'string') return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return 0;
    });
  }, [benchmarks, sortKey, sortOrder, selectedScenarios]);

  
  const filteredSearchScenarios = useMemo(() => {
    if (!scenarioSearchTerm) return [];
    return uniqueScenarios.filter(sc => 
      sc.toLowerCase().includes(scenarioSearchTerm.toLowerCase())
    );
  }, [uniqueScenarios, scenarioSearchTerm]);

  
  const sortedDropdownScenarios = useMemo(() => {
    const selected = uniqueScenarios.filter(sc => selectedScenarios.includes(sc)).sort();
    const notSelected = uniqueScenarios.filter(sc => !selectedScenarios.includes(sc)).sort();
    return [...selected, ...notSelected];
  }, [uniqueScenarios, selectedScenarios]);

  
  const handleSort = (key: keyof BenchmarkScore) => {
    if (sortKey === key) setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  
  const getSortIcon = (key: keyof BenchmarkScore) => {
    if (sortKey !== key) return <ChevronDown size={14} className="opacity-30" />;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  
  const handleAddScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScore.scenario || !newScore.score || !newScore.accuracy || !newScore.date || !newScore.difficulty) {
      alert('Please fill all required fields.');
      return;
    }
    const scoreToAdd: BenchmarkScore = { id: Date.now(), ...newScore } as BenchmarkScore;
    setBenchmarks((prev) => [scoreToAdd, ...prev]);
    setNewScore({ date: new Date().toISOString().split('T')[0], difficulty: 'Medium' });
    setShowAddForm(false);
  };

  
  const handleDeleteScore = (idToDelete: number | string) => {
    setBenchmarks((prev) => prev.filter((bench) => bench.id !== idToDelete));
  };

  
  const handleCloneScore = (idToClone: number | string) => {
    const scoreToClone = benchmarks.find(bench => bench.id === idToClone);
    if (scoreToClone) {
      
      const clonedData: Partial<BenchmarkScore> = {
        scenario: scoreToClone.scenario,
        
        
        score: undefined,
        accuracy: undefined, 
        difficulty: scoreToClone.difficulty,
        notes: scoreToClone.notes, 
        date: new Date().toISOString().split('T')[0] 
      };
      setNewScore(clonedData);
      setShowAddForm(true); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }
  };

  
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete ALL benchmark history? This cannot be undone.')) {
      setBenchmarks([]);
      
    }
  };

  
  const currentStats = useMemo(() => {
    const data = sortedAndFilteredBenchmarks;
    if (data.length === 0) return { avgScore: 0, avgAcc: 0, bestScore: 0, count: 0 };
    const totalScore = data.reduce((sum, b) => sum + b.score, 0);
    const totalAcc = data.reduce((sum, b) => sum + b.accuracy, 0);
    const bestScore = Math.max(...data.map((b) => b.score), 0);
    return {
      avgScore: Math.round(totalScore / data.length) || 0,
      avgAcc: parseFloat((totalAcc / data.length).toFixed(1)) || 0,
      bestScore,
      count: data.length,
    };
  }, [sortedAndFilteredBenchmarks]);

  
  const chartFilteredBenchmarks = useMemo(() => {
    console.log(`Filtering chart data for period: ${chartTimePeriod}`);
    const baseFiltered = sortedAndFilteredBenchmarks; 

    if (chartTimePeriod === 'all') {
      return baseFiltered;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const daysToSubtract = chartTimePeriod === '7d' ? 7 : 30;
    const cutoffDate = new Date(today); 
    cutoffDate.setDate(today.getDate() - daysToSubtract);
    const cutoffTimestamp = cutoffDate.getTime(); 

    console.log(`Cutoff date: ${cutoffDate.toISOString()}, Timestamp: ${cutoffTimestamp}`);

    return baseFiltered.filter(b => {
        try {
            
            if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) {
                console.warn(`Invalid date format: ${b.date}`);
                return false;
            }
            
            const benchmarkDate = new Date(b.date + 'T00:00:00Z'); 
            if (isNaN(benchmarkDate.getTime())) {
                 console.warn(`Invalid date object from string: ${b.date}`);
                 return false; 
            }
            const benchmarkTimestamp = benchmarkDate.getTime();
            
            const isInPeriod = benchmarkTimestamp >= cutoffTimestamp;
            
            
            
            
            return isInPeriod;
        } catch (e) {
            console.error(`Error processing date: ${b.date}`, e);
            return false;
        }
    });
  }, [sortedAndFilteredBenchmarks, chartTimePeriod]); 

  
  const areaChartData = useMemo(() => {
    return chartFilteredBenchmarks
      .map((b) => ({
          date: new Date(b.date + 'T00:00:00').getTime(),
          Score: b.score,
          Accuracy: b.accuracy
      }))
      .sort((a: {date: number}, b: {date: number}) => a.date - b.date);
  }, [chartFilteredBenchmarks]);

  
  const scenarioOrOverallStats = useMemo(() => {
    const dataSet = selectedScenarios.length > 0 
      ? benchmarks.filter(b => selectedScenarios.includes(b.scenario)) 
      : benchmarks;

    if (dataSet.length === 0) {
      return {
        scenarioName: selectedScenarios.length > 0 ? selectedScenarios.join(', ') : 'Overall',
        count: 0,
        avgScore: 0, bestScore: 0, lowestScore: 0,
        avgAccuracy: 0, bestAccuracy: 0, lowestAccuracy: 0,
      };
    }

    let totalScore = 0;
    let totalAccuracy = 0;
    let minScore = dataSet[0].score;
    let maxScore = dataSet[0].score;
    let minAccuracy = dataSet[0].accuracy;
    let maxAccuracy = dataSet[0].accuracy;

    dataSet.forEach(b => {
      totalScore += b.score;
      totalAccuracy += b.accuracy;
      if (b.score < minScore) minScore = b.score;
      if (b.score > maxScore) maxScore = b.score;
      if (b.accuracy < minAccuracy) minAccuracy = b.accuracy;
      if (b.accuracy > maxAccuracy) maxAccuracy = b.accuracy;
    });

    const count = dataSet.length;
    return {
      scenarioName: selectedScenarios.length > 0 ? selectedScenarios.join(', ') : 'Overall',
      count: count,
      avgScore: Math.round(totalScore / count),
      bestScore: maxScore,
      lowestScore: minScore,
      avgAccuracy: parseFloat((totalAccuracy / count).toFixed(1)),
      bestAccuracy: maxAccuracy,
      lowestAccuracy: minAccuracy,
    };
  }, [benchmarks, selectedScenarios]);

  
  const scoreSpiderData = useMemo(() => {
    if (!scenarioOrOverallStats || scenarioOrOverallStats.count === 0) return [];
    const { avgScore, bestScore, lowestScore } = scenarioOrOverallStats;
    return [
      { stat: 'Avg Score', value: avgScore },
      { stat: 'Best Score', value: bestScore },
      { stat: 'Lowest Score', value: lowestScore },
    ];
  }, [scenarioOrOverallStats]);

  
  const accuracySpiderData = useMemo(() => {
     if (!scenarioOrOverallStats || scenarioOrOverallStats.count === 0) return [];
    const { avgAccuracy, bestAccuracy, lowestAccuracy } = scenarioOrOverallStats;
    return [
      { stat: 'Avg Acc', value: avgAccuracy }, 
      { stat: 'Best Acc', value: bestAccuracy },
      { stat: 'Lowest Acc', value: lowestAccuracy },
    ];
  }, [scenarioOrOverallStats]);

  
  const handleAiAnalysis = async () => { 
    if (!aiApiKey) {
      setAiRecommendations('Please enter an API key first.');
      return;
    }
    setIsAnalyzing(true);
    
    const dataToSend = sortedAndFilteredBenchmarks;
    const MAX_ENTRIES_FOR_AI = 100; 
    const relevantBenchmarks = dataToSend.slice(0, MAX_ENTRIES_FOR_AI);
    let analysisScope = selectedScenarios.length > 0 
        ? `your ${selectedScenarios.join(', ')} performance` 
        : 'your overall performance';
    if (relevantBenchmarks.length > 0) {
        analysisScope += ` (using latest ${relevantBenchmarks.length} entries)`;
    }
    setAiRecommendations(`Analyzing ${analysisScope}...`);

    if (relevantBenchmarks.length === 0) {
        setAiRecommendations(`No relevant data found${selectedScenarios.length > 0 ? ` for selected scenarios` : ''} to analyze.`);
        setIsAnalyzing(false);
        return;
    }
    
    try {
        const sensitivityString = `${userIngameSens} @ ${userDPI} DPI`;
        const recommendation = await getAiCoachRecommendation({
            apiKey: aiApiKey,
            userGame: userGame,
            userSensitivity: sensitivityString, 
            
            filterScenario: selectedScenarios.join(', ') || '', 
            currentStats: currentStats, 
            recentBenchmarks: relevantBenchmarks 
        });
        setAiRecommendations(recommendation);
    } catch (error) {
        console.error("Error calling getAiCoachRecommendation:", error);
        setAiRecommendations(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
        setIsAnalyzing(false);
    }
  };

  // Handler for copying the prompt
  const handleCopyPrompt = () => {
    const systemPrompt = `You are an expert FPS aim coach analyzing aim trainer benchmark data. Your goal is to provide insightful, actionable feedback based ONLY on the provided data using the gpt-4o-mini model. 

Format your response using Markdown:
- Dont assume all scenarios are the same.(There are different categories of scenarios such as flicking, tracking, target switching etc and different focus of the training methods such as speed, precision, consistency etc) Each scenario has different characteristics and different weaknesses. 
- Each scenario require different approach on technique and different training methods.
- Dont assume the user is using the same technique for all scenarios.
- Use headings (e.g, Analysis) for each section.
- Use bulletpoints for explanations. Ensure clear separation between sections by using a blank line (double newline) in the Markdown source.
- Use bullet points for suggestions or specific observations.
- Dont include conclusions or generic advice.

Follow this structure:

Analysis :  (2-3 sentences)

- Analyze solely on the weaknesses of the user based on the provided recent benchmark list and try to find the biggest area for improvement.
- Analyze the Score/Accuracy Relationship: Interpret what the average score and accuracy imply (e.g., fast but imprecise, slow but precise, good balance).
- Base these points strictly on the provided recent benchmark list.
- Look at the \`Recent Benchmark Scores\` list. Comment on patterns in specific scenarios 
- Dont include conclusions or generic advice.
(separate this line) " ------------------------- " 
Game-based Suggestions : (1-2 sentences)
- Briefly suggest how the observed patterns might translate to performance (focus on weaknesses) in the specified game.
- Focus on the biggest area for improvement (e.g., speed, precision under pressure, consistency).
- Provide 1-2 specific, constructive suggestions for in game improvement as bullet points. (dont be generic be specific)
- Dont include conclusions or generic advice.
(separate this line) " ------------------------- " 
Overall Recommendations and Tips : (1-2 sentences)
- Provide 1-2 specific, constructive suggestions(focus on weaknesses) for improvement as bullet points.(dont be generic be specific)
- Focus on whether to prioritize speed, precision, or consistency or other aspects based on the analysis.
- Suggest specific scenarios to focus on based on the analysis.(be specific)
- Provide 1-2 specific, constructive suggestions(training methods, areas of focus etc based on weaknesses) for improvement as bullet points.
- Dont include conclusions or generic advice.
(separate this line) " ------------------------- " 
Training Plan (next 7 days)
- Primary drill: <scenario> — focus on <speed/precision/consistency>.  
- Secondary drill: <scenario> — …  
- Micro‑habit: <≤10 words>.
(separate this line) " ------------------------- " 
Dont include generic advice or commendations just focus on the weaknesses and provide suggestions for improvement.
Keep the feedback concise, encouraging, and easy to understand. Address the user directly.`;

    const dataToSend = sortedAndFilteredBenchmarks;
    const relevantBenchmarks = dataToSend.slice(0, MAX_ENTRIES_FOR_AI);
    const sensitivityString = `${userIngameSens} @ ${userDPI} DPI`;

    const userPrompt = `
Analyze my recent aim training performance:

Game I'm training for: ${userGame}
My Sensitivity: ${sensitivityString}
Current Scenario Filter: ${selectedScenarios.join(', ') || 'All Scenarios'}

Overall Stats (${selectedScenarios.join(', ') || 'All Scenarios'}):
- Average Score: ${currentStats.avgScore.toLocaleString()}
- Average Accuracy: ${currentStats.avgAcc}%
- Best Score: ${currentStats.bestScore.toLocaleString()}
- Total Entries Analyzed (within filter): ${currentStats.count}

Recent Benchmark Scores (up to ${MAX_ENTRIES_FOR_AI} most recent within filter):
${relevantBenchmarks.length > 0
  ? relevantBenchmarks.map(b =>
      `- ${b.date} | ${b.scenario} | Score: ${b.score.toLocaleString()} | Acc: ${b.accuracy}% | Diff: ${b.difficulty}${b.notes ? ` | Notes: \"${b.notes}\"` : ''}`
    ).join('\\n') // Ensure newline characters are correctly represented in the final string
  : 'No recent benchmark data available for this filter.'
}

Please provide coaching feedback based on this data, following the structured approach outlined.
`;

    const fullPrompt = `--- SYSTEM PROMPT ---\n\n${systemPrompt}\n\n--- USER PROMPT ---\n${userPrompt}`; // Remove unnecessary extra backslashes

    navigator.clipboard.writeText(fullPrompt).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000); // Reset after 2 seconds
    }).catch(err => {
      console.error('Failed to copy prompt: ', err);
      alert('Failed to copy prompt to clipboard.');
    });
  };

  
  const handleExportPdf = () => { 
    const doc = new jsPDF();
    const margin = 15;
    let yPos = margin;

    
    doc.setFontSize(18);
    doc.setTextColor(161, 224, 211); 
    doc.text('Aim Training Benchmark Report', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Game: ${userGame}`, margin, yPos);
    
    const sensitivityString = `${userIngameSens} @ ${userDPI} DPI`;
    doc.text(`Sensitivity: ${sensitivityString}`, margin + 70, yPos);
    yPos += 10;

    doc.setTextColor(0, 0, 0);
    doc.text(`Scenario Filter: ${selectedScenarios.length > 0 ? selectedScenarios.join(', ') : 'All'}`, margin, yPos);
    yPos += 15;

    
    doc.setFontSize(14);
    doc.setTextColor(161, 224, 211); 
    doc.text(`Stats (${selectedScenarios.length > 0 ? 'Selected Scenarios' : 'All Scenarios'})`, margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`- Avg Score: ${currentStats.avgScore.toLocaleString()}`, margin, yPos);
    doc.text(`- Avg Accuracy: ${currentStats.avgAcc}%`, margin + 70, yPos);
    yPos += 7;

    doc.text(`- Best Score: ${currentStats.bestScore.toLocaleString()}`, margin, yPos);
    doc.text(`- Entries: ${currentStats.count}`, margin + 70, yPos);
    yPos += 15;

    
    doc.setFontSize(14);
    doc.setTextColor(161, 224, 211); 
    doc.text('AI Coach Recommendation', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const cleanedRecommendations = aiRecommendations.replace(/^#+\s+/gm, '');
    const splitRec = doc.splitTextToSize(cleanedRecommendations, doc.internal.pageSize.width - margin * 2);
    doc.text(splitRec, margin, yPos);
    yPos += splitRec.length * 5 + 10;

    
    doc.setFontSize(14);
    doc.setTextColor(161, 224, 211); 
    doc.text(`Benchmark History (${selectedScenarios.length > 0 ? 'Selected' : 'All'})`, margin, yPos);
    yPos += 8;

    
    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Scenario', 'Score', 'Accuracy', 'Difficulty']],
      body: sortedAndFilteredBenchmarks.map((b) => [b.date, b.scenario, b.score.toLocaleString(), `${b.accuracy}%`, b.difficulty]),
      theme: 'grid',
      headStyles: { fillColor: [161, 224, 211], textColor: [0, 0, 0] },
      bodyStyles: { textColor: [0, 0, 0] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`aimplified_report_${selectedScenarios.length > 0 ? 'selected' : 'all'}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  
  const handleQuickAdd = (scenario: string) => {
    
    const latestEntry = benchmarks
      .slice()
      .reverse()
      .find(b => b.scenario.toLowerCase() === scenario.toLowerCase());
    
    const difficulty = latestEntry ? latestEntry.difficulty : 'Medium'; 

    setNewScore({
      scenario,
      difficulty,
      date: new Date().toISOString().split('T')[0],
      
      score: undefined,
      accuracy: undefined,
      notes: '', 
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  
  const handleAddFavorite = (scenario: string) => {
    if (scenario && !favorites.includes(scenario)) {
      setFavorites(prev => [...prev, scenario].sort()); 
    }
  };

  
  const handleRemoveFavorite = (scenarioToRemove: string) => {
    setFavorites(prev => prev.filter(fav => fav !== scenarioToRemove));
  };

  
  const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
  const textColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-700';
  const mutedTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const cardBorder = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const inputBg = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100';
  const inputBorder = theme === 'dark' ? 'border-gray-600' : 'border-gray-300';
  const headerColor = 'text-[#A1E0D3]'; 
  const accentColor = theme === 'dark' ? 'teal-400' : 'teal-600';
  const chartGridColor = theme === 'dark' ? '#4b5563' : '#d1d5db';
  const chartTextColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const chartScoreColor = theme === 'dark' ? '#2dd4bf' : '#0d9488';
  const chartAccColor = theme === 'dark' ? '#fbbf24' : '#f59e0b';

  
  const handleOpenBulkAdd = () => {
    setShowBulkAddModal(true);
  };

  
  const handleCloseBulkAdd = () => {
    setShowBulkAddModal(false);
    
  };

  
  const handleBulkSubmit = (newEntries: BenchmarkScore[]) => {
    setBenchmarks(prev => [...newEntries, ...prev]); 
    handleCloseBulkAdd();
  };

  
  const handleImportKovaaksStats = async () => {
    if (isImporting) return; 
    setIsImporting(true);
    console.log('Starting KovaaK\'s stats import...');

    try {
      const response = await fetch('/api/kovaak-stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      const importedScores: BenchmarkScore[] = data; 
      console.log(`Fetched ${importedScores.length} scores from API.`);

      if (!Array.isArray(importedScores)) {
          throw new Error('Invalid data format received from API.');
      }

      let addedCount = 0;
      setBenchmarks(prevBenchmarks => {
        // Remove the duplicate checking logic
        // const existingEntries = new Set(
        //   prevBenchmarks.map(b => `${b.scenario}-${b.date}-${b.score}`)
        // );
        // 
        // const newEntries = importedScores.filter((imported: BenchmarkScore) => {
        //   const key = `${imported.scenario}-${imported.date}-${imported.score}`;
        //   return !existingEntries.has(key);
        // });
        // 
        // addedCount = newEntries.length;
        // 
        // if (addedCount > 0) {
        //   console.log(`Adding ${addedCount} new unique scores.`);
        //   return [...prevBenchmarks, ...newEntries];
        // } else {
        //   console.log('No new unique scores found to import.');
        //   return prevBenchmarks; 
        // }

        // Simply concatenate the imported scores
        addedCount = importedScores.length;
        if (addedCount > 0) {
          console.log(`Importing ${addedCount} scores (including potential duplicates).`);
          return [...prevBenchmarks, ...importedScores];
        } else {
          console.log('No scores found in the files to import.');
          return prevBenchmarks;
        }
      });

      
      setTimeout(() => {
          if (addedCount > 0) {
              alert(`Successfully imported ${addedCount} scores from KovaaK&apos;s files (duplicates included).`);
          } else {
              alert('No scores found in the KovaaK&apos;s files directory or files were unparseable.');
          }
          // Removed the message for 'no new unique scores' as duplicates are now allowed
      }, 100); 

    } catch (error) {
      console.error('Failed to import KovaaK\'s stats:', error);
      alert(`Failed to import KovaaK&apos;s stats: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsImporting(false);
      console.log('KovaaK\'s stats import finished.');
    }
  };

  
  const INITIAL_LIMIT = 20;
  const SHOW_MORE_INCREMENT = 20;

  const handleShowMore = () => {
    setDisplayLimit(prev => Math.min(prev + SHOW_MORE_INCREMENT, sortedAndFilteredBenchmarks.length));
  };

  const handleShowAll = () => {
    setDisplayLimit(sortedAndFilteredBenchmarks.length);
  };

  const handleShowDefault = () => {
    setDisplayLimit(INITIAL_LIMIT);
  };

  
  const handleScenarioSelectionChange = (scenario: string, isSelected: boolean) => {
    setSelectedScenarios(prev => 
      isSelected 
        ? [...prev, scenario] 
        : prev.filter(s => s !== scenario) 
    );
    setShowScenarioSelector(false); 
  };

  

  
  function calculateStdDev(data: number[]): number {
    if (data.length < 2) return 0;
    const mean = data.reduce((acc, val) => acc + val, 0) / data.length;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  
  function calculateImprovement(startValue: number, endValue: number): number {
    if (startValue === 0 && endValue === 0) return 0;
    if (startValue === 0) return Infinity; 
    return ((endValue - startValue) / startValue) * 100;
  }

  
  type PeriodStats = {
    scoreStdDev: number;
    accuracyStdDev: number;
    scoreImprovementPercent: number | null; 
    accuracyImprovementPercent: number | null; 
  };

  
  const periodStats = useMemo<PeriodStats>(() => {
    console.log(`Calculating period stats for: ${chartTimePeriod}, Scenarios: ${selectedScenarios.join(', ') || 'All'}`);
    
    
    const scenarioFilteredData = selectedScenarios.length > 0
      ? benchmarks.filter(b => selectedScenarios.includes(b.scenario))
      : benchmarks;

    if (scenarioFilteredData.length === 0) {
      return { scoreStdDev: 0, accuracyStdDev: 0, scoreImprovementPercent: null, accuracyImprovementPercent: null };
    }

    
    let timeFilteredData = scenarioFilteredData;
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (chartTimePeriod !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysToSubtract = chartTimePeriod === '7d' ? 7 : 30;
      const cutoffDate = new Date(today);
      cutoffDate.setDate(today.getDate() - daysToSubtract);
      const cutoffTimestamp = cutoffDate.getTime();

      timeFilteredData = scenarioFilteredData.filter(b => {
        try {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return false;
          const benchmarkDate = new Date(b.date + 'T00:00:00Z');
          if (isNaN(benchmarkDate.getTime())) return false;
          return benchmarkDate.getTime() >= cutoffTimestamp;
        } catch { return false; }
      });

      startDate = cutoffDate;
      endDate = today; 
    }
    
    
    const sortedTimeFilteredData = [...timeFilteredData].sort((a, b) => 
        new Date(a.date + 'T00:00:00Z').getTime() - new Date(b.date + 'T00:00:00Z').getTime()
    );

    
    const scores = sortedTimeFilteredData.map(b => b.score);
    const accuracies = sortedTimeFilteredData.map(b => b.accuracy);
    const scoreStdDev = calculateStdDev(scores);
    const accuracyStdDev = calculateStdDev(accuracies);

    
    let scoreImprovementPercent: number | null = null;
    let accuracyImprovementPercent: number | null = null;

    if (sortedTimeFilteredData.length >= 2) {
        
        const firstEntry = sortedTimeFilteredData[0];
        const lastEntry = sortedTimeFilteredData[sortedTimeFilteredData.length - 1];

        
        
        
        
        scoreImprovementPercent = calculateImprovement(firstEntry.score, lastEntry.score);
        accuracyImprovementPercent = calculateImprovement(firstEntry.accuracy, lastEntry.accuracy);
    } else if (sortedTimeFilteredData.length === 1 && chartTimePeriod !== 'all') {
        
        
        
    }

    return {
      scoreStdDev: parseFloat(scoreStdDev.toFixed(1)),
      accuracyStdDev: parseFloat(accuracyStdDev.toFixed(1)),
      scoreImprovementPercent: scoreImprovementPercent !== null && isFinite(scoreImprovementPercent) ? parseFloat(scoreImprovementPercent.toFixed(1)) : null,
      accuracyImprovementPercent: accuracyImprovementPercent !== null && isFinite(accuracyImprovementPercent) ? parseFloat(accuracyImprovementPercent.toFixed(1)) : null
    };

  }, [benchmarks, selectedScenarios, chartTimePeriod]);

  
  const displayedBenchmarks = useMemo<BenchmarkScore[]>(() => { 
    if (displayLimit >= sortedAndFilteredBenchmarks.length) {
      return sortedAndFilteredBenchmarks;
    }
    return sortedAndFilteredBenchmarks.slice(0, displayLimit);
  }, [sortedAndFilteredBenchmarks, displayLimit]);

  
  useEffect(() => {
    if (viewMode === 'area') {
      console.log("Selected Scenarios:", selectedScenarios);
      console.log("Chart Filtered Benchmarks (Input):", chartFilteredBenchmarks);
      console.log("Area Chart Data (Output):", areaChartData);
    }
  }, [selectedScenarios, chartFilteredBenchmarks, areaChartData, viewMode]);

  
  return (
    <div className={`${theme} font-sans transition-colors duration-300`}>
      <div className={`${bgColor} ${textColor} min-h-screen p-4 md:p-8`}>
        <header className="mb-6 md:mb-10 flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className={`text-3xl md:text-4xl font-bold ${headerColor} flex items-center gap-3 mb-2`}>
              <Target size={36} /> Aimplified
            </h1>
            {}
            <p className={`${mutedTextColor} text-sm ml-1 flex items-center flex-wrap`}>
              <span className="mr-2">Game: <input type="text" value={userGame} onChange={(e) => setUserGame(e.target.value)} placeholder="Game" className={`${inputBg} ${inputBorder} text-xs p-1 rounded border w-20 focus:outline-none focus:ring-1 focus:ring-${accentColor} mx-1`} /></span>
              <span className="mr-2">In-game Sens: <input type="number" value={userIngameSens} onChange={(e) => setUserIngameSens(e.target.value)} placeholder="Sens" step="0.01" className={`${inputBg} ${inputBorder} text-xs p-1 rounded border w-16 focus:outline-none focus:ring-1 focus:ring-${accentColor} mx-1`} /></span>
              <span>DPI: <input type="number" value={userDPI} onChange={(e) => setUserDPI(e.target.value)} placeholder="DPI" step="50" className={`${inputBg} ${inputBorder} text-xs p-1 rounded border w-16 focus:outline-none focus:ring-1 focus:ring-${accentColor} mx-1`} /></span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <button onClick={handleExportPdf} className={`w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md h-10 mt-1`} title="Download a PDF report of the current view (filtered benchmarks, stats, and AI analysis)">
              <Download size={16} /> Export PDF
            </button>
            <button
              onClick={handleClearAll}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md h-10 mt-1 disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={benchmarks.length === 0}
              title="Delete all benchmark history"
            >
              <Trash2 size={16} /> Clear History
            </button>
            <button onClick={toggleTheme} className={`p-2 rounded-lg ${cardBg} border ${cardBorder} ${mutedTextColor} hover:text-${accentColor} transition-colors h-10 mt-1 w-full sm:w-auto flex justify-center`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <section className="mb-6">
          <h2 className={`text-sm font-semibold ${mutedTextColor} mb-2 flex items-center gap-1.5`}>
            <Star size={16} className="text-yellow-500" /> Favorites (Quick Add)
          </h2>
          <div className="flex flex-wrap gap-2 min-h-[36px]">
            {favorites.length > 0 ? (
              favorites.map(favScenario => (
                <div key={favScenario} className={`relative group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${cardBg} border ${cardBorder} ${textColor} hover:border-${accentColor} hover:text-${accentColor} transition-colors shadow-sm cursor-pointer`}>
                  <span onClick={() => handleQuickAdd(favScenario)} title={`Quick add ${favScenario}`}>{favScenario}</span>
                  <button
                    onClick={() => handleRemoveFavorite(favScenario)}
                    className={`absolute -top-1.5 -right-1.5 p-0.5 bg-red-600 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}
                    title={`Remove ${favScenario} from favorites`}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))
            ) : (
              <p className={`text-xs italic ${mutedTextColor} flex items-center h-full`}>No favorites added yet. Use the star icon next to the filter.</p>
            )}
          </div>
        </section>

        <section className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { icon: TrendingUp, label: 'Avg Score', value: currentStats.avgScore.toLocaleString() },
            { icon: Target, label: 'Avg Accuracy', value: `${currentStats.avgAcc}%` },
            { icon: Calendar, label: 'Entries', value: String(currentStats.count) } 
          ].map((stat) => (
            <div key={stat.label} className={`${cardBg} p-4 rounded-xl border ${cardBorder} shadow-lg flex flex-col justify-between`}>
              <h3 className={`text-xs font-medium ${mutedTextColor} mb-1 flex items-center gap-1.5`}>
                <stat.icon size={14} /> {stat.label} <span className="text-gray-500 dark:text-gray-600 text-[10px]">({selectedScenarios.length > 0 ? 'Selected' : 'All'})</span>
              </h3>
              <p className={`text-xl md:text-2xl font-bold ${textColor} truncate`}>{stat.value}</p>
            </div>
          ))}
        </section>

        <div className="mb-6 flex flex-col sm:flex-row justify-end gap-3">
          <button onClick={handleImportKovaaksStats} disabled={isImporting} className={`w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md disabled:opacity-50 disabled:cursor-wait`} title="Import benchmark scores from local KovaaK's stats files (includes duplicates)">
            {isImporting ? (<><RefreshCw size={18} className="animate-spin" /> Importing...</>) : (<><UploadCloud size={18} /> Import KovaaK&apos;s</>)}
          </button>
          <button onClick={handleOpenBulkAdd} className={`w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md`} title="Open a modal to add multiple benchmark scores at once">
            <Library size={18} /> Bulk Add
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)} className={`w-full sm:w-auto flex items-center justify-center gap-2 bg-${accentColor} hover:bg-${theme === 'dark' ? 'teal-500' : 'teal-700'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md`} title={showAddForm ? 'Hide the form for adding a single score' : 'Show the form to add a single new score'}>
            {showAddForm ? <X size={18} /> : <PlusCircle size={18} />} {showAddForm ? 'Cancel Entry' : 'Add New Score'}
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddScore}
            className={`${cardBg} rounded-lg border ${cardBorder} grid grid-cols-1 md:grid-cols-3 gap-4 shadow-lg mb-6 p-4`}
          >
            <h3 className={`col-span-full text-lg font-semibold mb-2 ${headerColor}`}>Log New Benchmark</h3>
            {[ 
              { label: 'Scenario', key: 'scenario', type: 'text', list: 'scenarios' },
              { label: 'Difficulty', key: 'difficulty', type: 'select' },
              { label: 'Score', key: 'score', type: 'number' },
              { label: 'Accuracy (%)', key: 'accuracy', type: 'number', step: 0.1 },
              { label: 'Date', key: 'date', type: 'date' },
              { label: 'Notes (Optional)', key: 'notes', type: 'text', span: 2 }, 
            ].map((f) => (
              <div key={f.key} className={f.span ? `md:col-span-${f.span}` : ''}>
                <label className={`block text-xs ${mutedTextColor} mb-1`}>{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    value={newScore.difficulty}
                    onChange={(e) => setNewScore({ ...newScore, difficulty: e.target.value as BenchmarkScore['difficulty'] })}
                    required
                    className={`w-full ${inputBg} ${inputBorder} p-2 rounded border text-sm focus:outline-none focus:ring-1 focus:ring-${accentColor}`}
                  >
                    {['Easy', 'Medium', 'Hard', 'Insane'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    list={f.list}
                    step={f.step}
                    value={(newScore as Record<string, string | number | undefined>)[f.key] || ''}
                    onChange={(e) => {
                      const { value } = e.target;
                      const updatedScore = {
                        ...newScore,
                        [f.key]: f.type === 'number' ? (f.step ? parseFloat(value) || 0 : parseInt(value) || 0) : value,
                      };
                      if (f.key === 'scenario') {
                        const latestEntry = benchmarks.slice().reverse().find(b => b.scenario.toLowerCase() === value.toLowerCase());
                        if (latestEntry) { updatedScore.difficulty = latestEntry.difficulty; }
                      }
                      setNewScore(updatedScore);
                    }}
                    required={f.key !== 'notes'}
                    placeholder={f.key === 'notes' ? 'e.g., New mousepad' : ''}
                    className={`w-full ${inputBg} ${inputBorder} p-2 rounded border text-sm focus:outline-none focus:ring-1 focus:ring-${accentColor}`}
                  />
                )}
                {f.list && <datalist id={f.list}>{uniqueScenarios.map((sc) => <option key={sc} value={sc} />)}</datalist>}
              </div>
            ))}
            <div className="md:col-start-3 flex justify-end items-end gap-2">
              <button
                type="submit" 
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md h-10"
                title="Save the new benchmark score entered above"
              >
                 {}
                 <CheckSquare size={18} /> Save Score 
              </button>
            </div>
          </form>
        )}

        <main className={`${cardBg} rounded-xl shadow-xl overflow-hidden border ${cardBorder} mb-8`}>
          <div className={`p-4 md:p-5 border-b ${cardBorder} flex flex-col lg:flex-row justify-between items-center gap-4`}>
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <Filter size={18} className={`${mutedTextColor}`} />
              <div className="relative grow sm:grow-0">
                <input
                  type="text"
                  value={scenarioSearchTerm}
                  onChange={(e) => setScenarioSearchTerm(e.target.value)}
                  placeholder="Search scenarios"
                  className={`${inputBg} ${inputBorder} rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-${accentColor} w-full sm:max-w-[150px] md:max-w-xs`}
                />
                {scenarioSearchTerm && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setScenarioSearchTerm('');
                    }}
                    className={`absolute top-1/2 right-2 transform -translate-y-1/2 p-1.5 ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'} rounded-md`}
                    title="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
                {scenarioSearchTerm && filteredSearchScenarios.length > 0 && (
                  <ul className={`absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border ${cardBorder} rounded-md shadow-lg max-h-60 overflow-y-auto`}>
                    {filteredSearchScenarios.map((sc) => (
                      <li
                        key={sc}
                        onClick={(e) => {
                          e.preventDefault();
                          
                          if (!selectedScenarios.includes(sc)) {
                            setSelectedScenarios(prev => [...prev, sc]);
                          }
                          setScenarioSearchTerm(''); 
                        }}
                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${textColor}`}
                      >
                        {sc}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="relative grow sm:grow-0">
                <button 
                  onClick={() => setShowScenarioSelector(!showScenarioSelector)} 
                  className={`${inputBg} ${inputBorder} rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-${accentColor} flex items-center gap-1 min-w-[150px] justify-between w-full`}
                  title="Open/close dropdown to select or deselect scenarios for filtering"
                >
                  <span>{selectedScenarios.length === 0 ? 'All Scenarios' : selectedScenarios.length === 1 ? selectedScenarios[0] : `${selectedScenarios.length} Scenarios Selected`}</span>
                  {showScenarioSelector ? <ChevronUp size={16} /> : <ChevronDown size={16} />} 
                </button>
                {}
                {showScenarioSelector && (
                  <div className={`absolute z-20 mt-1 w-64 ${cardBg} border ${cardBorder} rounded-md shadow-lg max-h-72 overflow-y-auto`}>
                    <ul className="p-2 space-y-1">
                      {}
                      {sortedDropdownScenarios.map((sc) => (
                        <li key={sc}>
                          <label className={`flex items-center gap-2 p-1.5 rounded cursor-pointer ${mutedTextColor} hover:bg-gray-700 dark:hover:bg-gray-600`}>
                            <input 
                              type="checkbox"
                              checked={selectedScenarios.includes(sc)}
                              onChange={(e) => handleScenarioSelectionChange(sc, e.target.checked)}
                              className={`form-checkbox h-4 w-4 text-${accentColor} bg-${inputBg} border-${inputBorder} rounded focus:ring-${accentColor}`}
                            />
                            <span className="text-sm">{sc}</span>
                          </label>
                        </li>
                      ))}
                      {uniqueScenarios.length === 0 && (
                        <li className={`px-2 py-1 text-xs italic ${mutedTextColor}`}>No scenarios logged yet.</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 w-full lg:w-auto justify-center lg:justify-end">
                {viewMode === 'area' && (
                    <div className={`flex items-center gap-2 border-r-0 lg:border-r ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} lg:dark:border-gray-500 pr-0 lg:pr-4 mb-2 lg:mb-0 w-full justify-center`}>
                         <History size={16} className={`${mutedTextColor}`} />
                         {(['7d', '30d', 'all'] as const).map(period => (
                            <button key={period} onClick={(e) => {
                              e.preventDefault();
                              setChartTimePeriod(period);
                            }} className={`px-2 py-0.5 rounded text-xs transition-colors ${ chartTimePeriod === period ? `bg-${accentColor} text-white shadow-sm` : `${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${theme === 'dark' ? mutedTextColor : 'text-gray-800'}` }`}
                               title={`Filter charts and period stats to show data from the last ${period === '7d' ? '7 days' : period === '30d' ? '30 days' : 'all time'}`}
                            >
                                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : 'All Time'}
                            </button>
                         ))}
                    </div>
                )}
                <div className={`flex items-center p-0.5 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} w-full sm:w-auto justify-center`}>
                    <button onClick={(e) => {
                      e.preventDefault();
                      setViewMode('list');
                    }} className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-all ${ viewMode === 'list' ? `bg-${accentColor} text-white shadow` : `${theme === 'dark' ? mutedTextColor : 'text-gray-800'} hover:text-${theme === 'dark' ? 'gray-100' : 'gray-900'} hover:bg-opacity-50 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-300'}` }`}
                       title="View benchmark history as a sortable list"
                    >
                        <List size={16} /> List
                    </button>
                    <button onClick={(e) => {
                      e.preventDefault();
                      setViewMode('area');
                    }} className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-all ${ viewMode === 'area' ? `bg-${accentColor} text-white shadow` : `${theme === 'dark' ? mutedTextColor : 'text-gray-800'} hover:text-${theme === 'dark' ? 'gray-100' : 'gray-900'} hover:bg-opacity-50 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-300'}` }`}
                        title="View score and accuracy trends over time as an area chart"
                    >
                        <BarChart2 size={16} /> Area
                    </button>
                    <button onClick={(e) => {
                      e.preventDefault();
                      setViewMode('spider');
                    }} className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-all ${ viewMode === 'spider' ? `bg-${accentColor} text-white shadow` : `${theme === 'dark' ? mutedTextColor : 'text-gray-800'} hover:text-${theme === 'dark' ? 'gray-100' : 'gray-900'} hover:bg-opacity-50 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-300'}` }`}
                        title="View score and accuracy stats (average, best, lowest) as spider/radar charts"
                    >
                        <Hexagon size={16} /> Spider
                    </button>
                </div>
            </div>
          </div>
          {viewMode === 'list' ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className={`${theme === 'dark' ? 'bg-gray-750' : 'bg-gray-100'}`}>
                    <tr>
                      {[
                        { key: 'scenario', responsive: '' },
                        { key: 'score', responsive: '' },
                        { key: 'accuracy', responsive: '' },
                        { key: 'difficulty', responsive: 'hidden sm:table-cell' },
                        { key: 'date', responsive: '' },
                      ].map((col) => (
                        <th
                          key={col.key}
                          className={`px-4 py-3 text-left text-xs font-medium ${mutedTextColor} uppercase tracking-wider cursor-pointer hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors ${col.responsive}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleSort(col.key as keyof BenchmarkScore);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {col.key.charAt(0).toUpperCase() + col.key.slice(1)} {getSortIcon(col.key as keyof BenchmarkScore)}
                          </div>
                        </th>
                      ))}
                      <th className={`px-4 py-3 text-left text-xs font-medium ${mutedTextColor} uppercase tracking-wider hidden md:table-cell`}>Notes</th>
                      <th className={`px-4 py-3 text-center text-xs font-medium ${mutedTextColor} uppercase tracking-wider`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {displayedBenchmarks.map((bench) => (
                      <tr key={bench.id.toString()} className={`${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-100'} transition-colors group`}>
                        <td
                          className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${headerColor} group-hover:text-${
                            theme === 'dark' ? 'teal-300' : 'teal-700'
                          } flex items-center gap-2`}
                        >
                          <Target size={14} className="opacity-70 flex-shrink-0" /> {bench.scenario}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${textColor} font-semibold`}>{bench.score.toLocaleString()}</td>
                        <td
                          className={`px-4 py-3 whitespace-nowrap text-sm ${
                            bench.accuracy >= 90
                              ? theme === 'dark'
                                ? 'text-green-400'
                                : 'text-green-600'
                              : bench.accuracy >= 80
                              ? theme === 'dark'
                                ? 'text-yellow-400'
                                : 'text-yellow-600'
                              : theme === 'dark'
                              ? 'text-orange-400'
                              : 'text-orange-600'
                          }`}
                        >
                          {bench.accuracy.toFixed(1)}%
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm hidden sm:table-cell`}>
                          <DifficultyBadge difficulty={bench.difficulty} theme={theme} />
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${mutedTextColor} flex items-center gap-1.5`}>
                          <Calendar size={14} />{' '}
                          {new Date(bench.date + 'T00:00:00').toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: '2-digit',
                          })}
                        </td>
                        <td className={`px-4 py-3 text-sm ${mutedTextColor} max-w-[150px] truncate hidden md:table-cell`} title={bench.notes}>
                          {bench.notes || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button 
                              onClick={(e) => {
                                e.preventDefault();
                                handleAddFavorite(bench.scenario);
                              }}
                              className={`p-1 rounded transition-colors mr-1 
                                  ${favorites.includes(bench.scenario) 
                                  ? 'text-yellow-500 opacity-70 cursor-default' 
                                  : 'text-gray-400 hover:text-yellow-500' 
                              }`}
                              title={favorites.includes(bench.scenario) 
                                  ? `${bench.scenario} is already a favorite` 
                                  : `Add ${bench.scenario} to favorites`}
                              disabled={favorites.includes(bench.scenario)} 
                          >
                              <Star size={16} fill={favorites.includes(bench.scenario) ? "currentColor" : "none"} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              handleCloneScore(bench.id);
                            }}
                            className={`p-1 rounded text-gray-400 hover:bg-blue-500 hover:text-white transition-colors mr-1`}
                            title={`Clone score for ${bench.scenario} on ${bench.date}`}
                          >
                            <Copy size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteScore(bench.id);
                            }}
                            className={`p-1 rounded text-gray-400 hover:bg-red-500 hover:text-white transition-colors`}
                            title={`Delete score for ${bench.scenario} on ${bench.date}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sortedAndFilteredBenchmarks.length === 0 && (
                      <tr>
                        {/* Adjust colspan based on hidden columns */}
                        <td colSpan={5} className={`text-center py-10 ${mutedTextColor} italic sm:hidden`}>
                          No benchmarks found {selectedScenarios.length > 0 ? `for selected scenarios` : ''}.
                        </td>
                        <td colSpan={6} className={`text-center py-10 ${mutedTextColor} italic hidden sm:table-cell md:hidden`}>
                          No benchmarks found {selectedScenarios.length > 0 ? `for selected scenarios` : ''}.
                        </td>
                        <td colSpan={7} className={`text-center py-10 ${mutedTextColor} italic hidden md:table-cell`}>
                          No benchmarks found {selectedScenarios.length > 0 ? `for selected scenarios` : ''}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {sortedAndFilteredBenchmarks.length > INITIAL_LIMIT && (
                  <div className={`flex justify-center items-center gap-3 p-4 border-t ${cardBorder}`}>
                      {displayLimit < sortedAndFilteredBenchmarks.length && (
                          <button 
                              onClick={handleShowMore}
                              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ${inputBg} border ${inputBorder} ${mutedTextColor} hover:bg-gray-700 dark:hover:bg-gray-600 hover:text-${accentColor} transition-colors`}
                              title={`Show the next ${SHOW_MORE_INCREMENT} entries in the list`}
                          >
                              <ListPlus size={16} /> Show More (+{SHOW_MORE_INCREMENT})
                          </button>
                      )}
                      {displayLimit < sortedAndFilteredBenchmarks.length && (
                          <button 
                              onClick={handleShowAll}
                              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ${inputBg} border ${inputBorder} ${mutedTextColor} hover:bg-gray-700 dark:hover:bg-gray-600 hover:text-${accentColor} transition-colors`}
                              title="Show all entries in the list"
                          >
                              <ListEnd size={16} /> Show All ({sortedAndFilteredBenchmarks.length})
                          </button>
                      )}
                       {displayLimit > INITIAL_LIMIT && (
                          <button 
                              onClick={handleShowDefault}
                              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ${inputBg} border ${inputBorder} ${mutedTextColor} hover:bg-gray-700 dark:hover:bg-gray-600 hover:text-${accentColor} transition-colors`}
                              title={`Show only the first ${INITIAL_LIMIT} entries in the list`}
                          >
                              <ListMinus size={16} /> Show Default ({INITIAL_LIMIT})
                          </button>
                      )}
                  </div>
              )}
            </>
          ) : viewMode === 'area' ? (
            <div className="p-4 md:p-6 h-[400px]">
              {chartFilteredBenchmarks.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaChartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartScoreColor} stopOpacity={0.7} />
                        <stop offset="95%" stopColor={chartScoreColor} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartAccColor} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={chartAccColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      stroke={chartTextColor}
                      fontSize={12}
                      type="number" 
                      domain={['dataMin', 'dataMax']} 
                    />
                    <YAxis yAxisId="left" stroke={chartTextColor} fontSize={12} domain={['auto', 'auto']} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke={chartTextColor}
                      fontSize={12}
                      domain={[0, 100]}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                        border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        color: textColor,
                      }}
                      labelFormatter={(ts) =>
                        new Date(ts).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      }
                      formatter={(value: unknown, name: string) => {
                        if (typeof value !== 'number' || isNaN(value)) return null;
                        if (name === 'Score') return [value.toLocaleString(), 'Score'];
                        if (name === 'Accuracy') return [`${value.toFixed(1)}%`, 'Accuracy'];
                        return null; 
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: chartTextColor }} />
                    
                    <Area type="monotone" dataKey="Score" stroke={chartScoreColor} fillOpacity={1} fill="url(#colorScore)" yAxisId="left" dot={{ r: 3, fill: chartScoreColor }} activeDot={{ r: 6, stroke: chartScoreColor }} connectNulls={false} />
                    <Area type="monotone" dataKey="Accuracy" stroke={chartAccColor} fillOpacity={1} fill="url(#colorAcc)" yAxisId="right" unit="%" dot={{ r: 3, fill: chartAccColor }} activeDot={{ r: 6, stroke: chartAccColor }} connectNulls={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                 <div className={`${mutedTextColor} h-full flex items-center justify-center italic`}>
                     Need at least 2 data points {selectedScenarios.length > 0 ? `for selected scenarios (${selectedScenarios.join(', ')})` : ''} 
                     {chartTimePeriod !== 'all' ? `in the last ${chartTimePeriod === '7d' ? 7 : 30} days` : ''} to show chart.
                 </div>
              )}
            </div>
          ) : viewMode === 'spider' ? (
            <div className="p-4 md:p-6 min-h-[400px]">
              {scenarioOrOverallStats && scenarioOrOverallStats.count > 0 ? (
                <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                  <div className="w-full md:w-1/2 h-[350px]">
                    <h4 className={`text-center font-semibold mb-2 ${textColor}`}>{scenarioOrOverallStats.scenarioName} - Score Stats</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={scoreSpiderData}>
                        <PolarGrid stroke={chartGridColor} />
                        <PolarAngleAxis dataKey="stat" stroke={chartTextColor} fontSize={11} tick={{ fill: chartTextColor }} />
                        <PolarRadiusAxis angle={90} domain={[0, 'auto']} stroke={chartTextColor} fontSize={10} />
                        <Radar name={scenarioOrOverallStats.scenarioName} dataKey="value" stroke={chartScoreColor} fill={chartScoreColor} fillOpacity={0.6} />
                        <Tooltip
                           contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                            border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                            borderRadius: '8px',
                            color: textColor,
                          }}
                          formatter={(value: unknown, name: string, props) => {
                            if (typeof value !== 'number' || isNaN(value)) return null;
                            return [value.toLocaleString(), props.payload?.stat || 'Score'];
                          }}
                          labelFormatter={() => ''} 
                        />
                         <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px', color: chartTextColor }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/2 h-[350px]">
                     <h4 className={`text-center font-semibold mb-2 ${textColor}`}>{scenarioOrOverallStats.scenarioName} - Accuracy Stats</h4>
                     <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={accuracySpiderData}>
                        <PolarGrid stroke={chartGridColor} />
                        <PolarAngleAxis dataKey="stat" stroke={chartTextColor} fontSize={11} tick={{ fill: chartTextColor }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} stroke={chartTextColor} fontSize={10} />
                        <Radar name={scenarioOrOverallStats.scenarioName} dataKey="value" stroke={chartAccColor} fill={chartAccColor} fillOpacity={0.6} />
                         <Tooltip
                           contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                            border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                            borderRadius: '8px',
                            color: textColor,
                          }}
                           formatter={(value: unknown, name: string, props) => {
                            if (typeof value !== 'number' || isNaN(value)) return null;
                            return [`${(value as number).toFixed(1)}%`, props.payload?.stat || 'Accuracy'];
                          }}
                          labelFormatter={() => ''} 
                        />
                         <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px', color: chartTextColor }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className={`${mutedTextColor} h-full flex items-center justify-center italic`}>
                  No data available {selectedScenarios.length > 0 ? `for selected scenarios`: ''} to display stats.
                </div>
              )}
            </div>
          ) : null}
        </main>

        <section className={`${cardBg} rounded-xl border ${cardBorder} shadow-lg p-5`}> 
          <h3 className={`text-xl font-semibold ${headerColor} mb-4 flex items-center gap-2`}>
            <BrainCircuit size={20} /> AI Coach
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <div>
                <label className={`block text-sm ${mutedTextColor} mb-1 font-medium`}>AI API Key (Optional)</label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="Enter your AI provider API key"
                  className={`w-full ${inputBg} ${inputBorder} p-2 rounded border text-sm focus:outline-none focus:ring-1 focus:ring-${accentColor}`}
                />
                <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">Your key is stored locally in this session.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto md:self-start">
                <button
                  onClick={handleAiAnalysis}
                  disabled={!aiApiKey || isAnalyzing}
                  className={`flex items-center justify-center gap-2 flex-grow bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={!aiApiKey ? "Enter an AI API key to enable analysis" : "Analyze the performance based on current filters using the AI Coach"}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <BrainCircuit size={16} /> Analyze Performance
                    </>
                  )}
                </button>
                <button
                  onClick={handleCopyPrompt}
                  className={`flex items-center justify-center gap-2 flex-grow bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md`}
                  title="Copy the system prompt and user data prompt (based on current filters) to the clipboard for use elsewhere"
                >
                  <Copy size={16} /> {promptCopied ? 'Copied!' : 'Copy Prompt'}
                </button>
              </div>
            </div>
            <div
              className={`${theme === 'dark' ? 'bg-gray-750' : 'bg-gray-100'} p-4 rounded-lg border ${
                theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
              } min-h-[100px] flex flex-col`}
            >
              <h4 className={`font-semibold ${textColor} mb-2`}>Recommendations:</h4>
              <div 
                className={`prose prose-sm dark:prose-invert max-w-none flex-grow ${ 
                  aiRecommendations.startsWith('Enter') || aiRecommendations.startsWith('Please') || aiRecommendations.startsWith('Failed')
                    ? 'text-gray-500 dark:text-gray-600 italic' 
                    : mutedTextColor
                } prose-p:mb-3`}
              >
                 <ReactMarkdown>{aiRecommendations}</ReactMarkdown>
              </div>
            </div>
          </div>
        </section>

        <footer className={`mt-10 text-center ${mutedTextColor} text-sm`}>Keep grinding! Consistency is key.</footer>

        {showBulkAddModal && (
            <BulkAddModal 
                onClose={handleCloseBulkAdd} 
                onSubmit={handleBulkSubmit} 
                existingScenarios={uniqueScenarios} 
                benchmarks={benchmarks} 
                theme={theme}
                cardBg={cardBg}
                cardBorder={cardBorder}
                inputBg={inputBg}
                inputBorder={inputBorder}
                textColor={textColor}
                mutedTextColor={mutedTextColor}
                headerColor={headerColor}
                accentColor={accentColor}
            />
        )}
      </div>
    </div>
  );
} 




type BulkEntryRow = Omit<BenchmarkScore, 'id' | 'scenario'> & { tempId: number }; 

interface BulkAddModalProps {
  onClose: () => void;
  onSubmit: (newEntries: BenchmarkScore[]) => void;
  existingScenarios: string[];
  benchmarks: BenchmarkScore[]; 
  theme: Theme;
  cardBg: string;
  cardBorder: string;
  inputBg: string;
  inputBorder: string;
  textColor: string;
  mutedTextColor: string;
  headerColor: string;
  accentColor: string;
}

const BulkAddModal: React.FC<BulkAddModalProps> = ({ 
    onClose, 
    onSubmit, 
    existingScenarios, 
    benchmarks, 
    theme, 
    cardBg,
    cardBorder,
    inputBg,
    inputBorder,
    textColor,
    mutedTextColor,
    headerColor,
    accentColor 
}) => {
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [entriesByScenario, setEntriesByScenario] = useState<Record<string, BulkEntryRow[]>>({});
  const [searchTerm, setSearchTerm] = useState('');

  
  const filteredScenarios = useMemo(() => 
    existingScenarios.filter(sc => 
      sc.toLowerCase().includes(searchTerm.toLowerCase())
    ), [existingScenarios, searchTerm]);

  
  const getDefaultDifficulty = (scenario: string): BenchmarkScore['difficulty'] => {
    const latestEntry = benchmarks
      .slice()
      .reverse()
      .find(b => b.scenario.toLowerCase() === scenario.toLowerCase());
    return latestEntry ? latestEntry.difficulty : 'Medium';
  };

  
  const handleScenarioToggle = (scenario: string) => {
    setSelectedScenarios(prev => {
      const newSelection = prev.includes(scenario)
        ? prev.filter(s => s !== scenario)
        : [...prev, scenario];

      
      setEntriesByScenario(currentEntries => {
        const updatedEntries = {...currentEntries};
        if (newSelection.includes(scenario) && !updatedEntries[scenario]) {
          
          updatedEntries[scenario] = [{
            tempId: Date.now(),
            date: new Date().toISOString().split('T')[0],
            difficulty: getDefaultDifficulty(scenario),
            score: 0, 
            accuracy: 0,
            notes: ''
          }];
        } else if (!newSelection.includes(scenario)) {
          delete updatedEntries[scenario]; 
        }
        return updatedEntries;
      });

      return newSelection;
    });
  };

  
  const handleAddRow = (scenario: string) => {
    setEntriesByScenario(prev => ({
      ...prev,
      [scenario]: [
        ...(prev[scenario] || []),
        {
          tempId: Date.now(),
          date: new Date().toISOString().split('T')[0],
          difficulty: getDefaultDifficulty(scenario),
          score: 0,
          accuracy: 0,
          notes: ''
        }
      ]
    }));
  };

  
  const handleRemoveRow = (scenario: string, tempIdToRemove: number) => {
    setEntriesByScenario(prev => ({
        ...prev,
        [scenario]: prev[scenario]?.filter(row => row.tempId !== tempIdToRemove) || [],
    }));
  };

  
  const handleEntryChange = (
    scenario: string, 
    tempId: number, 
    field: keyof Omit<BulkEntryRow, 'tempId'>, 
    value: string 
  ) => {
    setEntriesByScenario(prev => {
      const updatedScenarioEntries = prev[scenario]?.map(row => {
        if (row.tempId === tempId) {
          let processedValue: string | number | BenchmarkScore['difficulty'] = value;
          
          if (field === 'score') {
            processedValue = parseInt(value) || 0;
          } else if (field === 'accuracy') {
            processedValue = parseFloat(value) || 0;
          }
          
          
          return { ...row, [field]: processedValue };
        }
        return row;
      });
      return {
        ...prev,
        [scenario]: updatedScenarioEntries || [],
      };
    });
  };

  
  const handleSubmit = () => {
    const newEntries: BenchmarkScore[] = [];
    const submissionTime = Date.now(); 
    let entryIndex = 0;

    selectedScenarios.forEach(scenario => {
      entriesByScenario[scenario]?.forEach(row => {
        
        if (row.score > 0 && row.accuracy > 0 && row.date && row.difficulty) {
          newEntries.push({
            id: submissionTime + entryIndex++, 
            scenario: scenario,
            score: Number(row.score),
            accuracy: Number(row.accuracy),
            date: row.date,
            difficulty: row.difficulty,
            notes: row.notes,
          });
        }
      });
    });

    if (newEntries.length === 0) {
        alert("No valid entries to submit. Please ensure Score and Accuracy are filled correctly.");
        return;
    }

    onSubmit(newEntries);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-start pt-16 z-50 overflow-y-auto"> 
      <div className={`${cardBg} rounded-xl shadow-2xl w-full max-w-4xl border ${cardBorder} max-h-[85vh] flex flex-col`}> 
        <div className={`p-4 border-b ${cardBorder} flex justify-between items-center sticky top-0 ${cardBg} z-10`}>
          <h2 className={`text-xl font-semibold ${headerColor} flex items-center gap-2`}><Library size={22} /> Bulk Add Benchmark Scores</h2>
          <button onClick={onClose} className={`p-1.5 rounded-full ${mutedTextColor} hover:bg-gray-700 dark:hover:bg-gray-600`} title="Close the bulk add modal">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-grow overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-1 flex flex-col gap-3">
                <h3 className={`text-sm font-semibold ${mutedTextColor}`}>1. Select Scenarios</h3>
                <input 
                    type="text"
                    placeholder="Search scenarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full ${inputBg} ${inputBorder} p-2 rounded border text-sm focus:outline-none focus:ring-1 focus:ring-${accentColor}`}
                />
                <div className={`border ${cardBorder} rounded-lg flex-grow overflow-y-auto max-h-60 pr-1`}>
                    {filteredScenarios.length > 0 ? filteredScenarios.map(sc => (
                        <label key={sc} className={`flex items-center gap-2 p-2 cursor-pointer ${mutedTextColor} hover:bg-gray-700 dark:hover:bg-gray-600 rounded`}>
                            <input 
                                type="checkbox" 
                                checked={selectedScenarios.includes(sc)}
                                onChange={() => handleScenarioToggle(sc)}
                                className={`form-checkbox h-4 w-4 text-${accentColor} bg-${inputBg} border-${inputBorder} rounded focus:ring-${accentColor}`}
                            />
                            {sc}
                        </label>
                    )) : (
                        <p className={`p-2 text-xs italic ${mutedTextColor}`}>No scenarios match &apos;{searchTerm}&apos;.</p>
                    )}
                </div>
            </div>

            <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
                <h3 className={`text-sm font-semibold ${mutedTextColor}`}>2. Enter Scores</h3>
                {selectedScenarios.length === 0 ? (
                    <p className={`text-xs italic ${mutedTextColor} mt-2`}>Select one or more scenarios from the left to start adding scores.</p>
                ) : (
                    <div className="flex-grow overflow-y-auto space-y-4 pr-1 max-h-[calc(85vh-250px)]">
                        {selectedScenarios.map(scenario => (
                            <div key={scenario} className={`${theme === 'dark' ? 'bg-gray-750' : 'bg-gray-100'} p-3 rounded-lg border ${cardBorder}`}>
                                <h4 className={`font-semibold ${textColor} mb-2 flex justify-between items-center`}> 
                                    {scenario}
                                    <button 
                                        onClick={() => handleAddRow(scenario)}
                                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-${accentColor} text-white hover:opacity-80`} 
                                        title={`Add another row for ${scenario}`}
                                    >
                                        <PlusCircle size={14} /> Add Row
                                    </button>
                                </h4>
                                <div className="space-y-2">
                                    {(entriesByScenario[scenario] || []).map((entry, index) => (
                                        <div key={entry.tempId} className="grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-3">
                                                {index === 0 && <label className={`block text-[10px] ${mutedTextColor} mb-0.5`}>Date</label>}
                                                <input type="date" value={entry.date} onChange={e => handleEntryChange(scenario, entry.tempId, 'date', e.target.value)} className={`w-full ${inputBg} ${inputBorder} p-1 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-${accentColor}`} />
                                            </div>
                                            <div className="col-span-2">
                                                {index === 0 && <label className={`block text-[10px] ${mutedTextColor} mb-0.5`}>Score</label>}
                                                <input type="number" value={entry.score} onChange={e => handleEntryChange(scenario, entry.tempId, 'score', e.target.value)} required className={`w-full ${inputBg} ${inputBorder} p-1 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-${accentColor}`} />
                                            </div>
                                            <div className="col-span-2">
                                                {index === 0 && <label className={`block text-[10px] ${mutedTextColor} mb-0.5`}>Acc %</label>}
                                                <input type="number" step="0.1" value={entry.accuracy} onChange={e => handleEntryChange(scenario, entry.tempId, 'accuracy', e.target.value)} required className={`w-full ${inputBg} ${inputBorder} p-1 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-${accentColor}`} />
                                            </div>
                                            <div className="col-span-2">
                                                {index === 0 && <label className={`block text-[10px] ${mutedTextColor} mb-0.5`}>Diff</label>}
                                                <select value={entry.difficulty} onChange={e => handleEntryChange(scenario, entry.tempId, 'difficulty', e.target.value as BenchmarkScore['difficulty'])} required className={`w-full ${inputBg} ${inputBorder} p-1 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-${accentColor}`}>
                                                    {['Easy', 'Medium', 'Hard', 'Insane'].map(d => <option key={d} value={d}>{d}</option>)} 
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                {index === 0 && <label className={`block text-[10px] ${mutedTextColor} mb-0.5`}>Notes</label>}
                                                <input type="text" value={entry.notes} onChange={e => handleEntryChange(scenario, entry.tempId, 'notes', e.target.value)} placeholder="Optional" className={`w-full ${inputBg} ${inputBorder} p-1 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-${accentColor}`} />
                                            </div>
                                            <div className="col-span-1 flex items-end justify-center">
                                                {(entriesByScenario[scenario]?.length ?? 0) > 1 && (
                                                    <button onClick={() => handleRemoveRow(scenario, entry.tempId)} className={`p-0.5 mt-3 rounded text-gray-400 hover:bg-red-500 hover:text-white`} title="Remove row">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <button 
                    type="button" 
                    onClick={() => handleAddRow(selectedScenarios[0])} 
                    className={`self-start mt-2 flex items-center gap-1.5 text-xs px-2 py-1 rounded ${inputBg} border ${inputBorder} ${mutedTextColor} hover:bg-gray-700 dark:hover:bg-gray-600 hover:text-${accentColor} transition-colors`}
                    title={selectedScenarios.length > 0 ? `Add another entry row for ${selectedScenarios[0]}` : 'Select a scenario first'}
                    disabled={selectedScenarios.length === 0} // Disable if no scenario is selected
                  >
                      <PlusCircle size={14} /> Add Entry
                  </button>
            </div>
        </div>

        <div className={`p-4 border-t ${cardBorder} flex justify-end items-center sticky bottom-0 ${cardBg} z-10`}>
            <button 
              onClick={onClose} 
              className={`px-4 py-2 rounded-lg text-sm ${mutedTextColor} hover:bg-gray-700 dark:hover:bg-gray-600 border ${cardBorder}`}
              title="Cancel bulk add and close the modal without saving"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={selectedScenarios.length === 0} 
              className={`flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
              title={selectedScenarios.length === 0 ? "Select at least one scenario to enable submission" : "Submit all valid entries entered in the form above"}
            >
              <CheckSquare size={18} /> Submit All Entries
            </button>
        </div>
      </div>
    </div>
  );
};

