// FFD Bot JavaScript Module

const BOT_NAME = 'AI-beursassistent';
const WEBSITE = 'ffd';
const API_URL = 'http://localhost:5000';

function injectChatbotHtml() {
  if (document.getElementById('chatbotLauncher')) return; // Already injected
  const container = document.createElement('div');
  container.className = 'chatbot-container';
  container.dataset.website = WEBSITE;
  container.innerHTML = `
    <div class="chatbot-launcher-wrapper">
      <div id="chatbotLauncher" class="chatbot-launcher" title="Open chatbot">
        <span><img src="../images/robot.svg" alt="Bot" /></span>
      </div>
      <div id="chatbotLauncherLabel" class="chatbot-launcher-label">Stel een vraag</div>
    </div>
    <div id="chatbotWindow" class="chatbot-window" style="display:none;">
      <div class="chatbot-header">
        <img src="../images/robot.svg" alt="Bot" class="chatbot-header-icon" />
        <span class="chatbot-header-title">${BOT_NAME}</span>
        <button class="chatbot-close" id="chatbotClose" title="Sluiten">×</button>
      </div>
      <div class="chatbot-messages" id="chatbotMessages"></div>
      <div class="privacy-disclaimer" id="privacyDisclaimer">
        <small>
          Door een chat te starten met de AI,
          <span class="disclaimer-bold">ga je akkoord</span> met onze
          <a href="gdpr.pdf" target="_blank" class="privacy-link">Privacyverklaring</a>.
        </small>
      </div>
      <form class="chatbot-input-area" id="chatbotForm" autocomplete="off" style="display:none;">
        <input class="chatbot-input" id="chatbotInput" type="text" placeholder="Schrijf een bericht" required />
        <button class="chatbot-send" type="submit" title="Versturen">
          <svg viewBox="0 0 24 24"><path d="M3 20L21 12L3 4V10L17 12L3 14V20Z" /></svg>
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(container);
}

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

let registrationStep = true;
let allMessages = [];
let visibleMessageCount = 10;
let chatHistoryLoaded = false;
let isLoadingHistory = false;
let lastRenderedScrollToBottom = true;

async function createUserProfile(sessionId, profileInfo) {
  try {
    const response = await fetch(`${API_URL}/api/metrics/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId,
        profileInfo: profileInfo,
        website: WEBSITE,
      }),
    });
    if (!response.ok) throw new Error('Failed to create user profile');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function showError(msg, messages) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'chat-error-message';
  errorDiv.textContent = msg;
  messages.appendChild(errorDiv);
}

function addMessage(text, isUser = false, opts = {}, messages) {
  const msg = { text, isUser, timestamp: new Date(), ...opts };
  allMessages.push(msg);
  lastRenderedScrollToBottom = true;
  renderMessages(messages);
}

