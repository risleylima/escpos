# Documentação Técnica do Projeto escpos (pt-BR)

Este diretório contém a documentação técnica em **português brasileiro** para facilitar o acesso de desenvolvedores brasileiros à biblioteca.

---

## 🇧🇷 Documentação em Português

### Destaques recentes
- Fluxo de QR Code alinhado às funções canônicas ESC/POS `GS ( k`.
- `flush()` transacional com preservação do payload em falhas de escrita do adapter.
- I/O serializado de impressora para operações críticas.
- Suporte a isolamento de registro de perfis (`createProfileRegistry(...)`) para cenários multi-tenant.
- Fluxo de recuperação de transporte + impressora (`recover()`) com gancho de reset de baseline por perfil.

### 1. [API de Comandos da Impressora](./architecture/COMMANDS_API.md) *(pt-BR)*
Referência completa da abstração de comandos de alto nível do `Printer`, incluindo assinaturas de métodos, valores aceitos, padrões e comportamento de confiabilidade.

### 2. [Receitas de Comandos](./architecture/COMMANDS_RECIPES.md) *(pt-BR)*
Padrões práticos copy-paste para fluxos comuns de cupons (layout, QR/código de barras, imagens, recuperação e apresentação por perfil).

### 3. [Arquitetura e Design](../architecture/ARCHITECTURE.md) *(em inglês)*
Decisões sobre padrões SOLID, desempenho do `SpecBuffer` e gerenciamento de memória.

### 4. [Implementação do Protocolo](../architecture/PROTOCOL_IMPLEMENTATION.md) *(em inglês)*
Referência detalhada para comandos ESC/POS, automação de codepage, imagens e códigos de barras.

### 5. [Guia do Perfil VKP80III](../architecture/VKP80III_PROFILE.md) *(em inglês)*
Mapeamento específico para CUSTOM VKP80III, incluindo opções de apresentação de ticket de alto nível.

### 6. [Guia do Perfil Bematech MP-4200 TH](../architecture/BEMATECH_MP4200TH_PROFILE.md) *(em inglês)*
Linha base de perfil para Bematech MP-4200 TH no modo ESC/POS.

### 7. [Contrato de Perfil Padrão](../architecture/PROFILE_CONTRACT.md) *(em inglês)*
Contrato genérico de extensão para adicionar e validar novos perfis de impressora.

### 8. [Especificações de Hardware (manuais PDF)](../specs/)
Arquivos originais dos fabricantes (Epson, Custom, etc.) usados para validar a implementação.

### 9. [Roadmap de Funcionalidades](../architecture/FEATURES_ROADMAP.md) *(em inglês)*
Planejamento futuro e funcionalidades pendentes.

### 10. [Regras de Versionamento](../architecture/VERSIONING.md) *(em inglês)*
Políticas de Semantic Versioning (SemVer) aplicadas ao projeto.

---

## Links rápidos

| Documento | pt-BR | English |
|-----------|-------|---------|
| API de Comandos | [COMMANDS_API.md](./architecture/COMMANDS_API.md) | [original](../architecture/COMMANDS_API.md) |
| Receitas | [COMMANDS_RECIPES.md](./architecture/COMMANDS_RECIPES.md) | [original](../architecture/COMMANDS_RECIPES.md) |
| README do projeto | [README.pt-BR.md](../../README.pt-BR.md) | [README.md](../../README.md) |

---

**Nota:** Para documentação de uso (instalação e exemplos), consulte o [README.pt-BR.md](../../README.pt-BR.md) na raiz do projeto.
