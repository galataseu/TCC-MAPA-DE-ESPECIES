# Gralha dos Ventos — Mini App (Atividade Snack)

Mini aplicativo com **5 telas** em **Navegação Stack**, copiando a tela de
espécies do usuário comum do site (mobile). Cada animal abre a **sua própria
página** de detalhes.

## As 5 telas (progressão)

1. **Início** — boas-vindas + botão de começar.
2. **Espécies** — os 5 cards (toque expande; botão abre a página do animal).
3. **Detalhes** — página individual do animal (foto, status, dieta, peso,
   altura, biomas, descrição).
4. **Biomas** — Mata Atlântica, Pampa e Cerrado.
5. **Conservação** — legenda dos 9 níveis de extinção com as cores do site.

## Requisitos atendidos

- [x] 5 telas com Navegação Stack (`@react-navigation/stack`).
- [x] `TouchableOpacity` em todos os botões e áreas clicáveis.
- [x] Separação de componentes (`AnimalCard`, `NavBar` + `data/animals`).
- [x] Cabeçalhos personalizados (título com o nome do animal + cores do site).
- [x] Avanço e retorno livres (seta do cabeçalho + botões em toda tela).
- [x] Cada tela tem botões para telas diferentes.

## Como abrir no Snack

1. Acesse [snack.expo.dev](https://snack.expo.dev) e crie um Snack vazio.
2. Envie estes arquivos mantendo as pastas (`App.js`, `package.json`,
   `data/`, `components/`, `screens/`): painel **Files → ⋯ → Upload files**
   (ou copie e cole arquivo por arquivo).
3. O Snack instala as dependências sozinho (`@react-navigation/stack`).
4. Clique em **Save** e escaneie o **QR Code** com o app **Expo Go**.

As fotos vêm da Wikimedia (se a rede falhar, aparece 🐾 no lugar).
