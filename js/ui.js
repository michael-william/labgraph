// UI Functions and Form Handling

function showMessage(message, type = 'success') {
    const messageEl = document.getElementById('statusMessage');
    messageEl.textContent = message;
    messageEl.className = `status-message ${type} show`;
    
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 3000);
}

// Tool Functions
function selectTool(tool, event = null) {
    // Remove active state from all items
    document.querySelectorAll('.tool-item').forEach(i => {
        i.style.background = '';
        i.style.borderColor = '';
    });

    const nodeConfig = document.getElementById('nodeConfig');
    const editNodeConfig = document.getElementById('editNodeConfig');

    // Toggle panels based on tool
    if (tool === 'node') {
        if (nodeConfig.classList.contains('active')) {
            nodeConfig.classList.remove('active');
            return;
        }
        nodeConfig.classList.add('active');
        editNodeConfig.classList.remove('active');
        updateParentNodeOptions();
    } else if (tool === 'edit') {
        if (editNodeConfig.classList.contains('active')) {
            editNodeConfig.classList.remove('active');
            return;
        }
        editNodeConfig.classList.add('active');
        nodeConfig.classList.remove('active');
        updateEditNodeOptions();
    }
    
    // Highlight the clicked tool if event is available
    if (event && event.target) {
        const toolItem = event.target.closest('.tool-item');
        if (toolItem) {
            toolItem.style.background = document.body.classList.contains('dark') ? '#333' : '#e3f2fd';
            toolItem.style.borderColor = '#667eea';
        }
    } else {
        // If no event, find and highlight the correct tool item by tool name
        const toolItems = document.querySelectorAll('.tool-item');
        toolItems.forEach(item => {
            const toolText = item.querySelector('.tool-text');
            if (toolText && 
                ((tool === 'edit' && toolText.textContent.includes('Edit')) ||
                 (tool === 'node' && toolText.textContent.includes('Add')))) {
                item.style.background = document.body.classList.contains('dark') ? '#333' : '#e3f2fd';
                item.style.borderColor = '#667eea';
            }
        });
    }
}

function updateParentNodeOptions() {
    const parentNodeSelects = document.querySelectorAll('.parent-node-select');
    parentNodeSelects.forEach(select => {
        select.innerHTML = '<option value="">Select parent node</option>';
        if (window.currentMapData && window.currentMapData.nodes) {
            window.currentMapData.nodes.forEach(node => {
                const option = document.createElement('option');
                option.value = node.id;
                option.textContent = node.id;
                select.appendChild(option);
            });
        }
    });
}

function updateEditNodeOptions() {
    const editNodeSelect = document.getElementById('editNodeSelect');
    if (editNodeSelect) {
        editNodeSelect.innerHTML = '<option value="">Select node</option>';
        if (window.currentMapData && window.currentMapData.nodes) {
            window.currentMapData.nodes.forEach(node => {
                const option = document.createElement('option');
                option.value = node.id;
                option.textContent = node.id;
                editNodeSelect.appendChild(option);
            });
        }
    }
}

// Edit Form Functions
async function populateEditNodeForm() {
    const editNodeSelect = document.getElementById('editNodeSelect');
    const editNodeForm = document.getElementById('editNodeForm');
    const selectedId = editNodeSelect.value;
    
    console.log('🔍 populateEditNodeForm called with selectedId:', selectedId);
    
    if (!selectedId) {
        editNodeForm.style.display = 'none';
        return;
    }

    // Show the edit form
    editNodeForm.style.display = 'block';

    // Find the selected node
    const node = window.currentMapData.nodes.find(n => n.id === selectedId);
    if (!node) return;

    // Populate basic fields
    document.getElementById('editNodeName').value = node.id;
    document.getElementById('editNodeType').value = node.group || '';
    document.getElementById('editNodeDescription').value = node.description || '';

    // Clear and populate parent nodes
    const editParentContainer = document.getElementById('editParentNodeContainer');
    editParentContainer.innerHTML = '';

    // Find current parent nodes
    const currentParents = window.currentMapData.links
        .filter(link => (link.target.id || link.target) === selectedId)
        .map(link => link.source.id || link.source);
    
    console.log('🔍 Current parents found:', currentParents);
    console.log('🔍 All links for debugging:', window.currentMapData.links);
    console.log('🔍 Links pointing to selectedId:', window.currentMapData.links.filter(link => link.target === selectedId));
    console.log('🔍 Checking link targets vs selectedId:');
    window.currentMapData.links.forEach((link, i) => {
        const sourceId = link.source.id || link.source;
        const targetId = link.target.id || link.target;
        console.log(`🔍 Link ${i}: source="${sourceId}", target="${targetId}", target===selectedId: ${targetId === selectedId}`);
    });

    // Create parent node selects (at least one)
    if (currentParents.length === 0) {
        console.log('🔍 No parents found, creating empty select');
        addEditParentNodeSelect();
    } else {
        console.log('🔍 Creating parent selects for:', currentParents);
        currentParents.forEach((parentId, index) => {
            console.log(`🔍 Creating parent select ${index + 1} for parentId:`, parentId);
            addEditParentNodeSelect(parentId);
        });
    }

    // Clear and populate custom attributes
    const editAttributesList = document.getElementById('editAttributesList');
    editAttributesList.innerHTML = '';
    
    (node.attributes || []).forEach(attr => {
        addEditAttribute(attr.name, attr.value);
    });
}

