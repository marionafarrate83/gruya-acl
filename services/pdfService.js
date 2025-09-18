const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

class PDFService {
    static async generateVisitPDF(visitor, resident) {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margin: 50,
                    size: 'A4',
                    layout: 'portrait'
                });

                const fileName = `visita_${visitor.visitId}_${Date.now()}.pdf`;
                const filePath = path.join(__dirname, '../tmp', fileName);
                
                // Crear directorio temp si no existe
                if (!fs.existsSync(path.dirname(filePath))) {
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                }

                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);

                // Generar código QR
                const qrCodeData = await QRCode.toDataURL(visitor.visitId);

                // Encabezado
                this.addHeader(doc, visitor);

                // Información de la visita
                this.addVisitInfo(doc, visitor, resident);

                // Código QR
                await this.addQRCode(doc, qrCodeData);

                // Términos y condiciones
                this.addTermsAndConditions(doc);

                // Pie de página
                this.addFooter(doc);

                doc.end();

                stream.on('finish', () => {
                    resolve({
                        fileName: fileName,
                        filePath: filePath,
                        publicUrl: `/tmp/${fileName}`
                    });
                });

                stream.on('error', (error) => {
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    static addHeader(doc, visitor) {
        // Logo (puedes agregar un logo real más tarde)
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#2c3e50')
           .text('CONTROL DE ACCESO', 50, 50, { align: 'center' });
        
        doc.fontSize(16)
           .fillColor('#7f8c8d')
           .text('Sistema de Gestión de Visitantes', 50, 75, { align: 'center' });

        // Línea separadora
        doc.moveTo(50, 100)
           .lineTo(550, 100)
           .strokeColor('#bdc3c7')
           .stroke();

        doc.moveDown(2);
    }

    static addVisitInfo(doc, visitor, resident) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#2c3e50')
           .text('INFORMACIÓN DE LA VISITA', 50, 120);

        const infoY = 150;
        const column1 = 50;
        const column2 = 250;

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#34495e');

        // Columna 1
        doc.text('ID de Visita:', column1, infoY)
           .font('Helvetica-Bold')
           .text(visitor.visitId, column1, infoY + 15);

        doc.font('Helvetica')
           .text('Nombre del Visitante:', column1, infoY + 40)
           .font('Helvetica-Bold')
           .text(visitor.visitorName, column1, infoY + 55);

        doc.font('Helvetica')
           .text('Teléfono:', column1, infoY + 80)
           .font('Helvetica-Bold')
           .text(visitor.visitorPhone, column1, infoY + 95);

        // Columna 2
        doc.font('Helvetica')
           .text('Residencia:', column2, infoY)
           .font('Helvetica-Bold')
           .text(resident.residenceNumber, column2, infoY + 15);

        doc.font('Helvetica')
           .text('Fecha de Visita:', column2, infoY + 40)
           .font('Helvetica-Bold')
           .text(visitor.visitDate.toLocaleDateString('es-ES'), column2, infoY + 55);

        doc.font('Helvetica')
           .text('Hora:', column2, infoY + 80)
           .font('Helvetica-Bold')
           .text(visitor.visitTime, column2, infoY + 95);

        // Motivo de la visita
        doc.font('Helvetica')
           .text('Motivo de la Visita:', 50, infoY + 120)
           .font('Helvetica-Bold')
           .text(visitor.visitReason, 50, infoY + 135, {
               width: 500,
               align: 'left'
           });

        doc.moveDown(4);
    }

    static async addQRCode(doc, qrCodeData) {
        const qrY = 300;
        
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#2c3e50')
           .text('CÓDIGO QR DE ACCESO', 50, qrY, { align: 'center' });

        // Convertir data URL a buffer
        const base64Data = qrCodeData.replace(/^data:image\/png;base64,/, "");
        const qrBuffer = Buffer.from(base64Data, 'base64');

        // Agregar imagen QR
        doc.image(qrBuffer, 225, qrY + 20, { 
            width: 150, 
            height: 150,
            align: 'center'
        });

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#7f8c8d')
           .text('Presente este código QR en la entrada del condominio', 50, qrY + 190, {
               align: 'center'
           });

        doc.moveDown(6);
    }

    static addTermsAndConditions(doc) {
        const termsY = 500;

        doc.fontSize(8)
           .font('Helvetica-Oblique')
           .fillColor('#95a5a6')
           .text('TÉRMINOS Y CONDICIONES:', 50, termsY);

        doc.font('Helvetica')
           .text('• Este pase es válido únicamente para la fecha y hora indicadas.', 50, termsY + 15, {
               width: 500,
               continued: true
           })
           .text('• Debe presentar identificación oficial al ingresar.', 50, termsY + 30, {
               width: 500,
               continued: true
           })
           .text('• El visitante debe acatar las normas del condominio.', 50, termsY + 45, {
               width: 500,
               continued: true
           })
           .text('• Este documento es generado automáticamente y no requiere firma.', 50, termsY + 60, {
               width: 500
           });
    }

    static addFooter(doc) {
        const footerY = 700;

        doc.moveTo(50, footerY)
           .lineTo(550, footerY)
           .strokeColor('#bdc3c7')
           .stroke();

        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#7f8c8d')
           .text(`Generado el: ${new Date().toLocaleString('es-ES')}`, 50, footerY + 10)
           .text('Sistema de Control de Acceso - Condominio Seguro', 50, footerY + 25, {
               align: 'left'
           })
           .text('Página 1 de 1', 50, footerY + 25, {
               align: 'right'
           });
    }

    static cleanupOldFiles() {
        const tempDir = path.join(__dirname, '../tmp');
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            const now = Date.now();
            const oneHour = 60 * 60 * 1000;

            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtimeMs > oneHour) {
                    fs.unlinkSync(filePath);
                }
            });
        }
    }
}

module.exports = PDFService;