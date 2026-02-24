import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api";

const defaultQA = [
  { question: "wedding", answer: "Our wedding packages range from $1500-$3000." },
  { question: "price", answer: "Standard portrait sessions start at $500." },
  { question: "location", answer: "We are based in Nueva Ecija, Philippines and available for travel." },
  { question: "hello", answer: "Hi! BCP Robot at your service!" }
];

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [qa, setQa] = useState(defaultQA);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Beep boop! Hi! How can I help?" }
  ]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/chatbot/qa")
      .then((res) => setQa(res.data.items || defaultQA))
      .catch(() => setQa(defaultQA));
  }, []);

  const suggested = useMemo(() => qa.slice(0, 4), [qa]);

  const addMessage = (role, text) => {
    setMessages((prev) => [...prev, { role, text }]);
  };

  const processMessage = (customQuestion) => {
    const msg = (customQuestion || input).trim();
    if (!msg) return;

    addMessage("user", msg);
    setInput("");

    const lower = msg.toLowerCase();
    const found = qa.find((item) => lower.includes(item.question.toLowerCase()));
    const answer = found
      ? found.answer
      : "I'm still learning! Contact our human team at otpaauthetication@gmail.com.";

    window.setTimeout(() => addMessage("bot", answer), 350);
  };

  return (
    <>
      <button
        id="chat-toggle"
        className="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-2xl transition-all hover:scale-110 flex items-center justify-center group"
        aria-label="Open chat"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        )}
      </button>

      <div
        id="chat-window"
        className={`${open ? "" : "hidden"} fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-6 z-[110] w-full h-full sm:w-96 sm:h-[520px] bg-white sm:rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden fade-in`}
      >
        <div className="shrink-0 bg-gradient-to-r from-slate-600 to-slate-700 p-3 text-white shadow-md">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 border-2 border-slate-600 rounded-full" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none">BCP Robot</h3>
              <p className="text-[10px] opacity-80 mt-0.5">AI Assistant</p>
            </div>
            <button className="ml-auto hover:bg-white/10 p-1.5 rounded-lg transition" title="Minimize" onClick={() => setOpen(false)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="shrink-0 px-3 py-2 bg-slate-50 border-b border-slate-100">
          <p className="text-[10px] font-semibold text-slate-700 mb-1.5">You can ask:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggested.map((item) => (
              <button
                key={item.question}
                className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs rounded-full hover:bg-slate-100 transition-all whitespace-nowrap"
                onClick={() => processMessage(item.question)}
              >
                {item.question}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`${message.role === "user" ? "bg-slate-600 text-white rounded-br-none" : "bg-white border border-slate-100 text-gray-700 rounded-bl-none"} px-3 py-2 rounded-2xl shadow-sm max-w-[85%] text-sm`}
              >
                <p className="leading-relaxed">{message.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 p-3 bg-white border-t border-slate-100">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-slate-500 transition-all">
            <input
              type="text"
              placeholder="Ask something..."
              className="flex-1 bg-transparent border-none py-1 text-xs focus:outline-none text-gray-700 placeholder-gray-500"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") processMessage();
              }}
            />
            <button className="text-slate-600 hover:text-slate-700 p-0.5 transition-transform active:scale-90" onClick={() => processMessage()}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
          <div className="mt-2">
            <button
              className="block w-full text-center py-2 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-all shadow-md"
              onClick={() => navigate(user ? "/reservation" : "/login")}
            >
              Book Session
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
