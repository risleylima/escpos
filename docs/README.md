# escpos Project Technical Documentation

This directory contains accumulated knowledge and technical specifications to ensure the industrial-grade reliability of this library.

**🇧🇷 Documentação em português (pt-BR):** [Clique aqui para a versão em português](./pt-BR/README.md)

## Knowledge Structure

### Recent hardening highlights
- QR Code flow aligned to ESC/POS `GS ( k` canonical functions.
- Transactional `flush()` with payload preservation on adapter write failures.
- Serialized printer I/O for critical operations.
- Profile registry isolation support (`createProfileRegistry(...)`) for multi-tenant use cases.
- Transport + printer recovery flow (`recover()`) with profile-specific baseline reset hook.

### 1. [Architecture & Design](./architecture/ARCHITECTURE.md)
Decisions on SOLID patterns, `SpecBuffer` performance, and memory management.

### 2. [Protocol Implementation](./architecture/PROTOCOL_IMPLEMENTATION.md)
Detailed reference for ESC/POS commands, codepage automation, images, and barcodes.

### 3. [VKP80III Profile Guide](./architecture/VKP80III_PROFILE.md)
Model-specific mapping for CUSTOM VKP80III, including high-level ticket presentation options.

### 4. [Bematech MP-4200 TH Profile Guide](./architecture/BEMATECH_MP4200TH_PROFILE.md)
Profile baseline for Bematech MP-4200 TH in ESC/POS mode.

### 5. [Profile Contract Standard](./architecture/PROFILE_CONTRACT.md)
Generic extension contract for adding and validating new printer profiles.

### 6. [Printer Commands API](./architecture/COMMANDS_API.md)
Comprehensive reference for the high-level `Printer` command abstraction, including method signatures, accepted values, defaults, and reliability behavior.

### 7. [Printer Commands Recipes](./architecture/COMMANDS_RECIPES.md)
Practical copy-paste patterns for common ticket flows (layout, QR/barcode, images, recover, and profile-aware presentation).

### 8. [Hardware Specifications (PDF Manuals)](./specs/)
Original manufacturer files (Epson, Custom, etc.) used to validate the implementation.

### 9. [Feature Roadmap](./architecture/FEATURES_ROADMAP.md)
Future planning and pending functionalities.

### 10. [Versioning Rules](./architecture/VERSIONING.md)
Semantic Versioning (SemVer) policies applied to the project.

---

**Note:** For usage documentation (installation and examples), please refer to the `README.md` in the project root.
