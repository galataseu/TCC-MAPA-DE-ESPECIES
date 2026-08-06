--
-- PostgreSQL database dump
--

\restrict 5XrEbiiDMBnUZvKQFye8SRVhOML7R6gr7fzHSLe0FGajrqexO8dspR7yjx8BAIi

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: api_regiao; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.api_regiao VALUES (1, 'Sul');


--
-- Data for Name: api_estado; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.api_estado VALUES (1, 'Santa Catarina', 'SC', 1);
INSERT INTO public.api_estado VALUES (2, 'Paraná', 'PR', 1);
INSERT INTO public.api_estado VALUES (3, 'Rio Grande do Sul', 'RS', 1);


--
-- Data for Name: api_microrregiao; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.api_microrregiao VALUES (1, 'Vale do Itajaí', 1);
INSERT INTO public.api_microrregiao VALUES (2, 'Grande Florianópolis', 1);
INSERT INTO public.api_microrregiao VALUES (3, 'Norte Catarinense', 1);
INSERT INTO public.api_microrregiao VALUES (4, 'Oeste Catarinense', 1);
INSERT INTO public.api_microrregiao VALUES (5, 'Litoral Paranaense', 2);
INSERT INTO public.api_microrregiao VALUES (6, 'Metropolitana de Curitiba', 2);
INSERT INTO public.api_microrregiao VALUES (7, 'Norte Central Paranaense', 2);
INSERT INTO public.api_microrregiao VALUES (8, 'Metropolitana de Porto Alegre', 3);
INSERT INTO public.api_microrregiao VALUES (9, 'Serra Gaúcha', 3);
INSERT INTO public.api_microrregiao VALUES (10, 'Sudoeste Rio-grandense', 3);
INSERT INTO public.api_microrregiao VALUES (11, 'Campanha', 3);


--
-- Data for Name: api_niveldestruicao; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.api_niveldestruicao VALUES (1, 'Preservado', 'Ecossistema com funções e estrutura originais mantidas.', '#2ECC71');
INSERT INTO public.api_niveldestruicao VALUES (2, 'Alterado', 'Presença de intervenção humana leve ou espécies invasoras.', '#F1C40F');
INSERT INTO public.api_niveldestruicao VALUES (3, 'Fragmentado', 'Áreas isoladas por matrizes de agricultura ou urbanização.', '#E67E22');
INSERT INTO public.api_niveldestruicao VALUES (4, 'Muito Alterado', 'Perda significativa de biodiversidade e erosão do solo.', '#E74C3C');
INSERT INTO public.api_niveldestruicao VALUES (5, 'Degradado', 'Ecossistema incapaz de regeneração natural.', '#922B21');


--
-- Data for Name: api_nivelextincao; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.api_nivelextincao VALUES (1, 'EX', 'Extinta', 'Não restam dúvidas de que o último indivíduo tenha morrido.');
INSERT INTO public.api_nivelextincao VALUES (2, 'EW', 'Extinta na Natureza', 'Sobrevive apenas em cultivo, cativeiro ou como população naturalizada.');
INSERT INTO public.api_nivelextincao VALUES (3, 'CR', 'Criticamente em Perigo', 'Enfrenta um risco extremamente elevado de extinção na natureza.');
INSERT INTO public.api_nivelextincao VALUES (4, 'EN', 'Em Perigo', 'Enfrenta um risco muito elevado de extinção na natureza.');
INSERT INTO public.api_nivelextincao VALUES (5, 'VU', 'Vulnerável', 'Enfrenta um risco elevado de extinção na natureza.');
INSERT INTO public.api_nivelextincao VALUES (6, 'NT', 'Quase Ameaçada', 'Não está ameaçada agora, mas pode estar em um futuro próximo.');
INSERT INTO public.api_nivelextincao VALUES (7, 'LC', 'Pouco Preocupante', 'Espécie abundante e com ampla distribuição.');
INSERT INTO public.api_nivelextincao VALUES (8, 'DD', 'Dados Insuficientes', 'Informação inadequada para uma avaliação do risco de extinção.');


