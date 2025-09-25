class AdminVisitors {
    constructor() {
        this.currentFilters = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialFilters();
    }

    bindEvents() {
        // Enter en inputs ejecuta búsqueda
        document.getElementById('search-term').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.applyFilters();
        });
ƒ
        // Limpiar filtros
        document.getElementById('clear-filters').addEventListener('click', () => this.clearFilters());
    }

    loadInitialFilters() {
        const urlParams = new URLSearchParams(window.location.search);
        ['search-term', 'date-from', 'date-to', 'visit-status', 'photos-status'].forEach(param => {
            const value = urlParams.get(param);
            if (value) {
                document.getElementById(param).value = value;
                this.currentFilters[param] = value;
            }
        });
    }

    applyFilters() {
        const filters = {
            'search-term': document.getElementById('search-term').value,
            'date-from': document.getElementById('date-from').value,
            'date-to': document.getElementById('date-to').value,
            'visit-status': document.getElementById('visit-status').value,
            'photos-status': document.getElementById('photos-status').value
        };

        // Construir query string
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) queryParams.set(key, value);
        });

        // Mantener página actual si existe
        const currentPage = new URLSearchParams(window.location.search).get('page');
        if (currentPage) {
            queryParams.set('page', currentPage);
        }

        window.location.search = queryParams.toString();
    }

    clearFilters() {
        document.getElementById('search-term').value = '';
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        document.getElementById('visit-status').value = '';
        document.getElementById('photos-status').value = '';
        
        window.location.search = '';
    }

    async viewPhotos(visitorId) {
        try {
            const response = await fetch(`/visitors/api/${visitorId}/photos`);
            const data = await response.json();

            const photosContainer = document.getElementById('photos-container');
            photosContainer.innerHTML = '';

            if (data.photos && data.photos.length > 0) {
                data.photos.forEach(photo => {
                    photosContainer.innerHTML += `
                        <div class="col-md-6 col-lg-4 mb-3">
                            <div class="card">
                                <img src="${photo.url}" class="card-img-top" 
                                     style="height: 200px; object-fit: cover;" 
                                     alt="Foto del visitante">
                                <div class="card-body">
                                    <p class="card-text">
                                        <small class="text-muted">
                                            Subido: ${new Date(photo.uploadedAt).toLocaleString('es-ES')}
                                        </small>
                                    </p>
                                    <a href="${photo.url}" target="_blank" class="btn btn-sm btn-outline-primary">
                                        <i class="fas fa-external-link-alt"></i> Ver original
                                    </a>
                                </div>
                            </div>
                        </div>
                    `;
                });
            } else {
                photosContainer.innerHTML = `
                    <div class="col-12 text-center py-4">
                        <i class="fas fa-camera-slash fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No hay fotos disponibles para este visitante</p>
                    </div>
                `;
            }

            new bootstrap.Modal(document.getElementById('photosModal')).show();
        } catch (error) {
            console.error('Error cargando fotos:', error);
            alert('Error al cargar las fotos');
        }
    }

    async viewDetails(visitorId) {
        try {
            const response = await fetch(`/visitors/api/${visitorId}/admin`);
            const visitor = await response.json();

            const detailsContainer = document.getElementById('details-container');
            detailsContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Información del Visitante</h6>
                        <table class="table table-sm">
                            <tr><th>ID Visita:</th><td><code>${visitor.visitId}</code></td></tr>
                            <tr><th>Nombre:</th><td>${visitor.visitorName}</td></tr>
                            <tr><th>Teléfono:</th><td>${visitor.visitorPhone}</td></tr>
                            <tr><th>Fecha:</th><td>${new Date(visitor.visitDate).toLocaleDateString('es-ES')}</td></tr>
                            <tr><th>Hora:</th><td>${visitor.visitTime}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6>Información del Residente</h6>
                        <table class="table table-sm">
                            <tr><th>Residencia:</th><td>${visitor.residentId.residenceNumber}</td></tr>
                            <tr><th>Email:</th><td>${visitor.residentId.email}</td></tr>
                            <tr><th>Teléfono:</th><td>${visitor.residentId.phone}</td></tr>
                        </table>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Motivo de la Visita</h6>
                        <div class="alert alert-light">${visitor.visitReason}</div>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-6">
                        <h6>Estado</h6>
                        ${visitor.visitedAt ? 
                            `<span class="badge bg-success">Visitado el: ${new Date(visitor.visitedAt).toLocaleString('es-ES')}</span>` : 
                            `<span class="badge bg-warning">Pendiente de visita</span>`
                        }
                    </div>
                    <div class="col-md-6">
                        <h6>Fotos</h6>
                        ${visitor.photosUploaded ? 
                            `<span class="badge bg-info">${visitor.photos.length} fotos subidas</span>` : 
                            `<span class="badge bg-secondary">Sin fotos</span>`
                        }
                    </div>
                </div>
            `;

            new bootstrap.Modal(document.getElementById('detailsModal')).show();
        } catch (error) {
            console.error('Error cargando detalles:', error);
            alert('Error al cargar los detalles');
        }
    }

    async deleteVisit(visitorId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta visita? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const response = await fetch(`/visitors/api/${visitorId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('Visita eliminada correctamente');
                location.reload();
            } else {
                alert('Error al eliminar la visita');
            }
        } catch (error) {
            console.error('Error eliminando visita:', error);
            alert('Error al eliminar la visita');
        }
    }

    togglePhotoPreviews() {
        const showPhotos = document.getElementById('show-photos').checked;
        const thumbnails = document.querySelectorAll('.photo-thumbnails');
        
        thumbnails.forEach(thumbnail => {
            thumbnail.style.display = showPhotos ? 'block' : 'none';
        });
    }
}

// Funciones globales
function applyFilters() {
    window.adminVisitors.applyFilters();
}

function clearFilters() {
    window.adminVisitors.clearFilters();
}

function viewPhotos(visitorId) {
    window.adminVisitors.viewPhotos(visitorId);
}

function viewDetails(visitorId) {
    window.adminVisitors.viewDetails(visitorId);
}

function deleteVisit(visitorId) {
    window.adminVisitors.deleteVisit(visitorId);
}

function togglePhotoPreviews() {
    window.adminVisitors.togglePhotoPreviews();
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.adminVisitors = new AdminVisitors();
});