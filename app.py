"""
Flask backend for Omer Bin Asif Portfolio
Serves static pages + API for Artemis (social), Cipher (encryption), and Hydra (AI chat)
"""
import os, json, math, random, re, time
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='.')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ──────────────────────────────────────────────
# Serve static files (all existing HTML/CSS/JS/images)
# ──────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    filepath = os.path.join(BASE_DIR, path)
    if os.path.isfile(filepath):
        return send_from_directory(BASE_DIR, path)
    return send_from_directory(BASE_DIR, 'index.html')

# ──────────────────────────────────────────────
# ARTEMIS — Social Media App API
# ──────────────────────────────────────────────

# In-memory data store (resets on server restart)
artemis_state = {
    'posts': [
        {'id': 1, 'user': 'Alex Chen', 'text': 'Just finished building a new feature! The team crushed it this sprint 🚀', 'likes': 24, 'comments': [], 'time': '2h ago', 'avatar': 'A', 'color': '#3b82f6'},
        {'id': 2, 'user': 'Sarah Kim', 'text': 'New design system is coming together beautifully. Check out these color palettes!', 'likes': 18, 'comments': [], 'time': '4h ago', 'avatar': 'S', 'color': '#ec4899'},
        {'id': 3, 'user': 'Mike Rivera', 'text': 'Anyone else obsessed with the new album? Been on repeat all week 🎵', 'likes': 31, 'comments': [], 'time': '6h ago', 'avatar': 'M', 'color': '#22c55e'},
        {'id': 4, 'user': 'Lisa Wang', 'text': 'The sunset from the office tonight was incredible 🌅', 'likes': 42, 'comments': [], 'time': '8h ago', 'avatar': 'L', 'color': '#f59e0b'},
    ],
    'profile': {'name': 'Omer Bin Asif', 'bio': 'Building cool stuff', 'avatar': 'O'},
    'chat_messages': [],
    'next_chat_id': 1
}

@app.route('/api/artemis/posts', methods=['GET'])
def get_posts():
    return jsonify(artemis_state['posts'])

@app.route('/api/artemis/like', methods=['POST'])
def toggle_like():
    data = request.json
    post_id = data.get('postId')
    liked = data.get('liked', True)
    for post in artemis_state['posts']:
        if post['id'] == post_id:
            post['likes'] += 1 if liked else -1
            return jsonify(post)
    return jsonify({'error': 'Post not found'}), 404

@app.route('/api/artemis/comment', methods=['POST'])
def add_comment():
    data = request.json
    post_id = data.get('postId')
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'Comment text required'}), 400
    for post in artemis_state['posts']:
        if post['id'] == post_id:
            comment = {
                'id': len(post['comments']) + 1,
                'user': 'You',
                'text': text,
                'time': 'Just now',
                'avatar': 'Y',
                'color': '#f59e0b'
            }
            post['comments'].append(comment)
            return jsonify(comment)
    return jsonify({'error': 'Post not found'}), 404

@app.route('/api/artemis/profile', methods=['GET', 'POST'])
def handle_profile():
    if request.method == 'GET':
        return jsonify(artemis_state['profile'])
    data = request.json
    if 'name' in data:
        artemis_state['profile']['name'] = data['name']
    if 'bio' in data:
        artemis_state['profile']['bio'] = data['bio']
    return jsonify(artemis_state['profile'])

@app.route('/api/artemis/chat', methods=['GET', 'POST'])
def handle_chat():
    if request.method == 'GET':
        return jsonify(artemis_state['chat_messages'])
    data = request.json
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'Message text required'}), 400
    
    user_msg = {
        'id': artemis_state['next_chat_id'],
        'sender': 'user',
        'text': text,
        'time': time.strftime('%I:%M %p')
    }
    artemis_state['next_chat_id'] += 1
    artemis_state['chat_messages'].append(user_msg)
    
    # Auto-reply
    replies = [
        'Got it! 👍', 'Sounds good!', 'Let me check on that.',
        'Thanks for letting me know!', 'On it! 🚀', 'Awesome!',
        "I'll get back to you on this.", 'Perfect, thanks!'
    ]
    ai_msg = {
        'id': artemis_state['next_chat_id'],
        'sender': 'ai',
        'text': random.choice(replies),
        'time': time.strftime('%I:%M %p')
    }
    artemis_state['next_chat_id'] += 1
    artemis_state['chat_messages'].append(ai_msg)
    
    return jsonify({'user': user_msg, 'ai': ai_msg})