--
-- Data for Name: api_user; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.api_user VALUES (1, 'pbkdf2_sha256$1200000$brxAuXagel0fEAnToEsQOE$fD/8tnMJ/jFqZDqcXmLwApbiMZwM2hCnKGlIxdPx8vE=', NULL, true, 'admin', '', '', '', true, true, '2026-06-11 10:18:15.209846-03', 'admin', NULL, '1990-01-01', 0);


--
-- Data for Name: api_animal; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.api_animal VALUES (1, NULL, 'Gralha-Azul', 'Cyanocorax caeruleus', 'Aves', 'Corvidae', 'Onívora', 'Espécie diurna e social que vive em bandos na Mata Atlântica. É a principal responsável pela disseminação da Araucaria angustifolia ao enterrar os pinhões no solo para estocar alimento.', 'Ameaças principais: Desmatamento e fragmentação da Floresta de Ombrófila Mista (Mata de Araucárias). Ave símbolo do Estado do Paraná (Lei Estadual nº 7.957/1984). Possui papel ecológico indispensável na regeneração natural dos pinheirais.', '2026-06-11 10:18:15.368054-03', '2026-07-22 13:14:11.395-03', 1, 3, 6, 0.4, 0.2, 6);
INSERT INTO public.api_animal VALUES (2, NULL, 'Sapo-de-barriga-vermelha', 'Melanophryniscus admirabilis', 'Amphibia', 'Bufonidae', 'Insectívora', 'Espécie microendêmica de hábito diurno e semiaquático. Encontrada exclusivamente num trecho de 700 metros do Rio Forqueta (RS), vivendo sobre rochas vulcânicas em corredeiras e matas ciliares.', 'Ameaças principais: Instalação de pequenas centrais hidrelétricas (PCHs), poluição da água por agroquímicos e degradação da mata ciliar. Espécie microendêmica restrita a um trecho de apenas 700 metros do Rio Forqueta em Arvorezinha (RS).', '2026-06-11 10:18:15.402923-03', '2026-07-22 13:14:11.579-03', 1, 5, 3, 0.02, 0.01, 1);
INSERT INTO public.api_animal VALUES (3, NULL, 'Papagaio-charão', 'Amazona pretrei', 'Aves', 'Psittacidae', 'Frugívora', 'Diurno e gregário, realiza migrações sazonais nos planaltos do Rio Grande do Sul e Santa Catarina acompanhando a maturação das sementes de araucária (pinhões).', 'Ameaças principais: Redução dos pinhões por supressão das araucárias maduras, perda de cavidades em árvores antigas para nidificação e captura ilegal. Realiza grandes deslocamentos sazonais para alimentação.', '2026-06-11 10:18:15.417506-03', '2026-07-22 13:14:11.584-03', 1, 2, 5, 0.32, 0.3, 9);
INSERT INTO public.api_animal VALUES (4, NULL, 'Gato-do-mato-pequeno', 'Leopardus tigrinus', 'Mammalia', 'Felidae', 'Carnívora', 'Predominantemente noturno e solitário. Excelente escalador de árvores, habita formações florestais e matas de galeria nos biomas Mata Atlântica e Pampa.', 'Ameaças principais: Expansão agrícola no Pampa e Mata Atlântica, atropelamentos rodoviários, doenças transmitidas por cães domésticos e caça retaliatória. Um dos menores felídeos das Américas.', '2026-06-11 10:18:15.431747-03', '2026-07-22 13:14:11.59-03', 1, 3, 4, 0.3, 2.5, 8);
INSERT INTO public.api_animal VALUES (5, NULL, 'Tamanduá-bandeira', 'Myrmecophaga tridactyla', 'Mammalia', 'Myrmecophagidae', 'Insectívora', 'Espécie solitária de hábitos diurnos e crepusculares. Percorre extensas áreas de campos e bordas de mata à procura de cupinzeiros e formigueiros, utilizando garras fortes para escavação.', 'Ameaças principais: Queimadas em pastagens e vegetação nativa, atropelamentos rodoviários e uso intensivo de inseticidas que destroem cupinzeiros. Já extinto em diversas microrregiões do Sul.', '2026-06-11 10:18:15.446786-03', '2026-07-22 13:14:11.595-03', 1, 3, 5, 0.6, 35, 4);
INSERT INTO public.api_animal VALUES (6, NULL, 'six seven', 'sixus sevensu', 'Mammalia', NULL, '', '', NULL, '2026-08-06 14:07:28.039684-03', '2026-08-06 14:07:28.039696-03', NULL, NULL, 1, NULL, NULL, NULL);


