-- CreateTable
CREATE TABLE "NivelExtincao" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(50) NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NivelExtincao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bioma" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "tipo" VARCHAR(100),
    "nivel_destr" VARCHAR(100),
    "caract" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bioma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" SERIAL NOT NULL,
    "nome_comum" VARCHAR(100) NOT NULL,
    "nome_cientifico" VARCHAR(100) NOT NULL,
    "classe" VARCHAR(50),
    "familia" VARCHAR(50),
    "dieta" VARCHAR(100),
    "altura" DOUBLE PRECISION,
    "peso" DOUBLE PRECISION,
    "habitos" TEXT,
    "obs" TEXT,
    "imagem" TEXT,
    "icone" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "nivel_extincaoId" INTEGER,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ong" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "email" VARCHAR(100),
    "telefone" VARCHAR(20),
    "site" VARCHAR(200),
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "endereco" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Ong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZonaPreservacao" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "categoria" VARCHAR(50),
    "coordenadas" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ZonaPreservacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regiao" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "estado" VARCHAR(2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regiao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AnimalToBioma" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AnimalToBioma_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AnimalToRegiao" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AnimalToRegiao_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "NivelExtincao_nome_key" ON "NivelExtincao"("nome");

-- CreateIndex
CREATE INDEX "NivelExtincao_nome_idx" ON "NivelExtincao"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Bioma_nome_key" ON "Bioma"("nome");

-- CreateIndex
CREATE INDEX "Bioma_nome_idx" ON "Bioma"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_nome_cientifico_key" ON "Animal"("nome_cientifico");

-- CreateIndex
CREATE INDEX "Animal_nome_comum_idx" ON "Animal"("nome_comum");

-- CreateIndex
CREATE INDEX "Animal_nome_cientifico_idx" ON "Animal"("nome_cientifico");

-- CreateIndex
CREATE INDEX "Animal_nivel_extincaoId_idx" ON "Animal"("nivel_extincaoId");

-- CreateIndex
CREATE INDEX "Animal_deletedAt_idx" ON "Animal"("deletedAt");

-- CreateIndex
CREATE INDEX "Ong_nome_idx" ON "Ong"("nome");

-- CreateIndex
CREATE INDEX "Ong_email_idx" ON "Ong"("email");

-- CreateIndex
CREATE INDEX "Ong_deletedAt_idx" ON "Ong"("deletedAt");

-- CreateIndex
CREATE INDEX "ZonaPreservacao_nome_idx" ON "ZonaPreservacao"("nome");

-- CreateIndex
CREATE INDEX "ZonaPreservacao_categoria_idx" ON "ZonaPreservacao"("categoria");

-- CreateIndex
CREATE INDEX "ZonaPreservacao_deletedAt_idx" ON "ZonaPreservacao"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Regiao_nome_key" ON "Regiao"("nome");

-- CreateIndex
CREATE INDEX "Regiao_estado_idx" ON "Regiao"("estado");

-- CreateIndex
CREATE INDEX "Regiao_nome_idx" ON "Regiao"("nome");

-- CreateIndex
CREATE INDEX "_AnimalToBioma_B_index" ON "_AnimalToBioma"("B");

-- CreateIndex
CREATE INDEX "_AnimalToRegiao_B_index" ON "_AnimalToRegiao"("B");

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_nivel_extincaoId_fkey" FOREIGN KEY ("nivel_extincaoId") REFERENCES "NivelExtincao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnimalToBioma" ADD CONSTRAINT "_AnimalToBioma_A_fkey" FOREIGN KEY ("A") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnimalToBioma" ADD CONSTRAINT "_AnimalToBioma_B_fkey" FOREIGN KEY ("B") REFERENCES "Bioma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnimalToRegiao" ADD CONSTRAINT "_AnimalToRegiao_A_fkey" FOREIGN KEY ("A") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnimalToRegiao" ADD CONSTRAINT "_AnimalToRegiao_B_fkey" FOREIGN KEY ("B") REFERENCES "Regiao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
