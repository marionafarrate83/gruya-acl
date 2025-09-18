class PDFUtils {
    // Descargar PDF desde base64
    static downloadPDFFromBase64(base64Data, filename) {
        try {
            // Crear link de descarga
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${base64Data}`;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            return true;
        } catch (error) {
            console.error('Error descargando PDF:', error);
            return false;
        }
    }

    // Abrir PDF en nueva pestaña
    static openPDFInNewTab(base64Data) {
        try {
            const pdfWindow = window.open('', '_blank');
            pdfWindow.document.write(`
                <html>
                <head>
                    <title>Pase de Visita</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
                        iframe { border: none; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                    </style>
                </head>
                <body>
                    <iframe src="data:application/pdf;base64,${base64Data}" width="100%" height="100%"></iframe>
                </body>
                </html>
            `);
            pdfWindow.document.close();
            return true;
        } catch (error) {
            console.error('Error abriendo PDF:', error);
            return false;
        }
    }

    // Compartir PDF usando Web Share API
    static async sharePDF(base64Data, filename, title = 'Pase de Visita') {
        try {
            // Convertir base64 a blob
            const response = await fetch(`data:application/pdf;base64,${base64Data}`);
            const blob = await response.blob();
            const file = new File([blob], filename, { type: 'application/pdf' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: title,
                    text: 'Compartiendo pase de visita',
                    files: [file]
                });
                return true;
            } else {
                // Fallback a descarga
                return this.downloadPDFFromBase64(base64Data, filename);
            }
        } catch (error) {
            console.error('Error compartiendo PDF:', error);
            return this.downloadPDFFromBase64(base64Data, filename);
        }
    }

    // Obtener PDF del servidor
    static async getPDFData(visitorId) {
        try {
            const response = await fetch(`/visitors/api/${visitorId}/pdf-data`);
            const data = await response.json();
            
            if (data.success) {
                return data;
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error obteniendo PDF:', error);
            throw error;
        }
    }

    // Función principal para manejar PDF
    static async handleVisitPDF(visitorId, action = 'download') {
        try {
            const loadingElement = this.showLoading('Generando PDF...');
            
            const pdfData = await this.getPDFData(visitorId);
            
            this.hideLoading(loadingElement);
            
            switch (action) {
                case 'download':
                    return this.downloadPDFFromBase64(pdfData.data, pdfData.filename);
                
                case 'view':
                    return this.openPDFInNewTab(pdfData.data);
                
                case 'share':
                    return await this.sharePDF(pdfData.data, pdfData.filename);
                
                default:
                    return this.downloadPDFFromBase64(pdfData.data, pdfData.filename);
            }
        } catch (error) {
            this.hideLoading();
            alert('Error: ' + error.message);
            return false;
        }
    }

    // Utilidades de UI
    static showLoading(message = 'Cargando...') {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2">${message}</p>
            </div>
        `;
        
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        document.body.appendChild(loadingDiv);
        return loadingDiv;
    }

    static hideLoading(loadingElement = null) {
        if (loadingElement) {
            loadingElement.remove();
        } else {
            const existingLoading = document.querySelector('.loading-overlay');
            if (existingLoading) {
                existingLoading.remove();
            }
        }
    }
}

// Funciones globales para uso fácil
window.downloadVisitPDF = async (visitorId) => {
    return await PDFUtils.handleVisitPDF(visitorId, 'download');
};

window.viewVisitPDF = async (visitorId) => {
    return await PDFUtils.handleVisitPDF(visitorId, 'view');
};

window.shareVisitPDF = async (visitorId) => {
    return await PDFUtils.handleVisitPDF(visitorId, 'share');
};

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    console.log('PDF Utils cargado correctamente');
});