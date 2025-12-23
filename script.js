// Variáveis globais
let processedData = [];
let groupedData = [];

// Elementos DOM
const fileInput = document.getElementById('fileInput');
const dropArea = document.getElementById('dropArea');
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

// Event Listeners
fileInput.addEventListener('change', handleFileSelect);
dropArea.addEventListener('dragover', handleDragOver);
dropArea.addEventListener('drop', handleDrop);
filterStatus.addEventListener('change', filterTable);
filterDays.addEventListener('change', filterTable);
searchName.addEventListener('input', filterTable);
exportBtn.addEventListener('click', exportSummary);
clearBtn.addEventListener('click', clearData);
closeModal.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
});

// Função para lidar com seleção de arquivo
function handleFileSelect(event) {
    const file = event.target.files[0];
    processFile(file);
}

// Função para arrastar e soltar
function handleDragOver(event) {
    event.preventDefault();
    dropArea.classList.add('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    dropArea.classList.remove('dragover');
    const file = event.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
        processFile(file);
    } else {
        alert('Por favor, selecione um arquivo CSV válido.');
    }
}

// Processar arquivo CSV
function processFile(file) {
    Papa.parse(file, {
        delimiter: ';',
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            processedData = results.data;
            groupData();
            displayResults();
            updateSummary();
        },
        error: function(error) {
            alert('Erro ao processar o arquivo: ' + error.message);
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
}

// Exibir resultados na tabela
function displayResults() {
    tableBody.innerHTML = '';
    
    groupedData.forEach(func => {
        const row = document.createElement('tr');
        
        // Determinar classes CSS baseadas no status e alerta
        const statusClass = func.status === 'ATIVO' ? 'status-ativo' : 'status-ferias';
        const alertClass = `alert-${func.alerta}`;
        
        row.innerHTML = `
            <td><strong>${func.nome}</strong></td>
            <td>${func.id}</td>
            <td>${func.cargo}</td>
            <td><span class="status-badge ${statusClass}">${func.status}</span></td>
            <td><strong>${func.totalSaldoStr}</strong></td>
            <td>${formatDate(func.dataVencimento)}</td>
            <td>
                <span class="alert-badge ${alertClass}">
                    ${func.minDiasVencer} dias
                </span>
            </td>
            <td>
                <i class="fas fa-circle" style="color: ${getAlertColor(func.alerta)}"></i>
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
    totalRegistros.textContent = `${groupedData.length} funcionários`;
    dataProcessamento.textContent = `Processado em: ${new Date().toLocaleString()}`;
}

// Atualizar resumo de alertas
function updateSummary() {
    let critical = 0, warning = 0, normal = 0;
    
    groupedData.forEach(func => {
        if (func.alerta === 'critical') critical++;
        else if (func.alerta === 'warning') warning++;
        else normal++;
    });
    
    countCritical.textContent = critical;
    countWarning.textContent = warning;
    countNormal.textContent = normal;
}

// Filtrar tabela
function filterTable() {
    const statusFilter = filterStatus.value;
    const daysFilter = filterDays.value;
    const nameFilter = searchName.value.toLowerCase();
    
    const rows = tableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const status = row.querySelector('.status-badge').textContent;
        const alertClass = row.querySelector('.alert-badge').className;
        const name = row.cells[0].textContent.toLowerCase();
        const diasText = row.cells[5].querySelector('.alert-badge').textContent;
        const dias = parseInt(diasText) || 0;
        
        let statusMatch = statusFilter === 'all' || status === statusFilter;
        let daysMatch = true;
        
        if (daysFilter === 'critical') daysMatch = dias < 7;
        else if (daysFilter === 'warning') daysMatch = dias >= 7 && dias <= 30;
        else if (daysFilter === 'normal') daysMatch = dias > 30;
        
        const nameMatch = name.includes(nameFilter);
        
        row.style.display = (statusMatch && daysMatch && nameMatch) ? '' : 'none';
    });
}

// Mostrar detalhes do funcionário
function showDetails(funcId) {
    const func = groupedData.find(f => f.id === funcId);
    if (!func) return;
    
    modalTitle.textContent = `Detalhes: ${func.nome}`;
    
    // Ordenar lançamentos por data de vencimento
    const lancamentosOrdenados = [...func.lancamentos].sort((a, b) => {
        return new Date(a.dataVenc) - new Date(b.dataVenc);
    });
    
    let lancamentosHTML = '<table style="width:100%; margin-top:20px;">';
    lancamentosHTML += `
        <thead>
            <tr>
                <th>Descrição</th>
                <th>Data Movimento</th>
                <th>Data Vencimento</th>
                <th>Saldo</th>
                <th>Dias a Vencer</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    lancamentosOrdenados.forEach(lanc => {
        lancamentosHTML += `
            <tr>
                <td>${lanc.descricao}</td>
                <td>${formatDate(lanc.dataMovto)}</td>
                <td>${formatDate(lanc.dataVenc)}</td>
                <td>${lanc.saldo}</td>
                <td>${lanc.diasVencer}</td>
            </tr>
        `;
    });
    
    lancamentosHTML += '</tbody></table>';
    
    modalContent.innerHTML = `
        <div class="func-info">
            <p><strong>ID:</strong> ${func.id}</p>
            <p><strong>Cargo:</strong> ${func.cargo}</p>
            <p><strong>Status:</strong> <span class="status-badge ${func.status === 'ATIVO' ? 'status-ativo' : 'status-ferias'}">${func.status}</span></p>
            <p><strong>Empresa:</strong> ${func.empresa}</p>
            <p><strong>Saldo Total:</strong> <strong style="font-size:1.2em;">${func.totalSaldoStr}</strong></p>
            <p><strong>Próximo Vencimento:</strong> ${formatDate(func.dataVencimento)} (${func.minDiasVencer} dias)</p>
            <p><strong>Nível de Alerta:</strong> <span class="alert-badge alert-${func.alerta}">${getAlertLabel(func.alerta)}</span></p>
        </div>
        <h4 style="margin-top:30px;">Lançamentos Individualizados:</h4>
        ${lancamentosHTML}
    `;
    
    modal.style.display = 'block';
}

// Exportar resumo
function exportSummary() {
    if (groupedData.length === 0) {
        alert('Não há dados para exportar.');
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
}

// Limpar dados
function clearData() {
    processedData = [];
    groupedData = [];
    fileInput.value = '';
    resultsSection.style.display = 'none';
    tableBody.innerHTML = '';
    filterStatus.value = 'all';
    filterDays.value = 'all';
    searchName.value = '';
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
    const [day, month, year] = dateStr.split('/');
    return `${day}/${month}/${year}`;
}

function getAlertColor(alerta) {
    switch(alerta) {
        case 'critical': return '#ef4444';
        case 'warning': return '#f59e0b';
        default: return '#10b981';
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
    link.setAttribute('download', `detalhes_${func.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
