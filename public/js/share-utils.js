class ShareUtils {
    static async shareVisit(visitorId, visitorName, visitId) {
        try {
            const shareData = {
                title: `Pase de Visita - ${visitorName}`,
                text: `Te comparto el pase de visita para el condominio. ID: ${visitId}\n\nPuedes descargar el PDF completo con toda la información.`,
                url: `${window.location.origin}/visitors/${visitorId}/pdf`
            };

            if (navigator.share) {
                await navigator.share(shareData);
                return true;
            } else {
                // Fallback para navegadores que no soportan Web Share API
                this.showShareOptions(visitorId, visitorName, visitId);
                return false;
            }
        } catch (error) {
            console.log('Error compartiendo:', error);
            this.showShareOptions(visitorId, visitorName, visitId);
            return false;
        }
    }

    static showShareOptions(visitorId, visitorName, visitId) {
        // Crear modal de opciones de compartir
        const modalHtml = `
            <div class="modal fade" id="shareModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Compartir Pase de Visita</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="d-grid gap-2">
                                <button class="btn btn-success" onclick="ShareUtils.shareWhatsApp('${visitorId}', '${visitorName}', '${visitId}')">
                                    <i class="fab fa-whatsapp"></i> WhatsApp
                                </button>
                                <button class="btn btn-primary" onclick="ShareUtils.shareEmail('${visitorId}', '${visitorName}', '${visitId}')">
                                    <i class="fas fa-envelope"></i> Email
                                </button>
                                <button class="btn btn-info" onclick="ShareUtils.downloadPDF('${visitorId}')">
                                    <i class="fas fa-download"></i> Descargar PDF
                                </button>
                                <button class="btn btn-secondary" onclick="ShareUtils.copyLink('${visitorId}')">
                                    <i class="fas fa-link"></i> Copiar Enlace
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Agregar modal al DOM si no existe
        if (!document.getElementById('shareModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        // Mostrar modal
        new bootstrap.Modal(document.getElementById('shareModal')).show();
    }

    static shareWhatsApp(visitorId, visitorName, visitId) {
        const message = `✅ Pase de Visita Aprobado\n\n` +
                       `👤 Visitante: ${visitorName}\n` +
                       `🆔 ID de Visita: ${visitId}\n` +
                       `📅 Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n` +
                       `📎 Descargar PDF: ${window.location.origin}/visitors/${visitorId}/pdf\n\n` +
                       `Presenta este código en la entrada del condominio.`;
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    static shareEmail(visitorId, visitorName, visitId) {
        const subject = `Pase de Visita - ${visitorName}`;
        const body = `Hola,\n\nTe comparto tu pase de visita para el condominio:\n\n` +
                    `Visitante: ${visitorName}\n` +
                    `ID de Visita: ${visitId}\n` +
                    `Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n` +
                    `Puedes descargar el PDF completo aquí: ${window.location.origin}/visitors/${visitorId}/pdf\n\n` +
                    `Por favor presenta este documento en la entrada.\n\nSaludos.`;
        
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoUrl;
    }

    static downloadPDF(visitorId) {
        window.location.href = `/visitors/${visitorId}/pdf`;
    }

    static async copyLink(visitorId) {
        const link = `${window.location.origin}/visitors/${visitorId}/pdf`;
        
        try {
            await navigator.clipboard.writeText(link);
            alert('✅ Enlace copiado al portapapeles');
        } catch (error) {
            // Fallback para navegadores más antiguos
            const tempInput = document.createElement('input');
            tempInput.value = link;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            alert('✅ Enlace copiado al portapapeles');
        }
    }

    static async printPDF(visitorId) {
        const pdfUrl = `/visitors/${visitorId}/view-pdf`;
        const printWindow = window.open(pdfUrl, '_blank');
        
        printWindow.onload = function() {
            printWindow.print();
        };
    }
}

// Funciones globales para uso en HTML
window.ShareUtils = ShareUtils;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Agregar evento a botones de compartir
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const visitorId = this.dataset.visitorId;
            const visitorName = this.dataset.visitorName;
            const visitId = this.dataset.visitId;
            
            ShareUtils.shareVisit(visitorId, visitorName, visitId);
        });
    });
});