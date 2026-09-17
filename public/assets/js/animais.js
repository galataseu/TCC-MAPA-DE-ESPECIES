$(document).ready(function() {
    let animals = [];
    let rightPanelMap = null;
    let rightPanelMarker = null;
    let maskLayer = null;
    let maskPaths = [[[-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]]];
    // Contornos precisos dos biomas (turf, iguais aos desenhados no mapa).
    // Preenchido no initRightPanelMap; "Usar bioma" prefere isto ao invés
    // dos polígonos simplificados da API.
    let rightPanelPreciseBiomeAreas = null;

    // 1. Controle de Acesso por Perfil (Admin vs Usuário Comum)
    const isAdmin = sessionStorage.getItem("adminMode") === "true";
    if (isAdmin) {
        $("#admin-species-form-panel").removeClass("d-none");
        $("#species-display-panel").removeClass("user-mode-display-only");
    } else {
        $("#admin-species-form-panel").addClass("d-none");
        $("#species-display-panel").addClass("user-mode-display-only");
        $("#toggle-btn-map").addClass("d-none");
    }

    // Mapa de cores oficiais para níveis de extinção — FONTE ÚNICA.
    // Chave canônica: sigla minúscula. Chaves numéricas = fallback legado.
    // RE (#B0214F): vinho-rosado entre EW e CR — regionalmente extinta.
    const extinctionColorMap = {
        'ex': '#403E4C', 'ew': '#831F34', 're': '#B0214F', 'cr': '#FF4068', 'en': '#FF6426',
        'vu': '#FFA63A', 'nt': '#217757', 'lc': '#1A5FB4', 'dd': '#555555',
        '1': '#FF4068', // CR
        '2': '#FF6426', // EN
        '3': '#FFA63A', // VU
        '4': '#217757', // NT
        '5': '#1A5FB4', // LC
        '6': '#555555', // DD
        '7': '#403E4C', // EX
        '8': '#831F34',  // EW
        '9': '#B0214F'  // RE
    };

    // Ordem lógica de severidade (o ID do RE no banco é 9, fora de ordem).
    const extinctionSeverityOrder = ['ex', 'ew', 're', 'cr', 'en', 'vu', 'nt', 'lc', 'dd'];

    // Animal sem foto/ícone usa a logotipo do sistema como fallback. Quando a
    // URL for a logotipo, as views exibem o selo "IMAGEM LIVRE NÃO ENCONTRADA".
    function isFallbackLogoUrl(u) {
        return typeof u === 'string' && u.indexOf('logotipo.png') !== -1;
    }

    function formatErrorMessage(data, fallback = 'Tente novamente.') {
        if (!data) return fallback;
        if (typeof data === 'string') return data;
        if (typeof data.error === 'string' && data.error.trim().length > 0) return data.error;
        if (typeof data.message === 'string' && data.message.trim().length > 0) return data.message;
        if (typeof data.detail === 'string' && data.detail.trim().length > 0) return data.detail;
        if (data.error && typeof data.error === 'object') {
            if (typeof data.error.message === 'string') return data.error.message;
            if (typeof data.error.detail === 'string') return data.error.detail;
            const keys = Object.keys(data.error);
            if (keys.length > 0) {
                return keys.map(k => `${k}: ${Array.isArray(data.error[k]) ? data.error[k].join(', ') : data.error[k]}`).join(' | ');
            }
        }
        if (typeof data === 'object') {
            const keys = Object.keys(data).filter(k => k !== 'success');
            if (keys.length > 0) {
                const msgs = [];
                for (const k of keys) {
                    const val = data[k];
                    if (typeof val === 'string') msgs.push(`${k}: ${val}`);
                    else if (Array.isArray(val)) msgs.push(`${k}: ${val.join(', ')}`);
                    else if (val && typeof val === 'object') msgs.push(`${k}: ${JSON.stringify(val)}`);
                }
                if (msgs.length > 0) return msgs.join('\n');
            }
        }
        return fallback;
    }

    // Carregar animais da API imediatamente
    loadAnimals();

    function loadAnimals() {
        fetch('/api/animals')
            .then(response => response.json())
            .then(data => {
                animals = data;
                renderSpeciesGrid(animals);
            })
            .catch(error => {
                console.error('Erro ao buscar animais:', error);
            });
    }

    // 2. Carregar níveis de extinção e biomas para os selects
    fetch('/api/v1/niveis-extincao/')
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data) {
                const select = $('.select-nivel-extincao');
                select.empty();
                select.append('<option value="" style="background-color: #2B2A33; color: #FFF;">NÍVEL DE EXTINÇÃO</option>');
                const ordered = [...res.data].sort((a, b) => {
                    const ia = extinctionSeverityOrder.indexOf(String(a.sigla || '').toLowerCase());
                    const ib = extinctionSeverityOrder.indexOf(String(b.sigla || '').toLowerCase());
                    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                });
                ordered.forEach(n => {
                    const sigla = (n.sigla || '').toLowerCase();
                    const color = extinctionColorMap[sigla] || extinctionColorMap[String(n.id)] || '#383642';
                    const textColor = sigla === 'vu' ? '#111111' : '#FFFFFF';
                    select.append(`<option value="${n.id}" data-sigla="${sigla}" style="background-color: ${color}; color: ${textColor}; font-weight: bold; padding: 8px;">${n.nome}</option>`);
                });
            }
        }).catch(err => console.error(err));

    fetch('/api/v1/biomas/')
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data) {
                const select = $('#bioma-selector');
                select.empty();
                res.data.forEach(b => {
                    select.append(`<option value="${b.id}" selected>${b.nome}</option>`);
                });
            }
        }).catch(err => console.error(err));

    // Mudar cor dinamicamente ao selecionar Nível de Extinção.
    // Usa a sigla da option (fonte canônica); o ID é só fallback.
    $(document).on('change', '.select-nivel-extincao', function() {
        const val = $(this).val();
        const sigla = String($(this).find('option:selected').data('sigla') || '').toLowerCase();
        const color = extinctionColorMap[sigla] || extinctionColorMap[val] || '#383642';
        const textColor = sigla === 'vu' ? '#111111' : '#FFFFFF';
        $(this).css({
            'background-color': color,
            'border-color': color,
            'color': textColor,
            'font-weight': 'bold'
        });
    });

    // Interatividade com os Chips de Biomas
    $(document).on('click', '.biome-chip', function() {
        const isSelected = $(this).attr('data-selected') === 'true';
        const newSelected = !isSelected;
        $(this).attr('data-selected', newSelected ? 'true' : 'false');
        
        const icon = $(this).find('.chip-icon');
        if (newSelected) {
            icon.removeClass('fa-plus').addClass('fa-check');
        } else {
            icon.removeClass('fa-check').addClass('fa-plus');
        }

        const selectedIds = [];
        $('.biome-chip[data-selected="true"]').each(function() {
            selectedIds.push($(this).attr('data-id'));
        });
        $('#bioma-selector').val(selectedIds);
    });

    // Fechar menu de 3 pontinhos ao clicar fora
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.species-card-menu-btn, .species-card-menu-dropdown').length) {
            $('.species-card-menu-dropdown').remove();
        }
    });

    // Mapeamento de classe de animal para textura em 45°
    function getAnimalTextureClass(classe) {
        if (!classe) return 'texture-default';
        const c = classe.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (c.includes('mamif') || c.includes('mammal')) return 'texture-mamiferos';
        if (c.includes('ave') || c.includes('bird')) return 'texture-aves';
        if (c.includes('rept') || c.includes('reptil')) return 'texture-repteis';
        if (c.includes('amfib') || c.includes('anfib') || c.includes('amphib')) return 'texture-anfibios';
        if (c.includes('cartilag') || c.includes('chondrichthyes')) return 'texture-peixes-cartilaginosos';
        if (c.includes('osse') || c.includes('osteichthyes') || c.includes('peix') || c.includes('fish')) return 'texture-peixes-osseos';
        return 'texture-default';
    }

    function getAnimalImages(animal) {
        const images = [];
        if (animal.imagens && Array.isArray(animal.imagens) && animal.imagens.length > 0) {
            animal.imagens.forEach(imgObj => {
                const raw = typeof imgObj === 'string' ? imgObj : (imgObj && imgObj.imagem ? imgObj.imagem : '');
                if (raw && typeof raw === 'string' && raw.trim() && !raw.includes('logotipo.png') && !raw.includes('falta_imagem') && !raw.includes('Falta_imagem')) {
                    const u = raw.startsWith('http') || raw.startsWith('/') || raw.startsWith('data:') ? raw : `/media/${raw}`;
                    if (!images.includes(u)) images.push(u);
                }
            });
        }
        if (animal.imagem && typeof animal.imagem === 'string' && !animal.imagem.includes('logotipo.png') && !animal.imagem.includes('falta_imagem') && !animal.imagem.includes('Falta_imagem')) {
            const u = animal.imagem.startsWith('http') || animal.imagem.startsWith('/') || animal.imagem.startsWith('data:') ? animal.imagem : `/media/${animal.imagem}`;
            if (!images.includes(u)) images.push(u);
        }
        // Ícone NÃO entra na galeria: é exibido só no pino do mapa e no preview de edição.
        // De preferência de 1 a 3 imagens por card
        const finalImgs = images.slice(0, 3);
        if (finalImgs.length === 0) {
            finalImgs.push('/assets/img/logotipo.png');
        }
        return finalImgs;
    }

    let cardSlideshowInterval = null;
    function startCardSlideshows() {
        if (cardSlideshowInterval) clearInterval(cardSlideshowInterval);
        cardSlideshowInterval = setInterval(() => {
            $('.species-card-slideshow').each(function() {
                const container = $(this);
                const imgs = container.find('.card-slide-img');
                if (imgs.length <= 1) return;

                const activeImg = container.find('.card-slide-img.active');
                let nextImg = activeImg.next('.card-slide-img');
                if (!nextImg.length) {
                    nextImg = imgs.first();
                }

                const nextIndex = nextImg.index('.card-slide-img');
                container.find('.card-slide-dot').removeClass('active').eq(nextIndex).addClass('active');

                activeImg.removeClass('active').addClass('exit-left');
                nextImg.removeClass('exit-left').addClass('active');

                setTimeout(() => {
                    activeImg.removeClass('exit-left');
                }, 800);
            });
        }, 3500);
    }

    function getAnimalBiomesHtml(animal) {
        if (!animal.biomas || !Array.isArray(animal.biomas) || animal.biomas.length === 0) {
            return '<span class="mini-biome-chip mini-biome-chip-default">Geral</span>';
        }

        return animal.biomas.map(b => {
            let bId = '';
            let bName = '';
            if (typeof b === 'object' && b !== null) {
                bId = String(b.id || '');
                bName = b.nome || '';
            } else {
                bId = String(b);
                bName = String(b);
            }

            const nameLower = (bName || '').toLowerCase();
            let cssClass = 'mini-biome-chip-default';
            if (bId === '1' || nameLower.includes('mata')) {
                cssClass = 'biome-chip-mata-atlantica';
                bName = 'Mata Atlântica';
            } else if (bId === '2' || nameLower.includes('pampa')) {
                cssClass = 'biome-chip-pampa';
                bName = 'Pampa';
            } else if (bId === '3' || nameLower.includes('cerrado')) {
                cssClass = 'biome-chip-cerrado';
                bName = 'Cerrado';
            }

            return `<span class="mini-biome-chip ${cssClass}">${bName || 'Bioma'}</span>`;
        }).join('');
    }

    // Renderizar os Cards Coloridos de Tamanho Fixo no Painel Direito.
    // Favoritos aparecem SÓ na seção Favoritos (acima), nunca duplicados.
    function renderSpeciesGrid(filteredAnimals) {
        const gridContainer = $('#animalCardsGrid');
        const favGrid = $('#favGrid');
        const favSection = $('#fav-section');
        gridContainer.empty();
        if (favGrid.length) favGrid.empty();

        const isFav = (typeof favIsFav === 'function') ? favIsFav : function () { return false; };
        const favs = (filteredAnimals || []).filter(a => isFav(a.id));
        const rest = (filteredAnimals || []).filter(a => !isFav(a.id));

        if (favSection.length) {
            if (favs.length > 0) {
                favSection.removeClass('d-none');
                favs.forEach((animal) => { favGrid.append(buildSpeciesCard(animal)); });
            } else {
                favSection.addClass('d-none');
            }
        }
        // Seção Favoritos some junto quando a busca não retorna nada
        // (cards já nascem com estrela/sino certos via favCardButtons,
        //  então não chama refreshFavUI aqui p/ evitar recursão).
        if (rest.length === 0 && favs.length === 0) {
            gridContainer.html('<div class="col-12 text-center text-muted py-5"><p>Nenhuma espécie encontrada.</p></div>');
            if (favSection.length) favSection.addClass('d-none');
            return;
        }

        rest.forEach((animal) => {
            gridContainer.append(buildSpeciesCard(animal));
        });

        startCardSlideshows();
    }

    // Re-renderiza a divisão Favoritos/Geral (ex: ao favoritar/desfavoritar).
    window.__favSectionRefresh = function () {
        const term = ($('#animalSearch').val() || '').toLowerCase().trim();
        if (!term) { renderSpeciesGrid(animals); return; }
        const filtered = animals.filter(a => {
            const sigla = (a.api_nivelextincao ? a.api_nivelextincao.sigla : (a.nivel_sigla || '')).toLowerCase();
            return (a.nome_comum && a.nome_comum.toLowerCase().includes(term)) ||
                (a.nome_cientifico && a.nome_cientifico.toLowerCase().includes(term)) ||
                (a.classe && a.classe.toLowerCase().includes(term)) ||
                sigla.includes(term);
        });
        renderSpeciesGrid(filtered);
    };

    function buildSpeciesCard(animal) {
            const textureClass = getAnimalTextureClass(animal.classe);
            const formattedId = String(animal.id).padStart(4, '0');
            const dataFormatted = animal.created_at ? new Date(animal.created_at).toLocaleDateString('pt-BR') : '00/00/0000';
            const autor = animal.api_user ? (animal.api_user.username || 'adm123') : 'adm123';

            // Resgatar sigla de extinção e cor
            const sigla = (animal.api_nivelextincao ? animal.api_nivelextincao.sigla : (animal.nivel_sigla || 'CR')).toUpperCase();
            const extinctionColor = extinctionColorMap[sigla.toLowerCase()] || extinctionColorMap[String(animal.nivel_extincao_id)] || '#FF4068';
            const biomasHtml = getAnimalBiomesHtml(animal);

            const imgs = getAnimalImages(animal);
            const imgsFallback = imgs.length > 0 && imgs.every(isFallbackLogoUrl);
            const slidesHtml = imgs.map((src, i) => `
                <img src="${src}" alt="${animal.nome_comum}${isFallbackLogoUrl(src) ? ' — imagem livre não encontrada' : ''}" class="card-slide-img ${i === 0 ? 'active' : ''}${isFallbackLogoUrl(src) ? ' img-fallback-logo' : ''}">
            `).join('');

            const dotsHtml = imgs.length > 1 ? `
                <div class="card-slideshow-dots">
                    ${imgs.map((_, idx) => `<span class="card-slide-dot ${idx === 0 ? 'active' : ''}"></span>`).join('')}
                </div>
            ` : '';

            const menuButtonHtml = isAdmin ? `
                <button type="button" class="species-card-menu-btn" title="Opções" onclick="event.stopPropagation(); toggleAnimalMenu('${animal.id}', this, event)">
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
            ` : '';

            const footerHtml = isAdmin ? `
                <div class="species-card-footer">
                    <span class="species-card-id-pill">${formattedId}</span>
                    <div class="species-card-meta">
                        <div>@${autor}</div>
                        <div>${dataFormatted}</div>
                    </div>
                </div>
            ` : '';

            const cardHtml = `
                <div class="species-card ${textureClass}" data-id="${animal.id}" data-fav-id="${animal.id}" onclick="showDetails('${animal.id}')" style="cursor: pointer; background-color: ${extinctionColor};">
                    ${menuButtonHtml}
                    ${(typeof favCardButtons === 'function') ? favCardButtons(animal) : ''}
                    <span class="species-card-extinction-badge" style="background-color: ${extinctionColor};">${sigla}</span>
                    <div class="species-card-slideshow">
                        ${slidesHtml}
                        ${dotsHtml}
                        ${imgsFallback ? '<span class="no-photo-badge"><i class="fa-solid fa-triangle-exclamation"></i>Imagem livre não encontrada</span>' : ''}
                        <div class="species-card-slideshow-overlay"></div>
                    </div>
                    <div class="species-card-body">
                        <div class="species-card-name-wrapper">
                            <span class="species-card-name" title="${animal.nome_comum}">${animal.nome_comum}</span>
                            <span class="species-card-scientific-name" title="${animal.nome_cientifico || ''}">${animal.nome_cientifico || ''}</span>
                        </div>
                        <div class="species-card-biomes-wrapper">
                            ${biomasHtml}
                        </div>
                        ${footerHtml}
                    </div>
                </div>
            `;
            return cardHtml;
    }

    // Menu de 3 Pontinhos no Card (Editar e Excluir)
    window.toggleAnimalMenu = function(id, btnEl, e) {
        e.stopPropagation();
        $('.species-card-menu-dropdown').remove();

        const card = $(btnEl).closest('.species-card');
        const dropdown = $(`
            <div class="species-card-menu-dropdown">
                <div class="species-card-menu-item" onclick="event.stopPropagation(); populateFormForEdit('${id}'); $('.species-card-menu-dropdown').remove();">
                    <i class="fa-solid fa-pen-to-square text-warning"></i>
                    <span>Editar</span>
                </div>
                <div class="species-card-menu-item text-danger" onclick="event.stopPropagation(); deleteAnimal('${id}'); $('.species-card-menu-dropdown').remove();">
                    <i class="fa-solid fa-trash"></i>
                    <span>Excluir</span>
                </div>
            </div>
        `);
        card.append(dropdown);
    };

    // Exclusão de Animal com Confirmação Dupla
    window.deleteAnimal = async function(id) {
        const animal = animals.find(a => a.id == id);
        const name = animal ? animal.nome_comum : 'esta espécie';

        if (!await systemConfirm(`Tem certeza que deseja excluir "${name}"?`, { title: 'Excluir espécie' })) return;
        if (!await systemConfirm(`CONFIRMAÇÃO FINAL:\n\nEsta ação excluirá permanentemente "${name}" do sistema.\n\nDeseja continuar?`, { title: 'Confirmação final' })) return;

        fetch(`/api/v1/animais/${id}/`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    systemAlert(`"${name}" foi excluído com sucesso!`, 'success');
                    if ($('#animal-id-hidden').val() == id) {
                        resetForm();
                    }
                    loadAnimals();
                } else {
                    systemAlert('Erro ao excluir: ' + formatErrorMessage(data, 'Tente novamente.'), 'error');
                }
            })
            .catch(err => {
                console.error(err);
                systemAlert('Erro de conexão ao excluir animal: ' + (err.message || 'Falha de comunicação.'), 'error');
            });
    };

    // 4. Preencher formulário ao clicar em "Editar" (Modo Edição)
    window.populateFormForEdit = function(id) {
        const animal = animals.find(a => a.id == id);
        if (!animal) return;

        $('#animal-id-hidden').val(animal.id);
        $('#nome_comum').val(animal.nome_comum || '');
        $('#nome_cientifico').val(animal.nome_cientifico || '');
        $('#classe').val(animal.classe || 'Mammalia');
        $('#familia').val(animal.familia || '');
        $('#peso').val(animal.peso || '');
        $('#altura').val(animal.altura || '');
        $('#dieta').val(animal.dieta || '');
        $('#habitos').val(animal.habitos || animal.obs || '');

        if (animal.nivel_extincao_id) {
            $('.select-nivel-extincao').val(animal.nivel_extincao_id).trigger('change');
        }

        if (animal.biomas && Array.isArray(animal.biomas)) {
            const biomaIds = animal.biomas.map(b => String(typeof b === 'object' ? b.id : b));
            $('.biome-chip').each(function() {
                const chipId = String($(this).attr('data-id'));
                const selectIt = biomaIds.includes(chipId);
                $(this).attr('data-selected', selectIt ? 'true' : 'false');
                const icon = $(this).find('.chip-icon');
                if (selectIt) icon.removeClass('fa-plus').addClass('fa-check');
                else icon.removeClass('fa-check').addClass('fa-plus');
            });
            $('#bioma-selector').val(biomaIds);
        }

        // Galeria: carrega as fotos já salvas (como itens existentes) para
        // que novas fotos ACUMULEM em vez de apagar as anteriores no save.
        pageSelectedFiles = [];
        const existingImgs = animal.imagens && Array.isArray(animal.imagens) ? animal.imagens : [];
        existingImgs.forEach(imgObj => {
            const raw = typeof imgObj === 'string' ? imgObj : (imgObj && imgObj.imagem ? imgObj.imagem : '');
            if (raw && typeof raw === 'string' && raw.trim() && !raw.includes('logotipo.png') && !raw.includes('falta_imagem') && !raw.includes('Falta_imagem')) {
                const u = raw.startsWith('http') || raw.startsWith('/') || raw.startsWith('data:') ? raw : `/media/${raw}`;
                pageSelectedFiles.push({
                    id: 'pg_old_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
                    file: u,
                    currentX: 0,
                    currentY: 0,
                    scale: 1.0
                });
            }
        });
        pageGalleryTouched = false;
        renderPageImageGallery();

        // Preview da imagem
        let imgUrl = animal.imagens && animal.imagens.length > 0 ? (typeof animal.imagens[0] === 'string' ? animal.imagens[0] : animal.imagens[0].imagem) : (animal.imagem || '');
        if (imgUrl) {
            $('#image-preview-img').attr('src', imgUrl.startsWith('http') || imgUrl.startsWith('/') ? imgUrl : `/media/${imgUrl}`).removeClass('d-none');
            $('#image-preview-content').addClass('d-none');
        }

        // Preview do ícone
        // Limpa base64 antigo: regenerado do preview no submit; sem isso o
        // ícone do animal editado ANTES vazava para ESTE animal.
        $('#input-icon-base64').val('');
        let iconUrl = animal.icone || imgUrl;
        if (iconUrl) {
            $('#icon-preview-img').attr('src', iconUrl.startsWith('http') || iconUrl.startsWith('/') || iconUrl.startsWith('data:') ? iconUrl : `/media/${iconUrl}`).removeClass('d-none').css('transform', 'none');
            $('#icon-preview-content').addClass('d-none');
        }

        // Atualizar coordenadas e marcadores no minimapa.
        // Se o polígono ainda não foi carregado via /api/animals, tenta via
        // /api/markers (que sempre traz area_polygon parseado).
        clearDraftMarkers();
        $.getJSON('/api/markers', function(markersData) {
            if (markersData && markersData.features) {
                const animalFeatures = markersData.features.filter(f => f.properties.animal_id == id);
                if (animalFeatures.length > 0) {
                    animalFeatures.forEach(f => {
                        const coords = f.geometry.coordinates; // [lng, lat]
                        addDraftMarker(coords[1], coords[0]);
                    });
                    const first = animalFeatures[0].geometry.coordinates;
                    if (rightPanelMap) rightPanelMap.setView([first[1], first[0]], 8);
                    const mp = animalFeatures[0].properties || {};
                    const stillEmpty = !draftPolygonsList || draftPolygonsList.length === 0 ||
                        draftPolygonsList.every(r => !r || r.length === 0);
                    if (stillEmpty && mp.area_polygon) {
                        if (loadPolygonFromData(mp.area_polygon, mp.area_polygon_color)) {
                            try { $('#polygon-color-picker').val(polygonColor); } catch (e) {}
                            redrawDraftPolygonLayers();
                        }
                    }
                } else {
                    addDraftMarker(-27.59, -48.54);
                }
            } else {
                addDraftMarker(-27.59, -48.54);
            }
        }).fail(function() {
            addDraftMarker(-27.59, -48.54);
        });

        // Carregar polígono de área de ocorrência existente (se houver).
        // Aceita `area_polygon` já parseado (novo /api/animals) ou o formato
        // legado embutido em `obs` com [[POLYGON_DATA]].
        function loadPolygonFromData(data, fallbackColor) {
            if (!data) return false;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch(e){ return false; }
            }
            if (data && typeof data === 'object' && !Array.isArray(data) && data.polygons) {
                polygonColor = data.color || fallbackColor || '#FFAA44';
                draftPolygonsList = data.polygons;
                return true;
            } else if (Array.isArray(data) && data.length > 0) {
                polygonColor = fallbackColor || '#FFAA44';
                if (Array.isArray(data[0]) && Array.isArray(data[0][0])) {
                    draftPolygonsList = data;
                } else {
                    draftPolygonsList = [data];
                }
                return true;
            }
            return false;
        }
        polygonHistory = [];
        polygonRedo = [];
        updateUndoRedoButtonsUI();
        let polygonLoaded = loadPolygonFromData(animal.area_polygon, animal.area_polygon_color);
        if (!polygonLoaded && animal.obs && typeof animal.obs === 'string' && animal.obs.includes('[[POLYGON_DATA]]')) {
            try {
                const parsed = JSON.parse(animal.obs.split('[[POLYGON_DATA]]')[1].trim());
                polygonLoaded = loadPolygonFromData(parsed, animal.area_polygon_color);
            } catch (e) {}
        }
        if (!polygonLoaded) {
            draftPolygonsList = [[]];
        }
        try { $('#polygon-color-picker').val(polygonColor); } catch (e) {}
        redrawDraftPolygonLayers();
    };

    // Pesquisa em tempo real ultra-rápida na lista
    $('#animalSearch').on('input', function() {
        const term = $(this).val().toLowerCase().trim();
        if (!term) {
            renderSpeciesGrid(animals);
            return;
        }
        const filtered = animals.filter(a => {
            const sigla = (a.api_nivelextincao ? a.api_nivelextincao.sigla : (a.nivel_sigla || '')).toLowerCase();
            return (a.nome_comum && a.nome_comum.toLowerCase().includes(term)) ||
                (a.nome_cientifico && a.nome_cientifico.toLowerCase().includes(term)) ||
                (a.classe && a.classe.toLowerCase().includes(term)) ||
                sigla.includes(term);
        });
        renderSpeciesGrid(filtered);
    });

    // Alternância de Abas (Animais Cadastrados vs Mapa)
    $('#toggle-btn-list').click(function() {
        $(this).addClass('active');
        $('#toggle-btn-map').removeClass('active');
        $('#panel-view-list').removeClass('d-none');
        $('#panel-view-map').addClass('d-none');
    });

    $('#toggle-btn-map').click(function() {
        if (!isAdmin) return;
        $(this).addClass('active');
        $('#toggle-btn-list').removeClass('active');
        $('#panel-view-map').removeClass('d-none');
        $('#panel-view-list').addClass('d-none');
        initRightPanelMap();
        if (rightPanelMap) {
            setTimeout(() => rightPanelMap.invalidateSize(), 150);
        }
    });

    // Gerenciador de Polígonos de Ocorrência da Espécie (Multi-Áreas, Undo/Redo & Cores)
    let isDrawingPolygon = false;
    let draftPolygonsList = [[]];
    let polygonColor = '#FFAA44';
    let polygonHistory = [];
    let polygonRedo = [];
    let polygonLayersGroup = L.layerGroup();

    function updateUndoRedoButtonsUI() {
        $('#btn-undo-polygon').prop('disabled', polygonHistory.length === 0).toggleClass('opacity-50', polygonHistory.length === 0);
        $('#btn-redo-polygon').prop('disabled', polygonRedo.length === 0).toggleClass('opacity-50', polygonRedo.length === 0);
    }

    function savePolygonHistoryState() {
        const stateCopy = {
            color: polygonColor,
            polygons: JSON.parse(JSON.stringify(draftPolygonsList))
        };
        polygonHistory.push(stateCopy);
        if (polygonHistory.length > 50) polygonHistory.shift();
        polygonRedo = [];
        updateUndoRedoButtonsUI();
    }

    function undoPolygonState() {
        if (polygonHistory.length === 0) return;
        const currentState = {
            color: polygonColor,
            polygons: JSON.parse(JSON.stringify(draftPolygonsList))
        };
        polygonRedo.push(currentState);
        const prevState = polygonHistory.pop();
        polygonColor = prevState.color || '#FFAA44';
        $('#polygon-color-picker').val(polygonColor);
        draftPolygonsList = prevState.polygons || [[]];
        redrawDraftPolygonLayers();
        updateUndoRedoButtonsUI();
    }

    function redoPolygonState() {
        if (polygonRedo.length === 0) return;
        const currentState = {
            color: polygonColor,
            polygons: JSON.parse(JSON.stringify(draftPolygonsList))
        };
        polygonHistory.push(currentState);
        const nextState = polygonRedo.pop();
        polygonColor = nextState.color || '#FFAA44';
        $('#polygon-color-picker').val(polygonColor);
        draftPolygonsList = nextState.polygons || [[]];
        redrawDraftPolygonLayers();
        updateUndoRedoButtonsUI();
    }

    function updatePolygonHiddenInput() {
        const validPolygons = draftPolygonsList.filter(ring => ring && ring.length >= 3);
        const totalPoints = validPolygons.reduce((acc, ring) => acc + ring.length, 0);
        const currentRing = draftPolygonsList[draftPolygonsList.length - 1];
        const currentPts = (currentRing && currentRing.length > 0) ? currentRing.length : 0;

        if (validPolygons.length > 0 || currentPts > 0) {
            const payload = {
                color: polygonColor,
                polygons: validPolygons
            };
            $('#area-polygon-json-hidden').val(JSON.stringify(payload));
            let badgeText = `Área: ${validPolygons.length} área(s) (${totalPoints} pts)`;
            if (isDrawingPolygon && currentPts < 3) {
                badgeText = `Desenhando: ${currentPts} ponto(s)... (mín 3)`;
            } else if (isDrawingPolygon) {
                badgeText = `Desenhando: ${currentPts} pts na área atual`;
            }
            $('#polygon-status-badge')
                .text(badgeText)
                .removeClass('bg-dark text-warning')
                .addClass('bg-success text-white');
        } else {
            $('#area-polygon-json-hidden').val('');
            $('#polygon-status-badge')
                .text('Área: Todo o Mapa')
                .removeClass('bg-success text-white')
                .addClass('bg-dark text-warning');
        }
    }

    window.editPolygonRingByRef = function(ringIndex) {
        savePolygonHistoryState();
        if (ringIndex >= 0 && ringIndex < draftPolygonsList.length) {
            const target = draftPolygonsList.splice(ringIndex, 1)[0];
            draftPolygonsList.push(target);
            redrawDraftPolygonLayers();
        }
        if (rightPanelMap) rightPanelMap.closePopup();
    };

    window.deletePolygonRingByRef = function(ringIndex) {
        savePolygonHistoryState();
        if (ringIndex >= 0 && ringIndex < draftPolygonsList.length) {
            draftPolygonsList.splice(ringIndex, 1);
        }
        if (draftPolygonsList.length === 0) {
            draftPolygonsList = [[]];
        }
        redrawDraftPolygonLayers();
        if (rightPanelMap) rightPanelMap.closePopup();
    };

    function redrawDraftPolygonLayers() {
        if (!rightPanelMap) return;
        polygonLayersGroup.clearLayers();
        if (!rightPanelMap.hasLayer(polygonLayersGroup)) {
            polygonLayersGroup.addTo(rightPanelMap);
        }

        draftPolygonsList.forEach((ring, idx) => {
            if (!ring || ring.length === 0) return;
            const isCurrentActive = (idx === draftPolygonsList.length - 1);
            let polyLayer = null;

            ring.forEach((pt) => {
                L.circleMarker(pt, {
                    radius: 5,
                    color: polygonColor,
                    fillColor: '#FFFFFF',
                    fillOpacity: 1,
                    weight: 2,
                    interactive: false
                }).addTo(polygonLayersGroup);
            });

            if (ring.length >= 3) {
                polyLayer = L.polygon(ring, {
                    color: polygonColor,
                    fillColor: polygonColor,
                    fillOpacity: isCurrentActive ? 0.4 : 0.25,
                    weight: isCurrentActive ? 3 : 2,
                    dashArray: isCurrentActive ? '5, 5' : null
                }).addTo(polygonLayersGroup);
            } else if (ring.length > 0) {
                polyLayer = L.polyline(ring, {
                    color: polygonColor,
                    weight: 3,
                    dashArray: '5, 5'
                }).addTo(polygonLayersGroup);
            }

            if (polyLayer) {
                const ringIndex = idx;
                polyLayer.on('contextmenu', function(e) {
                    L.DomEvent.stopPropagation(e);
                    
                    const popupContent = `
                        <div style="text-align: center; padding: 4px; min-width: 140px;">
                            <strong style="color: ${polygonColor}; font-size: 13px;">Área #${ringIndex + 1} (${ring.length} pts)</strong>
                            <div class="d-flex flex-column gap-2 mt-2">
                                <button type="button" class="btn btn-sm btn-info rounded-pill fw-bold text-dark" onclick="editPolygonRingByRef(${ringIndex})">
                                    <i class="fa-solid fa-pen me-1"></i> Editar Área
                                </button>
                                <button type="button" class="btn btn-sm btn-danger rounded-pill fw-bold" onclick="deletePolygonRingByRef(${ringIndex})">
                                    <i class="fa-solid fa-trash me-1"></i> Excluir Área
                                </button>
                            </div>
                        </div>
                    `;

                    L.popup()
                        .setLatLng(e.latlng)
                        .setContent(popupContent)
                        .openOn(rightPanelMap);
                });
            }
        });

        updatePolygonHiddenInput();
    }

    $(document).on('click', '#btn-draw-polygon-mode', function() {
        isDrawingPolygon = !isDrawingPolygon;
        if (isDrawingPolygon) {
            $(this).removeClass('btn-info text-dark').addClass('btn-success text-white');
            $(this).html('<i class="fa-solid fa-check me-1"></i> Concluir Polígono');
            if (rightPanelMap) rightPanelMap.getContainer().style.cursor = 'crosshair';
        } else {
            $(this).removeClass('btn-success text-white').addClass('btn-info text-dark');
            $(this).html('<i class="fa-solid fa-draw-polygon me-1"></i> Desenhar Área');
            if (rightPanelMap) rightPanelMap.getContainer().style.cursor = '';
        }
    });

    $(document).on('click', '#btn-new-polygon-area', function() {
        const lastRing = draftPolygonsList[draftPolygonsList.length - 1];
        if (lastRing && lastRing.length >= 3) {
            savePolygonHistoryState();
            draftPolygonsList.push([]);
            redrawDraftPolygonLayers();
        } else {
            systemAlert('Complete pelo menos 3 pontos no polígono atual antes de iniciar uma nova área.', 'warning');
        }
    });

    $(document).on('click', '#btn-undo-polygon', function() {
        undoPolygonState();
    });

    $(document).on('click', '#btn-redo-polygon', function() {
        redoPolygonState();
    });

    $(document).on('change input', '#polygon-color-picker', function() {
        savePolygonHistoryState();
        polygonColor = $(this).val();
        redrawDraftPolygonLayers();
    });

    $(document).on('click', '#btn-clear-polygon', function() {
        savePolygonHistoryState();
        draftPolygonsList = [[]];
        polygonLayersGroup.clearLayers();
        isDrawingPolygon = false;
        $('#btn-draw-polygon-mode').removeClass('btn-success text-white').addClass('btn-info text-dark')
            .html('<i class="fa-solid fa-draw-polygon me-1"></i> Desenhar Área');
        if (rightPanelMap) rightPanelMap.getContainer().style.cursor = '';
        updatePolygonHiddenInput();
    });

    // Usar bioma inteiro como área de ocorrência (sem desenhar manualmente).
    // Usa os contornos PRECISOS calculados via turf (iguais aos desenhados no
    // mapa); só cai p/ os polígonos simplificados da API se o mapa ainda não
    // terminou de calcular. Depois dá para editar/excluir via botão direito.
    const BIOME_AREA_META = {
        mata_atlantica: { nome: 'Mata Atlântica', color: '#1B5E20' },
        pampa: { nome: 'Pampa', color: '#9C7A2E' },
        cerrado: { nome: 'Cerrado', color: '#B8912E' }
    };
    // GeoJSON ([lng,lat]) -> anéis [lat,lng] (só anel externo: buraco não vira área).
    function geoJsonToLatLngRings(geo) {
        const rings = [];
        if (!geo) return rings;
        const collect = (g) => {
            if (!g) return;
            if (g.type === 'FeatureCollection') (g.features || []).forEach(collect);
            else if (g.type === 'GeometryCollection') (g.geometries || []).forEach(collect);
            else if (g.type === 'Feature') collect(g.geometry);
            else if (g.type === 'Polygon') { if (g.coordinates && g.coordinates[0]) rings.push(g.coordinates[0]); }
            else if (g.type === 'MultiPolygon') (g.coordinates || []).forEach(p => { if (p && p[0]) rings.push(p[0]); });
        };
        collect(geo);
        return rings
            .map(ring => ring.map(c => [parseFloat(c[1]), parseFloat(c[0])]).filter(pt => !isNaN(pt[0]) && !isNaN(pt[1])))
            .filter(ring => ring.length >= 3);
    }
    // A Mata da lei é nacional: recorta p/ PR+SC+RS p/ não vazar p/ fora do Sul.
    // Um intersect por estado (sem union global): se um falhar, os outros
    // ainda valem — nunca cai no polígono grosseiro da API por um erro só.
    function clipForestToSouth(cleanForest, prData, scData, rsData) {
        try {
            if (!window.turf || !cleanForest) return null;
            const parts = [];
            [prData, scData, rsData].forEach(d => {
                try {
                    const f = d && d.features && d.features[0];
                    if (!f) return;
                    let part = null;
                    try {
                        part = turf.intersect(cleanForest, f);
                    } catch (e1) {
                        try {
                            part = turf.intersect({ type: 'FeatureCollection', features: [cleanForest, f] });
                        } catch (e2) { part = null; }
                    }
                    if (part) parts.push(part);
                } catch (e) {}
            });
            if (parts.length === 0) return null;
            return { type: 'FeatureCollection', features: parts };
        } catch (e) { return null; }
    }
    let biomasAreasCache = null;
    function fetchBiomasAreas() {
        if (biomasAreasCache) return Promise.resolve(biomasAreasCache);
        return fetch('/api/v1/biomas-areas/')
            .then(r => r.json())
            .then(res => {
                const arr = (res && res.data) || res || [];
                biomasAreasCache = Array.isArray(arr) ? arr : [];
                return biomasAreasCache;
            });
    }
    function selectBiomeChipByKey(key) {
        const term = key === 'mata_atlantica' ? 'mata' : key;
        let matched = false;
        $('.biome-chip').each(function() {
            const label = ($(this).text() || '').toLowerCase();
            if (label.includes(term)) {
                $(this).attr('data-selected', 'true');
                $(this).find('.chip-icon').removeClass('fa-plus').addClass('fa-check');
                matched = true;
            }
        });
        if (matched) {
            const selectedIds = [];
            $('.biome-chip[data-selected="true"]').each(function() {
                selectedIds.push($(this).attr('data-id'));
            });
            $('#bioma-selector').val(selectedIds);
        }
    }
    // Ramer-Douglas-Peucker puro: afina anéis gigantes (biomas precisos)
    // para ~220m de desvio máx. Anéis pequenos passam intactos.
    function simplifyPageBigRingRDP(ring, eps) {
        var pts = ring.map(function (p) { return [parseFloat(p[0]), parseFloat(p[1])]; });
        if (pts.length <= 1000) return pts;
        eps = eps || 0.002;
        var keep = new Array(pts.length).fill(false);
        keep[0] = keep[pts.length - 1] = true;
        var segD2 = function (p, a, b) {
            var dx = b[1] - a[1], dy = b[0] - a[0];
            var L2 = dx * dx + dy * dy;
            var t = L2 > 0 ? ((p[1] - a[1]) * dx + (p[0] - a[0]) * dy) / L2 : 0;
            t = Math.max(0, Math.min(1, t));
            var ex = a[1] + t * dx - p[1], ey = a[0] + t * dy - p[0];
            return ex * ex + ey * ey;
        };
        var stack = [[0, pts.length - 1]];
        while (stack.length) {
            var seg = stack.pop();
            var i0 = seg[0], i1 = seg[1];
            var dmax = -1, imax = -1;
            for (var i = i0 + 1; i < i1; i++) {
                var d = segD2(pts[i], pts[i0], pts[i1]);
                if (d > dmax) { dmax = d; imax = i; }
            }
            if (dmax > eps * eps && imax > 0) {
                keep[imax] = true;
                stack.push([i0, imax], [imax, i1]);
            }
        }
        return pts.filter(function (_, i) { return keep[i]; });
    }
    // Seleciona os anéis representativos: descarta micro-ilhas (<~200m de
    // lado), fica com os 25 maiores e afina com RDP (tol 0.003 ≈ 330m).
    function selectPageRepresentativeRings(rings) {
        var scored = [];
        (rings || []).forEach(function (ring) {
            if (!ring || ring.length < 3) return;
            var b = (function (rg) {
                var a = Infinity, c = Infinity, d = -Infinity, e = -Infinity;
                for (var i = 0; i < rg.length; i++) {
                    var q = rg[i];
                    if (!q || q.length < 2) continue;
                    var lat = parseFloat(q[0]), lng = parseFloat(q[1]);
                    if (isNaN(lat) || isNaN(lng)) continue;
                    if (lat < a) a = lat;
                    if (lat > d) d = lat;
                    if (lng < c) c = lng;
                    if (lng > e) e = lng;
                }
                if (a === Infinity) return null;
                return { span: Math.max(d - a, e - c), area: (d - a) * (e - c) };
            })(ring);
            if (!b || b.span < 0.002) return;
            scored.push({ ring: ring, area: b.area });
        });
        scored.sort(function (x, y) { return y.area - x.area; });
        return scored.slice(0, 25).map(function (o) { return simplifyPageBigRingRDP(o.ring, 0.003); });
    }
    function applyBiomeAreaRings(key, nome, color, rings) {
        savePolygonHistoryState();
        if (color) {
            polygonColor = color;
            try { $('#polygon-color-picker').val(polygonColor); } catch (e) {}
        }
        draftPolygonsList = (draftPolygonsList || []).filter(r => r && r.length > 0);
        // 5 decimais (~1m) + seleção RDP: 219 anéis/0,9 MB -> ~25 anéis/~10 KB.
        const round5 = (v) => Math.round(parseFloat(v) * 1e5) / 1e5;
        const slimRings = selectPageRepresentativeRings(rings.map(ring => ring.map(pt => [round5(pt[0]), round5(pt[1])])));
        slimRings.forEach(ring => {
            draftPolygonsList.push(ring);
        });
        selectBiomeChipByKey(key);
        redrawDraftPolygonLayers();
        try {
            const bounds = L.latLngBounds([]);
            rings.forEach(ring => ring.forEach(pt => bounds.extend(pt)));
            if (bounds.isValid() && rightPanelMap) rightPanelMap.fitBounds(bounds.pad(0.1));
        } catch (e) {}
        systemAlert(`Área do bioma ${nome} aplicada (${rings.length} área(s)). Dá para ajustar ou apagar depois.`, 'success');
    }
    $(document).on('click', '#btn-use-biome-area', function() {
        const key = $('#biome-area-selector').val() || 'mata_atlantica';
        const meta = BIOME_AREA_META[key] || { nome: key, color: null };
        const precise = (rightPanelPreciseBiomeAreas && rightPanelPreciseBiomeAreas[key]) || [];
        if (precise.length > 0) {
            applyBiomeAreaRings(key, meta.nome, meta.color, precise);
            return;
        }
        fetchBiomasAreas().then(list => {
            const found = list.find(b => b.key === key);
            if (!found || !found.polygons || found.polygons.length === 0) {
                systemAlert('Bioma não encontrado. Tente novamente.', 'warning');
                return;
            }
            applyBiomeAreaRings(key, found.nome || meta.nome, found.color || meta.color, found.polygons);
        }).catch(err => {
            console.error('Erro ao carregar bioma:', err);
            systemAlert('Erro ao carregar área do bioma.', 'error');
        });
    });

    // Atalhos de teclado Ctrl+Z e Ctrl+Y
    $(document).on('keydown', function(e) {
        if (!$('#panel-view-map').is(':visible')) return;
        if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
            if (e.shiftKey) {
                redoPolygonState();
            } else {
                undoPolygonState();
            }
        } else if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
            redoPolygonState();
        }
    });

    // Marcador Único de Localização no Mini-Mapa
    let draftLocationMarker = null;

    function clearDraftMarkers() {
        if (draftLocationMarker && rightPanelMap) {
            rightPanelMap.removeLayer(draftLocationMarker);
        }
        draftLocationMarker = null;
        $('#coordenadas-json-hidden').val('');
        $('.coord-lat').val('-27.59');
        $('.coord-lng').val('-48.54');
    }

    function addDraftMarker(lat, lng) {
        if (!rightPanelMap) return;

        if (draftLocationMarker) {
            rightPanelMap.removeLayer(draftLocationMarker);
            draftLocationMarker = null;
        }

        const latFixed = parseFloat(lat).toFixed(6);
        const lngFixed = parseFloat(lng).toFixed(6);

        draftLocationMarker = L.marker([lat, lng], {
            draggable: true,
            icon: L.divIcon({
                className: 'custom-animal-marker',
                html: `
                    <div class="marker-container">
                        <div class="marker-pin" style="border-color: #FFA63A; background: #9C5B1C;">
                            <div class="marker-avatar">
                                <i class="fa-solid fa-location-dot" style="color: #FFA63A; font-size: 16px;"></i>
                            </div>
                            <span class="marker-name-label" style="opacity: 1; max-width: 200px; padding-right: 6px;">Local de Ocorrência</span>
                        </div>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            })
        }).addTo(rightPanelMap);

        $('.coord-lat').val(latFixed);
        $('.coord-lng').val(lngFixed);
        $('#coordenadas-json-hidden').val(JSON.stringify([{ lat: parseFloat(latFixed), lng: parseFloat(lngFixed) }]));

        draftLocationMarker.on('dragend', function(e) {
            const pos = e.target.getLatLng();
            $('.coord-lat').val(pos.lat.toFixed(6));
            $('.coord-lng').val(pos.lng.toFixed(6));
            $('#coordenadas-json-hidden').val(JSON.stringify([{ lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) }]));
        });
    }

    window.removeDraftMarkerByRef = function(btnEl) {
        if (draftLocationMarker && rightPanelMap) {
            try { rightPanelMap.removeLayer(draftLocationMarker); } catch (_) {}
        }
        draftLocationMarker = null;
        $('#coordenadas-json-hidden').val('');
    };

    $(document).on('click', '#btn-add-location-marker', function() {
        if (!rightPanelMap) return;
        const center = rightPanelMap.getCenter();
        addDraftMarker(center.lat, center.lng);
    });

    $(document).on('click', '#btn-clear-location-markers', function() {
        clearDraftMarkers();
        addDraftMarker(-27.59, -48.54);
    });

    // 3. Inicialização do Mapa Sincronizado 100% IDÊNTICO ao Mapa Principal
    function initRightPanelMap(lat = -27.59, lng = -48.54) {
        setTimeout(() => {
            if (!rightPanelMap) {
                const darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=cb1_3l5t_1_889f4489a3fb5fb5051816e3', {
                    subdomains: 'abcd',
                    maxZoom: 19,
                    attribution: '© CARTO'
                });

                rightPanelMap = L.map('right-panel-map-container', {
                    center: [lat, lng],
                    zoom: 7,
                    layers: [darkTile],
                    zoomControl: true,
                    attributionControl: false
                });

                const svgRenderer = L.svg({ padding: 0 });
                const pampasLayer = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "#3b7ba5", fillOpacity: 0.3 } }).addTo(rightPanelMap);
                const pampasPattern = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "url(#pampa-pattern-min)", fillOpacity: 0.6 } }).addTo(rightPanelMap);
                const cerradoLayer = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "#E6C140", fillOpacity: 0.4 } }).addTo(rightPanelMap);
                const cerradoPattern = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "url(#cerrado-pattern-min)", fillOpacity: 0.6 } }).addTo(rightPanelMap);
                const atlanticLayer = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "#287f5e", fillOpacity: 0.1 } }).addTo(rightPanelMap);
                const atlanticPattern = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "url(#tree-pattern-min)", fillOpacity: 0.6 } }).addTo(rightPanelMap);

                maskLayer = L.polygon(maskPaths, {
                    interactive: false,
                    color: "transparent",
                    fillColor: "#000000",
                    fillOpacity: 0.6,
                    fillRule: 'evenodd'
                }).addTo(rightPanelMap);

                // Carregar camadas GeoJSON idênticas
                const requests = [
                    $.getJSON("/data/ATLANTIC_FOREST_LAW.json"),
                    $.getJSON("/data/br_pr.json"),
                    $.getJSON("/data/br_sc.json"),
                    $.getJSON("/data/br_rs.json")
                ];

                $.when.apply($, requests).done(function(forestRes, prRes, scRes, rsRes) {
                    const forestData = forestRes[0] || forestRes;
                    const prData = prRes[0] || prRes;
                    const scData = scRes[0] || scRes;
                    const rsData = rsRes[0] || rsRes;

                    if (window.turf) {
                        try {
                            const simplifiedForest = turf.simplify(forestData, { tolerance: 0.005, highPrecision: false });
                            atlanticLayer.addData(simplifiedForest);
                            atlanticPattern.addData(simplifiedForest);

                            let merged = simplifiedForest.features[0];
                            for (let i = 1; i < simplifiedForest.features.length; i++) {
                                try {
                                    let union = turf.union(merged, simplifiedForest.features[i]);
                                    if (union) merged = union;
                                } catch(e) {}
                            }
                            const cleanForest = turf.simplify(turf.buffer(merged, 0), { tolerance: 0.003 });

                            let pampaDiff = null;
                            if (rsData.features && cleanForest) {
                                pampaDiff = turf.difference(turf.simplify(turf.buffer(rsData.features[0], 0), { tolerance: 0.003 }), cleanForest);
                                if (pampaDiff) { pampasLayer.addData(pampaDiff); pampasPattern.addData(pampaDiff); }
                            }
                            let cerradoDiff = null;
                            if (prData.features && cleanForest) {
                                cerradoDiff = turf.difference(turf.simplify(turf.buffer(prData.features[0], 0), { tolerance: 0.003 }), cleanForest);
                                if (cerradoDiff) { cerradoLayer.addData(cerradoDiff); cerradoPattern.addData(cerradoDiff); }
                            }

                            // Cache preciso p/ "Usar bioma como área": os MESMOS
                            // contornos desenhados acima (Mata recortada p/ o Sul).
                            try {
                                rightPanelPreciseBiomeAreas = {
                                    mata_atlantica: geoJsonToLatLngRings(clipForestToSouth(cleanForest, prData, scData, rsData)),
                                    pampa: geoJsonToLatLngRings(pampaDiff),
                                    cerrado: geoJsonToLatLngRings(cerradoDiff)
                                };
                            } catch (e) { rightPanelPreciseBiomeAreas = null; }
                        } catch (e) {
                            console.error("Turf error in mini map:", e);
                        }
                    }

                    L.geoJson(prData, { interactive: false, style: { color: "#1E7552", weight: 2, fillOpacity: 0 } }).addTo(rightPanelMap);
                    L.geoJson(scData, { interactive: false, style: { color: "#FF0000", weight: 2, fillOpacity: 0 } }).addTo(rightPanelMap);
                    L.geoJson(rsData, { interactive: false, style: { color: "#FFFF00", weight: 2, fillOpacity: 0 } }).addTo(rightPanelMap);

                    [prData, scData, rsData].forEach(d => {
                        d.features.forEach(f => {
                            if (!f.geometry) return;
                            const type = f.geometry.type;
                            const coords = f.geometry.coordinates;
                            if (type === "Polygon") {
                                coords.forEach(ring => { maskPaths.push(ring.map(c => [c[1], c[0]])); });
                            } else if (type === "MultiPolygon") {
                                coords.forEach(poly => { poly.forEach(ring => { maskPaths.push(ring.map(c => [c[1], c[0]])); }); });
                            }
                        });
                    });
                    maskLayer.setLatLngs(maskPaths);

                    injectMiniTreePatterns();
                });

                // Carregar marcadores existentes
                $.getJSON('/api/markers', function(data) {
                    if (data && data.features) {
                        L.geoJson(data, {
                            pointToLayer: function(feature, latlng) {
                                const p = feature.properties;
                                const statusSigla = p.nivel_sigla ? p.nivel_sigla.toLowerCase() : 'dd';
                                const borderColor = extinctionColorMap[statusSigla] || '#1a5fb4';
                                let iconSrc = '/assets/img/logotipo.png';
                                if (p.icone && typeof p.icone === 'string' && !p.icone.includes('logotipo.png')) {
                                    iconSrc = p.icone;
                                } else if (p.imagens && Array.isArray(p.imagens) && p.imagens.length > 0) {
                                    const firstImg = p.imagens[0];
                                    const u = typeof firstImg === 'string' ? firstImg : (firstImg && firstImg.imagem ? firstImg.imagem : '');
                                    if (u && !u.includes('logotipo.png')) iconSrc = u;
                                } else if (p.imagem && typeof p.imagem === 'string' && !p.imagem.includes('logotipo.png')) {
                                    iconSrc = p.imagem;
                                }
                                if (iconSrc && !iconSrc.startsWith('http') && !iconSrc.startsWith('/') && !iconSrc.startsWith('data:')) {
                                    iconSrc = `/media/${iconSrc}`;
                                }
                                const iconSrcFallback = isFallbackLogoUrl(iconSrc);

                                return L.marker(latlng, {
                                    icon: L.divIcon({
                                        className: 'custom-animal-marker',
                                        html: `
                                            <div class="marker-container">
                                                <div class="marker-pin" style="border-color: ${borderColor};">
                                                    <div class="marker-avatar">
                                                        <img src="${iconSrc}" alt="${p.nome_comum}">
                                                        ${iconSrcFallback ? '<span class="avatar-fallback-tag" title="Imagem livre não encontrada">Imagem livre não encontrada</span>' : ''}
                                                    </div>
                                                    <span class="marker-name-label">${p.nome_comum}</span>
                                                </div>
                                            </div>
                                        `,
                                        iconSize: [36, 36],
                                        iconAnchor: [18, 36]
                                    })
                                });
                            }
                        }).addTo(rightPanelMap);
                    }
                });

                // Evento de clique no mini-mapa para mover marcador de localização ou adicionar vértice ao polígono
                rightPanelMap.on('click', function(e) {
                    if (isDrawingPolygon) {
                        savePolygonHistoryState();
                        const lat = parseFloat(e.latlng.lat.toFixed(6));
                        const lng = parseFloat(e.latlng.lng.toFixed(6));
                        if (draftPolygonsList.length === 0) draftPolygonsList.push([]);
                        draftPolygonsList[draftPolygonsList.length - 1].push([lat, lng]);
                        redrawDraftPolygonLayers();
                    } else {
                        addDraftMarker(e.latlng.lat, e.latlng.lng);
                    }
                });

                if (!draftLocationMarker) {
                    addDraftMarker(lat, lng);
                }
            } else {
                rightPanelMap.invalidateSize();
                rightPanelMap.setView([lat, lng], 8);
            }
        }, 200);
    }

    function injectMiniTreePatterns() {
        const svg = document.querySelector('#right-panel-map-container svg');
        if (!svg) return;
        const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'defs'), svg.firstChild);
        const patterns = [
            { id: 'tree-pattern-min', img: '/svg/mataatlantica.png', size: 100, icons: [[10,10,40],[60,50,30]] },
            { id: 'pampa-pattern-min', img: '/svg/pampa.png', size: 80, icons: [[10,10,35],[45,40,25]] },
            { id: 'cerrado-pattern-min', img: '/svg/cerrado.png', size: 90, icons: [[10,10,40],[55,45,30]] }
        ];
        patterns.forEach(p => {
            if (!document.getElementById(p.id)) {
                const pat = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
                pat.setAttribute('id', p.id); pat.setAttribute('patternUnits', 'userSpaceOnUse');
                pat.setAttribute('width', p.size); pat.setAttribute('height', p.size);
                p.icons.forEach(icon => {
                    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', p.img);
                    img.setAttribute('x', icon[0]); img.setAttribute('y', icon[1]);
                    img.setAttribute('width', icon[2]); img.setAttribute('height', icon[2]);
                    img.setAttribute('opacity', '0.7');
                    pat.appendChild(img);
                });
                defs.appendChild(pat);
            }
        });
    }

    // =========================================================================
    // RECORTE E ARRASTE INTERATIVO DO ÍCONE
    // =========================================================================
    let pageSelectedFiles = []; // Cada item: { id, file, currentX, currentY, scale }
    // true quando a galeria foi mexida (add/remove) desde que a edição foi
    // aberta: aí o submit sincroniza (mantidas + novas). Sem toque e sem
    // arquivo novo, o servidor preserva as fotos como estão.
    let pageGalleryTouched = false;
    let iconCropState = {
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        scale: 1.0
    };

    $(document).on('click', '#btn-choose-icon', function(e) {
        e.preventDefault();
        $('#input-file-icon').click();
    });

    $(document).on('click', '#btn-add-images', function(e) {
        e.preventDefault();
        $('#input-file-image').click();
    });

    $('#input-file-image').change(function() {
        if (this.files && this.files.length > 0) {
            Array.from(this.files).forEach(f => {
                pageSelectedFiles.push({
                    id: 'pg_img_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
                    file: f,
                    currentX: 0,
                    currentY: 0,
                    scale: 1.0
                });
            });
            pageGalleryTouched = true;
            renderPageImageGallery();
            this.value = '';
        }
    });

    function renderPageImageGallery() {
        const listContainer = $('#image-preview-list');
        listContainer.empty();

        if (!pageSelectedFiles || pageSelectedFiles.length === 0) {
            $('#image-preview-placeholder').removeClass('d-none');
        } else {
            $('#image-preview-placeholder').addClass('d-none');
            pageSelectedFiles.forEach((item, index) => {
                const fileObj = item.file || item;
                const url = typeof fileObj === 'string' ? fileObj : URL.createObjectURL(fileObj);
                const card = $(`
                    <div class="gallery-card-item position-relative flex-shrink-0 rounded-3 overflow-hidden border border-secondary shadow-sm" data-index="${index}" style="width: 130px; height: 130px; background: #121118; cursor: move; user-select: none; touch-action: none;" title="Arraste para mover • Roda do mouse para zoom">
                        <img class="card-crop-img position-absolute" src="${url}" style="width: 100%; height: 100%; object-fit: cover; transform: translate(${item.currentX || 0}px, ${item.currentY || 0}px) scale(${item.scale || 1.0});">
                        <div class="position-absolute bottom-0 start-0 end-0 p-1 text-center text-white-50" style="background: rgba(0,0,0,0.4); font-size: 9px; pointer-events: none;">Arraste/Zoom</div>
                        <button type="button" class="btn-remove-page-img position-absolute top-0 end-0 m-1 rounded-circle border-0 d-flex align-items-center justify-content-center" data-index="${index}" style="width: 24px; height: 24px; background: #FF4068; color: white; font-size: 12px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.5);" title="Remover foto">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                `);

                let isCardDragging = false;
                let startX = 0, startY = 0;

                card.on('mousedown touchstart', function(e) {
                    if ($(e.target).closest('.btn-remove-page-img').length) return;
                    isCardDragging = true;
                    const clientX = e.type.startsWith('touch') ? (e.touches && e.touches[0] ? e.touches[0].clientX : 0) : e.clientX;
                    const clientY = e.type.startsWith('touch') ? (e.touches && e.touches[0] ? e.touches[0].clientY : 0) : e.clientY;
                    startX = clientX - (item.currentX || 0);
                    startY = clientY - (item.currentY || 0);
                    e.preventDefault();
                });

                $(window).on(`mousemove.${item.id} touchmove.${item.id}`, function(e) {
                    if (!isCardDragging) return;
                    const clientX = e.type.startsWith('touch') ? (e.touches && e.touches[0] ? e.touches[0].clientX : 0) : e.clientX;
                    const clientY = e.type.startsWith('touch') ? (e.touches && e.touches[0] ? e.touches[0].clientY : 0) : e.clientY;
                    item.currentX = clientX - startX;
                    item.currentY = clientY - startY;
                    card.find('.card-crop-img').css('transform', `translate(${item.currentX}px, ${item.currentY}px) scale(${item.scale || 1.0})`);
                });

                $(window).on(`mouseup.${item.id} touchend.${item.id}`, function() {
                    isCardDragging = false;
                });

                card.on('wheel', function(e) {
                    e.preventDefault();
                    const step = e.originalEvent.deltaY < 0 ? 0.1 : -0.1;
                    item.scale = Math.min(Math.max(0.4, (item.scale || 1.0) + step), 4.0);
                    card.find('.card-crop-img').css('transform', `translate(${item.currentX || 0}px, ${item.currentY || 0}px) scale(${item.scale})`);
                });

                listContainer.append(card);
            });
        }
    }

    $(document).on('click', '.btn-remove-page-img', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt($(this).attr('data-index'));
        if (!isNaN(index) && index >= 0 && index < pageSelectedFiles.length) {
            const item = pageSelectedFiles[index];
            if (item && item.id) {
                $(window).off(`.${item.id}`);
            }
            pageSelectedFiles.splice(index, 1);
            pageGalleryTouched = true;
            renderPageImageGallery();
        }
    });

    $('#icon-circle-trigger').click(function(e) {
        if (e.target.tagName !== 'IMG') {
            $('#input-file-icon').click();
        }
    });

    $('#input-file-icon').change(function() {
        if (this.files && this.files[0]) {
            const url = URL.createObjectURL(this.files[0]);
            const img = $('#icon-preview-img');
            img.attr('src', url).removeClass('d-none');
            $('#icon-placeholder-content').addClass('d-none');
            iconCropState.currentX = 0;
            iconCropState.currentY = 0;
            iconCropState.scale = 1.0;
            img.css('transform', 'translate(0px, 0px) scale(1)');
            generatePageIconBase64();
        }
    });

    // Arraste e Zoom com a Roda do Mouse dentro do círculo
    const iconWrapper = document.getElementById('icon-circle-trigger');
    const iconImg = document.getElementById('icon-preview-img');

    // Mantém a foto sempre cobrindo o círculo de 105px: o zoom mínimo é 1
    // (cover) e o arrasto é limitado para nunca revelar o fundo vazio.
    // Sem isso a foto salva saía "longe"/pequena dentro do ícone.
    function clampPageIconCrop() {
        var s = iconCropState.scale || 1.0;
        if (s < 1.0) { s = 1.0; iconCropState.scale = 1.0; }
        if (s > 4.0) { s = 4.0; iconCropState.scale = 4.0; }
        var max = 105 * (s - 1) / 2;
        if (max < 0) max = 0;
        iconCropState.currentX = Math.min(max, Math.max(-max, iconCropState.currentX || 0));
        iconCropState.currentY = Math.min(max, Math.max(-max, iconCropState.currentY || 0));
    }

    function applyPageIconTransform() {
        clampPageIconCrop();
        iconImg.style.transform = `translate(${iconCropState.currentX}px, ${iconCropState.currentY}px) scale(${iconCropState.scale})`;
    }

    if (iconWrapper && iconImg) {
        iconWrapper.addEventListener('mousedown', function(e) {
            if (iconImg.classList.contains('d-none')) return;
            iconCropState.isDragging = true;
            iconCropState.startX = e.clientX - iconCropState.currentX;
            iconCropState.startY = e.clientY - iconCropState.currentY;
            e.preventDefault();
        });

        window.addEventListener('mousemove', function(e) {
            if (!iconCropState.isDragging) return;
            iconCropState.currentX = e.clientX - iconCropState.startX;
            iconCropState.currentY = e.clientY - iconCropState.startY;
            applyPageIconTransform();
        });

        window.addEventListener('mouseup', function() {
            if (iconCropState.isDragging) {
                iconCropState.isDragging = false;
                generatePageIconBase64();
            }
        });

        iconWrapper.addEventListener('wheel', function(e) {
            if (iconImg.classList.contains('d-none')) return;
            e.preventDefault();
            const step = e.deltaY < 0 ? 0.1 : -0.1;
            iconCropState.scale = (iconCropState.scale || 1.0) + step;
            applyPageIconTransform();
            generatePageIconBase64();
        }, { passive: false });
    }

    // Gera o ícone a partir do enquadramento atual do preview.
    // 128px JPEG com fundo escuro (exibido a 30-105px com recorte circular
    // via CSS): ~8 KB em vez de ~650 KB, indistinguível na tela.
    // Retorna Promise para o submit aguardar o recorte antes de enviar.
    function generatePageIconBase64() {
        if (!iconImg || iconImg.classList.contains('d-none') || !iconImg.src) return Promise.resolve(null);
        clampPageIconCrop();
        return new Promise(function(resolve) {
            var done = function(val) { resolve(val); };
            // Nunca trava o submit: resolve mesmo se a imagem falhar (ex.: CORS).
            var timer = setTimeout(function() { done($('#input-icon-base64').val() || null); }, 1500);
            try {
                const SIZE = 128;
                const canvas = document.createElement('canvas');
                canvas.width = SIZE;
                canvas.height = SIZE;
                const ctx = canvas.getContext('2d');

                const paintCircle = function (source) {
                    ctx.fillStyle = '#121118';
                    ctx.fillRect(0, 0, SIZE, SIZE);

                    const naturalW = source.naturalWidth || SIZE;
                    const naturalH = source.naturalHeight || SIZE;
                    const aspect = naturalW / naturalH;
                    let drawW = SIZE, drawH = SIZE;

                    if (aspect > 1) drawW = SIZE * aspect;
                    else drawH = SIZE / aspect;

                    const scaleRatio = SIZE / 105;
                    drawW = drawW * (iconCropState.scale || 1.0);
                    drawH = drawH * (iconCropState.scale || 1.0);

                    const drawX = (SIZE - drawW) / 2 + (iconCropState.currentX * scaleRatio);
                    const drawY = (SIZE - drawH) / 2 + (iconCropState.currentY * scaleRatio);

                    ctx.drawImage(source, drawX, drawY, drawW, drawH);
                    return canvas.toDataURL('image/jpeg', 0.8);
                };

                // Atalho rápido: preview já decodificado no DOM, sem recarregar da rede.
                try {
                    if (iconImg.complete && iconImg.naturalWidth > 0) {
                        const dataUrl = paintCircle(iconImg);
                        $('#input-icon-base64').val(dataUrl);
                        clearTimeout(timer);
                        done(dataUrl);
                        return;
                    }
                } catch (e) {
                    // Canvas "tainted" ou preview quebrado: cai no fluxo com recarga.
                }

                const tempImg = new Image();
                tempImg.crossOrigin = 'anonymous';
                tempImg.onload = function() {
                    try {
                        const dataUrl = paintCircle(tempImg);
                        $('#input-icon-base64').val(dataUrl);
                        clearTimeout(timer);
                        done(dataUrl);
                    } catch (e) {
                        console.error("Error generating icon base64:", e);
                        clearTimeout(timer);
                        done($('#input-icon-base64').val() || null);
                    }
                };
                tempImg.onerror = function() {
                    clearTimeout(timer);
                    done($('#input-icon-base64').val() || null);
                };
                tempImg.src = iconImg.src;
            } catch(e) {
                console.error("Error generating icon base64:", e);
                clearTimeout(timer);
                done($('#input-icon-base64').val() || null);
            }
        });
    }

    // Reduz fotos grandes antes do upload (máx. 1000px, JPEG 0.75: ~60 KB
    // por foto em vez de 500 KB–2 MB).
    // Nunca rejeita: em qualquer falha, usa o original.
    function downscalePagePhotoFile(file) {
        return new Promise(function (resolve) {
            try {
                if (!file || typeof file === 'string' || !(file instanceof Blob)) return resolve(file);
                if (!file.type || file.type.indexOf('image/') !== 0) return resolve(file);
                if (file.size <= 700 * 1024) return resolve(file);
                var url;
                try { url = URL.createObjectURL(file); } catch (e) { return resolve(file); }
                var img = new Image();
                img.onload = function () {
                    try {
                        var w = img.naturalWidth || img.width;
                        var h = img.naturalHeight || img.height;
                        try { URL.revokeObjectURL(url); } catch (e) {}
                        if (!w || !h) return resolve(file);
                        var scale = Math.min(1, 1000 / Math.max(w, h));
                        if (scale >= 1) return resolve(file);
                        var cv = document.createElement('canvas');
                        cv.width = Math.round(w * scale);
                        cv.height = Math.round(h * scale);
                        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
                        var type = (file.type === 'image/png') ? 'image/png' : 'image/jpeg';
                        if (cv.toBlob) {
                            cv.toBlob(function (b) { resolve(b || file); }, type, 0.75);
                        } else resolve(file);
                    } catch (e) { resolve(file); }
                };
                img.onerror = function () { try { URL.revokeObjectURL(url); } catch (e) {} resolve(file); };
                img.src = url;
            } catch (e) { resolve(file); }
        });
    }

    // Submissão do Formulário de Cadastro / Edição
    $('#form-species-create').submit(async function(e) {
        e.preventDefault();
        var saveBtn = $('#btn-save-species');
        var saveBtnHtml = saveBtn.length ? saveBtn.html() : null;
        if (saveBtn.length) {
            saveBtn.prop('disabled', true);
            saveBtn.html('<i class="fa-solid fa-spinner fa-spin me-2"></i>Salvando espécie...');
        }
        var restoreSaveBtn = function () {
            if (saveBtn.length) { saveBtn.prop('disabled', false); saveBtn.html(saveBtnHtml); }
        };
        // Garante que o recorte atual do ícone foi gerado antes de montar o FormData
        try { await generatePageIconBase64(); } catch (err) {}
        const formData = new FormData(this);

        // Anexar arquivos da galeria (reduzidos antes de subir). Fotos já
        // salvas que continuam na galeria vão como `manter_imagem` para
        // ACUMULAR com as novas no servidor.
        formData.delete('animal_imagem');
        const pageGalleryFiles = [];
        const pageKeptGallery = [];
        pageSelectedFiles.forEach(item => {
            const fileObj = item.file || item;
            if (typeof fileObj !== 'string') {
                pageGalleryFiles.push(fileObj);
            } else if (fileObj && !fileObj.includes('logotipo.png') && !fileObj.includes('falta_imagem') && !fileObj.includes('Falta_imagem')) {
                pageKeptGallery.push(fileObj);
            }
        });
        try {
            const smallFiles = await Promise.all(pageGalleryFiles.map(downscalePagePhotoFile));
            smallFiles.forEach(f => { if (f && typeof f !== 'string') formData.append('animal_imagem', f); });
        } catch (err) {
            pageGalleryFiles.forEach(f => formData.append('animal_imagem', f));
        }
        if (pageGalleryFiles.length > 0 || pageGalleryTouched) {
            formData.append('galeria_sync', '1');
            pageKeptGallery.forEach(u => formData.append('manter_imagem', u));
        }

        // Mapear biomas selecionados
        formData.delete('biomas_ids');
        $('.biome-chip[data-selected="true"]').each(function() {
            formData.append('biomas_ids', $(this).attr('data-id'));
        });

        const animalId = $('#animal-id-hidden').val();
        const url = animalId ? `/api/v1/animais/${animalId}/` : '/api/v1/animais/';
        const method = animalId ? 'PATCH' : 'POST';

        fetch(url, { method: method, body: formData })
        .then(res => res.json())
        .then(data => {
            restoreSaveBtn();
            if (data.success) {
                systemAlert(animalId ? 'Espécie atualizada com sucesso!' : 'Espécie salva com sucesso!', 'success');
                resetForm();
                loadAnimals();
            } else {
                systemAlert('Erro ao salvar espécie: ' + formatErrorMessage(data, 'Tente novamente.'), 'error');
            }
        })
        .catch(err => {
            restoreSaveBtn();
            console.error('Erro na requisição:', err);
            systemAlert('Erro ao salvar espécie: ' + (err.message || 'Falha de comunicação com o servidor.'), 'error');
        });
    });

    function resetForm() {
        $('#form-species-create')[0].reset();
        $('#animal-id-hidden').val('');
        $('#coordenadas-json-hidden').val('');
        $('#area-polygon-json-hidden').val('');
        // Limpa a galeria: sem isso as fotos do animal anterior vazavam
        // para o próximo cadastro.
        pageSelectedFiles = [];
        pageGalleryTouched = false;
        renderPageImageGallery();
        $('#image-preview-img').addClass('d-none');
        $('#image-preview-content').removeClass('d-none');
        $('#icon-preview-img').addClass('d-none').css('transform', 'none');
        $('#icon-preview-content').removeClass('d-none');
        $('#input-icon-base64').val('');
        iconCropState.currentX = 0;
        iconCropState.currentY = 0;
        $('.card-back-1, .card-back-2').empty();
        $('.select-nivel-extincao').val('').css({ 'background-color': '#383642', 'border-color': '#484654', 'color': '#FFFFFF' });
        $('.biome-chip').attr('data-selected', 'false').find('.chip-icon').removeClass('fa-check').addClass('fa-plus');
        // Reseta o editor de área para não vazar o polígono anterior no próximo cadastro
        isDrawingPolygon = false;
        $('#btn-draw-polygon-mode').removeClass('btn-success text-white').addClass('btn-info text-dark')
            .html('<i class="fa-solid fa-draw-polygon me-1"></i> Desenhar Área');
        if (rightPanelMap) rightPanelMap.getContainer().style.cursor = '';
        draftPolygonsList = [[]];
        polygonHistory = [];
        polygonRedo = [];
        polygonColor = '#FFAA44';
        try { $('#polygon-color-picker').val(polygonColor); } catch (e) {}
        updateUndoRedoButtonsUI();
        redrawDraftPolygonLayers();
        clearDraftMarkers();
        addDraftMarker(-27.59, -48.54);
    }

    $('#btn-reset-form').click(resetForm);

    // 5. Exibir modal de detalhes do animal (Card Completo)
    window.showDetails = function(id) {
        const animal = animals.find(a => a.id == id);
        if (!animal) return;

        const sigla = (animal.api_nivelextincao ? animal.api_nivelextincao.sigla : (animal.nivel_sigla || 'CR')).toLowerCase();
        const statusConfig = {
            'ex': { color: '#403E4C', icon: 'fa-skull' },
            'ew': { color: '#831F34', icon: 'fa-skull-crossbones' },
            're': { color: '#B0214F', icon: 'fa-eye-slash' },
            'cr': { color: '#FF4068', icon: 'fa-exclamation-triangle' },
            'en': { color: '#ff6426', icon: 'fa-triangle-exclamation' },
            'vu': { color: '#FFA63A', icon: 'fa-shield-halved' },
            'nt': { color: '#217757', icon: 'fa-circle-check' },
            'lc': { color: '#1a5fb4', icon: 'fa-circle-check' },
            'dd': { color: '#555555', icon: 'fa-question-circle' }
        };
        const config = statusConfig[sigla] || { color: '#1a5fb4', icon: 'fa-info-circle' };
        const statusColor = config.color;
        const statusIcon = config.icon;

        let allImgs = [];
        const sourceImgs = animal.imagens || [];
        if (Array.isArray(sourceImgs)) {
            sourceImgs.forEach(img => {
                let u = typeof img === 'string' ? img : (img && img.imagem ? img.imagem : '');
                if (u && !u.includes('logotipo.png') && !u.includes('falta_imagem') && !u.includes('Falta_imagem') && !allImgs.includes(u)) {
                    allImgs.push(u);
                }
            });
        }
        if (animal.imagem && !animal.imagem.includes('logotipo.png') && !animal.imagem.includes('falta_imagem') && !animal.imagem.includes('Falta_imagem') && !allImgs.includes(animal.imagem)) {
            allImgs.push(animal.imagem);
        }
        // Ícone fora do carrossel: só pino do mapa e edição (nunca como foto).
        allImgs = allImgs.map(url => (url.startsWith('http') || url.startsWith('/') || url.startsWith('data:') ? url : `/media/${url}`));
        // De preferência de 1 a 3 fotos
        allImgs = allImgs.slice(0, 3);
        if (allImgs.length === 0) allImgs.push('/assets/img/logotipo.png');
        const modalImgFallback = allImgs.length > 0 && allImgs.every(isFallbackLogoUrl);

        let biomas = (animal.biomas || []).map(b => (typeof b === 'object' ? b.nome : b)).join(', ') || 'Não informado';

        let html = `
          <div class="container-fluid p-0">
            <div class="row g-0">
              <div class="col-md-5">
                <div class="modal-img-container" style="overflow: hidden; position: relative; border-left: 5px solid ${statusColor}; height: 100%; min-height: 280px;">
                  <img id="modalCarouselImg" src="${allImgs[0]}" alt="${animal.nome_comum || ''}${modalImgFallback ? ' — imagem livre não encontrada' : ''}" class="modal-img-pan${isFallbackLogoUrl(allImgs[0]) ? ' img-fallback-logo' : ''}" data-current="0" data-imgs='${JSON.stringify(allImgs)}'>
                  ${modalImgFallback ? '<span class="no-photo-badge"><i class="fa-solid fa-triangle-exclamation"></i>Imagem livre não encontrada</span>' : ''}
                  ${allImgs.length > 1 ? `
                    <button class="carousel-btn carousel-prev" onclick="changeModalImg(-1)" style="position: absolute; top: 50%; left: 10px; z-index: 10; border: none; background: ${statusColor}; color: white; border-radius: 50%; width: 36px; height: 36px; cursor: pointer;">
                      <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="carousel-btn carousel-next" onclick="changeModalImg(1)" style="position: absolute; top: 50%; right: 10px; z-index: 10; border: none; background: ${statusColor}; color: white; border-radius: 50%; width: 36px; height: 36px; cursor: pointer;">
                      <i class="fas fa-chevron-right"></i>
                    </button>
                    <div class="modal-carousel-indicators">
                      ${allImgs.map((_, i) => `
                        <span class="modal-thumb-dot ${i === 0 ? 'bg-primary text-white' : 'bg-dark text-muted'} border border-secondary" onclick="setModalImg(${i})">
                          ${i + 1}
                        </span>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              </div>
              <div class="col-md-7 p-4" style="max-height: 480px; overflow-y: auto;">
                <div class="mb-3">
                  <span class="badge px-3 py-2 rounded-pill me-2" style="background-color: ${statusColor}; font-weight: bold;">${animal.classe || 'Classe não informada'}</span>
                  <span class="badge bg-secondary px-3 py-2 rounded-pill">${animal.familia || 'Família não informada'}</span>
                </div>
                <div class="row mb-3">
                  <div class="col-6">
                    <h6 style="color: ${statusColor};" class="fw-bold text-uppercase small mb-1">Nome Científico</h6>
                    <p class="fst-italic text-white mb-0">${animal.nome_cientifico}</p>
                  </div>
                  <div class="col-6">
                    <h6 style="color: ${statusColor};" class="fw-bold text-uppercase small mb-1">Status de Extinção</h6>
                    <p class="text-white mb-0"><i class="fas ${statusIcon} me-2" style="color: ${statusColor};"></i>${animal.api_nivelextincao ? animal.api_nivelextincao.nome : (animal.nivel_extincao || sigla.toUpperCase())}</p>
                  </div>
                </div>
                <div class="bg-dark p-3 rounded-3 mt-3" style="border-top: 3px solid ${statusColor}; border-bottom: 3px solid ${statusColor};">
                  <div class="row text-center mb-1 gy-2 text-white">
                      <div class="col-4">
                          <span class="mb-1 text-muted small"><i class="fas fa-utensils me-1"></i> Dieta</span>
                          <div class="fw-bold" style="color: ${statusColor}; font-size: 0.95rem;">${animal.dieta || 'N/A'}</div>
                      </div>
                      <div class="col-4 border-start border-secondary">
                          <span class="mb-1 text-muted small"><i class="fas fa-weight-hanging me-1"></i> Peso</span>
                          <div class="fw-bold" style="color: ${statusColor}; font-size: 0.95rem;">${animal.peso ? animal.peso + ' g' : '0 g'}</div>
                      </div>
                      <div class="col-4 border-start border-secondary">
                          <span class="mb-1 text-muted small"><i class="fas fa-arrows-alt-v me-1"></i> Altura</span>
                          <div class="fw-bold" style="color: ${statusColor}; font-size: 0.95rem;">${animal.altura ? animal.altura + ' cm' : '0 cm'}</div>
                      </div>
                  </div>
                  <hr style="border-color: ${statusColor}; opacity: 0.3;" class="my-2">
                  <div class="mt-2 text-white">
                      <h6 class="fst-italic text-muted small mb-1">Biomas</h6>
                      <p class="mb-2 fw-bold" style="color: #FFFFFF;">${biomas}</p>
                      <h6 class="fst-italic text-muted small mb-1">Descrição / Curiosidade</h6>
                      <p class="mb-0 small text-light" style="line-height: 1.5; text-align: justify;">${animal.habitos || animal.obs || 'Descrição detalhada não disponível.'}</p>
                  </div>
                  <div class="d-flex justify-content-end mt-3">
                    <a class="btn btn-sm btn-outline-secondary rounded-pill px-3" href="https://salve.icmbio.gov.br/" target="_blank" rel="noopener noreferrer" title="Abrir ficha no SALVE/ICMBio">
                      <i class="fa-solid fa-arrow-up-right-from-square me-1"></i>Fonte
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        $('#modalAnimalName').text(animal.nome_comum).css('color', statusColor);
        if (typeof favModalButtons === 'function') $('#modalAnimalName').append(' ', favModalButtons(animal));
        $('#modalBody').html(html);

        if (isAdmin) {
            $('#modalAdminBtns').html(`
                <button type="button" class="btn btn-outline-warning btn-sm rounded-pill" id="btn-modal-edit-animal">
                    <i class="fa-solid fa-pen-to-square me-1"></i> Editar no Formulário
                </button>
            `);
            $('#btn-modal-edit-animal').off('click').on('click', function() {
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('animalModal'));
                if (modalInstance) modalInstance.hide();
                populateFormForEdit(animal.id);
            });
        } else {
            $('#modalAdminBtns').empty();
        }

        new bootstrap.Modal(document.getElementById('animalModal')).show();
    };

    window.setModalImg = function(targetIndex) {
        const imgTag = $('#modalCarouselImg');
        if (!imgTag.length) return;
        const imgsStr = imgTag.attr('data-imgs');
        if (!imgsStr) return;
        const imgs = JSON.parse(imgsStr);
        if (!imgs || !imgs[targetIndex]) return;

        imgTag.attr('data-current', targetIndex);
        $('.modal-thumb-dot').removeClass('bg-primary text-white').addClass('bg-dark text-muted')
            .eq(targetIndex).removeClass('bg-dark text-muted').addClass('bg-primary text-white');
        try {
            const badge = imgTag.closest('.modal-img-container').find('.no-photo-badge');
            if (badge.length) badge.toggle(isFallbackLogoUrl(imgs[targetIndex]));
            imgTag.toggleClass('img-fallback-logo', isFallbackLogoUrl(imgs[targetIndex]));
        } catch (e) {}

        imgTag.stop(true, true).fadeOut(120, function() {
            imgTag.attr('src', imgs[targetIndex]);
            imgTag.fadeIn(120);
        });
    };

    window.changeModalImg = function(step) {
        const imgTag = $('#modalCarouselImg');
        if (!imgTag.length) return;
        const imgsStr = imgTag.attr('data-imgs');
        if (!imgsStr) return;
        const imgs = JSON.parse(imgsStr);
        if (!imgs || imgs.length <= 1) return;

        let current = parseInt(imgTag.attr('data-current')) || 0;
        let next = (current + step + imgs.length) % imgs.length;
        window.setModalImg(next);
    };

    // ==========================================
    // Módulo de Importação de Espécies do SALVE
    // ==========================================
    let selectedSalveFile = null;

    $(document).on('show.bs.modal', '#modalImportSalve', function() {
        selectedSalveFile = null;
        $('#salve-file-input').val('');
        $('#salve-preview-container').addClass('d-none');
        $('#salve-progress-container').addClass('d-none');
        $('#salve-result-container').addClass('d-none').empty();
        $('#btn-execute-import-salve').prop('disabled', true);
    });

    $(document).on('click', '#btn-open-salve-modal', function() {
        const modalEl = document.getElementById('modalImportSalve');
        if (modalEl) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    });

    $(document).on('click', '#salve-drop-zone', function(e) {
        if (e.target.id !== 'salve-file-input') {
            $('#salve-file-input').trigger('click');
        }
    });

    $(document).on('dragover dragenter', '#salve-drop-zone', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).addClass('border-warning').css('background', '#201f2b');
    });

    $(document).on('dragleave dragend', '#salve-drop-zone', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('border-warning').css('background', '#191820');
    });

    $(document).on('drop', '#salve-drop-zone', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('border-warning').css('background', '#191820');
        const files = e.originalEvent.dataTransfer.files;
        if (files && files.length > 0) {
            handleSalveFileSelection(files[0]);
        }
    });

    $(document).on('change', '#salve-file-input', function(e) {
        if (this.files && this.files.length > 0) {
            handleSalveFileSelection(this.files[0]);
        }
    });

    function handleSalveFileSelection(file) {
        if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
            systemAlert('Por favor, selecione um arquivo de planilha .csv válido.', 'warning');
            return;
        }

        selectedSalveFile = file;
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        $('#salve-file-badge').text(file.name);
        $('#salve-file-info').text(`${fileSizeMB} MB`);

        const reader = new FileReader();
        reader.onload = function(evt) {
            const content = evt.target.result || '';
            renderSalvePreview(content);
        };
        reader.readAsText(file.slice(0, 50000));
        $('#btn-execute-import-salve').prop('disabled', false);
    }

    function renderSalvePreview(textSnippet) {
        const lines = textSnippet.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length === 0) return;

        const firstLine = lines[0];
        const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

        const parseLine = (line) => {
            return line.split(delimiter).map(c => c.replace(/^"|"$/g, '').trim());
        };

        const headers = parseLine(lines[0]);
        const theadHtml = '<tr>' + headers.slice(0, 7).map(h => `<th class="text-warning">${h}</th>`).join('') + '</tr>';
        $('#salve-preview-thead').html(theadHtml);

        let tbodyHtml = '';
        for (let i = 1; i < Math.min(lines.length, 4); i++) {
            const cells = parseLine(lines[i]);
            tbodyHtml += '<tr>' + cells.slice(0, 7).map(c => `<td>${c || '-'}</td>`).join('') + '</tr>';
        }
        $('#salve-preview-tbody').html(tbodyHtml);
        $('#salve-preview-container').removeClass('d-none');
    }

    // ---------------------------------------------------------------------------
    // Importação compatível com a Vercel (fallback fatiado em JSON).
    // A Vercel encerra funções serverless após poucos segundos, então um CSV
    // grande com busca de fotos nunca termina via SSE (streaming). O fallback
    // divide o CSV em lotes pequenos e envia cada lote como JSON simples
    // (sem streaming), acumulando o resultado. Cada lote cabe no timeout.
    // ---------------------------------------------------------------------------
    var SALVE_CHUNK_ROWS = 60;

    function splitSalveCsvIntoChunks(fullText, chunkRows) {
        if (!fullText || typeof fullText !== 'string') return [];
        var firstLine = (fullText.slice(0, 2000).split(/\r?\n/)[0]) || '';
        var rows = [];
        var cur = '';
        var inQ = false;
        var pushRow = function() { rows.push(cur); cur = ''; };
        for (var i = 0; i < fullText.length; i++) {
            var ch = fullText[i];
            var nx = fullText[i + 1];
            if (inQ) {
                cur += ch;
                if (ch === '"') {
                    if (nx === '"') { cur += nx; i++; }
                    else { inQ = false; }
                }
            } else {
                if (ch === '"') { inQ = true; cur += ch; }
                else if (ch === '\r') { if (nx === '\n') i++; pushRow(); }
                else if (ch === '\n') { pushRow(); }
                else { cur += ch; }
            }
        }
        if (cur.length > 0) rows.push(cur);
        var nonEmpty = rows.filter(function(r) { return r.trim().length > 0; });
        if (nonEmpty.length === 0) return [];
        var header = nonEmpty[0];
        var body = nonEmpty.slice(1);
        var chunks = [];
        for (var j = 0; j < body.length; j += chunkRows) {
            chunks.push(header + '\n' + body.slice(j, j + chunkRows).join('\n'));
        }
        return chunks;
    }

    function readSelectedSalveFileText() {
        if (!selectedSalveFile) return Promise.resolve('');
        if (typeof selectedSalveFile.text === 'function') return selectedSalveFile.text();
        return new Promise(function(resolve, reject) {
            try {
                var reader = new FileReader();
                reader.onload = function(evt) { resolve(evt.target.result || ''); };
                reader.onerror = function() { reject(new Error('Não foi possível ler o arquivo CSV.')); };
                reader.readAsText(selectedSalveFile);
            } catch (e) { reject(e); }
        });
    }

    function salveProgress(pct, statusHtml) {
        $('#salve-progress-bar').css('width', pct + '%').text(pct + '%').attr('aria-valuenow', pct);
        $('#salve-progress-percent').text(pct + '%');
        if (statusHtml) $('#salve-progress-status').html(statusHtml);
    }

    function showSalveSuccess(message, s) {
        $('#salve-progress-container').addClass('d-none');
        $('#btn-execute-import-salve').prop('disabled', false);
        $('#salve-result-container').html(
            '<div class="alert alert-success border-0 mb-0" style="background: #1e3a29; color: #75b798;">' +
            '<div class="d-flex align-items-center gap-2 mb-2">' +
            '<i class="fa-solid fa-circle-check fs-5"></i>' +
            '<strong>' + (message || 'Importação finalizada com sucesso!') + '</strong>' +
            '</div>' +
            '<ul class="mb-0 small ps-3">' +
            '<li><strong>Espécies identificadas:</strong> ' + (s.totalParsed || 0) + '</li>' +
            '<li><strong>Novas inseridas:</strong> ' + (s.inserted || 0) + '</li>' +
            '<li><strong>Atualizadas:</strong> ' + (s.updated || 0) + '</li>' +
            (s.skipped ? '<li><strong>Ignoradas/Sem nome válido:</strong> ' + s.skipped + '</li>' : '') +
            '</ul></div>'
        ).removeClass('d-none');
        if (typeof loadAnimals === 'function') loadAnimals();
    }

    function showSalveError(err) {
        $('#salve-progress-container').addClass('d-none');
        $('#btn-execute-import-salve').prop('disabled', false);
        var msg = 'Erro desconhecido.';
        try { msg = formatErrorMessage(err, 'Erro ao enviar ou processar arquivo CSV.'); } catch (e) { msg = (err && err.message) || msg; }
        $('#salve-result-container').html(
            '<div class="alert alert-danger border-0 mb-0" style="background: #3e1f25; color: #ea868f;">' +
            '<div class="d-flex align-items-center gap-2">' +
            '<i class="fa-solid fa-triangle-exclamation fs-5"></i>' +
            '<div><strong>Falha na importação</strong>' +
            '<div class="small mt-1">' + msg + '</div>' +
            '</div></div></div>'
        ).removeClass('d-none');
    }

    // Envia o CSV em lotes JSON (sem SSE). Usado quando o streaming falha
    // (ex.: timeout da função serverless na Vercel).
    async function runChunkedSalveImport(fullText, maxRows, autoImages) {
        var chunks = splitSalveCsvIntoChunks(fullText, SALVE_CHUNK_ROWS);
        if (chunks.length === 0) throw new Error('O arquivo CSV está vazio ou o formato não pôde ser interpretado.');
        var limit = parseInt(maxRows, 10) || 5000;
        chunks = chunks.slice(0, Math.max(1, Math.ceil(limit / SALVE_CHUNK_ROWS)));
        var totals = { totalParsed: 0, processed: 0, inserted: 0, updated: 0, skipped: 0 };
        for (var i = 0; i < chunks.length; i++) {
            salveProgress(Math.round((i / chunks.length) * 100),
                '<i class="fa-solid fa-spinner fa-spin me-1"></i> Enviando lote ' + (i + 1) + '/' + chunks.length + ' (modo compatível)...');
            var fd = new FormData();
            fd.append('csv_text', chunks[i]);
            fd.append('auto_images', autoImages);
            fd.append('max_rows', String(SALVE_CHUNK_ROWS));
            var resp = await fetch('/api/v1/animais/import-salve', { method: 'POST', body: fd });
            var data = null;
            try { data = await resp.json(); } catch (e) { data = null; }
            if (!resp.ok || !data || data.success === false) {
                throw new Error((data && (data.message || data.error)) || ('Erro no servidor (lote ' + (i + 1) + '): HTTP ' + resp.status));
            }
            var r = data.data || {};
            totals.totalParsed += (r.totalParsed || 0);
            totals.processed += (r.processed || 0);
            totals.inserted += (r.inserted || 0);
            totals.updated += (r.updated || 0);
            totals.skipped += (r.skipped || 0);
            salveProgress(Math.round(((i + 1) / chunks.length) * 100),
                '<i class="fa-solid fa-spinner fa-spin me-1"></i> Lote ' + (i + 1) + '/' + chunks.length + ' concluído...');
        }
        salveProgress(100, '<i class="fa-solid fa-circle-check me-1"></i> Concluído!');
        showSalveSuccess('Importação concluída com sucesso! ' + totals.inserted + ' adicionados, ' + totals.updated + ' atualizados.', totals);
        return true;
    }

    $(document).on('click', '#btn-execute-import-salve', async function() {
        if (!selectedSalveFile) return;

        const btn = $(this);
        btn.prop('disabled', true);
        $('#salve-progress-container').removeClass('d-none');
        $('#salve-result-container').addClass('d-none').empty();
        $('#salve-progress-bar').css('width', '0%').text('0%').attr('aria-valuenow', 0);
        $('#salve-progress-percent').text('0%');
        $('#salve-progress-status').html('<i class="fa-solid fa-spinner fa-spin me-1"></i> Iniciando importação...');

        const formData = new FormData();
        formData.append('csv_file', selectedSalveFile);
        formData.append('auto_images', $('#check-auto-images').is(':checked'));
        formData.append('max_rows', $('#select-max-rows').val());

        try {
            const response = await fetch('/api/v1/animais/import-salve?stream=true', {
                method: 'POST',
                headers: { 'Accept': 'text/event-stream' },
                body: formData
            });

            // A Vercel pode responder JSON direto (erro, ou função sem streaming).
            // Nesse caso não há eventos SSE para ler — trata como JSON.
            var contentType = '';
            try { contentType = response.headers.get('content-type') || ''; } catch (e) {}
            if (contentType.indexOf('application/json') !== -1) {
                var jsonData = await response.json();
                if (response.ok && jsonData && jsonData.success) {
                    showSalveSuccess(jsonData.message, jsonData.data || {});
                    return;
                }
                throw new Error(formatErrorMessage(jsonData, 'Erro no servidor: HTTP ' + response.status));
            }
            if (!response.ok) {
                throw new Error('Erro no servidor: HTTP ' + response.status);
            }
            if (!response.body || typeof response.body.getReader !== 'function') {
                throw new Error('STREAMING_INDISPONIVEL');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let hasCompleted = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop();

                for (const part of parts) {
                    if (!part.trim()) continue;
                    const lines = part.split('\n');
                    let eventType = 'message';
                    let dataStr = '';
                    for (const line of lines) {
                        if (line.startsWith('event: ')) eventType = line.replace('event: ', '').trim();
                        else if (line.startsWith('data: ')) dataStr = line.replace('data: ', '').trim();
                    }

                    if (dataStr) {
                        try {
                            const payload = JSON.parse(dataStr);
                            if (eventType === 'progress') {
                                const pct = Math.max(0, Math.min(100, payload.percent || 0));
                                $('#salve-progress-bar')
                                    .css('width', pct + '%')
                                    .text(pct + '%')
                                    .attr('aria-valuenow', pct);
                                $('#salve-progress-percent').text(pct + '%');
                                $('#salve-progress-status').html(`
                                    <i class="fa-solid fa-spinner fa-spin me-1"></i>
                                    Processando: <strong>${payload.species || ''}</strong> (${payload.current}/${payload.total})
                                `);
                            } else if (eventType === 'done') {
                                hasCompleted = true;
                                $('#salve-progress-bar').css('width', '100%').text('100%');
                                $('#salve-progress-percent').text('100%');
                                setTimeout(() => {
                                    $('#salve-progress-container').addClass('d-none');
                                    btn.prop('disabled', false);

                                    const summary = payload.data || {};
                                    const html = `
                                        <div class="alert alert-success border-0 mb-0" style="background: #1e3a29; color: #75b798;">
                                            <div class="d-flex align-items-center gap-2 mb-2">
                                                <i class="fa-solid fa-circle-check fs-5"></i>
                                                <strong>${payload.message || 'Importação concluída com sucesso!'}</strong>
                                            </div>
                                            <ul class="mb-0 small ps-3">
                                                <li><strong>Espécies identificadas:</strong> ${summary.totalParsed || 0}</li>
                                                <li><strong>Novas inseridas:</strong> ${summary.inserted || 0}</li>
                                                <li><strong>Atualizadas:</strong> ${summary.updated || 0}</li>
                                                ${summary.skipped ? `<li><strong>Ignoradas/Sem nome válido:</strong> ${summary.skipped}</li>` : ''}
                                            </ul>
                                        </div>
                                    `;
                                    $('#salve-result-container').html(html).removeClass('d-none');
                                    loadAnimals();
                                }, 400);
                            } else if (eventType === 'error') {
                                throw new Error(payload.message || payload.error || 'Erro durante a importação.');
                            }
                        } catch (jsonErr) {
                            if (eventType === 'error') throw jsonErr;
                        }
                    }
                }
            }

            if (!hasCompleted) {
                // O servidor encerrou a conexão sem concluir (ex.: timeout da função
                // serverless na Vercel). Tenta automaticamente o modo fatiado.
                try {
                    $('#salve-progress-status').html('<i class="fa-solid fa-spinner fa-spin me-1"></i> Conexão interrompida, tentando modo compatível...');
                    var fullTextFallback = await readSelectedSalveFileText();
                    await runChunkedSalveImport(fullTextFallback, $('#select-max-rows').val(), $('#check-auto-images').is(':checked'));
                } catch (chunkErr) {
                    showSalveError(new Error('O servidor encerrou a conexão antes de concluir (limite de tempo da hospedagem). Tente um limite menor de espécies ou desative a busca automática de fotos. Detalhe: ' + ((chunkErr && chunkErr.message) || 'sem resposta')));
                }
            }
        } catch (err) {
            if (err && err.message === 'STREAMING_INDISPONIVEL') {
                try {
                    var fullTextRetry = await readSelectedSalveFileText();
                    await runChunkedSalveImport(fullTextRetry, $('#select-max-rows').val(), $('#check-auto-images').is(':checked'));
                    return;
                } catch (chunkErr2) {
                    showSalveError(chunkErr2);
                    return;
                }
            }
            // Falha no SSE (rede, timeout, etc.): tenta o modo fatiado antes de desistir.
            try {
                $('#salve-progress-status').html('<i class="fa-solid fa-spinner fa-spin me-1"></i> Streaming indisponível nesta hospedagem, tentando modo compatível...');
                var fullTextCatch = await readSelectedSalveFileText();
                if (fullTextCatch) {
                    await runChunkedSalveImport(fullTextCatch, $('#select-max-rows').val(), $('#check-auto-images').is(':checked'));
                    return;
                }
                showSalveError(err);
            } catch (chunkErr3) {
                showSalveError(chunkErr3 && chunkErr3.message ? chunkErr3 : err);
            }
        }
    });
});
