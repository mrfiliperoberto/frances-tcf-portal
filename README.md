# 🍁 Do Zero ao Canadá — Portal Francês A1–B2 & Simulador TCF Canada

> **Plataforma PWA de estudo acelerado de Francês Canadense e preparação intensiva para o exame oficial TCF Canada (meta NCLC 7+ para Express Entry e Mobilidade Francófona).**

---

## 🎯 Visão Geral do Projeto

O portal **Do Zero ao Canadá** foi projetado para eliminar a sobrecarga de materiais dispersos e guiar falantes de português desde os fundamentos do francês (**A1**) até a proficiência intermediária-avançada (**B2 / C1**), exigida pelos programas de imigração canadenses (**Express Entry** e ** Québec**).

A aplicação funciona como um **Progressive Web App (PWA)** offline-first com persistência local em **IndexedDB (Dexie.js)** e integração multimodal em tempo real com **Google Gemini API** para avaliação fonética de áudio bruto, conversação interativa e geração dinâmica de simulados.

---

## 🚀 Principais Funcionalidades

### 1. 🧠 Sistema de Repetição Espaçada SuperMemo SM-2 + Caderno de Erros Automático
- Implementação matemática oficial do algoritmo **SuperMemo SM-2** (`repetition`, `interval`, `easeFactor` e `nextReviewDate`) persistido em **IndexedDB**.
- Quatro níveis de avaliação (*Errei*, *Difícil*, *Bom*, *Fácil*) com cálculo preditivo do próximo intervalo diretamente nos botões.
- **Caderno de Erros Automático**: qualquer correção gramatical ou expressão de alto valor gerada pela IA na tutora ou nos simulados pode ser convertida com 1 clique (`⚡ Salvar no Deck SM-2`) em um novo flashcard agendado para revisão.

### 2. 👩‍🏫 Prof. Camille 24h — Tutora IA Multimodal em 5 Etapas
- Conversação progressiva em 5 níveis pedagógicos (desde frases mistas PT/FR na Etapa 1 até simulação rigorosa de entrevista NCLC 7+ na Etapa 5).
- **Entrada Multimodal**: suporta chat em texto, ditado por reconhecimento de voz (`Web Speech API`) e **envio de áudio bruto (`MediaRecorder API`)** com transcrição fiel palavra por palavra e dicas fonéticas personalizadas.

### 3. 🏆 Simulador Completo TCF Canada — As 4 Provas Oficiais
- **Compréhension Orale (CO)**: geração dinâmica de diálogos e situações auditivas (A1 a C1) reproduzidas via TTS francófono (`fr-CA` / `fr-FR`) com questões de múltipla escolha (`A`, `B`, `C`, `D`).
- **Compréhension Écrite (CE)**: geração de documentos autênticos (ofertas de emprego no Québec, e-mails corporativos, artigos de imigração e editoriais) com cronômetro rigoroso por questão.
- **Escala Oficial IRCC (330 a 699 pontos)**: cálculo automático de pontuação ponderada para CO e CE com conversão direta para os níveis **NCLC 4 a NCLC 10**.
- **Expression Orale (EO) & Expression Écrite (EE)**: simulador das *Tâches 1, 2 e 3* avaliadas de **0 a 20 pontos**, incluindo o card exclusivo **Raio-X de Pronúncia Francesa** (diagnóstico dos 4 pilares: *Vogais Nasais*, *Liaisons & Elisões*, *Ritmo & Entonação* e *R Uvular*) e reescrita modelo padrão **NCLC 8+**.

### 4. 🎙️ Shadowing Studio — Treino de Pronúncia e Ritmo ("Dual Player")
- Seleção de frases estratégicas (A1 ao B2) focadas nas maiores armadilhas fonéticas para brasileiros, com guia visual de *liaisons* (`‿`).
- **Interface Dual Player**: permite ouvir a referência nativa em velocidade normal (`1.0x`) ou reduzida (`0.75x`), gravar a própria voz imediatamente e reproduzir ambas lado a lado para comparar cadência e entonação.
- **Micro-Correction via Gemini**: análise cirúrgica apontando exatamente em quais palavras ou *liaisons* da frase-alvo o aluno acertou ou precisa ajustar, acompanhada de um *Pronunciation Score* (`0–100`).

### 5. 📚 Trilha A1–B2, Expressões do Québec & Planejador NCLC
- Micro-aulas estruturadas com áudio nativo e vocabulário autêntico do Québec (*courriel*, *magasiner*, *char*, *chum/blonde*, *avoir bien hâte*).
- Calculadora interativa de previsão realista para atingir **NCLC 5** e **NCLC 7+** com base na dedicação semanal.

