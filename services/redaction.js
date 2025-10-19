const crypto = require('crypto');

/**
 * Generate a UUID v4 using Node.js crypto module
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * Redact a system map by removing all sensitive information and replacing it
 * with anonymized data while preserving the structure and relationships.
 * 
 * @param {Object} originalMap - The original map object from Redis
 * @param {Object} redisClient - Redis client for storage
 * @returns {Promise<Object>} - Object containing redactedId and publicUrl
 */
async function createRedactedMap(originalMap, redisClient, config = null) {
    const redactedId = generateUUID();
    
    // Create mapping from original node IDs to redacted IDs
    const idMapping = new Map();
    const groupCounters = new Map();
    
    // Sort nodes by ID for deterministic ordering
    const sortedNodes = [...originalMap.nodes].sort((a, b) => a.id.localeCompare(b.id));
    
    // First pass: Create redacted nodes with new IDs
    const redactedNodes = sortedNodes.map(originalNode => {
        const group = originalNode.group || originalNode.type || 'Node';
        
        // Increment counter for this group
        const currentCount = (groupCounters.get(group) || 0) + 1;
        groupCounters.set(group, currentCount);
        
        // Generate new redacted ID and name
        const redactedNodeId = generateUUID();
        const redactedName = `${group}_${currentCount}`;
        
        // Store the mapping
        idMapping.set(originalNode.id, redactedNodeId);
        
        // Return only allowlisted fields
        return {
            id: redactedNodeId,
            group: group,
            name: redactedName
        };
    });
    
    // Second pass: Process links/edges and rewire to redacted IDs
    const redactedLinks = [];
    if (originalMap.links) {
        originalMap.links.forEach(link => {
            const sourceRedactedId = idMapping.get(link.source);
            const targetRedactedId = idMapping.get(link.target);
            
            if (sourceRedactedId && targetRedactedId) {
                redactedLinks.push({
                    source: sourceRedactedId,
                    target: targetRedactedId
                });
            }
        });
    }
    
    // Create the redacted map payload with strict allowlisting
    const redactedMap = {
        id: redactedId,
        nodes: redactedNodes,
        links: redactedLinks,
        config: config
    };
    
    // Store in Redis with TTL (7 days default)
    const ttlSeconds = parseInt(process.env.REDACTED_TTL_SECONDS) || 604800; // 7 days
    
    await redisClient.setEx(
        `redacted:${redactedId}`, 
        ttlSeconds,
        JSON.stringify(redactedMap)
    );
    
    // Store the link back to original (for internal use only)
    await redisClient.setEx(
        `redacted:link:${redactedId}`, 
        ttlSeconds,
        originalMap.id
    );
    
    // Optional: Add to reverse index for cleanup tooling
    if (process.env.ENABLE_REDACTED_INDEX === 'true') {
        await redisClient.sAdd(`redacted:index:${originalMap.id}`, redactedId);
        await redisClient.expire(`redacted:index:${originalMap.id}`, ttlSeconds);
    }
    
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
    const publicUrl = `${publicBaseUrl}/redacted/${redactedId}`;
    
    return {
        redactedId,
        publicUrl
    };
}

/**
 * Retrieve a redacted map by its ID
 * 
 * @param {string} redactedId - The redacted map ID
 * @param {Object} redisClient - Redis client
 * @returns {Promise<Object|null>} - The redacted map data or null if not found
 */
async function getRedactedMap(redactedId, redisClient) {
    const redactedData = await redisClient.get(`redacted:${redactedId}`);
    if (!redactedData) {
        return null;
    }
    
    return JSON.parse(redactedData);
}

module.exports = {
    createRedactedMap,
    getRedactedMap,
    generateUUID
};
