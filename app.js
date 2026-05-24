// IMPORTAÇÃO DAS CREDENCIAIS DO FIREBASE
import { firebaseConfig } from './firebase-config.js';

// IMPORTAÇÃO DOS MÓDULOS DO SDK DO FIREBASE VIA CDN (ES MODULES)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getFirestore, collection, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// DADOS OPERACIONAIS: Todos os dados de tarefas são consumidos diretamente em tempo real do Firebase Firestore


// ESTADO GLOBAL DO APLICATIVO
let db = null;
let tasksList = [];
let chartStatusObj = null;
let chartPilarObj = null;
let filterSlaOnly = false;

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
        if (configAlert) {
            configAlert.style.display = "flex";
            configAlert.className = "alert-box warning";
            configAlert.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 1.25rem;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                    <strong>Conexão em Nuvem Pendente:</strong> O sistema está rodando localmente. Abra o arquivo <code>firebase-config.js</code> no seu editor de código e cole as chaves do seu projeto Firebase para sincronização automática em tempo real.
                </div>
            `;
        }
        renderEmptyTable("Aguardando conexão com o Firebase Firestore...");
        return;
    }

    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        
        if (statusDiv) statusDiv.className = "db-status connected";
        if (statusText) statusText.innerText = "Conectado ao Firebase Cloud";
        
        if (configAlert) {
            configAlert.style.display = "flex";
            configAlert.className = "alert-box success";
            configAlert.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 1.25rem;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                    <strong>Firebase Conectado!</strong> O sistema está sincronizado com o banco de dados em tempo real no Firestore na nuvem. Toda alteração refletirá instantaneamente.
                </div>
            `;
        }

        // Ativa escuta em tempo real nas tarefas
        setupRealtimeSync();

    } catch (error) {
        console.error("Erro ao inicializar conexão com o Firebase:", error);
        if (statusDiv) statusDiv.className = "db-status disconnected";
        if (statusText) statusText.innerText = "Erro ao Conectar";
        if (configAlert) {
            configAlert.style.display = "flex";
            configAlert.className = "alert-box danger";
            configAlert.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 1.25rem;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                    <strong>Erro de Conexão com Firebase:</strong> Falha ao se conectar com os servidores. Verifique as credenciais no arquivo <code>firebase-config.js</code> ou a conexão de rede. Erro: ${error.message}
                </div>
            `;
        }
        renderEmptyTable("Falha na conexão de nuvem.");
    }
}

// 2. SINCRONISMO EM TEMPO REAL E CARGA SEMENTE AUTOMÁTICA
function setupRealtimeSync() {
    const tasksCollection = collection(db, "activities");
    
    onSnapshot(tasksCollection, async (snapshot) => {
        // Se a coleção estiver vazia, apenas atualiza o estado com lista vazia
        if (snapshot.empty) {
            console.log("Banco de dados do Firestore está vazio.");
            tasksList = [];
            updateDashboardMetrics();
            renderTasksTable();
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
        updateSelectDropdowns();
    }, (error) => {
        console.error("Erro no sincronismo do Firestore:", error);
    });
}



// Atualiza os seletores HTML dinamicamente com base nas opções configuradas e pilares ativos
function updateSelectDropdowns() {
    // 1. filterResponsible (filtro da tabela)
    const filterResp = document.getElementById("filterResponsible");
    if (filterResp) {
        const currentValue = filterResp.value;
        filterResp.innerHTML = '<option value="">Responsável: Todos</option>';
        
        // Obtém responsáveis reais das tarefas ativas
        const dynamicResponsibles = [...new Set(tasksList.map(t => t.responsavel).filter(Boolean))];
        dynamicResponsibles.sort().forEach(resp => {
            const opt = document.createElement("option");
            opt.value = resp;
            opt.textContent = resp;
            filterResp.appendChild(opt);
        });
        filterResp.value = currentValue;
    }

    // 2. filterPilar (filtro de pilares ativo no dashboard)
    const filterPilar = document.getElementById("filterPilar");
    if (filterPilar) {
        const currentValue = filterPilar.value;
        filterPilar.innerHTML = '<option value="">Pilar: Todos</option>';
        
        // Obtém pilares reais das tarefas ou usa padrão da N8N
        const pilars = [...new Set(tasksList.map(t => t.pilar).filter(Boolean))];
        const pilarList = pilars.length > 0 ? pilars : ["Segurança da Informação", "Processos / Lean"];
        
        pilarList.sort().forEach(p => {
            const opt = document.createElement("option");
            opt.value = p;
            opt.textContent = p;
            filterPilar.appendChild(opt);
        });
        filterPilar.value = currentValue;
    }

    // 3. taskPilar (pilar no formulário modal do Drawer)
    const taskPilar = document.getElementById("taskPilar");
    if (taskPilar) {
        const currentValue = taskPilar.value;
        taskPilar.innerHTML = '<option value="" disabled selected>Selecione um pilar GRC</option>';
        
        const pilars = [...new Set(tasksList.map(t => t.pilar).filter(Boolean))];
        const pilarList = pilars.length > 0 ? pilars : ["Segurança da Informação", "Processos / Lean"];
        
        pilarList.sort().forEach(p => {
            const opt = document.createElement("option");
            opt.value = p;
            opt.textContent = p;
            taskPilar.appendChild(opt);
        });
        if (currentValue) {
            taskPilar.value = currentValue;
        }
    }
}

// Renderiza os badges interativos na aba de Configurações (Apenas Leitura dinâmica de metadados reais)
function renderSettingsBadges() {
    const mgrRespList = document.getElementById("mgrResponsiblesList");
    const mgrAreaList = document.getElementById("mgrAreasList");

    const dynamicResponsibles = [...new Set(tasksList.map(t => t.responsavel).filter(Boolean))];
    const dynamicAreas = [...new Set(tasksList.map(t => t.areaCliente).filter(Boolean))];

    if (mgrRespList) {
        mgrRespList.innerHTML = "";
        if (dynamicResponsibles.length === 0) {
            mgrRespList.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem; padding: 0.5rem 0;">Nenhum responsável detectado no Firestore.</span>`;
        } else {
            dynamicResponsibles.sort().forEach(resp => {
                const badge = document.createElement("div");
                badge.className = "mgr-badge";
                badge.innerHTML = `<span>${resp}</span>`;
                mgrRespList.appendChild(badge);
            });
        }
    }

    if (mgrAreaList) {
        mgrAreaList.innerHTML = "";
        if (dynamicAreas.length === 0) {
            mgrAreaList.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem; padding: 0.5rem 0;">Nenhuma área cliente detectada no Firestore.</span>`;
        } else {
            dynamicAreas.sort().forEach(area => {
                const badge = document.createElement("div");
                badge.className = "mgr-badge purple";
                badge.innerHTML = `<span>${area}</span>`;
                mgrAreaList.appendChild(badge);
            });
        }
    }
}

