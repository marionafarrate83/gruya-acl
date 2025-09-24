class AdminDashboard {
    constructor(chartData) {
        this.chartData = chartData;
        this.charts = {};
        this.currentTimeRange = 30;
        this.init();
    }

    init() {
        this.renderCharts();
        this.bindEvents();
    }

    bindEvents() {
        // Redimensionar gráficas cuando cambie el tamaño de la ventana
        window.addEventListener('resize', () => {
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        });

        // Exportar gráficas
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('export-chart')) {
                const chartId = e.target.dataset.chart;
                const filename = e.target.dataset.filename;
                this.exportChart(chartId, filename);
            }
        });
    }

    renderCharts() {
        this.renderVisitsChart();
        this.renderResidencesChart();
        this.renderMonthlyChart();
        this.renderUsersChart();
    }

    renderVisitsChart() {
        const ctx = document.getElementById('visitsChart');
        if (!ctx) return;

        const labels = this.chartData.visitorsByDay.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        });
        
        const totalData = this.chartData.visitorsByDay.map(d => d.total);
        const visitedData = this.chartData.visitorsByDay.map(d => d.visited);

        this.charts.visits = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Visitas',
                        data: totalData,
                        borderColor: chartColors.primary,
                        backgroundColor: chartColors.primary.replace('0.8', '0.1'),
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2
                    },
                    {
                        label: 'Visitas Completadas',
                        data: visitedData,
                        borderColor: chartColors.success,
                        backgroundColor: chartColors.success.replace('0.8', '0.1'),
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#ffffff',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#ffffff',
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#ffffff'
                        },
                        beginAtZero: true
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'nearest'
                }
            }
        });
    }

    renderResidencesChart() {
        const ctx = document.getElementById('residencesChart');
        if (!ctx) return;
        
        const residences = this.chartData.visitorsByResidence.map(r => r.residence);
        const totalData = this.chartData.visitorsByResidence.map(r => r.total);

        this.charts.residences = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: residences,
                datasets: [{
                    data: totalData,
                    backgroundColor: [
                        chartColors.primary,
                        chartColors.success,
                        chartColors.info,
                        chartColors.warning,
                        chartColors.danger,
                        chartColors.secondary,
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0'
                    ],
                    borderColor: '#2c3e50',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const residence = this.chartData.visitorsByResidence[context.dataIndex];
                                return `${residence.residence}: ${residence.total} visitas (${residence.visited} completadas)`;
                            }
                        }
                    }
                },
                cutout: '50%'
            }
        });
    }

    renderMonthlyChart() {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;
        
        const months = this.chartData.monthlyStats.map(m => m.period);
        const totalData = this.chartData.monthlyStats.map(m => m.total);
        const visitedData = this.chartData.monthlyStats.map(m => m.visited);

        this.charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Total Visitas',
                        data: totalData,
                        backgroundColor: chartColors.primary,
                        borderColor: borderColors.primary,
                        borderWidth: 1
                    },
                    {
                        label: 'Visitas Completadas',
                        data: visitedData,
                        backgroundColor: chartColors.success,
                        borderColor: borderColors.success,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#ffffff'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff',
                            maxRotation: 45
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    renderUsersChart() {
        const ctx = document.getElementById('usersChart');
        if (!ctx) return;
        
        const roles = this.chartData.usersByRole.map(u => {
            // Traducir roles al español
            const roleMap = {
                'residente': 'Residentes',
                'guardia': 'Guardias',
                'administrador': 'Administradores'
            };
            return roleMap[u.role] || u.role;
        });
        
        const counts = this.chartData.usersByRole.map(u => u.count);

        this.charts.users = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: roles,
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        chartColors.success,  // Residentes
                        chartColors.primary,  // Guardias
                        chartColors.info      // Administradores
                    ],
                    borderColor: '#2c3e50',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#ffffff',
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = counts.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    async changeTimeRange(days) {
        this.currentTimeRange = days;
        
        try {
            const response = await fetch(`/stats/api/visitors-by-day?days=${days}`);
            const data = await response.json();
            
            if (data.success) {
                this.updateVisitsChart(data.data);
            }
        } catch (error) {
            console.error('Error cambiando rango de tiempo:', error);
            this.showError('Error al cargar datos actualizados');
        }
    }

    updateVisitsChart(newData) {
        if (!this.charts.visits) return;

        const labels = newData.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        });
        
        const totalData = newData.map(d => d.total);
        const visitedData = newData.map(d => d.visited);

        this.charts.visits.data.labels = labels;
        this.charts.visits.data.datasets[0].data = totalData;
        this.charts.visits.data.datasets[1].data = visitedData;
        this.charts.visits.update('none'); // 'none' para animación suave
    }

    exportChart(chartId, filename) {
        const chart = this.charts[chartId];
        if (chart) {
            const link = document.createElement('a');
            link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
            link.href = chart.toBase64Image();
            link.click();
        }
    }

    showError(message) {
        // Crear notificación de error
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        alert.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
        `;
        alert.innerHTML = `
            <strong>Error:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }

    destroy() {
        // Limpiar todas las gráficas
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}

// Funciones globales
function changeTimeRange(days) {
    if (window.adminDashboard) {
        window.adminDashboard.changeTimeRange(days);
    }
}

function exportChart(chartId, filename) {
    if (window.adminDashboard) {
        window.adminDashboard.exportChart(chartId, filename);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar que los datos están disponibles
    if (typeof chartData !== 'undefined') {
        window.adminDashboard = new AdminDashboard(chartData);
    } else {
        console.error('chartData no está definido');
        
        // Mostrar mensaje de error al usuario
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.innerHTML = `
            <h4>Error al cargar el dashboard</h4>
            <p>No se pudieron cargar los datos estadísticos. Por favor, recarga la página.</p>
        `;
        
        const container = document.querySelector('.container-fluid');
        if (container) {
            container.insertBefore(errorDiv, container.firstChild);
        }
    }
});

// Limpiar al salir de la página
window.addEventListener('beforeunload', () => {
    if (window.adminDashboard) {
        window.adminDashboard.destroy();
    }
});