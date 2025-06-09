// Inject general and Abiss-specific CSS if not already present
(function injectAbissCss() {
  if (document.getElementById('abiss-bot-css')) return;
  const style = document.createElement('style');
  style.id = 'abiss-bot-css';
  style.textContent = `
    :root {
      --abiss-color: #E85811;
      --chat-width: 350px;
      --chat-height: 600px;
      --title-font: 'Ropa Sans', sans-serif;
      --text-font: 'Open Sans', sans-serif;
    }
    .chatbot-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      font-family: var(--text-font);
    }
    .chatbot-launcher-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .chatbot-launcher {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .chatbot-launcher img {
      width: 32px;
      height: 32px;
      filter: brightness(0) invert(1);
    }
    .chatbot-launcher-label {
      background: white;
      padding: 8px 16px;
      border-radius: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      font-size: 14px;
      cursor: pointer;
    }
    .chatbot-window {
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: var(--chat-width);
      height: var(--chat-height);
      background: white;
      border-radius: 4px;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .chatbot-header {
      padding: 16px;
      color: white;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .chatbot-header-icon {
      width: 24px;
      height: 24px;
      filter: brightness(0) invert(1);
    }
    .chatbot-header-title {
      font-size: 20px;
      font-weight: normal;
      margin-right: auto;
      font-family: var(--title-font);
    }
    .chatbot-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .chatbot-messages {
      flex-grow: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f5f5f5;
      overflow-x: hidden !important;
    }
    .chatbot-bubble {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 12px;
      background: white;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      line-height: 1.4;
      font-size: 14px;
      align-self: flex-start;
    }
    .bot-message-container {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      max-width: 100%;
      align-self: flex-start;
      width: 100%;
    }
    .bot-message-container .bot-name {
      font-size: 12px;
      color: #000000;
      margin-bottom: 4px;
      font-family: var(--title-font);
    }
    .bot-message-container .timestamp {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
      font-family: var(--text-font);
    }
    .bot-message-container .message-wrapper {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
    }
    .bot-message-container img {
      width: 24px;
      height: 24px;
      margin-top: 8px;
      flex-shrink: 0;
    }
    .bot-message-container .chatbot-bubble {
      max-width: calc(100% - 32px);
      margin: 0;
      flex-grow: 1;
    }
    .chatbot-bubble.user {
      background: var(--abiss-color);
      color: white;
      align-self: flex-end;
    }
    .user-message-container {
      align-self: flex-end;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      max-width: 80%;
    }
    .user-message-container .timestamp {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
      font-family: var(--text-font);
    }
    .chatbot-input-area {
      padding: 16px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
    }
    .chatbot-input {
      flex-grow: 1;
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 8px 16px;
      font-size: 14px;
      outline: none;
    }
    .chatbot-input:focus {
      border-color: #999;
    }
    .chatbot-send {
      background: none;
      border: none;
      padding: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chatbot-send svg {
      width: 24px;
      height: 24px;
      fill: #666;
    }
    .chatbot-send:hover svg {
      fill: #333;
    }
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 100%;
      align-self: flex-start;
      width: 100%;
      margin-top: 8px;
    }
    .typing-indicator img {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    .typing-bubble {
      background: #f0f0f0;
      padding: 12px 16px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .typing-dot {
      width: 6px;
      height: 6px;
      background: #999;
      border-radius: 50%;
      animation: typingAnimation 1.4s infinite;
      opacity: 0.3;
    }
    .typing-dot:nth-child(2) {
      animation-delay: 0.2s;
    }
    .typing-dot:nth-child(3) {
      animation-delay: 0.4s;
    }
    @keyframes typingAnimation {
      0% { opacity: 0.3; transform: translateY(0); }
      50% { opacity: 1; transform: translateY(-2px); }
      100% { opacity: 0.3; transform: translateY(0); }
    }
    .chatbot-container[data-website="abiss"] .chatbot-header,
    .chatbot-container[data-website="abiss"] .chatbot-launcher {
      background-color: var(--abiss-color);
    }
    .chatbot-container[data-website="abiss"] .chatbot-bubble.user {
      background-color: var(--abiss-color);
      color: white;
    }
    .chatbot-container[data-website="abiss"] .bot-message-container img {
      filter: brightness(0) saturate(100%) invert(45%) sepia(98%) saturate(1234%) hue-rotate(351deg) brightness(97%) contrast(91%);
    }
    .chatbot-container[data-website="abiss"] .typing-indicator img {
      filter: brightness(0) saturate(100%) invert(45%) sepia(98%) saturate(1234%) hue-rotate(351deg) brightness(97%) contrast(91%);
    }
    .register-main-btn {
      background: var(--abiss-color);
      color: #fff;
      border: none;
      padding: 12px 0;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-family: var(--title-font);
      font-weight: 600;
      width: 100%;
      margin-top: 10px;
      box-shadow: 0 2px 8px rgba(219,98,69,0.08);
      transition: background 0.2s, box-shadow 0.2s;
    }
    .chatbot-container[data-website="abiss"] .register-main-btn { background: var(--abiss-color); }
    .register-main-btn:hover {
      background: #b94c2e;
      box-shadow: 0 4px 16px rgba(219,98,69,0.13);
    }
    .register-button.subtle {
      background: none;
      color: var(--abiss-color);
      border: none;
      padding: 0 0 0 4px;
      font-size: 13px;
      font-family: var(--title-font);
      text-decoration: underline dotted;
      cursor: pointer;
      margin-top: 6px;
      margin-left: 2px;
      transition: color 0.2s;
      box-shadow: none;
      display: inline;
    }
    .chatbot-container[data-website="abiss"] .register-button.subtle { color: var(--abiss-color); }
    .register-button.subtle:hover {
      color: #b94c2e;
      text-decoration: underline;
    }
    .sticky-register-btn {
      position: absolute;
      bottom: 70px;
      right: 24px;
      z-index: 1100;
      background: var(--abiss-color);
      color: #fff;
      border: none;
      border-radius: 24px;
      padding: 12px 22px;
      font-size: 15px;
      font-family: var(--title-font);
      font-weight: 600;
      box-shadow: 0 2px 12px rgba(219,98,69,0.13);
      cursor: pointer;
      transition: background 0.2s, box-shadow 0.2s;
      outline: none;
      display: block;
    }
    .chatbot-container[data-website="abiss"] .sticky-register-btn { background: var(--abiss-color); }
    .sticky-register-btn:hover {
      background: #b94c2e;
      box-shadow: 0 4px 16px rgba(219,98,69,0.18);
    }
    @media (max-width: 600px) {
      .sticky-register-btn {
        bottom: 60px;
        right: 10px;
        padding: 10px 14px;
        font-size: 13px;
      }
    }
  `;
  document.head.appendChild(style);
})();

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
  const chatbotContainer = document.querySelector('.chatbot-container');

  // Abiss bot configuration
  const botName = 'AbissBot';
  const welcomeMessage = 'Hoi! Ik ben je digitale beursassistent voor ABISS. Ik kan je helpen met informatie over digitalisering, automatisering, Industry of Things, Intelligence of Things en Security of Things. Waar ben je naar op zoek?';
  const websiteId = 'abiss';
  const API_URL = 'http://localhost:5000';

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
      throw error;
    }
  }

  async function initializeWebsite() {
    if (!(await hasRegistered())) {
      showRegistrationForm();
      return;
    }
    headerTitle.textContent = botName;
    const now = new Date();
    const timeString = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    messages.innerHTML = `
      <div class="bot-message-container">
        <img src="images/robot.svg" alt="Bot">
        <div class="message-wrapper">
          <div class="bot-name">${botName}</div>
          <div class="chatbot-bubble">
            ${welcomeMessage}
          </div>
          <div class="timestamp">${timeString}</div>
        </div>
      </div>
    `;
    form.style.display = '';
  }

  function addResizeHandles() {
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

  let allMessages = [];
  let visibleMessageCount = 10;

  function addMessage(text, isUser = false) {
    allMessages.push({ text, isUser, timestamp: new Date() });
    renderMessages();
  }

  function renderMessages() {
    messages.innerHTML = '';
    const total = allMessages.length;
    const start = Math.max(0, total - visibleMessageCount);
    const visible = allMessages.slice(start, total);
    if (start > 0) {
      const loadOlderBtn = document.createElement('button');
      loadOlderBtn.textContent = 'Load older messages';
      loadOlderBtn.className = 'load-older-btn';
      loadOlderBtn.onclick = () => {
        visibleMessageCount += 10;
        renderMessages();
      };
      messages.appendChild(loadOlderBtn);
    }
    visible.forEach(msg => {
      if (msg.isUser) {
        const container = document.createElement('div');
        container.className = 'user-message-container';
        const bubble = document.createElement('div');
        bubble.className = 'chatbot-bubble user';
        bubble.textContent = msg.text;
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = msg.timestamp.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        container.appendChild(bubble);
        container.appendChild(timestamp);
        messages.appendChild(container);
      } else {
        const container = document.createElement('div');
        container.className = 'bot-message-container';
        const img = document.createElement('img');
        img.src = 'images/robot.svg';
        img.alt = 'Bot';
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'message-wrapper';
        const botNameDiv = document.createElement('div');
        botNameDiv.className = 'bot-name';
        botNameDiv.textContent = botName;
        const bubble = document.createElement('div');
        bubble.className = 'chatbot-bubble';
        bubble.innerHTML = parseMarkdown(msg.text);
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = msg.timestamp.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        messageWrapper.appendChild(botNameDiv);
        messageWrapper.appendChild(bubble);
        messageWrapper.appendChild(timestamp);
        container.appendChild(img);
        container.appendChild(messageWrapper);
        messages.appendChild(container);
      }
    });
    messages.scrollTop = messages.scrollHeight;
    updateStickyRegisterButton();
  }

  async function openChatbot() {
    windowEl.style.display = 'flex';
    input.focus();
    launcherLabel.style.display = 'none';
    addResizeHandles();
    visibleMessageCount = 10;
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

  function parseMarkdown(text) {
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
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
  // Insert the button immediately after the headerTitle (AbissBot text)
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
    let url = 'https://www.abissummit.nl/nl/bezoeken/praktische-info/';
    window.open(url, '_blank');
  };

  // Update button visibility based on registration
  async function updateStickyRegisterButton() {
    registerBtn.style.display = (await hasRegistered()) ? 'inline-block' : 'none';
  }

  function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.id = 'typingIndicator';
    const img = document.createElement('img');
    img.src = 'images/robot.svg';
    img.alt = 'Bot';
    const bubble = document.createElement('div');
    bubble.className = 'typing-bubble';
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

  form.onsubmit = async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, true);
    input.value = '';
    input.disabled = true;
    const sessionId = getSessionIdCookie();
    if (sessionId) {
      const profileResp = await fetch(`${API_URL}/api/analytics/profile/${sessionId}`);
      if (profileResp.status === 404) {
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
      const errorMessage = 'Sorry, er ging iets mis. Probeer het later opnieuw.';
      addMessage(errorMessage);
      await trackChatMessage(errorMessage, false);
    }
    input.disabled = false;
    input.focus();
  };

  if (disclaimerClose) {
    disclaimerClose.onclick = () => {
      disclaimer.classList.add('hidden');
    };
  }

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
      return false;
    }
  }

  async function trackAnalyticsEvent(eventType, payload = {}) {
    const sessionId = getSessionIdCookie();
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
    .catch(error => {});
  }

  async function trackChatMessage(message, isUser) {
    const sessionId = getSessionIdCookie();
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
      throw error;
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
