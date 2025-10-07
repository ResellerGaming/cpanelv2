const axios = require('axios');
const { githubToken, repo, branch } = require('../settings');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib' });
  }

  try {
    // 1. Ambil file user.json dari GitHub
    const url = `https://api.github.com/repos/${repo}/contents/user.json?ref=${branch}`;
    const headers = { Authorization: `token ${githubToken}` };

    const { data: file } = await axios.get(url, { headers });

    // 2. Decode isi file
    const content = JSON.parse(Buffer.from(file.content, 'base64').toString('utf-8'));

    // 3. Cek duplikat
    if (content.some(u => u.username === username)) {
      return res.status(409).json({ message: 'Username sudah ada' });
    }

    // 4. Tambah user baru
    content.push({ username, password, createdAt: new Date() });

    // 5. Encode kembali
    const newContent = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');

    // 6. Push ke GitHub
    await axios.put(url, {
      message: `Add user ${username}`,
      content: newContent,
      sha: file.sha,
      branch
    }, { headers });

    res.json({ message: 'Akun berhasil dibuat & tersimpan di GitHub!' });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'Gagal simpan ke GitHub' });
  }
};