--
-- Data for Name: api_bioma; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.api_bioma VALUES (1, 'Mata Atlântica', 'Floresta densa, Mata de Araucárias no planalto.', NULL, 'Tropical/Subtropical');
INSERT INTO public.api_bioma VALUES (2, 'Pampa', 'Extensos campos, clima temperado, exclusivo do RS.', NULL, 'Campos Sulinos');


--
-- Data for Name: api_animal_biomas; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.api_animal_biomas VALUES (1, 1, 1);
INSERT INTO public.api_animal_biomas VALUES (2, 2, 1);
INSERT INTO public.api_animal_biomas VALUES (3, 3, 1);
INSERT INTO public.api_animal_biomas VALUES (4, 4, 2);
INSERT INTO public.api_animal_biomas VALUES (5, 5, 1);
INSERT INTO public.api_animal_biomas VALUES (6, 6, 2);


--
-- Data for Name: api_animalimagem; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: api_bioma_estados; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.api_bioma_estados VALUES (1, 1, 1);
INSERT INTO public.api_bioma_estados VALUES (2, 1, 2);
INSERT INTO public.api_bioma_estados VALUES (3, 1, 3);
INSERT INTO public.api_bioma_estados VALUES (4, 2, 3);


--
-- Data for Name: api_favorito; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: api_marcador; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.api_marcador VALUES (1, '0101000020E6100000C3F5285C8FA248C0EC51B81E856B39C0', 'gralha-azul-icon', '2026-06-11 10:18:15.390751-03', 1);
INSERT INTO public.api_marcador VALUES (2, '0101000020E610000000000000004048C0CDCCCCCCCCCC39C0', 'gralha-azul-icon', '2026-06-11 10:18:15.396814-03', 1);
INSERT INTO public.api_marcador VALUES (3, '0101000020E610000000000000008048C00000000000003BC0', 'sapo-de-barriga-vermelha-icon', '2026-06-11 10:18:15.411642-03', 2);
INSERT INTO public.api_marcador VALUES (4, '0101000020E61000000000000000C049C03333333333333DC0', 'papagaio-charão-icon', '2026-06-11 10:18:15.425894-03', 3);
INSERT INTO public.api_marcador VALUES (5, '0101000020E61000009A999999999949C00000000000003EC0', 'gato-do-mato-pequeno-icon', '2026-06-11 10:18:15.441569-03', 4);
INSERT INTO public.api_marcador VALUES (6, '0101000020E6100000CDCCCCCCCC4C4AC09A99999999193BC0', 'tamanduá-bandeira-icon', '2026-06-11 10:18:15.454762-03', 5);
INSERT INTO public.api_marcador VALUES (7, '0101000020E6100000F4DE1802803949C0CE33F6251B873BC0', NULL, '2026-08-06 14:07:28.049773-03', 6);


--
-- Data for Name: api_ong; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.api_ong VALUES (1, NULL, 'SPVS', 'Sociedade de Pesquisa em Vida Selvagem e Educação Ambiental.', 'spvs@spvs.org.br', NULL, NULL, '0101000020E6100000C3F5285C8FA248C0EC51B81E856B39C0', 'Curitiba, PR', '2026-06-11 10:18:15.460067-03', '2026-06-11 10:18:15.460082-03');


