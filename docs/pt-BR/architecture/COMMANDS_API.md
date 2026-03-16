# API de Comandos da Impressora ( abstração de alto nível ESC/POS)

Este documento é a referência prática para a abstração de comandos da classe `Printer`.
Foca em **como chamar cada método**, valores aceitos, padrões e comportamento esperado.

---

## 1) Modelo de operação

- `Printer` é um construtor de comandos em buffer.
- A maioria dos métodos retorna `this` e apenas adiciona bytes ao buffer interno.
- Os dados são efetivamente enviados ao dispositivo apenas em `await printer.flush()` (ou `await printer.close()`).

Fluxo básico:

```ts
import { Network, Printer } from '@risleylima/escpos';

const adapter = new Network();
await adapter.connect('10.102.224.60', 2000);
await adapter.open();

const printer = new Printer(adapter, { profile: 'default', width: 80 });
printer.textln('Olá').cut();
await printer.flush();
await adapter.close();
```

---

## 2) Construtor e opções

```ts
new Printer(adapter, options?)
```

### `PrinterOptions`

- `encoding?: string` codificação de texto padrão (padrão: `utf8`)
- `width?: number` largura de linha em caracteres (software)
- `profile?: string | PrinterProfile` id do perfil (ex.: `default`, `custom-vkp80iii`, `bematech-mp4200th`) ou objeto de perfil customizado
- `ticketPresentation?: TicketPresentationOptions` opções padrão passadas aos hooks de apresentação do perfil
- `profileRegistry?: ProfileRegistry` registro isolado para multi-tenant/isolamento em runtime
- `maxBufferSize?: number` bytes máximos em buffer antes de erro de overflow (padrão: 10MB)

Observações:

- Se `profile` for string e não puder ser resolvido, o construtor lança erro.
- Largura padrão: `options.width ?? profile.defaultPaperWidth ?? 80`.

---

## 3) Comandos de texto e layout

### Primitivas de impressão

| Método | Propósito |
|---|---|
| `print(content: string \| Buffer)` | Adiciona conteúdo como está (string usa ASCII) |
| `println(content: string \| Buffer)` | Igual a `print` mais quebra de linha |
| `newLine()` | Adiciona uma quebra de linha |
| `text(content: string, encoding?: string)` | Texto codificado com suporte a auto-troca de codepage do perfil |
| `textln(content: string, encoding?: string)` | `text` mais quebra de linha |

Codificação: os encodings nativos do Node (`utf8`, `ascii`, `latin1`, etc.) são usados quando suportados; outros (ex.: `cp850`, `cp860`) são convertidos via **iconv-lite** para que texto como "Paraná" imprima corretamente quando o perfil mapeia essa codificação ao codepage da impressora.

### Ajudantes de alinhamento

| Método | Valores aceitos |
|---|---|
| `align(align: string)` | `lt`, `ct`, `rt` (case-insensitive) |
| `center(content, encoding?)` | Centraliza temporariamente, depois volta à esquerda |
| `centerln(content, encoding?)` | Igual a `center` com quebra de linha |
| `right(content, encoding?)` | Alinha à direita temporariamente, depois volta à esquerda |
| `rightln(content, encoding?)` | Igual a `right` com quebra de linha |

### Fonte e estilo

| Método | Valores aceitos / comportamento |
|---|---|
| `font(family: string)` | `A`, `B`, `C` |
| `style(type: string)` | `B`, `I`, `U`, `U2`, `BI`, `BIU`, `BIU2`, `BU`, `BU2`, `IU`, `IU2`, `NORMAL` |
| `size(width: number, height: number)` | Escala do caractere de 1..8 (internamente limitado) |
| `spacing(n?: number \| null)` | Espaçamento entre caracteres (`0..255`); undefined/null restaura padrão |
| `lineSpace(n?: number \| null)` | Espaçamento entre linhas (`0..255`); undefined/null restaura padrão |

Importante:

- Texto em negrito usa `style('b')`.
- Para voltar ao estilo normal, use `style('normal')`.
- `font()` atualiza heurística interna de `width` (`A` => largura base, `B/C` => estimativa maior).

### Tabela e ajudantes de cupom

