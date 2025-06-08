document.addEventListener('DOMContentLoaded', () => {
  const launcher = document.getElementById('chatbotLauncher');
  const launcherLabel = document.getElementById('chatbotLauncherLabel');
  const windowEl = document.getElementById('chatbotWindow');
  const closeBtn = document.getElementById('chatbotClose');
  const form = document.getElementById('chatbotForm');
  const input = document.getElementById('chatbotInput');
  const messages = document.getElementById('chatbotMessages');
  const headerTitle = document.querySelector('.chatbot-header-title');
  const disclaimer = document.getElementById('chatbotDisclaimer');
  const disclaimerClose = document.getElementById('disclaimerClose');

  // Get website ID from selector or container data attribute
  const chatbotContainer = document.querySelector('.chatbot-container');
  const chatSelector = document.getElementById('chatSelector');
  
  // Website specific configurations
  const websiteConfig = {
    abiss: {
      botName: 'AbissBot',
      welcomeMessage: 'Hoi! Ik ben je digitale beursassistent voor ABISS. Ik kan je helpen met informatie over digitalisering, automatisering, Industry of Things, Intelligence of Things en Security of Things. Waar ben je naar op zoek?',
    },
    ffd: {
      botName: 'FLORBot',
      welcomeMessage: 'Hoi! Ik ben je beursassistent voor de vloeren- en isolatiebeurs. Ik kan je helpen met informatie over vloeren, isolatie en gerelateerde producten. Waar ben je naar op zoek?',
    },
    artisan: {
      botName: 'ArtisanBot',
      welcomeMessage: 'Hoi! Ik ben je beursassistent voor artisanale en ambachtelijke producten. Ik kan je helpen met informatie over voedsel, dranken en andere ambachtelijke producten. Waar ben je naar op zoek?',
    },
  };

  // Validate website ID
  function validateWebsiteId(id) {
    return websiteConfig.hasOwnProperty(id) ? id : null;
  }

  // Initialize website ID
  let websiteId = validateWebsiteId(chatbotContainer.dataset.website);
  if (!websiteId && chatSelector) {
    websiteId = validateWebsiteId(chatSelector.value);
  }
  
  // If still no valid website ID, default to the first available website
  if (!websiteId) {
    websiteId = Object.keys(websiteConfig)[0];
    console.warn(`No valid website ID found, defaulting to ${websiteId}`);
  }

  // Set the website ID in the container
  chatbotContainer.dataset.website = websiteId;

  // Update website ID when selector changes
  if (chatSelector) {
    chatSelector.value = websiteId; // Ensure selector matches initial website
    chatSelector.onchange = () => {
      const newWebsiteId = validateWebsiteId(chatSelector.value);
      if (newWebsiteId) {
        websiteId = newWebsiteId;
        chatbotContainer.dataset.website = websiteId;
        initializeWebsite();
      } else {
        console.error(`Invalid website ID selected: ${chatSelector.value}`);
        chatSelector.value = websiteId; // Reset to previous valid value
      }
    };
  }

  // API endpoint configuration
  const API_URL = 'http://localhost:5000';

  // Helper to set and get sessionId cookie
  function setSessionIdCookie(sessionId) {
    document.cookie = `chatbotSessionId=${sessionId}; path=/; SameSite=Lax`;
  }
  function getSessionIdCookie() {
    const match = document.cookie.match(/(?:^|; )chatbotSessionId=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
  function clearSessionIdCookie() {
    document.cookie = 'chatbotSessionId=; Max-Age=0; path=/; SameSite=Lax';
  }

  // Show registration form
  function showRegistrationForm() {
    const formHtml = `
      <div class="registration-form" style="box-sizing: border-box; width: 100%; max-width: 340px; margin-left: auto; margin-right: auto; overflow: visible;">
        <h3>Expo registratie</h3>
        <form id="registrationForm" style="box-sizing: border-box; width: 100%;">
          <div class="form-group">
            <label for="company">Bedrijfsnaam</label>
            <input type="text" id="company" name="company" placeholder="Jouw bedrijf" required autocomplete="organization">
          </div>
          <div class="form-group">
            <label for="jobTitle">Functietitel</label>
            <input type="text" id="jobTitle" name="jobTitle" placeholder="Jouw functie" required autocomplete="job-title">
          </div>
          <div class="form-group">
            <label for="companyDescription">Bedrijfsomschrijving</label>
            <textarea id="companyDescription" name="companyDescription" placeholder="Wat doet jouw bedrijf?" required></textarea>
          </div>
          <button type="submit" class="register-main-btn">Registreer en start chat</button>
        </form>
      </div>
    `;
    messages.innerHTML = formHtml;
    form.style.display = 'none';
    windowEl.style.overflowX = 'hidden';
    messages.style.overflowX = 'hidden';
    addResizeHandles();
    document.getElementById('registrationForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = {
        company: document.getElementById('company').value,
        jobTitle: document.getElementById('jobTitle').value,
        companyDescription: document.getElementById('companyDescription').value
      };
      // Always get a new sessionId from backend for a new registration
      const response = await fetch(`${API_URL}/api/analytics/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to get sessionId from backend');
      const data = await response.json();
      setSessionIdCookie(data.sessionId);
      await createUserProfile(data.sessionId, formData, websiteId);
      await trackAnalyticsEvent('chat_start', { ...formData, sessionId: data.sessionId });
      await trackAnalyticsEvent('form_submission', { ...formData, sessionId: data.sessionId });
      initializeWebsite();
      form.style.display = '';
    });
  }

  async function createUserProfile(sessionId, formData, websiteIdArg) {
    try {
      console.log('createUserProfile payload website:', websiteIdArg, 'sessionId:', sessionId);
      const response = await fetch(`${API_URL}/api/analytics/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          company: formData.company,
          jobTitle: formData.jobTitle,
          companyDescription: formData.companyDescription,
          website: websiteIdArg
        })
      });
      if (!response.ok) throw new Error('Failed to create user profile');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // Initialize website configuration
  async function initializeWebsite() {
    const config = websiteConfig[websiteId];
    if (!(await hasRegistered())) {
      showRegistrationForm();
      return;
    }
    if (config) {
      headerTitle.textContent = config.botName;
      const now = new Date();
      const timeString = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
      messages.innerHTML = `
        <div class="bot-message-container">
          <img src="images/robot.svg" alt="Bot">
          <div class="message-wrapper">
            <div class="bot-name">${config.botName}</div>
            <div class="chatbot-bubble">
              ${config.welcomeMessage}
            </div>
            <div class="timestamp">${timeString}</div>
          </div>
        </div>
      `;
      form.style.display = '';
    } else {
      console.error(`Website configuration not found for ID: ${websiteId}`);
    }
  }

  // Add resize handles to the chat window
  function addResizeHandles() {
    // Remove any existing handles to avoid duplicates
    windowEl.querySelectorAll('.resize-handle').forEach(h => h.remove());
    windowEl.style.minWidth = '300px';
    windowEl.style.minHeight = '400px';
    const handles = ['left', 'top', 'top-left'];
    handles.forEach(dir => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${dir}`;
      windowEl.appendChild(handle);
      handle.addEventListener('mousedown', e => startResize(e, dir));
    });
    function startResize(e, dir) {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = windowEl.offsetWidth;
      const startHeight = windowEl.offsetHeight;
      function doResize(ev) {
        if (dir === 'left' || dir === 'top-left') {
          const dx = ev.clientX - startX;
          let newWidth = startWidth - dx;
          if (newWidth < 300) newWidth = 300;
          windowEl.style.width = newWidth + 'px';
        }
        if (dir === 'top' || dir === 'top-left') {
          const dy = ev.clientY - startY;
          let newHeight = startHeight - dy;
          if (newHeight < 400) newHeight = 400;
          windowEl.style.height = newHeight + 'px';
        }
      }
      function stopResize() {
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
      }
      document.addEventListener('mousemove', doResize);
      document.addEventListener('mouseup', stopResize);
    }
  }

  // Helper: check if two dates are the same day
  function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate();
  }

  // Store all messages in memory
  let allMessages = [];
  let visibleMessageCount = 10;
  let chatHistoryLoaded = false;
  let isLoadingHistory = false;
  let lastRenderedScrollToBottom = true;

  // Fetch chat history from backend using sessionId
  async function fetchChatHistory() {
    isLoadingHistory = true;
    renderMessages();
    const sessionId = getSessionIdCookie();
    if (!sessionId) { isLoadingHistory = false; return []; }
    try {
      const resp = await fetch(`${API_URL}/api/analytics/profile/${sessionId}`);
      if (!resp.ok) { isLoadingHistory = false; return []; }
      const profile = await resp.json();
      if (profile && Array.isArray(profile.chatHistory)) {
        isLoadingHistory = false;
        return profile.chatHistory.map(m => ({
          text: m.message,
          isUser: m.isUser,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
        }));
      }
      isLoadingHistory = false;
      return [];
    } catch (e) {
      isLoadingHistory = false;
      showError('Kon oude berichten niet laden, probeer opnieuw.');
      return [];
    }
  }

  // Show error message in chat
  function showError(msg) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'chat-error-message';
    errorDiv.textContent = msg;
    messages.appendChild(errorDiv);
  }

  // Modified addMessage to store all messages and re-render
  function addMessage(text, isUser = false, opts = {}) {
    const msg = { text, isUser, timestamp: new Date(), ...opts };
    allMessages.push(msg);
    lastRenderedScrollToBottom = true;
    renderMessages();
  }

  // Render only the last N messages, with een 'Laad oudere berichten' knop als nodig
  function renderMessages() {
    messages.innerHTML = '';
    const total = allMessages.length;
    const start = Math.max(0, total - visibleMessageCount);
    const visible = allMessages.slice(start, total);
    // Loader bij ophalen oude berichten
    if (isLoadingHistory) {
      const loader = document.createElement('div');
      loader.className = 'chat-loading-indicator';
      loader.setAttribute('aria-live', 'polite');
      loader.textContent = 'Oude berichten laden...';
      messages.appendChild(loader);
    }
    if (start > 0 && !isLoadingHistory) {
      const loadOlderBtn = document.createElement('button');
      loadOlderBtn.textContent = 'Laad oudere berichten';
      loadOlderBtn.className = 'load-older-btn';
      loadOlderBtn.setAttribute('aria-label', 'Laad oudere berichten');
      loadOlderBtn.onclick = async () => {
        visibleMessageCount = Math.min(visibleMessageCount + 10, allMessages.length);
        isLoadingHistory = true;
        renderMessages();
        // Simuleer laadtijd
        setTimeout(() => {
          isLoadingHistory = false;
          renderMessages();
        }, 400);
      };
      messages.appendChild(loadOlderBtn);
    }
    // Groepeer opeenvolgende berichten van dezelfde afzender
    let prevSender = null;
    let prevDate = null;
    visible.forEach((msg, idx) => {
      const isFirstOfGroup = prevSender !== msg.isUser || !isSameDay(msg.timestamp, prevDate || msg.timestamp);
      prevSender = msg.isUser;
      prevDate = msg.timestamp;
      // Toon datum als het niet vandaag is of als het de eerste van de dag is
      const now = new Date();
      if (isFirstOfGroup && !isSameDay(msg.timestamp, now)) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'chat-date-label';
        dateDiv.textContent = msg.timestamp.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        messages.appendChild(dateDiv);
      }
      // Groepeer
      if (msg.isUser) {
        const container = document.createElement('div');
        container.className = 'user-message-container';
        if (isFirstOfGroup) container.classList.add('first-of-group');
        const bubble = document.createElement('div');
        bubble.className = 'chatbot-bubble user';
        bubble.textContent = msg.text;
        bubble.setAttribute('aria-label', 'Jouw bericht');
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = msg.timestamp.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        container.appendChild(bubble);
        container.appendChild(timestamp);
        messages.appendChild(container);
      } else {
        const container = document.createElement('div');
        container.className = 'bot-message-container';
        if (isFirstOfGroup) container.classList.add('first-of-group');
        const img = document.createElement('img');
        img.src = 'images/robot.svg';
        img.alt = 'Bot';
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'message-wrapper';
        const botName = document.createElement('div');
        botName.className = 'bot-name';
        botName.textContent = websiteConfig[websiteId].botName;
        const bubble = document.createElement('div');
        bubble.className = 'chatbot-bubble';
        bubble.innerHTML = parseMarkdown(msg.text);
        bubble.setAttribute('aria-label', 'Bot bericht');
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = msg.timestamp.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        messageWrapper.appendChild(botName);
        messageWrapper.appendChild(bubble);
        messageWrapper.appendChild(timestamp);
        container.appendChild(img);
        container.appendChild(messageWrapper);
        messages.appendChild(container);
      }
    });
    // Alleen scrollen naar onder als laatste bericht van gebruiker/bot is toegevoegd
    if (lastRenderedScrollToBottom) {
      messages.scrollTop = messages.scrollHeight;
    }
    updateStickyRegisterButton();
  }

  // On chat open, load chat history if not already loaded
  async function openChatbot() {
    windowEl.style.display = 'flex';
    input.focus();
    launcherLabel.style.display = 'none';
    addResizeHandles();
    visibleMessageCount = 10;
    if (!chatHistoryLoaded) {
      isLoadingHistory = true;
      renderMessages();
      const history = await fetchChatHistory();
      if (history.length > 0) {
        allMessages = history;
        chatHistoryLoaded = true;
      }
      isLoadingHistory = false;
    }
    lastRenderedScrollToBottom = true;
    renderMessages();
    if (hasRegistered()) {
      const valid = await ensureValidSession();
      if (!valid) {
        showRegistrationForm();
        return;
      }
    }
    if (!hasRegistered()) {
      showRegistrationForm();
    } else {
      trackAnalyticsEvent('chat_start', {});
      form.style.display = '';
    }
  }

  launcher.onclick = openChatbot;
  launcherLabel.onclick = openChatbot;
  closeBtn.onclick = () => {
    windowEl.style.display = 'none';
    launcherLabel.style.display = 'block';
  };

  // Simple markdown parser for bot messages
  function parseMarkdown(text) {
    // Convert **text** to <strong>text</strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert [text](url) to <a href="$2" target="_blank">$1</a>
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    // Convert \n to <br>
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  // In DOMContentLoaded, after selecting headerTitle, add the button to the header
  const header = document.querySelector('.chatbot-header');
  let registerBtn = document.createElement('button');
  registerBtn.id = 'stickyRegisterBtn';
  registerBtn.className = 'sticky-register-btn';
  registerBtn.textContent = 'Expo registratiepagina openen';
  registerBtn.setAttribute('aria-label', 'Expo registratiepagina openen');
  registerBtn.style.display = 'none';
  // Insert the button immediately after the headerTitle (FLORBot text)
  headerTitle.insertAdjacentElement('afterend', registerBtn);

  registerBtn.onclick = async () => {
    let sessionId = localStorage.getItem('chatbotSessionId');
    let company = null;
    if (sessionId) {
      try {
        const resp = await fetch(`${API_URL}/api/analytics/profile/${sessionId}`);
        if (resp.ok) {
          const profile = await resp.json();
          company = profile.company || null;
        }
      } catch (e) {}
    }
    const payload = { sessionId: sessionId || null, company: company };
    await trackAnalyticsEvent('registration', payload);
    let url = '#';
    if (websiteId === 'ffd') url = 'https://ffd25.registration.xpogroup.com/invitation';
    else if (websiteId === 'abiss') url = 'https://www.abissummit.nl/nl/bezoeken/praktische-info/';
    else if (websiteId === 'artisan') url = 'https://www.artisan-xpo.be/nl/plan-uw-bezoek/registreer-uw-bezoek/';
    window.open(url, '_blank');
  };

  // Update button visibility based on registration
  async function updateStickyRegisterButton() {
    registerBtn.style.display = (await hasRegistered()) ? 'inline-block' : 'none';
  }

  // Add typing indicator
  function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.id = 'typingIndicator';

    const img = document.createElement('img');
    img.src = 'images/robot.svg';
    img.alt = 'Bot';

    const bubble = document.createElement('div');
    bubble.className = 'typing-bubble';

    // Add three dots
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'typing-dot';
      bubble.appendChild(dot);
    }

    typingIndicator.appendChild(img);
    typingIndicator.appendChild(bubble);
    messages.appendChild(typingIndicator);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  // On chat form submit, check/create profile before sending message
  form.onsubmit = async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    // Toon direct het bericht met status 'Verzenden...'
    const sendingMsg = { text, isUser: true, timestamp: new Date(), sending: true };
    allMessages.push(sendingMsg);
    lastRenderedScrollToBottom = true;
    renderMessages();
    input.value = '';
    input.disabled = true;
    // Ensure profile exists before sending message
    const sessionId = getSessionIdCookie();
    if (sessionId) {
      const profileResp = await fetch(`${API_URL}/api/analytics/profile/${sessionId}`);
      if (profileResp.status === 404) {
        // Create profile if not exists
        const regData = JSON.parse(localStorage.getItem('registrationData') || '{}');
        await createUserProfile(sessionId, regData, websiteId);
      }
    }
    await trackChatMessage(text, true);
    showTypingIndicator();
    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, website: websiteId, sessionId })
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      hideTypingIndicator();
      // Vervang 'Verzenden...' status door het echte bericht
      allMessages = allMessages.filter(m => !m.sending);
      addMessage(text, true); // user message definitief
      let botText;
      if (data.response) {
        botText = data.response;
      } else if (data.RelevantEvents) {
        botText = data.RelevantEvents
          .map(ev => `• ${ev.Title}${ev.StandNumbers && ev.StandNumbers.length ? ' (Stand: ' + ev.StandNumbers.join(', ') + ')' : ''}`)
          .join('\n');
      } else {
        botText = JSON.stringify(data);
      }
      addMessage(botText);
      await trackChatMessage(botText, false);
    } catch (error) {
      hideTypingIndicator();
      allMessages = allMessages.filter(m => !m.sending);
      showError('Sorry, er ging iets mis. Probeer het later opnieuw.');
      await trackChatMessage('Sorry, er ging iets mis. Probeer het later opnieuw.', false);
    }
    input.disabled = false;
    input.focus();
  };

  // Handle disclaimer close button
  if (disclaimerClose) {
    disclaimerClose.onclick = () => {
      disclaimer.classList.add('hidden');
    };
  }

  // Initialize the website configuration if already registered
  (async () => {
    if (await hasRegistered()) {
      initializeWebsite();
    }
  })();

  async function ensureValidSession() {
    const sessionId = getSessionIdCookie();
    if (!sessionId) return false;
    try {
      const response = await fetch(`${API_URL}/api/analytics/profile/${sessionId}`);
      if (!response.ok) {
        if (response.status === 404) {
          clearSessionIdCookie();
          return false;
        }
        throw new Error('Failed to check session');
      }
      return true;
    } catch (e) {
      console.error('Session check failed:', e);
      return false;
    }
  }

  async function trackAnalyticsEvent(eventType, payload = {}) {
    const sessionId = getSessionIdCookie();
    console.log('trackAnalyticsEvent sessionId:', sessionId);
    fetch(`${API_URL}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, eventType, payload })
    })
    .then(async response => {
      if (response.status === 440) {
        showRegistrationForm();
        addMessage('Je sessie is verlopen of ongeldig. Vul het registratieformulier opnieuw in.');
      }
    })
    .catch(error => console.error('Error tracking analytics:', error));
  }

  async function trackChatMessage(message, isUser) {
    const sessionId = getSessionIdCookie();
    console.log('trackChatMessage sessionId:', sessionId);
    try {
      const response = await fetch(`${API_URL}/api/analytics/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message, isUser })
      });
      if (response.status === 440) {
        showRegistrationForm();
        addMessage('Je sessie is verlopen of ongeldig, ververs de pagina en vul het registratieformulier opnieuw in.');
        return;
      }
      if (!response.ok) throw new Error('Failed to track chat message');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error tracking chat message:', error);
      throw error;
    }
  }

  function showChatInterface() {
    const chatContainer = document.querySelector('.chat-container');
    chatContainer.innerHTML = `
        <div class="chat-messages"></div>
        <div class="chat-input">
            <input type="text" placeholder="Type your message...">
            <button>Send</button>
        </div>
    `;

    const input = chatContainer.querySelector('input');
    const button = chatContainer.querySelector('button');

    button.addEventListener('click', () => sendMessage());
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
  }

  async function sendMessage() {
    const input = document.querySelector('.chat-input input');
    const message = input.value.trim();
    
    if (message) {
        addMessage('user', message);
        input.value = '';
        
        // Here you would typically make an API call to get the bot's response
        // For now, we'll just echo the message
        setTimeout(() => {
            addMessage('bot', `You said: ${message}`);
        }, 1000);
    }
  }

  async function hasRegistered() {
    const sessionId = getSessionIdCookie();
    if (!sessionId) return false;
    try {
      const resp = await fetch(`${API_URL}/api/analytics/profile/${sessionId}`);
      if (resp.ok) return true;
      if (resp.status === 404) {
        clearSessionIdCookie();
        return false;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
});

// LAZY-LOADING ASSETS EXPLANATION:
// To further optimize, you can lazy-load chatbot assets (JS, CSS, images) only when the user opens the chat window.
// For example, use dynamic import('chatbot.js') on launcher click, or only inject CSS/images when openChatbot() is called.
// This reduces initial page load time and memory usage for users who never open the chat.
