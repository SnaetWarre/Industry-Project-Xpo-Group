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

  // Check if user has registered
  function hasRegistered() {
    return localStorage.getItem('chatbotRegistered') === 'true';
  }

  // Show the welcome message in the chat window
  function showWelcomeMessage() {
    const config = websiteConfig[websiteId];
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
    }
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
    // Hide chat input area while registering
    form.style.display = 'none';
    // Remove any horizontal overflow on the chat window
    windowEl.style.overflowX = 'hidden';
    messages.style.overflowX = 'hidden';
    addResizeHandles();
    // Handle form submission
    document.getElementById('registrationForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = {
        company: document.getElementById('company').value,
        jobTitle: document.getElementById('jobTitle').value,
        companyDescription: document.getElementById('companyDescription').value
      };
      // Always get a new sessionId from backend for a new registration
      const newSessionId = await fetchSessionIdFromBackend();
      localStorage.setItem('chatbotSessionId', newSessionId);
      await trackAnalyticsEvent('form_submission', formData);
      localStorage.setItem('chatbotRegistered', 'true');
      console.log('Registering user with website:', websiteId);
      await createUserProfile(newSessionId, formData, websiteId);
      // Remove registration form from DOM
      showWelcomeMessage();
      form.style.display = '';
    });
  }

  // Initialize website configuration
  function initializeWebsite() {
    const config = websiteConfig[websiteId];
    if (!hasRegistered()) {
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

  // Open/close chatbot
  function openChatbot() {
    windowEl.style.display = 'flex';
    input.focus();
    launcherLabel.style.display = 'none';
    addResizeHandles();
    // Show registration form if not registered
    if (!hasRegistered()) {
      showRegistrationForm();
    } else {
      showWelcomeMessage();
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

  // Add message to chat
  function addMessage(text, isUser = false) {
    if (isUser) {
      const container = document.createElement('div');
      container.className = 'user-message-container';
      const bubble = document.createElement('div');
      bubble.className = 'chatbot-bubble user';
      bubble.textContent = text;
      const timestamp = document.createElement('div');
      timestamp.className = 'timestamp';
      const now = new Date();
      timestamp.textContent = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
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
      const botName = document.createElement('div');
      botName.className = 'bot-name';
      botName.textContent = websiteConfig[websiteId].botName;
      const bubble = document.createElement('div');
      bubble.className = 'chatbot-bubble';
      bubble.innerHTML = parseMarkdown(text);
      const timestamp = document.createElement('div');
      timestamp.className = 'timestamp';
      const now = new Date();
      timestamp.textContent = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
      messageWrapper.appendChild(botName);
      messageWrapper.appendChild(bubble);
      messageWrapper.appendChild(timestamp);
      container.appendChild(img);
      container.appendChild(messageWrapper);
      messages.appendChild(container);
    }
    messages.scrollTop = messages.scrollHeight;
    updateStickyRegisterButton();
  }

  // Sticky registration button logic
  function updateStickyRegisterButton() {
    let btn = document.getElementById('stickyRegisterBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'stickyRegisterBtn';
      btn.className = 'sticky-register-btn';
      btn.textContent = 'Expo registratiepagina openen';
      btn.onclick = async () => {
        await trackAnalyticsEvent('registration', {});
        let url = '#';
        if (websiteId === 'ffd') url = 'https://ffd25.registration.xpogroup.com/invitation';
        else if (websiteId === 'abiss') url = 'https://www.abissummit.nl/nl/bezoeken/praktische-info/';
        else if (websiteId === 'artisan') url = 'https://www.artisan-xpo.be/nl/plan-uw-bezoek/registreer-uw-bezoek/';
        window.open(url, '_blank');
      };
      windowEl.appendChild(btn);
    }
    // Only show if user is registered and has not exceeded message limit (or always, if you want)
    btn.style.display = hasRegistered() ? 'block' : 'none';
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

  // Handle form submission
  form.onsubmit = async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    // Add user message
    addMessage(text, true);
    input.value = '';
    input.disabled = true;

    // Store user message in chatHistory
    await trackChatMessage(text, true);

    // Show typing indicator
    showTypingIndicator();

    try {
      // Send message to backend
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: text,
          website: websiteId,
          sessionId: await getSessionId()
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();

      // Hide typing indicator before showing response
      hideTypingIndicator();
      // Determine bot output: prefer LLM 'response', otherwise format event list
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
    } catch (error) {
      console.error('Error:', error);
      // Hide typing indicator before showing error
      hideTypingIndicator();
      addMessage('Sorry, er ging iets mis. Probeer het later opnieuw.');
    }

    input.disabled = false;
    input.focus();
  };

  // Handle disclaimer close button
  disclaimerClose.onclick = () => {
    disclaimer.classList.add('hidden');
  };

  // Initialize the website configuration if already registered
  if (hasRegistered()) {
    initializeWebsite();
  }

  async function fetchSessionIdFromBackend() {
    const response = await fetch(`${API_URL}/api/analytics/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to get sessionId from backend');
    const data = await response.json();
    return data.sessionId;
  }

  async function getSessionId() {
    let sessionId = localStorage.getItem('chatbotSessionId');
    if (!sessionId) {
      sessionId = await fetchSessionIdFromBackend();
      localStorage.setItem('chatbotSessionId', sessionId);
    }
    return sessionId;
  }

  async function trackAnalyticsEvent(eventType, payload = {}) {
    const sessionId = await getSessionId();
    fetch(`${API_URL}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, eventType, payload })
    }).catch(error => console.error('Error tracking analytics:', error));
  }

  async function createUserProfile(sessionId, formData, websiteIdArg) {
    try {
        console.log('createUserProfile payload website:', websiteIdArg);
        const response = await fetch(`${API_URL}/api/analytics/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                company: formData.company,
                jobTitle: formData.jobTitle,
                companyDescription: formData.companyDescription,
                website: websiteIdArg
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create user profile');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
  }

  async function trackChatMessage(message, isUser) {
    const sessionId = await getSessionId();
    try {
      const response = await fetch(`${API_URL}/api/analytics/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message, isUser })
      });
      if (!response.ok) throw new Error('Failed to track chat message');
      const data = await response.json();
      // ... handle data as needed
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

  function initializeWebsite() {
    const website = document.body.getAttribute('data-website');
    if (!website) {
        console.error('Website attribute not set');
        return;
    }

    const hasRegistered = localStorage.getItem('hasRegistered') === 'true';
    if (!hasRegistered) {
        showRegistrationForm();
    } else {
        showChatInterface();
    }
  }
});
