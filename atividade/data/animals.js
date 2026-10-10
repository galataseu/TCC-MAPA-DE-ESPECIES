// Dados dos 5 animais (cores iguais às do site).
export const EXTINCTION_COLORS = {
  NT: '#217757',
  VU: '#FFA63A',
  EN: '#FF6426',
  LC: '#1A5FB4',
};

export const BIOME_COLORS = {
  'Mata Atlântica': '#287F5E',
  Pampa: '#3B7BA5',
  Cerrado: '#E6C140',
};

const img = (file) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=800`;

export const ANIMALS = [
  {
    id: '1',
    nome: 'Gralha-azul',
    cientifico: 'Cyanocorax caeruleus',
    sigla: 'NT',
    dieta: 'Onívora (pinhão, frutos e insetos)',
    peso: '270 g',
    altura: '42 cm',
    biomas: ['Mata Atlântica'],
    descricao:
      'Ave símbolo do Paraná. Espalha o pinhão pela mata e ajuda a floresta a se regenerar.',
    imagem: img('Gralha%20Azul%20%28Cyanocorax%20caeruleus%29.jpg'),
  },
  {
    id: '2',
    nome: 'Lobo-guará',
    cientifico: 'Chrysocyon brachyurus',
    sigla: 'VU',
    dieta: 'Onívora (frutos, lobeira e pequenos vertebrados)',
    peso: '23 kg',
    altura: '90 cm',
    biomas: ['Cerrado', 'Pampa'],
    descricao:
      'Maior canídeo da América do Sul. Vive em campos abertos e adora lobeira.',
    imagem: img('Chrysocyon%20brachyurus.jpg'),
  },
  {
    id: '3',
    nome: 'Jaguatirica',
    cientifico: 'Leopardus pardalis',
    sigla: 'EN',
    dieta: 'Carnívora',
    peso: '11 kg',
    altura: '50 cm',
    biomas: ['Mata Atlântica', 'Pampa'],
    descricao:
      'Felino de porte médio com manchas em rosetas. Ótima nadadora e escaladora.',
    imagem: img('Leopardus%20pardalis.jpg'),
  },
  {
    id: '4',
    nome: 'Bugio-ruivo',
    cientifico: 'Alouatta guariba',
    sigla: 'VU',
    dieta: 'Herbívora (folhas, frutos e flores)',
    peso: '7 kg',
    altura: '55 cm',
    biomas: ['Mata Atlântica'],
    descricao:
      'Famoso pelo ronco ouvido a quilômetros. Vive em bandos nas copas das árvores.',
    imagem: img('Alouatta%20guariba.jpg'),
  },
  {
    id: '5',
    nome: 'Quero-quero',
    cientifico: 'Vanellus chilensis',
    sigla: 'LC',
    dieta: 'Insetívora',
    peso: '300 g',
    altura: '35 cm',
    biomas: ['Pampa', 'Cerrado'],
    descricao:
      'Ave símbolo do Rio Grande do Sul. O canto parece dizer o próprio nome.',
    imagem: img('Vanellus%20chilensis.jpg'),
  },
];
