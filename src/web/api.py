import sys
import os

# Add the parent directory to Python path so we can import the chatbot module
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'python', 'chatbot'))

from flask import Flask, request, jsonify
from flask_cors import CORS
from chatbot import EventChatbot

app = Flask(__name__)
CORS(app)

# Initialize chatbot
chatbot = EventChatbot(api_url="http://localhost:5000", container="ffd")

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400

        message = data['message']
        website = data.get('website', 'ffd')  # Default to ffd if not specified
        
        # Get client IP for rate limiting
        ip_address = request.remote_addr
        
        # Update chatbot container based on website
        chatbot.container = website
        
        # Get response from chatbot
        response = chatbot.chat(message, ip_address)
        
        return jsonify({'response': response})
        
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(port=5001)
