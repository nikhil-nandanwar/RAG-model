import { useState, useRef, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function RagChatScreen() {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [topK, setTopK] = useState(5);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!question.trim()) {
      return;
    }

    const userQuestion = question;
    setQuestion("");
    setLoading(true);

    // Add user message to chat
    const userMessage = {
      type: "question",
      content: userQuestion,
      timestamp: new Date().toLocaleTimeString(),
    };
    setChatHistory((prev) => [...prev, userMessage]);

    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userQuestion,
          top_k: topK,
          model: "gemini-2.0-flash-exp",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const answerMessage = {
          type: "answer",
          content: data.answer,
          timestamp: new Date().toLocaleTimeString(),
        };
        setChatHistory((prev) => [...prev, answerMessage]);
      } else {
        const errorMessage = {
          type: "error",
          content: data.error || "Failed to get answer",
          timestamp: new Date().toLocaleTimeString(),
        };
        setChatHistory((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage = {
        type: "error",
        content: `Error: ${error.message}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
  };

  return (
    <div className="w-1/2 h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-blue-100 flex justify-between p-4 shadow-md">
        <div>
          <h2 className="text-2xl font-bold">RAG Chat Assistant</h2>
          <p className="text-sm opacity-90">
            Ask questions about your uploaded documents
          </p>
        </div>

        {/* Settings */}
        <button
          onClick={handleClearChat}
          className="text-sm text-red-500 hover:text-red-700 underline pr-8 cursor-pointer"
        >
          Clear Chat
        </button>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {chatHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">
                Start by asking a question about your documents
              </p>
            </div>
          </div>
        ) : (
          chatHistory.map((message, index) => (
            <div key={index}>
              {message.type === "question" && (
                <div className="flex justify-end">
                  <div className="bg-blue-500 text-white rounded-lg p-3 max-w-[80%] shadow">
                    <p className="text-sm">{message.content}</p>                   
                  </div>
                </div>
              )}

              {message.type === "answer" && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg p-3 max-w-[80%] shadow">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              )}

              {message.type === "error" && (
                <div className="flex justify-center">
                  <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg p-3 max-w-[80%] shadow">
                    <p className="text-sm">❌ {message.content}</p>                    
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        {/* Question Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your documents..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Asking...
              </span>
            ) : (
              "Ask"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default RagChatScreen;