# ──────────────────────────────────────────────
# CIPHER — Encryption API
# ──────────────────────────────────────────────

def caesar_encrypt(text, shift):
    result = []
    for c in text:
        if 'a' <= c <= 'z':
            result.append(chr((ord(c) - 97 + shift) % 26 + 97))
        elif 'A' <= c <= 'Z':
            result.append(chr((ord(c) - 65 + shift) % 26 + 65))
        else:
            result.append(c)
    return ''.join(result)

def caesar_decrypt(text, shift):
    return caesar_encrypt(text, 26 - shift)

def vigenere_encrypt(text, key):
    result = []
    ki = 0
    key = key.upper()
    for c in text:
        if 'a' <= c <= 'z':
            shift = ord(key[ki % len(key)]) - 65
            result.append(chr((ord(c) - 97 + shift) % 26 + 97))
            ki += 1
        elif 'A' <= c <= 'Z':
            shift = ord(key[ki % len(key)]) - 65
            result.append(chr((ord(c) - 65 + shift) % 26 + 65))
            ki += 1
        else:
            result.append(c)
    return ''.join(result)

def vigenere_decrypt(text, key):
    result = []
    ki = 0
    key = key.upper()
    for c in text:
        if 'a' <= c <= 'z':
            shift = ord(key[ki % len(key)]) - 65
            result.append(chr((ord(c) - 97 - shift + 26) % 26 + 97))
            ki += 1
        elif 'A' <= c <= 'Z':
            shift = ord(key[ki % len(key)]) - 65
            result.append(chr((ord(c) - 65 - shift + 26) % 26 + 65))
            ki += 1
        else:
            result.append(c)
    return ''.join(result)

def xor_encrypt_decrypt(text, key, mode='encrypt'):
    """XOR encrypt or decrypt. In XOR, encrypt and decrypt are the same."""
    result = []
    for i, c in enumerate(text):
        result.append(chr(ord(c) ^ ord(key[i % len(key)])))
    return ''.join(result) if mode == 'decrypt' else ''.join(
        format(ord(c) ^ ord(key[i % len(key)]), '02X')
        for i, c in enumerate(text)
    )

