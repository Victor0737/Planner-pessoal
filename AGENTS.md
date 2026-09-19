# Manutenção do Compasso

- Aplicação estática sem dependências: `dist/app.js` (interface), `dist/core.js` (regras), `dist/styles.css` (tema). `npm run dev` serve `dist`.
- Leia apenas os arquivos relevantes para a alteração. Faça buscas direcionadas com `rg`; evite varrer o projeto e adicionar frameworks ou dependências para mudanças simples.
- UI em português. Preserve navegação por teclado, foco dos diálogos e layout responsivo.
- Não adicione dados fictícios ao estado inicial nem telemetria/conexões externas.
- Semana segunda–domingo e datas civis locais. Não use UTC para chaves de calendário.
- Modo automático: meta de hoje usa saldo ANTES de hoje. Sessões subtraem o realizado; excesso reduz dias futuros. Não redivida o saldo após cada sessão, pois isso cria meta móvel.
- Tempos em segundos, incluindo frações. Totais derivam das entradas datadas mais saldo histórico anterior. Todos os ajustes de dados existentes exigem modo de edição.
- Círculos: diâmetro proporcional à raiz do tempo, usando escala comum a todo o mês.
- `localStorage` deve preservar sessão ativa, backup e dados existentes. Mudanças no esquema exigem migração e testes.
- Faça `npm test` após alterar as regras. `npm run check` valida sintaxe. Não repita verificações sem motivo concreto.
- Nunca commite backups pessoais, credenciais ou dados do navegador. `dist` é fonte e deve ser versionado.
