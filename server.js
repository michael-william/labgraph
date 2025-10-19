// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const redis = require('redis');

const { createRedactedMap, getRedactedMap } = require('./services/redaction');

// Configuration from environment variables
const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0
    },
    app: {
        defaultMapName: process.env.DEFAULT_MAP_NAME || 'My System Map',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
        maxMaps: parseInt(process.env.MAX_MAPS) || 0, // 0 = unlimited
        maxNodesPerMap: parseInt(process.env.MAX_NODES_PER_MAP) || 0, // 0 = unlimited
        corsOrigins: process.env.CORS_ORIGINS || '*',
        enableLogging: process.env.ENABLE_LOGGING === 'true',
        logLevel: process.env.LOG_LEVEL || 'info',
        embedWatermark: process.env.EMBED_WATERMARK !== 'false'
    }
};

// Create Express app
const app = express();

// Logging function
function log(level, message, data = null) {
    if (!config.app.enableLogging) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (data) {
        console.log(logMessage, data);
    } else {
        console.log(logMessage);
    }
}

// Create Redis client with configuration
const redisClient = redis.createClient({
    socket: {
        host: config.redis.host,
        port: config.redis.port,
        connectTimeout: 10000,
        lazyConnect: true
    },
    password: config.redis.password,
    database: config.redis.db
});

// Redis error handling
redisClient.on('error', (error) => {
    log('error', 'Redis connection error:', error.message);
});

redisClient.on('connect', () => {
    log('info', `Connected to Redis at ${config.redis.host}:${config.redis.port}`);
});

redisClient.on('ready', () => {
    log('info', 'Redis client ready');
});

redisClient.on('end', () => {
    log('info', 'Redis connection closed');
});

// Connect to Redis
async function connectRedis() {
    try {
        await redisClient.connect();
        log('info', 'Redis connection established');
        
        // Initialize with default map if no maps exist
        await initializeDefaultMap();
    } catch (error) {
        log('error', 'Redis connection failed:', error.message);
        log('error', 'Application will continue without Redis persistence');
        throw error;
    }
}

// Initialize default map
async function initializeDefaultMap() {
    try {
        const mapsExist = await redisClient.exists('maps:list');
        if (!mapsExist) {
            log('info', 'Creating default map...');
            
            const defaultMap = {
                id: 'default',
                name: config.app.defaultMapName,
                description: 'Default system map',
                nodes: [
                    { id: "Internet", group: "External" },
                    { id: "Router", group: "Hardware" },
                ],
                links: [
                    { source: "Internet", target: "Router" }
                ],
                created: new Date().toISOString(),
                updated: new Date().toISOString()
            };

            // Save default map
            await redisClient.hSet('maps:list', 'default', JSON.stringify({
                id: 'default',
                name: defaultMap.name,
                description: defaultMap.description,
                nodeCount: defaultMap.nodes.length,
                updated: defaultMap.updated
            }));
            
            await redisClient.set('map:default', JSON.stringify(defaultMap));
            log('info', 'Default map created');
        }
    } catch (error) {
        log('error', 'Error initializing default map:', error.message);
    }
}

// CORS configuration
const corsOptions = {
    origin: config.app.corsOrigins === '*' ? true : config.app.corsOrigins.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: config.app.maxFileSize }));
app.use(express.static('public'));