def xor_decrypt(hex_str, key):
    result = []
    for i in range(0, len(hex_str), 2):
        c = int(hex_str[i:i+2], 16)
        k = ord(key[(i // 2) % len(key)])
        result.append(chr(c ^ k))
    return ''.join(result)

# Simplified AES-like substitution-permutation
S_BOX = [
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
    0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
    0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
    0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
    0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
    0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
    0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
    0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
    0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
    0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
    0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
    0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
    0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
]

def aes_like_encrypt(text, key='0123456789abcdef'):
    result = []
    for i, c in enumerate(text):
        k = ord(key[i % len(key)])
        mixed = (ord(c) + k) % 256
        sub = S_BOX[mixed]
        perm = ((sub << 3) | (sub >> 5)) & 0xFF
        result.append(format(perm, '02X'))
    return ''.join(result)

def aes_like_decrypt(hex_str, key='0123456789abcdef'):
    result = []
    for i in range(0, len(hex_str), 2):
        c = int(hex_str[i:i+2], 16)
        perm = ((c >> 3) | (c << 5)) & 0xFF
        k = ord(key[(i // 2) % len(key)])
        # Reverse substitution (find in S_BOX)
        found = False
        for j, val in enumerate(S_BOX):
            if val == perm:
                orig = (j - k + 256) % 256
                result.append(chr(orig))
                found = True
                break
        if not found:
            result.append(chr(perm))
    return ''.join(result)

def calculate_entropy(text):
    if not text:
        return 0.0
    freq = {}
    for c in text:
        freq[c] = freq.get(c, 0) + 1
    entropy = 0.0
    for f in freq.values():
        p = f / len(text)
        entropy -= p * math.log2(p)
    return entropy

CIPHER_LEVELS = [
    {'name': 'Caesar Cipher', 'type': 'Substitution', 'keySpace': '25 keys', 'security': 'Low'},
    {'name': 'Vigenère Cipher', 'type': 'Polyalphabetic', 'keySpace': '26^n keys', 'security': 'Medium'},
    {'name': 'XOR Cipher', 'type': 'Symmetric Bitwise', 'keySpace': '2^n keys', 'security': 'Medium'},
    {'name': 'AES-like Cipher', 'type': 'Block Cipher', 'keySpace': '2^128 keys', 'security': 'High'},
]

@app.route('/api/cipher/levels')
def cipher_levels():
    return jsonify(CIPHER_LEVELS)

@app.route('/api/cipher/encrypt', methods=['POST'])
def cipher_encrypt():
    data = request.json
    text = data.get('text', '')
    level = data.get('level', 0)
    key = data.get('key', '')
    
    start = time.time()
    try:
        if level == 0:
            shift = int(key) if key else 3
            output = caesar_encrypt(text, shift)
        elif level == 1:
            output = vigenere_encrypt(text, key.upper() if key else 'SECRET')
        elif level == 2:
            output = xor_encrypt_decrypt(text, key if key else 'KEY', 'encrypt')
        elif level == 3:
            output = aes_like_encrypt(text, key if key else '0123456789abcdef')
        else:
            return jsonify({'error': 'Invalid level'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    elapsed = round((time.time() - start) * 1000, 2)
    entropy = calculate_entropy(output)
    
    strength_map = [
        ['Weak', 'Moderate'],
        ['Moderate', 'Strong'],
        ['Strong', 'Very Strong'],
        ['Very Strong', 'Military Grade']
    ]
    strength = strength_map[level][1] if entropy > 3.5 else strength_map[level][0]
    
    return jsonify({
        'output': output,
        'chars': len(output),
        'time': elapsed,
        'entropy': round(entropy, 1),
        'strength': strength
    })

@app.route('/api/cipher/decrypt', methods=['POST'])
def cipher_decrypt():
    data = request.json
    text = data.get('text', '')
    level = data.get('level', 0)
    key = data.get('key', '')
    
    start = time.time()
    try:
        if level == 0:
            shift = int(key) if key else 3
            output = caesar_decrypt(text, shift)
        elif level == 1:
            output = vigenere_decrypt(text, key.upper() if key else 'SECRET')
        elif level == 2:
            output = xor_decrypt(text.replace(' ', ''), key if key else 'KEY')
        elif level == 3:
            output = aes_like_decrypt(text.replace(' ', ''), key if key else '0123456789abcdef')
        else:
            return jsonify({'error': 'Invalid level'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    elapsed = round((time.time() - start) * 1000, 2)
    entropy = calculate_entropy(output)
    
    return jsonify({
        'output': output,
        'chars': len(output),
        'time': elapsed,
        'entropy': round(entropy, 1),
        'strength': '-'
    })

# ──────────────────────────────────────────────
# HYDRA — AI Chat API
# ──────────────────────────────────────────────

hydra_stats = {'total_messages': 1, 'total_words': 0, 'total_response_time': 0}

HYDRA_RESPONSES = {
    'greeting': [
        "Hey there! How can I help you today? 😊",
        "Hello! What's on your mind?",
        "Hi! Ready to chat about anything?",
        "Welcome! Ask me anything!",
        "Hey! Great to see you! What can I do for you?",
    ],
    'joke': [
        "Why don't scientists trust atoms? Because they make up everything! 😄",
        "I told my wife she was drawing her eyebrows too high. She looked surprised!",
        "What do you call a fake noodle? An impasta! 🍝",
        "Why did the scarecrow win an award? He was outstanding in his field! 🌾",
        "I'm reading a book about anti-gravity. It's impossible to put down!",
        "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
        "What's a computer's favorite snack? Microchips! 🍪",
        "Why was the computer cold? It left its Windows open! 🪟",
    ],
    'help': [
        "I can help with:\n• Jokes & fun 😄\n• Coding tutorials (Python, JS, C++, C#)\n• Tech concepts (AI, ML, blockchain)\n• Knowledge (space, math, history)\n• Productivity tips\n\nJust type a topic or /help for commands!"
    ],
    'default': [
        "That's an interesting question! Let me think about it... 🤔",
        "I'd love to help with that! Tell me more. 💡",
        "Great question! Here's what I think... 💭",
        "Let me break that down for you! 🎯",
        "Interesting! Here's my take on it... ✨",
    ],
    'python': [
        "**Python Basics** 🐍\n\n```python\nname = \"Hydra\"\nage = 25\n\n# Lists\nfruits = [\"apple\", \"banana\", \"cherry\"]\n\n# Function\ndef greet(name):\n    return f\"Hello, {name}!\"\n```\nPython is perfect for beginners! What would you like to learn?"
    ],
    'javascript': [
        "**JavaScript Basics** 🌐\n\n```javascript\nlet name = \"Hydra\";\nconst age = 25;\n\nconst greet = (name) => {\n    return `Hello, ${name}!`\n};\n\nconst doubled = [1,2,3].map(n => n * 2);\n```\nJavaScript runs everywhere! Want to dive deeper?"
    ],
    'cpp': [
        "**C++ Basics** ⚡\n\n```cpp\n#include <iostream>\nusing namespace std;\n\nint main() {\n    string name = \"Hydra\";\n    cout << \"Hello, \" << name << endl;\n    return 0;\n}\n```\nC++ is powerful but complex! Ready for more?"
    ],
}

def get_hydra_response(text):
    lower = text.lower().strip()
    
    # Slash commands
    if lower.startswith('/'):
        cmd = lower[1:]
        cmd_map = {
            'joke': 'joke', 'knockknock': 'joke', 'riddle': 'joke',
            'help': 'help', 'python': 'python', 'js': 'javascript',
            'javascript': 'javascript', 'cpp': 'cpp', 'c++': 'cpp',
        }
        key = cmd_map.get(cmd)
        if key:
            return random.choice(HYDRA_RESPONSES[key])
        return f"Unknown command: /{cmd}\n\nType /help to see all commands!"
    
    # Keyword matching
    if re.search(r'\b(hi|hello|hey|greetings|howdy)\b', lower):
        return random.choice(HYDRA_RESPONSES['greeting'])
    if re.search(r'\b(joke|funny|laugh|hilarious)\b', lower):
        return random.choice(HYDRA_RESPONSES['joke'])
    if re.search(r'\b(help|commands|what can you do)\b', lower):
        return random.choice(HYDRA_RESPONSES['help'])
    if re.search(r'\b(python|tutorial|learn python)\b', lower):
        return HYDRA_RESPONSES['python'][0]
    if re.search(r'\b(javascript|js|es6|dom)\b', lower):
        return HYDRA_RESPONSES['javascript'][0]
    if re.search(r'\b(c\+\+|cpp|learn c[+])\b', lower):
        return HYDRA_RESPONSES['cpp'][0]
    
    return random.choice(HYDRA_RESPONSES['default'])

@app.route('/api/hydra/chat', methods=['POST'])
def hydra_chat():
    data = request.json
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'Message required'}), 400
    
    response = get_hydra_response(text)
    response_time = random.uniform(0.8, 2.3)
    
    hydra_stats['total_messages'] += 2
    hydra_stats['total_words'] += len(text.split()) + len(response.split())
    hydra_stats['total_response_time'] += response_time
    
    avg_response = hydra_stats['total_response_time'] / ((hydra_stats['total_messages'] - 1) / 2) if hydra_stats['total_messages'] > 1 else 0.8
    
    return jsonify({
        'response': response,
        'stats': {
            'totalMessages': hydra_stats['total_messages'],
            'totalWords': hydra_stats['total_words'],
            'avgResponse': f"{avg_response:.1f}s"
        }
    })

@app.route('/api/hydra/stats')
def hydra_get_stats():
    avg_response = hydra_stats['total_response_time'] / ((hydra_stats['total_messages'] - 1) / 2) if hydra_stats['total_messages'] > 1 else 0.8
    return jsonify({
        'totalMessages': hydra_stats['total_messages'],
        'totalWords': hydra_stats['total_words'],
        'avgResponse': f"{avg_response:.1f}s"
    })

# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
if __name__ == '__main__':
    print("* Portfolio Flask backend running on http://localhost:5000")
    print("   API endpoints:")
    print("   GET  /api/artemis/posts")
    print("   POST /api/artemis/like")
    print("   POST /api/artemis/comment")
    print("   GET  /api/artemis/profile")
    print("   POST /api/artemis/profile")
    print("   GET  /api/artemis/chat")
    print("   POST /api/artemis/chat")
    print("   GET  /api/cipher/levels")
    print("   POST /api/cipher/encrypt")
    print("   POST /api/cipher/decrypt")
    print("   POST /api/hydra/chat")
    print("   GET  /api/hydra/stats")
    app.run(debug=True, port=5000)