function addEditParentNodeSelect(selectedParentId = '') {
    console.log('🔍 addEditParentNodeSelect called with selectedParentId:', selectedParentId);
    const container = document.getElementById('editParentNodeContainer');
    
    const rowDiv = document.createElement('div');
    rowDiv.className = 'parent-node-select-row';

    const select = document.createElement('select');
    select.className = 'config-select edit-parent-node-select';
    select.innerHTML = '<option value="">Select parent node</option>';
    
    if (window.currentMapData && window.currentMapData.nodes) {
        // Don't include the currently edited node as a parent option
        const editNodeSelect = document.getElementById('editNodeSelect');
        const currentEditId = editNodeSelect.value;
        console.log('🔍 currentEditId:', currentEditId);
        console.log('🔍 Available nodes:', window.currentMapData.nodes.map(n => n.id));
        
        let optionFound = false;
        window.currentMapData.nodes.forEach(node => {
            if (node.id !== currentEditId) {
                const option = document.createElement('option');
                option.value = node.id;
                option.textContent = node.id;
                if (node.id === selectedParentId) {
                    option.selected = true;
                    optionFound = true;
                    console.log('🔍 ✅ Pre-selected option:', node.id);
                }
                select.appendChild(option);
            }
        });
        
        console.log('🔍 selectedParentId found in options:', optionFound);
        console.log('🔍 Final select value after setup:', select.value);
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-parent-btn';
    removeBtn.textContent = '−';
    removeBtn.onclick = function() {
        rowDiv.remove();
        updateEditRemoveParentButtons();
    };

    rowDiv.appendChild(select);
    rowDiv.appendChild(removeBtn);
    container.appendChild(rowDiv);
    
    updateEditRemoveParentButtons();
}

function updateEditRemoveParentButtons() {
    const container = document.getElementById('editParentNodeContainer');
    const rows = container.querySelectorAll('.parent-node-select-row');
    rows.forEach((row, idx) => {
        const btn = row.querySelector('.remove-parent-btn');
        if (btn) btn.style.display = idx === 0 ? 'none' : '';
    });
}

// Attribute Management Functions
function addAttribute() {
    const attributesList = document.getElementById('attributesList');

    const attributeDiv = document.createElement('div');
    attributeDiv.className = 'attribute-item';

    const nameRow = document.createElement('div');
    nameRow.className = 'attribute-name-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'attribute-name-input';
    nameInput.placeholder = 'Attribute name';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-attribute-btn';
    removeBtn.textContent = '−';
    removeBtn.onclick = function() {
        attributeDiv.remove();
    };

    nameRow.appendChild(nameInput);
    nameRow.appendChild(removeBtn);

    const valueInput = document.createElement('textarea');
    valueInput.className = 'attribute-value-input';
    valueInput.placeholder = 'Enter attribute value (can be multiple lines)';

    attributeDiv.appendChild(nameRow);
    attributeDiv.appendChild(valueInput);

    attributesList.appendChild(attributeDiv);
}

function addEditAttribute(name = '', value = '') {
    const editAttributesList = document.getElementById('editAttributesList');

    const attributeDiv = document.createElement('div');
    attributeDiv.className = 'attribute-item';

    const nameRow = document.createElement('div');
    nameRow.className = 'attribute-name-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'attribute-name-input';
    nameInput.placeholder = 'Attribute name';
    nameInput.value = name;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-attribute-btn';
    removeBtn.textContent = '−';
    removeBtn.onclick = function() {
        attributeDiv.remove();
    };

    nameRow.appendChild(nameInput);
    nameRow.appendChild(removeBtn);

    const valueInput = document.createElement('textarea');
    valueInput.className = 'attribute-value-input';
    valueInput.placeholder = 'Enter attribute value';
    valueInput.value = value;

    attributeDiv.appendChild(nameRow);
    attributeDiv.appendChild(valueInput);

    editAttributesList.appendChild(attributeDiv);
}

function addParentNodeSelect() {
    const container = document.getElementById('parentNodeContainer');
    const selects = container.querySelectorAll('.parent-node-select');
    const newSelect = selects[0].cloneNode(true);
    newSelect.selectedIndex = 0;

    const rowDiv = document.createElement('div');
    rowDiv.className = 'parent-node-select-row';
    rowDiv.appendChild(newSelect);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-parent-btn';
    removeBtn.textContent = '−';
    removeBtn.onclick = function() {
        rowDiv.remove();
        updateRemoveParentButtons();
    };
    rowDiv.appendChild(removeBtn);

    container.appendChild(rowDiv);
    updateRemoveParentButtons();
}

function updateRemoveParentButtons() {
    const container = document.getElementById('parentNodeContainer');
    const rows = container.querySelectorAll('.parent-node-select-row');
    rows.forEach((row, idx) => {
        const btn = row.querySelector('.remove-parent-btn');
        if (btn) btn.style.display = idx === 0 ? 'none' : '';
    });
}

// Theme and UI Controls
function toggleTheme() {
    document.body.classList.toggle('dark');
    const btn = document.querySelector('.theme-toggle');
    btn.innerHTML = document.body.classList.contains('dark') ? '☀️' : '🌙';
}

function togglePanel() {
    const panel = document.getElementById('sidePanel');
    const collapseBtn = panel.querySelector('.collapse-btn');
    
    panel.classList.toggle('collapsed');
    collapseBtn.innerHTML = panel.classList.contains('collapsed') ? '‹' : '‹';
}

// Export and Share Functions
function exportMap() {
    if (!window.currentMapData) {
        showMessage('No map selected', 'error');
        return;
    }

    // Create clean export data that matches upload format exactly
    const exportData = {
        name: window.currentMapData.name,
        description: window.currentMapData.description || '',
        nodes: [],
        links: []
    };

    // Clean nodes - remove D3.js simulation properties (x, y, vx, vy, fx, fy, etc.)
    exportData.nodes = window.currentMapData.nodes.map(node => {
        const cleanNode = {
            id: node.id,
            group: node.group,
            attributes: node.attributes || []
        };
        
        // Include description if it exists
        if (node.description) {
            cleanNode.description = node.description;
        }
        
        return cleanNode;
    });

    // Clean links - ensure simple source/target string format (D3 may convert to objects)
    exportData.links = window.currentMapData.links.map(link => ({
        source: link.source.id || link.source,  // Handle both string and object references
        target: link.target.id || link.target   // Handle both string and object references
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${window.currentMapData.name}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showMessage('Map exported successfully!');
}

// Enhanced Share Function with Embed Option
// Replace your existing shareMap() function in ui.js with this:

// Updated Share Function - Replace your existing shareMap() function with this:

function shareMap() {
    if (!window.currentMapData || !window.currentMapId) {
        showMessage('No map selected to share', 'error');
        return;
    }

    const shareModal = createShareModal();
    document.body.appendChild(shareModal);
    setTimeout(() => shareModal.classList.add('show'), 10);
}

function createShareModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'shareModal';
    
    const currentUrl = window.location.href;
    const mapUrl = `${window.location.origin}${window.location.pathname}?map=${window.currentMapId}`;
    const embedUrl = `${window.location.origin}/embed?map=${window.currentMapId}`;
    const embedCode = generateEmbedCode(embedUrl);
    
    modal.innerHTML = `
        <div class="modal" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h3 class="modal-title">📤 Share Map</h3>
                <button class="modal-close" onclick="closeShareModal()">&times;</button>
            </div>
            <div class="modal-content">
                <div class="modal-section">
                    <div class="modal-section-title">🔗 Direct Link</div>
                    <div class="share-option">
                        <label class="share-label">Full Application URL:</label>
                        <div class="share-input-group">
                            <input type="text" class="share-input" id="mapUrl" value="${mapUrl}" readonly>
                            <button class="share-copy-btn" onclick="copyToClipboard('mapUrl', 'Full app URL copied!')">
                                📋 Copy
                            </button>
                        </div>
                        <div class="share-description">
                            Share this link to let others view and edit your map
                        </div>
                    </div>
                </div>
                
                <div class="modal-section">
                    <div class="modal-section-title">🎯 Visualization Only</div>
                    <div class="share-option">
                        <label class="share-label">D3.js Graph URL:</label>
                        <div class="share-input-group">
                            <input type="text" class="share-input" id="embedUrl" value="${embedUrl}" readonly>
                            <button class="share-copy-btn" onclick="copyToClipboard('embedUrl', 'Visualization URL copied!')">
                                📋 Copy
                            </button>
                        </div>
                        <div class="share-description">
                            Direct link to just the interactive graph visualization
                        </div>
                    </div>
                </div>
                
                <div class="modal-section">
                    <div class="modal-section-title">🖼️ Embed Code</div>
                    <div class="share-option">
                        <label class="share-label">HTML Embed Code:</label>
                        <div class="share-input-group">
                            <textarea class="share-textarea" id="embedCode" readonly>${embedCode}</textarea>
                            <button class="share-copy-btn" onclick="copyToClipboard('embedCode', 'Embed code copied!')">
                                📋 Copy
                            </button>
                        </div>
                        <div class="share-description">
                            Embed the visualization in your website or documentation
                        </div>
                    </div>
                </div>
                
                <div class="modal-section">
                    <div class="modal-section-title">⚙️ Embed Options</div>
                    <div class="embed-options">
                        <div class="embed-option-group">
                            <label class="embed-label">
                                <input type="checkbox" id="embedWatermark" checked onchange="updateEmbedCode()">
                                Show watermark
                            </label>
                        </div>
                        <div class="embed-option-group">
                            <label class="embed-label">
                                Width: <input type="text" class="embed-size-input" id="embedWidth" value="800" onchange="updateEmbedCode()">px
                            </label>
                        </div>
                        <div class="embed-option-group">
                            <label class="embed-label">
                                Height: <input type="text" class="embed-size-input" id="embedHeight" value="600" onchange="updateEmbedCode()">px
                            </label>
                        </div>
                        <div class="embed-option-group">
                            <label class="embed-label">
                                <input type="checkbox" id="embedResponsive" onchange="updateEmbedCode()">
                                Responsive (100% width)
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="modal-section">
                    <div class="modal-section-title">👀 Preview</div>
                    <div class="embed-preview">
                        <iframe id="embedPreview" src="${embedUrl}" width="400" height="300" frameborder="0" style="border: 1px solid rgba(102, 126, 234, 0.4); border-radius: 6px;"></iframe>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeShareModal();
        }
    };
    
    return modal;
}

function generateEmbedCode(baseEmbedUrl) {
    const showWatermark = document.getElementById('embedWatermark')?.checked ?? true;
    const width = document.getElementById('embedWidth')?.value ?? '800';
    const height = document.getElementById('embedHeight')?.value ?? '600';
    const responsive = document.getElementById('embedResponsive')?.checked ?? false;
    
    let embedUrl = baseEmbedUrl;
    const params = [];
    
    if (!showWatermark) params.push('watermark=false');
    
    if (params.length > 0) {
        embedUrl += (baseEmbedUrl.includes('?') ? '&' : '?') + params.join('&');
    }
    
    if (responsive) {
        return `<iframe src="${embedUrl}" width="100%" height="${height}" frameborder="0" style="border: 1px solid #ccc; border-radius: 8px; min-width: 300px;"></iframe>`;
    } else {
        return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" style="border: 1px solid #ccc; border-radius: 8px;"></iframe>`;
    }
}

function updateEmbedCode() {
    const baseEmbedUrl = `${window.location.origin}/embed?map=${window.currentMapId}`;
    const newEmbedCode = generateEmbedCode(baseEmbedUrl);
    
    const embedCodeElement = document.getElementById('embedCode');
    const previewElement = document.getElementById('embedPreview');
    const embedUrlElement = document.getElementById('embedUrl');
    
    if (embedCodeElement) {
        embedCodeElement.value = newEmbedCode;
    }
    
    if (previewElement && embedUrlElement) {
        const showWatermark = document.getElementById('embedWatermark').checked;
        const width = document.getElementById('embedWidth').value;
        const height = document.getElementById('embedHeight').value;
        const responsive = document.getElementById('embedResponsive').checked;
        
        let previewUrl = baseEmbedUrl;
        const params = [];
        
        if (!showWatermark) params.push('watermark=false');
        
        if (params.length > 0) {
            previewUrl += (baseEmbedUrl.includes('?') ? '&' : '?') + params.join('&');
        }
        
        // Update the embed URL input
        embedUrlElement.value = previewUrl;
        
        // Update preview iframe
        previewElement.src = previewUrl;
        if (responsive) {
            previewElement.width = 400;
            previewElement.height = Math.min(300, parseInt(height) / 2);
        } else {
            previewElement.width = Math.min(400, parseInt(width) / 2);
            previewElement.height = Math.min(300, parseInt(height) / 2);
        }
    }
}

function copyToClipboard(elementId, successMessage) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.select();
    element.setSelectionRange(0, 99999);
    
    try {
        document.execCommand('copy');
        showMessage(successMessage || 'Copied to clipboard!');
    } catch (err) {
        navigator.clipboard.writeText(element.value).then(() => {
            showMessage(successMessage || 'Copied to clipboard!');
        }).catch(() => {
            showMessage('Failed to copy to clipboard', 'error');
        });
    }
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
}

// Make functions available globally
window.shareMap = shareMap;
window.closeShareModal = closeShareModal;
window.copyToClipboard = copyToClipboard;
window.updateEmbedCode = updateEmbedCode;


function saveMap() {
    showMessage('Map saved automatically!');
}

// Upload Functions
function uploadMap() {
    const fileInput = document.getElementById('mapFileInput');
    if (!fileInput) {
        showMessage('Upload not available', 'error');
        return;
    }
    
    // Reset the input to allow re-uploading the same file
    fileInput.value = '';
    fileInput.click();
}

async function handleMapFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.json')) {
        showMessage('Please select a JSON file', 'error');
        return;
    }
    
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showMessage('File too large. Maximum size is 10MB', 'error');
        return;
    }
    
    try {
        showMessage('Uploading map...', 'success');
        
        // Read file content
        const fileContent = await readFileAsText(file);
        
        // Parse and validate JSON
        let mapData;
        try {
            mapData = JSON.parse(fileContent);
        } catch (parseError) {
            throw new Error('Invalid JSON file format');
        }
        
        // Validate map structure
        const validationResult = validateMapData(mapData);
        if (!validationResult.valid) {
            throw new Error(`Invalid map structure: ${validationResult.error}`);
        }
        
        // Create new map using existing API
        const newMap = await apiCall('/api/maps', {
            method: 'POST',
            body: JSON.stringify({
                name: mapData.name || `Uploaded Map - ${new Date().toLocaleDateString()}`,
                description: mapData.description || 'Uploaded from JSON file',
                nodes: mapData.nodes,
                links: mapData.links
            })
        });
        
        // Reload maps and select the new one
        await loadMaps();
        document.getElementById('mapSelector').value = newMap.id;
        await loadSelectedMap();
        
        showMessage(`Map "${newMap.name}" uploaded successfully!`, 'success');
        
    } catch (error) {
        console.error('Upload error:', error);
        showMessage(error.message || 'Failed to upload map', 'error');
    }
}

