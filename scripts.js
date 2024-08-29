// Função assíncrona para enviar mensagens ao Telegram
async function sendTelegramMessage(message) {
    const telegramBotToken = "7472348745:AAGMqF50_Q4TAWyQgeJySb0tG-njguiJmrI";
    const telegramChatId = "-1002155037998";

    try {
        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: telegramChatId,
                text: message
            })
        });
        console.log('Mensagem enviada para o grupo do Telegram com sucesso.');
    } catch (error) {
        console.error('Erro ao enviar mensagem para o grupo do Telegram:', error);
    }
}

// Função para verificar o status de um site com tempo limite
async function checkSiteStatus(url) {
    const timeout = 5000; // Tempo limite de 5 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            return 'Online';
        } else {
            return 'Offline';
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            return 'Lento';
        } else {
            console.error(`Erro ao verificar o site ${url}:`, error);
            return 'Offline';
        }
    }
}

// Função assíncrona para buscar e atualizar o status dos sites
async function fetchSitesStatus() {
    try {
        // Faz uma requisição para o backend para obter o status dos sites
        const response = await fetch('https://monitoramento-sites-api.onrender.com/checkSites');
        const data = await response.json();

        const siteTableBody = document.getElementById('siteTableBody');
        siteTableBody.innerHTML = '';

        for (const site of data) {
            const status = await checkSiteStatus(site.url);
            const statusClass = status === 'Online' ? 'status-green' : status === 'Lento' ? 'status-yellow' : 'status-red';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td id="tabela-site">${site.url}</td>
                <td id="tabela-status">
                    <span class="status-dot ${statusClass}"></span>
                    ${status}
                </td>
            `;
            siteTableBody.appendChild(row);

            if (status === 'Offline') {
                sendTelegramMessage(`ALERTA: O site ${site.url} está inacessível ou fora do ar!`);
            } else if (status === 'Lento') {
                sendTelegramMessage(`AVISO: O site ${site.url} está carregando lentamente.`);
            }
        }
    } catch (error) {
        console.error('Erro ao obter status dos sites:', error);
    }
}

// Função assíncrona para adicionar um novo link
async function addLink(event) {
    event.preventDefault();

    const linkInput = document.getElementById('linkInput').value;

    try {
        const response = await fetch('https://monitoramento-sites-api.onrender.com/addLink', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ link: linkInput })
        });

        if (response.ok) {
            document.getElementById('linkInput').value = '';
            alert('Link cadastrado com sucesso!');
            fetchSitesStatus();
        } else {
            console.error('Erro ao adicionar link:', response.statusText);
            alert('Erro ao adicionar o link. Tente novamente.');
        }
    } catch (error) {
        console.error('Erro ao adicionar link:', error);
        alert('Erro ao adicionar o link. Tente novamente.');
    }
}

// Adiciona um listener para o evento de submit do formulário
document.getElementById('addLinkForm').addEventListener('submit', addLink);

// Executa a função fetchSitesStatus imediatamente ao carregar a página
fetchSitesStatus();

// Intervalo para verificar o status dos sites (em milissegundos)
const intervalMillis = 60000; // 1 minuto

// Verifica o status dos sites com o intervalo de 1 minuto
setInterval(fetchSitesStatus, intervalMillis);
