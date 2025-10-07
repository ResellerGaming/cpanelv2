const fs = require('fs');
const path = require('path');
const { githubToken, repo, branch } = require('../settings');
const axios = require('axios');

module.exports = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const filePath = path.join(process.cwd(), 'user.json');
  const users = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (users.find(u => u.username === username)) {
    return res.status(409).json({ message: 'Username already exists' });
  }

  users.push({ username, password, createdAt: new Date() });
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

  // Push to GitHub
  try {
    const url = `https://api.github.com/repos/${repo}/contents/user.json`;
    const { data } = await axios.get(`${url}?ref=${branch}`, {
      headers: { Authorization: `token ${githubToken}` }
    });

    const content = fs.readFileSync(filePath, 'utf8');
    const encoded = Buffer.from(content).toString('base64');

    await axios.put(url, {
      message: `Add user ${username}`,
      content: encoded,
      sha: data.sha,
      branch
    }, {
      headers: { Authorization: `token ${githubToken}` }
    });

    res.json({ message: 'Account created & pushed to GitHub!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'GitHub push failed' });
  }
};