// Helper function to read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// Validate map data structure
function validateMapData(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Data must be an object' };
    }
    
    // Check for required fields
    if (!Array.isArray(data.nodes)) {
        return { valid: false, error: 'Missing or invalid "nodes" array' };
    }
    
    if (!Array.isArray(data.links)) {
        return { valid: false, error: 'Missing or invalid "links" array' };
    }
    
    // Validate nodes structure
    for (let i = 0; i < data.nodes.length; i++) {
        const node = data.nodes[i];
        if (!node.id || typeof node.id !== 'string') {
            return { valid: false, error: `Node ${i + 1} missing required "id" field` };
        }
    }
    
    // Validate links structure
    for (let i = 0; i < data.links.length; i++) {
        const link = data.links[i];
        if (!link.source || !link.target) {
            return { valid: false, error: `Link ${i + 1} missing "source" or "target" field` };
        }
    }
    
    // Check if all link references point to existing nodes
    const nodeIds = new Set(data.nodes.map(n => n.id));
    for (let i = 0; i < data.links.length; i++) {
        const link = data.links[i];
        const sourceId = link.source.id || link.source;
        const targetId = link.target.id || link.target;
        
        if (!nodeIds.has(sourceId)) {
            return { valid: false, error: `Link ${i + 1} references non-existent source node: ${sourceId}` };
        }
        if (!nodeIds.has(targetId)) {
            return { valid: false, error: `Link ${i + 1} references non-existent target node: ${targetId}` };
        }
    }
    
    return { valid: true };
}

