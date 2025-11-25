const userId = process.argv[2] || 'binx_qpvvpzb7pevq';

async function main() {
  const response = await fetch('https://api.binx.cc/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId })
  });
  console.log('status', response.status);
  const text = await response.text();
  console.log(text);
}

main().catch((error) => {
  console.error('login failed:', error);
});
