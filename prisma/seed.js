const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Prisma seeding...');

  // 1. Levels of Extinction (Official IUCN/MMA)
  const niveisExt = [
    { sigla: 'EX', nome: 'Extinta', descricao: 'Não restam dúvidas de que o último indivíduo tenha morrido.' },
    { sigla: 'EW', nome: 'Extinta na Natureza', descricao: 'Sobrevive apenas em cultivo, cativeiro ou como população naturalizada.' },
    { sigla: 'CR', nome: 'Criticamente em Perigo', descricao: 'Enfrenta um risco extremamente elevado de extinção na natureza.' },
    { sigla: 'EN', nome: 'Em Perigo', descricao: 'Enfrenta um risco muito elevado de extinção na natureza.' },
    { sigla: 'VU', nome: 'Vulnerável', descricao: 'Enfrenta um risco elevado de extinção na natureza.' },
    { sigla: 'NT', nome: 'Quase Ameaçada', descricao: 'Não está ameaçada agora, mas pode estar em um futuro próximo.' },
    { sigla: 'LC', nome: 'Pouco Preocupante', descricao: 'Espécie abundante e com ampla distribuição.' },
    { sigla: 'DD', nome: 'Dados Insuficientes', descricao: 'Informação inadequada para uma avaliação do risco de extinção.' },
  ];

  for (const nivel of niveisExt) {
    await prisma.api_nivelextincao.upsert({
      where: { nome: nivel.nome },
      update: {},
      create: nivel,
    });
  }

  // 2. Levels of Destruction
  const niveisDest = [
    { nome: 'Preservado', descricao: 'Ecossistema com funções e estrutura originais mantidas.', cor_alerta: '#2ECC71' },
    { nome: 'Alterado', descricao: 'Presença de intervenção humana leve ou espécies invasoras.', cor_alerta: '#F1C40F' },
    { nome: 'Fragmentado', descricao: 'Áreas isoladas por matrizes de agricultura ou urbanização.', cor_alerta: '#E67E22' },
    { nome: 'Muito Alterado', descricao: 'Perda significativa de biodiversidade e erosão do solo.', cor_alerta: '#E74C3C' },
    { nome: 'Degradado', descricao: 'Ecossistema incapaz de regeneração natural.', cor_alerta: '#922B21' },
  ];

  for (const nivel of niveisDest) {
    await prisma.api_niveldestruicao.upsert({
      where: { nome: nivel.nome },
      update: {},
      create: nivel,
    });
  }

  // 3. Default Users (Note: passwords should be hashed in production)
  // These passwords match Django's simple PBKDF2 for 'admin' and 'user' if generated correctly,
  // but here we just put a placeholder or simple hash if needed.
  // Django's 'admin' with 'admin' password is usually: pbkdf2_sha256$720000$somesalt$somehash...
  
  await prisma.api_user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: 'pbkdf2_sha256$720000$admin_salt$dummy_hash', // Placeholder
      is_superuser: true,
      first_name: 'Admin',
      last_name: 'System',
      email: 'admin@example.com',
      is_staff: true,
      is_active: true,
      date_joined: new Date(),
      role: 'admin',
      denuncias: 0,
    },
  });

  // 4. Animals Seeding / Update
  const especies = [
    {
      nome_cientifico: 'Cyanocorax caeruleus',
      dieta: 'Onívora',
      habitos: 'Espécie diurna e social que vive em bandos na Mata Atlântica. É a principal responsável pela disseminação da Araucaria angustifolia ao enterrar os pinhões no solo para estocar alimento.',
      peso: 0.20,
      altura: 0.40,
      imagem: 'animais/gralha_azul.png'
    },
    {
      nome_cientifico: 'Melanophryniscus admirabilis',
      dieta: 'Insectívora',
      habitos: 'Espécie microendêmica de hábito diurno e semiaquático. Encontrada exclusivamente num trecho de 700 metros do Rio Forqueta (RS), vivendo sobre rochas vulcânicas em corredeiras e matas ciliares.',
      peso: 0.01,
      altura: 0.02,
      imagem: 'animais/sapo_barriga_vermelha.png'
    },
    {
      nome_cientifico: 'Amazona pretrei',
      dieta: 'Frugívora',
      habitos: 'Diurno e gregário, realiza migrações sazonais nos planaltos do Rio Grande do Sul e Santa Catarina acompanhando a maturação das sementes de araucária (pinhões).',
      peso: 0.30,
      altura: 0.32,
      imagem: 'animais/papagaio_charao.png'
    },
    {
      nome_cientifico: 'Leopardus tigrinus',
      dieta: 'Carnívora',
      habitos: 'Predominantemente noturno e solitário. Excelente escalador de árvores, habita formações florestais e matas de galeria nos biomas Mata Atlântica e Pampa.',
      peso: 2.50,
      altura: 0.30,
      imagem: 'animais/gato_do_mato_pequeno.png'
    },
    {
      nome_cientifico: 'Myrmecophaga tridactyla',
      dieta: 'Insectívora',
      habitos: 'Espécie solitária de hábitos diurnos e crepusculares. Percorre extensas áreas de campos e bordas de mata à procura de cupinzeiros e formigueiros, utilizando garras fortes para escavação.',
      peso: 35.00,
      altura: 0.60,
      imagem: 'animais/tamandua_bandeira.png'
    }
  ];

  for (const esp of especies) {
    await prisma.api_animal.updateMany({
      where: { nome_cientifico: esp.nome_cientifico },
      data: {
        dieta: esp.dieta,
        habitos: esp.habitos,
        peso: esp.peso,
        altura: esp.altura,
        imagem: esp.imagem,
        updated_at: new Date()
      }
    });
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
