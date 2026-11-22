export const AI_TOPICS = [
  {
    stage: "Etapa 3 • Vida Real no Canadá",
    title: "Alugando um apartamento 3 ½ em Montréal",
    starter: "Bonjour ! Je vous appelle au sujet de l'annonce pour l'appartement 3 ½ près du métro Jean-Talon. Est-il toujours disponible ?"
  },
  {
    stage: "Etapa 2 • Rotina & Projetos",
    title: "Por que você escolheu imigrar para o Canadá?",
    starter: "J'ai choisi le Canada parce que c'est un pays sécuritaire qui offre d'excellentes opportunités professionnelles."
  },
  {
    stage: "Etapa 4 • Debate TCF Tâche 3",
    title: "Viver em uma grande metrópole (Montréal) ou no interior?",
    starter: "À mon avis, vivre dans une ville moyenne permet d'avoir une meilleure qualité de vie, bien que les grandes métropoles offrent plus d'emplois."
  },
  {
    stage: "Etapa 5 • Simulação TCF Tâche 2",
    title: "Inscrevendo seu filho em um acampamento de verão canadense",
    starter: "Bonjour ! Je souhaiterais inscrire mon enfant à votre camp d'été. Pourriez-vous me donner des informations sur les activités proposées ?"
  }
];

export const AI_STAGES = [
  {
    id: 1,
    title: "Ouvir e Repetir",
    tag: "A1 Zero",
    color: "rose",
    desc: "Frases curtas de sobrevivência com pronúncia guiada.",
    prompt: "O aluno está na Etapa 1 (Iniciante Zero). Peça para ele repetir ou completar uma frase curta em francês, explique o significado em português e elogie."
  },
  {
    id: 2,
    title: "Perguntas Simples",
    tag: "A1-A2",
    color: "blue",
    desc: "Responda com 1 ou 2 frases sobre sua rotina e gostos.",
    prompt: "O aluno está na Etapa 2 (Perguntas Simples A1/A2). Corrija gentilmente qualquer erro em português em 1 linha, e depois responda e faça UMA pergunta simples sobre a rotina dele em francês."
  },
  {
    id: 3,
    title: "Situações no Canadá",
    tag: "A2-B1",
    color: "emerald",
    desc: "Roleplay: Tim Hortons, aluguel em Montréal, imigração.",
    prompt: "O aluno está na Etapa 3 (Situações do Dia a Dia no Canadá A2/B1). Simule um diálogo realista no Canadá (ex: café, imigração, trabalho, aluguel). Corrija eventuais erros em português brevemente e siga o diálogo em francês."
  },
  {
    id: 4,
    title: "Opinião & Debate",
    tag: "B1-B2",
    color: "amber",
    desc: "Use conectores (cependant, en revanche) para defender ideias.",
    prompt: "O aluno está na Etapa 4 (Opinião e Debate B1/B2). Corrija erros, sugira 1 conector sofisticado (ex: toutefois, en outre) e faça uma pergunta de debate em francês."
  },
  {
    id: 5,
    title: "Nível Prova TCF",
    tag: "B2 TCF",
    color: "purple",
    desc: "Simulação de entrevista oficial Tâche 1, 2 e 3 sem pausas.",
    prompt: "O aluno está na Etapa 5 (Nível Prova TCF Canada B2). Aja como examinadora oficial do TCF Canada. Avalie rapidamente a frase dele (indicando se soa NCLC 5, 7 ou 8+) e continue a entrevista em francês."
  }
];
