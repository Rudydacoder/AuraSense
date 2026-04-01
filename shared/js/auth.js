function enterPortal(type) {
    sessionStorage.setItem('portalType', type);
    localStorage.setItem('authToken', 'mock_auth_' + Date.now());
    
    if (type === 'patient') {
        window.location.href = 'patient/index.html';
    } else if (type === 'clinician') {
        window.location.href = 'clinician/index.html';
    }
}

function validateSession(expectedType) {
    const portalType = sessionStorage.getItem('portalType');
    const token = localStorage.getItem('authToken');
    
    if (portalType !== expectedType || !token) {
        window.location.href = '../index.html';
    }
}

function logout() {
    sessionStorage.removeItem('portalType');
    localStorage.removeItem('authToken');
    window.location.href = '../index.html';
}