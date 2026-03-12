'use strict';

/**
 * Teste de impressão via adapter de rede (TCP RAW) reproduzindo
 * a sequência validada manualmente via netcat para VKP80III.
 *
 * Uso (a partir da raiz do projeto, após npm run build):
 *   node examples/print-network-raw.js
 *   node examples/print-network-raw.js 10.102.224.60 2000
 *
 * Padrão: 10.102.224.60:2000
 */

const { Network, Printer } = require('../dist/index.js');

const HOST = process.argv[2] || '10.102.224.60';
const PORT = parseInt(process.argv[3] || '2000', 10);
const CONNECT_TIMEOUT_MS = 10000;
const WIDTH = 44;
const LINGER_MS = parseInt(process.argv[5] || '1500', 10);

function center(text, width = WIDTH) {
  const raw = String(text);
  const totalPad = Math.max(0, width - raw.length);
  const left = Math.floor(totalPad / 2);
  const right = totalPad - left;
  return `${' '.repeat(left)}${raw}${' '.repeat(right)}`;
}

async function main() {
  const adapter = new Network();
  const printer = new Printer(adapter, {
    encoding: 'ascii',
    width: WIDTH,
    profile: 'custom-vkp80iii',
  });

  const now = new Date();
  const data = now.toLocaleDateString('pt-BR');
  const hora = now.toLocaleTimeString('pt-BR', { hour12: false });
  const ticket = process.argv[4] || '1234567890128';

  console.log(`Conectando em ${HOST}:${PORT} (Network adapter)...`);

  try {
    await adapter.connect({ host: HOST, port: PORT, timeout: CONNECT_TIMEOUT_MS });
    await adapter.open();
    console.log('Conectado. Montando ticket (sequencia homologada)...');
  } catch (err) {
    console.error('Falha ao conectar:', err.message);
    process.exit(1);
  }

  try {
    printer
      .hardware('init')
      .align('ct')
      .text(center('Bem vindo ao'), 'ascii')
      .style('b')
      .text(center('Complexo Parana Park!'), 'ascii')
      .style('normal')
      .newLine()
      .newLine()
      .textln('=================Observacao=================', 'ascii')
      .textln('      VALIDE SEU TICKET PARA SAIR       ', 'ascii')
      .textln('  VERIFIQUE A VALIDACAO DE SEU TICKET   ', 'ascii')
      .textln('============================================', 'ascii')
      .newLine()
      .align('lt')
      .textln(`Data: ${data}    Hora: ${hora}`, 'ascii')
      .textln('Entrada: Totem 01', 'ascii')
      .textln(`Ticket: ${ticket}`, 'ascii')
      .newLine()
      .align('ct')
      .barcode(ticket, 'EAN13', {
        width: 2,
        height: 60,
        font: 'A',
        position: 'blw',
        includeParity: true,
      })
      .feed(4)
      // feed(4) acima replica o fluxo homologado; cut(..., 0) envia apenas FS P no profile custom.
      .cut(true, 0);

    const payload = printer.buffer.flush();
    await adapter.write(payload);
    console.log(`Payload via Printer/Profile enviado (${payload.length} bytes). Aguardando ${LINGER_MS}ms antes de fechar...`);
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, LINGER_MS)));
    console.log('Fechando conexão...');
  } catch (err) {
    console.error('Erro ao enviar:', err.message);
  } finally {
    await adapter.close({ timeout: 5000 });
    console.log('Conexão fechada.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
