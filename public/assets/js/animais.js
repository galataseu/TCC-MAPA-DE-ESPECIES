$(document).ready(function() {
    let animals = [];
    let rightPanelMap = null;
    let rightPanelMarker = null;
    let maskLayer = null;
    let maskPaths = [[[-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]]];

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

    // Mapa de cores oficiais para níveis de extinção
    const extinctionColorMap = {
        'ex': '#403E4C', 'ew': '#831F34', 'cr': '#FF4068', 'en': '#FF6426',
        'vu': '#FFA63A', 'nt': '#217757', 'lc': '#1A5FB4', 'dd': '#555555',
        '1': '#FF4068', // CR
        '2': '#FF6426', // EN
        '3': '#FFA63A', // VU
        '4': '#217757', // NT
        '5': '#1A5FB4', // LC
        '6': '#555555', // DD
        '7': '#403E4C', // EX
        '8': '#831F34'  // EW
    };

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
                res.data.forEach(n => {
                    const sigla = (n.sigla || '').toLowerCase();
                    const color = extinctionColorMap[n.id] || extinctionColorMap[sigla] || '#383642';
                    const textColor = (n.id == 3 || sigla === 'vu') ? '#111111' : '#FFFFFF';
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

    // Mudar cor dinamicamente ao selecionar Nível de Extinção
    $(document).on('change', '.select-nivel-extincao', function() {
        const val = $(this).val();
        const color = extinctionColorMap[val] || '#383642';
        const textColor = val == '3' ? '#111111' : '#FFFFFF';
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
                const raw = typeof imgObj === 'string' ? imgObj : imgObj.imagem;
                if (raw && typeof raw === 'string' && raw.trim()) {
                    const u = raw.startsWith('http') || raw.startsWith('/') || raw.startsWith('data:') ? raw : `/media/${raw}`;
                    if (!images.includes(u)) images.push(u);
                }
            });
        }
        if (animal.icone) {
            const u = animal.icone.startsWith('http') || animal.icone.startsWith('/') || animal.icone.startsWith('data:') ? animal.icone : `/media/${animal.icone}`;
            if (!images.includes(u)) images.push(u);
        }
        if (animal.imagem) {
            const u = animal.imagem.startsWith('http') || animal.imagem.startsWith('/') || animal.imagem.startsWith('data:') ? animal.imagem : `/media/${animal.imagem}`;
            if (!images.includes(u)) images.push(u);
        }
        if (images.length === 0) {
            images.push('/assets/img/logotipo.png');
        }
        return images;
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

    // Renderizar os Cards Coloridos de Tamanho Fixo no Painel Direito
    function renderSpeciesGrid(filteredAnimals) {
        const gridContainer = $('#animalCardsGrid');
        gridContainer.empty();

        if (filteredAnimals.length === 0) {
            gridContainer.html('<div class="col-12 text-center text-muted py-5"><p>Nenhuma espécie encontrada.</p></div>');
            return;
        }

        filteredAnimals.forEach((animal) => {
            const textureClass = getAnimalTextureClass(animal.classe);
            const formattedId = String(animal.id).padStart(4, '0');
            const dataFormatted = animal.created_at ? new Date(animal.created_at).toLocaleDateString('pt-BR') : '00/00/0000';
            const autor = animal.api_user ? (animal.api_user.username || 'adm123') : 'adm123';

            // Resgatar sigla de extinção e cor
            const sigla = (animal.api_nivelextincao ? animal.api_nivelextincao.sigla : (animal.nivel_sigla || 'CR')).toUpperCase();
            const extinctionColor = extinctionColorMap[sigla.toLowerCase()] || extinctionColorMap[String(animal.nivel_extincao_id)] || '#FF4068';
            const biomasHtml = getAnimalBiomesHtml(animal);

            const imgs = getAnimalImages(animal);
            const slidesHtml = imgs.map((src, i) => `
                <img src="${src}" alt="${animal.nome_comum}" class="card-slide-img ${i === 0 ? 'active' : ''}">
            `).join('');

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
                <div class="species-card ${textureClass}" data-id="${animal.id}" onclick="showDetails('${animal.id}')" style="cursor: pointer; background-color: ${extinctionColor};">
                    ${menuButtonHtml}
                    <span class="species-card-extinction-badge" style="background-color: ${extinctionColor};">${sigla}</span>
                    <div class="species-card-slideshow">
                        ${slidesHtml}
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
            gridContainer.append(cardHtml);
        });

        startCardSlideshows();
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
    window.deleteAnimal = function(id) {
        const animal = animals.find(a => a.id == id);
        const name = animal ? animal.nome_comum : 'esta espécie';

        if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) return;
        if (!confirm(`⚠️ CONFIRMAÇÃO FINAL:\n\nEsta ação excluirá permanentemente "${name}" do sistema.\n\nDeseja continuar?`)) return;

        fetch(`/api/v1/animais/${id}/`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(`"${name}" foi excluído com sucesso!`);
                    if ($('#animal-id-hidden').val() == id) {
                        resetForm();
                    }
                    loadAnimals();
                } else {
                    alert('Erro ao excluir: ' + (data.error || 'Tente novamente.'));
                }
            })
            .catch(err => {
                console.error(err);
                alert('Erro de conexão ao excluir animal.');
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
        $('#habitos').val(animal.habitos || '');
        $('#obs').val(animal.obs || '');

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

        // Preview da imagem
        let imgUrl = animal.imagens && animal.imagens.length > 0 ? (typeof animal.imagens[0] === 'string' ? animal.imagens[0] : animal.imagens[0].imagem) : (animal.imagem || '');
        if (imgUrl) {
            $('#image-preview-img').attr('src', imgUrl.startsWith('http') || imgUrl.startsWith('/') ? imgUrl : `/media/${imgUrl}`).removeClass('d-none');
            $('#image-preview-content').addClass('d-none');
        }

        // Preview do ícone
        let iconUrl = animal.icone || imgUrl;
        if (iconUrl) {
            $('#icon-preview-img').attr('src', iconUrl.startsWith('http') || iconUrl.startsWith('/') || iconUrl.startsWith('data:') ? iconUrl : `/media/${iconUrl}`).removeClass('d-none').css('transform', 'none');
            $('#icon-preview-content').addClass('d-none');
        }

        // Atualizar coordenadas e marcadores no minimapa
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
                } else {
                    addDraftMarker(-27.59, -48.54);
                }
            } else {
                addDraftMarker(-27.59, -48.54);
            }
        }).fail(function() {
            addDraftMarker(-27.59, -48.54);
        });

        // Carregar polígono de área de ocorrência existente (se houver)
        if (animal.area_polygon) {
            let data = animal.area_polygon;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch(e){}
            }
            if (data && typeof data === 'object' && !Array.isArray(data) && data.polygons) {
                polygonColor = data.color || '#FFAA44';
                draftPolygonsList = data.polygons;
            } else if (Array.isArray(data) && data.length > 0) {
                polygonColor = animal.area_polygon_color || '#FFAA44';
                if (Array.isArray(data[0]) && Array.isArray(data[0][0])) {
                    draftPolygonsList = data;
                } else {
                    draftPolygonsList = [data];
                }
            } else {
                draftPolygonsList = [[]];
            }
            $('#polygon-color-picker').val(polygonColor);
            redrawDraftPolygonLayers();
        } else {
            draftPolygonsList = [[]];
            redrawDraftPolygonLayers();
        }
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

        if (validPolygons.length > 0) {
            const payload = {
                color: polygonColor,
                polygons: validPolygons
            };
            $('#area-polygon-json-hidden').val(JSON.stringify(payload));
            $('#polygon-status-badge')
                .text(`Área: ${validPolygons.length} área(s) (${totalPoints} pts)`)
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
            alert('Complete pelo menos 3 pontos no polígono atual antes de iniciar uma nova área.');
        }
    });

    $(document).on('click', '#btn-undo-polygon', function() {
        undoPolygonState();
    });

    $(document).on('click', '#btn-redo-polygon', function() {
        redoPolygonState();
    });

    $(document).on('change input', '#polygon-color-picker', function() {
        polygonColor = $(this).val();
        savePolygonHistoryState();
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
        draftLocationMarkers.forEach((item, idx) => {
            if (item.marker && item.marker.getPopup() && item.marker.getPopup()._contentNode && item.marker.getPopup()._contentNode.contains(btnEl)) {
                rightPanelMap.removeLayer(item.marker);
                draftLocationMarkers.splice(idx, 1);
            }
        });
        updateDraftMarkersHiddenInput();
    };

    $(document).on('click', '#btn-add-location-marker', function() {
        if (!rightPanelMap) return;
        const center = rightPanelMap.getCenter();
        const offset = (draftLocationMarkers.length * 0.04);
        addDraftMarker(center.lat + offset, center.lng + offset);
    });

    $(document).on('click', '#btn-clear-location-markers', function() {
        clearDraftMarkers();
        addDraftMarker(-27.59, -48.54);
    });

    // 3. Inicialização do Mapa Sincronizado 100% IDÊNTICO ao Mapa Principal
    function initRightPanelMap(lat = -27.59, lng = -48.54) {
        setTimeout(() => {
            if (!rightPanelMap) {
                const darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
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
                const pampasLayer = L.geoJson(null, { renderer: svgRenderer, style: { color: "transparent", fillColor: "#3b7ba5", fillOpacity: 0.3 } }).addTo(rightPanelMap);
                const pampasPattern = L.geoJson(null, { renderer: svgRenderer, style: { color: "transparent", fillColor: "url(#pampa-pattern-min)", fillOpacity: 0.6 } }).addTo(rightPanelMap);
                const cerradoLayer = L.geoJson(null, { renderer: svgRenderer, style: { color: "transparent", fillColor: "#E6C140", fillOpacity: 0.4 } }).addTo(rightPanelMap);
                const cerradoPattern = L.geoJson(null, { renderer: svgRenderer, style: { color: "transparent", fillColor: "url(#cerrado-pattern-min)", fillOpacity: 0.6 } }).addTo(rightPanelMap);
                const atlanticLayer = L.geoJson(null, { renderer: svgRenderer, style: { color: "transparent", fillColor: "#287f5e", fillOpacity: 0.1 } }).addTo(rightPanelMap);
                const atlanticPattern = L.geoJson(null, { renderer: svgRenderer, style: { color: "transparent", fillColor: "url(#tree-pattern-min)", fillOpacity: 0.6 } }).addTo(rightPanelMap);

                maskLayer = L.polygon(maskPaths, {
                    color: "transparent",
                    fillColor: "#000000",
                    fillOpacity: 0.6,
                    pointerEvents: "none",
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

                            if (rsData.features && cleanForest) {
                                const pampaDiff = turf.difference(turf.simplify(turf.buffer(rsData.features[0], 0), { tolerance: 0.003 }), cleanForest);
                                if (pampaDiff) { pampasLayer.addData(pampaDiff); pampasPattern.addData(pampaDiff); }
                            }
                            if (prData.features && cleanForest) {
                                const cerradoDiff = turf.difference(turf.simplify(turf.buffer(prData.features[0], 0), { tolerance: 0.003 }), cleanForest);
                                if (cerradoDiff) { cerradoLayer.addData(cerradoDiff); cerradoPattern.addData(cerradoDiff); }
                            }
                        } catch (e) {
                            console.error("Turf error in mini map:", e);
                        }
                    }

                    L.geoJson(prData, { style: { color: "#1E7552", weight: 2, fillOpacity: 0, clickable: false } }).addTo(rightPanelMap);
                    L.geoJson(scData, { style: { color: "#FF0000", weight: 2, fillOpacity: 0, clickable: false } }).addTo(rightPanelMap);
                    L.geoJson(rsData, { style: { color: "#FFFF00", weight: 2, fillOpacity: 0, clickable: false } }).addTo(rightPanelMap);

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
                                const iconSrc = p.icone || (p.imagens && p.imagens.length > 0 ? p.imagens[0].imagem : '/assets/img/logotipo.png');

                                return L.marker(latlng, {
                                    icon: L.divIcon({
                                        className: 'custom-animal-marker',
                                        html: `
                                            <div class="marker-container">
                                                <div class="marker-pin" style="border-color: ${borderColor};">
                                                    <div class="marker-avatar">
                                                        <img src="${iconSrc}" alt="${p.nome_comum}">
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

                if (draftLocationMarkers.length === 0) {
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
    let iconCropState = {
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
    };

    $('#image-stack-trigger').click(() => $('#input-file-image').click());
    $('#icon-circle-trigger').click(function(e) {
        if (e.target.tagName !== 'IMG') {
            $('#input-file-icon').click();
        }
    });

    $('#input-file-image').change(function() {
        const files = this.files;
        if (files && files.length > 0) {
            const reader1 = new FileReader();
            reader1.onload = (e) => {
                $('#image-preview-img').attr('src', e.target.result).removeClass('d-none');
                $('#image-preview-content').addClass('d-none');
            };
            reader1.readAsDataURL(files[0]);
            if (files.length > 1) {
                const reader2 = new FileReader();
                reader2.onload = (e) => $('.card-back-1').html(`<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`);
                reader2.readAsDataURL(files[1]);
            }
            if (files.length > 2) {
                const reader3 = new FileReader();
                reader3.onload = (e) => $('.card-back-2').html(`<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`);
                reader3.readAsDataURL(files[2]);
            }
        }
    });

    $('#input-file-icon').change(function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = $('#icon-preview-img');
                img.attr('src', e.target.result).removeClass('d-none');
                $('#icon-preview-content').addClass('d-none');
                iconCropState.currentX = 0;
                iconCropState.currentY = 0;
                img.css('transform', 'translate(0px, 0px)');
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    // Arraste com o ponteiro dentro do círculo
    const iconWrapper = document.getElementById('icon-circle-trigger');
    const iconImg = document.getElementById('icon-preview-img');

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
            iconImg.style.transform = `translate(${iconCropState.currentX}px, ${iconCropState.currentY}px)`;
        });

        window.addEventListener('mouseup', function() {
            if (iconCropState.isDragging) {
                iconCropState.isDragging = false;
            }
        });
    }

    function getCroppedCanvasDataUrl(imgEl, cropState) {
        if (!imgEl || imgEl.classList.contains('d-none') || !imgEl.src) return null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 500;
            canvas.height = 500;
            const ctx = canvas.getContext('2d');

            ctx.save();
            ctx.beginPath();
            ctx.arc(250, 250, 250, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();

            const naturalW = imgEl.naturalWidth || 500;
            const naturalH = imgEl.naturalHeight || 500;
            const aspect = naturalW / naturalH;
            let drawW = 500;
            let drawH = 500;

            if (aspect > 1) {
                drawW = 500 * aspect;
            } else {
                drawH = 500 / aspect;
            }

            const scaleRatio = 500 / 170;
            const drawX = (500 - drawW) / 2 + (cropState.currentX * scaleRatio);
            const drawY = (500 - drawH) / 2 + (cropState.currentY * scaleRatio);

            ctx.drawImage(imgEl, drawX, drawY, drawW, drawH);
            ctx.restore();
            return canvas.toDataURL('image/png');
        } catch(e) {
            console.error('Error generating cropped canvas:', e);
            return null;
        }
    }

    // Submissão do Formulário de Cadastro / Edição
    $('#form-species-create').submit(function(e) {
        e.preventDefault();
        const formData = new FormData(this);

        // Injetar crop do ícone imediatamente
        const iconImgEl = document.getElementById('icon-preview-img');
        const croppedDataUrl = getCroppedCanvasDataUrl(iconImgEl, iconCropState);
        if (croppedDataUrl) {
            formData.set('icone_base64', croppedDataUrl);
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
            if (data.success) {
                alert(animalId ? 'Espécie atualizada com sucesso!' : 'Espécie salva com sucesso!');
                resetForm();
                loadAnimals();
            } else {
                alert('Erro ao salvar espécie: ' + (data.error || 'Tente novamente.'));
            }
        })
        .catch(err => {
            console.error('Erro na requisição:', err);
            alert('Erro ao salvar espécie.');
        });
    });

    function resetForm() {
        $('#form-species-create')[0].reset();
        $('#animal-id-hidden').val('');
        $('#coordenadas-json-hidden').val('');
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
        if (animal.icone) allImgs.push(animal.icone);
        const sourceImgs = animal.imagens || [];
        if (Array.isArray(sourceImgs)) {
            sourceImgs.forEach(img => {
                if (typeof img === 'string') allImgs.push(img);
                else if (img && img.imagem) allImgs.push(img.imagem);
            });
        }
        if (allImgs.length === 0) allImgs.push('/assets/img/logotipo.png');

        allImgs = allImgs.map(url => (url.startsWith('http') || url.startsWith('/') || url.startsWith('data:') ? url : `/media/${url}`));

        let biomas = (animal.biomas || []).map(b => (typeof b === 'object' ? b.nome : b)).join(', ') || 'Não informado';

        let html = `
          <div class="container-fluid p-0">
            <div class="row g-0">
              <div class="col-md-5">
                <div class="modal-img-container" style="overflow: hidden; position: relative; border-left: 5px solid ${statusColor}; height: 100%; min-height: 280px;">
                  <img id="modalCarouselImg" src="${allImgs[0]}" class="modal-img-pan" data-current="0" data-imgs='${JSON.stringify(allImgs)}'>
                  ${allImgs.length > 1 ? `
                    <button class="carousel-btn carousel-prev" onclick="changeModalImg(-1)" style="position: absolute; top: 50%; left: 10px; z-index: 10; border: none; background: ${statusColor}; color: white; border-radius: 50%; width: 36px; height: 36px; cursor: pointer;">
                      <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="carousel-btn carousel-next" onclick="changeModalImg(1)" style="position: absolute; top: 50%; right: 10px; z-index: 10; border: none; background: ${statusColor}; color: white; border-radius: 50%; width: 36px; height: 36px; cursor: pointer;">
                      <i class="fas fa-chevron-right"></i>
                    </button>
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
                          <div class="fw-bold" style="color: ${statusColor}; font-size: 0.95rem;">${animal.peso ? animal.peso + ' Kg' : '00 Kg'}</div>
                      </div>
                      <div class="col-4 border-start border-secondary">
                          <span class="mb-1 text-muted small"><i class="fas fa-arrows-alt-v me-1"></i> Altura</span>
                          <div class="fw-bold" style="color: ${statusColor}; font-size: 0.95rem;">${animal.altura ? animal.altura + ' m' : '00 m'}</div>
                      </div>
                  </div>
                  <hr style="border-color: ${statusColor}; opacity: 0.3;" class="my-2">
                  <div class="mt-2 text-white">
                      <h6 class="fst-italic text-muted small mb-1">Biomas</h6>
                      <p class="mb-2 fw-bold" style="color: ${statusColor};">${biomas}</p>
                      <h6 class="fst-italic text-muted small mb-1">Descrição / Hábitos</h6>
                      <p class="mb-0 small text-light" style="line-height: 1.5; text-align: justify;">${animal.habitos || 'Descrição detalhada não disponível.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        $('#modalAnimalName').text(animal.nome_comum).css('color', statusColor);
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

    window.changeModalImg = function(step) {
        const imgTag = $('#modalCarouselImg');
        const imgs = JSON.parse(imgTag.attr('data-imgs'));
        let current = parseInt(imgTag.attr('data-current'));
        let next = (current + step + imgs.length) % imgs.length;
        
        imgTag.fadeOut(150, function() {
            imgTag.attr('src', imgs[next]);
            imgTag.attr('data-current', next);
            imgTag.fadeIn(150);
        });
    };
});