### 6. 🍁 Alerta de Vagas (Bônus)
- Feed diário no estilo canal de Telegram, com vagas de **estágio e entry level** em atendimento/Customer Success, desenvolvimento e marketing.
- Fontes: páginas de carreira de **106 empresas com sede no Canadá** (Greenhouse, Lever, Ashby, SmartRecruiters, Workable, BambooHR, Recruitee, Breezy), **Job Bank Canada**, **Google Jobs** (opcional), Himalayas, Jobicy e Remotive — sempre com link para o anúncio original.
- Etiquetas de elegibilidade: 🟢 remoto aberto ao Brasil, 🟡 Mobilidade Francófona / patrocínio de visto, 🔴 exige autorização; e 🧳 **Relocation** quando o anúncio oferece ajuda com mudança.
- O currículo colado no Perfil fica **só no aparelho**; o servidor (`/api/jobs`) não recebe nada pessoal.
- **Google Jobs (opcional):** crie uma chave gratuita no [SerpApi](https://serpapi.com) (250 buscas/mês) e defina `SERPAPI_KEY` em `.env.local` (dev e app desktop) e em *Vercel → Project Settings → Environment Variables* (site). Sem prefixo `VITE_`: a chave nunca vai para o navegador.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
| :--- | :--- |
| **Front-end & UI** | React 19, Vite 6, Tailwind CSS 3, Framer Motion, Lucide React |
| **Banco de Dados Local** | IndexedDB via **Dexie.js** (`flashcards`, `errorLogs`, `tcfHistory`) |
| **Inteligência Artificial** | Google Gemini API Multimodal (Texto, JSON Schema Estruturado e Áudio Nativo `inlineData` Base64) |
| **Áudio & Fala** | `MediaRecorder API` (gravação de voz real) + `Web Speech API` (`SpeechSynthesis` & `SpeechRecognition` `fr-CA` / `fr-FR`) |
| **PWA & Offline** | `vite-plugin-pwa` + Workbox Service Worker + Web App Manifest instalável |

---

## ⚙️ Como Executar Localmente

1. **Clone o repositório e instale as dependências:**
   ```bash
   git clone <url-do-repositorio>
   cd frances-tcf-portal
   npm install
   ```

2. **Configure a chave da API Gemini (Opcional — possui modo simulado inteligente):**
   Abra o app, clique em ⚙️ **IA** na barra lateral e cole a **sua chave pessoal** do Google AI Studio.

   > ⚠️ **Não use `VITE_GEMINI_API_KEY` no `.env`.** Variáveis `VITE_*` são embutidas no JavaScript
   > público do `dist/`. A chave pessoal fica no `localStorage` deste navegador, que **não** é um cofre
   > secreto (extensões ou scripts na mesma origem conseguem lê-la). Use uma chave só sua, com cota
   > limitada e, se possível, restrita por HTTP referrer no Google Cloud Console.

   **Versão multiusuário (futuro):** o navegador não deve falar direto com o Gemini. A arquitetura
   recomendada é uma função de servidor (ex.: Vercel Function `/api/gemini`) que guarda a credencial
   em variável **sem** prefixo `VITE_`, exige autenticação do usuário, aplica limite de requisições
   por usuário, valida o payload (tamanho do áudio, modelo permitido) e só repassa a chamada.

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:5173`.

4. **Gere o build de produção + Manifesto PWA e Service Worker:**
   ```bash
   npm run build
   npm run preview
   ```

---

## 📂 Estrutura de Diretórios

```text
src/
├── components/
│   ├── common/          # Toast, SettingsModal (Configuração e teste de conexão Gemini)
│   └── layout/          # Navbar (com botão Instalar App PWA) e Sidebar responsiva
├── data/                # Flashcards iniciais, aulas A1-B2, temas TCF e frases de Shadowing
├── features/
│   ├── today/           # Rotina diária, KPIs, Calculadora NCLC e Deck SM-2
│   ├── flashcards/      # Motor visual de cartões com 4 níveis SuperMemo SM-2
│   ├── ai-tutor/        # Prof. Camille 24h (Texto + Áudio Multimodal)
│   ├── shadowing/       # Shadowing Studio (Dual Player + Micro-Correction Fonética)
│   ├── lessons/         # Trilha A1-B2 e Expressões Canadenses
│   └── tcf-simulator/   # Simulador 4 Provas: CO, CE, EO e EE
├── hooks/               # useFrenchAudio (TTS/STT) e useAudioRecorder (MediaRecorder)
└── services/            # db.js (Dexie IndexedDB), sm2Algorithm.js e geminiService.js
```

---

Desenvolvido por Filipe Roberto

