// API Helper Functions and Data Management

// API helper function
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API call failed');
        }
        
        if (response.status === 204) {
            return null; // No content
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showMessage(error.message, 'error');
        throw error;
    }
}

// Map Management Functions
async function loadMaps() {
    try {
        const maps = await apiCall('/api/maps');
        const selector = document.getElementById('mapSelector');
        
        selector.innerHTML = '<option value="">Select a map...</option>';
        
        maps.forEach(map => {
            const option = document.createElement('option');
            option.value = map.id;
            option.textContent = `${map.name} (${map.nodeCount} nodes)`;
            selector.appendChild(option);
        });

        // Load the first map if available
        if (maps.length > 0) {
            selector.value = maps[0].id;
            await loadSelectedMap();
        }
        
        // Initialize rename functionality after maps are loaded
        if (typeof initializeMapRename === 'function') {
            initializeMapRename();
        }
        
    } catch (error) {
        showMessage('Failed to load maps', 'error');
    }
}

async function loadSelectedMap() {
    const selector = document.getElementById('mapSelector');
    const mapId = selector.value;
    
    if (!mapId) {
        window.currentMapData = null;
        window.currentMapId = null;
        clearVisualization();
        return;
    }
    
    try {
        window.currentMapData = await apiCall(`/api/maps/${mapId}`);
        window.currentMapId = mapId;
        initVisualization();
        updateParentNodeOptions();
        updateEditNodeOptions();
        console.log('📊 Map loaded:', window.currentMapData.name);
    } catch (error) {
        showMessage('Failed to load map', 'error');
    }
}

async function createNewMap() {
    const name = prompt('Enter map name:');
    if (!name) return;
    
    try {
        const newMap = await apiCall('/api/maps', {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                description: 'New system map'
            })
        });
        
        await loadMaps();
        document.getElementById('mapSelector').value = newMap.id;
        await loadSelectedMap();
        showMessage('Map created successfully!');
    } catch (error) {
        showMessage('Failed to create map', 'error');
    }
}