// Make functions globally available
window.uploadMap = uploadMap;
window.handleMapFileUpload = handleMapFileUpload;

// Map Rename Functions
// Update the initializeMapRename() function in ui.js with this enhanced version:

function initializeMapRename() {
    const mapSelector = document.getElementById('mapSelector');
    if (mapSelector) {
        // Remove existing listeners to avoid duplicates
        mapSelector.removeEventListener('dblclick', startMapRename);
        mapSelector.removeEventListener('click', handleMapRenameClick);
        
        // Add Ctrl+Click / Cmd+Click listener
        mapSelector.addEventListener('click', handleMapRenameClick);
        
        // Add tooltip functionality
        addRenameTooltip(mapSelector);
    }
}

function addRenameTooltip(element) {
    // Detect OS and set appropriate tooltip text
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const tooltipText = isMac ? '⌘+Click to rename' : 'Ctrl+Click to rename';
    
    // Set the title attribute for basic tooltip
    element.title = tooltipText;
    
    // Optional: Enhanced tooltip with custom styling
    let tooltip = null;
    
    element.addEventListener('mouseenter', function(e) {
        // Only show tooltip if we have a map selected
        if (!window.currentMapId) return;
        
        // Create custom tooltip
        tooltip = document.createElement('div');
        tooltip.className = 'rename-tooltip';
        tooltip.textContent = tooltipText;
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.bottom + 5) + 'px';
        
        // Show tooltip
        setTimeout(() => {
            if (tooltip) tooltip.classList.add('show');
        }, 100);
    });
    
    element.addEventListener('mouseleave', function() {
        if (tooltip) {
            tooltip.classList.remove('show');
            setTimeout(() => {
                if (tooltip && tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
                tooltip = null;
            }, 200);
        }
    });
}

