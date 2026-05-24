// IMPORTAÇÃO DAS CREDENCIAIS DO FIREBASE
import { firebaseConfig } from './firebase-config.js';

// IMPORTAÇÃO DOS MÓDULOS DO SDK DO FIREBASE VIA CDN (ES MODULES)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getFirestore, collection, addDoc, getDocs, onSnapshot, 
    doc, updateDoc, deleteDoc, writeBatch, setDoc 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// DADOS SEMENTE: As 7 tarefas reais extraídas da planilha GRC original
const seedTasks = [
    {
        id: "AT-001",
        atividade: "Revisão de políticas de acesso lógico",
        pilar: "Segurança da Informação",
        areaCliente: "TI",
        responsavel: "Marcos",
        prioridade: "Alta",
        status: "Em andamento",
        inicio: "2026-05-04",
        prazo: "2026-05-22",
        percentualConcluido: 60,
        entregavel: "Documento revisado no SGI",
        observacoes: "Alinhada à ISO 27001 A.5.15"
    },
    {
        id: "AT-002",
        atividade: "Pipeline N8N — notificação de incidentes",
        pilar: "Segurança da Informação",
        areaCliente: "TI",
        responsavel: "Marcos",
        prioridade: "Alta",
        status: "Em andamento",
        inicio: "2026-04-20",
        prazo: "2026-06-05",
        percentualConcluido: 75,
        entregavel: "Fluxo N8N + relatório de testes",
        observacoes: "Pendente: encoding UTF-8 e Microsoft 365 node"
    },
    {
        id: "AT-003",
        atividade: "Comunicação interna sobre auditoria — MEC",
        pilar: "Auditoria Interna",
        areaCliente: "Todas as áreas",
        responsavel: "Time de Processos",
        prioridade: "Média",
        status: "Concluído",
        inicio: "2026-05-06",
        prazo: "2026-05-12",
        percentualConcluido: 100,
        entregavel: "Comunicado enviado por e-mail e Teams",
        observacoes: "Comunicado enviado a todas as áreas"
    },
    {
        id: "AT-004",
        atividade: "Treinamento de conscientização — DPO",
        pilar: "Conscientização",
        areaCliente: "Todas as áreas",
        responsavel: "Marcos",
        prioridade: "Média",
        status: "Não iniciado",
        inicio: "2026-06-01",
        prazo: "2026-06-20",
        percentualConcluido: 0,
        entregavel: "Material e gravação da sessão",
        observacoes: "Planejado para o próximo ciclo"
    },
    {
        id: "AT-005",
        atividade: "Plano de ação corretiva — NC-12",
        pilar: "Processos / Lean",
        areaCliente: "Operações",
        responsavel: "Time de Processos",
        prioridade: "Alta",
        status: "Atrasado",
        inicio: "2026-04-28",
        prazo: "2026-05-15",
        percentualConcluido: 40,
        entregavel: "Plano de ação formalizado",
        observacoes: "Aguardando retorno do dono do processo"
    },
    {
        id: "AT-006",
        atividade: "Manual SGI integrado — Cláusula 4.1",
        pilar: "ISO 9001",
        areaCliente: "Diretoria",
        responsavel: "Marcos",
        prioridade: "Média",
        status: "Em andamento",
        inicio: "2026-05-05",
        prazo: "2026-05-30",
        percentualConcluido: 50,
        entregavel: "Capítulo 4 do Manual SGI",
        observacoes: "Inclui bullet de mudanças climáticas (amend. 2024)"
    },
    {
        id: "AT-007",
        atividade: "Coleta de evidências — Anexo A ISO 27001",
        pilar: "ISO 27001",
        areaCliente: "TI",
        responsavel: "Marcos",
        prioridade: "Alta",
        status: "Em andamento",
        inicio: "2026-05-01",
        prazo: "2026-06-30",
        percentualConcluido: 30,
        entregavel: "Pasta de evidências no SGI",
        observacoes: "Foco nos controles do Tema 5 (Organizacionais)"
    }
];

// ESTADO GLOBAL DO APLICATIVO
let db = null;
let tasksList = [];
let chartStatusObj = null;
let chartPilarObj = null;

// OPÇÕES DOS COMBOS DINÂMICOS (CARREGADAS DO FIRESTORE OU LOCAL DE BACKUP)
let dynamicResponsibles = ["Marcos", "Time de Processos", "Equipe SI", "DPO", "Auditoria", "Externo / Parceiro"];
let dynamicAreas = ["Diretoria", "TI", "Financeiro", "RH", "Comercial", "Operações", "Jurídico", "Todas as áreas"];

// Lógica de controle do Editor do Relatório
const reportEditorState = {
    narrative: "",
    deliveries: "",
    ongoing: "",
    attention: "",
    nextSteps: "",
    needs: "• Aprovação do VP para início do planejamento do treinamento de conscientização ao DPO.\n• Definição de data para alinhamento sobre o plano corretivo da NC-12.",
    recognitions: "• Destaque ao Time de Processos pela entrega da comunicação MEC dentro do prazo estabelecido."
};

