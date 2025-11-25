const USER_POOL = [
  'binx_qpvvpzb7pevq',
  'binx_ea7dbwbzp9jm'
];

async function login(userId) {
  const response = await fetch('https://api.binx.cc/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId })
  });
  if (!response.ok) {
    throw new Error(`login failed ${response.status}`);
  }
  return response.json();
}

async function sendChat(token) {
  const response = await fetch('https://api.binx.cc/api/ai-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'hi, what can you do?' }],
      max_tokens: 256,
      temperature: 0.7,
      stream: false
    })
  });
  console.log('chat status', response.status);
  const text = await response.text();
  console.log(text.slice(0, 400));
}

async function main() {
  for (const userId of USER_POOL) {
    try {
      const session = await login(userId);
      console.log('using token for', session.userId);
      await sendChat(session.token);
      return;
    } catch (error) {
      console.error('attempt failed for', userId, error.message);
    }
  }
  console.error('all logins failed');
}

main().catch((error) => {
  console.error(error);
});
