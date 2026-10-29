// Referências para o cadastro de clientes: divisão político-administrativa de
// Angola (Lei n.º 14/24, em vigor) e classificações comerciais padrão.

export const PROVINCIAS = [
  "Bengo", "Benguela", "Bié", "Cabinda", "Cuando", "Cubango",
  "Cuanza Norte", "Cuanza Sul", "Cunene", "Huambo", "Huíla",
  "Icolo e Bengo", "Luanda", "Lunda Norte", "Lunda Sul", "Malanje",
  "Moxico", "Moxico Leste", "Namibe", "Uíge", "Zaire",
];

export const MUNICIPIOS_POR_PROVINCIA = {
  "Bengo": ["Dande", "Quibaxe", "Muxaluando", "Bula Atumba", "Ambriz", "Pango Aluquém", "Barra do Dande", "Piri", "Quicunzo", "Nambuangongo", "Úcua", "Panguila"],
  "Benguela": ["Benguela", "Ganda", "Lobito", "Catumbela", "Bocoio", "Balombo", "Cubal", "Baía Farta", "Caimbambo", "Chongorói", "Egito Praia", "Chindumbo", "Dombe Grande", "Capupa", "Biópio", "Chila", "Chicuma", "Babaera", "Iambala", "Catengue", "Bolonguera", "Canhamela", "Navegantes"],
  "Bié": ["Andulo", "Chitembo", "Cuito", "Camacupa", "Chinguar", "Catabola", "Cunhinga", "Cuemba", "Nharêa", "Luando", "Ringoma", "Mumbué", "Calucinga", "Chicala", "Chipeta", "Umpulo", "Lúbia", "Cambândua", "Belo Horizonte"],
  "Cabinda": ["Cabinda", "Cacongo", "Buco Zau", "Belize", "Miconje", "Massabi", "Necuto", "Tando Zinze", "Liambo", "Ngoio"],
  "Cuando": ["Cuito Cuanavale", "Dirico", "Mavinga", "Rivungo", "Xipundo", "Dima", "Luiana", "Mucusso", "Luengue"],
  "Cubango": ["Menongue", "Cuchi", "Calai", "Nancova", "Cuangar", "Savate", "Caiundo", "Longa", "Cutato", "Chinguanja", "Mavengue"],
  "Cuanza Norte": ["Cazengo", "Golungo Alto", "Cambambe", "Samba Cajú", "Ambaca", "Lucala", "Banga", "Bolongongo", "Quiculungo", "Ngonguembo", "Massangano", "Cêrca", "Tango", "Terreiro", "Aldeia Nova", "Caculo Cabaça", "Luinga"],
  "Cuanza Sul": ["Sumbe", "Calulo", "Gabela", "Cassongue", "Porto Amboim", "Quibala", "Seles", "Waku Kungo", "Mussende", "Quilenda", "Ebo", "Conda", "Quirimbo", "Munenga", "Quissongo", "Gungo", "Sanga", "Gangula", "Pambangala", "Condé", "Amboiva", "Lonhe", "Quenha", "Boa Entrada"],
  "Cunene": ["Ombadja", "Cuanhama", "Curoca", "Cahama", "Cuvelai", "Namacunde", "Chiéde", "Nehone", "Humbe", "Mupa", "Naulila", "Chitado", "Cafima", "Chissuata"],
  "Huambo": ["Bailundo", "Huambo", "Londuimbali", "Caála", "Cachiungo", "Mungo", "Longonjo", "Ucuma", "Ecunha", "Chinjenje", "Bimbe", "Sambo", "Galanga", "Alto Hama", "Chilata", "Cuima"],
  "Huíla": ["Caconda", "Gambos", "Humpata", "Lubango", "Cuvango", "Quipungo", "Chibia", "Quilengues", "Caluquembe", "Matala", "Jamba Mineira", "Chipindo", "Chicomba", "Cacula", "Dongo", "Hoque", "Capelongo", "Chituto", "Capunda Cavilongo", "Viti Vivali", "Galangue", "Palanca", "Chicungo"],
  "Icolo e Bengo": ["Catete", "Quiçama", "Calumbo", "Cabiri", "Cabo Ledo", "Bom Jesus", "Sequele"],
  "Luanda": ["Ingombota", "Cacuaco", "Cazenga", "Viana", "Belas", "Kilamba Kiaxi", "Talatona", "Mussulo", "Sambizanga", "Rangel", "Maianga", "Samba", "Camama", "Mulenvos", "Kilamba", "Hoji ya Henda"],
  "Lunda Norte": ["Cuilo", "Dundo", "Lubalo", "Capenda Camulemba", "Cuango", "Lucapa", "Cambulo", "Xá Muteba", "Caungula", "Lóvua", "Chitato", "Xá Cassau", "Camaxilo", "Luangue", "Luremo", "Canzar", "Cassanje Calucala", "Mussungue", "Cafunfo"],
  "Lunda Sul": ["Saurimo", "Muconda", "Cacolo", "Dala", "Chiluage", "Cassai-Sul", "Xassengue", "Alto Chicapa", "Sombo", "Muriege", "Luma Cassai", "Cazage", "Muangueji", "Cassengo"],
  "Malanje": ["Calandula", "Malanje", "Cacuso", "Massango", "Marimba", "Quela", "Quirima", "Cangandala", "Cahombo", "Kunda dya Baze", "Cambundi Catembo", "Caculama", "Kiwaba Nzoji", "Luquembo", "Cateco Cangola", "Mbanji ya Ngola", "Cuale", "Pungo a Ndongo", "Ngola Luiji", "Quihuhu", "Xandel", "Cambo Suinginge", "Milando", "Quitapa", "Capunda", "Muquixe", "Quêssua"],
  "Moxico": ["Luena", "Cangamba", "Lumbala Nguimbo", "Camanongue", "Léua", "Lutembo", "Lucusse", "Cangumbe", "Chiúme", "Alto Cuito", "Ninda", "Lutuai"],
  "Moxico Leste": ["Cazombo", "Luacano", "Cameia", "Luau", "Nana Candundo", "Macondo", "Caianda", "Lóvua do Zambeze", "Lago Dilolo"],
  "Namibe": ["Moçâmedes", "Tômbua", "Bibala", "Virei", "Camucuio", "Lucira", "Iona", "Sacomar", "Cacimbas"],
  "Uíge": ["Dange Quitexe", "Bungo", "Ambuíla", "Negage", "Puri", "Maquela do Zombo", "Damba", "Sanza Pombo", "Bembe", "Milunga", "Songo", "Quimbele", "Cangola", "Uíge", "Mucaba", "Nova Esperança", "Sacandica", "Nsosso", "Lucunga", "Quipedro", "Massau", "Vista Alegre", "Alto Zaza"],
  "Zaire": ["Soyo", "Mbanza Kongo", "Nzeto", "Tomboco", "Cuimba", "Nóqui", "Luvo", "Lufico", "Quêlo", "Serra de Canda", "Quindeje"],
};

export const MUNICIPIOS_TODOS = Object.values(MUNICIPIOS_POR_PROVINCIA).flat();

export const CATEGORIAS = ["Estratégico", "Recorrente", "Regular", "Ocasional", "Potencial"];

export const SETORES = [
  "Administração Pública", "Saúde", "Educação e Formação", "Comércio", "Indústria",
  "Construção", "Serviços Profissionais", "Tecnologia e Comunicação",
  "Agricultura e Ambiente", "Outros",
];