async function deleteCurrentMap() {
    if (!window.currentMapId) {
        showMessage('No map selected', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete "${window.currentMapData.name}"?`)) return;
    
    try {
        await apiCall(`/api/maps/${window.currentMapId}`, {
            method: 'DELETE'
        });
        
        await loadMaps();
        showMessage('Map deleted successfully!');
    } catch (error) {
        showMessage('Failed to delete map', 'error');
    }
}

// Node Management Functions
async function saveNode() {
    if (!window.currentMapId) {
        showMessage('No map selected', 'error');
        return;
    }
    
    const parentNodeValues = Array.from(document.querySelectorAll('.parent-node-select'))
    .map(sel => sel.value)
    .filter(val => val);
    
    const nodeData = {
        id: document.getElementById('nodeName').value,
        group: getSelectedNodeType('nodeType', 'nodeTypeCustom'),
        description: document.getElementById('nodeDescription').value || '', // ADD THIS LINE
        parentNodes: parentNodeValues,
        attributes: []
    };
    
    // Collect custom attributes
    document.querySelectorAll('#attributesList .attribute-item').forEach(item => {
        const nameInput = item.querySelector('.attribute-name-input');
        const valueInput = item.querySelector('.attribute-value-input');
        if (nameInput.value && valueInput.value) {
            nodeData.attributes.push({
                name: nameInput.value,
                value: valueInput.value
            });
        }
    });
    
    if (!nodeData.id) {
        showMessage('Please enter a node name', 'error');
        return;
    }
    
    try {
        await apiCall(`/api/maps/${window.currentMapId}/nodes`, {
            method: 'POST',
            body: JSON.stringify(nodeData)
        });
        
        // Reload the map to get updated data
        await loadSelectedMap();
        updateNodeTypeOptions(); // Add this line
        
        // Clear form fields
        document.getElementById('nodeName').value = '';
        document.getElementById('nodeType').value = '';
        document.getElementById('nodeDescription').value = '';
        document.querySelectorAll('.parent-node-select').forEach(select => select.value = '');
        document.getElementById('attributesList').innerHTML = '';
        
        showMessage('Node added successfully!');
        } catch (error) {
            showMessage(error.message || 'Failed to add node', 'error');
        }
}

async function saveEditedNode() {
    const editNodeSelect = document.getElementById('editNodeSelect');
    const originalNodeId = editNodeSelect.value;
    if (!originalNodeId) {
        showMessage('Please select a node to edit', 'error');
        return;
    }
    
    try {
        // Get updated values
        const newNodeName = document.getElementById('editNodeName').value;
        const newNodeType = getSelectedNodeType('editNodeType', 'editNodeTypeCustom');
        const newNodeDescription = document.getElementById('editNodeDescription').value; 
        
        // Collect parent nodes
        const newParentNodes = Array.from(document.querySelectorAll('.edit-parent-node-select'))
            .map(select => select.value)
            .filter(value => value);
        
        // Collect attributes
        const attributes = [];
        document.getElementById('editAttributesList').querySelectorAll('.attribute-item').forEach(item => {
            const nameInput = item.querySelector('.attribute-name-input');
            const valueInput = item.querySelector('.attribute-value-input');
            if (nameInput.value && valueInput.value) {
                attributes.push({
                    name: nameInput.value,
                    value: valueInput.value
                });
            }
        });
        
        if (!newNodeName) {
            showMessage('Please enter a node name', 'error');
            return;
        }
        
        // Debug logging
        console.log('🔧 Editing node:', originalNodeId);
        console.log('🔧 New name:', newNodeName);
        console.log('🔧 New type:', newNodeType);
        console.log('🔧 New parent nodes:', newParentNodes);
        console.log('🔧 New attributes:', attributes);
        
        // Check if name changed and if new name already exists
        if (newNodeName !== originalNodeId) {
            const nameExists = window.currentMapData.nodes.find(n => n.id === newNodeName && n.id !== originalNodeId);
            if (nameExists) {
                showMessage('A node with this name already exists', 'error');
                return;
            }
            
            console.log('🔄 Node name changed, using link-preserving rename endpoint');
            
            // NEW: Use the rename endpoint that preserves links
            await apiCall(`/api/maps/${window.currentMapId}/nodes/${encodeURIComponent(originalNodeId)}/rename`, {
                method: 'PUT',
                body: JSON.stringify({
                    newId: newNodeName,
                    group: newNodeType || 'Default',
                    description: newNodeDescription || '',
                    attributes: attributes,
                    parentNodes: newParentNodes
                })
            });
        } else {
            console.log('📝 Node name unchanged, updating in place');
            // Just update the existing node
            const updateData = {
                id: newNodeName,
                group: newNodeType || 'Default',
                description: newNodeDescription,
                attributes: attributes,
                parentNodes: newParentNodes
            };
            
            console.log('📤 Sending update data:', updateData);
            
            await apiCall(`/api/maps/${window.currentMapId}/nodes/${originalNodeId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
        }
        
        console.log('✅ Node update completed, reloading map');
        await loadSelectedMap();
        updateEditNodeOptions();
        updateNodeTypeOptions(); // Add this line

        // Reselect the node (with potentially new name)
        document.getElementById('editNodeSelect').value = newNodeName;
        populateEditNodeForm();
        
        showMessage('Node updated successfully!');
        } catch (error) {
            console.error('❌ Error in saveEditedNode:', error);
            showMessage(error.message || 'Failed to update node', 'error');
        }
}

async function deleteSelectedNode() {
    const editNodeSelect = document.getElementById('editNodeSelect');
    const selectedId = editNodeSelect.value;
    if (!selectedId) {
        showMessage('Please select a node to delete', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete the node "${selectedId}"?`)) return;
    
    try {
        await apiCall(`/api/maps/${window.currentMapId}/nodes/${selectedId}`, {
            method: 'DELETE'
        });
        
        await loadSelectedMap();
        editNodeSelect.value = '';
        document.getElementById('editAttributesList').innerHTML = '';
        document.getElementById('editNodeForm').style.display = 'none';
        showMessage('Node deleted successfully!');
    } catch (error) {
        showMessage('Failed to delete node', 'error');
    }
}

// Get the selected node type (from dropdown or custom input)
function getSelectedNodeType(selectId, customInputId) {
    const select = document.getElementById(selectId);
    const customInput = document.getElementById(customInputId);
    
    if (customInput.style.display !== 'none' && customInput.value.trim()) {
        return customInput.value.trim();
    }
    
    return select.value || 'Default';
}