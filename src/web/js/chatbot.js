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

  // Get website ID from selector or fallback to container data attribute
  const chatbotContainer = document.querySelector('.chatbot-container');
  const chatSelector = document.getElementById('chatSelector');
  let websiteId = chatbotContainer.dataset.website;
  if (chatSelector) {
    websiteId = chatSelector.value;
    chatbotContainer.dataset.website = websiteId;
    chatSelector.onchange = () => {
      websiteId = chatSelector.value;
      chatbotContainer.dataset.website = websiteId;
      initializeWebsite();
    };
  }

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

  // API endpoint configuration
  const API_URL = 'http://localhost:5000';

  // Check if user has registered
  function hasRegistered() {
    return localStorage.getItem('chatbotRegistered') === 'true';
  }

  // Show registration form
  function showRegistrationForm() {
    const formHtml = `
      <div class="registration-form">
        <h3>Expo registratie</h3>
        <form id="registrationForm">
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
    // Handle form submission
    document.getElementById('registrationForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = {
        company: document.getElementById('company').value,
        jobTitle: document.getElementById('jobTitle').value,
        companyDescription: document.getElementById('companyDescription').value
      };
      trackAnalyticsEvent('form_submission', formData);
      localStorage.setItem('chatbotRegistered', 'true');
      await createUserProfile(getSessionId(), formData);
      // Remove registration form from DOM
      messages.innerHTML = '';
      // Show chat input area
      form.style.display = '';
      // Re-initialize chat
      initializeWebsite();
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

  // Open/close chatbot
  function openChatbot() {
    windowEl.style.display = 'flex';
    input.focus();
    launcherLabel.style.display = 'none';

    // Show registration form if not registered
    if (!hasRegistered()) {
      showRegistrationForm();
    }
  }

  launcher.onclick = openChatbot;
  launcherLabel.onclick = openChatbot;
  closeBtn.onclick = () => {
    windowEl.style.display = 'none';
    launcherLabel.style.display = 'block';
  };

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
      bubble.innerHTML = text;

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

      // Registration button (less intrusive, modern look)
      const lastMessage = messages.lastElementChild;
      if (lastMessage && lastMessage.classList.contains('bot-message-container')) {
        const registerButton = document.createElement('button');
        registerButton.className = 'register-button subtle';
        registerButton.textContent = 'Expo registratiepagina openen';
        registerButton.onclick = () => {
          // Track registration click
          trackAnalyticsEvent('registration', {});
          // Redirect to the correct expo registration page
          let url = '#';
          if (websiteId === 'ffd') url = 'https://ffd25.registration.xpogroup.com/invitation';
          else if (websiteId === 'abiss') url = 'https://www.abissummit.nl/nl/bezoeken/praktische-info/';
          else if (websiteId === 'artisan') url = 'https://www.artisan-xpo.be/nl/plan-uw-bezoek/registreer-uw-bezoek/';
          window.open(url, '_blank');
        };
        lastMessage.appendChild(registerButton);
      }
    }

    messages.scrollTop = messages.scrollHeight;
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
    await trackChatMessage(getSessionId(), text, true);

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

  // Initialize resize handles for chat window
  (function initResizers() {
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
          windowEl.style.width = (startWidth - dx) + 'px';
        }
        if (dir === 'top' || dir === 'top-left') {
          const dy = ev.clientY - startY;
          windowEl.style.height = (startHeight - dy) + 'px';
        }
      }

      function stopResize() {
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
      }

      document.addEventListener('mousemove', doResize);
      document.addEventListener('mouseup', stopResize);
    }
  })();

  function generateSessionId() {
    // Generate a GUID-like string
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getSessionId() {
    let sessionId = localStorage.getItem('chatbotSessionId');
    if (!sessionId) {
      sessionId = generateSessionId();
      localStorage.setItem('chatbotSessionId', sessionId);
    }
    return sessionId;
  }

  function trackAnalyticsEvent(eventType, payload = {}) {
    const sessionId = getSessionId();
    const event = {
      sessionId,
      eventType,
      payload,
      timestamp: new Date().toISOString()
    };

    fetch(`${API_URL}/api/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    }).catch(error => console.error('Error tracking analytics:', error));
  }

  async function createUserProfile(sessionId, formData) {
    try {
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
                chatHistory: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
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

  async function trackChatMessage(sessionId, message, isUser) {
    try {
        const response = await fetch(`${API_URL}/api/analytics/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                message: message,
                isUser: isUser
            })
        });

        if (!response.ok) {
            throw new Error('Failed to track chat message');
        }

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
