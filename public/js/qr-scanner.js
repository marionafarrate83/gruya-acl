class QRScanner {
  constructor() {
    this.qrScanner = null;
    this.currentVisitorId = null;
    this.isScannerAvailable = typeof QrScanner !== "undefined";
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadTodayVisitors();
    this.checkScannerAvailability();
  }

  checkScannerAvailability() {
    if (!this.isScannerAvailable) {
      this.showError("El escáner QR no está disponible. Usa entrada manual.");
      document.getElementById("start-scan").disabled = true;
      document.getElementById("start-scan").innerHTML =
        '<i class="fas fa-ban"></i> Escáner No Disponible';
    }
  }

  bindEvents() {
    // Botones de control de cámara
    document
      .getElementById("start-scan")
      .addEventListener("click", () => this.startScan());
    document
      .getElementById("stop-scan")
      .addEventListener("click", () => this.stopScan());

    // Verificación manual
    document
      .getElementById("check-manual")
      .addEventListener("click", () => this.checkManualCode());
    document.getElementById("manual-code").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.checkManualCode();
    });

    // Modal
    const markButton = document.getElementById("mark-visited");
    if (markButton) {
      markButton.addEventListener("click", () => this.markAsVisited());
    }
  }

  async startScan() {
    if (!this.isScannerAvailable) {
      this.showError("El escáner QR no está disponible en este navegador");
      return;
    }

    try {
      this.showLoading("Iniciando cámara...");

      // Verificar permisos de cámara primero
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (error) {
        this.showError("Permiso de cámara denegado. Usa entrada manual.");
        return;
      }

      // Inicializar escáner directamente sin listar cámaras
      const video = document.getElementById("qr-video");
      this.qrScanner = new QrScanner(
        video,
        (result) => this.handleScanResult(result),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 2,
          returnDetailedScanResult: true,
        }
      );

      this.qrScanner.start();

      // Cambiar controles de UI
      document.getElementById("start-scan").style.display = "none";
      document.getElementById("stop-scan").style.display = "inline-block";
      this.hideAllResults();
      document.getElementById("no-result").style.display = "block";
    } catch (error) {
      console.error("Error iniciando escáner:", error);
      this.showError("Error al acceder a la cámara: " + error.message);
      this.fallbackToManual();
    }
  }

  fallbackToManual() {
    document.getElementById("start-scan").style.display = "none";
    document.getElementById("manual-input").style.display = "block";
    this.showError("Usa la entrada manual para verificar códigos");
  }

  stopScan() {
    if (this.qrScanner) {
      this.qrScanner.stop();
      this.qrScanner.destroy();
      this.qrScanner = null;
    }

    document.getElementById("start-scan").style.display = "inline-block";
    document.getElementById("stop-scan").style.display = "none";
  }

  async handleScanResult(result) {
    const visitId = result.data;
    console.log("Código escaneado:", visitId);

    this.hideAllResults();
    this.showLoading("Verificando código...");

    await this.verifyVisitId(visitId);
  }

  async checkManualCode() {
    const manualCode = document.getElementById("manual-code").value.trim();
    if (!manualCode) {
      this.showError("Por favor ingresa un código");
      return;
    }

    this.hideAllResults();
    this.showLoading("Verificando código...");

    await this.verifyVisitId(manualCode);
  }

  async verifyVisitId(visitId) {
    try {
      const response = await fetch("/visitors/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visitId }),
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      const data = await response.json();

      if (data.success) {
        this.showValidResult(data.visitor);
        this.currentVisitorId = visitId;
      } else {
        this.showError(data.message || "Código inválido");
      }
    } catch (error) {
      console.error("Error verificando código:", error);
      this.showError("Error de conexión con el servidor");
    }
  }

  showValidResult(visitor) {
    this.hideAllResults();

    const detailsDiv = document.getElementById("visitor-details");
    detailsDiv.innerHTML = `
        <p><strong>ID:</strong> <code>${visitor.visitId}</code></p>
        <p><strong>Nombre:</strong> ${visitor.visitorName}</p>
        <p><strong>Residencia:</strong> ${
          visitor.residentId.residenceNumber
        }</p>
        <p><strong>Hora:</strong> ${visitor.visitTime}</p>
        <p><strong>Motivo:</strong> ${visitor.visitReason}</p>
        <div class="d-grid gap-2 mt-3">
            <button class="btn btn-info btn-sm" onclick="window.qrScanner.showVisitorDetails('${
              visitor._id
            }')">
                <i class="fas fa-info-circle"></i> Ver Detalles
            </button>
            ${
              !visitor.photosUploaded
                ? `
            <button class="btn btn-warning btn-sm" onclick="window.qrScanner.openPhotoCapture('${visitor._id}')">
                <i class="fas fa-camera"></i> Tomar Fotos
            </button>
            `
                : `
            <button class="btn btn-success btn-sm" onclick="window.qrScanner.viewPhotos('${visitor._id}')">
                <i class="fas fa-images"></i> Ver Fotos
            </button>
            `
            }
        </div>
    `;

    document.getElementById("valid-result").style.display = "block";
    this.updateVisitorStatus(visitor.visitId, "valid");
  }

  // Agregar estos métodos a la clase QRScanner
  openPhotoCapture(visitorId) {
    window.photoCapture.openPhotoModal(visitorId);
  }

  async viewPhotos(visitorId) {
    try {
      const response = await fetch(`/visitors/api/${visitorId}/photos`);
      const data = await response.json();

      if (data.photos && data.photos.length > 0) {
        let photosHTML = '<div class="row">';
        data.photos.forEach((photo) => {
          photosHTML += `
                    <div class="col-md-6 mb-3">
                        <img src="${
                          photo.url
                        }" class="img-fluid rounded" alt="Foto del visitante">
                        <div class="mt-1 text-center">
                            <small>${new Date(photo.uploadedAt).toLocaleString(
                              "es-ES"
                            )}</small>
                        </div>
                    </div>
                `;
        });
        photosHTML += "</div>";

        alertify.alert("Fotos del Visitante", photosHTML);
      } else {
        alert("No hay fotos disponibles para este visitante");
      }
    } catch (error) {
      console.error("Error viendo fotos:", error);
      alert("Error al cargar las fotos");
    }
  }

  showError(message) {
    this.hideAllResults();
    document.getElementById("error-message").textContent = message;
    document.getElementById("invalid-result").style.display = "block";
  }

  showLoading(message) {
    this.hideAllResults();
    const loadingElement = document.getElementById("loading");
    loadingElement.style.display = "block";
    loadingElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
  }

  hideAllResults() {
    ["no-result", "valid-result", "invalid-result", "loading"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.style.display = "none";
    });
  }

  async showVisitorDetails(visitorId) {
    try {
      const response = await fetch(`/visitors/api/${visitorId}`);
      if (!response.ok) throw new Error("Error en la respuesta");

      const visitor = await response.json();

      const modalDetails = document.getElementById("modal-visitor-details");
      modalDetails.innerHTML = `
                <div class="row">
                    <div class="col-6">
                        <p><strong>ID Visita:</strong><br><code>${
                          visitor.visitId
                        }</code></p>
                        <p><strong>Nombre:</strong><br>${
                          visitor.visitorName
                        }</p>
                        <p><strong>Teléfono:</strong><br>${
                          visitor.visitorPhone
                        }</p>
                    </div>
                    <div class="col-6">
                        <p><strong>Residencia:</strong><br>${
                          visitor.residentId.residenceNumber
                        }</p>
                        <p><strong>Fecha:</strong><br>${new Date(
                          visitor.visitDate
                        ).toLocaleDateString("es-ES")}</p>
                        <p><strong>Hora:</strong><br>${visitor.visitTime}</p>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-12">
                        <p><strong>Motivo:</strong><br>${
                          visitor.visitReason
                        }</p>
                    </div>
                </div>
                ${
                  visitor.visitedAt
                    ? `
                <div class="alert alert-success mt-3">
                    <i class="fas fa-check"></i> Visitó el: ${new Date(
                      visitor.visitedAt
                    ).toLocaleString("es-ES")}
                </div>
                `
                    : ""
                }
            `;

      const markButton = document.getElementById("mark-visited");
      if (visitor.visitedAt) {
        markButton.style.display = "none";
      } else {
        markButton.style.display = "block";
        markButton.dataset.visitorId = visitorId;
      }

      new bootstrap.Modal(document.getElementById("visitorModal")).show();
    } catch (error) {
      console.error("Error cargando detalles:", error);
      alert("Error al cargar detalles del visitante");
    }
  }

  async markAsVisited() {
    const visitorId = document.getElementById("mark-visited").dataset.visitorId;
    if (!visitorId) return;

    try {
      const response = await fetch(`/visitors/api/${visitorId}/visit`, {
        method: "POST",
      });

      if (response.ok) {
        alert("Visitante marcado como visitado correctamente");
        bootstrap.Modal.getInstance(
          document.getElementById("visitorModal")
        ).hide();
        this.loadTodayVisitors();
      } else {
        alert("Error al marcar como visitado");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    }
  }

  async loadTodayVisitors() {
    try {
      const response = await fetch("/visitors/api/today");
      if (!response.ok) throw new Error("Error cargando visitantes");

      const visitors = await response.json();

      const tbody = document.getElementById("visitors-list");
      tbody.innerHTML = visitors
        .map(
          (visitor) => `
                <tr class="${visitor.visitedAt ? "table-success" : ""}">
                    <td><code>${visitor.visitId}</code></td>
                    <td>${visitor.visitorName}</td>
                    <td>${visitor.residentId.residenceNumber}</td>
                    <td>${visitor.visitTime}</td>
                    <td>
                        ${
                          visitor.visitedAt
                            ? `<span class="badge bg-success">Visitado</span>`
                            : `<span class="badge bg-warning">Pendiente</span>`
                        }
                    </td>
                </tr>
            `
        )
        .join("");
    } catch (error) {
      console.error("Error cargando visitantes:", error);
    }
  }

  updateVisitorStatus(visitId, status) {
    const rows = document
      .getElementById("visitors-list")
      .getElementsByTagName("tr");
    for (let row of rows) {
      if (row.cells[0].textContent.includes(visitId)) {
        if (status === "valid") {
          row.classList.add("table-info");
        }
        break;
      }
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  window.qrScanner = new QRScanner();
  //console.log("primero entra aqui");
});
