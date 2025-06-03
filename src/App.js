import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { format } from 'date-fns';
import './App.css';
import DW from './components/dw';

function App() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDW, setShowDW] = useState(false);
  const [flipped, setFlipped] = useState(Array(10).fill(false));
  const [progress, setProgress] = useState(0);
  const [learned, setLearned] = useState(() => {
    const savedLearned = localStorage.getItem('learnedWords');
    return savedLearned ? JSON.parse(savedLearned) : [];
  });
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    fetchDailyWords();
  }, []);

  useEffect(() => {
    const todayLearned = learned.filter(id => 
      words.some(word => word.id === id)
    );
    setProgress(todayLearned.length);
    localStorage.setItem('learnedWords', JSON.stringify(learned));
  }, [learned, words]);

  const fetchDailyWords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = format(new Date(), 'yyyy-MM-dd');
      console.log('Checking for date:', today);

      // Check connection to Supabase first
      const { error: connectionError } = await supabase
        .from('daily_words')
        .select('count')
        .limit(1);

      if (connectionError) {
        throw new Error('Unable to connect to the database. Please check your internet connection and try again.');
      }

      // First check if words exist for today and count them
      let { data: existingWords, error: existingError } = await supabase
        .from('daily_words')
        .select('*')
        .eq('date', today);

      console.log('Existing words count:', existingWords?.length);

      if (existingError) {
        throw new Error('Failed to fetch words. Please try again.');
      }

      // If we have exactly 10 words, use them
      if (existingWords && existingWords.length === 10) {
        console.log('Using existing words for today');
        setWords(existingWords);
        return;
      }

      // If we have any words for today but not 10, delete them all
      if (existingWords && existingWords.length > 0) {
        console.log('Deleting incomplete word set');
        await supabase
          .from('daily_words')
          .delete()
          .eq('date', today);
      }

      console.log('Fetching new words');
      
      // Get random words
      const { data: randomWords, error: randomError } = await supabase
        .from('words')
        .select('*');

      if (randomError) throw randomError;
      if (!randomWords || randomWords.length < 10) {
        throw new Error('Not enough words in the database');
      }

      // Randomly select exactly 10 words
      const shuffled = [...randomWords].sort(() => 0.5 - Math.random());
      const tenWords = shuffled.slice(0, 10);

      // Prepare new daily words
      const newDailyWords = tenWords.map(word => ({
        word: word.word,
        meaning: word.meaning,
        date: today
      }));

      console.log('Inserting exactly 10 new words');

      // Insert exactly 10 words
      const { error: insertError } = await supabase
        .from('daily_words')
        .insert(newDailyWords)
        .select();

      if (insertError) throw insertError;

      // Verify we have exactly 10 words
      const { data: finalWords } = await supabase
        .from('daily_words')
        .select('*')
        .eq('date', today);

      if (finalWords && finalWords.length === 10) {
        console.log('Successfully saved exactly 10 words');
        setWords(finalWords);
      } else {
        throw new Error('Failed to save exactly 10 words');
      }

    } catch (error) {
      console.error('Error in fetchDailyWords:', error);
      setError(error.message || 'An unexpected error occurred. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const speakWord = (word) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const nextCard = () => {
    if (currentCardIndex < words.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setFlipped(prev => {
        const newFlipped = [...prev];
        newFlipped[currentCardIndex + 1] = false;
        return newFlipped;
      });
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setFlipped(prev => {
        const newFlipped = [...prev];
        newFlipped[currentCardIndex - 1] = false;
        return newFlipped;
      });
    }
  };

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowRight') nextCard();
      if (e.key === 'ArrowLeft') prevCard();
      if (e.key === ' ') {
        const newFlipped = [...flipped];
        newFlipped[currentCardIndex] = !newFlipped[currentCardIndex];
        setFlipped(newFlipped);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentCardIndex, flipped]);

  if (loading) {
    return <div className="loading-container loading">Loading words...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <h1>Connection Error</h1>
        <p className="error-message">{error}</p>
        <button 
          className="retry-button" 
          onClick={() => {
            setLoading(true);
            setError(null);
            fetchDailyWords();
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Vocabulary Builder</h1>
      <p className="date">{format(new Date(), 'MMMM dd, yyyy')}</p>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{width: `${(progress/words.length) * 100}%`}}
        ></div>
      </div>
      <p className="progress-text">
        Words learned today: {progress} of {words.length}
      </p>
      
      <button 
        className="view-all-button"
        onClick={() => setShowDW(!showDW)}
      >
        {showDW ? 'Show Today\'s Words' : 'View Progress'}
      </button>

      {showDW ? (
        <DW />
      ) : (
        <div className="words-grid">
          {words.map((word, index) => (
            <div 
              key={word.id}
              className={`word-card ${flipped[index] ? 'flipped' : ''}`}
              onClick={() => {
                const newFlipped = [...flipped];
                newFlipped[index] = !newFlipped[index];
                setFlipped(newFlipped);
              }}
            >
              <div className="card-front">
                <h2>{word.word}</h2>
                <p className="tap-hint">Tap to reveal meaning</p>
                <button 
                  className="speak-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakWord(word.word);
                  }}
                >
                  🔊
                </button>
              </div>
              <div className="card-back">
                <p>{word.meaning}</p>
                <button 
                  className={`learn-button ${learned.includes(word.id) ? 'learned' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!learned.includes(word.id)) {
                      setLearned([...learned, word.id]);
                    }
                  }}
                >
                  {learned.includes(word.id) ? '✓ Learned' : 'Mark as Learned'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App; 