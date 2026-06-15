$(document).ready(function() {
    let animals = [];

    // Carregar animais da API
    fetch('/api/animals')
        .then(response => response.json())
        .then(data => {
            animals = data;
            renderAnimals(animals);
            $('#loader').hide();
        })
        .catch(error => {
            console.error('Erro ao buscar animais:', error);
            $('#loader').html('<p class="text-danger">Erro ao carregar animais. Verifique a conexão com o banco de dados.</p>');
        });

    // Função para renderizar os cards
    function renderAnimals(filteredAnimals) {
        const listContainer = $('#animalList');
        // Remover itens anteriores mantendo o loader oculto
        listContainer.find('.animal-item').remove();

        if (filteredAnimals.length === 0) {
            $('#noResults').removeClass('d-none');
        } else {
            $('#noResults').addClass('d-none');
            filteredAnimals.forEach(animal => {
                const statusSigla = animal.api_nivelextincao.sigla ? animal.api_nivelextincao.sigla.toLowerCase() : 'dd';
                const statusClass = `bg-${statusSigla}`;
                const card = `
                    <div class="col-12 col-sm-6 col-lg-4 col-xl-3 animal-item">
                        <div class="animal-card">
                            <span class="status-badge ${statusClass}">${animal.api_nivelextincao.nome}</span>
                            <div class="animal-img-container">
                                <img src="${animal.imagem || 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=800&auto=format&fit=crop'}" class="animal-img" alt="${animal.nome_comum}">
                            </div>
                            <div class="card-body">
                                <h5 class="card-title text-truncate" title="${animal.nome_comum}">${animal.nome_comum}</h5>
                                <span class="scientific-name text-truncate d-block" title="${animal.nome_cientifico}">${animal.nome_cientifico}</span>
                                <p class="animal-info">${animal.habitos || 'Informações sobre hábitos e habitat desta espécie ainda estão sendo catalogadas em nosso sistema.'}</p>
                                <button class="btn-view" onclick="showDetails('${animal.id}')">Ver Detalhes</button>
                            </div>
                        </div>
                    </div>
                `;
                listContainer.append(card);
            });
        }
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

    // Função global para mostrar detalhes
    window.showDetails = function(id) {
        const animal = animals.find(a => a.id == id);
        if (!animal) return;

        $('#modalAnimalName').text(animal.nome_comum);
        
        let html = `
            <div class="container-fluid p-0">
                <div class="row g-0">
                    <div class="col-md-5">
                        <img src="${animal.imagem || 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=800&auto=format&fit=crop'}" class="img-fluid w-100 h-100" style="object-fit: cover; min-height: 400px;">
                    </div>
                    <div class="col-md-7 p-4">
                        <div class="mb-4">
                            <span class="badge bg-success px-3 py-2 rounded-pill me-2">${animal.classe || 'Classe não informada'}</span>
                            <span class="badge bg-secondary px-3 py-2 rounded-pill">${animal.familia || 'Família não informada'}</span>
                        </div>
                        
                        <div class="row mb-4">
                            <div class="col-6">
                                <h6 class="text-success fw-bold text-uppercase small mb-1">Nome Científico</h6>
                                <p class="fst-italic text-white">${animal.nome_cientifico}</p>
                            </div>
                            <div class="col-6">
                                <h6 class="text-success fw-bold text-uppercase small mb-1">Status</h6>
                                <p class="text-white">${animal.api_nivelextincao.nome} (${animal.api_nivelextincao.sigla})</p>
                            </div>
                        </div>
                        
                        <h6 class="text-success fw-bold text-uppercase small mb-1">Dieta</h6>
                        <p class="text-white-50 mb-4">${animal.dieta || 'Informação não disponível'}</p>
                        
                        <h6 class="text-success fw-bold text-uppercase small mb-1">Hábitos</h6>
                        <p class="text-white-50 mb-4">${animal.habitos || 'Informação não disponível'}</p>

                        <div class="bg-dark p-3 rounded-3">
                            <div class="row text-center">
                                <div class="col-6 border-end border-secondary">
                                    <h6 class="text-success fw-bold text-uppercase small mb-1">Altura Máx.</h6>
                                    <p class="text-white mb-0">${animal.altura ? animal.altura + ' m' : 'N/A'}</p>
                                </div>
                                <div class="col-6">
                                    <h6 class="text-success fw-bold text-uppercase small mb-1">Peso Médio</h6>
                                    <p class="text-white mb-0">${animal.peso ? animal.peso + ' kg' : 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                ${animal.obs ? `
                <div class="row p-4 border-top border-secondary">
                    <div class="col-12">
                        <h6 class="text-success fw-bold text-uppercase small mb-2">Observações Adicionais</h6>
                        <p class="text-white-50 mb-0">${animal.obs}</p>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        $('#modalBody').html(html);
        const modal = new bootstrap.Modal(document.getElementById('animalModal'));
        modal.show();
    };
});