// 3. CALCULAR E RENDERIZAR CARDS DE FRENTES OPERACIONAIS COM DRILL-DOWN PULSANTE
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
        
        // Drill-Down: ao clicar na frente operacional, filtra a tabela da Home diretamente e rola suave
        card.addEventListener("click", () => {
            const searchInput = document.getElementById("inputSearch");
            const filterStatus = document.getElementById("filterStatus");
            const filterPilar = document.getElementById("filterPilar");
            const filterResponsible = document.getElementById("filterResponsible");
            const filterPriority = document.getElementById("filterPriority");
            
            filterSlaOnly = false;
            if (searchInput) searchInput.value = area;
            if (filterStatus) filterStatus.value = "";
            if (filterPilar) filterPilar.value = "";
            if (filterResponsible) filterResponsible.value = "";
            if (filterPriority) filterPriority.value = "";
            
            filterTasks();
            
            const radarSection = document.querySelector(".radar-operational-section");
            if (radarSection) {
                radarSection.scrollIntoView({ behavior: "smooth" });
            }
        });
        
        listBody.appendChild(card);
    });
}

// 4. RENDERIZAÇÃO DE AMBAS AS TABELAS (HOME E CRUD) COM FILTROS AVANÇADOS
function renderTasksTable() {
    const query = document.getElementById("inputSearch").value.toLowerCase().trim();
    const status = document.getElementById("filterStatus").value;
    const pilar = document.getElementById("filterPilar").value;
    const responsible = document.getElementById("filterResponsible").value;
    const priority = document.getElementById("filterPriority").value;

    const filtered = tasksList.filter((task) => {
        const matchesQuery = !query || 
            task.atividade.toLowerCase().includes(query) || 
            task.id.toLowerCase().includes(query) || 
            (task.observacoes && task.observacoes.toLowerCase().includes(query)) ||
            (task.areaCliente && task.areaCliente.toLowerCase().includes(query));
            
        let matchesStatus = !status || task.status === status;
        
        // Se ativamos o filtro de SLA falho via KPI card
        if (filterSlaOnly) {
            matchesStatus = task.status === "Atrasado" || task.status === "Bloqueado";
        }
        
        const matchesPilar = !pilar || task.pilar === pilar;
        const matchesResp = !responsible || task.responsavel === responsible;
        const matchesPriority = !priority || task.prioridade === priority;

        return matchesQuery && matchesStatus && matchesPilar && matchesResp && matchesPriority;
    });

    // 4.1 Renderiza Tabela Radar da Home (activitiesTableBody)
    const homeTbody = document.getElementById("activitiesTableBody");
    if (homeTbody) {
        if (filtered.length === 0) {
            homeTbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        Nenhuma atividade encontrada com os filtros aplicados.
                    </td>
                </tr>
            `;
        } else {
            homeTbody.innerHTML = "";
            filtered.forEach((task) => {
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
                `;
                
                // Clique na linha abre o modal de detalhes (somente leitura)
                row.addEventListener("click", () => openDetailModal(task.docId));
                
                homeTbody.appendChild(row);
            });
        }
    }

    // 4.2 Renderiza Tabela Analítica (crudTableBody)
    const crudTbody = document.getElementById("crudTableBody");
    if (crudTbody) {
        if (tasksList.length === 0) {
            crudTbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        Nenhuma atividade cadastrada no banco.
                    </td>
                </tr>
            `;
        } else {
            crudTbody.innerHTML = "";
            tasksList.forEach((task) => {
                const row = document.createElement("tr");
                row.className = "clickable-row";
                row.setAttribute("data-docid", task.docId);
                
                // Formata data do prazo
                const dateParts = (task.prazo || "").split("-");
                const formattedDeadline = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : (task.prazo || "");
                const startParts = (task.inicio || "").split("-");
                const formattedStart = startParts.length === 3 ? `${startParts[2]}/${startParts[1]}/${startParts[0]}` : (task.inicio || "");

                // Classificação estilizada dos Pilares
                let pilarClass = "seg-inf";
                if ((task.pilar || "").includes("LGPD") || (task.pilar || "").includes("Privacidade")) pilarClass = "lgpd";
                else if ((task.pilar || "").includes("27001")) pilarClass = "iso27";
                else if ((task.pilar || "").includes("9001")) pilarClass = "iso90";
                else if ((task.pilar || "").includes("Auditoria")) pilarClass = "aud-int";
                else if ((task.pilar || "").includes("Lean") || (task.pilar || "").includes("Processos")) pilarClass = "lean";
                else if ((task.pilar || "").includes("Conscientização")) pilarClass = "conscientizacao";

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
                    <td><span class="badge-pilar ${pilarClass}">${task.pilar || ""}</span></td>
                    <td class="cell-activity" title="${task.atividade || ""}">${task.atividade || ""}</td>
                    <td>${task.areaCliente || ""}</td>
                    <td>${task.responsavel || ""}</td>
                    <td><span class="badge-priority ${priorityClass}">${task.prioridade || ""}</span></td>
                    <td><span class="badge-status ${statusClass}">${task.status || ""}</span></td>
                    <td>${formattedDeadline}</td>
                    <td>
                        <div class="progress-bar-wrapper">
                            <div class="progress-track">
                                <div class="progress-fill" style="width: ${task.percentualConcluido || 0}%"></div>
                            </div>
                            <span class="progress-text">${task.percentualConcluido || 0}%</span>
                        </div>
                    </td>
                `;

                // Clique na linha abre modal de detalhes (somente leitura)
                row.addEventListener("click", () => openDetailModal(task.docId));

                crudTbody.appendChild(row);
            });
        }
    }
}

