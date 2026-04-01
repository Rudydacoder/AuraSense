const fs = require('fs');

function processHtml(filePath, portalType) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes('auth.js')) {
        const insertion = `\n    <link rel="stylesheet" href="../shared/css/variables.css">\n    <script src="../shared/js/auth.js"></script>\n    <script>validateSession('${portalType}');</script>\n`;
        content = content.replace('</head>', insertion + '</head>');
    }

    if (filePath.includes('patient/index.html')) {
        content = content.replace(/window\.location\.href\s*=\s*['"]patient_app\.html['"]/g, 'window.location.href = "patient_app.html"');
    } 
    else if (filePath.includes('clinician/index.html')) {
        content = content.replace(/href="clinical_dashboard\.html"/g, 'href="clinical_dashboard.html"');
        content = content.replace(/href="index\.html"/g, 'href="#" onclick="logout(); return false;"');
        content = content.replace(/class="btn-logout"/g, 'class="btn-logout" onclick="logout(); return false;"');
        content = content.replace(/window\.location\.href\s*=\s*['"]clinician_portal\.html['"]/g, 'window.location.href = "index.html"');
        content = content.replace(/clinician_portal\.html"/g, 'index.html"');
    }
    else if (filePath.includes('clinician/clinical_dashboard.html')) {
        content = content.replace(/href="clinician_portal\.html"/g, 'href="__TEMP__"');
        content = content.replace(/href="index\.html"/g, 'href="#" onclick="logout(); return false;"');
        content = content.replace(/__TEMP__/g, 'index.html');
    }

    fs.writeFileSync(filePath, content);
}

processHtml('patient/index.html', 'patient');
processHtml('patient/patient_app.html', 'patient');
processHtml('clinician/index.html', 'clinician');
processHtml('clinician/clinical_dashboard.html', 'clinician');