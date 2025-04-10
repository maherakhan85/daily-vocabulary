import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import './dw.css';

function DW() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const recordsPerPage = 10;

  useEffect(() => {
    fetchAllWords();
  }, []);

  const fetchAllWords = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_words')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      setWords(data);
      setTotalPages(Math.ceil(data.length / recordsPerPage));
      setLoading(false);
    } catch (error) {
      setError('Error fetching data: ' + error.message);
      setLoading(false);
    }
  };

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = words.slice(indexOfFirstRecord, indexOfLastRecord);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="dw-container">
      <h2>All Daily Words</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Word</th>
              <th>Meaning</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((word) => (
              <tr key={word.id}>
                <td>{word.word}</td>
                <td>{word.meaning}</td>
                <td>{new Date(word.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="pagination">
          <button 
            onClick={prevPage} 
            disabled={currentPage === 1}
            className="pagination-button"
          >
            ← Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={nextPage} 
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

export default DW;