--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: api_user_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.django_content_type VALUES (1, 'admin', 'logentry');
INSERT INTO public.django_content_type VALUES (2, 'auth', 'group');
INSERT INTO public.django_content_type VALUES (3, 'auth', 'permission');
INSERT INTO public.django_content_type VALUES (4, 'contenttypes', 'contenttype');
INSERT INTO public.django_content_type VALUES (5, 'sessions', 'session');
INSERT INTO public.django_content_type VALUES (6, 'api', 'animal');
INSERT INTO public.django_content_type VALUES (7, 'api', 'bioma');
INSERT INTO public.django_content_type VALUES (8, 'api', 'niveldestruicao');
INSERT INTO public.django_content_type VALUES (9, 'api', 'nivelextincao');
INSERT INTO public.django_content_type VALUES (10, 'api', 'ong');
INSERT INTO public.django_content_type VALUES (11, 'api', 'regiao');
INSERT INTO public.django_content_type VALUES (12, 'api', 'user');
INSERT INTO public.django_content_type VALUES (13, 'api', 'zonapreservacao');
INSERT INTO public.django_content_type VALUES (14, 'api', 'estado');
INSERT INTO public.django_content_type VALUES (15, 'api', 'interacao');
INSERT INTO public.django_content_type VALUES (16, 'api', 'marcador');
INSERT INTO public.django_content_type VALUES (17, 'api', 'microrregiao');
INSERT INTO public.django_content_type VALUES (18, 'api', 'animalimagem');
INSERT INTO public.django_content_type VALUES (19, 'api', 'favorito');