| Método | Propósito |
|---|---|
| `drawLine(character = '-')` | Desenha linha com largura total e quebra de linha |
| `section(title, encoding?)` | Separador + título centralizado + separador |
| `row(columns, encoding?)` | Formatador de linha com largura fixa |
| `tableCustom(columns, encoding?)` | Alias de `row`; suporta larguras decimais (`0.5` = 50%) |
| `lineItem(desc, price, optionsOrEncoding?, encoding?)` | Linha típica de item em 2 colunas |
| `lineItemWithQty(desc, qty, price, optionsOrEncoding?, encoding?)` | Linha típica em 3 colunas |
| `total(label, value, optionsOrEncoding?, encoding?)` | Linha de total (negrito por padrão). Opções: `{ bold?: boolean }`. |

Formato da coluna em `row`:

```ts
type RowColumn = {
  text: string;
  width: number;
  align?: 'left' | 'right' | 'center';
};
```

Opções de `lineItem`/`lineItemWithQty`:

```ts
type LineItemOptions = {
  descWidth?: number;
  priceWidth?: number;
  qtyWidth?: number;
};
```

---

## 4) Papel, avanço e hardware

| Método | Propósito |
|---|---|
| `feed(n = 1)` | Escreve `n` avanços de linha (`0..255`) |
| `feedLines(n)` | Usa comando de avanço ESC/POS (`0..255`) |
| `control(ctrl)` | Sequência de controle: `LF`, `GLF`, `FF`, `CR`, `HT`, `VT` |
| `cut(part = true, feed = 3)` | Avanço + corte parcial/total + comando opcional de apresentação do perfil |
| `presentTicket(options?)` | Fluxo de apresentador controlado por perfil (fallback para `cut`) |
| `paperWidth(width)` | Atualiza largura em software e envia comando de largura do perfil quando disponível |
| `margin(type, size)` | `LEFT`, `RIGHT`, `BOTTOM` |
| `marginBottomCancel()` | Cancela margem inferior |
| `hardware(hw)` | `INIT`, `SELECT`, `RESET` |
| `beep(n = 1, t = 1)` | Comando de buzzer |
| `cashdraw(pin = 2)` | Pulso na gaveta no pino `2` ou `5` |

### Apresentação de cupom (`presentTicket`)

```ts
printer.presentTicket({
  feed: 4,
  part: true,
  // mais campos de apresentação específicos do modelo tratados pelos hooks do perfil
});
```

Se o perfil não implementar os hooks de apresentação, `presentTicket()` degrada graciosamente para `cut()`.

---

## 5) Gráficos e imagens

| Método | Propósito |
|---|---|
| `image(image, density = 'd24')` | Caminho bit-image legado (`s8`, `d8`, `s24`, `d24`) |
| `raster(image, mode = 'normal')` | Caminho raster (`normal`, `dw`, `dh`, `dwdh`) |

`image`/`raster` exigem uma instância de `Image`:

```ts
import { Image } from '@risleylima/escpos';
const logo = await Image.load('./assets/logo.png');
printer.raster(logo, 'normal');
```

---

## 6) Código de barras e códigos 2D

### `barcode(code, type = 'EAN13', options?)`

Valores suportados para `type`:

- `UPC-A`, `UPC-E`, `EAN13`, `EAN8`, `CODE39`, `ITF`, `NW7`, `CODABAR`, `CODE93`, `CODE128`, `CODE32`

`BarcodeOptions`:

```ts
type BarcodeOptions = {
  width?: number;       // 1..5
  height?: number;      // 1..255
  position?: string;    // off | abv | blw | bth
  font?: string;        // A | B
  includeParity?: boolean; // padrão true para casos de paridade automática EAN8/EAN13
};
```

Observações de validação:

- `EAN13` exige 12 ou 13 dígitos.
- `EAN8` exige 7 ou 8 dígitos.
- `CODE32` (farmácias italianas) exige 8 ou 9 dígitos numéricos.
- `CODABAR` usa o mesmo opcode ESC/POS que `NW7`.
- `CODE93` e `CODE128` usam formato GS k 2 neste driver (com prefixo de comprimento, sem `NUL` final).
- `CODE128` exige seletor de conjunto de códigos (`{A`, `{B`, `{C`); quando omitido, o driver adiciona automaticamente `{B`.
- Dígito de paridade é calculado automaticamente quando aplicável e `includeParity !== false`.

### `qrcode(code, options?)`

`QrCodeOptions`:

```ts
type QrCodeOptions = {
  model?: number; // padrão 2 para nativo
  size?: number;  // tamanho do módulo
  level?: 'L' | 'M' | 'Q' | 'H';
  strategy?: 'native' | 'raster' | 'auto';
  position?: 'left' | 'center' | 'right'; // apenas raster
  offsetCols?: number; // apenas raster, calibração horizontal em colunas
};
```

