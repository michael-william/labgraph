// Main Application Entry Point and Coordination

// Global state variables
window.currentMapData = null;
window.currentMapId = null;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 System Mapper initializing...');

        // Set dark mode by default
    document.body.classList.add('dark');
    const themeBtn = document.querySelector('.theme-toggle');
    if (themeBtn) {
        themeBtn.innerHTML = '☀️'; // Sun icon for dark mode
    }
    
    try {
        // Load maps from API
        await loadMaps();
        
        // Initialize parent node container structure
        initializeParentNodeContainer();
        
        console.log('✅ System Mapper initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize System Mapper:', error);
        showMessage('Failed to initialize application', 'error');
    }

    document.getElementById('nodeType').addEventListener('change', function() {
    handleNodeTypeChange(this, 'nodeTypeCustom');
    });

    document.getElementById('editNodeType').addEventListener('change', function() {
        handleNodeTypeChange(this, 'editNodeTypeCustom');
    });
});


// Initialize parent node container structure
function initializeParentNodeContainer() {
    const container = document.getElementById('parentNodeContainer');
    const firstSelect = container.querySelector('.parent-node-select');
    
    if (firstSelect && !firstSelect.parentElement.classList.contains('parent-node-select-row')) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'parent-node-select-row';
        rowDiv.appendChild(firstSelect);
        container.appendChild(rowDiv);
    }
    
    updateRemoveParentButtons();
}

// Handle window resize - refresh visualization
window.addEventListener('resize', () => {
    if (window.currentMapData && typeof initVisualization === 'function') {
        // Debounce resize events
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            console.log('🔄 Window resized, refreshing visualization');
            initVisualization();
        }, 300);
    }
});

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    console.log('🔄 Browser navigation detected');
    // Could implement URL-based map selection here
});

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
    showMessage('An unexpected error occurred', 'error');
    // Prevent the default browser console error
    event.preventDefault();
});

// Global error handler for JavaScript errors
window.addEventListener('error', (event) => {
    console.error('❌ JavaScript error:', event.error);
    showMessage('An unexpected error occurred', 'error');
});

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // Ctrl/Cmd + S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveMap();
    }
    
    // Ctrl/Cmd + N to create new map
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        createNewMap();
    }
    
    // Ctrl/Cmd + E to export
    if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        exportMap();
    }
    
    // Escape to close forms
    if (event.key === 'Escape') {
        // Close any open tool panels
        document.getElementById('nodeConfig').classList.remove('active');
        document.getElementById('editNodeConfig').classList.remove('active');
        
        // Remove tool highlighting
        document.querySelectorAll('.tool-item').forEach(item => {
            item.style.background = '';
            item.style.borderColor = '';
        });
    }
});

// Utility function to debounce API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Auto-save functionality (could be enabled for frequent saves)
const autoSave = debounce(() => {
    if (window.currentMapData && window.currentMapId) {
        console.log('💾 Auto-saving map...');
        // Could implement auto-save here
    }
}, 5000);

// Performance monitoring
const performanceObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
        if (entry.duration > 100) {
            console.warn(`⚠️ Slow operation detected: ${entry.name} took ${entry.duration}ms`);
        }
    });
});

// Start observing performance
try {
    performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
} catch (e) {
    // Performance Observer not supported in all browsers
    console.log('Performance monitoring not available');
}

// Feature detection and graceful degradation
function checkBrowserSupport() {
    const features = {
        fetch: typeof fetch !== 'undefined',
        localStorage: typeof Storage !== 'undefined',
        d3: typeof d3 !== 'undefined',
        webgl: !!document.createElement('canvas').getContext('webgl')
    };
    
    console.log('🔍 Browser feature support:', features);
    
    if (!features.fetch) {
        showMessage('Your browser may not support all features', 'error');
    }
    
    return features;
}

// Initialize browser support check
checkBrowserSupport();

// Export global functions for console debugging
window.SystemMapper = {
    // Expose useful functions for debugging
    getCurrentMap: () => window.currentMapData,
    getCurrentMapId: () => window.currentMapId,
    reloadMap: loadSelectedMap,
    refreshVisualization: initVisualization,
    clearVisualization: clearVisualization,
    showMessage: showMessage,
    
    // Development helpers
    debug: {
        logState: () => {
            console.log('📊 Current State:', {
                mapId: window.currentMapId,
                nodeCount: window.currentMapData?.nodes?.length || 0,
                linkCount: window.currentMapData?.links?.length || 0
            });
        },
        exportDebugInfo: () => {
            return {
                timestamp: new Date().toISOString(),
                currentMap: window.currentMapData,
                browserInfo: navigator.userAgent,
                performance: performance.timing
            };
        }
    }
};

console.log('🔧 System Mapper debug tools available via window.SystemMapper');

// Add these test functions to help debug and verify your API
// You can add these to your main.js file or create a separate debug.js file

