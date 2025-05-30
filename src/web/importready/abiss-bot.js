// Import markdown-it for markdown support
import MarkdownIt from 'markdown-it';
const md = new MarkdownIt();

// Create and inject the chatbot HTML structure
function createChatbotStructure() {
    const container = document.createElement('div');
    container.className = 'chatbot-container';
    container.dataset.website = 'abiss';
    
    container.innerHTML = `
        <div class="chatbot-launcher-wrapper">
            <div class="chatbot-launcher-label" id="chatbotLauncherLabel">
                Vraag iets aan de AI
            </div>
            <div class="chatbot-launcher" id="chatbotLauncher" title="Open chatbot">
                <span>
                    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTktOCA4LTggOCAzLjU5IDggOC0zLjU5IDgtOCA4em0wLTE0Yy0zLjMxIDAtNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6bTAgMTBjMS42NiAwIDMtMS4zNCAzLTMtLjU1IDAtMSAuNDUtMSAxcy40NSAxIDEgMSAxLS40NSAxLTEtLjQ1LTEtMS0xeiIvPjwvc3ZnPg==" alt="Bot">
                </span>
            </div>
        </div>

        <div class="chatbot-window" id="chatbotWindow" style="display: none">
            <div class="chatbot-header">
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTktOCA4LTggOCAzLjU5IDggOC0zLjU5IDgtOCA4em0wLTE0Yy0zLjMxIDAtNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6bTAgMTBjMS42NiAwIDMtMS4zNCAzLTMtLjU1IDAtMSAuNDUtMSAxcy40NSAxIDEgMSAxLS40NSAxLTEtLjQ1LTEtMS0xeiIvPjwvc3ZnPg==" alt="Bot" class="chatbot-header-icon">
                <span class="chatbot-header-title">AbissBot</span>
                <button class="chatbot-close" id="chatbotClose" title="Sluiten">×</button>
            </div>
            <div class="chatbot-messages" id="chatbotMessages">
                <!-- Messages will be added here -->
            </div>
            <div class="chatbot-disclaimer" id="chatbotDisclaimer">
                Your prompts are not stored; they are not saved on our servers.
                <button class="chatbot-disclaimer-close" id="disclaimerClose" title="Close">×</button>
            </div>
            <form class="chatbot-input-area" id="chatbotForm" autocomplete="off">
                <input class="chatbot-input" id="chatbotInput" type="text" placeholder="Schrijf een bericht" required>
                <button class="chatbot-send" type="submit" title="Versturen">
                    <svg viewBox="0 0 24 24">
                        <path d="M3 20L21 12L3 4V10L17 12L3 14V20Z" />
                    </svg>
                </button>
            </form>
        </div>
    `;

    document.body.appendChild(container);
}

// Add the CSS
function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Base styles */
        :root {
            --abiss-color: #E85811;
            --ffd-color: #DB6245;
            --artisan-color: #3F3F3F;
            --chat-width: 350px;
            --chat-height: 600px;
            --title-font: 'Ropa Sans', sans-serif;
            --text-font: 'Open Sans', sans-serif;
        }

        /* Theme colors based on data-website attribute */
        .chatbot-container[data-website="abiss"] .chatbot-header,
        .chatbot-container[data-website="abiss"] .chatbot-launcher { 
            background-color: var(--abiss-color); 
        }

        .chatbot-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            font-family: var(--text-font);
        }

        /* Launcher styles */
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

        /* Chat window styles */
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
            min-width: 300px;
            min-height: 400px;
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
            fill: var(--abiss-color);
        }

        .chatbot-send:hover svg {
            fill: #c14d35;
        }

        /* Resize handle styles */
        .resize-handle {
            position: absolute;
            background: transparent;
            z-index: 1000;
        }

        .resize-handle.left {
            left: 0;
            top: 0;
            width: 5px;
            height: 100%;
            cursor: ew-resize;
        }

        .resize-handle.top {
            top: 0;
            left: 0;
            width: 100%;
            height: 5px;
            cursor: ns-resize;
        }

        .resize-handle.top-left {
            top: 0;
            left: 0;
            width: 10px;
            height: 10px;
            cursor: nwse-resize;
        }

        .chatbot-disclaimer {
            padding: 0.5em 2em 0.5em 0.5em;
            font-size: 0.8em;
            color: #666;
            position: relative;
            background: #f8f8f8;
            border-top: 1px solid #eee;
        }

        .chatbot-disclaimer-close {
            position: absolute;
            top: 50%;
            right: 8px;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #666;
            font-size: 16px;
            cursor: pointer;
            padding: 2px 6px;
            line-height: 1;
            border-radius: 50%;
        }

        .chatbot-disclaimer-close:hover {
            background: #eee;
            color: #333;
        }

        .chatbot-disclaimer.hidden {
            display: none;
        }
    `;
    document.head.appendChild(style);
}

// Initialize the chatbot
document.addEventListener('DOMContentLoaded', () => {
    // Inject styles and create structure
    injectStyles();
    createChatbotStructure();

    // Get DOM elements
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

    // Website specific configurations
    const websiteConfig = {
        abiss: {
            botName: 'AbissBot',
            welcomeMessage: 'Hoi! Ik ben je beursassistent voor Abiss. Ik kan je helpen met informatie over de beurs en de exposanten. Waar ben je naar op zoek?',
        }
    };

    // API endpoint configuration
    const API_URL = 'http://localhost:5000';

    // Initialize website configuration
    function initializeWebsite() {
        const config = websiteConfig.abiss;
        if (config) {
            // Update bot name in header
            headerTitle.textContent = config.botName;

            // Update welcome message
            const now = new Date();
            const timeString = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

            messages.innerHTML = `
                <div class="bot-message-container">
                    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTktOCA4LTggOCAzLjU5IDggOC0zLjU5IDgtOCA4em0wLTE0Yy0zLjMxIDAtNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6bTAgMTBjMS42NiAwIDMtMS4zNCAzLTMtLjU1IDAtMSAuNDUtMSAxcy40NSAxIDEgMSAxLS40NSAxLTEtLjQ1LTEtMS0xeiIvPjwvc3ZnPg==" alt="Bot">
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

    // Simple markdown parser
    function parseMarkdown(text) {
        // Convert **text** to <strong>text</strong>
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert [text](url) to <a href="url">text</a>
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
            img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTktOCA4LTggOCAzLjU5IDggOC0zLjU5IDgtOCA4em0wLTE0Yy0zLjMxIDAtNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6bTAgMTBjMS42NiAwIDMtMS4zNCAzLTMtLjU1IDAtMSAuNDUtMSAxcy40NSAxIDEgMSAxLS40NSAxLTEtLjQ1LTEtMS0xeiIvPjwvc3ZnPg==';
            img.alt = 'Bot';

            const messageWrapper = document.createElement('div');
            messageWrapper.className = 'message-wrapper';

            const botName = document.createElement('div');
            botName.className = 'bot-name';
            botName.textContent = websiteConfig.abiss.botName;

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

        try {
            // Send message to backend
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: text,
                    website: 'abiss',
                }),
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

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
            addMessage('Sorry, er ging iets mis. Probeer het later opnieuw.');
        }

        input.disabled = false;
        input.focus();
    };

    // Initialize the website configuration
    initializeWebsite();

    // Handle disclaimer close button
    disclaimerClose.onclick = () => {
        disclaimer.classList.add('hidden');
    };

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
}); 