--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.auth_permission VALUES (1, 'Can add log entry', 1, 'add_logentry');
INSERT INTO public.auth_permission VALUES (2, 'Can change log entry', 1, 'change_logentry');
INSERT INTO public.auth_permission VALUES (3, 'Can delete log entry', 1, 'delete_logentry');
INSERT INTO public.auth_permission VALUES (4, 'Can view log entry', 1, 'view_logentry');
INSERT INTO public.auth_permission VALUES (5, 'Can add permission', 3, 'add_permission');
INSERT INTO public.auth_permission VALUES (6, 'Can change permission', 3, 'change_permission');
INSERT INTO public.auth_permission VALUES (7, 'Can delete permission', 3, 'delete_permission');
INSERT INTO public.auth_permission VALUES (8, 'Can view permission', 3, 'view_permission');
INSERT INTO public.auth_permission VALUES (9, 'Can add group', 2, 'add_group');
INSERT INTO public.auth_permission VALUES (10, 'Can change group', 2, 'change_group');
INSERT INTO public.auth_permission VALUES (11, 'Can delete group', 2, 'delete_group');
INSERT INTO public.auth_permission VALUES (12, 'Can view group', 2, 'view_group');
INSERT INTO public.auth_permission VALUES (13, 'Can add content type', 4, 'add_contenttype');
INSERT INTO public.auth_permission VALUES (14, 'Can change content type', 4, 'change_contenttype');
INSERT INTO public.auth_permission VALUES (15, 'Can delete content type', 4, 'delete_contenttype');
INSERT INTO public.auth_permission VALUES (16, 'Can view content type', 4, 'view_contenttype');
INSERT INTO public.auth_permission VALUES (17, 'Can add session', 5, 'add_session');
INSERT INTO public.auth_permission VALUES (18, 'Can change session', 5, 'change_session');
INSERT INTO public.auth_permission VALUES (19, 'Can delete session', 5, 'delete_session');
INSERT INTO public.auth_permission VALUES (20, 'Can view session', 5, 'view_session');
INSERT INTO public.auth_permission VALUES (21, 'Can add bioma', 7, 'add_bioma');
INSERT INTO public.auth_permission VALUES (22, 'Can change bioma', 7, 'change_bioma');
INSERT INTO public.auth_permission VALUES (23, 'Can delete bioma', 7, 'delete_bioma');
INSERT INTO public.auth_permission VALUES (24, 'Can view bioma', 7, 'view_bioma');
INSERT INTO public.auth_permission VALUES (25, 'Can add Nível de Destruição', 8, 'add_niveldestruicao');
INSERT INTO public.auth_permission VALUES (26, 'Can change Nível de Destruição', 8, 'change_niveldestruicao');
INSERT INTO public.auth_permission VALUES (27, 'Can delete Nível de Destruição', 8, 'delete_niveldestruicao');
INSERT INTO public.auth_permission VALUES (28, 'Can view Nível de Destruição', 8, 'view_niveldestruicao');
INSERT INTO public.auth_permission VALUES (29, 'Can add Nível de Extinção', 9, 'add_nivelextincao');
INSERT INTO public.auth_permission VALUES (30, 'Can change Nível de Extinção', 9, 'change_nivelextincao');
INSERT INTO public.auth_permission VALUES (31, 'Can delete Nível de Extinção', 9, 'delete_nivelextincao');
INSERT INTO public.auth_permission VALUES (32, 'Can view Nível de Extinção', 9, 'view_nivelextincao');
INSERT INTO public.auth_permission VALUES (33, 'Can add ong', 10, 'add_ong');
INSERT INTO public.auth_permission VALUES (34, 'Can change ong', 10, 'change_ong');
INSERT INTO public.auth_permission VALUES (35, 'Can delete ong', 10, 'delete_ong');
INSERT INTO public.auth_permission VALUES (36, 'Can view ong', 10, 'view_ong');
INSERT INTO public.auth_permission VALUES (37, 'Can add Zona de Preservação', 13, 'add_zonapreservacao');
INSERT INTO public.auth_permission VALUES (38, 'Can change Zona de Preservação', 13, 'change_zonapreservacao');
INSERT INTO public.auth_permission VALUES (39, 'Can delete Zona de Preservação', 13, 'delete_zonapreservacao');
INSERT INTO public.auth_permission VALUES (40, 'Can view Zona de Preservação', 13, 'view_zonapreservacao');
INSERT INTO public.auth_permission VALUES (41, 'Can add user', 12, 'add_user');
INSERT INTO public.auth_permission VALUES (42, 'Can change user', 12, 'change_user');
INSERT INTO public.auth_permission VALUES (43, 'Can delete user', 12, 'delete_user');
INSERT INTO public.auth_permission VALUES (44, 'Can view user', 12, 'view_user');
INSERT INTO public.auth_permission VALUES (45, 'Can add Região', 11, 'add_regiao');
INSERT INTO public.auth_permission VALUES (46, 'Can change Região', 11, 'change_regiao');
INSERT INTO public.auth_permission VALUES (47, 'Can delete Região', 11, 'delete_regiao');
INSERT INTO public.auth_permission VALUES (48, 'Can view Região', 11, 'view_regiao');
INSERT INTO public.auth_permission VALUES (49, 'Can add Animal', 6, 'add_animal');
INSERT INTO public.auth_permission VALUES (50, 'Can change Animal', 6, 'change_animal');
INSERT INTO public.auth_permission VALUES (51, 'Can delete Animal', 6, 'delete_animal');
INSERT INTO public.auth_permission VALUES (52, 'Can view Animal', 6, 'view_animal');
INSERT INTO public.auth_permission VALUES (53, 'Can add estado', 14, 'add_estado');
INSERT INTO public.auth_permission VALUES (54, 'Can change estado', 14, 'change_estado');
INSERT INTO public.auth_permission VALUES (55, 'Can delete estado', 14, 'delete_estado');
INSERT INTO public.auth_permission VALUES (56, 'Can view estado', 14, 'view_estado');
INSERT INTO public.auth_permission VALUES (57, 'Can add Interação', 15, 'add_interacao');
INSERT INTO public.auth_permission VALUES (58, 'Can change Interação', 15, 'change_interacao');
INSERT INTO public.auth_permission VALUES (59, 'Can delete Interação', 15, 'delete_interacao');
INSERT INTO public.auth_permission VALUES (60, 'Can view Interação', 15, 'view_interacao');
INSERT INTO public.auth_permission VALUES (61, 'Can add Marcador', 16, 'add_marcador');
INSERT INTO public.auth_permission VALUES (62, 'Can change Marcador', 16, 'change_marcador');
INSERT INTO public.auth_permission VALUES (63, 'Can delete Marcador', 16, 'delete_marcador');
INSERT INTO public.auth_permission VALUES (64, 'Can view Marcador', 16, 'view_marcador');
INSERT INTO public.auth_permission VALUES (65, 'Can add Microrregião', 17, 'add_microrregiao');
INSERT INTO public.auth_permission VALUES (66, 'Can change Microrregião', 17, 'change_microrregiao');
INSERT INTO public.auth_permission VALUES (67, 'Can delete Microrregião', 17, 'delete_microrregiao');
INSERT INTO public.auth_permission VALUES (68, 'Can view Microrregião', 17, 'view_microrregiao');
INSERT INTO public.auth_permission VALUES (69, 'Can add Imagem do Animal', 18, 'add_animalimagem');
INSERT INTO public.auth_permission VALUES (70, 'Can change Imagem do Animal', 18, 'change_animalimagem');
INSERT INTO public.auth_permission VALUES (71, 'Can delete Imagem do Animal', 18, 'delete_animalimagem');
INSERT INTO public.auth_permission VALUES (72, 'Can view Imagem do Animal', 18, 'view_animalimagem');
INSERT INTO public.auth_permission VALUES (73, 'Can add Favorito', 19, 'add_favorito');
INSERT INTO public.auth_permission VALUES (74, 'Can change Favorito', 19, 'change_favorito');
INSERT INTO public.auth_permission VALUES (75, 'Can delete Favorito', 19, 'delete_favorito');
INSERT INTO public.auth_permission VALUES (76, 'Can view Favorito', 19, 'view_favorito');