function renderEmptyTable(message) {
    const homeTbody = document.getElementById("activitiesTableBody");
    if (homeTbody) {
        homeTbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">☁️</div>
                    ${message}
                </td>
            </tr>
        `;
    }
}

// Lógica de Filtro disparada pelos combos/inputs
function filterTasks() {
    renderTasksTable();
}

// 5. ATUALIZAÇÃO DOS METRIC CARDS E CÁLCULO DO GRC HEALTH SCORE E RISCOS
function updateDashboardMetrics() {
    const total = tasksList.length;
    const completed = tasksList.filter(t => t.status === "Concluído").length;
    const inProgress = tasksList.filter(t => t.status === "Em andamento").length;
    
    // SLA de Prazos (% de tarefas não atrasadas / bloqueadas)
    const delayedCount = tasksList.filter(t => t.status === "Atrasado" || t.status === "Bloqueado").length;
    const sla = total > 0 ? Math.round(((total - delayedCount) / total) * 100) : 100;

    // Cálculo da taxa de avanço físico médio
    let sumPercentage = 0;
    tasksList.forEach(t => sumPercentage += t.percentualConcluido);
    const avgCompletion = total > 0 ? Math.round(sumPercentage / total) : 0;

    // Cálculo da Taxa de Estabilidade (penaliza bloqueios com mais de 10 dias)
    // Usamos a data de avaliação do sistema '2026-05-24' para o cálculo retrospectivo
    const evaluationDate = new Date("2026-05-24T12:00:00");
    let severeBlocksCount = 0;
    tasksList.forEach(t => {
        if (t.status === "Bloqueado" && t.inicio) {
            const start = new Date(t.inicio + "T00:00:00");
            const diffDays = Math.ceil((evaluationDate - start) / (1000 * 60 * 60 * 24));
            if (diffDays > 10) {
                severeBlocksCount++;
            }
        }
    });
    const stability = total > 0 ? Math.round(((total - severeBlocksCount) / total) * 100) : 100;

    // GRC Health Score (Índice de Saúde Ponderado)
    // 40% Avanço Médio + 40% SLA de Prazos + 20% Estabilidade
    const healthIndex = total > 0 ? Math.round((avgCompletion * 0.4) + (sla * 0.4) + (stability * 0.2)) : 0;

    // Atualiza valores nos cards superiores
    if (document.getElementById("metric-total")) document.getElementById("metric-total").innerText = total;
    if (document.getElementById("metric-completed")) document.getElementById("metric-completed").innerText = completed;
    if (document.getElementById("metric-progress")) document.getElementById("metric-progress").innerText = inProgress;
    if (document.getElementById("metric-sla")) document.getElementById("metric-sla").innerText = `${sla}%`;

    // Desenha o Gauge Ring do Health Score do Executive Command Card (Raio = 48, Circunferência = 301.6)
    const healthValueEl = document.getElementById("exec-health-value");
    const healthRingEl = document.getElementById("exec-health-ring");
    if (healthValueEl && healthRingEl) {
        healthValueEl.innerText = `${healthIndex}%`;
        const circumference = 301.6;
        const offset = circumference - (circumference * healthIndex) / 100;
        healthRingEl.style.strokeDashoffset = offset;
    }

    // Identifica o Pilar GRC mais ativo (com mais tarefas)
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

    // Atualiza o Diagnóstico Estrutural de Governança
    const execSummaryTitle = document.getElementById("exec-summary-title");
    const execSummaryText = document.getElementById("exec-summary-text");
    if (execSummaryTitle && execSummaryText) {
        let healthLabel = "Ação Requerida ⚠️";
        if (healthIndex >= 80) healthLabel = "Excelente Desempenho 🚀";
        else if (healthIndex >= 60) healthLabel = "Saúde Estável e Controlada 🛡️";
        
        execSummaryTitle.innerText = `Diagnóstico de Governança: ${healthLabel}`;
        
        let diagnosticText = `O programa de governança apresenta um índice de **Saúde Geral de ${healthIndex}%** com avanço físico médio de **${avgCompletion}%** e estabilidade de prazos de **${stability}%**. `;
        if (delayedCount > 0) {
            diagnosticText += `Detectamos **${delayedCount} gargalo(s) ativo(s)** (atrasos ou bloqueios). `;
            if (severeBlocksCount > 0) {
                diagnosticText += `Com **${severeBlocksCount} impedimento(s) severo(s)** ultrapassando o limite técnico de 10 dias. Recomenda-se direcionamento estratégico imediato. `;
            } else {
                diagnosticText += `Recomenda-se alinhamento de prioridades para evitar escalonamento. `;
            }
        } else {
            diagnosticText += `Todas as iniciativas estão dentro do esperado, sem nenhum impedimento operacional ou desvio crítico de prazo no momento. `;
        }
        diagnosticText += `A maior concentração de iniciativas está no pilar **${topPilar}** (representando ${Math.round((maxTasks / (total || 1)) * 100)}% do portfólio total).`;
        
        execSummaryText.innerHTML = diagnosticText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    // Popula a sidebar de Gargalos Crônicos e Bloqueios
    populateRiskHeatmap();
    
    // Popula frentes operacionais (cards de áreas)
    renderFrentesOperacionais();

    // Atualiza os Gráficos
    renderCharts();
}

// 5.1 POPULAR SIDEBAR DE RISCOS E GARGALOS CRÔNICOS
function populateRiskHeatmap() {
    const listBody = document.getElementById("riskHeatmapList");
    if (!listBody) return;

    // Filtra tarefas com problemas (Atrasadas ou Bloqueadas)
    const riskTasks = tasksList.filter(t => t.status === "Atrasado" || t.status === "Bloqueado");

    if (riskTasks.length === 0) {
        listBody.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 1.25rem;">
                🟢 Nenhum bloqueio ou atraso crítico ativo no ciclo!
            </div>
        `;
        return;
    }

    // Ordena por prioridade (Alta -> Média -> Baixa)
    riskTasks.sort((a, b) => {
        const pValues = { "Alta": 3, "Média": 2, "Baixa": 1 };
        return (pValues[b.prioridade] || 0) - (pValues[a.prioridade] || 0);
    });

    listBody.innerHTML = "";
    riskTasks.forEach(task => {
        const item = document.createElement("div");
        item.className = "risk-item";
        item.setAttribute("data-docid", task.docId);
        
        let badgeClass = "danger";
        if (task.status === "Atrasado") {
            badgeClass = "warning";
        }

        item.innerHTML = `
            <div class="risk-info">
                <span class="risk-name" title="${task.atividade}">[${task.id}] ${task.atividade}</span>
                <span class="risk-date">Área: ${task.areaCliente} • Resp: ${task.responsavel}</span>
            </div>
            <span class="risk-badge ${badgeClass}">${task.status}</span>
        `;

        // Ao clicar no risco da barra lateral, abre o modal de detalhes
        item.addEventListener("click", () => {
            openDetailModal(task.docId);
        });

        listBody.appendChild(item);
    });
}

