// src/App.tsx
import { useState, useRef, useEffect } from 'react';
import ChatMessage from './components/ChatMessage';
import type { Message } from './components/ChatMessage';
import ReportView from './components/ReportView';
import type { AnalysisResult } from './types'; 
import './App.css';

// Define the states of our conversation
type ConversationState = 'WAITING_FOR_ADDRESS' | 'WAITING_FOR_DESCRIPTION' | 'WAITING_FOR_IMAGES' | 'ANALYZING' | 'DONE';

function App() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! To begin the fraud analysis, please provide the rental property's full address.", sender: 'ai' }
  ]);
  const [listingData, setListingData] = useState({ address: '', description: '', image_urls: [] as string[] });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [finalResult, setFinalResult] = useState<AnalysisResult | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>('WAITING_FOR_ADDRESS');
  const [messageId, setMessageId] = useState(2);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  const API_BASE_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    chatWindowRef.current?.scrollTo(0, chatWindowRef.current.scrollHeight);
  }, [messages, finalResult]);

  const addMessage = (text: string, sender: 'user' | 'ai') => {
    const newMessage: Message = { id: messageId, text, sender };
    setMessageId(prevId => prevId + 1);
    setMessages(prev => [...prev, newMessage]);
  };
  
  const startFullAnalysis = async () => {
    setIsLoading(true);
    setFinalResult(null);
    addMessage('Thank you. I have all the information. Starting the full analysis now... This may take a moment.', 'ai');

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
          setConversationState('DONE');

          if (data.status === 'COMPLETED') {
            setFinalResult(data.result);
          } else {
            addMessage('Sorry, the analysis failed.', 'ai');
          }
        }
      } catch (error) {
        // ... error handling ...
      }
    }, 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '' || isLoading) return;

    const userInput = inputValue;
    addMessage(userInput, 'user');
    setInputValue('');

    if (conversationState === 'WAITING_FOR_ADDRESS') {
      setListingData({ ...listingData, address: userInput });
      addMessage("Thank you. Now, please paste the listing's full description.", 'ai');
      setConversationState('WAITING_FOR_DESCRIPTION');
    } else if (conversationState === 'WAITING_FOR_DESCRIPTION') {
      setListingData({ ...listingData, description: userInput });
      addMessage("Great. Finally, please paste the image URLs, one per line.", 'ai');
      setConversationState('WAITING_FOR_IMAGES');
    } else if (conversationState === 'WAITING_FOR_IMAGES') {
      const urls = userInput.split('\n').filter(url => url.trim() !== '');
      setListingData({ ...listingData, image_urls: urls });
      setConversationState('ANALYZING');
      await startFullAnalysis();
    }
  };

  const getInputPlaceholder = () => {
    if (isLoading) return 'Analyzing...';
    switch (conversationState) {
      case 'WAITING_FOR_ADDRESS': return 'Enter the rental address...';
      case 'WAITING_FOR_DESCRIPTION': return 'Paste the description here...';
      case 'WAITING_FOR_IMAGES': return 'Paste image URLs here...';
      default: return 'Analysis complete.';
    }
  };

  return (
    <div className="chat-app">
      <div className="chat-window" ref={chatWindowRef}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {finalResult && <ReportView result={finalResult} />}
      </div>
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={getInputPlaceholder()}
          disabled={isLoading || conversationState === 'DONE'}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />
        <button type="submit" disabled={isLoading || conversationState === 'DONE'}>Send</button>
      </form>
    </div>
  );
}

export default App;