fetch('https://binx.cc/ai-chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'test message from script'
  })
})
  .then(async (res) => {
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Body:', text.slice(0, 300));
  })
  .catch((err) => {
    console.error('Error:', err);
  });
