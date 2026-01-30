import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

interface GeminiTutorProps {
  apiKey?: string;
}

export const GeminiTutor: React.FC<GeminiTutorProps> = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // We rely on the global env API key
  const apiKey = process.env.API_KEY;

  const handleAsk = async () => {
    if (!question.trim() || !apiKey) return;
    setLoading(true);
    setAnswer('');
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = 'gemini-3-flash-preview';
      
      const response = await ai.models.generateContent({
        model,
        contents: `Explain this to a 3rd grader in 2 sentences: ${question}`,
      });
      
      setAnswer(response.text || "I couldn't find an answer, try again!");
    } catch (e) {
      console.error(e);
      setAnswer("Oops! I got a little confused. Ask me something else!");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 transition-all z-50 animate-bounce"
      >
        <span className="text-2xl">🤖</span> Ask Dr. Atom!
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border-4 border-indigo-200 z-50 overflow-hidden font-sans">
      <div className="bg-indigo-600 p-3 flex justify-between items-center">
        <h3 className="text-white font-bold flex items-center gap-2">
          <span>🤖</span> Dr. Atom
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-white font-bold hover:text-indigo-200">✕</button>
      </div>
      
      <div className="p-4 space-y-4">
        {answer ? (
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-900 text-sm leading-relaxed">
            {answer}
            <button 
              onClick={() => setAnswer('')} 
              className="block mt-2 text-indigo-600 text-xs font-bold underline"
            >
              Ask another question
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-600 text-sm">I know everything about matter! Ask me why ice melts or where rain goes!</p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Why is steam hot?"
              className="w-full p-2 border-2 border-indigo-100 rounded-lg focus:border-indigo-500 focus:outline-none text-sm resize-none h-20"
            />
            <button
              onClick={handleAsk}
              disabled={loading || !question.trim()}
              className="w-full bg-indigo-500 text-white py-2 rounded-lg font-bold hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Thinking...' : 'Ask!'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};