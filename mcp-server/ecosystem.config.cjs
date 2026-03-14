module.exports = {
  apps: [
    {
      name: 'blog-mcp-server',
      script: 'dist/index.js',
      instances: 1,
      env: {
        TRANSPORT: 'http',
        PORT: 4000,
        BLOG_API_URL: 'http://localhost:3000', // 内网直连，不走 nginx
        MCP_API_KEY: 'your_secret_key_here',   // 替换为强随机字符串，如: openssl rand -hex 32
      },
    },
  ],
}