// 1. INICIALIZAÇÃO E CONEXÃO COM O FIREBASE FIRESTORE
function initFirebase() {
    const isPlaceholder = !firebaseConfig.apiKey || firebaseConfig.apiKey.includes("INSIRA_SEU");
    const statusDiv = document.getElementById("connectionStatus");
    const statusText = document.getElementById("statusText");
    const configAlert = document.getElementById("configConnectionAlert");

    if (isPlaceholder) {
        console.warn("Credenciais do Firebase estão pendentes de configuração real no arquivo firebase-config.js.");
        statusDiv.className = "db-status disconnected";
        statusText.innerText = "Firebase Offline (Credenciais Pendentes)";
        configAlert.style.display = "flex";
        configAlert.className = "alert-box warning";
        configAlert.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 1.25rem;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div>
                <strong>Conexão em Nuvem Pendente:</strong> Abra o arquivo <code>firebase-config.js</code> no seu editor de código e cole as chaves do seu projeto Firebase. O sistema começará a funcionar instantaneamente assim que as chaves reais forem salvas.
            </div>
        `;
        renderEmptyTable("Aguardando conexão com o Firebase Firestore...");
        return;
    }

    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        
        statusDiv.className = "db-status connected";
        statusText.innerText = "Conectado ao Firebase Cloud";
        configAlert.style.display = "flex";
        configAlert.className = "alert-box success";
        configAlert.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 1.25rem;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
                <strong>Firebase Conectado!</strong> O sistema está sincronizado com o banco de dados em tempo real no Firestore na nuvem. Toda alteração refletirá instantaneamente.
            </div>
        `;

        // Ativa escuta em tempo real nas tarefas
        setupRealtimeSync();

        // Ativa escuta em tempo real nas configurações
        setupSettingsRealtimeSync();

    } catch (error) {
        console.error("Erro ao inicializar conexão com o Firebase:", error);
        statusDiv.className = "db-status disconnected";
        statusText.innerText = "Erro ao Conectar";
        configAlert.style.display = "flex";
        configAlert.className = "alert-box danger";
        configAlert.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 1.25rem;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div>
                <strong>Erro de Conexão com Firebase:</strong> Falha ao se conectar com os servidores. Verifique as credenciais no arquivo <code>firebase-config.js</code> ou a conexão de rede. Erro: ${error.message}
            </div>
        `;
        renderEmptyTable("Falha na conexão de nuvem.");
    }
}

// 2. SINCRONISMO EM TEMPO REAL E CARGA SEMENTE AUTOMÁTICA
function setupRealtimeSync() {
    const tasksCollection = collection(db, "activities");
    
    onSnapshot(tasksCollection, async (snapshot) => {
        // Se a coleção estiver vazia, faz o seeding automático em massa
        if (snapshot.empty) {
            console.log("Banco de dados vazio! Inicializando carga automática das 7 tarefas reais...");
            try {
                const batch = writeBatch(db);
                seedTasks.forEach((task) => {
                    const docRef = doc(tasksCollection);
                    batch.set(docRef, task);
                });
                await batch.commit();
                console.log("Carga automática concluída com sucesso no Firebase!");
            } catch (err) {
                console.error("Erro ao realizar a carga inicial automática:", err);
            }
            return;
        }

        // Armazena as tarefas carregadas
        tasksList = [];
        snapshot.forEach((doc) => {
            tasksList.push({
                docId: doc.id,
                ...doc.data()
            });
        });

        // Ordena por ID da Atividade (AT-001, AT-002, etc.)
        tasksList.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

        // Atualiza a UI
        updateDashboardMetrics();
        renderTasksTable();
        autoPopulateReportSections();
        renderReportPreview();
    }, (error) => {
        console.error("Erro no sincronismo do Firestore:", error);
    });
}

// 2.1 SINCRONISMO DAS CONFIGURAÇÕES DE CAMPOS DINÂMICOS (RESPONSÁVEIS E ÁREAS)
function setupSettingsRealtimeSync() {
    const settingsDocRef = doc(db, "settings", "options");
    
    onSnapshot(settingsDocRef, async (docSnap) => {
        if (!docSnap.exists()) {
            console.log("Configurações não encontradas! Inicializando opções padrão no Firebase...");
            try {
                await setDoc(settingsDocRef, {
                    responsibles: ["Marcos", "Time de Processos", "Equipe SI", "DPO", "Auditoria", "Externo / Parceiro"],
                    areas: ["Diretoria", "TI", "Financeiro", "RH", "Comercial", "Operações", "Jurídico", "Todas as áreas"]
                });
            } catch (err) {
                console.error("Erro ao inicializar configurações no Firebase:", err);
            }
            return;
        }

        const data = docSnap.data();
        dynamicResponsibles = data.responsibles || [];
        dynamicAreas = data.areas || [];

        // Atualiza os combos da UI
        updateSelectDropdowns();

        // Atualiza as listas de badges na aba Configurações
        renderSettingsBadges();
    }, (error) => {
        console.error("Erro no sincronismo das configurações do Firestore:", error);
    });
}

// Atualiza os seletores HTML dinamicamente com base nas opções configuradas
function updateSelectDropdowns() {
    // 1. filterResponsible (filtro da tabela)
    const filterResp = document.getElementById("filterResponsible");
    if (filterResp) {
        const currentValue = filterResp.value;
        filterResp.innerHTML = '<option value="">Responsável: Todos</option>';
        dynamicResponsibles.forEach(resp => {
            const opt = document.createElement("option");
            opt.value = resp;
            opt.textContent = resp;
            filterResp.appendChild(opt);
        });
        filterResp.value = currentValue;
    }

    // 2. taskResponsible (responsável no formulário modal)
    const taskResp = document.getElementById("taskResponsible");
    if (taskResp) {
        const currentValue = taskResp.value;
        taskResp.innerHTML = '<option value="" disabled selected>Selecione um responsável</option>';
        dynamicResponsibles.forEach(resp => {
            const opt = document.createElement("option");
            opt.value = resp;
            opt.textContent = resp;
            taskResp.appendChild(opt);
        });
        taskResp.value = currentValue;
    }

    // 3. taskArea (área cliente no formulário modal)
    const taskArea = document.getElementById("taskArea");
    if (taskArea) {
        const currentValue = taskArea.value;
        taskArea.innerHTML = '<option value="" disabled selected>Selecione uma área cliente</option>';
        dynamicAreas.forEach(area => {
            const opt = document.createElement("option");
            opt.value = area;
            opt.textContent = area;
            taskArea.appendChild(opt);
        });
        taskArea.value = currentValue;
    }
}

// Renderiza os badges interativos na aba de Configurações
function renderSettingsBadges() {
    const mgrRespList = document.getElementById("mgrResponsiblesList");
    const mgrAreaList = document.getElementById("mgrAreasList");

    if (mgrRespList) {
        mgrRespList.innerHTML = "";
        if (dynamicResponsibles.length === 0) {
            mgrRespList.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem; padding: 0.5rem 0;">Nenhum responsável cadastrado.</span>`;
        } else {
            dynamicResponsibles.forEach((resp, index) => {
                const badge = document.createElement("div");
                badge.className = "mgr-badge";
                badge.innerHTML = `
                    <span>${resp}</span>
                    <button class="btn-remove-badge" title="Remover Responsável" data-type="responsible" data-index="${index}">&times;</button>
                `;
                mgrRespList.appendChild(badge);
            });
        }
    }

    if (mgrAreaList) {
        mgrAreaList.innerHTML = "";
        if (dynamicAreas.length === 0) {
            mgrAreaList.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem; padding: 0.5rem 0;">Nenhuma área cadastrada.</span>`;
        } else {
            dynamicAreas.forEach((area, index) => {
                const badge = document.createElement("div");
                badge.className = "mgr-badge purple";
                badge.innerHTML = `
                    <span>${area}</span>
                    <button class="btn-remove-badge" title="Remover Área Cliente" data-type="area" data-index="${index}">&times;</button>
                `;
                mgrAreaList.appendChild(badge);
            });
        }
    }

    // Liga eventos de clique de remoção
    setupRemoveBadgeListeners();
}

// Configura os escutadores de exclusão de badges
function setupRemoveBadgeListeners() {
    document.querySelectorAll(".btn-remove-badge").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const type = btn.getAttribute("data-type");
            const index = parseInt(btn.getAttribute("data-index"));

            if (isNaN(index)) return;

            if (db === null) {
                alert("Não é possível remover opções enquanto o Firebase estiver offline.");
                return;
            }

            try {
                const settingsDocRef = doc(db, "settings", "options");
                if (type === "responsible") {
                    const removedName = dynamicResponsibles[index];
                    if (confirm(`Deseja realmente remover o responsável "${removedName}"?`)) {
                        const newResponsibles = [...dynamicResponsibles];
                        newResponsibles.splice(index, 1);
                        await setDoc(settingsDocRef, {
                            responsibles: newResponsibles,
                            areas: dynamicAreas
                        });
                    }
                } else if (type === "area") {
                    const removedArea = dynamicAreas[index];
                    if (confirm(`Deseja realmente remover a área "${removedArea}"?`)) {
                        const newAreas = [...dynamicAreas];
                        newAreas.splice(index, 1);
                        await setDoc(settingsDocRef, {
                            responsibles: dynamicResponsibles,
                            areas: newAreas
                        });
                    }
                }
            } catch (err) {
                console.error("Erro ao atualizar configurações no Firestore:", err);
                alert("Falha ao salvar no Firestore: " + err.message);
            }
        });
    });
}

