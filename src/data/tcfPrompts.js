export const TCF_PROMPTS = {
  ecrite: {
    1: [
      "Tâche 1 (60 a 120 palavras): Você acabou de chegar a Montréal para um curso de francês. Escreva um e-mail para seu amigo francês Maxime descrevendo a cidade, onde você está hospedado e convidando-o para visitá-lo no próximo mês.",
      "Tâche 1 (60 a 120 palavras): Você quer organizar uma festa de despedida para uma colega de trabalho que vai se mudar para Ottawa. Envie uma mensagem aos colegas informando data, local, programação e o que cada um deve levar."
    ],
    2: [
      "Tâche 2 (120 a 150 palavras): Você participou de um festival de inverno em Québec no último fim de semana. Escreva um artigo no seu blog contando como foi a experiência, o que você mais gostou e dando conselhos práticos para quem deseja ir no próximo ano.",
      "Tâche 2 (120 a 150 palavras): Você alugou um carro durante suas férias no Canadá, mas teve diversos problemas mecânicos e com o atendimento. Escreva uma carta formal à agência explicando o ocorrido e solicitando um reembolso parcial."
    ],
    3: [
      "Tâche 3 (120 a 180 palavras): Debate sobre o Teletrabalho. Documento 1 afirma que o trabalho remoto aumenta a produtividade e reduz o estresse no trânsito. Documento 2 alerta que o isolamento prejudica a saúde mental e a integração de novos funcionários. Sintetize os dois pontos de vista (40-60 palavras) e dê sua opinião fundamentada (80-120 palavras).",
      "Tâche 3 (120 a 180 palavras): Proibição do celular nas escolas. Documento 1 defende que melhora a concentração e o convívio. Documento 2 argumenta que é melhor educar para o uso digital responsável. Faça a síntese dos textos e apresente sua argumentação pessoal."
    ]
  },
  orale: {
    1: [
      "Tâche 1 Oral (2 min sem preparação): Apresente-se ao examinador. Fale sobre sua formação, sua profissão atual no Brasil, sua família, seus interesses pessoais e explique por que você está prestando o TCF Canada.",
      "Tâche 1 Oral (2 min sem preparação): Fale sobre sua cidade atual, sua rotina de trabalho, o que você gosta de fazer nos finais de semana e quais são seus planos profissionais no Canadá."
    ],
    2: [
      "Tâche 2 Oral (2 min preparo + 3 min interação): Você acabou de se mudar para uma cidade canadense e quer se inscrever em um clube esportivo municipal. Faça entre 8 e 10 perguntas ao atendente (horários, preços, equipamentos, níveis, descontos familiares).",
      "Tâche 2 Oral (2 min preparo + 3 min interação): Seu colega canadense está vendendo o carro dele antes de mudar de província. Faça perguntas variadas sobre o estado do veículo, quilometragem, pneus de inverno, seguro e condições de pagamento."
    ],
    3: [
      "Tâche 3 Oral (4 min30 sem preparação): 'Pensez-vous que l'apprentissage d'une langue étrangère soit plus facile pour les enfants que pour les adultes ? Pourquoi ?' Estruture sua resposta com introdução, argumentos, exemplos e conclusão.",
      "Tâche 3 Oral (4 min30 sem preparação): 'Selon vous, faut-il privilégier un métier qui offre un bon salaire ou un métier qui nous passionne ?' Defenda seu ponto de vista com conectores de nível B2."
    ]
  }
};

export const TCF_TASK_METAS = {
  ecrite: {
    1: { label: "60 a 120 palavras • Mensagem Cotidiana", seconds: 900 },
    2: { label: "120 a 150 palavras • Relato de Experiência / Carta", seconds: 1200 },
    3: { label: "120 a 180 palavras • Síntese + Opinião Argumentada", seconds: 1500 }
  },
  orale: {
    1: { label: "2 minutos • Apresentação Pessoal sem preparo", seconds: 120 },
    2: { label: "3 minutos • Interação e Perguntas (8 a 10 perguntas)", seconds: 210 },
    3: { label: "4m30s • Defesa de Opinião Nível B2/C1", seconds: 270 }
  }
};
