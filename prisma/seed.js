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
