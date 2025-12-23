// Variáveis globais
let processedData = [];
let groupedData = [];

// Elementos DOM
const fileInput = document.getElementById('fileInput');
const dropArea = document.getElementById('dropArea');
const uploadSection = document.getElementById('uploadSection');
const resultsSection = document.getElementById('resultsSection');
const tableBody = document.getElementById('tableBody');
const totalRegistros = document.getElementById('totalRegistros');
const dataProcessamento = document.getElementById('dataProcessamento');
const countCritical = document.getElementById('countCritical');
const countWarning = document.getElementById('countWarning');
const countNormal = document.getElementById('countNormal');
const filterStatus = document.getElementById('filterStatus');
const filterDays = document.getElementById('filterDays');
const searchName = document.getElementById('searchName');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const modal = document.getElementById('detailsModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const closeModal = document.querySelector('.close');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const showingCount = document.getElementById('showingCount');

// Event Listeners
fileInput.addEventListener('change', handleFileSelect);
dropArea.addEventListener('dragover', handleDragOver);
dropArea.addEventListener('dragleave', handleDragLeave);
dropArea.addEventListener('drop', handleDrop);
dropArea.addEventListener('click', () => fileInput.click());
filterStatus.addEventListener('change', filterTable);
filterDays.addEventListener('change', filterTable);
searchName.addEventListener('input', filterTable);
exportBtn.addEventListener('click', exportSummary);
clearBtn.addEventListener('click', clearData);
closeModal.addEventListener('click', () => modal.style.display = 'none');

// Modal overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
        overlay.parentElement.style.display = 'none';
    });
});

// Menu toggle for mobile
if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// Help modal
if (helpBtn) {
    helpBtn.addEventListener('click', () => {
        helpModal.style.display = 'block';
    });
}

// Close modal with Escape key
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }
});

// Função para lidar com seleção de arquivo
function handleFileSelect(event) {
    const file = event.target.files[0];
    processFile(file);
}

// Função para arrastar e soltar
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    dropArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    dropArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    dropArea.classList.remove('dragover');
    const file = event.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
        processFile(file);
    } else {
        showToast('Por favor, selecione um arquivo CSV válido.', 'error');
    }
}

// Processar arquivo CSV
function processFile(file) {
    if (!file) {
        showToast('Nenhum arquivo selecionado.', 'error');
        return;
    }

    showLoading(true);

    Papa.parse(file, {
        delimiter: ';',
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            showLoading(false);

            if (results.data.length === 0) {
                showToast('O arquivo está vazio ou não possui dados válidos.', 'error');
                return;
            }

            processedData = results.data;
            groupData();
            displayResults();
            updateSummary();

            // Esconder upload section e mostrar results
            uploadSection.style.display = 'none';

            // Mostrar popup de sucesso
            const totalFunc = groupedData.length;
            const totalLanc = processedData.length;
            showToast(`Planilha carregada! ${totalFunc} funcionário(s) processados.`, 'success');

            // Scroll suave até os resultados
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
        error: function(error) {
            showLoading(false);
            showToast('Erro ao processar o arquivo: ' + error.message, 'error');
        }
    });
}

// Agrupar dados por funcionário
function groupData() {
    const grouped = {};

    processedData.forEach(row => {
        const id = row.FUNC_ID;
        if (!grouped[id]) {
            grouped[id] = {
                id: id,
                nome: row.NOME,
                cargo: row.CARGO,
                status: row.STATUS,
                empresa: row.EMPRESA_COD,
                totalSaldo: 0,
                lancamentos: [],
                minDiasVencer: Infinity,
                dataVencimento: null,
                alerta: 'normal'
            };
        }

        // Converter saldo para minutos
        const saldoMinutos = timeToMinutes(row.SALDO);
        grouped[id].totalSaldo += saldoMinutos;

        // Adicionar lançamento
        grouped[id].lancamentos.push({
            descricao: row.DESCRICAO,
            dataMovto: row.BHMV_DAT_MOVTO,
            dataVenc: row.DATA_VENC,
            saldo: row.SALDO,
            diasVencer: parseInt(row.A_VENCER_EM_DIAS) || 0
        });

        // Atualizar menor dias a vencer
        const dias = parseInt(row.A_VENCER_EM_DIAS) || 0;
        if (dias < grouped[id].minDiasVencer) {
            grouped[id].minDiasVencer = dias;
            grouped[id].dataVencimento = row.DATA_VENC;
        }
    });

    // Converter total de saldo de volta para formato HH:MM e determinar alerta
    groupedData = Object.values(grouped).map(func => {
        const totalHHMM = minutesToTime(func.totalSaldo);

        // Determinar nível de alerta
        let alerta = 'normal';
        if (func.minDiasVencer < 7) alerta = 'critical';
        else if (func.minDiasVencer <= 30) alerta = 'warning';

        return {
            ...func,
            totalSaldoStr: totalHHMM,
            alerta: alerta
        };
    });

    // Ordenar por dias a vencer (mais urgentes primeiro)
    groupedData.sort((a, b) => a.minDiasVencer - b.minDiasVencer);
}

