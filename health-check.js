#!/usr/bin/env node

/**
 * System Mapper Health Check Script
 * Validates that all services are running correctly
 */

const http = require('http');
const redis = require('redis');

// Configuration
const config = {
    app: {
        host: process.env.APP_HOST || 'localhost',
        port: process.env.PORT || 3000
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    }
};

// Color functions
const colors = {
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`
};

console.log('🏥 System Mapper Health Check\n');

async function checkApplication() {
    return new Promise((resolve) => {
        const options = {
            hostname: config.app.host,
            port: config.app.port,
            path: '/api/maps',
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            const isHealthy = res.statusCode === 200;
            console.log(`  🌐 Application: ${isHealthy ? colors.green('✅ Healthy') : colors.red('❌ Unhealthy')}`);
            console.log(`     URL: http://${config.app.host}:${config.app.port}`);
            console.log(`     Status: ${res.statusCode}`);
            resolve(isHealthy);
        });

        req.on('error', (error) => {
            console.log(`  🌐 Application: ${colors.red('❌ Unreachable')}`);
            console.log(`     Error: ${error.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`  🌐 Application: ${colors.red('❌ Timeout')}`);
            resolve(false);
        });

        req.end();
    });
}

async function checkRedis() {
    try {
        const client = redis.createClient({
            socket: {
                host: config.redis.host,
                port: config.redis.port,
                connectTimeout: 5000
            }
        });

        await client.connect();
        
        // Test basic operations
        await client.ping();
        await client.set('health_check', 'ok');
        const result = await client.get('health_check');
        await client.del('health_check');
        
        await client.quit();
        
        const isHealthy = result === 'ok';
        console.log(`  🔴 Redis: ${isHealthy ? colors.green('✅ Healthy') : colors.red('❌ Unhealthy')}`);
        console.log(`     Host: ${config.redis.host}:${config.redis.port}`);
        console.log(`     Operations: ${isHealthy ? 'Working' : 'Failed'}`);
        
        return isHealthy;
    } catch (error) {
        console.log(`  🔴 Redis: ${colors.red('❌ Unreachable')}`);
        console.log(`     Error: ${error.message}`);
        return false;
    }
}

async function checkSystemResources() {
    const used = process.memoryUsage();
    const totalMemMB = Math.round(used.rss / 1024 / 1024);
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    
    console.log(`  💾 Memory Usage:`);
    console.log(`     RSS: ${totalMemMB} MB`);
    console.log(`     Heap Used: ${heapUsedMB} MB`);
    console.log(`     Heap Total: ${heapTotalMB} MB`);
    
    const cpuUsage = process.cpuUsage();
    console.log(`  ⚡ CPU Usage:`);
    console.log(`     User: ${cpuUsage.user} microseconds`);
    console.log(`     System: ${cpuUsage.system} microseconds`);
    
    return true;
}

async function checkEnvironment() {
    const requiredEnvVars = ['NODE_ENV'];
    const optionalEnvVars = ['PORT', 'REDIS_HOST', 'REDIS_PORT'];
    
    console.log(`  🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  📝 Configuration:`);
    
    requiredEnvVars.forEach(envVar => {
        const value = process.env[envVar];
        const status = value ? colors.green('✅') : colors.red('❌');
        console.log(`     ${envVar}: ${status} ${value || 'Not set'}`);
    });
    
    optionalEnvVars.forEach(envVar => {
        const value = process.env[envVar];
        const status = value ? colors.green('✅') : colors.yellow('⚠️');
        console.log(`     ${envVar}: ${status} ${value || 'Using default'}`);
    });
    
    return true;
}

async function main() {
    console.log(colors.bold('🔍 Checking Services:\n'));
    
    const checks = await Promise.all([
        checkApplication(),
        checkRedis()
    ]);
    
    console.log();
    console.log(colors.bold('📊 System Information:\n'));
    
    await checkSystemResources();
    console.log();
    await checkEnvironment();
    
    console.log();
    
    const allHealthy = checks.every(check => check);
    
    if (allHealthy) {
        console.log(colors.green(colors.bold('🎉 All systems are healthy!')));
        console.log(`\n🌐 Access your System Mapper at: ${colors.blue(`http://${config.app.host}:${config.app.port}`)}`);
        process.exit(0);
    } else {
        console.log(colors.red(colors.bold('❌ Some systems are unhealthy!')));
        console.log('\n🔧 Troubleshooting:');
        console.log('  • Check if all services are running');
        console.log('  • Verify configuration in .env file');
        console.log('  • Check Docker containers: docker-compose ps');
        console.log('  • View logs: docker-compose logs');
        process.exit(1);
    }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
    console.error(colors.red('\n❌ Health check failed:'), error.message);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error(colors.red('\n❌ Health check failed:'), error.message);
    process.exit(1);
});

main().catch(console.error);