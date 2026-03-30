import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./Chatbot.css";

import chatbotIcon from "../assets/chatbot.png"; // ✅ logo du bot

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { type: "bot", text: "Bonjour ! Je suis votre assistant. Posez votre question." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const question = input;
    setMessages((prev) => [...prev, { type: "user", text: question }]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await axios.post("http://localhost:5000/api/chatbot/ask", { question });
      const answer = res.data?.answer || "Désolé, je n'ai pas compris.";
      setMessages((prev) => [...prev, { type: "bot", text: answer }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { type: "bot", text: "Erreur serveur. Réessayez plus tard." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-row ${msg.type}`}>
            {msg.type === "bot" && (
              <img className="bot-avatar" src={chatbotIcon} alt="Bot" />
            )}

            <div className={`message ${msg.type}`}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* ✅ typing indicator avec logo */}
        {isTyping && (
          <div className="message-row bot">
            <img className="bot-avatar" src={chatbotIcon} alt="Bot" />
            <div className="message bot typing" aria-label="Le bot écrit">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input">
        <input
          type="text"
          placeholder="Posez votre question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={sendMessage} type="button">Envoyer</button>
      </div>
    </div>
  );
};

export default Chatbot;