// Adiciona um novo responsável ao Firestore
async function handleAddResponsible() {
    const input = document.getElementById("inputNewResponsible");
    if (!input) return;
    
    const value = input.value.trim();
    if (!value) return;

    if (db === null) {
        alert("Não é possível adicionar opções enquanto o Firebase estiver offline.");
        return;
    }

    if (dynamicResponsibles.includes(value)) {
        alert("Este responsável já está cadastrado.");
        return;
    }

    try {
        const settingsDocRef = doc(db, "settings", "options");
        const newResponsibles = [...dynamicResponsibles, value];
        await setDoc(settingsDocRef, {
            responsibles: newResponsibles,
            areas: dynamicAreas
        });
        input.value = "";
    } catch (err) {
        console.error("Erro ao adicionar responsável:", err);
        alert("Falha ao adicionar responsável no Firestore: " + err.message);
    }
}

// Adiciona uma nova área cliente ao Firestore
async function handleAddArea() {
    const input = document.getElementById("inputNewArea");
    if (!input) return;
    
    const value = input.value.trim();
    if (!value) return;

    if (db === null) {
        alert("Não é possível adicionar opções enquanto o Firebase estiver offline.");
        return;
    }

    if (dynamicAreas.includes(value)) {
        alert("Esta área cliente já está cadastrada.");
        return;
    }

    try {
        const settingsDocRef = doc(db, "settings", "options");
        const newAreas = [...dynamicAreas, value];
        await setDoc(settingsDocRef, {
            responsibles: dynamicResponsibles,
            areas: newAreas
        });
        input.value = "";
    } catch (err) {
        console.error("Erro ao adicionar área cliente:", err);
        alert("Falha ao adicionar área cliente no Firestore: " + err.message);
    }
}


// 1.3 CALCULAR E RENDERIZAR CARDS DE FRENTES OPERACIONAIS COM DRILL-DOWN PULSANTE
function renderFrentesOperacionais() {
    const listBody = document.getElementById("frentesGridBody");
    if (!listBody) return;
    
    // Agrupa tarefas por área cliente
    const areaMap = {};
    tasksList.forEach(t => {
        const area = t.areaCliente || "Geral";
        if (!areaMap[area]) areaMap[area] = [];
        areaMap[area].push(t);
    });
    
    if (Object.keys(areaMap).length === 0) {
        listBody.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 2rem;">
                Nenhuma frente operacional encontrada.
            </div>
        `;
        return;
    }
    
    listBody.innerHTML = "";
    
    // Paleta de cores premium baseadas na marca
    const frenteColors = {
        "TI": "var(--primary)",
        "Operações": "var(--purple)",
        "GTC": "var(--success)",
        "Jurídico": "var(--warning)",
        "Geral": "var(--text-secondary)"
    };
    
    Object.entries(areaMap).forEach(([area, list]) => {
        const totalArea = list.length;
        const concluidasArea = list.filter(t => t.status === "Concluído").length;
        const pendentesArea = totalArea - concluidasArea;
        const bloqueadasArea = list.filter(t => t.status === "Bloqueado").length;
        const atrasadasArea = list.filter(t => t.status === "Atrasado").length;
        
        // Média de avanço físico da área
        let sumPercentage = 0;
        list.forEach(t => sumPercentage += t.percentualConcluido);
        const avgCompletion = totalArea > 0 ? Math.round(sumPercentage / totalArea) : 0;
        
        // Determina o semáforo de status (verde, amarelo, vermelho)
        let statusColor = "green";
        let statusText = "SAUDÁVEL";
        
        if (bloqueadasArea > 0 || atrasadasArea > 0) {
            statusColor = "red";
            statusText = "CRÍTICO";
        } else if (avgCompletion < 35 || list.some(t => {
            if (t.status === "Concluído" || !t.prazo) return false;
            const diffDays = Math.ceil((new Date(t.prazo + "T00:00:00") - new Date()) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 5;
        })) {
            statusColor = "yellow";
            statusText = "EM RISCO";
        }
        
        const card = document.createElement("div");
        card.className = "card-frente";
        card.setAttribute("data-area", area);
        
        const color = frenteColors[area] || "var(--primary)";
        
        // Circunferência do anel = 2 * PI * r = 2 * 3.14159 * 24 = 150.8
        const circumference = 150.8;
        const offset = circumference - (circumference * avgCompletion) / 100;
        
        card.innerHTML = `
            <div class="frente-header">
                <div class="frente-name-wrapper">
                    <span class="frente-name" title="${area}">${area}</span>
                    <span class="frente-pilar-tag">${totalArea} atividade(s)</span>
                </div>
                <span class="frente-status-dot ${statusColor}" title="Status da Frente: ${statusText}"></span>
            </div>
            <div class="frente-body">
                <div class="frente-metrics">
                    <span class="frente-metric-row">Concluídas: <span class="frente-metric-val">${concluidasArea}</span></span>
                    <span class="frente-metric-row">Pendentes: <span class="frente-metric-val">${pendentesArea}</span></span>
                </div>
                <div class="frente-gauge">
                    <svg class="frente-gauge-ring" width="60" height="60">
                        <circle cx="30" cy="30" r="24" stroke="rgba(255, 255, 255, 0.05)" stroke-width="4" fill="transparent"/>
                        <circle cx="30" cy="30" r="24" stroke="${color}" stroke-width="4" fill="transparent" stroke-dasharray="150.8" stroke-dashoffset="${offset}" style="stroke-linecap: round; box-shadow: 0 0 8px ${color}80;"/>
                    </svg>
                    <span class="frente-gauge-value">${avgCompletion}%</span>
                </div>
            </div>
        `;
        
        // Drill-Down: ao clicar na frente operacional, vai direto para as atividades filtrando por busca
        card.addEventListener("click", () => {
            showTab("activities");
            const searchInput = document.getElementById("inputSearch");
            if (searchInput) {
                searchInput.value = area;
                filterTasks();
            }
        });
        
        listBody.appendChild(card);
    });
}

// 3. RENDERIZAÇÃO DA TABELA E FILTROS DO CRUD
function renderTasksTable(filteredList = null) {
    const tbody = document.getElementById("activitiesTableBody");
    const list = filteredList || tasksList;

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    Nenhuma atividade encontrada com os filtros aplicados.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = "";
    list.forEach((task) => {
        const row = document.createElement("tr");
        row.className = "clickable-row";
        row.setAttribute("data-docid", task.docId);
        
        // Formata data do prazo
        const dateParts = task.prazo.split("-");
        const formattedDeadline = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : task.prazo;

        // Classificação estilizada dos Pilares
        let pilarClass = "seg-inf";
        if (task.pilar.includes("LGPD") || task.pilar.includes("Privacidade")) pilarClass = "lgpd";
        else if (task.pilar.includes("27001")) pilarClass = "iso27";
        else if (task.pilar.includes("9001")) pilarClass = "iso90";
        else if (task.pilar.includes("Auditoria")) pilarClass = "aud-int";
        else if (task.pilar.includes("Lean") || task.pilar.includes("Processos")) pilarClass = "lean";
        else if (task.pilar.includes("Conscientização")) pilarClass = "conscientizacao";

        // Classificação dos Status
        let statusClass = "in-progress";
        if (task.status === "Não iniciado") statusClass = "not-started";
        else if (task.status === "Concluído") statusClass = "completed";
        else if (task.status === "Atrasado") statusClass = "delayed";
        else if (task.status === "Bloqueado") statusClass = "blocked";

        // Classificação das Prioridades
        let priorityClass = "medium";
        if (task.prioridade === "Alta") priorityClass = "high";
        else if (task.prioridade === "Baixa") priorityClass = "low";

        row.innerHTML = `
            <td class="cell-id">${task.id}</td>
            <td><span class="badge-pilar ${pilarClass}">${task.pilar}</span></td>
            <td class="cell-activity" title="${task.atividade}">${task.atividade}</td>
            <td>${task.areaCliente}</td>
            <td>${task.responsavel}</td>
            <td><span class="badge-priority ${priorityClass}">${task.prioridade}</span></td>
            <td><span class="badge-status ${statusClass}">${task.status}</span></td>
            <td>${formattedDeadline}</td>
            <td>
                <div class="progress-bar-wrapper">
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${task.percentualConcluido}%"></div>
                    </div>
                    <span class="progress-text">${task.percentualConcluido}%</span>
                </div>
            </td>
            <td>
                <div class="actions-cell">
                    <button class="btn-icon edit" title="Editar Atividade" data-docid="${task.docId}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>
                    </button>
                    <button class="btn-icon delete" title="Excluir Atividade" data-docid="${task.docId}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-1.802a2.25 2.25 0 0 0-2.25-2.25h-1.5a2.25 2.25 0 0 0-2.25 2.25v1.802" /></svg>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });

    // Registra listeners de ação de forma delegada
    setupTableActionListeners();
}

