const sampleMessages = [{ role: 'user', content: 'Hello? Are you working?' }];

const payload = {
  messages: sampleMessages,
  max_tokens: 1024,
  temperature: 0.7,
  stream: false
};

async function run() {
  const response = await fetch('https://api.binx.cc/api/ai-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  console.log('status', response.status);
  const text = await response.text();
  console.log(text.slice(0, 400));
}

run().catch((error) => {
  console.error(error);
});