window.SystemMapper.debug = {
    ...window.SystemMapper.debug,
    
    // Test the node connections API
    async testNodeConnectionsAPI(nodeId) {
        if (!window.currentMapId) {
            console.error('❌ No map selected');
            return;
        }
        
        const testNodeId = nodeId || (window.currentMapData.nodes[0]?.id);
        if (!testNodeId) {
            console.error('❌ No nodes available for testing');
            return;
        }
        
        console.log(`🔍 Testing connections API for node: ${testNodeId}`);
        
        try {
            const response = await fetch(`/api/maps/${window.currentMapId}/nodes/${testNodeId}/connections`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('✅ API Response:', data);
            
            // Log summary
            console.log(`📊 Node: ${data.nodeName} (${data.nodeType})`);
            console.log(`📊 Total connections: ${data.totalConnections}`);
            console.log(`📊 Parents: ${data.parentCount}, Children: ${data.childCount}`);
            
            if (data.connections.parents.length > 0) {
                console.log('👆 Parent nodes:', data.connections.parents.map(p => p.name));
            }
            
            if (data.connections.children.length > 0) {
                console.log('👇 Child nodes:', data.connections.children.map(c => c.name));
            }
            
            return data;
        } catch (error) {
            console.error('❌ API Test failed:', error);
            throw error;
        }
    },
    
    // Test all connections API
    async testAllConnectionsAPI() {
        if (!window.currentMapId) {
            console.error('❌ No map selected');
            return;
        }
        
        console.log('🔍 Testing all connections API');
        
        try {
            const response = await fetch(`/api/maps/${window.currentMapId}/connections`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('✅ All Connections API Response:', data);
            console.log(`📊 Total connections in map: ${data.totalConnections}`);
            
            return data;
        } catch (error) {
            console.error('❌ All Connections API Test failed:', error);
            throw error;
        }
    },
    
    // Test modal functionality
    async testModalWithAPI() {
        if (!window.currentMapData || !window.currentMapData.nodes.length) {
            console.error('❌ No map data available');
            return;
        }
        
        const testNode = window.currentMapData.nodes[0];
        console.log(`🔍 Testing modal with API for node: ${testNode.id}`);
        
        try {
            await openNodeModalWithConnections(testNode);
            console.log('✅ Modal opened successfully');
        } catch (error) {
            console.error('❌ Modal test failed:', error);
        }
    },
    
    // Validate map data integrity
    validateMapData() {
        if (!window.currentMapData) {
            console.error('❌ No map data loaded');
            return false;
        }
        
        const { nodes, links } = window.currentMapData;
        let isValid = true;
        
        console.log('🔍 Validating map data...');
        
        // Check for orphaned links
        const nodeIds = new Set(nodes.map(n => n.id));
        const orphanedLinks = links.filter(link => 
            !nodeIds.has(link.source) || !nodeIds.has(link.target)
        );
        
        if (orphanedLinks.length > 0) {
            console.warn('⚠️ Orphaned links found:', orphanedLinks);
            isValid = false;
        }
        
        // Check for duplicate nodes
        const duplicateNodes = nodes.filter((node, index) => 
            nodes.findIndex(n => n.id === node.id) !== index
        );
        
        if (duplicateNodes.length > 0) {
            console.warn('⚠️ Duplicate nodes found:', duplicateNodes);
            isValid = false;
        }
        
        // Check for self-referencing links
        const selfLinks = links.filter(link => link.source === link.target);
        
        if (selfLinks.length > 0) {
            console.warn('⚠️ Self-referencing links found:', selfLinks);
        }
        
        console.log(`${isValid ? '✅' : '❌'} Map data validation ${isValid ? 'passed' : 'failed'}`);
        console.log(`📊 Nodes: ${nodes.length}, Links: ${links.length}`);
        
        return isValid;
    },
    
    // Get node connection summary
    getNodeConnectionSummary(nodeId) {
        if (!window.currentMapData) {
            console.error('❌ No map data loaded');
            return null;
        }
        
        const node = window.currentMapData.nodes.find(n => n.id === nodeId);
        if (!node) {
            console.error(`❌ Node "${nodeId}" not found`);
            return null;
        }
        
        const parents = window.currentMapData.links
            .filter(link => link.target === nodeId)
            .map(link => link.source);
        
        const children = window.currentMapData.links
            .filter(link => link.source === nodeId)
            .map(link => link.target);
        
        const summary = {
            nodeId,
            nodeName: node.id,
            nodeType: node.group,
            parents,
            children,
            totalConnections: parents.length + children.length
        };
        
        console.log('📊 Node Connection Summary:', summary);
        return summary;
    },

        // Test node renaming functionality
    async testNodeRename(oldId, newId) {
        if (!window.currentMapData) {
            console.error('❌ No map loaded');
            return;
        }
        
        const node = window.currentMapData.nodes.find(n => n.id === oldId);
        if (!node) {
            console.error(`❌ Node "${oldId}" not found`);
            return;
        }
        
        console.log(`🔍 Testing rename: ${oldId} -> ${newId}`);
        console.log('📊 Links before rename:', window.currentMapData.links.length);
        
        // Count links involving this node
        const linksInvolving = window.currentMapData.links.filter(l => 
            l.source === oldId || l.target === oldId
        );
        console.log(`📊 Links involving "${oldId}":`, linksInvolving.length);
        
        try {
            // Check if we have the new rename endpoint
            const response = await fetch(`/api/maps/${window.currentMapId}/nodes/${encodeURIComponent(oldId)}/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newId: newId,
                    group: node.group,
                    description: node.description || '',
                    attributes: node.attributes || []
                })
            });
            
            if (!response.ok) {
                // If rename endpoint doesn't exist, fall back to basic test
                if (response.status === 404) {
                    console.warn('⚠️ Rename endpoint not implemented yet - this is expected before applying the server fix');
                    return false;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Rename successful:', result);
            
            // Reload and verify
            await loadSelectedMap();
            
            const linksAfter = window.currentMapData.links.filter(l => 
                l.source === newId || l.target === newId
            );
            console.log(`📊 Links involving "${newId}" after rename:`, linksAfter.length);
            
            if (linksAfter.length === linksInvolving.length) {
                console.log('✅ All links preserved successfully!');
                return true;
            } else {
                console.warn('⚠️ Link count mismatch - some links may have been lost');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Rename test failed:', error);
            return false;
        }
    },
    
    // Validate current map link integrity
    validateLinks() {
        if (!window.currentMapData) {
            console.error('❌ No map loaded');
            return false;
        }
        
        const nodeIds = new Set(window.currentMapData.nodes.map(n => n.id));
        const orphanedLinks = window.currentMapData.links.filter(link => 
            !nodeIds.has(link.source) || !nodeIds.has(link.target)
        );
        
        if (orphanedLinks.length === 0) {
            console.log('✅ All links are valid!');
            return true;
        } else {
            console.warn(`⚠️ Found ${orphanedLinks.length} orphaned links:`);
            orphanedLinks.forEach(link => {
                console.warn(`  ${link.source} -> ${link.target}`);
                if (!nodeIds.has(link.source)) console.warn(`    Missing source: ${link.source}`);
                if (!nodeIds.has(link.target)) console.warn(`    Missing target: ${link.target}`);
            });
            return false;
        }
    },

    // Simple test to reproduce the current bug
    async testCurrentBug() {
        if (!window.currentMapData || window.currentMapData.nodes.length < 1) {
            console.error('❌ No map loaded or no nodes available');
            return;
        }

        console.log('🐛 Testing current node rename bug...');
        
        // Find a node to test with
        const testNode = window.currentMapData.nodes[0];
        const originalName = testNode.id;
        const testName = `${originalName}_TEST`;
        
        console.log(`📝 Original node: ${originalName}`);
        
        // Check existing links
        const linksBefore = window.currentMapData.links.filter(l => 
            l.source === originalName || l.target === originalName
        );
        console.log(`📊 Links before: ${linksBefore.length}`);
        
        // Simulate editing the node using the current (buggy) approach
        try {
            document.getElementById('editNodeSelect').value = originalName;
            populateEditNodeForm();
            
            // Change the name
            document.getElementById('editNodeName').value = testName;
            
            console.log('⚠️ About to trigger the bug with saveEditedNode()...');
            await saveEditedNode();
            
            // Check links after
            const linksAfter = window.currentMapData.links.filter(l => 
                l.source === testName || l.target === testName
            );
            console.log(`📊 Links after: ${linksAfter.length}`);
            
            if (linksAfter.length < linksBefore.length) {
                console.error(`🐛 BUG CONFIRMED: Lost ${linksBefore.length - linksAfter.length} links!`);
            } else {
                console.log('✅ Links preserved (bug may be fixed)');
            }
            
            // Revert the name change for cleanup
            document.getElementById('editNodeSelect').value = testName;
            populateEditNodeForm();
            document.getElementById('editNodeName').value = originalName;
            await saveEditedNode();
            
        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }
};

// Add convenience functions to global scope for easy testing
window.testNodeAPI = window.SystemMapper.debug.testNodeConnectionsAPI;
window.testAllConnectionsAPI = window.SystemMapper.debug.testAllConnectionsAPI;
window.testModal = window.SystemMapper.debug.testModalWithAPI;
window.validateMap = window.SystemMapper.debug.validateMapData;
window.getNodeSummary = window.SystemMapper.debug.getNodeConnectionSummary;
window.testRename = window.SystemMapper.debug.testNodeRename;
window.validateLinks = window.SystemMapper.debug.validateLinks;
window.testBug = window.SystemMapper.debug.testCurrentBug;

console.log('🔧 API testing functions available:');
console.log('   - testNodeAPI(nodeId) - Test node connections API');
console.log('   - testAllConnectionsAPI() - Test all connections API');
console.log('   - testModal() - Test modal functionality');
console.log('   - validateMap() - Validate map data integrity');
console.log('   - getNodeSummary(nodeId) - Get connection summary for a node');