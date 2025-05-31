#!/usr/bin/env node

/**
 * System Mapper Setup Script
 * Helps users configure and validate their installation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🗺️  System Mapper Setup\n');

// Color functions for better output
const colors = {
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`
};

function checkCommand(command, name) {
    try {
        execSync(`which ${command}`, { stdio: 'ignore' });
        console.log(`  ✅ ${colors.green(name)} is installed`);
        return true;
    } catch (error) {
        console.log(`  ❌ ${colors.red(name)} is not installed`);
        return false;
    }
}

function checkPort(port) {
    try {
        execSync(`lsof -i :${port}`, { stdio: 'ignore' });
        console.log(`  ⚠️  ${colors.yellow(`Port ${port} is in use`)}`);
        return false;
    } catch (error) {
        console.log(`  ✅ ${colors.green(`Port ${port} is available`)}`);
        return true;
    }
}

function createEnvFile() {
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    if (fs.existsSync(envPath)) {
        console.log(`  ℹ️  ${colors.blue('.env file already exists')}`);
        return;
    }
    
    if (fs.existsSync(envExamplePath)) {
        try {
            fs.copyFileSync(envExamplePath, envPath);
            console.log(`  ✅ ${colors.green('Created .env file from .env.example')}`);
        } catch (error) {
            console.log(`  ❌ ${colors.red('Failed to create .env file')}`);
        }
    } else {
        // Create Docker-optimized .env file
        const dockerEnv = `# System Mapper Configuration
# Generated automatically by setup script

# Server Configuration
PORT=3000
NODE_ENV=production

# Redis Configuration (for Docker setup)
REDIS_HOST=redis
REDIS_PORT=6379

# Application Settings
DEFAULT_MAP_NAME=My System Map
MAX_FILE_SIZE=10485760
ENABLE_LOGGING=true
LOG_LEVEL=info

# Security
CORS_ORIGINS=*
`;
        try {
            fs.writeFileSync(envPath, dockerEnv);
            console.log(`  ✅ ${colors.green('Created .env file with Docker defaults')}`);
        } catch (error) {
            console.log(`  ❌ ${colors.red('Failed to create .env file')}`);
        }
    }
}

function createDirectories() {
    const dirs = ['logs', 'docs'];
    
    dirs.forEach(dir => {
        const dirPath = path.join(process.cwd(), dir);
        if (!fs.existsSync(dirPath)) {
            try {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`  ✅ ${colors.green(`Created ${dir}/ directory`)}`);
            } catch (error) {
                console.log(`  ❌ ${colors.red(`Failed to create ${dir}/ directory`)}`);
            }
        } else {
            console.log(`  ℹ️  ${colors.blue(`${dir}/ directory already exists`)}`);
        }
    });
}

async function main() {
    console.log(colors.bold('🔍 Checking Prerequisites:\n'));
    
    // Check required tools
    const nodeInstalled = checkCommand('node', 'Node.js');
    const npmInstalled = checkCommand('npm', 'npm');
    const dockerInstalled = checkCommand('docker', 'Docker');
    const dockerComposeInstalled = checkCommand('docker-compose', 'Docker Compose');
    
    console.log();
    
    // Check ports
    console.log(colors.bold('🔌 Checking Ports:\n'));
    const port3000Available = checkPort(3000);
    const port6379Available = checkPort(6379);
    
    console.log();
    
    // Setup files and directories
    console.log(colors.bold('📁 Setting up files:\n'));
    createEnvFile();
    createDirectories();
    
    console.log();
    
    // Installation recommendations
    console.log(colors.bold('🚀 Next Steps:\n'));
    
    if (!nodeInstalled || !npmInstalled) {
        console.log(`  📦 Install Node.js: ${colors.blue('https://nodejs.org/')}`);
    }
    
    if (!dockerInstalled) {
        console.log(`  🐳 Install Docker: ${colors.blue('https://docs.docker.com/get-docker/')}`);
    }
    
    if (!dockerComposeInstalled) {
        console.log(`  🐙 Install Docker Compose: ${colors.blue('https://docs.docker.com/compose/install/')}`);
    }
    
    if (!port3000Available) {
        console.log(`  🔄 Free port 3000 or change PORT in .env file`);
    }
    
    if (!port6379Available) {
        console.log(`  🔄 Free port 6379 or use Docker Redis`);
    }
    
    console.log();
    console.log(colors.bold('🎯 Choose your setup method:\n'));
    
    if (dockerInstalled && dockerComposeInstalled) {
        console.log(`  ${colors.green('🐳 Docker (Recommended):')} docker-compose up -d`);
        console.log(`  ${colors.green('🔧 Development:')} npm run compose:dev`);
    }
    
    if (nodeInstalled && npmInstalled) {
        console.log(`  ${colors.yellow('💻 Local Development:')} npm install && npm start`);
        console.log(`  ${colors.yellow('⚠️  Note:')} Requires Redis server running locally`);
    }
    
    console.log();
    console.log(colors.bold('📚 Documentation:\n'));
    console.log(`  📖 README: ${colors.blue('./README.md')}`);
    console.log(`  🌐 Open: ${colors.blue('http://localhost:3000')}`);
    console.log(`  🔧 Config: ${colors.blue('./.env')}`);
    
    console.log();
    console.log(colors.green('✨ Setup complete! Happy mapping! 🗺️'));
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
    console.error(colors.red('\n❌ Setup failed:'), error.message);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error(colors.red('\n❌ Setup failed:'), error.message);
    process.exit(1);
});

main().catch(console.error);