function renderEmptyTable(message) {
    const tbody = document.getElementById("activitiesTableBody");
    tbody.innerHTML = `
        <tr>
            <td colspan="10" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">☁️</div>
                ${message}
            </td>
        </tr>
    `;
}

function setupTableActionListeners() {
    // Escuta cliques na linha inteira para abrir o modal de edição
    document.querySelectorAll(".clickable-row").forEach(row => {
        row.addEventListener("click", (e) => {
            // Ignora o clique se o usuário clicou nos botões de ação ou na célula de ações
            if (e.target.closest(".actions-cell") || e.target.closest("button")) {
                return;
            }
            const docId = row.getAttribute("data-docid");
            openEditDrawer(docId);
        });
    });

    // Botão de editar clássico (com stopPropagation para segurança extra)
    document.querySelectorAll(".btn-icon.edit").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const docId = btn.getAttribute("data-docid");
            openEditDrawer(docId);
        });
    });

    // Botão de deletar (com stopPropagation para evitar que o clique na linha abra o modal de edição)
    document.querySelectorAll(".btn-icon.delete").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const docId = btn.getAttribute("data-docid");
            const task = tasksList.find(t => t.docId === docId);
            if (task && confirm(`Deseja realmente excluir a atividade "${task.id} - ${task.atividade}"?`)) {
                try {
                    await deleteDoc(doc(db, "activities", docId));
                    console.log("Atividade excluída!");
                } catch (err) {
                    alert("Erro ao excluir do Firebase: " + err.message);
                }
            }
        });
    });
}

// Lógica de Filtro Avançado
function filterTasks() {
    const query = document.getElementById("inputSearch").value.toLowerCase().trim();
    const status = document.getElementById("filterStatus").value;
    const pilar = document.getElementById("filterPilar").value;
    const responsible = document.getElementById("filterResponsible").value;
    const priority = document.getElementById("filterPriority").value;

    const filtered = tasksList.filter((task) => {
        const matchesQuery = !query || 
            task.atividade.toLowerCase().includes(query) || 
            task.id.toLowerCase().includes(query) || 
            task.observacoes.toLowerCase().includes(query);
            
        const matchesStatus = !status || task.status === status;
        const matchesPilar = !pilar || task.pilar === pilar;
        const matchesResp = !responsible || task.responsavel === responsible;
        const matchesPriority = !priority || task.prioridade === priority;

        return matchesQuery && matchesStatus && matchesPilar && matchesResp && matchesPriority;
    });

    renderTasksTable(filtered);
}

