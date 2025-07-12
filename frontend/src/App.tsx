// src/App.tsx
import { useState, useRef, useEffect } from 'react';
import ChatMessage, { Message } from './components/ChatMessage';
import ReportView from './components/ReportView';
import InputForm from './components/InputForm';
import type { AnalysisResult, ListingData } from './types';
import './App.css';

const initialMessages: Message[] = [
  { id: 1, text: "Hello! Please provide the listing details below to start the analysis.", sender: 'ai' }
];

function App() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [finalResult, setFinalResult] = useState<AnalysisResult | null>(null);
  
  // Use a ref for the message ID to ensure immediate updates
  const messageIdCounter = useRef(2); 
  const chatWindowRef = useRef<HTMLDivElement>(null);

  const API_BASE_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    chatWindowRef.current?.scrollTo(0, chatWindowRef.current.scrollHeight);
  }, [messages]);

  const addMessage = (text: string, sender: 'user' | 'ai') => {
    const newMessage: Message = { id: messageIdCounter.current, text, sender };
    messageIdCounter.current++; // Increment the counter immediately
    setMessages(prev => [...prev, newMessage]);
  };

  // --- NEW: Function to reset the entire application state ---
  const handleNewCheck = () => {
    setMessages(initialMessages);
    setFinalResult(null);
    setIsLoading(false);
    messageIdCounter.current = 2;
  };
  
  const startFullAnalysis = async (listingData: ListingData) => {
    setIsLoading(true);
    setFinalResult(null);

    // Don't reset messages, just add to the conversation
    addMessage('Thank you. Starting the full analysis now... This may take a moment.', 'ai');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/checks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingData) 
      });

      if (!response.ok) throw new Error('Failed to submit job');
      
      const data = await response.json();
      pollForResult(data.job_id);

    } catch (error) {
      console.error('Submission error:', error);
      setIsLoading(false);
      addMessage('Sorry, I couldn\'t connect to the analysis service.', 'ai');
    }
  };

  const pollForResult = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/checks/${jobId}`);
        const data = await response.json();

        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          clearInterval(interval);
          setIsLoading(false);

          if (data.status === 'COMPLETED') {
            setFinalResult(data.result);
          } else {
            const errorMessage = data.result?.error || 'An unknown error occurred on the backend.';
            addMessage(`Sorry, the analysis failed: ${errorMessage}`, 'ai');
          }
        }
      } catch (error) {
          console.error('Polling error:', error);
          clearInterval(interval);
          setIsLoading(false);
          addMessage('Sorry, there was an error processing your request.', 'ai');
      }
    }, 3000);
  };
  
  return (
    <div className="main-layout">
      <div className="chat-app">
        <div className="chat-window" ref={chatWindowRef}>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {/* Add a button to start over if the report is shown */}
          {finalResult && (
            <div className="new-check-container">
              <button onClick={handleNewCheck}>Start New Check</button>
            </div>
          )}
        </div>
        {/* Only show the input form if there is no final result yet */}
        {!finalResult && <InputForm onSubmit={startFullAnalysis} isLoading={isLoading} />}
      </div>

      <div className="report-panel">
        {finalResult ? (
          <ReportView result={finalResult} />
        ) : (
          <div className="report-placeholder">
            {isLoading ? 'Analysis in progress...' : 'The analysis report will appear here.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;