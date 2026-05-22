# Spread GRC Control — Dashboard Executivo de Governança, Riscos e Conformidade

O **Spread GRC Control** é um aplicativo web estático, moderno e de alta performance projetado para consolidar, gerenciar e auditar atividades de Governança, Riscos e Conformidade (GRC). O sistema oferece um **Dashboard Executivo interativo**, um painel de gerenciamento de atividades (**CRUD**), geração automatizada de **relatórios estratégicos para a Vice-Presidência (VP)** e controle dinâmico de configurações.

Tudo isso com sincronização de banco de dados em tempo real utilizando a nuvem do **Firebase Firestore**.

---

## 🚀 Recursos Principais

1. **Dashboard Executivo Premium:**
   - **Índice de Saúde Geral GRC:** Indicador gráfico baseado no progresso físico médio e cumprimento dos prazos (SLA).
   - **Visão Estratégica Interativa:** Painel com indicadores principais de volume (Total de Tarefas, Concluídas, Em Andamento e SLA).
   - **Gráficos de Desempenho:** Visualizações de distribuição de status e andamento por Pilar de Governança utilizando a biblioteca **Chart.js**.
   - **Marcos Críticos:** Monitoramento automático dos prazos mais curtos ou tarefas em atraso, com cálculo dinâmico de dias restantes.

2. **Registro Geral GRC (CRUD Completo):**
   - Criação, edição e exclusão de atividades diretamente em uma tabela dinâmica moderna.
   - Filtros de alta velocidade por Texto, Status, Pilar, Responsável e Prioridade.
   - **Exportação em Excel (.xlsx):** Geração de relatórios em formato de planilha integrada via **SheetJS (xlsx.full.min.js)**.

3. **Gerador de Reporte do VP (Narrativa de Ciclo):**
   - Motor inteligente que compila e auto-preenche sumários das entregas do ciclo, atividades em andamento, pontos de atenção (bloqueados e atrasados) e próximos passos.
   - Área de edição livre e pré-visualização em tempo real formatada como documento executivo oficial, pronto para copiar ou baixar como texto (`.txt`).

4. **Painel de Configurações Dinâmicas:**
   - Adicione ou remova opções de **Responsáveis** e **Áreas Cliente** diretamente no banco de dados. Os combos e formulários de todo o sistema se atualizam instantaneamente em tempo real.
   - Diagnóstico visual de conexão de nuvem ativa.

---

## 🛠️ Stack Tecnológica

* **Front-End:** HTML5 Semântico, Vanilla CSS3 (Design moderno com variáveis HSL, glassmorphism, suporte nativo a temas Dark/Light e micro-transições fluidas).
* **Lógica:** JavaScript Moderno (ES6+) estruturado com carregamento de módulos (`type="module"`).
* **Banco de Dados:** **Firebase Firestore** (SDK 10.8+ importado via CDN seguro), fornecendo escuta reativa em tempo real (`onSnapshot`).
* **Gráficos:** **Chart.js** (CDN).
* **Exportação de Dados:** **SheetJS (XLSX)** (CDN).

---

## 📁 Estrutura de Arquivos

```bash
├── index.html                  # Interface gráfica e estrutura semântica (SPA)
├── style.css                   # Folha de estilo premium e design system responsivo
├── app.js                      # Motor do aplicativo, integração com Firestore, gráficos e regras de negócio
├── firebase-config.example.js  # Template de credenciais de exemplo do Firebase
├── firebase-config.js          # Credenciais ativas do Firebase (Ignorado no Git por segurança)
└── Relatorio_Atividades_VP.xlsx # Planilha original de atividades do VP
```

---

## 💻 Configuração e Instalação Local

### 1. Clonar o repositório
```bash
git clone https://github.com/mpsgarcia/grc_report.git
cd grc_report
```

### 2. Configurar o Firebase Firestore
Por motivos de segurança, as chaves do Firebase não são enviadas ao repositório público. Siga os passos:

1. Duplique o arquivo `firebase-config.example.js` e renomeie-o para `firebase-config.js`:
   ```bash
   cp firebase-config.example.js firebase-config.js
   ```
2. Abra o arquivo `firebase-config.js` no seu editor e insira as credenciais do seu projeto Firebase:
   ```javascript
   export const firebaseConfig = {
     apiKey: "SUA_API_KEY",
     authDomain: "seu-projeto.firebaseapp.com",
     projectId: "seu-projeto",
     storageBucket: "seu-projeto.firebasestorage.app",
     messagingSenderId: "seu-sender-id",
     appId: "seu-app-id"
   };
   ```

### 3. Rodar a Aplicação
Como o app utiliza JavaScript ES6 Modules (`import`/`export`), o arquivo `index.html` **deve ser executado através de um servidor local** (para evitar erros de CORS do protocolo `file://`).

Você pode rodar usando qualquer um dos métodos abaixo:
* **VS Code:** Instale a extensão **Live Server** e clique em *Go Live*.
* **NodeJS (npm):** Instale um servidor simples globalmente e execute:
  ```bash
  npx http-server ./
  ```
* **Python:** Execute no terminal do projeto:
  ```bash
  python -m http.server 8000
  ```
Abra seu navegador em `http://localhost:8000` (ou na porta configurada).

---

## 🗄️ Carga Semente Automática (Seeding)

Se o banco de dados do seu Firestore estiver conectado e completamente vazio, o **Spread GRC Control possui inteligência de auto-inicialização**. 
Na primeira execução, o app identifica o banco vazio e salva automaticamente as **7 atividades reais** mapeadas da planilha original:
* **AT-001:** Revisão de políticas de acesso lógico (Marcos)
* **AT-002:** Pipeline N8N — notificação de incidentes (Marcos)
* **AT-003:** Comunicação interna sobre auditoria — MEC (Time de Processos)
* **AT-004:** Treinamento de conscientização — DPO (Marcos)
* **AT-005:** Plano de ação corretiva — NC-12 (Time de Processos)
* **AT-006:** Manual SGI integrado — Cláusula 4.1 (Marcos)
* **AT-007:** Coleta de evidências — Anexo A ISO 27001 (Marcos)

As opções dinâmicas padrão de Responsáveis e Áreas Cliente também serão populadas automaticamente na coleção `settings/options`.

---

## 🔒 Boas Práticas de Segurança e Governança

* **Proteção de Credenciais:** Certifique-se de manter o `firebase-config.js` no seu arquivo `.gitignore`.
* **Regras de Segurança do Firestore:** Em produção, configure regras de segurança no console do Firebase para limitar quem pode ler e gravar nas coleções `activities` e `settings` de acordo com a política corporativa de Segurança da Informação.
