const ALERT_DELAY_10_MINUTES = 10 * 60 * 1000;
const ALERT_DELAY_30_MINUTES = 30 * 60 * 1000;
const OSCILLATION_TIME_FRAME = 5 * 60 * 1000;
const siteStatusTimes = {};

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
    const timeout = 5000;
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
                    if (now - previousStatusData.time <= OSCILLATION_TIME_FRAME) {
                        statusClass = 'status-yellow';
                        siteStatusTimes[site.url] = { status: 'Oscilando', time: now };
                    } else {
                        statusClass = status === 'Online' ? 'status-green' : status === 'Offline' ? 'status-red' : 'status-yellow';
                        siteStatusTimes[site.url] = { status: status, time: now };
                    }
                } else {
                    statusClass = previousStatus === 'Online' ? 'status-green' : previousStatus === 'Offline' ? 'status-red' : 'status-yellow';
                }
            } else {
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

document.getElementById('addLinkForm').addEventListener('submit', addLink);

fetchSitesStatus();

const intervalMillis = 60000;
setInterval(fetchSitesStatus, intervalMillis);
