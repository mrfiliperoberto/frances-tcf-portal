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
  },
  {
    id: 'news-3',
    edition: 'Édition N° 43 • Vie Quotidienne',
    date: 'Juin 2026',
    category: 'Vie Quotidienne',
    level: 'A2',
    readingTime: '2 min',
    isFictional: true,
    headline_fr: '1er juillet : Montréal se prépare au grand jour du déménagement',
    headline_pt: '1º de julho: Montreal se prepara para o grande dia da mudança',
    subheadline_fr:
      'Des milliers de locataires changent de logement le même jour. Voici quelques conseils simples.',
    subheadline_pt:
      'Milhares de inquilinos mudam de casa no mesmo dia. Confira algumas dicas simples.',
    segments: [
      { fr: 'Au Québec, le 1er juillet,', pt: 'No Québec, o 1º de julho' },
      { fr: 'c’est le jour du déménagement.', pt: 'é o dia da mudança.' },
      { fr: 'Beaucoup de baux finissent le 30 juin.', pt: 'Muitos contratos de aluguel terminam em 30 de junho.' },
      { fr: 'Dans les rues de Montréal,', pt: 'Nas ruas de Montreal,' },
      { fr: 'il y a des camions partout.', pt: 'há caminhões por toda parte.' },
      { fr: 'Les voisins s’aident avec les boîtes', pt: 'Os vizinhos se ajudam com as caixas' },
      { fr: 'et les gros meubles.', pt: 'e com os móveis pesados.' },
      { fr: '« Réservez votre camion très tôt »,', pt: '“Reserve o caminhão bem cedo”,' },
      { fr: 'conseille Josée Lavoie, de Rosemont.', pt: 'aconselha Josée Lavoie, moradora de Rosemont.' },
      { fr: '« En juin, il n’en reste plus ! »', pt: '“Em junho, não sobra nenhum!”' },
      { fr: 'La Ville rappelle aussi une règle :', pt: 'A Prefeitura também lembra uma regra:' },
      { fr: 'vérifiez l’horaire de collecte des encombrants', pt: 'confira o horário de coleta de móveis e objetos volumosos' },
      { fr: 'avant de laisser un meuble dehors.', pt: 'antes de deixar um móvel na rua.' },
      { fr: 'Après le déménagement, n’oubliez pas', pt: 'Depois da mudança, não se esqueça' },
      { fr: 'de changer votre adresse', pt: 'de atualizar o seu endereço' },
      { fr: 'auprès de la SAAQ et de la RAMQ.', pt: 'na SAAQ (habilitação) e na RAMQ (plano de saúde).' }
    ]
  },
  {
    id: 'news-4',
    edition: 'Édition N° 44 • Opinion',
    date: 'Décembre 2026',
    category: 'Chronique',
    level: 'B2',
    readingTime: '4 min',
    isFictional: true,
    headline_fr: 'Chronique : apprivoiser son premier hiver québécois',
    headline_pt: 'Crônica: como domar o seu primeiro inverno no Québec',
    subheadline_fr:
      'Pneus d’hiver, déneigement, poudrerie : notre chroniqueur livre ses conseils aux nouveaux arrivants.',
    subheadline_pt:
      'Pneus de inverno, remoção de neve, nevasca com vento: nosso colunista dá conselhos aos recém-chegados.',
    segments: [
      { fr: 'Bien que l’hiver fasse peur', pt: 'Embora o inverno assuste' },
      { fr: 'à bien des nouveaux arrivants,', pt: 'muitos recém-chegados,' },
      { fr: 'il serait dommage qu’il devienne', pt: 'seria uma pena que ele virasse' },
      { fr: 'une simple épreuve d’endurance.', pt: 'uma simples prova de resistência.' },
      { fr: 'Encore faut-il s’y préparer.', pt: 'Mas, para isso, é preciso se preparar.' },
      { fr: 'Du 1er décembre au 15 mars,', pt: 'De 1º de dezembro a 15 de março,' },
      { fr: 'les pneus d’hiver sont obligatoires', pt: 'os pneus de inverno são obrigatórios' },
      { fr: 'sur les routes du Québec.', pt: 'nas estradas do Québec.' },
      { fr: 'En ville, mieux vaut surveiller', pt: 'Na cidade, é melhor ficar de olho' },
      { fr: 'les panneaux temporaires de déneigement :', pt: 'nas placas temporárias de remoção de neve:' },
      { fr: 'une voiture mal garée', pt: 'um carro estacionado no lugar errado' },
      { fr: 'risque d’être remorquée pendant la nuit.', pt: 'corre o risco de ser guinchado durante a noite.' },
      { fr: 'Néanmoins, l’hiver ne se résume pas', pt: 'Ainda assim, o inverno não se resume' },
      { fr: 'à la pelle et à la sloche.', pt: 'à pá e à neve derretida na rua.' },
      { fr: 'Patiner au parc La Fontaine,', pt: 'Patinar no parque La Fontaine,' },
      { fr: 'glisser en famille', pt: 'descer de trenó em família' },
      { fr: 'ou partager une soupe aux pois', pt: 'ou dividir uma sopa de ervilha' },
      { fr: 'fait aussi partie de l’expérience.', pt: 'também faz parte da experiência.' },
      { fr: 'Pour peu qu’on s’habille en pelures d’oignon,', pt: 'Desde que a gente se vista em camadas,' },
      { fr: 'avec tuque et mitaines,', pt: 'com touca e luvas grossas,' },
      { fr: 'le froid devient supportable.', pt: 'o frio fica suportável.' },
      { fr: 'Dès lors, la vraie question n’est plus', pt: 'Sendo assim, a verdadeira questão já não é' },
      { fr: 'de savoir s’il fera froid,', pt: 'saber se vai fazer frio,' },
      { fr: 'mais comment en profiter.', pt: 'mas como aproveitá-lo.' }
    ]
  },
  {
    id: 'news-5',
    edition: 'Édition N° 45 • Culture & Traditions',
    date: 'Mars 2026',
    category: 'Traditions',
    level: 'A2',
    readingTime: '2 min',
    isFictional: true,
    headline_fr: 'Le temps des sucres commence dans les Cantons-de-l’Est',
    headline_pt: 'A temporada do xarope de bordo começa nos Cantons-de-l’Est',
    subheadline_fr:
      'Les cabanes à sucre de la région de Sherbrooke ouvrent leurs portes aux familles.',
    subheadline_pt:
      'As cabanas de açúcar da região de Sherbrooke abrem as portas para as famílias.',
    segments: [
      { fr: 'Au printemps, quand la neige fond,', pt: 'Na primavera, quando a neve derrete,' },
      { fr: 'on récolte l’eau d’érable.', pt: 'colhe-se a seiva do bordo.' },
      { fr: 'C’est le début du temps des sucres.', pt: 'É o início da temporada do açúcar de bordo.' },
      { fr: 'Près de Sherbrooke, les cabanes à sucre', pt: 'Perto de Sherbrooke, as cabanas de açúcar' },
      { fr: 'accueillent les familles chaque fin de semaine.', pt: 'recebem as famílias todo fim de semana.' },
      { fr: 'Au menu : soupe aux pois,', pt: 'No cardápio: sopa de ervilha,' },
      { fr: 'fèves au lard, jambon et crêpes.', pt: 'feijão cozido com toucinho, presunto e panquecas.' },
      { fr: 'On mange tout avec du sirop d’érable !', pt: 'Come-se tudo com xarope de bordo!' },
      { fr: 'Après le repas, les enfants courent dehors', pt: 'Depois da refeição, as crianças correm lá para fora' },
      { fr: 'pour la tire sur la neige.', pt: 'para provar o caramelo de bordo na neve.' },
      { fr: 'On verse le sirop chaud sur la neige', pt: 'Despeja-se o xarope quente na neve' },
      { fr: 'et on le roule sur un bâton.', pt: 'e enrola-se o caramelo num palito.' },
      { fr: '« C’est notre tradition préférée »,', pt: '“É a nossa tradição preferida”,' },
      { fr: 'dit Martin Bélanger, père de trois enfants.', pt: 'diz Martin Bélanger, pai de três crianças.' },
      { fr: 'Pensez à réserver : c’est souvent complet !', pt: 'Lembre-se de reservar: muitas vezes está lotado!' }
    ]
  },
  {
    id: 'news-6',
    edition: 'Édition N° 46 • Dernière Heure',
    date: 'Janvier 2026',
    category: 'Actualité',
    level: 'B1',
    readingTime: '3 min',
    isFictional: true,
    headline_fr: 'Verglas en Outaouais : des milliers de foyers privés d’électricité',
    headline_pt: 'Chuva congelante no Outaouais: milhares de residências sem energia',
    subheadline_fr:
      'Hydro-Québec mobilise ses équipes pour rétablir le courant à Gatineau et dans les environs.',
    subheadline_pt:
      'A Hydro-Québec mobiliza suas equipes para restabelecer a energia em Gatineau e arredores.',
    segments: [
      { fr: 'Une tempête de verglas a frappé', pt: 'Uma tempestade de chuva congelante atingiu' },
      { fr: 'la région de Gatineau cette nuit.', pt: 'a região de Gatineau nesta madrugada.' },
      { fr: 'Sous le poids de la glace,', pt: 'Com o peso do gelo,' },
      { fr: 'plusieurs branches sont tombées sur les fils électriques.', pt: 'vários galhos caíram sobre os fios elétricos.' },
      { fr: 'Ce matin, des milliers de foyers', pt: 'Nesta manhã, milhares de residências' },
      { fr: 'étaient encore privés de courant.', pt: 'ainda estavam sem energia.' },
      { fr: 'Selon Hydro-Québec, les équipes travaillent', pt: 'Segundo a Hydro-Québec, as equipes trabalham' },
      { fr: 'depuis les premières heures de la tempête.', pt: 'desde as primeiras horas da tempestade.' },
      { fr: 'La société d’État demande aux citoyens', pt: 'A empresa estatal pede aos moradores' },
      { fr: 'de patienter et de rester prudents.', pt: 'que tenham paciência e sejam prudentes.' },
      { fr: 'Il ne faut jamais s’approcher', pt: 'Nunca se deve chegar perto' },
      { fr: 'd’un fil tombé au sol.', pt: 'de um fio caído no chão.' },
      { fr: 'Les pompiers rappellent aussi', pt: 'Os bombeiros também lembram' },
      { fr: 'qu’on ne doit pas utiliser de barbecue', pt: 'que não se deve usar churrasqueira' },
      { fr: 'ou de génératrice à l’intérieur :', pt: 'nem gerador dentro de casa:' },
      { fr: 'le monoxyde de carbone est mortel.', pt: 'o monóxido de carbono é mortal.' },
      { fr: 'La Ville a ouvert un centre d’hébergement', pt: 'A Prefeitura abriu um abrigo temporário' },
      { fr: 'pour les familles qui ont froid.', pt: 'para as famílias que estão passando frio.' },
      { fr: 'On peut suivre la situation', pt: 'Dá para acompanhar a situação' },
      { fr: 'sur le site Info-pannes d’Hydro-Québec.', pt: 'no site Info-pannes da Hydro-Québec.' }
    ]
  },
  {
    id: 'news-7',
    edition: 'Édition N° 47 • Entrevue',
    date: 'Septembre 2026',
    category: 'Éducation',
    level: 'B1',
    readingTime: '3 min',
    isFictional: true,
    headline_fr: '« J’ai appris le français en dix mois » : rencontre avec une nouvelle Québécoise',
    headline_pt: '“Aprendi francês em dez meses”: encontro com uma nova quebequense',
    subheadline_fr:
      'Arrivée du Brésil, Camila Rocha raconte son parcours en francisation à Québec.',
    subheadline_pt:
      'Vinda do Brasil, Camila Rocha conta como aprendeu francês nos cursos para imigrantes na cidade de Québec.',
    segments: [
      { fr: '— Camila, pourquoi avez-vous choisi Québec ?', pt: '— Camila, por que você escolheu a cidade de Québec?' },
      { fr: '— Mon mari a trouvé un emploi ici.', pt: '— Meu marido conseguiu um emprego aqui.' },
      { fr: 'Au début, je ne parlais pas', pt: 'No começo, eu não falava' },
      { fr: 'un seul mot de français.', pt: 'uma única palavra de francês.' },
      { fr: '— Comment avez-vous appris si vite ?', pt: '— Como você aprendeu tão rápido?' },
      { fr: '— J’ai suivi les cours de Francisation Québec.', pt: '— Fiz os cursos da Francisation Québec.' },
      { fr: 'Les cours étaient gratuits,', pt: 'As aulas eram gratuitas,' },
      { fr: 'et j’étudiais cinq jours par semaine.', pt: 'e eu estudava cinco dias por semana.' },
      { fr: 'Le soir, je regardais des séries québécoises', pt: 'À noite, eu assistia a séries quebequenses' },
      { fr: 'avec les sous-titres en français.', pt: 'com legendas em francês.' },
      { fr: '— Qu’est-ce qui a été le plus difficile ?', pt: '— O que foi mais difícil?' },
      { fr: '— L’accent et les expressions !', pt: '— O sotaque e as expressões!' },
      { fr: 'Mes voisins disaient « char » pour « voiture »', pt: 'Meus vizinhos diziam “char” em vez de “voiture” (carro)' },
      { fr: 'et « dépanneur » pour la petite épicerie.', pt: 'e “dépanneur” para a lojinha de conveniência.' },
      { fr: '— Quel conseil donnez-vous aux nouveaux arrivants ?', pt: '— Que conselho você dá aos recém-chegados?' },
      { fr: '— N’ayez pas peur de faire des erreurs.', pt: '— Não tenham medo de errar.' },
      { fr: 'Les Québécois sont patients', pt: 'Os quebequenses são pacientes' },
      { fr: 'quand on fait l’effort de parler français.', pt: 'quando a gente se esforça para falar francês.' },
      { fr: 'Aujourd’hui, je travaille dans une garderie.', pt: 'Hoje, trabalho numa creche.' }
    ]
  },
  {
    id: 'news-8',
    edition: 'Édition N° 48 • Acadie',
    date: 'Août 2026',
    category: 'Culture',
    level: 'B1',
    readingTime: '3 min',
    isFictional: true,
    headline_fr: 'À Moncton, le Tintamarre fait vibrer l’Acadie',
    headline_pt: 'Em Moncton, o Tintamarre faz a Acádia vibrar',
    subheadline_fr:
      'Le 15 août, Fête nationale de l’Acadie, des milliers de personnes ont défilé en faisant du bruit.',
    subheadline_pt:
      'Em 15 de agosto, Festa Nacional da Acádia, milhares de pessoas desfilaram fazendo barulho.',
    segments: [
      { fr: 'Casseroles, klaxons, tambours et trompettes :', pt: 'Panelas, buzinas, tambores e trompetes:' },
      { fr: 'le 15 août, Moncton était très bruyante.', pt: 'em 15 de agosto, Moncton estava muito barulhenta.' },
      { fr: 'C’était le jour du Tintamarre,', pt: 'Era o dia do Tintamarre,' },
      { fr: 'la grande fête des Acadiens.', pt: 'a grande festa dos acadianos.' },
      { fr: 'Le bruit commence à 17 h 55 précises.', pt: 'O barulho começa às 17h55 em ponto.' },
      { fr: 'Les participants étaient habillés', pt: 'Os participantes estavam vestidos' },
      { fr: 'aux couleurs du drapeau acadien,', pt: 'com as cores da bandeira acadiana,' },
      { fr: 'tricolore avec une étoile dorée.', pt: 'tricolor com uma estrela dourada.' },
      { fr: 'Le Tintamarre rappelle que les Acadiens', pt: 'O Tintamarre lembra que os acadianos' },
      { fr: 'sont toujours là et bien vivants,', pt: 'continuam presentes e bem vivos,' },
      { fr: 'malgré la Déportation de 1755.', pt: 'apesar da Deportação de 1755.' },
      { fr: 'Le Nouveau-Brunswick est la seule province', pt: 'O Novo Brunswick é a única província' },
      { fr: 'officiellement bilingue du Canada.', pt: 'oficialmente bilíngue do Canadá.' },
      { fr: 'À Moncton, on entend souvent le chiac,', pt: 'Em Moncton, ouve-se muito o chiac,' },
      { fr: 'un mélange de français et d’anglais.', pt: 'uma mistura de francês e inglês.' },
      { fr: '« Ici, on parle français à notre manière »,', pt: '“Aqui, a gente fala francês do nosso jeito”,' },
      { fr: 'explique Nadine LeBlanc, une enseignante.', pt: 'explica Nadine LeBlanc, que é professora.' },
      { fr: 'Pour les visiteurs, c’est une belle occasion', pt: 'Para os visitantes, é uma ótima oportunidade' },
      { fr: 'de découvrir une autre francophonie canadienne.', pt: 'de conhecer outra francofonia canadense.' }
    ]
  },
  {
    id: 'news-9',
    edition: 'Édition N° 49 • Santé',
    date: 'Octobre 2026',
    category: 'Santé',
    level: 'B1',
    readingTime: '3 min',
    isFictional: true,
    headline_fr: 'Malade un dimanche ? Le 811 avant l’urgence',
    headline_pt: 'Doente num domingo? Ligue para o 811 antes de ir ao pronto-socorro',
    subheadline_fr:
      'À Sherbrooke, une infirmière explique comment bien utiliser le réseau de la santé.',
    subheadline_pt:
      'Em Sherbrooke, uma enfermeira explica como usar bem a rede de saúde.',
    segments: [
      { fr: 'Votre enfant a de la fièvre', pt: 'Seu filho está com febre' },
      { fr: 'et la clinique est fermée ?', pt: 'e a clínica está fechada?' },
      { fr: 'Avant d’aller à l’urgence,', pt: 'Antes de ir ao pronto-socorro,' },
      { fr: 'composez le 811, Info-Santé.', pt: 'ligue para o 811, o Info-Santé.' },
      { fr: 'Une infirmière répond jour et nuit,', pt: 'Uma enfermeira atende dia e noite,' },
      { fr: 'sept jours sur sept.', pt: 'todos os dias da semana.' },
      { fr: '« Beaucoup de gens attendent des heures', pt: '“Muita gente espera horas' },
      { fr: 'pour un problème qui n’est pas urgent »,', pt: 'por um problema que não é urgente”,' },
      { fr: 'explique Sophie Gingras, infirmière à Sherbrooke.', pt: 'explica Sophie Gingras, enfermeira em Sherbrooke.' },
      { fr: 'Au téléphone, elle évalue les symptômes', pt: 'Ao telefone, ela avalia os sintomas' },
      { fr: 'et elle oriente le patient', pt: 'e encaminha o paciente' },
      { fr: 'vers le bon endroit.', pt: 'para o lugar certo.' },
      { fr: 'Bien sûr, en cas de danger,', pt: 'Claro que, em caso de perigo,' },
      { fr: 'il faut appeler le 911 tout de suite.', pt: 'é preciso ligar imediatamente para o 911.' },
      { fr: 'Pour consulter un médecin,', pt: 'Para consultar um médico,' },
      { fr: 'il faut présenter sa carte de la RAMQ.', pt: 'é preciso apresentar o cartão da RAMQ.' },
      { fr: 'Attention : certains nouveaux arrivants', pt: 'Atenção: alguns recém-chegados' },
      { fr: 'doivent attendre jusqu’à trois mois', pt: 'precisam esperar até três meses' },
      { fr: 'avant d’être couverts par le régime.', pt: 'antes de terem direito à cobertura pública.' },
      { fr: 'Une assurance privée est alors conseillée.', pt: 'Nesse período, recomenda-se um seguro privado.' }
    ]
  },
  {
    id: 'news-10',
    edition: 'Édition N° 50 • Travail',
    date: 'Octobre 2026',
    category: 'Travail',
    level: 'B2',
    readingTime: '4 min',
    isFictional: true,
    headline_fr: 'Opinion : au bureau, le français québécois s’apprend aussi à la pause café',
    headline_pt: 'Opinião: no escritório, o francês do Québec também se aprende no cafezinho',
    subheadline_fr:
      'Tutoiement, courriels et « rencontres » : une chroniqueuse décode la culture du travail montréalaise.',
    subheadline_pt:
      'Tratamento por “tu”, e-mails e reuniões: uma colunista decifra a cultura de trabalho de Montreal.',
    segments: [
      { fr: 'Quiconque arrive dans un bureau montréalais', pt: 'Quem chega a um escritório de Montreal' },
      { fr: 's’étonne vite d’une chose :', pt: 'logo se surpreende com uma coisa:' },
      { fr: 'ici, on se tutoie dès le premier jour.', pt: 'aqui, todos se tratam por “tu” desde o primeiro dia.' },
      { fr: 'Bien que ce soit un signe d’ouverture,', pt: 'Embora seja um sinal de abertura,' },
      { fr: 'ce tutoiement n’efface pas pour autant', pt: 'essa informalidade não apaga, por isso,' },
      { fr: 'les règles implicites de la politesse.', pt: 'as regras implícitas da boa educação.' },
      { fr: 'Reste à les décoder.', pt: 'Resta decifrá-las.' },
      { fr: 'On écrit « courriel », pas « e-mail »,', pt: 'Escreve-se “courriel”, não “e-mail”,' },
      { fr: 'et l’on planifie une « rencontre »', pt: 'e marca-se uma “rencontre”' },
      { fr: 'plutôt qu’un « meeting ».', pt: 'em vez de um “meeting”.' },
      { fr: 'Ce souci de la langue n’a rien d’anecdotique :', pt: 'Esse cuidado com a língua não tem nada de anedótico:' },
      { fr: 'la Charte de la langue française', pt: 'a Carta da Língua Francesa' },
      { fr: 'fait du français la langue normale du travail.', pt: 'faz do francês a língua normal do trabalho.' },
      { fr: 'Néanmoins, ce sont les pauses café', pt: 'Ainda assim, foram os intervalos para o café' },
      { fr: 'qui m’ont le plus appris.', pt: 'que mais me ensinaram.' },
      { fr: 'C’est là qu’on parle de hockey,', pt: 'É ali que se fala de hóquei,' },
      { fr: 'de la dernière tempête', pt: 'da última tempestade' },
      { fr: 'ou des vacances au chalet.', pt: 'ou das férias no chalé.' },
      { fr: 'Pour qu’un nouvel employé s’intègre,', pt: 'Para que um funcionário novo se integre,' },
      { fr: 'il faut qu’il ose participer', pt: 'é preciso que ele se arrisque a participar' },
      { fr: 'à ces conversations sans enjeu.', pt: 'dessas conversas sem compromisso.' },
      { fr: 'Dès lors, mon conseil est simple :', pt: 'Por isso, meu conselho é simples:' },
      { fr: 'acceptez le café, posez des questions', pt: 'aceite o café, faça perguntas' },
      { fr: 'et ne craignez pas votre accent.', pt: 'e não tenha medo do seu sotaque.' }
    ]
  },
  {
    id: 'news-11',
    edition: 'Édition N° 51 • Reportage',
    date: 'Février 2026',
    category: 'Culture & Loisirs',
    level: 'B2',
    readingTime: '4 min',
    isFictional: true,
    headline_fr: 'Carnaval de Québec : sur le fleuve gelé, les canotiers défient l’hiver',
    headline_pt: 'Carnaval de Québec: no rio congelado, os canoístas desafiam o inverno',
    subheadline_fr:
      'Course en canot à glace, bain de neige et Bonhomme : reportage au cœur de la grande fête hivernale de la capitale.',
    subheadline_pt:
      'Corrida de canoa no gelo, banho de neve e Bonhomme: reportagem no coração da grande festa de inverno da capital.',
    segments: [
      { fr: 'En ce dimanche matin, il fait moins vingt,', pt: 'Neste domingo de manhã, faz vinte graus negativos,' },
      { fr: 'et pourtant la foule s’est massée', pt: 'e, mesmo assim, a multidão se aglomerou' },
      { fr: 'sur les quais du Vieux-Port.', pt: 'no cais do Porto Antigo.' },
      { fr: 'Devant elle, le Saint-Laurent charrie', pt: 'Diante dela, o rio São Lourenço arrasta' },
      { fr: 'd’immenses blocs de glace.', pt: 'enormes blocos de gelo.' },
      { fr: 'C’est là que s’affrontent les équipes', pt: 'É ali que se enfrentam as equipes' },
      { fr: 'de la célèbre course en canot à glace.', pt: 'da famosa corrida de canoa no gelo.' },
      { fr: 'Tour à tour, les canotiers rament', pt: 'Ora os canoístas remam,' },
      { fr: 'puis poussent leur embarcation sur la glace.', pt: 'ora empurram o barco sobre o gelo.' },
      { fr: '« Il faut que l’équipe avance d’un seul bloc,', pt: '“É preciso que a equipe avance como um só bloco,' },
      { fr: 'sinon le fleuve ne pardonne pas »,', pt: 'senão o rio não perdoa”,' },
      { fr: 'confie Étienne Côté, capitaine d’une équipe de Lévis.', pt: 'conta Étienne Côté, capitão de uma equipe de Lévis.' },
      { fr: 'Pour les spectateurs, le Carnaval', pt: 'Para os espectadores, o Carnaval' },
      { fr: 'se vit aussi sur la terre ferme.', pt: 'também se vive em terra firme.' },
      { fr: 'Plus haut, dans la Haute-Ville,', pt: 'Mais acima, na Cidade Alta,' },
      { fr: 'Bonhomme accueille petits et grands,', pt: 'o Bonhomme recebe crianças e adultos,' },
      { fr: 'tandis que les plus audacieux', pt: 'enquanto os mais ousados' },
      { fr: 'tentent le bain de neige en maillot.', pt: 'encaram o banho de neve de roupa de banho.' },
      { fr: 'Bien qu’il fasse un froid mordant,', pt: 'Embora faça um frio cortante,' },
      { fr: 'personne ne semble pressé de rentrer.', pt: 'ninguém parece ter pressa de ir para casa.' },
      { fr: 'Car au fond, le Carnaval n’est pas', pt: 'Afinal, no fundo, o Carnaval não é' },
      { fr: 'une manière de fuir l’hiver,', pt: 'uma forma de fugir do inverno,' },
      { fr: 'mais bien de le célébrer ensemble.', pt: 'mas sim de celebrá-lo juntos.' }
    ]
  },
  {
    id: 'news-12',
    edition: 'Édition N° 52 • Société',
    date: 'Septembre 2026',
    category: 'Société',
    level: 'B2',
    readingTime: '4 min',
    isFictional: true,
    headline_fr: 'Ottawa : la francophonie ontarienne affirme sa place',
    headline_pt: 'Ottawa: a francofonia de Ontário afirma o seu lugar',
    subheadline_fr:
      'Le 25 septembre, Jour des Franco-Ontariens, le drapeau vert et blanc flotte sur la capitale fédérale.',
    subheadline_pt:
      'Em 25 de setembro, Dia dos Franco-Ontarianos, a bandeira verde e branca tremula na capital federal.',
    segments: [
      { fr: 'À première vue, Ottawa semble', pt: 'À primeira vista, Ottawa parece' },
      { fr: 'une ville essentiellement anglophone.', pt: 'uma cidade essencialmente anglófona.' },
      { fr: 'Pourtant, une importante communauté francophone', pt: 'No entanto, uma grande comunidade francófona' },
      { fr: 'y vit, y travaille et y étudie.', pt: 'vive, trabalha e estuda ali.' },
      { fr: 'Le 25 septembre, Jour des Franco-Ontariens,', pt: 'Em 25 de setembro, Dia dos Franco-Ontarianos,' },
      { fr: 'son drapeau vert et blanc,', pt: 'a sua bandeira verde e branca,' },
      { fr: 'orné d’un lys et d’un trille,', pt: 'com um lírio e um trílio,' },
      { fr: 'flotte devant les écoles et les institutions.', pt: 'tremula diante das escolas e das instituições.' },
      { fr: 'Si la communauté est aujourd’hui si visible,', pt: 'Se a comunidade hoje é tão visível,' },
      { fr: 'c’est qu’elle a longtemps dû se battre', pt: 'é porque precisou lutar por muito tempo' },
      { fr: 'pour obtenir ses propres écoles.', pt: 'para conseguir as suas próprias escolas.' },
      { fr: '« Il est essentiel que nos enfants', pt: '“É essencial que nossos filhos' },
      { fr: 'puissent grandir en français »,', pt: 'possam crescer em francês”,' },
      { fr: 'affirme Julie Charbonneau, mère de famille à Orléans.', pt: 'afirma Julie Charbonneau, mãe de família em Orléans.' },
      { fr: 'Néanmoins, la pression de l’anglais demeure forte,', pt: 'Ainda assim, a pressão do inglês continua forte,' },
      { fr: 'surtout dans les milieux de travail.', pt: 'sobretudo nos ambientes de trabalho.' },
      { fr: 'Dès lors, des établissements comme l’Université d’Ottawa', pt: 'Por isso, instituições como a Universidade de Ottawa' },
      { fr: 'ou le collège La Cité', pt: 'ou o colégio La Cité' },
      { fr: 'jouent un rôle déterminant.', pt: 'têm um papel decisivo.' },
      { fr: 'Pour les nouveaux arrivants francophones,', pt: 'Para os recém-chegados francófonos,' },
      { fr: 'l’Ontario n’est donc pas une terre étrangère,', pt: 'Ontário não é, portanto, uma terra estrangeira,' },
      { fr: 'à condition qu’ils sachent où chercher.', pt: 'desde que saibam onde procurar.' }
    ]
  }
];

export default NEWSLETTER_SEED;