// 5.2 RENDERIZAÇÃO DOS GRÁFICOS DO CHART.JS
function renderCharts() {
    const canvasStatus = document.getElementById("chartStatus");
    const canvasPilar = document.getElementById("chartPilar");
    
    if (!canvasStatus || !canvasPilar) return;

    const ctxStatus = canvasStatus.getContext("2d");
    const ctxPilar = canvasPilar.getContext("2d");

    // Destrói objetos anteriores se já existirem
    if (chartStatusObj) chartStatusObj.destroy();
    if (chartPilarObj) chartPilarObj.destroy();

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textCol = isDark ? "#86868b" : "#6e6e73";
    const gridCol = isDark ? "rgba(210, 210, 215, 0.08)" : "rgba(0, 0, 0, 0.05)";

    // Contagem de Status para o Donut
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
                    '#86868b', // Não iniciado (Cinza Neutro)
                    '#c084fc', // Em andamento (Roxo Soft)
                    '#0071e3', // Concluído (Azul Premium)
                    '#f59e0b', // Atrasado (Laranja)
                    '#ef4444'  // Bloqueado (Vermelho)
                ],
                borderWidth: isDark ? 2 : 1,
                borderColor: isDark ? '#09090b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textCol, font: { family: 'Inter, sans-serif', size: 10 } }
                }
            },
            cutout: '72%'
        }
    });

    // Bar Chart: Status por Pilar GRC (gerado dinamicamente das tarefas reais)
    const activePilars = [...new Set(tasksList.map(t => t.pilar).filter(Boolean))];
    const pilarList = activePilars.length > 0 ? activePilars : ["Segurança da Informação", "Processos / Lean"];
    
    const pilarData = pilarList.map(pilar => {
        const pilarTasks = tasksList.filter(t => t.pilar === pilar);
        return {
            pilar: pilar.length > 15 ? pilar.substring(0, 14) + "..." : pilar,
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
                    backgroundColor: '#0071e3', // Azul
                    borderRadius: 4
                },
                {
                    label: 'Ativos / Outros',
                    data: pilarData.map(d => d.outros),
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
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
                    ticks: { color: textCol, font: { family: 'Inter, sans-serif', size: 9 } }
                },
                y: {
                    stacked: true,
                    grid: { color: gridCol },
                    ticks: { color: textCol, font: { family: 'Inter, sans-serif', size: 9 }, stepSize: 1 }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textCol, font: { family: 'Inter, sans-serif', size: 10 } }
                }
            }
        }
    });
}

