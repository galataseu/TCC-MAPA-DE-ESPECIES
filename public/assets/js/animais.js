$(document).ready(function() {
    let animals = [];
    let slideshowIntervals = [];

    // Carregar animais da API
    fetch('/api/animals')
        .then(response => response.json())
        .then(data => {
            console.log('Dados recebidos da API Node.js:', data);
            animals = data;
            renderAnimals(animals, true); // Pass true for initial load
            $('#loader').hide();
            startAllSlideshows();
        })
        .catch(error => {
            console.error('Erro ao buscar animais:', error);
            $('#loader').html('<p class="text-danger">Erro ao carregar animais. Verifique a conexão com o banco de dados.</p>');
        });

    // Função para renderizar os cards
    function renderAnimals(filteredAnimals, isInitialLoad = false) {
        console.log('Renderizando animais:', filteredAnimals);
        const listContainer = $('#animalList');
        listContainer.find('.animal-item').remove();
        stopAllSlideshows();

        if (filteredAnimals.length === 0) {
            console.log('Nenhum animal para renderizar.');
            if (!isInitialLoad) $('#noResults').removeClass('d-none');
            else $('#noResults').addClass('d-none');
        } else {
            $('#noResults').addClass('d-none');
            filteredAnimals.forEach(animal => {
                const statusSigla = animal.api_nivelextincao && animal.api_nivelextincao.sigla ? animal.api_nivelextincao.sigla.toLowerCase() : 'dd';
                const statusClass = `bg-${statusSigla}`;
                
                // Mapeamento de Cores
                const colorMap = {
                    'ex': '#000000', 'ew': '#831F34', 'cr': '#FF4068', 'en': '#ff6426',
                    'vu': '#FFA63A', 'nt': '#217757', 'lc': '#1a5fb4', 'dd': '#555555'
                };
                const borderColor = colorMap[statusSigla] || '#1a5fb4';

                // Mapeamento de Texturas para Classes CSS
                const classMap = {
                    'mammalia': 'mamiferos',
                    'aves': 'aves',
                    'amphibia': 'anfibios',
                    'reptilia': 'repteis',
                    'chondrichthyes': 'peixes-cartilaginosos',
                    'osteichthyes': 'peixes-osseos'
                };
                const className = animal.classe ? animal.classe.toLowerCase() : '';
                const textureClass = classMap[className] ? `texture-${classMap[className]}` : 'texture-default';

                let allImgs = [];
                const sourceImgs = animal.imagens || animal.api_animalimagem || [];
                sourceImgs.forEach(img => {
                    if (typeof img === 'string') allImgs.push(img);
                    else if (img && img.imagem) allImgs.push(img.imagem);
                });
                if (allImgs.length === 0 && animal.imagem) {
                    allImgs.push(animal.imagem.startsWith('http') || animal.imagem.startsWith('/') ? animal.imagem : `/media/${animal.imagem}`);
                }
                if (allImgs.length === 0) allImgs.push('https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=800&auto=format&fit=crop');

                const card = `
                    <div class="col-12 col-sm-6 col-lg-4 col-xl-3 animal-item" data-id="${animal.id}">
                        <div class="animal-card ${textureClass}" style="border-color: ${borderColor};">
                            <span class="status-badge ${statusClass}">${animal.api_nivelextincao ? animal.api_nivelextincao.nome : 'N/A'}</span>
                            <div class="animal-img-container">
                                <img src="${allImgs[0]}" class="animal-img fade-image" alt="${animal.nome_comum}" data-imgs='${JSON.stringify(allImgs)}' data-current="0">
                            </div>
                            <div class="card-body">
                                <h5 class="card-title text-truncate" title="${animal.nome_comum}">${animal.nome_comum}</h5>
                                <span class="scientific-name text-truncate d-block" style="color: ${borderColor}; filter: brightness(1.4);" title="${animal.nome_cientifico}">${animal.nome_cientifico}</span>
                                <p class="animal-info">${animal.habitos || 'Informações sobre hábitos e habitat desta espécie ainda estão sendo catalogadas.'}</p>
                                <button class="btn-view" style="background-color: ${borderColor};" onclick="showDetails('${animal.id}')">Ver Detalhes</button>
                            </div>
                        </div>
                    </div>
                `;
                listContainer.append(card);
            });
            startAllSlideshows();
        }
    }

    function startAllSlideshows() {
        $('.animal-img').each(function() {
            const imgElement = $(this);
            const imgsRaw = imgElement.attr('data-imgs');
            if(!imgsRaw) return;
            
            const imgs = JSON.parse(imgsRaw);
            if (imgs.length > 1) {
                const interval = setInterval(() => {
                    let current = parseInt(imgElement.attr('data-current'));
                    let next = (current + 1) % imgs.length;
                    
                    const nextImg = $('<img>').attr('src', imgs[next]).css({
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        'object-fit': 'cover',
                        opacity: 0
                    });
                    
                    imgElement.parent().append(nextImg);
                    nextImg.animate({ opacity: 1 }, 1500, function() {
                        imgElement.attr('src', imgs[next]);
                        imgElement.css('opacity', 1);
                        nextImg.remove();
                        imgElement.attr('data-current', next);
                    });
                }, 6000); // 6s interval
                slideshowIntervals.push(interval);
            }
        });
    }

    function stopAllSlideshows() {
        slideshowIntervals.forEach(clearInterval);
        slideshowIntervals = [];
    }

    // Pesquisa em tempo real
    $('#animalSearch').on('input', function() {
        const term = $(this).val().toLowerCase();
        const filtered = animals.filter(a => 
            a.nome_comum.toLowerCase().includes(term) || 
            a.nome_cientifico.toLowerCase().includes(term) ||
            (a.classe && a.classe.toLowerCase().includes(term))
        );
        renderAnimals(filtered);
    });

    window.showDetails = function(id) {
        const animal = animals.find(a => a.id == id);
        console.log("Debug - Animal selecionado:", animal); // Log para depuração
        if (!animal) return;

        const statusSigla = animal.api_nivelextincao && animal.api_nivelextincao.sigla ? animal.api_nivelextincao.sigla.toLowerCase() : 'dd';
        
        // Mapeamento de Cores e Ícones
        const statusConfig = {
            'ex': { color: '#000000', icon: 'fa-skull' },
            'ew': { color: '#831F34', icon: 'fa-skull-crossbones' },
            'cr': { color: '#FF4068', icon: 'fa-exclamation-triangle' },
            'en': { color: '#ff6426', icon: 'fa-triangle-exclamation' },
            'vu': { color: '#FFA63A', icon: 'fa-shield-halved' },
            'nt': { color: '#217757', icon: 'fa-circle-check' },
            'lc': { color: '#1a5fb4', icon: 'fa-circle-check' },
            'dd': { color: '#555555', icon: 'fa-question-circle' }
        };
        const config = statusConfig[statusSigla] || { color: '#1a5fb4', icon: 'fa-info-circle' };
        const statusColor = config.color;
        const statusIcon = config.icon;

        let allImgs = [];
        if (animal.imagens && Array.isArray(animal.imagens)) {
            animal.imagens.forEach(img => {
                if (typeof img === 'string') allImgs.push(img);
                else if (img && img.imagem) allImgs.push(img.imagem);
            });
        }
        if (allImgs.length === 0 && animal.imagem) {
            allImgs.push(animal.imagem.startsWith('http') || animal.imagem.startsWith('/') ? animal.imagem : `/media/${animal.imagem}`);
        }
        if (allImgs.length === 0) allImgs.push('https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=800&auto=format&fit=crop');

        // Extração robusta de Biomas
        let biomas = 'Não informado';
        if (animal.biomas && Array.isArray(animal.biomas) && animal.biomas.length > 0) {
            biomas = animal.biomas.map(b => b.nome).join(', ');
        } else if (animal.api_animal_biomas && Array.isArray(animal.api_animal_biomas) && animal.api_animal_biomas.length > 0) {
            biomas = animal.api_animal_biomas.map(b => b.api_bioma.nome).join(', ');
        }

        // Formatação de data/hora e autor
        const dataCad = animal.created_at ? new Date(animal.created_at).toLocaleDateString('pt-BR') : '11/06/2026';
        const horaCad = animal.created_at ? new Date(animal.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '13:18';
        const autorCad = animal.api_user ? (animal.api_user.username || 'Admin') : 'Admin';

        $('#modalAnimalName').html(`${animal.nome_comum} <span class="badge bg-dark border text-muted fs-6 ms-2">ID #${animal.id}</span>`).css('color', statusColor);

        let html = `
            <div class="container-fluid p-0">
                <div class="row g-0">
                    <div class="col-md-5">
                        <div class="modal-img-container" style="overflow: hidden; position: relative; border-left: 5px solid ${statusColor}; height: 100%; min-height: 480px;">
                            <img id="modalCarouselImg" src="${allImgs[0]}" class="modal-img-pan" data-current="0" data-imgs='${JSON.stringify(allImgs)}' style="width: 100%; height: 100%; object-fit: cover;">
                            ${allImgs.length > 1 ? `
                                <button class="carousel-btn carousel-prev" onclick="changeModalImg(-1)" style="position: absolute; top: 50%; left: 10px; z-index: 10; border: none; background: ${statusColor}; color: white; border-radius: 50%; width: 40px; height: 40px; cursor: pointer;">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <button class="carousel-btn carousel-next" onclick="changeModalImg(1)" style="position: absolute; top: 50%; right: 10px; z-index: 10; border: none; background: ${statusColor}; color: white; border-radius: 50%; width: 40px; height: 40px; cursor: pointer;">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="col-md-7 p-4" style="max-height: 520px; overflow-y: auto;">
                        <div class="mb-3 d-flex justify-content-between align-items-center">
                            <div>
                                <span class="badge px-3 py-2 rounded-pill me-2" style="background-color: ${statusColor};">${animal.classe || 'Classe não informada'}</span>
                                <span class="badge bg-secondary px-3 py-2 rounded-pill">${animal.familia || 'Família não informada'}</span>
                            </div>
                            <span class="text-muted small"><i class="fas fa-user-shield me-1"></i> Autor: <strong>${autorCad}</strong></span>
                        </div>
                        <div class="row mb-3">
                            <div class="col-6">
                                <h6 style="color: ${statusColor};" class="fw-bold text-uppercase small mb-1">Nome Científico</h6>
                                <p class="fst-italic text-white mb-0">${animal.nome_cientifico}</p>
                            </div>
                            <div class="col-6">
                                <h6 style="color: ${statusColor};" class="fw-bold text-uppercase small mb-1">Status de Extinção</h6>
                                <p class="text-white mb-0"><i class="fas ${statusIcon} me-2" style="color: ${statusColor};"></i>${animal.api_nivelextincao ? animal.api_nivelextincao.nome : 'N/A'}</p>
                            </div>
                        </div>
                        <div class="bg-dark p-4 rounded-3 mt-3" style="border-top: 3px solid ${statusColor}; border-bottom: 3px solid ${statusColor};">
                            <h5 class="fst-italic text-white mb-3 text-center">${animal.nome_cientifico}</h5>
                            <hr style="border-color: ${statusColor}; opacity: 0.5;">
                            
                            <div class="row text-center mb-1 gy-3 text-white">
                                <div class="col-6 col-md-3 d-flex flex-column align-items-center justify-content-center">
                                    <span class="mb-1 text-muted small"><i class="fas fa-utensils me-1"></i> Dieta</span>
                                    <span class="fw-bold" style="color: ${statusColor}; font-size: 1.05rem;">${animal.dieta || 'N/A'}</span>
                                </div>
                                <div class="col-6 col-md-3 d-flex flex-column align-items-center justify-content-center border-start border-secondary">
                                    <span class="mb-1 text-muted small"><i class="fas fa-weight-hanging me-1"></i> Peso</span>
                                    <span class="fw-bold" style="color: ${statusColor}; font-size: 1.05rem;">${animal.peso ? animal.peso + ' Kg' : 'N/A'}</span>
                                </div>
                                <div class="col-6 col-md-3 d-flex flex-column align-items-center justify-content-center border-start border-secondary">
                                    <span class="mb-1 text-muted small"><i class="fas fa-arrows-alt-h me-1"></i> Comprimento</span>
                                    <span class="fw-bold" style="color: ${statusColor}; font-size: 1.05rem;">${animal.comprimento ? animal.comprimento + ' Cm' : (animal.altura ? Math.round(animal.altura*100) + ' Cm' : 'N/A')}</span>
                                </div>
                                <div class="col-6 col-md-3 d-flex flex-column align-items-center justify-content-center border-start border-secondary">
                                    <span class="mb-1 text-muted small"><i class="fas fa-arrows-alt-v me-1"></i> Altura</span>
                                    <span class="fw-bold" style="color: ${statusColor}; font-size: 1.05rem;">${animal.altura ? animal.altura + ' m' : 'N/A'}</span>
                                </div>
                            </div>
                            
                            <hr style="border-color: ${statusColor}; opacity: 0.5;">
                            
                            <div class="row text-center mb-1 gy-3 text-white">
                                <div class="col-12 col-md-4 d-flex flex-column align-items-center justify-content-center">
                                    <h6 class="mb-1 text-muted small">Biomas</h6>
                                    <p class="mb-0 fw-bold" style="color: ${statusColor}; font-size: 1rem;">${biomas}</p>
                                </div>
                                <div class="col-6 col-md-4 border-start border-secondary d-flex flex-column align-items-center justify-content-center">
                                    <h6 class="mb-1 text-muted small">Regiões</h6>
                                    <p class="mb-0 fw-bold" style="color: ${statusColor}; font-size: 1rem;">Sul</p>
                                </div>
                                <div class="col-6 col-md-4 border-start border-secondary d-flex flex-column align-items-center justify-content-center">
                                    <h6 class="mb-1 text-muted small">Estados</h6>
                                    <p class="mb-0 fw-bold" style="color: ${statusColor}; font-size: 1rem;">PR, SC, RS</p>
                                </div>
                            </div>

                            <hr style="border-color: ${statusColor}; opacity: 0.5;">
                            
                            <div class="mt-3 text-white">
                                <h6 class="fw-bold text-uppercase small mb-2" style="color: ${statusColor};"><i class="fas fa-paw me-2"></i>Hábitos & Comportamento</h6>
                                <p class="mb-3" style="font-size: 0.95rem; line-height: 1.6; text-align: justify; color: #ccc;">${animal.habitos || 'Informação sobre hábitos não disponível.'}</p>
                                
                                <h6 class="fw-bold text-uppercase small mb-2" style="color: ${statusColor};"><i class="fas fa-shield-alt me-2"></i>Ameaças & Observações de Conservação</h6>
                                <p class="mb-0" style="font-size: 0.95rem; line-height: 1.6; text-align: justify; color: #ccc;">${animal.obs || 'Nenhuma observação cadastrada.'}</p>
                            </div>
                        </div>

                        <div class="mt-3 pt-2 d-flex justify-content-between align-items-center text-muted small border-top border-secondary">
                            <span><i class="far fa-calendar-alt me-1"></i> Data Cad.: <strong>${dataCad}</strong></span>
                            <span><i class="far fa-clock me-1"></i> Hora Cad.: <strong>${horaCad}</strong></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        let modalEl = $('#animalModal');
        if (modalEl.length === 0) {
            $('body').append(`
                <div class="modal fade" id="animalModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-xl modal-dialog-centered">
                        <div class="modal-content border-0 shadow-lg" style="background-color: #2B2A33;">
                            <div class="modal-header border-bottom border-secondary">
                                <h5 class="modal-title fw-bold" id="modalAnimalName"></h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body p-0" id="modalBody"></div>
                            <div class="modal-footer border-top border-secondary">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        } else {
            // Garante que o modal use a classe modal-xl
            modalEl.find('.modal-dialog').removeClass('modal-lg').addClass('modal-xl');
        }
        
        $('#modalAnimalName').text(animal.nome_comum).css('color', statusColor);
        $('#modalBody').html(html);
        new bootstrap.Modal(document.getElementById('animalModal')).show();
    };

    window.changeModalImg = function(step) {
        const imgTag = $('#modalCarouselImg');
        const imgs = JSON.parse(imgTag.attr('data-imgs'));
        let current = parseInt(imgTag.attr('data-current'));
        let next = (current + step + imgs.length) % imgs.length;
        
        const nextImg = $('<img>').attr('src', imgs[next]).css({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            'object-fit': 'cover',
            opacity: 0
        });
        
        imgTag.parent().append(nextImg);
        nextImg.animate({ opacity: 1 }, 800, function() {
            imgTag.attr('src', imgs[next]);
            imgTag.css('opacity', 1);
            nextImg.remove();
            imgTag.attr('data-current', next);
        });
    };
});
