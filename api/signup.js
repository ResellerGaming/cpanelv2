// api/signup.js
const { githubToken, githubRepo, githubPath } = require('../settings');

export default async function handler(req, res) {
  // Cuma terima POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Hanya menerima POST' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  try {
    // 1. Siapkan URL GitHub
    const url = `https://api.github.com/repos/${githubRepo}/contents/${encodeURIComponent(githubPath)}`;
    const headers = {
      Authorization: `token ${githubToken}`,
      'User-Agent': 'fik-vercel-signup'
    };

    // 2. Ambil file users.json dari GitHub
    const getRes = await fetch(url, { headers });
    let users = [];
    let sha = null;

    if (getRes.status === 200) {
      const file = await getRes.json();
      sha = file.sha;
      users = JSON.parse(Buffer.from(file.content, 'base64').toString('utf-8'));
    }

    // 3. Cek duplikat username
    if (users.some(u => u.username === username)) {
      return res.status(409).json({ error: 'Username sudah terdaftar' });
    }

    // 4. Tambah user baru (password plain dulu, biar gampang tes)
    users.push({
      username,
      password,
      created_at: new Date().toISOString()
    });

    // 5. Encode ke base64
    const newContent = Buffer.from(JSON.stringify(users, null, 2)).toString('base64');

    // 6. Push ke GitHub
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Tambah user ${username}`,
        content: newContent,
        sha
      })
    });

    if (!putRes.ok) {
      const txt = await putRes.text();
      throw new Error(txt);
    }

    // 7. Sukses
    return res.status(200).json({ message: 'Akun berhasil dibuat & tersimpan di GitHub!' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
                                     }
