// Función para generar QR
function generateQR(visitId) {
    const qrElement = document.getElementById('qrcode');
    qrElement.innerHTML = '';
    
    // Usar una librería como qrcode.js para generar el QR
    new QRCode(qrElement, {
        text: visitId,
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

// Función para compartir por WhatsApp
function shareWhatsApp(visitId, visitorName) {
    const text = `Hola, tu código de acceso para visitar el condominio es: ${visitId}. Por favor preséntalo en la entrada. - ${visitorName}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}


// Inicializar tooltips de Bootstrap
document.addEventListener('DOMContentLoaded', function() {
    // Tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Confirmación para acciones importantes
    const deleteButtons = document.querySelectorAll('.btn-delete');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (!confirm('¿Estás seguro de que quieres eliminar este registro?')) {
                e.preventDefault();
            }
        });
    });
});

// Función para copiar al portapapeles
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        alert('ID de visita copiado al portapapeles: ' + text);
    }).catch(function(err) {
        console.error('Error al copiar: ', err);
    });
}