# <img src="public/assets/system_mapper_logo_main.svg" alt="LabGraph Logo" width="32" height="32" /> LabGraph

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-%E2%9C%93-blue)](https://www.docker.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**LabGraph** is a powerful, interactive web application for visualizing and managing complex system architectures. Built with D3.js and featuring a sleek dark UI, it provides an intuitive interface to create, modify, and share visual system diagrams with real-time collaboration features.

> 🚀 **One-command deployment**: `docker-compose up -d` and you're running!

---

## ✨ Why LabGraph?

- **🎯 Zero Configuration**: Works out of the box with sensible defaults
- **🎨 Beautiful Interface**: Modern dark theme with smooth animations
- **⚡ Lightning Fast**: Built with performance in mind
- **🐳 Docker Ready**: Complete containerization for any environment
- **🔒 Production Ready**: Security-hardened with health monitoring
- **📤 Share Anywhere**: Export, embed, or share with URLs

---

## 🖼️ See It In Action

![LabGraph Interface](docs/Example%20map.png)
*Interactive system architecture visualization*
![LabGraph Interface](docs/Example%20detail.png)
*Add custom attributes for quick reference*

---

## 🚀 Quick Start

### Option 1: Instant Setup (Recommended)

```bash
git clone https://github.com/michael-william/system-mapper.git
cd system-mapper
docker-compose up -d
open http://localhost:3000
```

**That's it!** 🎉 Your LabGraph is running.

### Option 2: Development Setup

```bash
git clone https://github.com/michael-william/system-mapper.git
cd system-mapper

# Create configuration
npm run setup

# Start with development features
npm run compose:dev

open http://localhost:3000
```

### Option 3: Local Development

```bash
# Prerequisites: Node.js 22+, Redis server
git clone https://github.com/michael-william/system-mapper.git
cd system-mapper
npm install
npm start
```

---

## ✨ Key Features

### 🎨 **Interactive Visualization**
- **Dynamic D3.js rendering** with smooth animations and physics-based layouts
- **Zoom and pan** controls for exploring large system maps
- **Drag-and-drop** node positioning with intelligent collision detection
- **Real-time updates** with live connection management

### 🔧 **Advanced Node Management**
- **Rich node types** (API, Database, Hardware, Services, Security, etc.)
- **Custom attributes** with multi-line text support for documentation
- **Parent-child relationships** with visual connection mapping
- **Bulk operations** for efficient map building

### 💾 **Data & Sharing**
- **Redis backend** for reliable data persistence
- **Multiple map management** with easy switching between projects
- **JSON export/import** for backup and migration
- **Shareable URLs** for team collaboration
- **Embeddable visualizations** for documentation

### 🎯 **Modern Experience**
- **Dark theme** with glassmorphism effects
- **Responsive design** that works on all screen sizes
- **Keyboard shortcuts** for power users
- **Context-sensitive tooltips** and detailed node modals
- **Health monitoring** and graceful error handling

---

## 📁 Project Structure

```
system-mapper/
├── 🐳 docker-compose.yml     # One-command deployment
├── 📄 Dockerfile            # Secure container setup
├── ⚙️  server.js             # Express.js API server
├── 📁 public/               # Frontend application
│   ├── 🎨 custom.css        # Modern dark theme
│   └── 📁 js/               # Interactive features
├── 📁 scripts/              # Setup & health utilities
├── 🔧 .env.example          # Configuration template
└── 📚 docs/                 # Screenshots & guides
```

---

## 🎛️ Usage Examples

### Creating Your First Map

1. **🎯 Add Nodes**: Click "Add Node" → Define your system components
2. **🔗 Connect**: Set parent relationships to create connections  
3. **📝 Document**: Add custom attributes for detailed documentation
4. **👀 Visualize**: Watch your architecture come to life

### Advanced Workflows

**📊 Architecture Documentation**
```bash
# Create comprehensive system maps
# Add detailed attributes and relationships
# Export as JSON for version control
```

**🔄 Team Collaboration**
```bash
# Share maps with direct URLs
# Embed in documentation or wikis
# Import/export for team synchronization
```

**🚀 Deployment Planning**
```bash
# Model infrastructure components
# Visualize dependencies and data flow
# Plan scaling and redundancy
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file or use the provided defaults:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Redis Configuration  
REDIS_HOST=redis          # Use 'localhost' for local Redis
REDIS_PORT=6379

# Application Settings
DEFAULT_MAP_NAME=My System Map
MAX_FILE_SIZE=10485760    # 10MB file upload limit
CORS_ORIGINS=*            # Allowed origins (use specific domains in production)

# Logging & Monitoring
ENABLE_LOGGING=true
LOG_LEVEL=info
```

### Docker Configuration

The included `docker-compose.yml` provides:
- ✅ **Application server** with health checks
- ✅ **Redis database** with persistence
- ✅ **Automatic restart** policies
- ✅ **Volume persistence** for data safety
- ✅ **Network isolation** for security

---

## 🚀 Deployment Options

### Production Docker Deployment

```bash
# Clone and deploy
git clone https://github.com/michael-william/system-mapper.git
cd system-mapper

# Production deployment
NODE_ENV=production docker-compose up -d

# Monitor health
docker-compose logs -f
curl http://localhost:3000/health
```

### Cloud Platform Deployment

<details>
<summary>🌩️ Heroku Deployment</summary>

```bash
# Install Heroku CLI and login
heroku create your-system-mapper
heroku addons:create heroku-redis:mini
git push heroku main
```
</details>

<details>
<summary>🚀 Railway Deployment</summary>

1. Connect your GitHub repository to Railway
2. Add Redis plugin
3. Deploy automatically
</details>

<details>
<summary>☁️ DigitalOcean App Platform</summary>

1. Fork this repository
2. Connect to DigitalOcean App Platform  
3. Add managed Redis database
4. Deploy with one click
</details>

---

## 🛠️ Development

### Local Development Setup

```bash
# Clone repository
git clone https://github.com/michael-william/system-mapper.git
cd system-mapper

# Install dependencies
npm install

# Run setup wizard
npm run setup

# Start development server with hot reload
npm run compose:dev

# Health check
npm run health
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm run setup` | Interactive setup wizard |
| `npm run health` | System health check |
| `npm run compose:up` | Start Docker services |
| `npm run compose:dev` | Start development environment |
| `npm run compose:logs` | View container logs |

### API Endpoints

<details>
<summary>📚 REST API Documentation</summary>

#### Maps
- `GET /api/maps` - List all maps
- `POST /api/maps` - Create new map
- `GET /api/maps/:id` - Get specific map
- `PUT /api/maps/:id` - Update map metadata
- `DELETE /api/maps/:id` - Delete map

#### Nodes  
- `POST /api/maps/:id/nodes` - Add node to map
- `PUT /api/maps/:id/nodes/:nodeId` - Update node
- `DELETE /api/maps/:id/nodes/:nodeId` - Delete node
- `GET /api/maps/:id/nodes/:nodeId/connections` - Get node connections

#### Health & Monitoring
- `GET /health` - Application health status
- `GET /embed?map=:id` - Embeddable visualization
</details>

---

## 🤝 Contributing

We welcome contributions! Whether it's:

- 🐛 **Bug reports** and fixes
- ✨ **Feature requests** and implementations  
- 📖 **Documentation** improvements
- 🎨 **UI/UX** enhancements
- 🧪 **Tests** and quality improvements

### Getting Started

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 🔍 Troubleshooting

### Common Issues

<details>
<summary>🐳 Docker Issues</summary>

**Port already in use**
```bash
# Check what's using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 docker-compose up -d
```

**Redis connection failed**
```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# Restart Redis
docker-compose restart redis
```
</details>

<details>
<summary>🔧 Local Development Issues</summary>

**Node modules issues**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Permission errors**
```bash
sudo chown -R $(whoami) ~/.npm
npm install
```
</details>

### Performance Tips

- **Large maps** (100+ nodes): Increase Node.js memory with `--max-old-space-size=4096`
- **High traffic**: Enable Redis persistence and configure clustering
- **Network issues**: Check firewall settings for ports 3000 and 6379

---

## 📋 Roadmap

### 🚧 Next Release (v1.1)
- [ ] **Real-time collaboration** with WebSocket support
- [ ] **Undo/Redo** functionality
- [ ] **Node templates** for common patterns
- [ ] **Advanced export** formats (PNG, SVG, PDF)

### 🔮 Future Enhancements
- [ ] **Mobile app** for iOS/Android
- [ ] **AI-powered** architecture suggestions
- [ ] **Cloud integrations** (AWS, Azure, GCP discovery)
- [ ] **Version control** for map changes
- [ ] **Advanced analytics** and insights

---

## 🏆 Built With

- **[Node.js](https://nodejs.org/)** - Runtime environment
- **[Express.js](https://expressjs.com/)** - Web application framework
- **[Redis](https://redis.io/)** - In-memory data structure store
- **[D3.js](https://d3js.org/)** - Data visualization library
- **[Docker](https://www.docker.com/)** - Containerization platform

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙌 Acknowledgments

- **D3.js community** for the incredible visualization library
- **Redis team** for the robust data persistence
- **Docker** for making deployment effortless
- **Open source contributors** for inspiration and best practices

---

## 📞 Support & Community

- 🐛 **Issues**: [GitHub Issues](https://github.com/michael-william/system-mapper/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/michael-william/system-mapper/discussions)
- ⭐ **Star this repo** if you find it useful!
- 🐦 **Follow**: [@michael_william](https://twitter.com/michael_william) for updates

---

<div align="center">

**Made with ❤️ by [Michael William](https://github.com/michael-william)**

[⭐ Star this repository](https://github.com/michael-william/system-mapper) • [🍴 Fork it](https://github.com/michael-william/system-mapper/fork) • [📝 Contribute](CONTRIBUTING.md)

*Transform your system architecture visualization today!* 🗺️✨

</div>