Comportamento da estratégia:

- `native`: envia fluxo ESC/POS `GS ( k`.
- `raster`: renderiza matriz QR em memória e envia como imagem raster.
- `auto`: usa preferência e dicas de capacidade do perfil.

### `code2d(code, type = 'QR', level?)`

Fluxo 2D legado (`ESC Z` / `GS Z`) para compatibilidade:

- `type`: `PDF417` | `DATAMATRIX` | `QR`
- `level`: `L` | `M` | `Q` | `H` (nível QR quando aplicável)

Prefira `qrcode(...)` para QR moderno quando possível.

---

## 7) Cor, reverso e acesso raw

| Método | Propósito |
|---|---|
| `color(0 \| 1)` | Seleciona canal de cor |
| `setReverseColors(bool)` | Reverso on/off (`GS B`) |
| `setReverseColorsAlt(bool)` | Par alternativo de comando de reverso |
| `raw(data: Buffer \| string)` | Envia bytes brutos diretamente (`string` deve ser hex de comprimento par) |
| `setCharacterCodeTable(codeTable)` | Envia `ESC t n` diretamente |
| `encode(encoding)` | Altera codificação de texto padrão para chamadas futuras de `text/textln` |

Use `raw(...)` apenas quando precisar de controle em nível de comando não exposto pela API de alto nível.

---

## 8) Comandos de I/O e confiabilidade

| Método | Retorno | Notas |
|---|---|---|
| `flush()` | `Promise<this>` | Envia buffer atual. Em falha de escrita, o payload é recolocado no buffer (comportamento transacional). |
| `close(options?)` | `Promise<this>` | Envia buffer pendente e fecha o adapter. `options`: `{ timeout?: number }`. |
| `getStatus(type?)` | `Promise<Buffer>` | Lê status em tempo real (`PRINTER`, `OFFLINE`, `ERROR`, `PAPER`). Requer adapter com suporte a leitura (Network/Serial sempre; USB apenas quando o dispositivo tiver endpoint IN). |
| `recover(options?)` | `Promise<RecoverResult>` | Recuperação do adapter + reset de baseline da impressora/perfil. |

`RecoverOptions`:

```ts
type RecoverOptions = {
  transport?: boolean; // padrão true
  checkStatus?: boolean; // padrão false
  settleMs?: number; // padrão 120
  keepBuffer?: boolean; // padrão false
};
```

`RecoverResult`:

```ts
type RecoverResult = {
  printer?: Buffer;
  offline?: Buffer;
  error?: Buffer;
  paper?: Buffer;
  discardedBuffer?: Buffer;
};
```

Recomendação para produção:

1. Em falha de transporte/protocolo, chame `await printer.recover(...)`.
2. Inspecione `discardedBuffer` (se houver) para política de retry/log.
3. Tente `flush()` novamente apenas após recuperação bem-sucedida.

---

## 9) Exemplo: cupom completo em alto nível

```ts
printer
  .hardware('init')
  .align('ct')
  .style('b')
  .textln('CAFE NODE & BYTE')
  .style('normal')
  .drawLine()
  .align('lt')
  .lineItem('Café Duplo', 'R$ 7,00')
  .lineItemWithQty('Cookie', 2, 'R$ 8,00')
  .drawLine()
  .total('TOTAL', 'R$ 15,00')
  .newLine()
  .qrcode('https://example.com/order/123', {
    strategy: 'raster',
    size: 6,
    level: 'M',
    position: 'center',
    offsetCols: 0,
  })
  .feed(2)
  .cut();

await printer.flush();
```

---

## 10) Documentos relacionados

- Contrato de extensão de perfis: [`PROFILE_CONTRACT.md`](../../architecture/PROFILE_CONTRACT.md) *(em inglês)*
- Visão geral do protocolo e famílias de comandos: [`PROTOCOL_IMPLEMENTATION.md`](../../architecture/PROTOCOL_IMPLEMENTATION.md) *(em inglês)*
- Notas específicas por modelo:
  - [`VKP80III_PROFILE.md`](../../architecture/VKP80III_PROFILE.md) *(em inglês)*
  - [`BEMATECH_MP4200TH_PROFILE.md`](../../architecture/BEMATECH_MP4200TH_PROFILE.md) *(em inglês)*
