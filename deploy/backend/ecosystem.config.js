module.exports = {
  apps: [{
    name: "backend",
    script: "index.js",
    env: {
      NODE_ENV: "production",
      PORT: 5000
    }
  }]
}