--
-- Data for Name: api_user_user_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: api_zonapreservacao; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.api_zonapreservacao VALUES (1, NULL, 'Parque Nacional da Serra do Itajaí', 'Protege um dos maiores remanescentes de Mata Atlântica de SC.', 'Parque Nacional', '0106000020E610000001000000010300000001000000050000009A999999999948C00000000000003BC066666666666648C00000000000003BC066666666666648C0CDCCCCCCCC4C3BC09A999999999948C0CDCCCCCCCC4C3BC09A999999999948C00000000000003BC0', '2026-06-11 10:18:15.465819-03', '2026-06-11 10:18:15.465836-03');


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: django_admin_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.django_migrations VALUES (1, 'contenttypes', '0001_initial', '2026-06-09 14:17:21.959757-03');
INSERT INTO public.django_migrations VALUES (2, 'contenttypes', '0002_remove_content_type_name', '2026-06-09 14:17:21.963871-03');
INSERT INTO public.django_migrations VALUES (3, 'auth', '0001_initial', '2026-06-09 14:17:21.990072-03');
INSERT INTO public.django_migrations VALUES (4, 'auth', '0002_alter_permission_name_max_length', '2026-06-09 14:17:21.9936-03');
INSERT INTO public.django_migrations VALUES (5, 'auth', '0003_alter_user_email_max_length', '2026-06-09 14:17:21.996977-03');
INSERT INTO public.django_migrations VALUES (6, 'auth', '0004_alter_user_username_opts', '2026-06-09 14:17:22.000095-03');
INSERT INTO public.django_migrations VALUES (7, 'auth', '0005_alter_user_last_login_null', '2026-06-09 14:17:22.003272-03');
INSERT INTO public.django_migrations VALUES (8, 'auth', '0006_require_contenttypes_0002', '2026-06-09 14:17:22.004902-03');
INSERT INTO public.django_migrations VALUES (9, 'auth', '0007_alter_validators_add_error_messages', '2026-06-09 14:17:22.007888-03');
INSERT INTO public.django_migrations VALUES (10, 'auth', '0008_alter_user_username_max_length', '2026-06-09 14:17:22.011058-03');
INSERT INTO public.django_migrations VALUES (11, 'auth', '0009_alter_user_last_name_max_length', '2026-06-09 14:17:22.015075-03');
INSERT INTO public.django_migrations VALUES (12, 'auth', '0010_alter_group_name_max_length', '2026-06-09 14:17:22.019358-03');
INSERT INTO public.django_migrations VALUES (13, 'auth', '0011_update_proxy_permissions', '2026-06-09 14:17:22.026002-03');
INSERT INTO public.django_migrations VALUES (14, 'auth', '0012_alter_user_first_name_max_length', '2026-06-09 14:17:22.030787-03');
INSERT INTO public.django_migrations VALUES (15, 'api', '0001_initial', '2026-06-09 14:17:22.126968-03');
INSERT INTO public.django_migrations VALUES (16, 'admin', '0001_initial', '2026-06-09 14:17:22.143092-03');
INSERT INTO public.django_migrations VALUES (17, 'admin', '0002_logentry_remove_auto_add', '2026-06-09 14:17:22.148316-03');
INSERT INTO public.django_migrations VALUES (18, 'admin', '0003_logentry_add_action_flag_choices', '2026-06-09 14:17:22.155368-03');
INSERT INTO public.django_migrations VALUES (19, 'sessions', '0001_initial', '2026-06-09 14:17:22.166605-03');
INSERT INTO public.django_migrations VALUES (20, 'api', '0002_alter_nivelextincao_options_and_more', '2026-06-11 10:05:55.930849-03');
INSERT INTO public.django_migrations VALUES (21, 'api', '0003_alter_animal_imagem', '2026-08-06 15:23:48.280557-03');
INSERT INTO public.django_migrations VALUES (22, 'api', '0004_alter_animal_nome_cientifico_and_more', '2026-08-06 15:23:48.315864-03');
INSERT INTO public.django_migrations VALUES (23, 'api', '0005_rename_imagem_animal_imagem_principal_animalimagem', '2026-08-06 15:23:48.344639-03');
INSERT INTO public.django_migrations VALUES (24, 'api', '0006_alter_animalimagem_options_and_more', '2026-08-06 15:23:48.373018-03');
INSERT INTO public.django_migrations VALUES (25, 'api', '0007_favorito_delete_interacao', '2026-08-06 17:45:16.046995-03');


