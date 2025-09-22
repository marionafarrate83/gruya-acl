class PhotoCapture {
    constructor() {
        this.photos = {
            1: null,
            2: null
        };
        this.currentVisitorId = null;
        this.photoStream = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        
        document.getElementById('upload-photos').addEventListener('click', () => this.uploadPhotos());
        
        
        // Cuando se cierra el modal, limpiar fotos
        document.getElementById('photoModal').addEventListener('hidden.bs.modal', () => {
        this.clearPhotos();
        }
        );
    }

    async startCamera() {
        try {
            this.photoStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment' 
                } 
            });
            
            const video = document.getElementById('photo-video');
            video.srcObject = this.photoStream;
            video.style.display = 'block';
            await video.play();
            
        } catch (error) {
            console.error('Error iniciando cámara para fotos:', error);
            alert('No se pudo acceder a la cámara para fotos');
        }
    }

    stopCamera() {
        if (this.photoStream) {
            this.photoStream.getTracks().forEach(track => track.stop());
            this.photoStream = null;
        }
        
        const video = document.getElementById('photo-video');
        video.style.display = 'none';
    }

    takePhoto(photoNumber) {
        const video = document.getElementById('photo-video');
        const canvas = document.getElementById('photo-canvas');
        const ctx = canvas.getContext('2d');

        // Dibujar el frame actual en el canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convertir a data URL
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        this.photos[photoNumber] = photoData;
        
        // Mostrar preview
        this.showPhotoPreview(photoNumber, photoData);
        
        // Verificar si ambas fotos están tomadas
        this.checkPhotosReady();
    }

    showPhotoPreview(photoNumber, photoData) {
        const previewDiv = document.getElementById(`photo-preview-${photoNumber}`);
        previewDiv.innerHTML = `
            <img src="${photoData}" class="img-thumbnail" style="max-height: 100px;">
            <div class="mt-1">
                <small class="text-success">Foto ${photoNumber} tomada</small>
            </div>
        `;
    }

    checkPhotosReady() {
        const uploadButton = document.getElementById('upload-photos');
        const bothPhotosTaken = this.photos[1] && this.photos[2];
        uploadButton.disabled = !bothPhotosTaken;
    }

    clearPhotos() {
        this.photos = { 1: null, 2: null };
        this.stopCamera();
        
        // Limpiar previews
        [1, 2].forEach(num => {
            document.getElementById(`photo-preview-${num}`).innerHTML = 
                '<span class="text-muted">Foto ' + num + ' no tomada</span>';
        });
        
        document.getElementById('upload-photos').disabled = true;
    }

    async uploadPhotos() {
        if (!this.photos[1] || !this.photos[2] || !this.currentVisitorId) {
            alert('Debe tomar ambas fotos primero');
            return;
        }

        try {
            const uploadButton = document.getElementById('upload-photos');
            uploadButton.disabled = true;
            uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';

            // Convertir data URLs a Blobs
            const photoBlobs = await Promise.all([
                this.dataURLToBlob(this.photos[1]),
                this.dataURLToBlob(this.photos[2])
            ]);

            // Crear FormData
            const formData = new FormData();
            photoBlobs.forEach((blob, index) => {
                formData.append('photos', blob, `photo_${index + 1}.jpg`);
            });

            // Subir fotos
            const response = await fetch(`/visitors/api/${this.currentVisitorId}/upload-photos`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                alert('Fotos subidas correctamente');
                bootstrap.Modal.getInstance(document.getElementById('photoModal')).hide();
                
                // Actualizar estado en la interfaz
                this.updateVisitorPhotoStatus(this.currentVisitorId);
            } else {
                alert('Error subiendo fotos: ' + (result.error || 'Error desconocido'));
            }

        } catch (error) {
            console.error('Error subiendo fotos:', error);
            alert('Error subiendo fotos');
        } finally {
            const uploadButton = document.getElementById('upload-photos');
            uploadButton.disabled = false;
            uploadButton.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Subir Fotos';
        }
    }

    async dataURLToBlob(dataURL) {
        const response = await fetch(dataURL);
        return await response.blob();
    }

    updateVisitorPhotoStatus(visitorId) {
        // Buscar en la lista de visitantes y actualizar estado
        const rows = document.getElementById('visitors-list').getElementsByTagName('tr');
        for (let row of rows) {
            if (row.cells[0].textContent.includes(this.currentVisitorId)) {
                const statusCell = row.cells[4];
                statusCell.innerHTML = '<span class="badge bg-success">Visitado ✓</span>';
                break;
            }
        }
    }

    openPhotoModal(visitorId) {
        this.currentVisitorId = visitorId;
        this.startCamera().then(() => {
            new bootstrap.Modal(document.getElementById('photoModal')).show();
        });
    }
}

// Funciones globales para acceso desde HTML
function takePhoto(photoNumber) {
    window.photoCapture.takePhoto(photoNumber);
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.photoCapture = new PhotoCapture();
});