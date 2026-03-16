# @risleylima/escpos

[![npm version](https://img.shields.io/npm/v/@risleylima/escpos.svg)](https://www.npmjs.com/package/@risleylima/escpos)
[![Node.js](https://img.shields.io/node/v/@risleylima/escpos.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-239%20passed-brightgreen.svg)]()

**🇺🇸 Read in English:** [README.md](./README.md)

**A biblioteca definitiva de impressão térmica para Node.js.** — Robustez industrial, desempenho O(n) e arquitetura totalmente agnóstica.

## 🚀 Por que escolher esta biblioteca?

Esta biblioteca foi pensada para eliminar gargalos comuns em implementações tradicionais de impressão térmica. Foco em confiabilidade, desempenho e arquitetura limpa.

### Vantagens técnicas

| Recurso | Nossa abordagem moderna | Padrões legados comuns |
| :--- | :--- | :--- |
| **Eficiência de buffer** | **O(n)** (acúmulo inteligente em chunks) | O(n²) (concatenação recursiva) |
| **Event loop** | **Protegido** (processamento assíncrono de pixels) | Bloqueado (processamento síncrono) |
| **Gerenciamento de estado** | **Instanciável** (suporte a múltiplas impressoras) | Singletons (limites de estado global) |
| **Suporte a protocolo** | **GS ( k** nativo (QR moderno) | Comandos legados ESC Z |
| **Conectividade** | **Totalmente agnóstica** (baseada em interface) | Acoplada a um IO específico |

---

## 🛠️ Pilares da arquitetura

1. **Transporte agnóstico (IO):** O núcleo da impressora comunica-se por meio da abstração `AdapterLike`. Use USB, Serial ou Rede de forma intercambiável.
2. **Modelo agnóstico (Perfis):** Trate "quircs" específicos de fabricantes (Epson, Elgin, Bematech, Custom) via um sistema robusto de perfis.
3. **Confiabilidade industrial:** Mecanismos de `drain` (com timeouts), chunking e IO serializado para garantir zero perda de dados sob carga.

---

## 📦 Instalação

```bash
npm install @risleylima/escpos
```

---

## 🧰 Ambiente de desenvolvimento

Para contribuir ou compilar a partir do código-fonte:

```bash
yarn install
yarn build
yarn test
```

---

## ⚡ Início rápido

### Rede (TCP RAW)

```javascript
import { Network, Printer } from '@risleylima/escpos';

const adapter = new Network();
await adapter.connect('10.1.1.50', 9100);
await adapter.open();

const printer = new Printer(adapter);
printer.textln('Olá mundo na rede').cut();

await printer.flush();
await adapter.close();
```

### Serial (RS232)

```javascript
import { Serial, Printer } from '@risleylima/escpos';

const adapter = new Serial();
// baudRate é opcional; se omitido, 9600 é usado.
await adapter.connect('/dev/ttyUSB0', { baudRate: 115200 });
await adapter.open();

const printer = new Printer(adapter);
printer.textln('Olá mundo serial').cut();

await printer.flush();
await adapter.close();
```

*No Windows: use caminhos como `COM1`, `COM2`, etc.*

### USB direto

```javascript
import { USB, Printer } from '@risleylima/escpos';

const adapter = new USB();
await adapter.connect(0x04b8, 0x0202); // VID, PID
await adapter.open();

const printer = new Printer(adapter);
printer.textln('Olá mundo USB').cut();

await printer.flush();
await adapter.close();
```

### Documentação completa de comandos

- Referência método a método: [docs/pt-BR/architecture/COMMANDS_API.md](./docs/pt-BR/architecture/COMMANDS_API.md)
- Padrões práticos de uso: [docs/pt-BR/architecture/COMMANDS_RECIPES.md](./docs/pt-BR/architecture/COMMANDS_RECIPES.md)
- Índice da documentação técnica: [docs/pt-BR/README.md](./docs/pt-BR/README.md)

---

## 🔳 Estratégias de QR Code

`printer.qrcode(...)` suporta três estratégias para compatibilidade com qualquer impressora:

- `native`: Envia comandos nativos `GS ( k`. Rápido e nítido.
- `raster`: Gera máscara de bits em memória e imprime como imagem. Funciona em *qualquer* impressora com suporte a gráficos.
- `auto`: Usa a configuração do perfil para escolher o melhor caminho (ex.: Bematech usa raster por padrão para confiabilidade).

```javascript
printer.qrcode('https://google.com', {
  size: 6,
  level: 'M',
  strategy: 'raster',
  position: 'center'
});
```

Para QR raster, `position` usa alinhamento padrão (`ESC a`). Em alguns firmwares genéricos o alinhamento pode ser aproximado; use `offsetCols` (em colunas de caractere) para ajustar o posicionamento horizontal.

---

## 🖼️ Processamento de imagens

- **Formatos suportados:** PNG (Adam7/Indexed/Gray/RGB), BMP (1/4/8/24-bit), JPEG, GIF e **SVG**.
- **Não bloqueante:** Processamento pesado cede ao Event Loop, mantendo o servidor responsivo.
- **Excelência em SVG:** Flattening automático de transparência sobre fundo branco.

```javascript
import { Image } from '@risleylima/escpos';
const image = await Image.load('./logo.svg');
printer.raster(image); 
```

---

## 🛟 API de recuperação

Tratamento de erros confiável para ambientes de produção:

```javascript
// Recuperar transporte + baseline da impressora
const result = await printer.recover({ checkStatus: true });

// Se a recuperação precisou limpar o buffer, os dados são retornados para log/retry
if (result.discardedBuffer) {
  console.log('Dados não impressos:', result.discardedBuffer.length, 'bytes');
}
```

---

## 🖨️ Suporte a perfis

- **'default'**: ESC/POS padrão.
- **'custom-vkp80iii'**: Custom VKP80III (fluxo especial de ejetar/cortar).
- **'bematech-mp4200th'**: Otimizado para o padrão do mercado brasileiro.

Registre o seu próprio:

```javascript
import { registerProfile } from '@risleylima/escpos';
registerProfile({ id: 'meu-modelo', name: 'Meu Modelo', defaultPaperWidth: 42 });
```

---

## ✅ Confiabilidade

- **239+ testes unitários e de integração.**
- **TypeScript Strict:** Segurança de tipos para todo o conjunto de comandos.
- **Validado por especificações:** Alinhado aos manuais oficiais Epson e dos fabricantes.
- **Flush transacional:** Em falha de escrita, o buffer é preservado para retry ou log; chame `printer.recover()` após erros de transporte antes de retomar impressões.

---

**Feito com ❤️ para sistemas de missão crítica.**
