export const LESSONS_DATA = [
  {
    id: 1,
    level: "A1",
    week: "Semana 1",
    title: "Apresentação Impecável (Tâche 1 Oral)",
    duration: "15 min",
    summary: "Como se apresentar em 2 minutos falando de profissão, família, hobbies e projeto de imigração para o Canadá.",
    explanation: `Na Tâche 1 da Expressão Oral do TCF Canada, o examinador pede para você se apresentar por cerca de 2 minutos sem interrupção. O segredo para não travar desde a primeira semana é seguir o roteiro P.P.F. (Presente → Passado → Futuro no Canadá).`,
    examples: [
      { fr: "Je m'appelle Lucas, j'ai trente-deux ans et je suis ingénieur informatique au Brésil.", pt: "Meu nome é Lucas, tenho 32 anos e sou engenheiro de computação no Brasil." },
      { fr: "Actuellement, j'apprends le français parce que j'ai le projet de m'installer au Canada avec ma famille.", pt: "Atualmente, aprendo francês porque tenho o projeto de me instalar no Canadá com minha família." },
      { fr: "Pendant mon temps libre, j'aime faire de la randonnée et cuisiner.", pt: "Durante meu tempo livre, gosto de fazer trilhas e cozinhar." }
    ],
    quiz: {
      question: "Como você diz em francês natural: 'Tenho o projeto de me instalar no Canadá'?",
      options: [
        "J'ai le projet de m'installer au Canada.",
        "Je suis projet pour habiter en Canada.",
        "J'ai une idée d'aller dans le Canada."
      ],
      correct: 0
    }
  },
  {
    id: 2,
    level: "A1",
    week: "Semana 2",
    title: "Sons Nasais & Regras de Ouro da Pronúncia",
    duration: "12 min",
    summary: "Domine os sons AN/EN, ON, IN e o R francês sem sofrer com regras intermináveis.",
    explanation: `Em francês, muitas letras finais não são pronunciadas (lembre-se da palavra C-a-R-e-F-u-L: geralmente só essas consoantes soam no final). Além disso, combinações como OU têm som de "U" (bonjour), enquanto o U sozinho é feito com bico de "U" dizendo "I" (tu, rue).`,
    examples: [
      { fr: "Je prends un croissant et un café au lait tous les matins.", pt: "Eu tomo um croissant e um café com leite todas as manhãs." },
      { fr: "Vous habitez dans quel quartier de la ville de Québec ?", pt: "Você mora em qual bairro da cidade de Québec?" }
    ],
    quiz: {
      question: "Na palavra 'Beaucoup' (muito), como soam os grupos de vogais 'EAU' e 'OU'?",
      options: [
        "EAU soa como 'Ô' fechada e OU soa como 'U' ([Bô-cu]).",
        "Pronuncia-se exatamente cada letra: Bê-a-u-cô-u-p.",
        "O 'P' final deve ser fortemente pronunciado."
      ],
      correct: 0
    }
  },
  {
    id: 3,
    level: "A2",
    week: "Semana 4",
    title: "A Arte de Fazer Perguntas Formais (Tâche 2)",
    duration: "18 min",
    summary: "As 3 estruturas essenciais para fazer 8 a 10 perguntas perfeitas no TCF Canada sem repetir sempre 'Est-ce que'.",
    explanation: `Na Tâche 2 do TCF, você é avaliado pela variedade das suas perguntas. Se você usar apenas "C'est combien ?", sua nota fica presa no A2. Para atingir B1/B2, alterne entre Pourriez-vous me dire..., Est-ce qu'il est possible de... e inversão simples.`,
    examples: [
      { fr: "Pourriez-vous m'indiquer quels sont les horaires d'ouverture ?", pt: "Você poderia me indicar quais são os horários de funcionamento?" },
      { fr: "Est-ce que le chauffage et l'électricité sont inclus dans le loyer ?", pt: "O aquecimento e a eletricidade estão incluídos no aluguel?" },
      { fr: "Y a-t-il une station de métro à proximité de l'appartement ?", pt: "Há uma estação de metrô próxima ao apartamento?" }
    ],
    quiz: {
      question: "Qual destas perguntas tem registro formal ideal para garantir pontos altos na Tâche 2?",
      options: [
        "C'est combien le prix ?",
        "Pourriez-vous me préciser si une réduction est offerte aux nouveaux inscrits ?",
        "Tu as rabais pour moi ?"
      ],
      correct: 1
    }
  },
  {
    id: 4,
    level: "B1",
    week: "Semana 8",
    title: "Passé Composé vs Imparfait (Contando Experiências)",
    duration: "20 min",
    summary: "Como narrar sua trajetória profissional e contar histórias no passado com precisão.",
    explanation: `Use o Imparfait (j'avais, j'étais, je travaillais) para descrever o cenário ou um hábito antigo no Brasil. Use o Passé Composé (j'ai décidé, j'ai obtenu, je suis allé) para ações pontuais e concluídas.`,
    examples: [
      { fr: "Quand j'habitais à São Paulo, je travaillais dans une banque, mais l'année dernière j'ai décidé de changer de carrière.", pt: "Quando eu morava em São Paulo, trabalhava em um banco, mas no ano passado decidi mudar de carreira." },
      { fr: "J'ai obtenu mon diplôme universitaire en 2019 et j'ai acquis cinq ans d'expérience.", pt: "Obtive meu diploma universitário em 2019 e adquiri cinco anos de experiência." }
    ],
    quiz: {
      question: "Complete corretamente: 'Hier soir, nous _______ (aller) au cinéma.'",
      options: [
        "nous avons allé",
        "nous sommes allés (verbos de movimento usam auxiliar ÊTRE)",
        "nous allions"
      ],
      correct: 1
    }
  },
  {
    id: 5,
    level: "B2",
    week: "Semana 14",
    title: "Subjonctif & Argumentação NCLC 7+ (Tâche 3)",
    duration: "25 min",
    summary: "Estruturas avançadas que os corretores do TCF procuram para atribuir nível B2/C1.",
    explanation: `Para tirar NCLC 7 ou superior (10/20 a 15/20) na Expressão Escrita e Oral, você precisa demonstrar domínio do Subjonctif após expressões de necessidade ou dúvida (Il faut que, Bien que, Pour que) e organizar o discurso em Introdução, 2 Argumentos com exemplos e Conclusão.`,
    examples: [
      { fr: "Bien que le télétravail offre une grande flexibilité, il est indispensable que les entreprises maintiennent le lien social.", pt: "Embora o teletrabalho ofereça grande flexibilidade, é indispensável que as empresas mantenham o vínculo social." },
      { fr: "Je doute que cette solution soit suffisante à long terme sans l'aide du gouvernement.", pt: "Duvido que esta solução seja suficiente a longo prazo sem a ajuda do governo." }
    ],
    quiz: {
      question: "Qual forma completa corretamente a frase B2: 'Bien que cette technologie _____ très utile...'?",
      options: [
        "est (Indicativo)",
        "soit (Subjuntivo do verbo être após 'bien que')",
        "sera (Futuro)"
      ],
      correct: 1
    }
  }
];