--
-- Data for Name: django_session; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Name: api_animal_biomas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_animal_biomas_id_seq', 16, true);


--
-- Name: api_animal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_animal_id_seq', 6, true);


--
-- Name: api_animalimagem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_animalimagem_id_seq', 1, false);


--
-- Name: api_bioma_estados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_bioma_estados_id_seq', 12, true);


--
-- Name: api_bioma_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_bioma_id_seq', 2, true);


--
-- Name: api_estado_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_estado_id_seq', 3, true);


--
-- Name: api_favorito_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_favorito_id_seq', 1, false);


--
-- Name: api_marcador_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_marcador_id_seq', 7, true);


--
-- Name: api_microrregiao_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_microrregiao_id_seq', 11, true);


--
-- Name: api_niveldestruicao_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_niveldestruicao_id_seq', 5, true);


--
-- Name: api_nivelextincao_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_nivelextincao_id_seq', 8, true);


--
-- Name: api_ong_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_ong_id_seq', 1, true);


--
-- Name: api_regiao_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_regiao_id_seq', 1, true);


--
-- Name: api_user_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_user_groups_id_seq', 1, false);


--
-- Name: api_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_user_id_seq', 1, true);


--
-- Name: api_user_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_user_user_permissions_id_seq', 1, false);


--
-- Name: api_zonapreservacao_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_zonapreservacao_id_seq', 1, true);


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 1, false);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 76, true);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.django_admin_log_id_seq', 1, false);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 19, true);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.django_migrations_id_seq', 25, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 5XrEbiiDMBnUZvKQFye8SRVhOML7R6gr7fzHSLe0FGajrqexO8dspR7yjx8BAIi