// 6. AUTO-GERADOR DO "RESUMO DO CICLO" (RELATÓRIO VP)
function autoPopulateReportSections() {
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
        reportEditorState.deliveries = completed.map(t => `• Conclusão de: [${t.id}] ${t.atividade} (Pilar: ${t.pilar}) - Responsável: ${t.responsavel}. Entregável: ${t.entregavel || "Conforme diretrizes"}.`).join("\n");
    } else {
        reportEditorState.deliveries = "• Nenhuma atividade foi marcada como Concluída no ciclo atual.";
    }

    // 3. Atividades Relevantes em Andamento
    if (inProgress.length > 0) {
        reportEditorState.ongoing = inProgress.map(t => `• [${t.id}] ${t.atividade} está em ${t.percentualConcluido}% concluído. Foco: ${t.observacoes || "Cronograma regular"}. Prazo: ${t.prazo.split("-").reverse().join("/")}.`).join("\n");
    } else {
        reportEditorState.ongoing = "• Não há grandes atividades ativas qualificadas em andamento.";
    }

    // 4. Pontos de Atenção
    if (delayed.length > 0) {
        reportEditorState.attention = delayed.map(t => `• ATENÇÃO: [${t.id}] ${t.atividade} encontra-se com status "${t.status}" (${t.percentualConcluido}% concluído). Responsável: ${t.responsavel}. Impedimento: ${t.observacoes || "Aguardando definição"}.`).join("\n");
    } else {
        reportEditorState.attention = "• Nenhuma atividade em atraso ou bloqueio crítico identificada no momento.";
    }

    // 5. Próximos Passos
    if (notStarted.length > 0) {
        reportEditorState.nextSteps = notStarted.map(t => `• Preparar início de: [${t.id}] ${t.atividade} (Pilar: ${t.pilar}) - Planejado para início em ${t.inicio.split("-").reverse().join("/")}.`).join("\n");
    } else {
        reportEditorState.nextSteps = "• Todas as atividades planejadas já foram inicializadas ou concluídas no ciclo atual.";
    }

    // Escreve os valores no editor HTML se o usuário ainda não tiver alterado manualmente
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