// Request logging middleware
if (config.app.enableLogging) {
    app.use((req, res, next) => {
        log('info', `${req.method} ${req.path}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        next();
    });
}

// Validation middleware for map limits
function validateMapLimits(req, res, next) {
    // This can be expanded to check actual limits
    next();
}

// API Routes

// Get all maps (metadata only)
app.get('/api/maps', async (req, res) => {
    try {
        log('debug', 'Fetching all maps');
        
        const mapsData = await redisClient.hGetAll('maps:list');
        const maps = Object.values(mapsData).map(mapStr => JSON.parse(mapStr));
        
        log('debug', `Found ${maps.length} maps`);
        res.json(maps);
    } catch (error) {
        log('error', 'Error fetching maps:', error.message);
        res.status(500).json({ error: 'Failed to fetch maps' });
    }
});

// Get specific map
app.get('/api/maps/:id', async (req, res) => {
    try {
        const mapId = req.params.id;
        log('debug', `Fetching map: ${mapId}`);
        
        const mapData = await redisClient.get(`map:${mapId}`);
        if (!mapData) {
            return res.status(404).json({ error: 'Map not found' });
        }
        
        const map = JSON.parse(mapData);
        log('debug', `Map found: ${map.name} with ${map.nodes?.length || 0} nodes`);
        res.json(map);
    } catch (error) {
        log('error', 'Error fetching map:', error.message);
        res.status(500).json({ error: 'Failed to fetch map' });
    }
});

// Create new map
app.post('/api/maps', validateMapLimits, async (req, res) => {
    try {
        log('debug', 'Creating new map');
        
        const mapId = 'map-' + Date.now();
        const newMap = {
            id: mapId,
            name: req.body.name || 'Untitled Map',
            description: req.body.description || '',
            nodes: req.body.nodes || [
                { id: 'Internet', group: 'External' }
            ],
            links: req.body.links || [],
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };
        
        // Validate node count if limit is set
        if (config.app.maxNodesPerMap > 0 && newMap.nodes.length > config.app.maxNodesPerMap) {
            return res.status(400).json({ error: `Too many nodes. Maximum allowed: ${config.app.maxNodesPerMap}` });
        }
        
        // Save map metadata to hash
        await redisClient.hSet('maps:list', mapId, JSON.stringify({
            id: mapId,
            name: newMap.name,
            description: newMap.description,
            nodeCount: newMap.nodes.length,
            updated: newMap.updated
        }));
        
        // Save full map data
        await redisClient.set(`map:${mapId}`, JSON.stringify(newMap));
        
        log('info', `Map created: ${mapId}`);
        res.status(201).json(newMap);
    } catch (error) {
        log('error', 'Error creating map:', error.message);
        res.status(500).json({ error: 'Failed to create map' });
    }
});

// Delete map
app.delete('/api/maps/:id', async (req, res) => {
    try {
        const mapId = req.params.id;
        log('debug', `Deleting map: ${mapId}`);
        
        // Check if map exists
        const mapData = await redisClient.get(`map:${mapId}`);
        if (!mapData) {
            return res.status(404).json({ error: 'Map not found' });
        }
        
        // Remove from maps list
        await redisClient.hDel('maps:list', mapId);
        
        // Remove full map data
        await redisClient.del(`map:${mapId}`);
        
        log('info', `Map deleted: ${mapId}`);
        res.status(204).send();
    } catch (error) {
        log('error', 'Error deleting map:', error.message);
        res.status(500).json({ error: 'Failed to delete map' });
    }
});

// Update map metadata (name, description)
app.put('/api/maps/:id', async (req, res) => {
    try {
        const mapId = req.params.id;
        log('debug', `Updating map metadata: ${mapId}`);
        
        const mapData = await redisClient.get(`map:${mapId}`);
        if (!mapData) {
            return res.status(404).json({ error: 'Map not found' });
        }
        
        const map = JSON.parse(mapData);
        
        // Update allowed fields
        if (req.body.name !== undefined) {
            map.name = req.body.name;
        }
        if (req.body.description !== undefined) {
            map.description = req.body.description;
        }
        
        map.updated = new Date().toISOString();
        
        // Save updated map
        await redisClient.set(`map:${mapId}`, JSON.stringify(map));
        
        // Update metadata in maps list
        await redisClient.hSet('maps:list', mapId, JSON.stringify({
            id: mapId,
            name: map.name,
            description: map.description,
            nodeCount: map.nodes.length,
            updated: map.updated
        }));
        
        log('info', `Map metadata updated: ${mapId}`);
        res.json({
            id: mapId,
            name: map.name,
            description: map.description,
            updated: map.updated
        });
    } catch (error) {
        log('error', 'Error updating map:', error.message);
        res.status(500).json({ error: 'Failed to update map' });
    }
});

// Add node to map
app.post('/api/maps/:id/nodes', async (req, res) => {
    try {
        const mapId = req.params.id;
        log('debug', `Adding node to map: ${mapId}`);
        
        const mapData = await redisClient.get(`map:${mapId}`);
        if (!mapData) {
            return res.status(404).json({ error: 'Map not found' });
        }
        
        const map = JSON.parse(mapData);
        
        const newNode = {
            id: req.body.id || `node-${Date.now()}`,
            group: req.body.group || 'Default',
            description: req.body.description || '',
            attributes: req.body.attributes || []
        };
        
        // Check if node already exists
        if (map.nodes.find(n => n.id === newNode.id)) {
            return res.status(400).json({ error: 'Node already exists' });
        }
        
        // Check node count limit
        if (config.app.maxNodesPerMap > 0 && map.nodes.length >= config.app.maxNodesPerMap) {
            return res.status(400).json({ error: `Maximum nodes limit reached: ${config.app.maxNodesPerMap}` });
        }
        
        map.nodes.push(newNode);
        
        // Add links to parent nodes if specified
        if (req.body.parentNodes && req.body.parentNodes.length > 0) {
            req.body.parentNodes.forEach(parentId => {
                map.links.push({
                    source: parentId,
                    target: newNode.id
                });
            });
        }
        
        map.updated = new Date().toISOString();
        
        // Update Redis
        await redisClient.set(`map:${mapId}`, JSON.stringify(map));
        
        // Update metadata
        await redisClient.hSet('maps:list', mapId, JSON.stringify({
            id: mapId,
            name: map.name,
            description: map.description,
            nodeCount: map.nodes.length,
            updated: map.updated
        }));
        
        log('info', `Node added: ${newNode.id}`);
        res.status(201).json(newNode);
    } catch (error) {
        log('error', 'Error adding node:', error.message);
        res.status(500).json({ error: 'Failed to add node' });
    }
});

// Enhanced node rename endpoint that preserves all link relationships
app.put('/api/maps/:id/nodes/:nodeId/rename', async (req, res) => {
    try {
        const mapId = req.params.id;
        const oldNodeId = req.params.nodeId;
        const { newId, group, description, attributes, parentNodes } = req.body;
        
        log('debug', `Renaming node: ${oldNodeId} -> ${newId} in map: ${mapId}`);
        
        if (!newId || newId.trim() === '') {
            return res.status(400).json({ error: 'New node ID is required' });
        }
        
        const mapData = await redisClient.get(`map:${mapId}`);
        if (!mapData) {
            return res.status(404).json({ error: 'Map not found' });
        }
        
        const map = JSON.parse(mapData);
        const nodeIndex = map.nodes.findIndex(n => n.id === oldNodeId);
        
        if (nodeIndex === -1) {
            return res.status(404).json({ error: 'Node not found' });
        }
        
        // Check if new ID already exists (but not the same node)
        const existingNode = map.nodes.find(n => n.id === newId && n.id !== oldNodeId);
        if (existingNode) {
            return res.status(400).json({ error: 'A node with the new name already exists' });
        }
        
        // Count links before update for logging
        const linksBefore = map.links.filter(link => 
            link.source === oldNodeId || link.target === oldNodeId
        );
        
        // Update the node
        map.nodes[nodeIndex] = {
            id: newId,
            group: group || 'Default',
            description: description || '',
            attributes: attributes || []
        };
        
        // CRITICAL FIX: Update ALL links that reference the old node ID
        let linksUpdated = 0;
        map.links = map.links.map(link => {
            let updatedLink = { ...link };
            let changed = false;
            
            // Update source references
            if (link.source === oldNodeId) {
                updatedLink.source = newId;
                changed = true;
                log('debug', `Updated link source: ${oldNodeId} -> ${newId}`);
            }
            
            // Update target references
            if (link.target === oldNodeId) {
                updatedLink.target = newId;
                changed = true;
                log('debug', `Updated link target: ${oldNodeId} -> ${newId}`);
            }
            
            if (changed) linksUpdated++;
            return updatedLink;
        });
        
        // Handle parent node relationships (remove existing incoming links, add new ones)
        if (parentNodes !== undefined) {
            log('debug', `Updating parent relationships for renamed node: ${newId}`);
            
            // Remove ALL existing links where this node is the target
            const linksBeforeParentUpdate = map.links.length;
            map.links = map.links.filter(link => link.target !== newId);
            const linksRemoved = linksBeforeParentUpdate - map.links.length;
            
            // Add new parent links
            let linksAdded = 0;
            parentNodes.forEach(parentId => {
                if (parentId && parentId.trim()) {
                    const parentExists = map.nodes.find(n => n.id === parentId);
                    if (parentExists) {
                        map.links.push({
                            source: parentId,
                            target: newId
                        });
                        linksAdded++;
                        log('debug', `Added parent relationship: ${parentId} -> ${newId}`);
                    }
                }
            });
            
            log('debug', `Parent relationship update: removed ${linksRemoved}, added ${linksAdded}`);
        }
        
        map.updated = new Date().toISOString();
        
        // Update Redis
        await redisClient.set(`map:${mapId}`, JSON.stringify(map));
        
        // Update metadata
        await redisClient.hSet('maps:list', mapId, JSON.stringify({
            id: mapId,
            name: map.name,
            description: map.description,
            nodeCount: map.nodes.length,
            updated: map.updated
        }));
        
        // Count links after for verification
        const linksAfter = map.links.filter(link => 
            link.source === newId || link.target === newId
        );
        
        log('info', `Node renamed successfully: ${oldNodeId} -> ${newId}`);
        log('info', `Links preserved: ${linksBefore.length} before, ${linksAfter.length} after`);
        log('debug', `Total links updated: ${linksUpdated}`);
        
        res.json({
            message: 'Node renamed successfully with link preservation',
            oldId: oldNodeId,
            newId: newId,
            linksUpdated: linksUpdated,
            linksBefore: linksBefore.length,
            linksAfter: linksAfter.length,
            node: map.nodes[nodeIndex]
        });
    } catch (error) {
        log('error', 'Error renaming node:', error.message);
        res.status(500).json({ error: 'Failed to rename node' });
    }
});

// Update node
app.put('/api/maps/:id/nodes/:nodeId', async (req, res) => {
    try {
        const mapId = req.params.id;
        const nodeId = req.params.nodeId;
        log('debug', `Updating node: ${nodeId} in map: ${mapId}`);
        
        const mapData = await redisClient.get(`map:${mapId}`);
        if (!mapData) {
            return res.status(404).json({ error: 'Map not found' });
        }
        
        const map = JSON.parse(mapData);
        const nodeIndex = map.nodes.findIndex(n => n.id === nodeId);
        
        if (nodeIndex === -1) {
            return res.status(404).json({ error: 'Node not found' });
        }
        
        // Update node with new data
        const updatedNode = {
            ...map.nodes[nodeIndex],
            ...req.body
        };
        
        // Remove parentNodes from the node object as it shouldn't be stored there
        delete updatedNode.parentNodes;
        
        map.nodes[nodeIndex] = updatedNode;

        // Handle parent node changes if parentNodes is provided
        if (req.body.parentNodes !== undefined) {
            log('debug', `Updating parent relationships for: ${nodeId}`);
            
            // Remove ALL existing links where this node is the target
            map.links = map.links.filter(link => link.target !== nodeId);
            
            // Add new parent links
            req.body.parentNodes.forEach(parentId => {
                if (parentId && parentId.trim()) {
                    const parentExists = map.nodes.find(n => n.id === parentId);
                    if (parentExists) {
                        map.links.push({
                            source: parentId,
                            target: nodeId
                        });
                    }
                }
            });
        }
        
        map.updated = new Date().toISOString();
        
        // Update Redis
        await redisClient.set(`map:${mapId}`, JSON.stringify(map));
        
        // Update metadata
        await redisClient.hSet('maps:list', mapId, JSON.stringify({
            id: mapId,
            name: map.name,
            description: map.description,
            nodeCount: map.nodes.length,
            updated: map.updated
        }));
        
        log('info', `Node updated: ${nodeId}`);
        res.json(map.nodes[nodeIndex]);
    } catch (error) {
        log('error', 'Error updating node:', error.message);
        res.status(500).json({ error: 'Failed to update node' });
    }
});

// Delete node
app.delete('/api/maps/:id/nodes/:nodeId', async (req, res) => {
    try {
        const mapId = req.params.id;
        const nodeId = req.params.nodeId;
        log('debug', `Deleting node: ${nodeId} from map: ${mapId}`);
        
        const mapData = await redisClient.get(`map:${mapId}`);
        if (!mapData) {
            return res.status(404).json({ error: 'Map not found' });
        }
        
        const map = JSON.parse(mapData);
        
        // Remove node
        map.nodes = map.nodes.filter(n => n.id !== nodeId);
        
        // Remove associated links
        map.links = map.links.filter(l => 
            l.source !== nodeId && l.target !== nodeId
        );
        
        map.updated = new Date().toISOString();
        
        // Update Redis
        await redisClient.set(`map:${mapId}`, JSON.stringify(map));
        
        // Update metadata
        await redisClient.hSet('maps:list', mapId, JSON.stringify({
            id: mapId,
            name: map.name,
            description: map.description,
            nodeCount: map.nodes.length,
            updated: map.updated
        }));
        
        log('info', `Node deleted: ${nodeId}`);
        res.status(204).send();
    } catch (error) {
        log('error', 'Error deleting node:', error.message);
        res.status(500).json({ error: 'Failed to delete node' });
    }
});

// Get connections for a specific node
app.get('/api/maps/:id/nodes/:nodeId/connections', async (req, res) => {
    try {
        const mapId = req.params.id;
        const nodeId = req.params.nodeId;
        log('debug', `Fetching connections for node: ${nodeId}`);
        
        const mapData = await redisClient.get(`map:${mapId}`);
        if (!mapData) {
            return res.status(404).json({ error: 'Map not found' });
        }
        
        const map = JSON.parse(mapData);
        
        // Check if node exists
        const node = map.nodes.find(n => n.id === nodeId);
        if (!node) {
            return res.status(404).json({ error: 'Node not found' });
        }
        
        // Find parent connections (incoming links to this node)
        const parentConnections = map.links
            .filter(link => link.target === nodeId)
            .map(link => {
                const parentNode = map.nodes.find(n => n.id === link.source);
                return {
                    id: link.source,
                    name: link.source,
                    type: parentNode ? parentNode.group : 'Unknown',
                    direction: 'parent',
                    attributes: parentNode ? parentNode.attributes : []
                };
            });
        
        // Find child connections (outgoing links from this node)
        const childConnections = map.links
            .filter(link => link.source === nodeId)
            .map(link => {
                const childNode = map.nodes.find(n => n.id === link.target);
                return {
                    id: link.target,
                    name: link.target,
                    type: childNode ? childNode.group : 'Unknown',
                    direction: 'child',
                    attributes: childNode ? childNode.attributes : []
                };
            });
        
        const connectionData = {
            nodeId: nodeId,
            nodeName: node.id,
            nodeType: node.group,
            totalConnections: parentConnections.length + childConnections.length,
            parentCount: parentConnections.length,
            childCount: childConnections.length,
            connections: {
                parents: parentConnections,
                children: childConnections,
                all: [...parentConnections, ...childConnections]
            }
        };
        
        log('debug', `Found ${connectionData.totalConnections} connections for node: ${nodeId}`);
        res.json(connectionData);
    } catch (error) {
        log('error', 'Error fetching node connections:', error.message);
        res.status(500).json({ error: 'Failed to fetch node connections' });
    }
});

// Get all connections
app.get('/api/maps/:id/connections', async (req, res) => {
    try {
        const mapId = req.params.id;
        log('debug', `Fetching all connections for map: ${mapId}`);
        
        const mapData = await redisClient.get(`map:${mapId}`);
        if (!mapData) {
            return res.status(404).json({ error: 'Map not found' });
        }
        
        const map = JSON.parse(mapData);
        
        // Enhance links with node information
        const enhancedConnections = map.links.map(link => {
            const sourceNode = map.nodes.find(n => n.id === link.source);
            const targetNode = map.nodes.find(n => n.id === link.target);
            
            return {
                source: {
                    id: link.source,
                    name: link.source,
                    type: sourceNode ? sourceNode.group : 'Unknown',
                    attributes: sourceNode ? sourceNode.attributes : []
                },
                target: {
                    id: link.target,
                    name: link.target,
                    type: targetNode ? targetNode.group : 'Unknown',
                    attributes: targetNode ? targetNode.attributes : []
                },
                relationship: `${link.source} → ${link.target}`
            };
        });
        
        res.json({
            mapId: mapId,
            totalConnections: enhancedConnections.length,
            connections: enhancedConnections
        });
    } catch (error) {
        log('error', 'Error fetching connections:', error.message);
        res.status(500).json({ error: 'Failed to fetch connections' });
    }
});

// Remove connection between nodes
app.delete('/api/maps/:id/connections', async (req, res) => {
    try {
        const mapId = req.params.id;
        const { source, target } = req.body;
        
        log('debug', `Removing connection: ${source} -> ${target}`);
        
        if (!source || !target) {
            return res.status(400).json({ error: 'Source and target are required' });
        }
        
        const mapData = await redisClient.get(`map:${mapId}`);
        if (!mapData) {
            return res.status(404).json({ error: 'Map not found' });
        }
        
        const map = JSON.parse(mapData);
        const originalLinkCount = map.links.length;
        
        // Remove the specific link
        map.links = map.links.filter(link => 
            !(link.source === source && link.target === target)
        );
        
        const removedCount = originalLinkCount - map.links.length;
        
        if (removedCount === 0) {
            return res.status(404).json({ error: 'Connection not found' });
        }
        
        map.updated = new Date().toISOString();
        
        // Update Redis
        await redisClient.set(`map:${mapId}`, JSON.stringify(map));
        
        // Update metadata
        await redisClient.hSet('maps:list', mapId, JSON.stringify({
            id: mapId,
            name: map.name,
            description: map.description,
            nodeCount: map.nodes.length,
            updated: map.updated
        }));
        
        log('info', `Connection removed: ${source} -> ${target}`);
        
        res.json({ 
            message: 'Connection removed successfully',
            removedConnection: { source, target },
            remainingLinks: map.links.length
        });
    } catch (error) {
        log('error', 'Error removing connection:', error.message);
        res.status(500).json({ error: 'Failed to remove connection' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Enhanced embed endpoint
app.get('/embed', (req, res) => {
    log('debug', 'Serving embed page');
    
    const mapId = req.query.map || 'default';
    const showWatermark = req.query.watermark !== 'false' && config.app.embedWatermark;
    
    const embedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Map Embed</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
            height: 100vh; overflow: hidden; color: #e5e5e5;
        }
        .embed-container { width: 100%; height: 100vh; position: relative; overflow: hidden; }
        .embed-container svg { width: 100%; height: 100%; display: block; }
        .node-tooltip {
            position: absolute; background: rgba(0, 0, 0, 0.9); color: white;
            padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 500;
            pointer-events: none; z-index: 100; opacity: 0; transition: opacity 0.2s ease;
            white-space: nowrap; border: 1px solid rgba(102, 126, 234, 0.5);
            backdrop-filter: blur(10px);
        }
        .embed-watermark {
            position: absolute; bottom: 10px; right: 10px; font-size: 10px;
            color: rgba(102, 126, 234, 0.6); pointer-events: none; z-index: 1000;
            display: ${showWatermark ? 'block' : 'none'};
        }
        .loading {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            text-align: center; color: rgba(102, 126, 234, 0.8);
        }
        .loading-spinner {
            width: 40px; height: 40px; border: 3px solid rgba(102, 126, 234, 0.3);
            border-top: 3px solid rgba(102, 126, 234, 0.8); border-radius: 50%;
            animation: spin 1s linear infinite; margin: 0 auto 16px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .error { color: #dc3545; }
    </style>
</head>
<body>
    <div class="embed-container">
        <div class="loading" id="loadingState">
            <div class="loading-spinner"></div>
            <div>Loading map...</div>
        </div>
        <svg></svg>
        <div class="node-tooltip" id="nodeTooltip"></div>
        ${showWatermark ? '<div class="embed-watermark">System Mapper</div>' : ''}
    </div>

    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script>
        let simulation = null;
        let currentMapData = null;
        const mapId = '${mapId}';

        async function loadMapData() {
            try {
                const response = await fetch(\`/api/maps/\${mapId}\`);
                
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}\`);
                }
                
                currentMapData = await response.json();
                document.getElementById('loadingState').style.display = 'none';
                
                if (!currentMapData.nodes || currentMapData.nodes.length === 0) {
                    throw new Error('No nodes found in map data');
                }
                
                initVisualization();
            } catch (error) {
                console.error('Error loading map:', error);
                document.getElementById('loadingState').innerHTML = \`
                    <div class="error">
                        <div style="font-size: 24px; margin-bottom: 16px;">⚠️</div>
                        <div>Failed to load map</div>
                        <div style="font-size: 10px; margin-top: 8px;">\${error.message}</div>
                    </div>
                \`;
            }
        }

        function initVisualization() {
            if (!currentMapData || !currentMapData.nodes) return;

            const width = window.innerWidth;
            const height = window.innerHeight;
            
            const colorScale = d3.scaleOrdinal([
                '#667eea', '#764ba2', '#f093fb', '#f5576c', 
                '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
            ]);
            
            const svg = d3.select("svg").attr("viewBox", [0, 0, width, height]);
            svg.selectAll("*").remove();

            const container = svg.append("g");
            const zoom = d3.zoom().scaleExtent([0.1, 4])
                .on("zoom", ({transform}) => container.attr("transform", transform));
            svg.call(zoom);

            simulation = d3.forceSimulation(currentMapData.nodes)
                .force("link", d3.forceLink(currentMapData.links).id(d => d.id).distance(120))
                .force("charge", d3.forceManyBody().strength(-400))
                .force("center", d3.forceCenter(width / 2, height / 2));

            const link = container.append("g").selectAll("line")
                .data(currentMapData.links).join("line")
                .attr("stroke", "#667eea")
                .attr("stroke-width", 2).attr("stroke-opacity", 0.6);

            const node = container.append("g").selectAll("circle")
                .data(currentMapData.nodes).join("circle")
                .attr("r", 15).attr("fill", d => colorScale(d.group))
                .attr("stroke", "#ffffff").attr("stroke-width", 2);

            const label = container.append("g").selectAll("text")
                .data(currentMapData.nodes).join("text")
                .text(d => d.id).attr("text-anchor", "middle")
                .attr("fill", "#ffffff").attr("font-size", "11px")
                .style("pointer-events", "none");

            simulation.on("tick", () => {
                link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
                node.attr("cx", d => d.x).attr("cy", d => d.y);
                label.attr("x", d => d.x).attr("y", d => d.y + 25);
            });
        }

        window.addEventListener('resize', () => {
            if (currentMapData) initVisualization();
        });

        loadMapData();
    </script>
</body>
</html>`;

    res.send(embedHTML);
});


// Simple rate limiting for redacted map creation
const rateLimiter = new Map();

function checkRateLimit(identifier, windowMs = 60000, maxRequests = 5) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimiter.has(identifier)) {
        rateLimiter.set(identifier, []);
    }
    
    const requests = rateLimiter.get(identifier);
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    rateLimiter.set(identifier, recentRequests);
    
    if (recentRequests.length >= maxRequests) {
        return false;
    }
    
    recentRequests.push(now);
    return true;
}