function renderMessages(messages) {
  messages.innerHTML = '';
  const total = allMessages.length;
  const start = Math.max(0, total - visibleMessageCount);
  const visible = allMessages.slice(start, total);
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
      visibleMessageCount = Math.min(
        visibleMessageCount + 10,
        allMessages.length
      );
      isLoadingHistory = true;
      renderMessages(messages);
      setTimeout(() => {
        isLoadingHistory = false;
        renderMessages(messages);
      }, 400);
    };
    messages.appendChild(loadOlderBtn);
  }
  let prevSender = null;
  let prevDate = null;
  visible.forEach((msg) => {
    const isFirstOfGroup =
      prevSender !== msg.isUser ||
      !isSameDay(msg.timestamp, prevDate || msg.timestamp);
    prevSender = msg.isUser;
    prevDate = msg.timestamp;
    const now = new Date();
    if (isFirstOfGroup && !isSameDay(msg.timestamp, now)) {
      const dateDiv = document.createElement('div');
      dateDiv.className = 'chat-date-label';
      dateDiv.textContent = msg.timestamp.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      messages.appendChild(dateDiv);
    }
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
      timestamp.textContent = msg.timestamp.toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit',
      });
      container.appendChild(bubble);
      container.appendChild(timestamp);
      messages.appendChild(container);
    } else {
      const container = document.createElement('div');
      container.className = 'bot-message-container';
      if (isFirstOfGroup) container.classList.add('first-of-group');
      const img = document.createElement('img');
      img.src = '../images/robot.svg';
      img.alt = 'Bot';
      const messageWrapper = document.createElement('div');
      messageWrapper.className = 'message-wrapper';
      const botName = document.createElement('div');
      botName.className = 'bot-name';
      botName.textContent = BOT_NAME;
      const bubble = document.createElement('div');
      bubble.className = 'chatbot-bubble';
      bubble.innerHTML = parseMarkdown(msg.text);
      bubble.setAttribute('aria-label', 'Bot bericht');
      const timestamp = document.createElement('div');
      timestamp.className = 'timestamp';
      timestamp.textContent = msg.timestamp.toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit',
      });
      messageWrapper.appendChild(botName);
      messageWrapper.appendChild(bubble);
      messageWrapper.appendChild(timestamp);
      container.appendChild(img);
      container.appendChild(messageWrapper);
      messages.appendChild(container);
    }
  });
  if (lastRenderedScrollToBottom) {
    messages.scrollTop = messages.scrollHeight;
  }
  updateStickyRegisterButton();
}

function parseMarkdown(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
  text = text.replace(/\n/g, '<br>');
  return text;
}

