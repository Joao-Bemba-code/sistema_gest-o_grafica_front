const axios = require('axios');

async function test() {
  // Login
  const login = await axios.post('https://sistema-gest-o-grafica-back-m6px.onrender.com/api/auth/login', {
    email: 'admin@cenffor.co.ao',
    senha: 'admin123'
  });
  const token = login.data.token;
  console.log('Token OK');

  // Check current cloud state for id=4
  const curr = await axios.get('https://sistema-gest-o-grafica-back-m6px.onrender.com/api/sinc/tabela', {
    params: { tabela: 'cliente', since: '2020-01-01T00:00:00.000Z' },
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Cloud cliente id=4:', JSON.stringify(curr.data.registos.find(r => r.id === 4)));

  // Try push deleted=1 for id=4
  console.log('\nAttempting push with deleted=1 for id=4...');
  try {
    const resp = await axios.post('https://sistema-gest-o-grafica-back-m6px.onrender.com/api/sinc/tabela', {
      tabela: 'cliente',
      registos: [{
        id: 4,
        nome: 'www',
        deleted: 1,
        deletedAt: '2026-08-20T11:55:52.281Z',
        updatedAt: '2026-08-20T11:55:52.281Z',
        createdAt: '2026-08-20T00:00:00.000Z'
      }]
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Push response:', JSON.stringify(resp.data));
  } catch (e) {
    console.log('Push error:', e.response ? e.response.status + ' ' + JSON.stringify(e.response.data) : e.message);
  }

  // Verify
  const after = await axios.get('https://sistema-gest-o-grafica-back-m6px.onrender.com/api/sinc/tabela', {
    params: { tabela: 'cliente', since: '2020-01-01T00:00:00.000Z' },
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('\nAfter push cloud cliente id=4:', JSON.stringify(after.data.registos.find(r => r.id === 4)));
}
test().catch(e => console.error(e));