// Renderiza a visualização estilizada do documento de ata para o VP
function renderReportPreview() {
    const preview = document.getElementById("reportPreviewDoc");
    if (!preview) return;
    
    const today = new Date().toLocaleDateString("pt-BR");

    preview.innerHTML = `
        <div class="report-header-preview">PARECER EXECUTIVO DE CONFORMIDADE GRC</div>
        <p style="text-align: center; font-size: 0.8rem; color: var(--text-muted); margin-top: -1rem; margin-bottom: 1.5rem;">Gerado em ${today} • Argos IA Integration Engine</p>
        
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

// Copiar Ata para Clipboard
function copyReportToClipboard() {
    const today = new Date().toLocaleDateString("pt-BR");
    let text = `==================================================\n`;
    text += `RESUMO DO CICLO - APRESENTAÇÃO AO VP\n`;
    text += `Data de Emissão: ${today}\n`;
    text += `==================================================\n\n`;
    
    text += `1. RESUMO NARRATIVO DO CICLO:\n`;
    text += `${document.getElementById("repNarrative")?.value || ""}\n\n`;
    
    text += `2. PRINCIPAIS ENTREGAS REALIZADAS:\n`;
    text += `${document.getElementById("repDeliveries")?.value || ""}\n\n`;
    
    text += `3. ATIVIDADES EM ANDAMENTO DE ALTA VISIBILIDADE:\n`;
    text += `${document.getElementById("repOngoing")?.value || ""}\n\n`;
    
    text += `4. PONTOS DE ATENÇÃO / ATRASOS CRÍTICOS:\n`;
    text += `${document.getElementById("repAttention")?.value || ""}\n\n`;
    
    text += `5. PRÓXIMOS PASSOS:\n`;
    text += `${document.getElementById("repNextSteps")?.value || ""}\n\n`;
    
    text += `6. NECESSIDADES / DECISÕES DO VP:\n`;
    text += `${document.getElementById("repNeeds")?.value || ""}\n\n`;

    navigator.clipboard.writeText(text).then(() => {
        alert("Parecer executivo copiado para a Área de Transferência!");
    }).catch(err => {
        alert("Falha ao copiar: " + err);
    });
}

// Baixar ata em .txt
function downloadReportAsTxt() {
    const today = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    let text = `==================================================\n`;
    text += `RESUMO DO CICLO - APRESENTAÇÃO AO VP\n`;
    text += `Data de Emissão: ${today}\n`;
    text += `==================================================\n\n`;
    
    text += `1. RESUMO NARRATIVO DO CICLO:\n`;
    text += `${document.getElementById("repNarrative")?.value || ""}\n\n`;
    
    text += `2. PRINCIPAIS ENTREGAS REALIZADAS:\n`;
    text += `${document.getElementById("repDeliveries")?.value || ""}\n\n`;
    
    text += `3. ATIVIDADES EM ANDAMENTO DE ALTA VISIBILIDADE:\n`;
    text += `${document.getElementById("repOngoing")?.value || ""}\n\n`;
    
    text += `4. PONTOS DE ATENÇÃO / ATRASOS CRÍTICOS:\n`;
    text += `${document.getElementById("repAttention")?.value || ""}\n\n`;
    
    text += `5. PRÓXIMOS PASSOS:\n`;
    text += `${document.getElementById("repNextSteps")?.value || ""}\n\n`;
    
    text += `6. NECESSIDADES / DECISÕES DO VP:\n`;
    text += `${document.getElementById("repNeeds")?.value || ""}\n\n`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Parecer-Executivo-GRC-VP-${today}.txt`;
    link.click();
}

