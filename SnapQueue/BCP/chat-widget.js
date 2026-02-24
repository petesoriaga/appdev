(() => {
  const path = String(window.location.pathname || "").toLowerCase();
  const isAdminDashboardPage = path.endsWith("/admin_dashboard.html") || path.endsWith("admin_dashboard.html");
  if (isAdminDashboardPage) return;
  const dashToggle = document.getElementById("dash-chat-toggle");
  const dashWindow = document.getElementById("dash-chat-window");
  if (dashToggle) dashToggle.remove();
  if (dashWindow) dashWindow.remove();

  const isHomePage = path === "/" || path.endsWith("/index.html");
  const legacyToggle = document.getElementById("chat-toggle");
  const legacyWindow = document.getElementById("chat-window");
  if (legacyToggle && isHomePage) return;
  if (legacyToggle && !isHomePage) legacyToggle.remove();
  if (legacyWindow && !isHomePage) legacyWindow.remove();

  const CHAT_OPEN_KEY = "sq_chat_open";
  const CHAT_VIEW_KEY = "sq_chat_view";

  const template = `
  <button id="chat-toggle" class="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full bg-slate-900 text-white shadow-2xl transition-all hover:scale-105 flex items-center justify-center" aria-label="Open chat">
    <svg id="chat-open-icon" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.1" d="M21 11.5a8.5 8.5 0 01-8.5 8.5H8l-5 3V11.5A8.5 8.5 0 0111.5 3h1A8.5 8.5 0 0121 11.5z"/></svg>
    <svg id="chat-close-icon" class="hidden w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
  </button>

  <div id="chat-window" class="hidden fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 z-[110] w-full h-full sm:w-[380px] sm:h-[620px] sm:max-h-[calc(100vh-110px)] bg-white sm:rounded-[28px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 transform scale-95 opacity-0 origin-bottom-right">
    <div id="chat-header" class="bg-gradient-to-b from-slate-800 to-slate-700 text-white px-5 pt-5 pb-6 transition-all duration-200">
      <div class="flex items-center">
        <div class="font-black text-2xl tracking-tight">BCP Support</div>
        <button id="chat-minimize" class="ml-auto text-white/80 hover:text-white text-2xl leading-none">x</button>
      </div>
      <div id="chat-header-greeting" class="mt-8 transition-all duration-200">
        <p class="text-slate-300 text-4xl font-bold leading-tight">Hi there</p>
        <p class="text-white text-5xl font-black leading-tight">How can we help?</p>
      </div>
    </div>

    <div class="flex-1 bg-gradient-to-b from-slate-100/30 to-white overflow-y-auto">
      <div id="chat-home-view" class="p-4 space-y-4">
        <button id="go-messages-btn" class="w-full bg-white rounded-2xl p-4 border border-slate-200 text-left hover:shadow-md transition-shadow">
          <p class="font-black text-slate-900">Send us a message</p>
          <p class="text-slate-500 text-sm">Talk directly with admin support</p>
        </button>
        <div class="bg-white rounded-2xl p-4 border border-slate-200">
          <div class="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input id="faq-search" type="text" placeholder="Search for help" class="w-full bg-transparent text-sm focus:outline-none">
          </div>
          <div id="home-help-topic-buttons" class="flex flex-wrap gap-2 mt-3">
            <button class="home-help-topic px-2.5 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50" data-topic-key="packages" data-topic="package pricing">Packages</button>
            <button class="home-help-topic px-2.5 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50" data-topic-key="booking" data-topic="book reservation">Booking</button>
            <button class="home-help-topic px-2.5 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50" data-topic-key="payment" data-topic="payment gcash maya">Payment</button>
            <button class="home-help-topic px-2.5 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50" data-topic-key="delivery" data-topic="delivery timeline">Delivery</button>
            <button class="home-help-topic px-2.5 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50" data-topic-key="account" data-topic="account login dashboard">Account</button>
          </div>
          <div id="home-help-topic-results" class="space-y-2 mt-3"></div>
          <div id="faq-list" class="mt-3 space-y-2"></div>
        </div>
      </div>

      <div id="chat-messages-view" class="hidden h-full flex flex-col">
        <div class="px-4 pt-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <button id="chat-mode-ai" class="px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-black uppercase tracking-wide">AI Assistant</button>
          <button id="chat-mode-admin" class="px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wide hover:bg-slate-50">Chat Admin</button>
          <span id="ai-provider-badge" class="ml-auto px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide">AI: Checking</span>
        </div>
        <div id="client-chat-messages" class="flex-1 overflow-y-auto p-4 bg-slate-50"></div>
        <div id="client-chat-login-hint" class="hidden p-4 border-t border-slate-200 bg-amber-50">
          <p class="text-sm text-slate-700 mb-2 font-semibold">Admin chat needs sign-in. You can still use AI Assistant here.</p>
          <a href="login.html" class="inline-block px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold uppercase">Login for Admin Chat</a>
        </div>
        <div id="client-chat-input-wrap" class="p-3 border-t border-slate-200 flex gap-2 bg-white">
          <input id="client-chat-input" type="text" placeholder="Write your message..." class="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
          <button id="client-chat-send" class="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase">Send</button>
        </div>
      </div>

      <div id="chat-help-view" class="hidden p-4">
        <div class="bg-white rounded-2xl p-4 border border-slate-200">
          <p class="text-sm font-black text-slate-900 mb-3">Help Topics</p>
          <div id="help-topic-buttons" class="flex flex-wrap gap-2 mb-3">
            <button class="help-topic px-2.5 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50" data-topic-key="packages" data-topic="package pricing">Packages</button>
            <button class="help-topic px-2.5 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50" data-topic-key="booking" data-topic="book reservation">Booking</button>
            <button class="help-topic px-2.5 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50" data-topic-key="payment" data-topic="payment gcash maya">Payment</button>
            <button class="help-topic px-2.5 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50" data-topic-key="delivery" data-topic="delivery timeline">Delivery</button>
            <button class="help-topic px-2.5 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50" data-topic-key="account" data-topic="account login dashboard">Account</button>
          </div>
          <div id="help-topic-results" class="space-y-2 mb-3"></div>
          <div id="faq-choice-buttons" class="flex flex-wrap gap-2 mb-3"></div>
          <div id="faq-help-list" class="space-y-2"></div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-3 border-t border-slate-200 bg-white">
      <button class="chat-nav-btn py-3 text-sm font-bold text-slate-900" data-view="home">Home</button>
      <button class="chat-nav-btn py-3 text-sm font-bold text-slate-500" data-view="messages">Messages</button>
      <button class="chat-nav-btn py-3 text-sm font-bold text-slate-500" data-view="help">Help</button>
    </div>
  </div>`;

  document.body.insertAdjacentHTML("beforeend", template);

  const chatToggle = document.getElementById("chat-toggle");
  const chatWindow = document.getElementById("chat-window");
  if (!chatToggle || !chatWindow) return;

  const chatOpenIcon = document.getElementById("chat-open-icon");
  const chatCloseIcon = document.getElementById("chat-close-icon");
  const chatMinimize = document.getElementById("chat-minimize");
  const faqSearch = document.getElementById("faq-search");
  const faqList = document.getElementById("faq-list");
  const homeHelpTopicButtons = document.querySelectorAll(".home-help-topic");
  const homeHelpTopicResults = document.getElementById("home-help-topic-results");
  const faqHelpList = document.getElementById("faq-help-list");
  const faqChoiceButtons = document.getElementById("faq-choice-buttons");
  const goMessagesBtn = document.getElementById("go-messages-btn");
  const navButtons = document.querySelectorAll(".chat-nav-btn");
  const chatHomeView = document.getElementById("chat-home-view");
  const chatMessagesView = document.getElementById("chat-messages-view");
  const chatHelpView = document.getElementById("chat-help-view");
  const chatHeader = document.getElementById("chat-header");
  const chatHeaderGreeting = document.getElementById("chat-header-greeting");
  const clientChatMessages = document.getElementById("client-chat-messages");
  const clientChatInput = document.getElementById("client-chat-input");
  const clientChatSend = document.getElementById("client-chat-send");
  const clientChatLoginHint = document.getElementById("client-chat-login-hint");
  const clientChatInputWrap = document.getElementById("client-chat-input-wrap");
  const defaultChatLoginHintHTML = clientChatLoginHint?.innerHTML || "";
  const chatModeAiBtn = document.getElementById("chat-mode-ai");
  const chatModeAdminBtn = document.getElementById("chat-mode-admin");
  const aiProviderBadge = document.getElementById("ai-provider-badge");
  const helpTopicButtons = document.querySelectorAll(".help-topic");
  const helpTopicResults = document.getElementById("help-topic-results");

  const fallbackFaq = [
    { question: "How can I update my reservation?", answer: "Open Reservations and check your booking details." },
    { question: "How do I know my project status?", answer: "Use your dashboard Progress tab for updates." },
    { question: "How do I contact admin?", answer: "Use Messages tab in this support bubble." }
  ];
  const helpTopicMap = {
    packages: [
      { title: "Package Pricing", answer: "Basic PHP 2,700, Standard PHP 3,500, Premium PHP 4,500, plus custom package.", prompt: "What are your package prices?" },
      { title: "Custom Package", answer: "You can submit your own package description in Reservation for a custom quote.", prompt: "How do I request a custom package?" }
    ],
    booking: [
      { title: "How to Book", answer: "Open Reservation, complete event details, then submit for admin review.", prompt: "How do I book a reservation?" },
      { title: "Approval Flow", answer: "After submission, admin approves or declines and may update pricing.", prompt: "What happens after I submit my reservation?" }
    ],
    payment: [
      { title: "Payment Method", answer: "Manual proof payment is used. Upload reference number and proof screenshot.", prompt: "How do I submit payment proof?" },
      { title: "Refund Request", answer: "Refund requests are available in payment records and reviewed by admin.", prompt: "How can I request a refund?" }
    ],
    delivery: [
      { title: "Delivery Timeline", answer: "Estimated delivery is updated by admin in dashboard project status.", prompt: "How long is the delivery time?" },
      { title: "Completion", answer: "You will be notified once project status is marked done.", prompt: "How do I know when my project is done?" }
    ],
    account: [
      { title: "Login Access", answer: "Guests can use AI chat. Live admin chat requires sign-in.", prompt: "Do I need login to chat with admin?" },
      { title: "Dashboard Access", answer: "Signed-in users use User Dashboard. Admin accounts use Admin Dashboard.", prompt: "Where do I access my dashboard?" }
    ]
  };

  const escapeText = (value) => String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#39;");

  const chatApi = (() => {
    const hasApi = Boolean(window.API?.chatbot);
    const hasNewMethods = Boolean(window.API?.chatbot?.getMyLiveThread && window.API?.chatbot?.sendLiveMessage && window.API?.chatbot?.listLiveMessages);
    if (hasApi && hasNewMethods) return window.API.chatbot;
    const base = window.API?.baseURL || `${window.location.origin}/api`;
    const getToken = () => window.API?.getToken?.() || localStorage.getItem("token") || "";
    const req = async (p, options = {}) => {
      const response = await fetch(`${base}${p}`, { ...options, headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...(options.headers || {}) } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
      return data;
    };
    const reqWithFallback = async (primaryPath, fallbackPath, options = {}) => {
      try { return await req(primaryPath, options); } catch (error) {
        if (/route not found/i.test(String(error?.message || "")) && fallbackPath) return req(fallbackPath, options);
        throw error;
      }
    };
    return {
      listQA: () => (window.API?.chatbot?.listQA ? window.API.chatbot.listQA() : req("/chatbot/qa")),
      askAI: (question) => (window.API?.chatbot?.askAI ? window.API.chatbot.askAI(question) : req("/chatbot/ai", { method: "POST", body: JSON.stringify({ question }) })),
      getMyLiveThread: () => reqWithFallback("/chatbot/live/thread", "/chatbot/thread"),
      listLiveMessages: (threadId) => reqWithFallback(`/chatbot/live/threads/${threadId}/messages`, `/chatbot/threads/${threadId}/messages`),
      sendLiveMessage: (threadId, text) => reqWithFallback(`/chatbot/live/threads/${threadId}/messages`, `/chatbot/threads/${threadId}/messages`, { method: "POST", body: JSON.stringify({ text }) })
    };
  })();

  let currentView = localStorage.getItem(CHAT_VIEW_KEY) || "home";
  let currentChatMode = "ai";
  let faqItems = [];
  let liveThreadId = null;
  let livePollTimer = null;
  let chatCloseTimer = null;
  let guestAdminFallbackNotified = false;

  const setAiProviderBadge = (provider) => {
    if (!aiProviderBadge) return;
    const p = String(provider || "checking").toLowerCase();
    aiProviderBadge.textContent = p === "gemini" ? "AI: Gemini" : p === "fallback" ? "AI: Fallback" : "AI: Checking";
  };

  const fetchCurrentUser = async () => {
    const token = window.API?.getToken?.() || localStorage.getItem("token");
    if (!token) return null;
    if (window.API?.auth?.me) {
      try { const res = await window.API.auth.me(); return res?.user || null; } catch (_e) { return null; }
    }
    return null;
  };

  const setActiveHelpTopic = (activeKey) => {
    helpTopicButtons.forEach((button) => {
      const isActive = (button.dataset.topicKey || "") === activeKey;
      button.classList.toggle("bg-slate-900", isActive);
      button.classList.toggle("text-white", isActive);
      button.classList.toggle("border-slate-900", isActive);
    });
  };

  const renderFaq = (term = "") => {
    const needle = String(term || "").trim().toLowerCase();
    const filtered = faqItems.filter((item) => item.question.toLowerCase().includes(needle) || item.answer.toLowerCase().includes(needle));
    const html = filtered.map((item) => `<div class="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50"><p class="text-sm font-bold text-slate-900">${escapeText(item.question)}</p><p class="text-xs text-slate-500 mt-1">${escapeText(item.answer)}</p></div>`).join("") || `<p class="text-xs text-slate-400">No results</p>`;
    if (faqList) faqList.innerHTML = html;
    if (faqHelpList) faqHelpList.innerHTML = html;
    if (faqChoiceButtons) {
      faqChoiceButtons.innerHTML = faqItems.slice(0, 6).map((item) => `
        <button class="faq-choice px-2.5 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50" data-question="${escapeText(item.question)}">
          ${escapeText(item.question)}
        </button>
      `).join("");
      faqChoiceButtons.querySelectorAll(".faq-choice").forEach((button) => {
        button.addEventListener("click", () => {
          clientChatInput.value = button.dataset.question || "";
          switchView("messages");
          if (chatWindow.classList.contains("hidden")) openChat();
          setChatMode("ai");
          sendMessage();
        });
      });
    }
  };

  const renderHelpTopicResults = (searchTerm = "", topicKey = "") => {
    if (!helpTopicResults) return;
    const mapped = helpTopicMap[topicKey] || [];
    if (mapped.length) {
      helpTopicResults.innerHTML = mapped.map((item) => `
        <button class="help-result w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-slate-50" data-question="${escapeText(item.prompt || item.title)}">
          <p class="text-xs font-bold text-slate-800">${escapeText(item.title)}</p>
          <p class="text-[11px] text-slate-500 mt-1">${escapeText(item.answer)}</p>
        </button>
      `).join("");
    } else {
      const terms = String(searchTerm || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.length) {
        helpTopicResults.innerHTML = `<p class="text-[11px] text-slate-400">Choose a topic to see quick results.</p>`;
        return;
      }
      const matches = faqItems.filter((item) => {
        const question = String(item.question || "").toLowerCase();
        const answer = String(item.answer || "").toLowerCase();
        return terms.some((t) => question.includes(t) || answer.includes(t));
      }).slice(0, 3);
      if (!matches.length) {
        helpTopicResults.innerHTML = `<p class="text-[11px] text-slate-400">No quick results for this topic.</p>`;
        return;
      }
      helpTopicResults.innerHTML = matches.map((item) => `
        <button class="help-result w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-slate-50" data-question="${escapeText(item.question)}">
          <p class="text-xs font-bold text-slate-800">${escapeText(item.question)}</p>
          <p class="text-[11px] text-slate-500 mt-1">${escapeText(item.answer)}</p>
        </button>
      `).join("");
    }
    helpTopicResults.querySelectorAll(".help-result").forEach((button) => {
      button.addEventListener("click", () => {
        clientChatInput.value = button.dataset.question || "";
        switchView("messages");
        if (chatWindow.classList.contains("hidden")) openChat();
        setChatMode("ai");
        sendMessage();
      });
    });
  };

  const renderHomeTopicResults = (searchTerm = "", topicKey = "") => {
    if (!homeHelpTopicResults) return;
    const mapped = helpTopicMap[topicKey] || [];
    if (mapped.length) {
      homeHelpTopicResults.innerHTML = mapped.map((item) => `
        <button class="home-help-result w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-slate-50" data-question="${escapeText(item.prompt || item.title)}">
          <p class="text-xs font-bold text-slate-800">${escapeText(item.title)}</p>
          <p class="text-[11px] text-slate-500 mt-1">${escapeText(item.answer)}</p>
        </button>
      `).join("");
    } else {
      const terms = String(searchTerm || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
      const matches = faqItems.filter((item) => {
        const q = String(item.question || "").toLowerCase();
        const a = String(item.answer || "").toLowerCase();
        return terms.some((t) => q.includes(t) || a.includes(t));
      }).slice(0, 2);
      homeHelpTopicResults.innerHTML = matches.map((item) => `
        <button class="home-help-result w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-slate-50" data-question="${escapeText(item.question)}">
          <p class="text-xs font-bold text-slate-800">${escapeText(item.question)}</p>
          <p class="text-[11px] text-slate-500 mt-1">${escapeText(item.answer)}</p>
        </button>
      `).join("");
    }
    homeHelpTopicResults.querySelectorAll(".home-help-result").forEach((button) => {
      button.addEventListener("click", () => {
        clientChatInput.value = button.dataset.question || "";
        switchView("messages");
        if (chatWindow.classList.contains("hidden")) openChat();
        setChatMode("ai");
        sendMessage();
      });
    });
  };

  const openChat = () => {
    if (chatCloseTimer) clearTimeout(chatCloseTimer);
    chatWindow.classList.remove("hidden");
    requestAnimationFrame(() => { chatWindow.classList.remove("scale-95", "opacity-0"); chatWindow.classList.add("scale-100", "opacity-100"); });
    chatOpenIcon?.classList.add("hidden");
    chatCloseIcon?.classList.remove("hidden");
    localStorage.setItem(CHAT_OPEN_KEY, "1");
    if (currentView === "messages") ensureLiveReady();
  };

  const closeChat = () => {
    if (chatCloseTimer) clearTimeout(chatCloseTimer);
    chatWindow.classList.add("scale-95", "opacity-0");
    chatWindow.classList.remove("scale-100", "opacity-100");
    chatCloseTimer = setTimeout(() => { chatWindow.classList.add("hidden"); chatCloseTimer = null; }, 300);
    chatOpenIcon?.classList.remove("hidden");
    chatCloseIcon?.classList.add("hidden");
    localStorage.setItem(CHAT_OPEN_KEY, "0");
    stopLivePolling();
  };

  const setChatMode = (mode) => {
    currentChatMode = mode === "admin" ? "admin" : "ai";
    guestAdminFallbackNotified = false;
    const aiActive = currentChatMode === "ai";
    chatModeAiBtn?.classList.toggle("bg-slate-900", aiActive);
    chatModeAiBtn?.classList.toggle("text-white", aiActive);
    chatModeAdminBtn?.classList.toggle("bg-slate-900", !aiActive);
    chatModeAdminBtn?.classList.toggle("text-white", !aiActive);
    ensureLiveReady();
  };

  const switchView = (view) => {
    currentView = view;
    localStorage.setItem(CHAT_VIEW_KEY, view);
    chatHomeView?.classList.toggle("hidden", view !== "home");
    chatMessagesView?.classList.toggle("hidden", view !== "messages");
    chatHelpView?.classList.toggle("hidden", view !== "help");
    const compact = view === "messages";
    chatHeader?.classList.toggle("pt-5", !compact);
    chatHeader?.classList.toggle("pb-6", !compact);
    chatHeader?.classList.toggle("py-3", compact);
    chatHeaderGreeting?.classList.toggle("hidden", compact);
    navButtons.forEach((btn) => {
      const active = btn.dataset.view === view;
      btn.classList.toggle("text-slate-900", active);
      btn.classList.toggle("text-slate-500", !active);
    });
    if (view === "messages") ensureLiveReady();
    else stopLivePolling();
  };

  const stopLivePolling = () => {
    if (livePollTimer) { clearInterval(livePollTimer); livePollTimer = null; }
  };

  const renderMessages = (messages = []) => {
    if (!clientChatMessages) return;
    if (!messages.length) {
      clientChatMessages.innerHTML = `<div class="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase">No messages yet</div>`;
      return;
    }
    clientChatMessages.innerHTML = messages.map((message) => {
      const mine = message.senderRole !== "admin";
      const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `<div class="flex ${mine ? "justify-end" : "justify-start"} mb-3"><div class="${mine ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-800"} max-w-[80%] rounded-2xl ${mine ? "rounded-br-none" : "rounded-bl-none"} px-3 py-2 shadow-sm"><p class="text-sm leading-relaxed">${escapeText(message.text)}</p><p class="text-[10px] mt-1 ${mine ? "text-slate-200" : "text-slate-400"}">${escapeText(time)}</p></div></div>`;
    }).join("");
    clientChatMessages.scrollTop = clientChatMessages.scrollHeight;
  };

  const loadLiveMessages = async () => {
    if (!liveThreadId || currentChatMode !== "admin") return;
    const response = await chatApi.listLiveMessages(liveThreadId);
    renderMessages(response?.messages || []);
    const closed = response?.thread?.status === "closed";
    if (clientChatInput) clientChatInput.disabled = closed;
    if (clientChatSend) clientChatSend.disabled = closed;
    if (clientChatInput) clientChatInput.placeholder = closed ? "This chat has been closed by admin." : "Write your message...";
  };

  const startLivePolling = () => {
    stopLivePolling();
    livePollTimer = setInterval(async () => {
      if (currentView !== "messages" || currentChatMode !== "admin" || chatWindow.classList.contains("hidden")) return;
      await loadLiveMessages();
    }, 3000);
  };

  const ensureLiveReady = async () => {
    if (clientChatLoginHint) clientChatLoginHint.innerHTML = defaultChatLoginHintHTML;
    if (currentChatMode === "ai") {
      clientChatLoginHint?.classList.add("hidden");
      clientChatInputWrap?.classList.remove("hidden");
      if (clientChatMessages && !clientChatMessages.children.length) {
        clientChatMessages.innerHTML = `<div class="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase">AI assistant ready</div>`;
      }
      if (clientChatInput) clientChatInput.disabled = false;
      if (clientChatSend) clientChatSend.disabled = false;
      stopLivePolling();
      return;
    }

    const user = await fetchCurrentUser();
    if (!user) {
      setChatMode("ai");
      clientChatLoginHint?.classList.remove("hidden");
      if (!guestAdminFallbackNotified) {
        clientChatMessages?.insertAdjacentHTML("beforeend", `<p class="text-xs text-slate-500">Guest mode: AI Assistant is available. Login for admin chat.</p>`);
        guestAdminFallbackNotified = true;
      }
      return;
    }
    if (!liveThreadId) {
      const threadRes = await chatApi.getMyLiveThread();
      liveThreadId = threadRes?.thread?._id || null;
    }
    if (liveThreadId) {
      await loadLiveMessages();
      startLivePolling();
    }
  };

  const sendMessage = async () => {
    const text = String(clientChatInput?.value || "").trim();
    if (!text) return;
    const originalText = text;
    if (clientChatInput) clientChatInput.value = "";

    if (currentChatMode === "ai") {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      clientChatMessages?.insertAdjacentHTML("beforeend", `<div class="flex justify-end mb-3"><div class="bg-slate-900 text-white max-w-[80%] rounded-2xl rounded-br-none px-3 py-2 shadow-sm"><p class="text-sm leading-relaxed">${escapeText(originalText)}</p><p class="text-[10px] mt-1 text-slate-200">${escapeText(time)}</p></div></div>`);
      clientChatMessages?.insertAdjacentHTML("beforeend", `<div id="ai-loading" class="flex justify-start mb-3"><div class="bg-white border border-slate-200 text-slate-800 max-w-[80%] rounded-2xl rounded-bl-none px-3 py-2 shadow-sm text-sm">Thinking...</div></div>`);
      clientChatMessages.scrollTop = clientChatMessages.scrollHeight;
      let reply = "I can help with packages, reservations, payments, and delivery timelines.";
      try {
        const response = await chatApi.askAI(originalText);
        reply = String(response?.answer || "").trim() || reply;
        setAiProviderBadge(response?.provider || "fallback");
      } catch (_error) {
        setAiProviderBadge("fallback");
      }
      document.getElementById("ai-loading")?.remove();
      const t2 = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      clientChatMessages?.insertAdjacentHTML("beforeend", `<div class="flex justify-start mb-3"><div class="bg-white border border-slate-200 text-slate-800 max-w-[80%] rounded-2xl rounded-bl-none px-3 py-2 shadow-sm"><p class="text-sm leading-relaxed">${escapeText(reply)}</p><p class="text-[10px] mt-1 text-slate-400">${escapeText(t2)}</p></div></div>`);
      clientChatMessages.scrollTop = clientChatMessages.scrollHeight;
      return;
    }

    try {
      if (!liveThreadId) await ensureLiveReady();
      if (!liveThreadId) throw new Error("Please login first to start live chat.");
      await chatApi.sendLiveMessage(liveThreadId, originalText);
      await loadLiveMessages();
    } catch (error) {
      if (clientChatInput) clientChatInput.value = originalText;
      clientChatMessages?.insertAdjacentHTML("beforeend", `<p class="text-xs text-red-600">${escapeText(error?.message || "Failed to send message.")}</p>`);
    }
  };

  chatToggle.addEventListener("click", () => chatWindow.classList.contains("hidden") ? openChat() : closeChat());
  chatMinimize?.addEventListener("click", closeChat);
  goMessagesBtn?.addEventListener("click", () => switchView("messages"));
  navButtons.forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));
  helpTopicButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const topic = button.dataset.topic || "";
      const topicKey = button.dataset.topicKey || "";
      setActiveHelpTopic(topicKey);
      faqSearch.value = topic;
      renderFaq(topic);
      renderHelpTopicResults(topic, topicKey);
      renderHomeTopicResults(topic, topicKey);
    });
  });
  homeHelpTopicButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const topic = button.dataset.topic || "";
      const topicKey = button.dataset.topicKey || "";
      faqSearch.value = topic;
      renderFaq(topic);
      renderHelpTopicResults(topic);
      renderHomeTopicResults(topic, topicKey);
    });
  });
  chatModeAiBtn?.addEventListener("click", () => setChatMode("ai"));
  chatModeAdminBtn?.addEventListener("click", () => setChatMode("admin"));
  clientChatSend?.addEventListener("click", sendMessage);
  clientChatInput?.addEventListener("keypress", (event) => { if (event.key === "Enter") { event.preventDefault(); sendMessage(); } });
  faqSearch?.addEventListener("input", () => {
    setActiveHelpTopic("");
    renderFaq(faqSearch.value);
    renderHelpTopicResults(faqSearch.value);
    renderHomeTopicResults(faqSearch.value);
  });

  document.addEventListener("click", (event) => {
    if (chatWindow.classList.contains("hidden")) return;
    if (chatWindow.contains(event.target) || chatToggle.contains(event.target)) return;
    if (window.innerWidth < 640) return;
    closeChat();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !chatWindow.classList.contains("hidden")) closeChat(); });

  (async () => {
    try {
      const response = await chatApi.listQA();
      faqItems = (response?.items || []).map((item) => ({ question: item.question, answer: item.answer }));
    } catch (_error) {
      faqItems = fallbackFaq;
    }
    renderFaq("");
    setActiveHelpTopic("");
    setAiProviderBadge("checking");
    renderHelpTopicResults("");
    renderHomeTopicResults("");
    switchView(currentView);
    if (localStorage.getItem(CHAT_OPEN_KEY) === "1") openChat();
  })();
})();
