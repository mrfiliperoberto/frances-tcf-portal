/**
 * Seed editorial da Newsletter ("Le Courrier Francophone").
 * Cada notícia divide o texto em segmentos mapeados { fr, pt } para leitura interativa com hover e áudio.
 */
export const NEWSLETTER_SEED = [
  {
    id: 'news-1',
    edition: 'Édition N° 42 • Montréal & Québec',
    date: 'Novembre 2026',
    category: 'Société & Innovation',
    level: 'B2',
    readingTime: '2 min',
    isFictional: true,
    headline_fr: "Le Québec accélère l'accueil des talents francophones dans les technologies vertes",
    headline_pt: 'O Québec acelera o acolhimento de talentos francófonos nas tecnologias verdes',
    subheadline_fr:
      "Un nouveau programme provincial facilite l'intégration professionnelle des candidats maîtrisant le français.",
    subheadline_pt:
      'Um novo programa provincial facilita a integração profissional de candidatos que dominam o francês.',
    segments: [
      {
        fr: 'Le gouvernement du Québec',
        pt: 'O governo do Québec'
      },
      {
        fr: 'a annoncé ce matin',
        pt: 'anunciou nesta manhã'
      },
      {
        fr: 'un investissement historique',
        pt: 'um investimento histórico'
      },
      {
        fr: 'destiné aux entreprises écologiques.',
        pt: 'destinado às empresas ecológicas.'
      },
      {
        fr: 'Cette initiative vise à attirer',
        pt: 'Esta iniciativa visa atrair'
      },
      {
        fr: 'des professionnels qualifiés',
        pt: 'profissionais qualificados'
      },
      {
        fr: 'capables de travailler en français',
        pt: 'capazes de trabalhar em francês'
      },
      {
        fr: 'dès leur arrivée au pays.',
        pt: 'desde a sua chegada ao país.'
      },
      {
        fr: 'Selon le ministère de l’Immigration,',
        pt: 'Segundo o Ministério da Imigração,'
      },
      {
        fr: 'la maîtrise de la langue française',
        pt: 'o domínio da língua francesa'
      },
      {
        fr: 'demeure le facteur clé',
        pt: 'permanece sendo o fator-chave'
      },
      {
        fr: "pour une intégration durable et réussie.",
        pt: 'para uma integração duradoura e bem-sucedida.'
      }
    ]
  },
  {
    id: 'news-2',
    edition: 'Édition N° 42 • Culture & Vie Quotidienne',
    date: 'Novembre 2026',
    category: 'Culture & Éducation',
    level: 'B1',
    readingTime: '3 min',
    isFictional: true,
    headline_fr: "Les bibliothèques publiques de Montréal battent un record de fréquentation",
    headline_pt: 'As bibliotecas públicas de Montreal batem recorde de frequência',
    subheadline_fr:
      "Les ateliers de conversation en français et les clubs de lecture attirent des milliers de nouveaux résidents chaque semaine.",
    subheadline_pt:
      'As oficinas de conversação em francês e os clubes de leitura atraem milhares de novos residentes todas as semanas.',
    segments: [
      {
        fr: 'Depuis le début de l’automne,',
        pt: 'Desde o início do outono,'
      },
      {
        fr: 'les espaces culturels montréalais',
        pt: 'os espaços culturais de Montreal'
      },
      {
        fr: 'connaissent un engouement exceptionnel.',
        pt: 'vivenciam um entusiasmo excepcional.'
      },
      {
        fr: 'Chaque soir après le travail,',
        pt: 'Todas as noites após o trabalho,'
      },
      {
        fr: 'des étudiants et des nouveaux arrivants',
        pt: 'estudantes e recém-chegados'
      },
      {
        fr: 'se réunissent gratuitement',
        pt: 'reúnem-se gratuitamente'
      },
      {
        fr: 'pour pratiquer la conversation orale.',
        pt: 'para praticar a conversação oral.'
      },
      {
        fr: '« C’est le meilleur moyen',
        pt: '"É a melhor maneira'
      },
      {
        fr: 'de gagner confiance en soi',
        pt: 'de ganhar autoconfiança'
      },
      {
        fr: 'et de découvrir les expressions québécoises »,',
        pt: 'e de descobrir as expressões québécoises",'
      },
      {
        fr: 'explique une participante enthousiaste,',
        pt: 'explica uma participante entusiasmada,'
      },
      {
        fr: 'arrivée à Montréal l’an dernier.',
        pt: 'que chegou a Montreal no ano passado.'
      }
    ]
  }
];

export default NEWSLETTER_SEED;

