// Se estiver usando Node.js, instale e importe o node-fetch
// const fetch = require('node-fetch');

// Função assíncrona para enviar mensagens ao Telegram
async function sendTelegramMessage(message) {
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (!telegramBotToken || !telegramChatId) {
        console.error('Variáveis de ambiente do Telegram não estão definidas.');
        return;
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: telegramChatId,
                text: message
            })
        });

        if (response.ok) {
            console.log('Mensagem enviada para o grupo do Telegram com sucesso.');
        } else {
            console.error('Erro ao enviar mensagem para o grupo do Telegram:', response.statusText);
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem para o grupo do Telegram:', error.message);
    }
}

// Função assíncrona para buscar e atualizar o status dos sites
async function fetchSitesStatus() {
    try {
        // Faz uma requisição para o backend para obter o status dos sites
        const response = await fetch('http://localhost:3001/checkSites');

        // Verifica se a resposta foi bem-sucedida
        if (!response.ok) {
            throw new Error('Erro ao obter status dos sites: ' + response.statusText);
        }

        // Converte a resposta para JSON
        const data = await response.json();

        // Obtém a referência do corpo da tabela onde os dados serão exibidos
        const siteTableBody = document.getElementById('siteTableBody');

        // Limpa o conteúdo anterior da tabela antes de atualizar com os novos resultados
        siteTableBody.innerHTML = '';

        // Preenche a tabela com os resultados obtidos do backend
        data.forEach(site => {
            // Cria uma nova linha na tabela
            const row = document.createElement('tr');

            // Define a classe de estilo com base no status do site
            const statusClass = site.status === 'Online' ? 'status-green' : 'status-red';

            // Insere os dados do site na linha criada
            row.innerHTML = `
                <td id="tabela-site">${site.url}</td>
                <td id="tabela-status">
                    <span class="status-dot ${statusClass}"></span>
                    ${site.status}
                </td>
            `;
            // Adiciona a linha à tabela
            siteTableBody.appendChild(row);

            // Se o site estiver offline, envia uma mensagem de alerta
            if (site.status === 'Offline') {
                sendTelegramMessage(`ALERTA: O site ${site.url} está inacessível ou fora do ar!`);
            }
        });
    } catch (error) {
        // Exibe um erro no console se houver problemas ao obter os dados
        console.error('Erro ao obter status dos sites:', error.message);
    }
}

// Função assíncrona para adicionar um novo link
async function addLink(event) {
    event.preventDefault(); // Previne o comportamento padrão do formulário

    // Obtém o valor do input
    const linkInput = document.getElementById('linkInput').value;

    try {
        // Faz uma requisição POST para adicionar o novo link
        const response = await fetch('http://localhost:3001/addLink', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ link: linkInput })
        });

        if (response.ok) {
            // Limpa o input
            document.getElementById('linkInput').value = '';
            // Exibe um alerta de sucesso
            alert('Link cadastrado com sucesso!');
            // Atualiza a tabela sem recarregar a página
            fetchSitesStatus();
        } else {
            console.error('Erro ao adicionar link:', response.statusText);
            alert('Erro ao adicionar o link. Tente novamente.');
        }
    } catch (error) {
        console.error('Erro ao adicionar link:', error.message);
        alert('Erro ao adicionar o link. Tente novamente.');
    }
}

// Adiciona um listener para o evento de submit do formulário
document.getElementById('addLinkForm').addEventListener('submit', addLink);

// Executa a função fetchSitesStatus imediatamente ao carregar a página
fetchSitesStatus();

// Verifica o status dos sites a cada 2 minutos (120000 milissegundos)
setInterval(fetchSitesStatus, 2 * 60 * 1000);