// Exibir resultados na tabela
function displayResults() {
    tableBody.innerHTML = '';

    groupedData.forEach(func => {
        const row = document.createElement('tr');

        // Determinar classes CSS baseadas no status e alerta
        const statusClass = func.status === 'ATIVO' ? 'status-ativo' : 'status-ferias';
        const alertClass = `alert-${func.alerta}`;
        const priorityClass = `priority-${func.alerta}`;

        row.innerHTML = `
            <td>${func.nome}</td>
            <td><span style="color: var(--gray-500); font-family: monospace;">${func.id}</span></td>
            <td>${func.cargo || '-'}</td>
            <td><span class="status-badge ${statusClass}">${func.status}</span></td>
            <td><strong>${func.totalSaldoStr}</strong></td>
            <td>${formatDate(func.dataVencimento)}</td>
            <td>
                <span class="alert-badge ${alertClass}">
                    ${func.minDiasVencer} dias
                </span>
            </td>
            <td>
                <div class="priority-indicator ${priorityClass}">
                    <span class="priority-dot"></span>
                </div>
            </td>
            <td>
                <button class="action-btn" onclick="showDetails('${func.id}')" title="Ver detalhes">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn" onclick="downloadEmployeeData('${func.id}')" title="Exportar dados">
                    <i class="fas fa-download"></i>
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    // Mostrar seção de resultados
    resultsSection.style.display = 'block';

    // Atualizar informações de processamento
    totalRegistros.textContent = groupedData.length;
    dataProcessamento.textContent = `Processado em: ${new Date().toLocaleString('pt-BR')}`;
    updateShowingCount();
}

// Atualizar contador de registros exibidos
function updateShowingCount() {
    const visibleRows = tableBody.querySelectorAll('tr:not([style*="display: none"])').length;
    if (showingCount) {
        showingCount.textContent = visibleRows;
    }
}

// Atualizar resumo de alertas
function updateSummary() {
    let critical = 0, warning = 0, normal = 0;

    groupedData.forEach(func => {
        if (func.alerta === 'critical') critical++;
        else if (func.alerta === 'warning') warning++;
        else normal++;
    });

    // Animar contadores
    animateCounter(countCritical, critical);
    animateCounter(countWarning, warning);
    animateCounter(countNormal, normal);
}

// Animação de contador
function animateCounter(element, targetValue) {
    const duration = 500;
    const start = parseInt(element.textContent) || 0;
    const increment = (targetValue - start) / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
            element.textContent = targetValue;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

// Filtrar tabela
function filterTable() {
    const statusFilter = filterStatus.value;
    const daysFilter = filterDays.value;
    const nameFilter = searchName.value.toLowerCase();

    const rows = tableBody.querySelectorAll('tr');

    rows.forEach(row => {
        const status = row.querySelector('.status-badge')?.textContent || '';
        const name = row.cells[0].textContent.toLowerCase();
        // Índice correto: 6 = coluna "Dias a Vencer"
        const alertBadge = row.cells[6]?.querySelector('.alert-badge');
        const diasText = alertBadge ? alertBadge.textContent : '0';
        const dias = parseInt(diasText) || 0;

        let statusMatch = statusFilter === 'all' || status === statusFilter;
        let daysMatch = true;

        if (daysFilter === 'critical') daysMatch = dias < 7;
        else if (daysFilter === 'warning') daysMatch = dias >= 7 && dias <= 30;
        else if (daysFilter === 'normal') daysMatch = dias > 30;

        const nameMatch = name.includes(nameFilter);

        row.style.display = (statusMatch && daysMatch && nameMatch) ? '' : 'none';
    });

    updateShowingCount();
}

// Mostrar detalhes do funcionário
function showDetails(funcId) {
    const func = groupedData.find(f => f.id === funcId);
    if (!func) return;

    modalTitle.innerHTML = `<i class="fas fa-user-circle"></i> ${func.nome}`;

    // Ordenar lançamentos por data de vencimento
    const lancamentosOrdenados = [...func.lancamentos].sort((a, b) => {
        return a.diasVencer - b.diasVencer;
    });

    let lancamentosHTML = '<div class="table-container"><table style="width:100%;">';
    lancamentosHTML += `
        <thead>
            <tr>
                <th>Descrição</th>
                <th>Data Movimento</th>
                <th>Data Vencimento</th>
                <th>Saldo</th>
                <th>Dias</th>
            </tr>
        </thead>
        <tbody>
    `;

    lancamentosOrdenados.forEach(lanc => {
        const alertClass = lanc.diasVencer < 7 ? 'alert-critical' :
                          lanc.diasVencer <= 30 ? 'alert-warning' : 'alert-normal';
        lancamentosHTML += `
            <tr>
                <td>${lanc.descricao || '-'}</td>
                <td>${formatDate(lanc.dataMovto)}</td>
                <td>${formatDate(lanc.dataVenc)}</td>
                <td><strong>${lanc.saldo}</strong></td>
                <td><span class="alert-badge ${alertClass}">${lanc.diasVencer}</span></td>
            </tr>
        `;
    });

    lancamentosHTML += '</tbody></table></div>';

    modalContent.innerHTML = `
        <div class="func-info">
            <p><strong>ID:</strong> ${func.id}</p>
            <p><strong>Cargo:</strong> ${func.cargo || '-'}</p>
            <p><strong>Status:</strong> <span class="status-badge ${func.status === 'ATIVO' ? 'status-ativo' : 'status-ferias'}">${func.status}</span></p>
            <p><strong>Empresa:</strong> ${func.empresa || '-'}</p>
            <p><strong>Saldo Total:</strong> <strong style="font-size:1.25em; color: var(--primary-600);">${func.totalSaldoStr}</strong></p>
            <p><strong>Próximo Venc.:</strong> ${formatDate(func.dataVencimento)} <span class="alert-badge alert-${func.alerta}">${func.minDiasVencer} dias</span></p>
        </div>
        <h4 style="margin: 24px 0 16px; font-size: 0.9375rem; color: var(--gray-700);"><i class="fas fa-list"></i> Lançamentos</h4>
        ${lancamentosHTML}
    `;

    modal.style.display = 'block';
}

// Exportar resumo
function exportSummary() {
    if (groupedData.length === 0) {
        showToast('Não há dados para exportar.', 'warning');
        return;
    }

    // Criar CSV
    let csvContent = "ID;Nome;Cargo;Status;Saldo Total;Data Vencimento;Dias a Vencer;Alerta\n";

    groupedData.forEach(func => {
        const linha = [
            func.id,
            func.nome,
            func.cargo,
            func.status,
            func.totalSaldoStr,
            formatDate(func.dataVencimento),
            func.minDiasVencer,
            getAlertLabel(func.alerta)
        ].join(';');
        csvContent += linha + "\n";
    });

    // Criar blob e download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `resumo_horas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Resumo exportado com sucesso!', 'success');
}

// Limpar dados
function clearData() {
    processedData = [];
    groupedData = [];
    fileInput.value = '';
    resultsSection.style.display = 'none';
    uploadSection.style.display = 'block';
    tableBody.innerHTML = '';
    filterStatus.value = 'all';
    filterDays.value = 'all';
    searchName.value = '';

    // Reset counters
    countCritical.textContent = '0';
    countWarning.textContent = '0';
    countNormal.textContent = '0';

    showToast('Pronto para novo upload.', 'info');

    // Scroll suave até o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Funções auxiliares
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;

    // Lidar com formato "00:00" ou "0,125" (decimal)
    if (timeStr.includes(',')) {
        const horas = parseFloat(timeStr.replace(',', '.'));
        return Math.round(horas * 60);
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    // Manter formato original se já estiver correto
    if (dateStr.includes('/')) {
        return dateStr;
    }
    const [day, month, year] = dateStr.split('/');
    return `${day}/${month}/${year}`;
}

function getAlertColor(alerta) {
    switch(alerta) {
        case 'critical': return 'var(--danger-500)';
        case 'warning': return 'var(--warning-500)';
        default: return 'var(--success-500)';
    }
}

function getAlertLabel(alerta) {
    switch(alerta) {
        case 'critical': return 'Crítico';
        case 'warning': return 'Alerta';
        default: return 'Normal';
    }
}

function downloadEmployeeData(funcId) {
    const func = groupedData.find(f => f.id === funcId);
    if (!func) return;

    let csvContent = `Funcionário: ${func.nome}\nID: ${func.id}\nCargo: ${func.cargo}\nStatus: ${func.status}\nSaldo Total: ${func.totalSaldoStr}\n\n`;
    csvContent += "Descrição;Data Movimento;Data Vencimento;Saldo;Dias a Vencer\n";

    func.lancamentos.forEach(lanc => {
        csvContent += `${lanc.descricao};${lanc.dataMovto};${lanc.dataVenc};${lanc.saldo};${lanc.diasVencer}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${func.nome.replace(/\s+/g, '_')}_horas.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Dados exportados com sucesso!', 'success');
}

// Função para mostrar toast/notificação
function showToast(message, type = 'success') {
    // Remove toast existente se houver
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'check-circle';
    if (type === 'error') icon = 'times-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    if (type === 'info') icon = 'info-circle';

    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Função para mostrar/esconder loading
function showLoading(show = true) {
    let loadingOverlay = document.getElementById('loadingOverlay');

    if (!loadingOverlay && show) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Processando arquivo...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }

    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se há dados salvos (opcional para persistência)
    console.log('HorasControl initialized');
});