function handleMapRenameClick(e) {
    if (e.ctrlKey || e.metaKey) {  // Ctrl+Click (Windows) or Cmd+Click (Mac)
        e.preventDefault();
        e.stopPropagation();
        startMapRename();
    }
}

function startMapRename() {
    if (!window.currentMapId || !window.currentMapData) {
        showMessage('No map selected to rename', 'error');
        return;
    }

    const mapSelector = document.getElementById('mapSelector');
    const renameInput = document.getElementById('mapRenameInput');
    
    if (!mapSelector || !renameInput) return;

    // Hide selector, show input
    mapSelector.style.display = 'none';
    renameInput.style.display = 'block';
    renameInput.value = window.currentMapData.name;
    
    // Focus and select all text
    renameInput.focus();
    renameInput.select();
}

function handleMapRenameKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveMapRename();
    } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelMapRename();
    }
}

async function saveMapRename() {
    const renameInput = document.getElementById('mapRenameInput');
    const newName = renameInput.value.trim();
    
    if (!newName) {
        showMessage('Map name cannot be empty', 'error');
        return;
    }
    
    if (newName === window.currentMapData.name) {
        // No change, just cancel
        cancelMapRename();
        return;
    }

    try {
        // Call API to update map name
        await apiCall(`/api/maps/${window.currentMapId}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: newName,
                description: window.currentMapData.description
            })
        });

        // Update local data
        window.currentMapData.name = newName;
        
        // Reload maps to update dropdown
        await loadMaps();
        
        // Reselect current map
        document.getElementById('mapSelector').value = window.currentMapId;
        
        // Hide input, show selector
        cancelMapRename();
        
        showMessage(`Map renamed to "${newName}"`, 'success');
        
    } catch (error) {
        console.error('Error renaming map:', error);
        showMessage(error.message || 'Failed to rename map', 'error');
    }
}

function cancelMapRename() {
    const mapSelector = document.getElementById('mapSelector');
    const renameInput = document.getElementById('mapRenameInput');
    
    if (mapSelector && renameInput) {
        renameInput.style.display = 'none';
        mapSelector.style.display = 'block';
    }
}

// Make functions globally available
window.handleMapRenameKeydown = handleMapRenameKeydown;
window.cancelMapRename = cancelMapRename;
window.handleMapRenameClick = handleMapRenameClick;  // Add this line