"use client";

import { useState, useMemo, useEffect } from 'react';
import { Target, TrendingUp, Calendar, Star, Zap, ChevronDown, ChevronUp, Filter, X, PlusCircle, BrainCircuit, BarChart2, List, Save, Download, RefreshCw, Sun, Moon, Trash2, Copy, Library, CheckSquare } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAiCoachRecommendation } from '../lib/ai-coach'; // Import the new function
import ReactMarkdown from 'react-markdown'; // Import react-markdown

// Types

export type BenchmarkScore = {
  id: number;
  scenario: string;
  score: number;
  accuracy: number;
  date: string; // YYYY-MM-DD
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  notes?: string;
};

type Theme = 'light' | 'dark';

// Difficulty Badge Component

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

// Main Component

export default function AimTrackerPage() {
  // State
  const [benchmarks, setBenchmarks] = useState<BenchmarkScore[]>([]);
  const [sortKey, setSortKey] = useState<keyof BenchmarkScore | null>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterScenario, setFilterScenario] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newScore, setNewScore] = useState<Partial<BenchmarkScore>>({ date: new Date().toISOString().split('T')[0], difficulty: 'Medium' });
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [userGame, setUserGame] = useState('Valorant');
  const [userSensitivity, setUserSensitivity] = useState('0.35 @ 800 DPI');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState('Enter API key and analyze performance.');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);

  // Load benchmarks, favorites, and theme from localStorage on initial render
  useEffect(() => {
    // Load Benchmarks (existing logic)
    const storedBenchmarks = localStorage.getItem('aimBenchmarks');
    if (storedBenchmarks) {
      try {
        const parsedBenchmarks = JSON.parse(storedBenchmarks);
        if (Array.isArray(parsedBenchmarks) && parsedBenchmarks.every(b => typeof b.id === 'number')) {
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

    // REMOVE Templates Data from LocalStorage if it exists
    localStorage.removeItem('aimScenarioTemplates');

    // Load Favorites
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

    // Load Theme (existing logic)
    const storedTheme = localStorage.getItem('aimTheme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
        setTheme(storedTheme);
    }

  }, []);

  // Save benchmarks to localStorage whenever they change
  useEffect(() => {
    if (benchmarks.length > 0 || localStorage.getItem('aimBenchmarks')) {
      localStorage.setItem('aimBenchmarks', JSON.stringify(benchmarks));
    }
  }, [benchmarks]);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    console.log('Saving favorites to localStorage:', favorites);
    localStorage.setItem('aimFavorites', JSON.stringify(favorites));
  }, [favorites]);

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('aimTheme', theme);
    // Optional: Apply theme class to body or root element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Toggle theme
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // Unique scenarios
  const uniqueScenarios = useMemo(() => [...new Set(benchmarks.map((b) => b.scenario))].sort(), [benchmarks]);

  // Filter and sort benchmarks
  const sortedAndFilteredBenchmarks = useMemo(() => {
    let filtered = benchmarks;
    if (filterScenario) filtered = filtered.filter((b) => b.scenario === filterScenario);
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === undefined || valB === undefined) return 0;
      if (typeof valA === 'number' && typeof valB === 'number') return sortOrder === 'asc' ? valA - valB : valB - valA;
      if (typeof valA === 'string' && typeof valB === 'string') return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return 0;
    });
  }, [benchmarks, sortKey, sortOrder, filterScenario]);

  // Sorting handler
  const handleSort = (key: keyof BenchmarkScore) => {
    if (sortKey === key) setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  // Sort icon
  const getSortIcon = (key: keyof BenchmarkScore) => {
    if (sortKey !== key) return <ChevronDown size={14} className="opacity-30" />;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  // Add new score
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

  // Delete a single score entry
  const handleDeleteScore = (idToDelete: number) => {
    setBenchmarks((prev) => prev.filter((bench) => bench.id !== idToDelete));
    // If using localStorage, the useEffect for benchmarks would automatically save this change.
  };

  // Clone a score entry into the add form
  const handleCloneScore = (idToClone: number) => {
    const scoreToClone = benchmarks.find(bench => bench.id === idToClone);
    if (scoreToClone) {
      // Fix: Manually copy relevant properties, excluding id
      const clonedData: Partial<BenchmarkScore> = {
        scenario: scoreToClone.scenario,
        score: scoreToClone.score, // User will likely change this
        accuracy: scoreToClone.accuracy, // User will likely change this
        difficulty: scoreToClone.difficulty,
        notes: scoreToClone.notes, // Keep notes from original
        date: new Date().toISOString().split('T')[0] // Set date to today
      };
      setNewScore(clonedData);
      setShowAddForm(true); // Open the form
      // Optional: Scroll to the form if it's far down
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }
  };

  // Clear all benchmark history
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete ALL benchmark history? This cannot be undone.')) {
      setBenchmarks([]);
      // If using localStorage, the useEffect for benchmarks would automatically save this change.
    }
  };

  // Current stats
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

  // Chart data
  const chartData = useMemo(
    () =>
      sortedAndFilteredBenchmarks
        .map((b) => ({ date: new Date(b.date + 'T00:00:00').getTime(), Score: b.score, Accuracy: b.accuracy }))
        .sort((a, b) => a.date - b.date),
    [sortedAndFilteredBenchmarks]
  );

  // AI analysis simulation
  const handleAiAnalysis = async () => { // Make the function async
    if (!aiApiKey) {
      setAiRecommendations('Please enter an API key first.');
      return;
    }
    setIsAnalyzing(true);
    setAiRecommendations('Analyzing performance data...');

    // Prepare data for the prompt
    const recentBenchmarks = sortedAndFilteredBenchmarks.slice(0, 10); // Send recent history (last 10)
    
    // --- Replace Mock with Real API Call ---
    try {
        const recommendation = await getAiCoachRecommendation({
            apiKey: aiApiKey,
            userGame: userGame,
            userSensitivity: userSensitivity,
            filterScenario: filterScenario,
            currentStats: currentStats,
            recentBenchmarks: recentBenchmarks
        });
        setAiRecommendations(recommendation);
    } catch (error) {
        // Error handling is done within getAiCoachRecommendation, but catch here just in case
        console.error("Error calling getAiCoachRecommendation:", error);
        setAiRecommendations(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
        setIsAnalyzing(false);
    }
    // --- End Real API Call ---

    /* // --- MOCK IMPLEMENTATION START (Removed) ---
    console.log("--- AI Prompt ---");
    console.log("System:", systemPrompt);
    console.log("User:", userPrompt);
    setTimeout(() => {
      const MOCK_RECOMMENDATIONS = [
        `Okay, looking at your recent ${filterScenario || 'overall'} performance in ${userGame}:\n\nAnalysis: Your average accuracy of ${currentStats.avgAcc}% is solid, suggesting good control. Paired with an average score of ${currentStats.avgScore.toLocaleString()}, you seem to have a decent balance, maybe slightly prioritizing precision.\n\nIn-Game Context: This might mean you land initial shots well in ${userGame}, but could potentially be faster on follow-ups or target switches.\n\nSuggestion: Let's try pushing the speed slightly in scenarios like ${filterScenario || 'Gridshot'}. Aim to increase your score by 3-5% while keeping accuracy above ${Math.max(85, currentStats.avgAcc - 2)}%. If accuracy dips, ease off the speed until it stabilizes.`,        
        `Got your ${filterScenario || 'overall'} scores for ${userGame}.\n\nAnalysis: With a best score of ${currentStats.bestScore.toLocaleString()} but an average accuracy around ${currentStats.avgAcc}%, it seems you might be pushing speed aggressively, sometimes sacrificing control. Check the consistency in recent scores for ${filterScenario || 'the main scenario'}.\n\nIn-Game Context: In ${userGame}, this could lead to whiffed sprays or missing crucial shots when flicking quickly under pressure.\n\nSuggestion: Focus on consistency. Set a target accuracy of ${Math.min(95, currentStats.avgAcc + 3)}% for your next few sessions, even if it means a slightly lower score initially. Smoothness and control first, then speed.`,
      ];
      setAiRecommendations(MOCK_RECOMMENDATIONS[Math.floor(Math.random() * MOCK_RECOMMENDATIONS.length)]);
      setIsAnalyzing(false);
    }, 1500);
    // --- MOCK IMPLEMENTATION END --- */

    /* // --- REAL API CALL (Now handled by getAiCoachRecommendation) --- */ // Corrected comment

  }; // End of handleAiAnalysis

  // Export PDF
  const handleExportPdf = () => { // Keep the original handleExportPdf, remove the misplaced one
    const doc = new jsPDF();
    const margin = 15;
    let yPos = margin;

    // Use new color for header text in PDF (RGB for #A1E0D3)
    doc.setFontSize(18);
    doc.setTextColor(161, 224, 211); // New Color #A1E0D3
    doc.text('Aim Training Benchmark Report', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(`Game: ${userGame}`, margin, yPos);
    doc.text(`Sensitivity: ${userSensitivity}`, margin + 70, yPos);
    yPos += 10;

    doc.text(`Scenario Filter: ${filterScenario || 'All'}`, margin, yPos);
    yPos += 15;

    // Use new color for section headers in PDF
    doc.setFontSize(14);
    doc.setTextColor(161, 224, 211); // New Color #A1E0D3
    doc.text(`Stats (${filterScenario || 'All Scenarios'})`, margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(`- Avg Score: ${currentStats.avgScore.toLocaleString()}`, margin, yPos);
    doc.text(`- Avg Accuracy: ${currentStats.avgAcc}%`, margin + 70, yPos);
    yPos += 7;

    doc.text(`- Best Score: ${currentStats.bestScore.toLocaleString()}`, margin, yPos);
    doc.text(`- Entries: ${currentStats.count}`, margin + 70, yPos);
    yPos += 15;

    // Use new color for section headers in PDF
    doc.setFontSize(14);
    doc.setTextColor(161, 224, 211); // New Color #A1E0D3
    doc.text('AI Coach Recommendation', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const splitRec = doc.splitTextToSize(aiRecommendations, doc.internal.pageSize.width - margin * 2);
    doc.text(splitRec, margin, yPos);
    yPos += splitRec.length * 5 + 10;

    // Use new color for section headers in PDF
    doc.setFontSize(14);
    doc.setTextColor(161, 224, 211); // New Color #A1E0D3
    doc.text(`Benchmark History (${filterScenario || 'All'})`, margin, yPos);
    yPos += 8;

    // Use new color for table header fill in PDF
    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Scenario', 'Score', 'Accuracy', 'Difficulty']],
      body: sortedAndFilteredBenchmarks.map((b) => [b.date, b.scenario, b.score.toLocaleString(), `${b.accuracy}%`, b.difficulty]),
      theme: 'grid',
      headStyles: { fillColor: [161, 224, 211] }, // New Color #A1E0D3
      bodyStyles: { textColor: [51, 51, 51] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`aim_benchmark_report_${filterScenario || 'all'}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Quick add handler for favorites
  const handleQuickAdd = (scenario: string) => {
    // Find the latest difficulty used for this scenario
    const latestEntry = benchmarks
      .slice()
      .reverse()
      .find(b => b.scenario.toLowerCase() === scenario.toLowerCase());
    
    const difficulty = latestEntry ? latestEntry.difficulty : 'Medium'; // Default if not found

    setNewScore({
      scenario,
      difficulty,
      date: new Date().toISOString().split('T')[0],
      // Reset score and accuracy for the new entry
      score: undefined,
      accuracy: undefined,
      notes: '', // Clear notes
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  // Add scenario to favorites
  const handleAddFavorite = (scenario: string) => {
    if (scenario && !favorites.includes(scenario)) {
      setFavorites(prev => [...prev, scenario].sort()); // Add and keep sorted
    }
  };

  // Remove scenario from favorites
  const handleRemoveFavorite = (scenarioToRemove: string) => {
    setFavorites(prev => prev.filter(fav => fav !== scenarioToRemove));
  };

  // Theme colors
  const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
  const textColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-700';
  const mutedTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const cardBorder = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const inputBg = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100';
  const inputBorder = theme === 'dark' ? 'border-gray-600' : 'border-gray-300';
  const headerColor = 'text-[#A1E0D3]'; // New Color
  const accentColor = theme === 'dark' ? 'teal-400' : 'teal-600';
  const chartGridColor = theme === 'dark' ? '#4b5563' : '#d1d5db';
  const chartTextColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const chartScoreColor = theme === 'dark' ? '#2dd4bf' : '#0d9488';
  const chartAccColor = theme === 'dark' ? '#fbbf24' : '#f59e0b';

  // Handler to open the bulk add modal
  const handleOpenBulkAdd = () => {
    setShowBulkAddModal(true);
  };

  // Handler to close the bulk add modal
  const handleCloseBulkAdd = () => {
    setShowBulkAddModal(false);
    // Reset bulk add form state here if needed
  };

  // Handler to process submitted bulk data (will be implemented later)
  const handleBulkSubmit = (newEntries: BenchmarkScore[]) => {
    setBenchmarks(prev => [...newEntries, ...prev]); // Add new entries to the beginning
    handleCloseBulkAdd();
  };

  return (
    <div className={`${theme} font-sans transition-colors duration-300`}>
      <div className={`${bgColor} ${textColor} min-h-screen p-4 md:p-8`}> 
        <header className="mb-6 md:mb-10 flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className={`text-3xl md:text-4xl font-bold ${headerColor} flex items-center gap-3 mb-2`}>
              <Target size={36} /> Aim Benchmark Tracker
            </h1>
            <p className={`${mutedTextColor} text-sm ml-1`}>Game: <input type="text" value={userGame} onChange={(e) => setUserGame(e.target.value)} placeholder="Game" className={`${inputBg} ${inputBorder} text-xs p-1 rounded border w-20 focus:outline-none focus:ring-1 focus:ring-${accentColor} mx-1`} /> Sensitivity: <input type="text" value={userSensitivity} onChange={(e) => setUserSensitivity(e.target.value)} placeholder="Sensitivity" className={`${inputBg} ${inputBorder} text-xs p-1 rounded border w-28 focus:outline-none focus:ring-1 focus:ring-${accentColor} ml-1`} /></p>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={handleExportPdf} className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md h-10 mt-1`}>
              <Download size={16} /> Export PDF
            </button>
            <button 
              onClick={handleClearAll}
              className={`flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md h-10 mt-1 disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={benchmarks.length === 0} // Disable if no history
              title="Delete all benchmark history"
            >
              <Trash2 size={16} /> Clear History
            </button>
            <button onClick={toggleTheme} className={`p-2 rounded-lg ${cardBg} border ${cardBorder} ${mutedTextColor} hover:text-${accentColor} transition-colors h-10 mt-1`}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Favorites Bar - Add this section */}
        <section className="mb-6">
          <h2 className={`text-sm font-semibold ${mutedTextColor} mb-2 flex items-center gap-1.5`}>
            <Star size={16} className="text-yellow-500" /> Favorites (Quick Add)
          </h2>
          <div className="flex flex-wrap gap-2 min-h-[36px]"> {/* Added min-height */}
            {favorites.length > 0 ? (
              favorites.map(favScenario => (
                <div key={favScenario} className={`relative group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${cardBg} border ${cardBorder} ${textColor} hover:border-${accentColor} hover:text-${accentColor} transition-colors shadow-sm cursor-pointer`}>
                  <span onClick={() => handleQuickAdd(favScenario)} title={`Quick add ${favScenario}`}>{favScenario}</span>
                  {/* Remove Favorite Button */}
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
              // Show message when no favorites
              <p className={`text-xs italic ${mutedTextColor} flex items-center h-full`}>No favorites added yet. Use the star icon next to the filter.</p>
            )}
          </div>
        </section>

        <section className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, label: 'Avg Score', value: currentStats.avgScore.toLocaleString() },
            { icon: Zap, label: 'Avg Accuracy', value: `${currentStats.avgAcc}%` },
            { icon: Star, label: 'Best Score', value: currentStats.bestScore.toLocaleString() },
            { icon: Calendar, label: 'Entries', value: currentStats.count },
          ].map((stat) => (
            <div key={stat.label} className={`${cardBg} p-4 rounded-xl border ${cardBorder} shadow-lg flex flex-col justify-between`}>
              <h3 className={`text-xs font-medium ${mutedTextColor} mb-1 flex items-center gap-1.5`}>
                <stat.icon size={14} /> {stat.label} <span className="text-gray-500 dark:text-gray-600 text-[10px]">({filterScenario || 'All'})</span>
              </h3>
              <p className={`text-xl md:text-2xl font-bold ${textColor} truncate`}>{stat.value}</p>
            </div>
          ))}
        </section>

        <div className="mb-6 flex justify-end gap-3"> {/* Added gap-3 */}
          {/* Add Bulk Add Button */}
          <button
            onClick={handleOpenBulkAdd}
            className={`flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md`}
          >
            <Library size={18} /> Bulk Add
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`flex items-center gap-2 bg-${accentColor} hover:bg-${theme === 'dark' ? 'teal-500' : 'teal-700'} text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md`}
          >
            {showAddForm ? <X size={18} /> : <PlusCircle size={18} />} {showAddForm ? 'Cancel Entry' : 'Add New Score'}
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddScore}
            className={`${cardBg} rounded-lg border ${cardBorder} grid grid-cols-1 md:grid-cols-3 gap-4 shadow-lg mb-6 p-4`}
          >
            <h3 className={`col-span-full text-lg font-semibold mb-2 ${headerColor}`}>Log New Benchmark</h3>
            
            {/* Form fields - Reset spans if needed */}
            {[ 
              // Reset spans to original if they were changed
              { label: 'Scenario', key: 'scenario', type: 'text', list: 'scenarios' },
              { label: 'Difficulty', key: 'difficulty', type: 'select' },
              { label: 'Score', key: 'score', type: 'number' },
              { label: 'Accuracy (%)', key: 'accuracy', type: 'number', step: 0.1 },
              { label: 'Date', key: 'date', type: 'date' },
              { label: 'Notes (Optional)', key: 'notes', type: 'text', span: 2 }, // Keep span 2 for notes
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
                      <option key={d} value={d}>
                        {d}
                      </option>
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
                        [f.key]:
                          f.type === 'number'
                            ? f.step
                              ? parseFloat(value) || 0 // Ensure number conversion
                              : parseInt(value) || 0   // Ensure number conversion
                            : value,
                      };

                      // Smart Default: If changing scenario, find last difficulty used for it
                      if (f.key === 'scenario') {
                        const latestEntry = benchmarks
                          .slice() // Create a shallow copy to avoid mutating original
                          .reverse() // Look from newest to oldest
                          .find(b => b.scenario.toLowerCase() === value.toLowerCase());
                        
                        if (latestEntry) {
                          updatedScore.difficulty = latestEntry.difficulty;
                        }
                        // If no match found, difficulty remains as it was (default or previously set)
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
              >
                <Save size={18} /> Save Score
              </button>
            </div>
          </form>
        )}

        <main className={`${cardBg} rounded-xl shadow-xl overflow-hidden border ${cardBorder} mb-8`}>
          <div className={`p-4 md:p-5 border-b ${cardBorder} flex flex-wrap justify-between items-center gap-4`}>
            <div className="flex items-center gap-2">
              <Filter size={18} className={`${mutedTextColor}`} />
              <select
                value={filterScenario}
                onChange={(e) => setFilterScenario(e.target.value)}
                className={`${inputBg} ${inputBorder} rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-${accentColor} max-w-[150px] md:max-w-xs`}
              >
                <option value="">All Scenarios</option>
                {uniqueScenarios.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
              {/* Clear Filter Button */}
              {filterScenario && (
                <button
                  onClick={() => setFilterScenario('')}
                  className={`p-1.5 ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'} rounded-md`}
                  title="Clear filter"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className={`flex items-center gap-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} p-1 rounded-lg`}>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${
                  viewMode === 'list' ? `bg-${accentColor} text-white shadow` : `${mutedTextColor} hover:bg-gray-600 dark:hover:bg-gray-500`
                }`}
              >
                <List size={16} /> List
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${
                  viewMode === 'chart' ? `bg-${accentColor} text-white shadow` : `${mutedTextColor} hover:bg-gray-600 dark:hover:bg-gray-500`
                }`}
              >
                <BarChart2 size={16} /> Chart
              </button>
            </div>
          </div>
          {viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className={`${theme === 'dark' ? 'bg-gray-750' : 'bg-gray-100'}`}>
                  <tr>
                    {['scenario', 'score', 'accuracy', 'difficulty', 'date'].map((key) => (
                      <th
                        key={key}
                        className={`px-4 py-3 text-left text-xs font-medium ${mutedTextColor} uppercase tracking-wider cursor-pointer hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors`}
                        onClick={() => handleSort(key as keyof BenchmarkScore)}
                      >
                        <div className="flex items-center gap-1">
                          {key.charAt(0).toUpperCase() + key.slice(1)} {getSortIcon(key as keyof BenchmarkScore)}
                        </div>
                      </th>
                    ))}
                    <th className={`px-4 py-3 text-left text-xs font-medium ${mutedTextColor} uppercase tracking-wider`}>Notes</th>
                    <th className={`px-4 py-3 text-center text-xs font-medium ${mutedTextColor} uppercase tracking-wider`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {sortedAndFilteredBenchmarks.map((bench) => (
                    <tr key={bench.id} className={`${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-100'} transition-colors group`}>
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
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
                      <td className={`px-4 py-3 text-sm ${mutedTextColor} max-w-[150px] truncate`} title={bench.notes}>
                        {bench.notes || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {/* Add Favorite Button per Row */}
                        <button 
                            onClick={favorites.includes(bench.scenario) ? undefined : () => handleAddFavorite(bench.scenario)}
                            className={`p-1 rounded transition-colors mr-1 
                                ${favorites.includes(bench.scenario) 
                                ? 'text-yellow-500 opacity-70 cursor-default' // Already favorite style
                                : 'text-gray-400 hover:text-yellow-500' // Not favorite style
                            }`}
                            title={favorites.includes(bench.scenario) 
                                ? `${bench.scenario} is already a favorite` 
                                : `Add ${bench.scenario} to favorites`}
                            disabled={favorites.includes(bench.scenario)} // Disable button if already favorite
                        >
                            <Star size={16} fill={favorites.includes(bench.scenario) ? "currentColor" : "none"} /> {/* Fill star if favorite */}
                        </button>
                        {/* Clone button */}
                        <button 
                          onClick={() => handleCloneScore(bench.id)}
                          className={`p-1 rounded text-gray-400 hover:bg-blue-500 hover:text-white transition-colors mr-1`}
                          title={`Clone score for ${bench.scenario} on ${bench.date}`}
                        >
                          <Copy size={16} />
                        </button>
                        {/* Delete button */}
                        <button 
                          onClick={() => handleDeleteScore(bench.id)}
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
                      <td colSpan={7} className={`text-center py-10 ${mutedTextColor} italic`}>
                        No benchmarks found {filterScenario ? `for ${filterScenario}` : ''}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 md:p-6 h-[400px]">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                  >
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
                    />
                    <YAxis yAxisId="left" stroke={chartTextColor} fontSize={12} />
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
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: chartTextColor }} />
                    <Area
                      type="monotone"
                      dataKey="Score"
                      stroke={chartScoreColor}
                      fillOpacity={1}
                      fill="url(#colorScore)"
                      yAxisId="left"
                      dot={{ r: 3, fill: chartScoreColor }}
                      activeDot={{ r: 6, stroke: chartScoreColor }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Accuracy"
                      stroke={chartAccColor}
                      fillOpacity={1}
                      fill="url(#colorAcc)"
                      yAxisId="right"
                      unit="%"
                      dot={{ r: 3, fill: chartAccColor }}
                      activeDot={{ r: 6, stroke: chartAccColor }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className={`${mutedTextColor} h-full flex items-center justify-center italic`}>Need at least 2 data points {filterScenario ? `for ${filterScenario}` : ''} to show chart.</div>
              )}
            </div>
          )}
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
              <button
                onClick={handleAiAnalysis}
                disabled={!aiApiKey || isAnalyzing}
                className={`flex items-center justify-center gap-2 w-full md:w-auto md:self-start bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
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

        {/* Bulk Add Modal */} 
        {showBulkAddModal && (
            <BulkAddModal 
                onClose={handleCloseBulkAdd} 
                onSubmit={handleBulkSubmit} 
                existingScenarios={uniqueScenarios} 
                benchmarks={benchmarks} // Pass benchmarks to find last difficulty
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
  ); // End of the main return statement
} // End of AimTrackerPage component

// --- Bulk Add Modal Component ---

// Define the type for a single entry row within the bulk modal
type BulkEntryRow = Omit<BenchmarkScore, 'id' | 'scenario'> & { tempId: number }; // Use tempId for list keys

interface BulkAddModalProps {
  onClose: () => void;
  onSubmit: (newEntries: BenchmarkScore[]) => void;
  existingScenarios: string[];
  benchmarks: BenchmarkScore[]; // Needed for default difficulty
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

  // Filter scenarios based on search term
  const filteredScenarios = useMemo(() => 
    existingScenarios.filter(sc => 
      sc.toLowerCase().includes(searchTerm.toLowerCase())
    ), [existingScenarios, searchTerm]);

  // Get default difficulty for a scenario
  const getDefaultDifficulty = (scenario: string): BenchmarkScore['difficulty'] => {
    const latestEntry = benchmarks
      .slice()
      .reverse()
      .find(b => b.scenario.toLowerCase() === scenario.toLowerCase());
    return latestEntry ? latestEntry.difficulty : 'Medium';
  };

  // Toggle scenario selection
  const handleScenarioToggle = (scenario: string) => {
    setSelectedScenarios(prev => {
      const newSelection = prev.includes(scenario)
        ? prev.filter(s => s !== scenario)
        : [...prev, scenario];

      // Add/Remove scenario entry array
      setEntriesByScenario(currentEntries => {
        const updatedEntries = {...currentEntries};
        if (newSelection.includes(scenario) && !updatedEntries[scenario]) {
          // Add initial empty row when selecting
          updatedEntries[scenario] = [{
            tempId: Date.now(),
            date: new Date().toISOString().split('T')[0],
            difficulty: getDefaultDifficulty(scenario),
            score: 0, // Use 0 or undefined? 0 might be safer for controlled inputs
            accuracy: 0,
            notes: ''
          }];
        } else if (!newSelection.includes(scenario)) {
          delete updatedEntries[scenario]; // Remove entries when deselecting
        }
        return updatedEntries;
      });

      return newSelection;
    });
  };

  // Add a new row for a specific scenario
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

  // Remove a row for a specific scenario
  const handleRemoveRow = (scenario: string, tempIdToRemove: number) => {
    setEntriesByScenario(prev => ({
        ...prev,
        [scenario]: prev[scenario]?.filter(row => row.tempId !== tempIdToRemove) || [],
    }));
  };

  // Update a specific field in a row - Corrected Definition and Logic
  const handleEntryChange = (
    scenario: string, 
    tempId: number, 
    field: keyof Omit<BulkEntryRow, 'tempId'>, // Use Omit to exclude tempId from keys
    value: string // Input event values are typically strings initially
  ) => {
    setEntriesByScenario(prev => {
      const updatedScenarioEntries = prev[scenario]?.map(row => {
        if (row.tempId === tempId) {
          let processedValue: string | number | BenchmarkScore['difficulty'] = value;
          // Type conversion based on field
          if (field === 'score') {
            processedValue = parseInt(value) || 0;
          } else if (field === 'accuracy') {
            processedValue = parseFloat(value) || 0;
          }
          // Difficulty is handled by select, value should be correct type
          // Date and Notes are strings
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

  // Prepare and submit data
  const handleSubmit = () => {
    const newEntries: BenchmarkScore[] = [];
    const submissionTime = Date.now(); // Base time for unique IDs
    let entryIndex = 0;

    selectedScenarios.forEach(scenario => {
      entriesByScenario[scenario]?.forEach(row => {
        // Basic validation: Ensure score and accuracy are numbers > 0
        if (row.score > 0 && row.accuracy > 0 && row.date && row.difficulty) {
          newEntries.push({
            id: submissionTime + entryIndex++, // Generate unique ID
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
        {/* Header */}
        <div className={`p-4 border-b ${cardBorder} flex justify-between items-center sticky top-0 ${cardBg} z-10`}>
          <h2 className={`text-xl font-semibold ${headerColor} flex items-center gap-2`}><Library size={22} /> Bulk Add Benchmark Scores</h2>
          <button onClick={onClose} className={`p-1.5 rounded-full ${mutedTextColor} hover:bg-gray-700 dark:hover:bg-gray-600`}>
            <X size={20} />
          </button>
        </div>

        {/* Content Area (scrollable) */}
        <div className="p-6 flex-grow overflow-y-auto grid grid-cols-3 gap-6">
            {/* Left Column: Scenario Selection */}
            <div className="col-span-1 flex flex-col gap-3">
                <h3 className={`text-sm font-semibold ${mutedTextColor}`}>1. Select Scenarios</h3>
                <input 
                    type="text"
                    placeholder="Search scenarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full ${inputBg} ${inputBorder} p-2 rounded border text-sm focus:outline-none focus:ring-1 focus:ring-${accentColor}`}
                />
                <div className={`border ${cardBorder} rounded-lg flex-grow overflow-y-auto max-h-60 pr-1`}> {/* Scrollable scenario list */}
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

            {/* Right Column: Entry Forms */}
            <div className="col-span-2 flex flex-col gap-4">
                <h3 className={`text-sm font-semibold ${mutedTextColor}`}>2. Enter Scores</h3>
                {selectedScenarios.length === 0 && (
                    <p className={`text-xs italic ${mutedTextColor} mt-2`}>Select one or more scenarios from the left to start adding scores.</p>
                )}
                {/* Scrollable container for multiple scenario forms */}
                <div className="flex-grow overflow-y-auto space-y-4 pr-1 max-h-[calc(85vh-250px)]"> {/* Adjust max-h based on layout */}
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
                            {/* Table-like structure for entries */}
                            <div className="space-y-2">
                                {(entriesByScenario[scenario] || []).map((entry, index) => (
                                    <div key={entry.tempId} className="grid grid-cols-12 gap-2 items-center">
                                        {/* Date */}
                                        <div className="col-span-3">
                                            {index === 0 && <label className={`block text-[10px] ${mutedTextColor} mb-0.5`}>Date</label>}
                                            <input type="date" value={entry.date} onChange={e => handleEntryChange(scenario, entry.tempId, 'date', e.target.value)} className={`w-full ${inputBg} ${inputBorder} p-1 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-${accentColor}`} />
                                        </div>
                                        {/* Score */}
                                        <div className="col-span-2">
                                            {index === 0 && <label className={`block text-[10px] ${mutedTextColor} mb-0.5`}>Score</label>}
                                            <input type="number" value={entry.score} onChange={e => handleEntryChange(scenario, entry.tempId, 'score', e.target.value)} required className={`w-full ${inputBg} ${inputBorder} p-1 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-${accentColor}`} />
                                        </div>
                                        {/* Accuracy */}
                                        <div className="col-span-2">
                                            {index === 0 && <label className={`block text-[10px] ${mutedTextColor} mb-0.5`}>Acc %</label>}
                                            <input type="number" step="0.1" value={entry.accuracy} onChange={e => handleEntryChange(scenario, entry.tempId, 'accuracy', e.target.value)} required className={`w-full ${inputBg} ${inputBorder} p-1 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-${accentColor}`} />
                                        </div>
                                        {/* Difficulty */}
                                        <div className="col-span-2">
                                            {index === 0 && <label className={`block text-[10px] ${mutedTextColor} mb-0.5`}>Diff</label>}
                                            <select value={entry.difficulty} onChange={e => handleEntryChange(scenario, entry.tempId, 'difficulty', e.target.value as BenchmarkScore['difficulty'])} required className={`w-full ${inputBg} ${inputBorder} p-1 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-${accentColor}`}>
                                                {['Easy', 'Medium', 'Hard', 'Insane'].map(d => <option key={d} value={d}>{d}</option>)} 
                                            </select>
                                        </div>
                                        {/* Notes */}
                                        <div className="col-span-2">
                                            {index === 0 && <label className={`block text-[10px] ${mutedTextColor} mb-0.5`}>Notes</label>}
                                            <input type="text" value={entry.notes} onChange={e => handleEntryChange(scenario, entry.tempId, 'notes', e.target.value)} placeholder="Optional" className={`w-full ${inputBg} ${inputBorder} p-1 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-${accentColor}`} />
                                        </div>
                                        {/* Actions */}
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
            </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t ${cardBorder} flex justify-end gap-3 sticky bottom-0 ${cardBg} z-10`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm ${mutedTextColor} hover:bg-gray-700 dark:hover:bg-gray-600 border ${cardBorder}`}>Cancel</button>
          <button 
            onClick={handleSubmit}
            disabled={selectedScenarios.length === 0} // Disable if no scenarios selected
            className={`flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <CheckSquare size={18} /> Submit All Entries
          </button>
        </div>
      </div>
    </div>
  );
};