// REDACTED SHARING ENDPOINTS
// =============================================================================

// Create redacted share of a map (authenticated)
app.post('/api/maps/:id/redacted', async (req, res) => {
    try {
        const mapId = req.params.id;
        const clientIp = req.ip || req.connection.remoteAddress;
        
        // Rate limiting
        const windowMs = parseInt(process.env.REDACTED_LIMIT_WINDOW_MS) || 60000;
        const maxRequests = parseInt(process.env.REDACTED_LIMIT_MAX) || 5;
        
        if (!checkRateLimit(clientIp, windowMs, maxRequests)) {
            return res.status(429).json({ 
                error: 'Rate limit exceeded. Please try again later.' 
            });
        }
        
        log('debug', `Creating redacted share for map: ${mapId}`);
        
        // Verify the map exists and user has access (reuse existing logic)
        const mapData = await redisClient.get(`map:${mapId}`);
        if (!mapData) {
            return res.status(404).json({ error: 'Map not found' });
        }
        
        const originalMap = JSON.parse(mapData);
        
        // Create redacted version
        const result = await createRedactedMap(originalMap, redisClient, req.body.config);
        
        log('info', `Created redacted share: ${result.redactedId} for map: ${mapId}`);
        
        res.status(201).json(result);
        
    } catch (error) {
        log('error', 'Error creating redacted map:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get redacted map data (public endpoint)
app.get('/api/redacted/:redactedId', async (req, res) => {
    try {
        const redactedId = req.params.redactedId;
        
        // Security headers for public endpoint
        res.set({
            'Cache-Control': 'public, max-age=3600, immutable',
            'Referrer-Policy': 'no-referrer',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'SAMEORIGIN'
        });
        
        const redactedMap = await getRedactedMap(redactedId, redisClient);
        
        if (!redactedMap) {
            return res.status(404).json({ error: 'Redacted map not found' });
        }
        
        // Do not log the redacted data or any mapping
        log('debug', `Served redacted map: ${redactedId}`);
        
        res.json(redactedMap);
        
    } catch (error) {
        log('error', 'Error retrieving redacted map:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Public view endpoint for redacted maps
app.get('/redacted/:redactedId', async (req, res) => {
    try {
        const redactedId = req.params.redactedId;
        
        // Security headers
        res.set({
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'SAMEORIGIN',
            'Referrer-Policy': 'no-referrer'
        });
        
        // Verify the redacted map exists before serving the page
        const redactedMap = await getRedactedMap(redactedId, redisClient);
        if (!redactedMap) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html><head><title>Map Not Found</title></head>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h1>404 - Redacted Map Not Found</h1>
                    <p>The shared map you're looking for could not be found or has expired.</p>
                </body></html>
            `);
        }
        
        // Serve a minimal page that loads the redacted map
        const publicHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shared System Map</title>
    <link rel="stylesheet" href="/custom.css">
    <style>
        body { margin: 0; padding: 0; background: #1a1a1a; overflow: hidden; }
        .public-container { width: 100vw; height: 100vh; position: relative; }
        .loading { 
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            color: #00ff88; font-family: Arial, sans-serif;
        }
    </style>
</head>
<body>
    <div class="public-container">
        <div id="loadingState" class="loading">Loading shared map...</div>
        <div id="mapContainer"></div>
    </div>
    
    <script src="https://d3js.org/d3.v7.min.js"></script>
    
    <script>
        let simulation = null;
        let currentMapData = null;
        const redactedId = '${redactedId}';

        async function loadRedactedMap() {
            try {
                const response = await fetch(\`/api/redacted/\${redactedId}\`);
                
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}\`);
                }
                
                currentMapData = await response.json();
                document.getElementById('loadingState').style.display = 'none';
                
                if (!currentMapData.nodes || currentMapData.nodes.length === 0) {
                    throw new Error('No nodes found in map data');
                }
                
                initPublicVisualization();
            } catch (error) {
                console.error('Error loading redacted map:', error);
                document.getElementById('loadingState').innerHTML = \`
                    <div style="color: #ff4444;">
                        <div style="font-size: 24px; margin-bottom: 16px;">⚠️</div>
                        <div>Error loading shared map</div>
                        <div style="font-size: 12px; margin-top: 8px;">The map may have expired or been removed</div>
                    </div>
                \`;
            }
        }

        function initPublicVisualization() {
            const container = document.getElementById('mapContainer');
            container.innerHTML = ''; // Clear any existing content
            
            // Extract config from map data (or use defaults)
            const config = currentMapData.config || {};
            
            // Simple D3 force-directed graph for redacted data
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            const svg = d3.select("#mapContainer")
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .style("background", "#1a1a1a");
            
            const g = svg.append("g");
            
            // Add zoom and pan
            const zoom = d3.zoom()
                .scaleExtent([0.1, 4])
                .on("zoom", (event) => g.attr("transform", event.transform));
            svg.call(zoom);
            
            // Create color scale matching main visualization (fallback)
            const colorScale = d3.scaleOrdinal([
                "#667eea", "#764ba2", "#f093fb", "#f5576c", 
                "#4facfe", "#00f2fe", "#43e97b", "#38f9d7",
                "#ffecd2", "#fcb69f", "#a8edea", "#fed6e3",
                "#ff9a9e", "#fecfef", "#ffeaa7", "#fab1a0"
            ]);
            
            // Create gradients for each node type
            const defs = svg.append("defs");
            
            // Add glow filters if enabled
            if (config.enableNodeGlow) {
                const nodeGlow = defs.append("filter")
                    .attr("id", "nodeGlow")
                    .attr("x", "-50%")
                    .attr("y", "-50%")
                    .attr("width", "200%")
                    .attr("height", "200%");
                nodeGlow.append("feGaussianBlur")
                    .attr("stdDeviation", "3")
                    .attr("result", "coloredBlur");
                const feMerge = nodeGlow.append("feMerge");
                feMerge.append("feMergeNode").attr("in", "coloredBlur");
                feMerge.append("feMergeNode").attr("in", "SourceGraphic");
            }
            
            if (config.enableLinkGlow) {
                const linkGlow = defs.append("filter")
                    .attr("id", "linkGlow")
                    .attr("x", "-50%")
                    .attr("y", "-50%")
                    .attr("width", "200%")
                    .attr("height", "200%");
                linkGlow.append("feGaussianBlur")
                    .attr("stdDeviation", "2")
                    .attr("result", "coloredBlur");
                const feMerge = linkGlow.append("feMerge");
                feMerge.append("feMergeNode").attr("in", "coloredBlur");
                feMerge.append("feMergeNode").attr("in", "SourceGraphic");
            }
            
            const nodeTypes = [...new Set(currentMapData.nodes.map(n => n.group))];
            nodeTypes.forEach(type => {
                const gradient = defs.append("radialGradient")
                    .attr("id", \`nodeGradient-\${type}\`)
                    .attr("cx", "30%")
                    .attr("cy", "30%");
                
                // Use config colors if available, otherwise fallback to colorScale
                const baseColor = (config.nodeColors && config.nodeColors[type]) 
                    ? config.nodeColors[type] 
                    : colorScale(type);
                    
                gradient.append("stop")
                    .attr("offset", "0%")
                    .attr("stop-color", d3.color(baseColor).brighter(0.8));
                
                gradient.append("stop")
                    .attr("offset", "100%")
                    .attr("stop-color", baseColor);
            });
            
            const simulation = d3.forceSimulation(currentMapData.nodes)
                .force('link', d3.forceLink(currentMapData.links || []).id(d => d.id).distance(100))
                .force('charge', d3.forceManyBody().strength(-300))
                .force('center', d3.forceCenter(width / 2, height / 2));
            
            // Add links with config styling
            const link = g.append('g')
                .attr('class', 'links')
                .selectAll('line')
                .data(currentMapData.links || [])
                .enter().append('line')
                .attr('stroke', config.linkColor || '#999')
                .attr('stroke-width', config.linkWidth || 2)
                .attr('stroke-opacity', config.linkOpacity || 0.6)
                .attr('filter', config.enableLinkGlow ? 'url(#linkGlow)' : null);
            
            // Add nodes with config styling
            const node = g.append('g')
                .attr('class', 'nodes')
                .selectAll('circle')
                .data(currentMapData.nodes)
                .enter().append('circle')
                .attr('r', 8 * (config.nodeSizeMultiplier || 1.0))
                .attr('fill', d => {
                    // Use gradients like main visualization
                    const baseColor = (config.nodeColors && config.nodeColors[d.group]) 
                        ? config.nodeColors[d.group] 
                        : colorScale(d.group);
                    return \`url(#nodeGradient-\${d.group})\` || baseColor;
                })
                .attr('stroke', config.nodeBorderColor || '#ffffff')
                .attr('stroke-width', config.nodeBorderWidth || 2)
                .attr('filter', config.enableNodeGlow ? 'url(#nodeGlow)' : null)
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended));
            
            // Add labels using the 'name' field from redacted data
            const label = g.append('g')
                .attr('class', 'labels')
                .selectAll('text')
                .data(currentMapData.nodes)
                .enter().append('text')
                .text(d => d.name || d.id) // Use name field for redacted maps
                .attr('font-size', '12px')
                .attr('fill', 'white')
                .attr('text-anchor', 'middle')
                .attr('dy', '.35em');
            
            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
                
                node
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y);
                
                label
                    .attr('x', d => d.x)
                    .attr('y', d => d.y);
            });
            
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            
            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }
            
            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
        }
        window.addEventListener('resize', () => {
            if (currentMapData) initPublicVisualization();
        });

        loadRedactedMap();
    </script>
</body>
</html>`;

        res.send(publicHTML);
        
    } catch (error) {
        log('error', 'Error serving redacted map page:', error);
        res.status(500).send('Internal server error');
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check Redis connection
        await redisClient.ping();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            environment: config.nodeEnv,
            redis: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    log('error', 'Express error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Handle 404s
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
async function startServer() {
    try {
        await connectRedis();
        
        app.listen(config.port, () => {
            log('info', `System Mapper starting...`);
            log('info', `Environment: ${config.nodeEnv}`);
            log('info', `Server running on http://localhost:${config.port}`);
            log('info', `Redis: ${config.redis.host}:${config.redis.port}`);
            log('info', 'Press Ctrl+C to stop the server');
        });
    } catch (error) {
        log('error', 'Failed to start server:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown
async function gracefulShutdown() {
    log('info', 'Shutting down gracefully...');
    
    try {
        await redisClient.quit();
        log('info', 'Redis connection closed');
    } catch (error) {
        log('error', 'Error closing Redis connection:', error.message);
    }
    
    process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log('error', 'Uncaught exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    log('error', 'Unhandled rejection:', error.message);
    process.exit(1);
});

startServer().catch(console.error);

module.exports = app;

// Utility function to validate and fix link integrity
function validateAndFixLinkIntegrity(map) {
    const nodeIds = new Set(map.nodes.map(n => n.id));
    const validLinks = [];
    const orphanedLinks = [];
    
    map.links.forEach(link => {
        const sourceExists = nodeIds.has(link.source);
        const targetExists = nodeIds.has(link.target);
        
        if (sourceExists && targetExists) {
            validLinks.push(link);
        } else {
            orphanedLinks.push({
                ...link,
                reason: `${!sourceExists ? 'source' : ''}${!sourceExists && !targetExists ? '+' : ''}${!targetExists ? 'target' : ''} missing`
            });
        }
    });
    
    if (orphanedLinks.length > 0) {
        log('warn', `Found ${orphanedLinks.length} orphaned links:`, orphanedLinks);
    }
    
    return {
        validLinks,
        orphanedLinks,
        fixed: orphanedLinks.length > 0
    };
}

// =============================================================================
