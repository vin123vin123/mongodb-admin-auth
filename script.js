const form = document.getElementById('dataForm');
const container = document.getElementById('dataContainer');
const adminName = document.getElementById('adminName');

async function verifySession() {
    const res = await fetch('/api/user');
    const status = await res.json();
    
    if (!status.loggedIn) {
        window.location.href = '/';
    } else {
        adminName.textContent = status.user;
        fetchAndRenderData();
    }
}

async function fetchAndRenderData() {
    const res = await fetch('/api/data');
    if(res.status === 401) return window.location.href = '/';
    
    const collectionData = await res.json();
    container.innerHTML = '';
    
    if(collectionData.length === 0) {
        container.innerHTML = `<li class="py-8 text-center text-sm text-gray-400 font-medium">No documents found within targets.</li>`;
        return;
    }

    collectionData.forEach(documentObj => {
        const itemRow = document.createElement('li');
        itemRow.className = 'py-4 flex justify-between items-center transition hover:bg-gray-50/50 px-2 rounded-lg';
        itemRow.innerHTML = `
            <div class="flex flex-col">
                <span class="font-semibold text-gray-800 text-sm">${documentObj.name || 'Undefined field name'}</span>
                <span class="text-xs text-gray-400 font-mono mt-0.5">${documentObj.role || 'Unassigned designation'}</span>
            </div>
            <button onclick="commitDeletion('${documentObj._id}')" class="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 py-1.5 px-3 rounded-md transition border border-red-200">
                Purge Element
            </button>
        `;
        container.appendChild(itemRow);
    });
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('nameInput').value;
    const role = document.getElementById('roleInput').value;

    await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role })
    });

    form.reset();
    fetchAndRenderData();
});

window.commitDeletion = async function(documentId) {
    if (confirm('Verify destructive operation execution request over target?')) {
        await fetch(`/api/data/${documentId}`, { method: 'DELETE' });
        fetchAndRenderData();
    }
}

verifySession();
