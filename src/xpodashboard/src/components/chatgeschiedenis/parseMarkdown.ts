// Simple markdown parser for bot messages (ported from chatbot.js)
export function parseMarkdown(text: string): string {
  // Convert **text** to <strong>text</strong>
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Convert [text](url) to <a href="$2" target="_blank" class="bot-message-link">$1</a>
  text = text.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" class="bot-message-link">$1</a>'
  );
  // Convert \n to <br>
  text = text.replace(/\n/g, '<br>');
  return text;
} 