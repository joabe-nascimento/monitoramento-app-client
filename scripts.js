// script.js

const ALERT_DELAY_10_MINUTES = 10 * 60 * 1000; // 10 minutos em milissegundos
const ALERT_DELAY_30_MINUTES = 30 * 60 * 1000; // 30 minutos em milissegundos
const OSCILLATION_TIME_FRAME = 5 * 60 * 1000; // 5 minutos em milissegundos para detectar oscilação
const siteStatusTimes = {}; // Armazena os tempos de inatividade dos sites

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

async function fetchSitesStatus() {
    try {
        const response = await fetch('https://monitoramento-sites-api.onrender.com/checkSites');
        const data = await response.json();

        const siteTableBody = document.getElementById('siteTableBody');
        siteTableBody.innerHTML = '';

        for (const site of data) {
            const status = await checkSiteStatus(site.url);
            let statusClass = '';

            const now = Date.now();
            const previousStatusData = siteStatusTimes[site.url];

            if (previousStatusData) {
                const previousStatus = previousStatusData.status;

                if (status !== previousStatus) {
                    // Se o status mudar dentro da janela de oscilação, marca como "Oscilando"
                    if (now - previousStatusData.time <= OSCILLATION_TIME_FRAME) {
                        statusClass = 'status-yellow'; // Oscilando
                        siteStatusTimes[site.url] = { status: 'Oscilando', time: now };
                    } else {
                        // Se não estiver oscilando, atualiza o status e o tempo
                        statusClass = status === 'Online' ? 'status-green' : status === 'Offline' ? 'status-red' : 'status-yellow';
                        siteStatusTimes[site.url] = { status: status, time: now };
                    }
                } else {
                    // Mantém o status e a cor
                    statusClass = previousStatus === 'Online' ? 'status-green' : previousStatus === 'Offline' ? 'status-red' : 'status-yellow';
                }
            } else {
                // Se não houver status anterior, define o atual
                statusClass = status === 'Online' ? 'status-green' : status === 'Offline' ? 'status-red' : 'status-yellow';
                siteStatusTimes[site.url] = { status: status, time: now };
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${site.url}</td>
                <td>
                    <span class="status-dot ${statusClass}"></span>
                    ${statusClass === 'status-yellow' ? 'Oscilando' : status}
                </td>
            `;
            siteTableBody.appendChild(row);

            if (status === 'Offline' || status === 'Lento') {
                if (now - siteStatusTimes[site.url].time >= ALERT_DELAY_30_MINUTES) {
                    sendTelegramMessage(`ALERTA CRÍTICO: O site ${site.url} está inacessível ou fora do ar há mais de 30 minutos!`);
                    siteStatusTimes[site.url].time = now;
                } else if (now - siteStatusTimes[site.url].time >= ALERT_DELAY_10_MINUTES) {
                    sendTelegramMessage(`AVISO: O site ${site.url} está inacessível ou fora do ar há mais de 10 minutos.`);
                    siteStatusTimes[site.url].time = now;
                }
            } else {
                // Remove o tempo de inatividade se o site estiver online
                if (status === 'Online') {
                    delete siteStatusTimes[site.url];
                }
            }
        }
    } catch (error) {
        console.error('Erro ao obter status dos sites:', error);
    }
}

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
