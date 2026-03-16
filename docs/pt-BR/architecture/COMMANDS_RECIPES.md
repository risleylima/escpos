# Receitas de Comandos da Impressora

Este guia fornece padrões copiar-colar para cenários comuns usando a API de alto nível da classe `Printer`.

---

## 1) Cupom mínimo via rede

```ts
import { Network, Printer } from '@risleylima/escpos';

const adapter = new Network();
await adapter.connect('10.102.224.60', 2000);
await adapter.open();

const printer = new Printer(adapter, { profile: 'default', width: 80 });

printer
  .align('ct')
  .style('b')
  .textln('OLÁ')
  .style('normal')
  .feed(2)
  .cut();

await printer.flush();
await adapter.close();
```

---

## 2) Blocos de texto estilizado (negrito, sublinhado, centralizado)

```ts
printer
  .align('ct')
  .style('b')
  .textln('CAFE NODE & BYTE')
  .style('normal')
  .align('lt')
  .style('u')
  .textln('Mesa 07')
  .style('normal')
  .newLine();
```

Valores chave:

- `style('b')` -> negrito ligado
- `style('u')` / `style('u2')` -> modos de sublinhado
- `style('normal')` -> limpa o estilo

---

## 3) Layout de cupom com itens

```ts
printer
  .section('Pedido #A104')
  .lineItemWithQty('Café Duplo', 2, 'R$ 14,00')
  .lineItem('Pão de Queijo', 'R$ 9,00')
  .lineItem('Água Mineral', 'R$ 4,00')
  .drawLine()
  .total('TOTAL', 'R$ 27,00')
  .newLine();
```

---

## 4) Estratégias de QR Code

### QR nativo (mais nítido quando o firmware suporta)

```ts
printer.qrcode('https://example.com/pay/123', {
  strategy: 'native',
  model: 2,
  size: 6,
  level: 'M',
});
```

### QR raster (compatibilidade em primeiro lugar)

```ts
printer.qrcode('https://example.com/pay/123', {
  strategy: 'raster',
  size: 6,
  level: 'M',
  position: 'center',
  offsetCols: 0,
});
```

### QR automático (controlado pelo perfil)

```ts
printer.qrcode('https://example.com/pay/123', {
  strategy: 'auto',
  size: 6,
  level: 'M',
});
```

Quando o alinhamento raster não ficar exato em firmwares genéricos:

- use `position: 'left' | 'center' | 'right'`
- calibre com `offsetCols` (`+` à direita, `-` à esquerda)

---

## 5) Código de barras (EAN13 / CODE128)

```ts
printer.barcode('789123456789', 'EAN13', {
  width: 2,
  height: 90,
  position: 'blw',
  font: 'A',
});

printer.feed(1);

printer.barcode('ORDER-00001234', 'CODE128', {
  width: 2,
  height: 80,
  position: 'off',
});
```

---

## 6) Imagens (logo)

```ts
import { Image } from '@risleylima/escpos';

const logo = await Image.load('./assets/logo.png');

printer
  .align('ct')
  .raster(logo, 'normal')
  .feed(1)   // opcional: algumas impressoras precisam de feed após raster
  .align('lt')
  .newLine();
```

Formatos suportados por `Image.load(...)` incluem PNG (Adam7), BMP, JPEG, GIF e SVG.

### Cabeçalho com logo opcional (evitando quebrar a cadeia)

Se usar ternário para escolher entre logo e texto, mantenha a cadeia em uma única referência `printer` para que `.feed(1)` e comandos posteriores não se percam. Prefira um destes padrões:

```ts
// Opção A: atribua o resultado do branch e depois encadeie
printer
  .encode('cp850')
  .align('ct')
  .textln('Bem vindo ao');

(logoImage ? printer.raster(logoImage) : printer.style('b').textln(' Complexo Paraná Park!').style('normal'))
  .feed(1)
  .align('lt');
// ... resto do cupom
```

```ts
// Opção B: sem ternário no meio; adicione logo ou texto em duas etapas (mais claro)
printer.encode('cp850').align('ct').textln('Bem vindo ao');

if (logoImage) {
  printer.raster(logoImage);
} else {
  printer.style('b').textln(' Complexo Paraná Park!').style('normal');
}
printer.feed(1).align('lt');
// ... resto do cupom
```

Alguns firmwares pausam após um raster grande; adicionar `.feed(1)` (ou até `.feed(2)`) logo após `.raster(logo)` pode ajudar a impressora a aceitar os próximos comandos.

---

## 7) Apresentação de cupom controlada por perfil

```ts
const printer = new Printer(adapter, {
  profile: 'custom-vkp80iii',
  ticketPresentation: { station: 1, mode: 69, distance: 10 },
});

printer
  .textln('ESTACIONAMENTO VALIDADO')
  .presentTicket({ feed: 3, part: true })
  .flush();
```

Para modelos sem suporte a apresentador, `presentTicket(...)` faz fallback para corte normal.

---

## 8) Padrão de flush transacional + recuperação

```ts
try {
  await printer.flush();
} catch (error) {
  const recovery = await printer.recover({ checkStatus: true });
  // Opcional: inspecione recovery.discardedBuffer para política de retry/log.
  throw error;
}
```

Por que esse padrão:

- `flush()` preserva o payload em falha de escrita recolocando-o no buffer.
- `recover()` restabelece o transporte e a baseline da impressora antes do próximo envio.

---

## 9) Injeção avançada de comandos raw

```ts
// String hex (deve ter comprimento par e hex válido)
printer.raw('1b401b6101');

// Ou Buffer explícito
printer.raw(Buffer.from([0x1b, 0x40]));
```

Use `raw()` com moderação, principalmente para diagnóstico ou comandos específicos do firmware ainda não abstraídos.

---

## 10) Sequência recomendada para jobs em produção

1. `connect` + `open` do adapter
2. crie `Printer(adapter, { profile, width, ... })`
3. monte o cupom com a API fluente
4. `await printer.flush()`
5. em erro: `await printer.recover(...)`
6. `await adapter.close()`