function addResizeHandles(windowEl) {
  windowEl.querySelectorAll('.resize-handle').forEach((h) => h.remove());
  windowEl.style.minWidth = '300px';
  windowEl.style.minHeight = '400px';
  const handles = ['left', 'top', 'top-left'];
  handles.forEach((dir) => {
    const handle = document.createElement('div');
    handle.className = `resize-handle ${dir}`;
    windowEl.appendChild(handle);
    handle.addEventListener('mousedown', (e) => startResize(e, dir, windowEl));
  });
}
function startResize(e, dir, windowEl) {
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

async function fetchChatHistory(messages) {
  isLoadingHistory = true;
  renderMessages(messages);
  const sessionId = getSessionIdCookie();
  if (!sessionId) {
    isLoadingHistory = false;
    return [];
  }
  try {
    const resp = await fetch(`${API_URL}/api/metrics/profile/${sessionId}`);
    if (!resp.ok) {
      isLoadingHistory = false;
      return [];
    }
    const profile = await resp.json();
    if (profile && Array.isArray(profile.chatHistory)) {
      isLoadingHistory = false;
      return profile.chatHistory.map((m) => ({
        text: m.message,
        isUser: m.isUser,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      }));
    }
    isLoadingHistory = false;
    return [];
  } catch (e) {
    isLoadingHistory = false;
    showError('Kon oude berichten niet laden, probeer opnieuw.', messages);
    return [];
  }
}

async function ensureValidSession() {
  const sessionId = getSessionIdCookie();
  if (!sessionId) return false;
  try {
    const response = await fetch(
      `${API_URL}/api/metrics/profile/${sessionId}`
    );
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
  fetch(`${API_URL}/api/metrics/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, eventType, payload }),
  })
    .then(async (response) => {
      if (response.status === 440) {
        initializeWebsite();
        addMessage(
          'Je sessie is verlopen of ongeldig. Start opnieuw met je profielinfo.',
          false,
          {},
          document.getElementById('chatbotMessages')
        );
      }
    })
    .catch((error) => console.error('Error tracking analytics:', error));
}

async function trackChatMessage(message, isUser) {
  const sessionId = getSessionIdCookie();
  try {
    const response = await fetch(`${API_URL}/api/metrics/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message, isUser }),
    });
    if (response.status === 440) {
      initializeWebsite();
      addMessage(
        'Je sessie is verlopen of ongeldig, start opnieuw met je profielinfo.',
        false,
        {},
        document.getElementById('chatbotMessages')
      );
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

function showTypingIndicator(messages) {
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  typingIndicator.id = 'typingIndicator';
  const img = document.createElement('img');
  img.src = '../../images/robot.svg';
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

async function hasRegistered() {
  const sessionId = getSessionIdCookie();
  if (!sessionId) return false;
  try {
    const resp = await fetch(`${API_URL}/api/metrics/profile/${sessionId}`);
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

async function updateStickyRegisterButton() {
  const registerBtn = document.getElementById('stickyRegisterBtn');
  if (!registerBtn) return;
  registerBtn.style.display = (await hasRegistered())
    ? 'inline-block'
    : 'none';
}

function initializeWebsite(messages, form) {
  const now = new Date();
  const timeString = now.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  });
  messages.innerHTML = `
    <div class="bot-message-container">
      <img src="../images/robot.svg" alt="Bot">
      <div class="message-wrapper">
        <div class="bot-name">${BOT_NAME}</div>
        <div class="chatbot-bubble">
          Hoi! Ik ben je AI-beursassistent, ik kan je gepersonaliseerde informatie bezorgen over het event. Wat is jouw functietitel en bedrijfsnaam?
        </div>
        <div class="timestamp">${timeString}</div>
      </div>
    </div>
    <div class="privacy-link-container" style="text-align:right;margin-top:8px;">
      <a href="gdpr.pdf" target="_blank" class="privacy-link" style="font-size:12px;opacity:0.7;">Privacyverklaring</a>
    </div>
  `;
  form.style.display = '';
  registrationStep = true;
  allMessages = [];
  lastRenderedScrollToBottom = true;
}

function initFFDBot() {
  injectChatbotHtml();
  document.addEventListener('DOMContentLoaded', () => {
    const launcher = document.getElementById('chatbotLauncher');
    const launcherLabel = document.getElementById('chatbotLauncherLabel');
    const windowEl = document.getElementById('chatbotWindow');
    const closeBtn = document.getElementById('chatbotClose');
    const form = document.getElementById('chatbotForm');
    const input = document.getElementById('chatbotInput');
    const messages = document.getElementById('chatbotMessages');
    const headerTitle = document.querySelector('.chatbot-header-title');
    const disclaimer = document.getElementById('privacyDisclaimer');
    const chatbotContainer = document.querySelector('.chatbot-container');
    chatbotContainer.dataset.website = WEBSITE;
    headerTitle.textContent = BOT_NAME;
    // Add sticky register button
    const header = document.querySelector('.chatbot-header');
    let registerBtn = document.createElement('button');
    registerBtn.id = 'stickyRegisterBtn';
    registerBtn.className = 'sticky-register-btn';
    registerBtn.textContent = 'Expo registratiepagina openen';
    registerBtn.setAttribute('aria-label', 'Expo registratiepagina openen');
    registerBtn.style.display = 'none';
    headerTitle.insertAdjacentElement('afterend', registerBtn);
    registerBtn.onclick = async () => {
      const sessionId = getSessionIdCookie();
      let profileInfo = null;
      if (sessionId) {
        try {
          const resp = await fetch(`${API_URL}/api/metrics/profile/${sessionId}`);
          if (resp.ok) {
            const profile = await resp.json();
            profileInfo = profile.profileInfo || null;
          }
        } catch (e) {}
      }
      await trackAnalyticsEvent('registration', { sessionId, website: WEBSITE, profileInfo });
      window.open('https://ffd25.registration.xpogroup.com/invitation', '_blank');
    };
    // Initialize chat window
    function localInitializeWebsite() {
      initializeWebsite(messages, form);
    }
    // Form submit logic
    form.onsubmit = async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      const privacyDisclaimer = document.getElementById('privacyDisclaimer');
      if (privacyDisclaimer) {
        privacyDisclaimer.innerHTML =
          '<a href="gdpr.pdf" target="_blank" class="privacy-link" style="display:block;text-align:right;font-size:12px;opacity:0.7;margin:0 8px 0 0;">Privacyverklaring</a>';
        privacyDisclaimer.style.background = 'transparent';
        privacyDisclaimer.style.padding = '0';
        privacyDisclaimer.style.margin = '0';
        privacyDisclaimer.style.borderRadius = '0';
        privacyDisclaimer.style.boxShadow = 'none';
        privacyDisclaimer.style.minHeight = 'unset';
        privacyDisclaimer.style.background = '#f5f5f5';
        privacyDisclaimer.style.paddingBottom = '8px';
      }
      const sendingMsg = {
        text,
        isUser: true,
        timestamp: new Date(),
        sending: true,
      };
      allMessages.push(sendingMsg);
      lastRenderedScrollToBottom = true;
      renderMessages(messages);
      input.value = '';
      input.disabled = true;
      const sessionId = getSessionIdCookie();
      if (registrationStep) {
        let sid = sessionId;
        if (!sid) {
          const response = await fetch(`${API_URL}/api/metrics/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!response.ok) throw new Error('Failed to get sessionId from backend');
          const data = await response.json();
          setSessionIdCookie(data.sessionId);
          sid = data.sessionId;
        }
        await createUserProfile(sid, text);
        await trackAnalyticsEvent('chat_start', { sessionId: sid, website: WEBSITE, profileInfo: text });
        allMessages = allMessages.filter((m) => !m.sending);
        addMessage(text, true, {}, messages);
        setTimeout(() => {
          addMessage('Bedankt voor jouw interesse! Waar ben je precies naar op zoek?', false, {}, messages);
        }, 400);
        registrationStep = false;
        input.disabled = false;
        input.focus();
        return;
      }
      await trackChatMessage(text, true);
      showTypingIndicator(messages);
      try {
        const response = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text, website: WEBSITE, sessionId }),
        });
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        hideTypingIndicator();
        allMessages = allMessages.filter((m) => !m.sending);
        addMessage(text, true, {}, messages);
        let botText;
        if (data.response) {
          botText = data.response;
        } else if (data.RelevantEvents) {
          botText = data.RelevantEvents.map(
            (ev) =>
              `• ${ev.Title}${ev.StandNumbers && ev.StandNumbers.length ? ' (Stand: ' + ev.StandNumbers.join(', ') + ')' : ''}`
          ).join('\n');
        } else {
          botText = JSON.stringify(data);
        }
        addMessage(botText, false, {}, messages);
        await trackChatMessage(botText, false);
      } catch (error) {
        hideTypingIndicator();
        allMessages = allMessages.filter((m) => !m.sending);
        showError('Sorry, er ging iets mis. Probeer het later opnieuw.', messages);
        await trackChatMessage('Sorry, er ging iets mis. Probeer het later opnieuw.', false);
      }
      input.disabled = false;
      input.focus();
    };
    // Open/close logic
    async function openChatbot() {
      windowEl.style.display = 'flex';
      input.focus();
      launcherLabel.style.display = 'none';
      addResizeHandles(windowEl);
      visibleMessageCount = 10;
      if (!chatHistoryLoaded) {
        isLoadingHistory = true;
        renderMessages(messages);
        const history = await fetchChatHistory(messages);
        if (history.length > 0) {
          allMessages = history;
          chatHistoryLoaded = true;
        }
        isLoadingHistory = false;
      }
      lastRenderedScrollToBottom = true;
      renderMessages(messages);
      if (await hasRegistered()) {
        const valid = await ensureValidSession();
        if (!valid) {
          localInitializeWebsite();
          return;
        }
      }
      if (!(await hasRegistered())) {
        localInitializeWebsite();
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
    // Initialize if already registered
    (async () => {
      if (await hasRegistered()) {
        localInitializeWebsite();
      }
    })();
  });
}

// At the top-level, inject HTML, then initialize
injectChatbotHtml();
initFFDBot(); 