// 7. EXPORTAR DADOS OPERACIONAIS DE VOLTA PARA EXCEL (.xlsx)
function exportToExcel() {
    if (tasksList.length === 0) {
        alert("Não há dados carregados para exportação.");
        return;
    }

    try {
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
            "Entregável / Evidência": t.entregavel || "",
            "Observações": t.observacoes || ""
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Atividades");
        
        const todayStr = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
        XLSX.writeFile(wb, `Relatorio_Atividades_GRC_${todayStr}.xlsx`);
        console.log("Planilha de backup baixada com sucesso!");
    } catch (error) {
        console.error("Falha ao exportar planilha:", error);
        alert("Erro ao exportar planilha: " + error.message);
    }
}


// 8. MODAL DE DETALHES PREMIUM (SOMENTE LEITURA)
function openDetailModal(docId) {
    const task = tasksList.find(t => t.docId === docId);
    if (!task) return;

    // Popula o cabeçalho
    document.getElementById("modalActivityId").textContent = task.id || "";
    document.getElementById("modalActivityTitle").textContent = task.atividade || "Sem título";
    document.getElementById("modalActivityPilar").textContent = task.pilar || "";

    // Status badge
    const modalStatus = document.getElementById("modalStatus");
    if (modalStatus) {
        let statusClass = "in-progress";
        if (task.status === "Não iniciado") statusClass = "not-started";
        else if (task.status === "Concluído") statusClass = "completed";
        else if (task.status === "Atrasado") statusClass = "delayed";
        else if (task.status === "Bloqueado") statusClass = "blocked";
        modalStatus.className = `badge-status ${statusClass}`;
        modalStatus.textContent = task.status || "";
    }

    // Prioridade badge
    const modalPriority = document.getElementById("modalPriority");
    if (modalPriority) {
        let priorityClass = "medium";
        if (task.prioridade === "Alta") priorityClass = "high";
        else if (task.prioridade === "Baixa") priorityClass = "low";
        modalPriority.className = `badge-priority ${priorityClass}`;
        modalPriority.textContent = task.prioridade || "";
    }

    // Progresso
    const pct = task.percentualConcluido || 0;
    const modalProgressFill = document.getElementById("modalProgressFill");
    const modalProgressText = document.getElementById("modalProgressText");
    if (modalProgressFill) modalProgressFill.style.width = `${pct}%`;
    if (modalProgressText) modalProgressText.textContent = `${pct}%`;

    // Infos
    document.getElementById("modalResponsible").textContent = task.responsavel || "—";
    document.getElementById("modalArea").textContent = task.areaCliente || "—";
    
    const fmtDate = (d) => {
        if (!d) return "—";
        const parts = d.split("-");
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
    };
    document.getElementById("modalStart").textContent = fmtDate(task.inicio);
    document.getElementById("modalDeadline").textContent = fmtDate(task.prazo);

    // Entregável
    const delEl = document.getElementById("modalDeliverable");
    if (delEl) delEl.textContent = task.entregavel || "Não informado";

    // Observações
    const notesEl = document.getElementById("modalNotes");
    if (notesEl) notesEl.textContent = task.observacoes || "Sem observações registradas.";

    // Checklist do Planner
    const checklistSection = document.getElementById("modalChecklistSection");
    const checklistList = document.getElementById("modalChecklistList");
    if (checklistSection && checklistList) {
        const checklistData = task.checklist;
        if (checklistData && Object.keys(checklistData).length > 0) {
            checklistList.innerHTML = "";
            Object.values(checklistData).forEach(item => {
                const div = document.createElement("div");
                div.className = "drawer-checklist-item";
                const checkedAttr = item.isChecked ? "checked" : "";
                const checkedClass = item.isChecked ? "checked" : "";
                div.innerHTML = `
                    <input type="checkbox" class="drawer-checklist-checkbox" ${checkedAttr} disabled>
                    <span class="drawer-checklist-title ${checkedClass}">${item.title}</span>
                `;
                checklistList.appendChild(div);
            });
            checklistSection.style.display = "flex";
        } else {
            checklistSection.style.display = "none";
        }
    }

    // Abre o modal
    const backdrop = document.getElementById("detailModalBackdrop");
    if (backdrop) {
        backdrop.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

function closeDetailModal() {
    const backdrop = document.getElementById("detailModalBackdrop");
    if (backdrop) {
        backdrop.classList.remove("active");
        document.body.style.overflow = "";
    }
}
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
    if (themeIcon) {
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
    }

    // Redesenha gráficos com novas cores de legenda e grid
    if (tasksList.length > 0) {
        updateDashboardMetrics();
    }
}

// 10. REGISTRO DE EVENT LISTENERS E INICIALIZAÇÃO NO LOAD
document.addEventListener("DOMContentLoaded", () => {
    // Liga botões das abas superiores
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tabName = btn.getAttribute("data-tab");
            showTab(tabName);
        });
    });

    // Liga alternador de tema
    const themeToggleBtn = document.getElementById("themeToggle");
    if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);

    // Liga filtros de atividades
    const inputsToFilter = ["inputSearch", "filterStatus", "filterPilar", "filterResponsible", "filterPriority"];
    inputsToFilter.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", () => { filterSlaOnly = false; filterTasks(); });
            el.addEventListener("change", () => { filterSlaOnly = false; filterTasks(); });
        }
    });

    // Liga botões do Modal de Detalhes (somente leitura)
    const btnCloseModal = document.getElementById("btnCloseModal");
    if (btnCloseModal) btnCloseModal.addEventListener("click", closeDetailModal);

    const btnCloseModalFooter = document.getElementById("btnCloseModalFooter");
    if (btnCloseModalFooter) btnCloseModalFooter.addEventListener("click", closeDetailModal);

    const detailBackdrop = document.getElementById("detailModalBackdrop");
    if (detailBackdrop) {
        detailBackdrop.addEventListener("click", (e) => {
            if (e.target === detailBackdrop) closeDetailModal();
        });
    }

    // Fecha modal com ESC
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeDetailModal();
    });
    
    // Liga botões de Drill-Down nos cards de métricas superiores
    const metricTotal = document.getElementById("metricCardTotal");
    if (metricTotal) {
        metricTotal.addEventListener("click", () => {
            filterSlaOnly = false;
            document.getElementById("inputSearch").value = "";
            document.getElementById("filterStatus").value = "";
            document.getElementById("filterPilar").value = "";
            document.getElementById("filterResponsible").value = "";
            document.getElementById("filterPriority").value = "";
            filterTasks();
            
            const radarSection = document.querySelector(".radar-operational-section");
            if (radarSection) radarSection.scrollIntoView({ behavior: "smooth" });
        });
    }
    
    const metricCompleted = document.getElementById("metricCardCompleted");
    if (metricCompleted) {
        metricCompleted.addEventListener("click", () => {
            filterSlaOnly = false;
            document.getElementById("inputSearch").value = "";
            document.getElementById("filterStatus").value = "Concluído";
            document.getElementById("filterPilar").value = "";
            document.getElementById("filterResponsible").value = "";
            document.getElementById("filterPriority").value = "";
            filterTasks();
            
            const radarSection = document.querySelector(".radar-operational-section");
            if (radarSection) radarSection.scrollIntoView({ behavior: "smooth" });
        });
    }
    
    const metricProgress = document.getElementById("metricCardProgress");
    if (metricProgress) {
        metricProgress.addEventListener("click", () => {
            filterSlaOnly = false;
            document.getElementById("inputSearch").value = "";
            document.getElementById("filterStatus").value = "Em andamento";
            document.getElementById("filterPilar").value = "";
            document.getElementById("filterResponsible").value = "";
            document.getElementById("filterPriority").value = "";
            filterTasks();
            
            const radarSection = document.querySelector(".radar-operational-section");
            if (radarSection) radarSection.scrollIntoView({ behavior: "smooth" });
        });
    }
    
    const metricSla = document.getElementById("metricCardSla");
    if (metricSla) {
        metricSla.addEventListener("click", () => {
            filterSlaOnly = true; // Ativa filtro especial (Atrasadas + Bloqueadas)
            document.getElementById("inputSearch").value = "";
            document.getElementById("filterStatus").value = "";
            document.getElementById("filterPilar").value = "";
            document.getElementById("filterResponsible").value = "";
            document.getElementById("filterPriority").value = "";
            filterTasks();
            
            const radarSection = document.querySelector(".radar-operational-section");
            if (radarSection) radarSection.scrollIntoView({ behavior: "smooth" });
        });
    }

    // Popula dropdowns e badges com valores padrão iniciais imediatamente
    updateSelectDropdowns();
    renderSettingsBadges();



    // Recupera tema salvo do local storage
    const savedTheme = localStorage.getItem("grc-theme") || "dark";
    if (savedTheme === "light") {
        toggleTheme(); // muda para claro se salvo como tal
    }

    // Inicializa o Firebase
    initFirebase();
});

// Exporta funções globais necessárias para eventos inline ou referências diretas
window.app = {
    showTab,
    filterTasks
};
