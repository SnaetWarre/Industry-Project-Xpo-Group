document.addEventListener('DOMContentLoaded', () => {
  const launcher = document.getElementById('chatbotLauncher');
  const launcherLabel = document.getElementById('chatbotLauncherLabel');
  const windowEl = document.getElementById('chatbotWindow');
  const closeBtn = document.getElementById('chatbotClose');
  const form = document.getElementById('chatbotForm');
  const input = document.getElementById('chatbotInput');
  const messages = document.getElementById('chatbotMessages');
  const headerTitle = document.querySelector('.chatbot-header-title');

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

  // Initialize website configuration
  function initializeWebsite() {
    const config = websiteConfig[websiteId];
    if (config) {
      // Update bot name in header
      headerTitle.textContent = config.botName;

      // Update welcome message
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
    } else {
      console.error(`Website configuration not found for ID: ${websiteId}`);
    }
  }

  // Open/close chatbot
  function openChatbot() {
    windowEl.style.display = 'flex';
    input.focus();
    launcherLabel.style.display = 'none';
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

  // Initialize the website configuration
  initializeWebsite();
});