// 4. MÉTRICAS E GRÁFICOS DO DASHBOARD
// 4. MÉTRICAS E GRÁFICOS DO DASHBOARD
function updateDashboardMetrics() {
    const total = tasksList.length;
    const completed = tasksList.filter(t => t.status === "Concluído").length;
    const inProgress = tasksList.filter(t => t.status === "Em andamento").length;
    const delayed = tasksList.filter(t => t.status === "Atrasado" || t.status === "Bloqueado").length;

    // Cálculo da taxa de conclusão média
    let sumPercentage = 0;
    tasksList.forEach(t => sumPercentage += t.percentualConcluido);
    const avgCompletion = total > 0 ? Math.round(sumPercentage / total) : 0;

    // SLA de Prazos (% de tarefas não atrasadas / bloqueadas)
    const sla = total > 0 ? Math.round(((total - delayed) / total) * 100) : 100;

    // Saúde Geral do GRC (média ponderada: 60% avanço médio + 40% SLA de prazo)
    const healthIndex = total > 0 ? Math.round((avgCompletion * 0.6) + (sla * 0.4)) : 0;

    // Atualiza valores na tela
    document.getElementById("metric-total").innerText = total;
    document.getElementById("metric-completed").innerText = completed;
    document.getElementById("metric-progress").innerText = inProgress;
    
    // Novo KPI SLA de Prazos
    const metricSla = document.getElementById("metric-sla");
    if (metricSla) metricSla.innerText = `${sla}%`;

    // Atualiza o Anel de Saúde Geral GRC
    const healthValueEl = document.getElementById("exec-health-value");
    const healthRingEl = document.getElementById("exec-health-ring");
    if (healthValueEl && healthRingEl) {
        healthValueEl.innerText = `${healthIndex}%`;
        
        // Circunferência do anel = 2 * PI * r = 2 * 3.14159 * 40 = 251.2
        const circumference = 251.2;
        const offset = circumference - (circumference * healthIndex) / 100;
        healthRingEl.style.strokeDashoffset = offset;
    }

    // Identifica o Pilar mais ativo (com mais tarefas)
    let pilarCounts = {};
    tasksList.forEach(t => {
        pilarCounts[t.pilar] = (pilarCounts[t.pilar] || 0) + 1;
    });
    let topPilar = "Nenhum";
    let maxTasks = 0;
    for (const [pilar, count] of Object.entries(pilarCounts)) {
        if (count > maxTasks) {
            maxTasks = count;
            topPilar = pilar;
        }
    }

    // Atualiza o Diagnóstico Executivo com base nos dados reais do Firebase
    const execSummaryTitle = document.getElementById("exec-summary-title");
    const execSummaryText = document.getElementById("exec-summary-text");
    if (execSummaryTitle && execSummaryText) {
        let healthLabel = "Ação Requerida ⚠️";
        if (healthIndex >= 80) healthLabel = "Excelente Desempenho 🚀";
        else if (healthIndex >= 60) healthLabel = "Saúde Estável e Controlada 🛡️";
        
        execSummaryTitle.innerText = `Diagnóstico de Governança: ${healthLabel}`;
        
        let diagnosticText = `O programa de governança apresenta um índice de **Saúde Geral de ${healthIndex}%** com avanço físico médio de **${avgCompletion}%** das atividades planejadas. `;
        if (delayed > 0) {
            diagnosticText += `Identificamos **${delayed} ponto(s) de atenção crítico(s)** em atraso ou bloqueio no ciclo atual. Recomenda-se alocação imediata de recursos para sanar esses gargalos e garantir o cumprimento das metas do ciclo corporativo. `;
        } else {
            diagnosticText += `Todas as atividades mapeadas encontram-se dentro do cronograma esperado, refletindo alta eficiência operacional e zero impedimentos críticos registrados. `;
        }
        diagnosticText += `O pilar que concentra o maior volume de ações no momento é **${topPilar}** (representando ${Math.round((maxTasks / (total || 1)) * 100)}% das atividades do painel).`;
        
        // Substitui ** por tags strong para renderizar negrito no HTML
        execSummaryText.innerHTML = diagnosticText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    // Atualiza Alerta de Atenção
    const attentionCard = document.getElementById("attentionAlert");
    if (delayed > 0) {
        attentionCard.style.display = "flex";
        document.getElementById("attentionText").innerText = `Existem ${delayed} atividades marcadas como "Atrasado" ou "Bloqueado" no ciclo atual.`;
    } else {
        attentionCard.style.display = "none";
    }

    // Popula Sidebar 1: Marcos Críticos & Prazos
    populateMilestonesSidebar();
    
    // Popula Frentes Operacionais com Drill-Down na Home
    renderFrentesOperacionais();

    // Popula Sidebar 2: Progresso por Pilar GRC
    populatePilarBreakdownSidebar();

    // Atualiza ou Cria Gráficos
    renderCharts(completed, inProgress, total - completed - inProgress, delayed);
}

// 4.1 POPULAR SIDEBAR DE MARCOS CRÍTICOS
function populateMilestonesSidebar() {
    const listBody = document.getElementById("milestonesListBody");
    if (!listBody) return;

    // Filtra tarefas não concluídas e que possuam prazo
    const activeTasks = tasksList.filter(t => t.status !== "Concluído" && t.prazo);
    
    if (activeTasks.length === 0) {
        listBody.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 1rem;">
                🎉 Nenhuma atividade pendente de prazo no momento!
            </div>
        `;
        return;
    }

    // Calcula os dias restantes para cada tarefa e ordena (menor prazo primeiro)
    const sortedTasks = activeTasks.map(t => {
        const deadlineDate = new Date(t.prazo + "T00:00:00"); // evite fuso horário
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
            ...t,
            diasRestantes: diffDays
        };
    }).sort((a, b) => a.diasRestantes - b.diasRestantes);

    // Renderiza as 3 principais/mais próximas
    listBody.innerHTML = "";
    sortedTasks.slice(0, 3).forEach(task => {
        const item = document.createElement("div");
        item.className = "milestone-item";
        
        let badgeClass = "normal";
        let badgeText = `Faltam ${task.diasRestantes} dias`;
        
        if (task.diasRestantes < 0) {
            badgeClass = "urgent";
            badgeText = `Atrasado ${Math.abs(task.diasRestantes)}d`;
        } else if (task.diasRestantes <= 5) {
            badgeClass = "warning";
            badgeText = `Urgente: ${task.diasRestantes}d`;
        }
        
        item.innerHTML = `
            <div class="milestone-info">
                <span class="milestone-name" title="${task.atividade}">[${task.id}] ${task.atividade}</span>
                <span class="milestone-date">Prazo: ${task.prazo.split("-").reverse().join("/")} • Resp: ${task.responsavel}</span>
            </div>
            <span class="milestone-badge ${badgeClass}">${badgeText}</span>
        `;
        
        listBody.appendChild(item);
    });
}

// 4.2 POPULAR SIDEBAR DE PROGRESSO POR PILAR GRC
function populatePilarBreakdownSidebar() {
    const listBody = document.getElementById("pilarBreakdownListBody");
    if (!listBody) return;

    const pilarList = [
        "Segurança da Informação", "ISO 27001", "ISO 9001", 
        "Auditoria Interna", "Privacidade / LGPD", "Processos / Lean", "Conscientização"
    ];

    // Mapeamento de cores premium para os pilares
    const pilarColors = {
        "Segurança da Informação": "var(--primary)",
        "ISO 27001": "var(--success)",
        "ISO 9001": "var(--info)",
        "Auditoria Interna": "var(--warning)",
        "Privacidade / LGPD": "var(--purple)",
        "Processos / Lean": "var(--text-secondary)",
        "Conscientização": "#ec4899"
    };

    listBody.innerHTML = "";
    pilarList.forEach(pilar => {
        const pilarTasks = tasksList.filter(t => t.pilar === pilar);
        
        let avgPilarCompletion = 0;
        if (pilarTasks.length > 0) {
            let sum = 0;
            pilarTasks.forEach(t => sum += t.percentualConcluido);
            avgPilarCompletion = Math.round(sum / pilarTasks.length);
        } else {
            return; // Omitir pilares sem nenhuma tarefa para deixar mais limpo
        }

        const item = document.createElement("div");
        item.className = "pilar-progress-item";
        
        const color = pilarColors[pilar] || "var(--primary)";
        
        item.innerHTML = `
            <div class="pilar-progress-label-row">
                <span class="pilar-progress-name">${pilar}</span>
                <span class="pilar-progress-percentage">${avgPilarCompletion}%</span>
            </div>
            <div class="progress-track" style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 99px;">
                <div class="progress-fill" style="width: ${avgPilarCompletion}%; background: ${color}; box-shadow: 0 0 8px ${color}80; border-radius: 99px;"></div>
            </div>
        `;
        
        listBody.appendChild(item);
    });
}

function renderCharts(completed, inProgress, remaining, delayed) {
    const ctxStatus = document.getElementById("chartStatus").getContext("2d");
    const ctxPilar = document.getElementById("chartPilar").getContext("2d");

    // Destrói objetos anteriores se já existirem
    if (chartStatusObj) chartStatusObj.destroy();
    if (chartPilarObj) chartPilarObj.destroy();

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textCol = isDark ? "#86868b" : "#6e6e73";
    const gridCol = isDark ? "rgba(210, 210, 215, 0.08)" : "rgba(0, 0, 0, 0.05)";

    // 1. GRAFICO DE DONUT: DISTRIBUIÇÃO DE STATUS
    const statusCounts = {
        "Não iniciado": 0,
        "Em andamento": 0,
        "Concluído": 0,
        "Atrasado": 0,
        "Bloqueado": 0
    };
    tasksList.forEach(t => {
        if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;
    });

    chartStatusObj = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#d2d2d7', // Não iniciado (Alabaster Hairline / Light Gray)
                    '#86868b', // Em andamento (Apple Neutral Gray)
                    '#0071e3', // Concluído (Apple Blue)
                    '#b64400', // Atrasado (Apple Alert Orange)
                    '#ff791b'  // Bloqueado (Light Alert Orange)
                ],
                borderWidth: isDark ? 2 : 1,
                borderColor: isDark ? '#000000' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textCol, font: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', size: 11 } }
                }
            },
            cutout: '70%'
        }
    });

    // 2. GRAFICO DE PILARES GRC
    const pilarList = [
        "Segurança da Informação", "ISO 27001", "ISO 9001", 
        "Auditoria Interna", "Privacidade / LGPD", "Processos / Lean", "Conscientização"
    ];
    
    const pilarData = pilarList.map(pilar => {
        const pilarTasks = tasksList.filter(t => t.pilar === pilar);
        return {
            pilar: pilar.split(" ")[0] + (pilar.split(" ")[1] ? " " + pilar.split(" ")[1] : ""), // Short label
            concluida: pilarTasks.filter(t => t.status === "Concluído").length,
            outros: pilarTasks.filter(t => t.status !== "Concluído").length
        };
    });

    chartPilarObj = new Chart(ctxPilar, {
        type: 'bar',
        data: {
            labels: pilarData.map(d => d.pilar),
            datasets: [
                {
                    label: 'Concluído',
                    data: pilarData.map(d => d.concluida),
                    backgroundColor: '#0071e3', // Apple Blue
                    borderRadius: 4
                },
                {
                    label: 'Ativos / Outros',
                    data: pilarData.map(d => d.outros),
                    backgroundColor: '#d2d2d7', // Alabaster Hairline Gray
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: textCol, font: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', size: 10 } }
                },
                y: {
                    stacked: true,
                    grid: { color: gridCol },
                    ticks: { color: textCol, font: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', size: 10 }, stepSize: 1 }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textCol, font: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', size: 11 } }
                }
            }
        }
    });
}

// 5. EDITOR E AUTO-GERADOR DO "RESUMO DO CICLO" (RELATÓRIO VP)
function autoPopulateReportSections() {
    // Só atualiza os campos vazios ou reescreve baseado nas tarefas se o usuário não tiver alterado de forma manual
    const total = tasksList.length;
    const completed = tasksList.filter(t => t.status === "Concluído");
    const inProgress = tasksList.filter(t => t.status === "Em andamento");
    const delayed = tasksList.filter(t => t.status === "Atrasado" || t.status === "Bloqueado");
    const notStarted = tasksList.filter(t => t.status === "Não iniciado");

    let sumPercentage = 0;
    tasksList.forEach(t => sumPercentage += t.percentualConcluido);
    const avgCompletion = total > 0 ? Math.round(sumPercentage / total) : 0;

    // 1. Resumo Geral Narrativo
    reportEditorState.narrative = `No ciclo atual, o time de GRC acompanhou de forma integrada as ações de conformidade e governança. Atualmente, o painel centralizado monitora um total de ${total} atividades ativas, cobrindo os pilares de Segurança da Informação, Privacidade (DPO/LGPD), Auditorias Internas e Sistemas de Gestão ISO. Registramos uma taxa média de avanço físico de ${avgCompletion}% de conclusão geral em nosso ciclo, com foco na consolidação de evidências e automação de alertas de risco.`;

    // 2. Principais Entregas
    if (completed.length > 0) {
        reportEditorState.deliveries = completed.map(t => `• Conclusão de: [${t.id}] ${t.atividade} (Pilar: ${t.pilar}) - Responsável: ${t.responsavel}. Entregável: ${t.entregavel}.`).join("\n");
    } else {
        reportEditorState.deliveries = "• Nenhuma atividade foi marcada como Concluída no ciclo atual.";
    }

    // 3. Atividades Relevantes em Andamento
    if (inProgress.length > 0) {
        reportEditorState.ongoing = inProgress.map(t => `• [${t.id}] ${t.atividade} está em ${t.percentualConcluido}% concluído. Foco: ${t.observacoes}. Prazo: ${t.prazo}.`).join("\n");
    } else {
        reportEditorState.ongoing = "• Não há grandes atividades ativas qualificadas em andamento.";
    }

    // 4. Pontos de Atenção
    if (delayed.length > 0) {
        reportEditorState.attention = delayed.map(t => `• ATENÇÃO: [${t.id}] ${t.atividade} encontra-se com status "${t.status}" (${t.percentualConcluido}% concluído). Responsável: ${t.responsavel}. Impedimento: ${t.observacoes}.`).join("\n");
    } else {
        reportEditorState.attention = "• Nenhuma atividade em atraso ou bloqueio crítico identificada no momento.";
    }

    // 5. Próximos Passos
    if (notStarted.length > 0) {
        reportEditorState.nextSteps = notStarted.map(t => `• Preparar início de: [${t.id}] ${t.atividade} (Pilar: ${t.pilar}) - Planejado para início em ${t.inicio}.`).join("\n");
    } else {
        reportEditorState.nextSteps = "• Todas as atividades planejadas já foram inicializadas ou concluídas no ciclo atual.";
    }

    // Escreve os valores no editor HTML se o usuário ainda não tiver clicado ou focado para escrever manualmente
    updateEditorTextareas();
}

function updateEditorTextareas() {
    const textareas = {
        repNarrative: reportEditorState.narrative,
        repDeliveries: reportEditorState.deliveries,
        repOngoing: reportEditorState.ongoing,
        repAttention: reportEditorState.attention,
        repNextSteps: reportEditorState.nextSteps,
        repNeeds: reportEditorState.needs
    };

    for (const [id, value] of Object.entries(textareas)) {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) {
            el.value = value;
        }
    }
}

// Renderiza a visualização estilizada do documento para o VP
function renderReportPreview() {
    const preview = document.getElementById("reportPreviewDoc");
    const today = new Date().toLocaleDateString("pt-BR");

    preview.innerHTML = `
        <div class="report-header-preview">Relatório de Status GRC ao VP</div>
        <p style="text-align: center; font-size: 0.8rem; color: var(--text-muted); margin-top: -1rem; margin-bottom: 1.5rem;">Gerado em ${today} • Dados dinâmicos do Firebase</p>
        
        <h3>1. Resumo Narrativo do Ciclo</h3>
        <p>${document.getElementById("repNarrative")?.value || ""}</p>
        
        <h3>2. Principais Entregas Realizadas</h3>
        <ul>
            ${(document.getElementById("repDeliveries")?.value || "").split("\n").map(li => li.trim() ? `<li>${li.replace(/^•\s*/, "")}</li>` : "").join("")}
        </ul>
        
        <h3>3. Atividades em Andamento de Alta Visibilidade</h3>
        <ul>
            ${(document.getElementById("repOngoing")?.value || "").split("\n").map(li => li.trim() ? `<li>${li.replace(/^•\s*/, "")}</li>` : "").join("")}
        </ul>
        
        <h3>4. Pontos de Atenção / Atrasos Críticos</h3>
        <ul>
            ${(document.getElementById("repAttention")?.value || "").split("\n").map(li => li.trim() ? `<li>${li.replace(/^•\s*/, "")}</li>` : "").join("")}
        </ul>
        
        <h3>5. Próximos Passos (Ciclo Seguinte)</h3>
        <ul>
            ${(document.getElementById("repNextSteps")?.value || "").split("\n").map(li => li.trim() ? `<li>${li.replace(/^•\s*/, "")}</li>` : "").join("")}
        </ul>
        
        <h3>6. Necessidades de Direcionamento / Decisões do VP</h3>
        <ul>
            ${(document.getElementById("repNeeds")?.value || "").split("\n").map(li => li.trim() ? `<li>${li.replace(/^•\s*/, "")}</li>` : "").join("")}
        </ul>
    `;
}

// Copiar Relatório para Área de Transferência como Markdown/Texto formatado
function copyReportToClipboard() {
    const today = new Date().toLocaleDateString("pt-BR");
    let text = `==================================================\n`;
    text += `RESUMO DO CICLO - APRESENTAÇÃO AO VP\n`;
    text += `Data de Emissão: ${today}\n`;
    text += `==================================================\n\n`;
    
    text += `1. RESUMO NARRATIVO DO CICLO:\n`;
    text += `${document.getElementById("repNarrative").value}\n\n`;
    
    text += `2. PRINCIPAIS ENTREGAS REALIZADAS:\n`;
    text += `${document.getElementById("repDeliveries").value}\n\n`;
    
    text += `3. ATIVIDADES EM ANDAMENTO DE ALTA VISIBILIDADE:\n`;
    text += `${document.getElementById("repOngoing").value}\n\n`;
    
    text += `4. PONTOS DE ATENÇÃO / ATRASOS CRÍTICOS:\n`;
    text += `${document.getElementById("repAttention").value}\n\n`;
    
    text += `5. PRÓXIMOS PASSOS:\n`;
    text += `${document.getElementById("repNextSteps").value}\n\n`;
    
    text += `6. NECESSIDADES / DECISÕES DO VP:\n`;
    text += `${document.getElementById("repNeeds").value}\n\n`;

    navigator.clipboard.writeText(text).then(() => {
        alert("Resumo do Ciclo copiado para a Área de Transferência com sucesso!");
    }).catch(err => {
        alert("Falha ao copiar: " + err);
    });
}

// Baixar relatório em .txt
function downloadReportAsTxt() {
    const today = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    let text = `==================================================\n`;
    text += `RESUMO DO CICLO - APRESENTAÇÃO AO VP\n`;
    text += `Data de Emissão: ${today}\n`;
    text += `==================================================\n\n`;
    
    text += `1. RESUMO NARRATIVO DO CICLO:\n`;
    text += `${document.getElementById("repNarrative").value}\n\n`;
    
    text += `2. PRINCIPAIS ENTREGAS REALIZADAS:\n`;
    text += `${document.getElementById("repDeliveries").value}\n\n`;
    
    text += `3. ATIVIDADES EM ANDAMENTO DE ALTA VISIBILIDADE:\n`;
    text += `${document.getElementById("repOngoing").value}\n\n`;
    
    text += `4. PONTOS DE ATENÇÃO / ATRASOS CRÍTICOS:\n`;
    text += `${document.getElementById("repAttention").value}\n\n`;
    
    text += `5. PRÓXIMOS PASSOS:\n`;
    text += `${document.getElementById("repNextSteps").value}\n\n`;
    
    text += `6. NECESSIDADES / DECISÕES DO VP:\n`;
    text += `${document.getElementById("repNeeds").value}\n\n`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `GRC-Report-VP-${today}.txt`;
    link.click();
}

// 6. EXPORTAR DADOS ATUAIS DE VOLTA PARA EXCEL (.xlsx)
function exportToExcel() {
    if (tasksList.length === 0) {
        alert("Não há dados carregados para exportação.");
        return;
    }

    try {
        // Converte dados do Firebase de volta para a estrutura de colunas do Excel original
        const excelData = tasksList.map((t) => ({
            "ID": t.id,
            "Atividade": t.atividade,
            "Pilar": t.pilar,
            "Área Cliente": t.areaCliente,
            "Responsável": t.responsavel,
            "Prioridade": t.prioridade,
            "Status": t.status,
            "Início": t.inicio,
            "Prazo": t.prazo,
            "% Concluído": t.percentualConcluido,
            "Entregável / Evidência": t.entregavel,
            "Observações": t.observacoes
        }));

        // Cria workbook do SheetJS
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Atividades");
        
        // Faz download do arquivo
        const todayStr = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
        XLSX.writeFile(wb, `Relatorio_Atividades_GRC_${todayStr}.xlsx`);
        console.log("Planilha de backup baixada com sucesso!");
    } catch (error) {
        console.error("Falha ao exportar planilha:", error);
        alert("Erro ao exportar planilha: " + error.message);
    }
}

// 7. CONTROLES DA GAVETA LATERAL PREMIUM (DRAWER SLIDE-OVER) E FORMULÁRIO (CRUD)
const drawer = document.getElementById("activityDrawer");
const drawerBackdrop = document.getElementById("execDrawerBackdrop");
const form = document.getElementById("activityForm");

function openNewActivityDrawer() {
    form.reset();
    document.getElementById("taskDocId").value = "";
    document.getElementById("drawerTitle").innerText = "Nova Atividade";
    document.getElementById("drawerSubtitle").innerText = "Cadastro de Iniciativa GRC";
    
    // Oculta botão de excluir no modal de cadastro
    document.getElementById("btnDeleteFromDrawer").style.display = "none";
    document.getElementById("drawerChecklistSection").style.display = "none";
    
    // Auto-calcula o próximo ID sequencial
    let nextNum = 1;
    if (tasksList.length > 0) {
        const ids = tasksList.map(t => parseInt(t.id.replace("AT-", ""))).filter(n => !isNaN(n));
        if (ids.length > 0) nextNum = Math.max(...ids) + 1;
    }
    document.getElementById("taskID").value = `AT-${String(nextNum).padStart(3, '0')}`;
    document.getElementById("taskID").disabled = false;
    
    // Padrão de data (hoje)
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("taskStart").value = today;
    document.getElementById("taskDeadline").value = today;
    document.getElementById("taskPercent").value = 0;

    drawer.classList.add("active");
    drawerBackdrop.classList.add("active");
}

function openEditDrawer(docId) {
    const task = tasksList.find(t => t.docId === docId);
    if (!task) return;

    document.getElementById("taskDocId").value = docId;
    document.getElementById("drawerTitle").innerText = "Editar Atividade";
    document.getElementById("drawerSubtitle").innerText = `Detalhes da Demanda ${task.id}`;
    
    // Exibe o botão de excluir no modal de edição
    document.getElementById("btnDeleteFromDrawer").style.display = "flex";
    
    document.getElementById("taskID").value = task.id;
    document.getElementById("taskID").disabled = true; // não edita o ID
    
    document.getElementById("taskPilar").value = task.pilar;
    document.getElementById("taskAtividade").value = task.atividade;
    document.getElementById("taskArea").value = task.areaCliente;
    document.getElementById("taskResponsible").value = task.responsavel;
    document.getElementById("taskPriority").value = task.prioridade;
    document.getElementById("taskStatus").value = task.status;
    document.getElementById("taskStart").value = task.inicio;
    document.getElementById("taskDeadline").value = task.prazo;
    document.getElementById("taskPercent").value = task.percentualConcluido;
    document.getElementById("taskDeliverable").value = task.entregavel || "";
    document.getElementById("taskNotes").value = task.observacoes || "";

    // Carrega seção de Checklist operacional obtida do MS Planner via N8N
    const checklistSection = document.getElementById("drawerChecklistSection");
    const checklistList = document.getElementById("drawerChecklistList");
    
    if (checklistSection && checklistList) {
        const checklistData = task.checklist;
        if (checklistData && Object.keys(checklistData).length > 0) {
            checklistList.innerHTML = "";
            Object.values(checklistData).forEach(item => {
                const div = document.createElement("div");
                div.className = "drawer-checklist-item";
                const isChecked = item.isChecked ? "checked" : "";
                const checkedAttr = item.isChecked ? "checked" : "";
                div.innerHTML = `
                    <input type="checkbox" class="drawer-checklist-checkbox" ${checkedAttr} disabled>
                    <span class="drawer-checklist-title ${isChecked}">${item.title}</span>
                `;
                checklistList.appendChild(div);
            });
            checklistSection.style.display = "flex";
        } else {
            checklistSection.style.display = "none";
        }
    }

    drawer.classList.add("active");
    drawerBackdrop.classList.add("active");
}

function closeDrawer() {
    drawer.classList.remove("active");
    drawerBackdrop.classList.remove("active");
}


// Submissão do Formulário (Salvar / Editar no Firestore)
async function handleFormSubmit(e) {
    e.preventDefault();

    const docId = document.getElementById("taskDocId").value;
    const taskData = {
        id: document.getElementById("taskID").value,
        pilar: document.getElementById("taskPilar").value,
        atividade: document.getElementById("taskAtividade").value,
        areaCliente: document.getElementById("taskArea").value,
        responsavel: document.getElementById("taskResponsible").value,
        prioridade: document.getElementById("taskPriority").value,
        status: document.getElementById("taskStatus").value,
        inicio: document.getElementById("taskStart").value,
        prazo: document.getElementById("taskDeadline").value,
        percentualConcluido: parseInt(document.getElementById("taskPercent").value) || 0,
        entregavel: document.getElementById("taskDeliverable").value,
        observacoes: document.getElementById("taskNotes").value
    };

    // Validação de regras de negócio
    if (taskData.percentualConcluido === 100 && taskData.status !== "Concluído") {
        taskData.status = "Concluído";
    } else if (taskData.status === "Concluído" && taskData.percentualConcluido < 100) {
        taskData.percentualConcluido = 100;
    }

    try {
        if (docId) {
            // Edição
            await updateDoc(doc(db, "activities", docId), taskData);
            console.log("Atividade atualizada no Firestore!");
        } else {
            // Inserção de Nova
            await addDoc(collection(db, "activities"), taskData);
            console.log("Nova atividade inserida no Firestore!");
        }
        closeDrawer();
    } catch (err) {
        alert("Erro ao salvar no Firebase Firestore: " + err.message);
    }
}

// 8. GERENCIAMENTO DE ABAS E EVENTOS DE TELA
function showTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));

    const targetTab = document.getElementById(`tab-${tabName}`);
    const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);

    if (targetTab && targetBtn) {
        targetTab.classList.add("active");
        targetBtn.classList.add("active");
        
        // Força redescobrir tamanhos de gráficos se a aba for Dashboard
        if (tabName === "dashboard") {
            setTimeout(updateDashboardMetrics, 50);
        }
    }
}

// Alternar Tema (Dark/Light)
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("grc-theme", nextTheme);
    
    const themeIcon = document.getElementById("themeIcon");
    if (nextTheme === "light") {
        themeIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 1.25rem; height: 1.25rem;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
        `;
    } else {
        themeIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 1.25rem; height: 1.25rem;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
        `;
    }

    // Redesenha gráficos com novas cores de legenda e grid
    if (tasksList.length > 0) {
        updateDashboardMetrics();
    }
}

// 9. EVENT LISTENERS E INICIALIZAÇÃO NO LOAD da página
document.addEventListener("DOMContentLoaded", () => {
    // Liga botões das abas
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tabName = btn.getAttribute("data-tab");
            showTab(tabName);
        });
    });

    // Liga alternador de tema
    document.getElementById("themeToggle").addEventListener("click", toggleTheme);

    // Liga filtros de atividades
    document.getElementById("inputSearch").addEventListener("input", filterTasks);
    document.getElementById("filterStatus").addEventListener("change", filterTasks);
    document.getElementById("filterPilar").addEventListener("change", filterTasks);
    document.getElementById("filterResponsible").addEventListener("change", filterTasks);
    document.getElementById("filterPriority").addEventListener("change", filterTasks);

    // Liga botões CRUD da Gaveta Lateral (Drawer)
    document.getElementById("btnNewActivity").addEventListener("click", openNewActivityDrawer);
    document.getElementById("btnCloseDrawer").addEventListener("click", closeDrawer);
    document.getElementById("btnCancelDrawer").addEventListener("click", closeDrawer);
    document.getElementById("execDrawerBackdrop").addEventListener("click", closeDrawer);
    
    // Liga botões de Drill-Down nos cards de métricas superiores
    document.getElementById("metricCardTotal").addEventListener("click", () => {
        showTab("activities");
        document.getElementById("inputSearch").value = "";
        document.getElementById("filterStatus").value = "";
        document.getElementById("filterPilar").value = "";
        document.getElementById("filterResponsible").value = "";
        document.getElementById("filterPriority").value = "";
        filterTasks();
    });
    
    document.getElementById("metricCardCompleted").addEventListener("click", () => {
        showTab("activities");
        document.getElementById("filterStatus").value = "Concluído";
        filterTasks();
    });
    
    document.getElementById("metricCardProgress").addEventListener("click", () => {
        showTab("activities");
        document.getElementById("filterStatus").value = "Em andamento";
        filterTasks();
    });
    
    document.getElementById("metricCardSla").addEventListener("click", () => {
        showTab("activities");
        document.getElementById("filterStatus").value = "Atrasado";
        filterTasks();
    });
    form.addEventListener("submit", handleFormSubmit);

    // Liga exclusão direta por dentro do Drawer lateral
    document.getElementById("btnDeleteFromDrawer").addEventListener("click", async () => {
        const docId = document.getElementById("taskDocId").value;
        if (!docId) return;
        const task = tasksList.find(t => t.docId === docId);
        if (task && confirm(`Deseja realmente excluir a atividade "${task.id} - ${task.atividade}"?`)) {
            try {
                await deleteDoc(doc(db, "activities", docId));
                console.log("Atividade excluída!");
                closeDrawer();
            } catch (err) {
                alert("Erro ao excluir do Firebase: " + err.message);
            }
        }
    });

    // Liga botões do Report do VP
    document.getElementById("btnCopyReport").addEventListener("click", copyReportToClipboard);
    document.getElementById("btnDownloadReport").addEventListener("click", downloadReportAsTxt);

    // Liga listeners em tempo real nos inputs do editor do relatório
    const editorInputs = ["repNarrative", "repDeliveries", "repOngoing", "repAttention", "repNextSteps", "repNeeds"];
    editorInputs.forEach(id => {
        document.getElementById(id).addEventListener("input", renderReportPreview);
    });

    // Liga botão exportar para excel
    document.getElementById("btnExportExcel").addEventListener("click", exportToExcel);

    // Popula dropdowns e badges com valores padrão iniciais imediatamente
    updateSelectDropdowns();
    renderSettingsBadges();

    // Liga botões de adição de opções na aba Configurações
    document.getElementById("btnAddNewResponsible").addEventListener("click", handleAddResponsible);
    document.getElementById("inputNewResponsible").addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleAddResponsible();
    });

    document.getElementById("btnAddNewArea").addEventListener("click", handleAddArea);
    document.getElementById("inputNewArea").addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleAddArea();
    });

    // Recupera tema salvo
    const savedTheme = localStorage.getItem("grc-theme") || "dark";
    if (savedTheme === "light") {
        toggleTheme(); // vira light
    }

    // Inicializa o Firebase
    initFirebase();
});

// Exporta funções globais necessárias para eventos em atributos HTML
window.app = {
    showTab,
    filterTasks
};
