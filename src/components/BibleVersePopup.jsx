import { useState, useEffect } from 'react';
import { getRandomVerse } from '../services/bibleVerses';
import './BibleVersePopup.css';

function BibleVersePopup() {
  const [verse, setVerse] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showVerse = () => {
      const newVerse = getRandomVerse();
      setVerse(newVerse);
      setVisible(true);
      
      setTimeout(() => {
        setVisible(false);
      }, 15000);
    };
    
    showVerse();
    
    const interval = setInterval(showVerse, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const closeVerse = () => {
    setVisible(false);
  };

  if (!visible || !verse) return null;

  return (
    <div className="bible-verse-popup">
      <button className="verse-close-btn" onClick={closeVerse}>×</button>
      <div className="verse-content">
        <p className="verse-text">"{verse.text}"</p>
        <p className="verse-reference">- {verse.verse}</p>
      </div>
    </div>
  );
}

export default BibleVersePopup;
