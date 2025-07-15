// Variáveis globais
let map;
let radiationChart;
let currentData = {};
let historicalData = [];
let updateInterval;

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Configurações iniciais
    document.getElementById('current-year').textContent = new Date().getFullYear();
    setupNavigation();
    initMap();
    initChart();
    loadCurrentData();
    
    // Atualiza a cada 10 segundos
    updateInterval = setInterval(loadCurrentData, 10000);
});

// Configura navegação entre seções
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Ativa o link clicado
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');
            
            // Mostra a seção correspondente
            const sectionId = this.getAttribute('data-section');
            document.querySelectorAll('section').forEach(section => {
                section.classList.add('hidden');
            });
            document.getElementById(sectionId).classList.remove('hidden');
            
            // Carrega dados históricos se necessário
            if (sectionId === 'historical') {
                loadHistoricalData();
            }
        });
    });
}

// Inicializa o mapa
function initMap() {
    map = L.map('map').setView([-25.9667, 32.5833], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Marcador padrão
    marker = L.marker([-25.9667, 32.5833]).addTo(map)
        .bindPopup('Localização atual do sensor');
}

// Inicializa o gráfico
function initChart() {
    const ctx = document.getElementById('radiation-chart').getContext('2d');
    radiationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'µSv/h',
                data: [],
                borderColor: '#e53e3e',
                backgroundColor: 'rgba(229, 62, 62, 0.1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'µSv/h' }
                },
                x: {
                    title: { display: true, text: 'Data/Hora' }
                }
            }
        }
    });
}

// Carrega dados atuais do Firestore
async function loadCurrentData() {
    try {
        const doc = await db.collection('currentData').doc('current').get();
        if (doc.exists) {
            currentData = doc.data();
            updateCurrentDataDisplay();
        }
    } catch (error) {
        console.error('Erro ao carregar dados atuais:', error);
    }
}

// Atualiza a exibição dos dados atuais
function updateCurrentDataDisplay() {
    if (currentData.datetime) {
        const dateTime = new Date(currentData.datetime);
        document.getElementById('current-date').textContent = 
            dateTime.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        document.getElementById('current-time').textContent = 
            dateTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    if (currentData.latitude && currentData.longitude) {
        document.getElementById('latitude').textContent = parseFloat(currentData.latitude).toFixed(6);
        document.getElementById('longitude').textContent = parseFloat(currentData.longitude).toFixed(6);
        updateMap(parseFloat(currentData.latitude), parseFloat(currentData.longitude));
    }
    
    if (currentData.cpm) {
        document.getElementById('cpm-value').textContent = currentData.cpm;
    }
    
    if (currentData.usv) {
        const usvValue = parseFloat(currentData.usv);
        document.getElementById('usv-value').textContent = usvValue.toFixed(4);
        
        // Atualiza o medidor
        const needle = document.getElementById('gauge-needle');
        const maxUsv = 5;
        let angle = (usvValue / maxUsv) * 180;
        angle = Math.max(0, Math.min(180, angle));
        needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
        
        // Atualiza status
        const statusBadge = document.getElementById('radiation-status');
        statusBadge.textContent = currentData.radiation_level || 'Normal';
        statusBadge.className = 'status-badge';
        
        if (currentData.radiation_level) {
            const level = currentData.radiation_level.toLowerCase();
            if (level.includes('alto')) {
                statusBadge.classList.add('status-high');
            } else if (level.includes('elevado')) {
                statusBadge.classList.add('status-elevated');
            } else {
                statusBadge.classList.add('status-normal');
            }
        }
    }
}

// Atualiza o mapa com nova localização
function updateMap(lat, lng) {
    if (lat && lng) {
        map.setView([lat, lng], 15);
        marker.setLatLng([lat, lng]).bindPopup('Localização atual do sensor').openPopup();
    }
}

// Carrega dados históricos
async function loadHistoricalData(startDate = null, endDate = null) {
    try {
        let query = db.collection('historicalData').orderBy('timestamp', 'desc');
        
        if (startDate && endDate) {
            query = query.where('timestamp', '>=', new Date(startDate))
                        .where('timestamp', '<=', new Date(endDate));
        }
        
        const snapshot = await query.get();
        historicalData = snapshot.docs.map(doc => doc.data());
        updateHistoricalDataDisplay();
        updateChart(historicalData);
    } catch (error) {
        console.error('Erro ao carregar dados históricos:', error);
    }
}

// Atualiza a tabela de dados históricos
function updateHistoricalDataDisplay() {
    const tableBody = document.querySelector('#historical-table tbody');
    tableBody.innerHTML = '';
    
    historicalData.forEach(item => {
        const row = document.createElement('tr');
        const formattedDateTime = item.datetime 
            ? new Date(item.datetime).toLocaleString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : '--';
        
        const location = (item.latitude && item.longitude)
            ? `${parseFloat(item.latitude).toFixed(4)}, ${parseFloat(item.longitude).toFixed(4)}`
            : '--';
        
        let levelClass = '';
        let levelText = item.radiation_level || 'Normal';
        
        if (item.radiation_level) {
            const level = item.radiation_level.toLowerCase();
            if (level.includes('alto')) {
                levelClass = 'status-high';
            } else if (level.includes('elevado')) {
                levelClass = 'status-elevated';
            } else {
                levelClass = 'status-normal';
            }
        }
        
        row.innerHTML = `
            <td>${formattedDateTime}</td>
            <td>${item.cpm || '--'}</td>
            <td>${item.usv ? parseFloat(item.usv).toFixed(4) : '--'}</td>
            <td><span class="status-badge ${levelClass}">${levelText}</span></td>
            <td>${location}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Atualiza o gráfico com dados históricos
function updateChart(data) {
    data.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    
    const labels = data.map(item => {
        const date = new Date(item.datetime);
        return date.toLocaleString();
    });
    
    const usvData = data.map(item => parseFloat(item.usv));
    
    radiationChart.data.labels = labels;
    radiationChart.data.datasets[0].data = usvData;
    radiationChart.update();
}