# Compasso

Planejador pessoal para tarefas de longo prazo: defina uma dedicação semanal, distribua o tempo e acompanhe sessões de foco. Interface em português, com calendário de círculos proporcionais ao tempo.

## Abrir no VSCode

1. Extraia a pasta `compasso` do ZIP.
2. Abra a pasta no VSCode (`Arquivo > Abrir Pasta`).
3. Com Node.js 20 ou superior instalado, abra o terminal integrado e execute:

```bash
npm run dev
```

4. Abra **http://localhost:5173** no navegador.

**Não precisa executar `npm install`**: não há dependências externas. A aplicação também funciona com um servidor estático apontando para `dist`, como o Live Server do VSCode. Use um servidor; não abra o HTML diretamente por `file://`, pois ele utiliza módulos JavaScript.

Para parar o servidor, use `Ctrl+C` no terminal. Abra sempre o mesmo endereço para acessar os mesmos dados. `localhost`, `127.0.0.1`, uma porta diferente e um endereço publicado possuem armazenamentos distintos.

## Uso

- **Nova tarefa:** informe nome, meta semanal e cor. Adicione, se necessário, um saldo histórico anterior, sem data.
- **Automática:** pesos padrão `1, 1, 1, 1, 1, 2.5, 2.5`, de segunda a domingo. É possível editar os pesos; zero deixa um dia livre.
- **Horas fixas:** defina as horas de cada dia. A soma deve coincidir com a meta semanal. Nesse modo, dias perdidos não são redistribuídos.
- **Focar:** abre o cronômetro da tarefa. Há controles para pausar/continuar, reiniciar, descartar e terminar. É possível voltar ao painel mantendo a sessão ativa.
- **Terminar sessão:** salva o tempo, atualiza o saldo diário e semanal e incrementa o histórico. Pausar, reiniciar e descartar não registram tempo.
- **Editar dados:** ativa a edição geral. Os controles de correção de registros ficam disponíveis somente nesse modo. Nas tarefas, ajuste metas, distribuição, nome, cor e saldo histórico anterior. No calendário, clique no dia para adicionar, editar ou excluir registros. Os totais são derivados desses registros, evitando valores contraditórios.
- **Calendário:** mostra o tempo efetivamente registrado por data, incluindo tarefas arquivadas. Clique em um dia para consultar durações exatas.
- **Seu ritmo:** cada dia compara duas barras na mesma escala: planejado (P, hachurado) e feito (F, sólido). Hoje, a barra hachurada mostra o restante (R): cada faixa diminui conforme você dedica tempo à tarefa, inclusive durante uma sessão em andamento, até chegar a zero. A escala usa a meta inteira para manter a redução visível. A prévia acompanha as pausas e volta ao saldo salvo se a sessão for descartada ou reiniciada; o feito só aumenta ao salvar a sessão. Cada faixa usa a cor da tarefa e sua altura é proporcional ao tempo. A legenda identifica as tarefas; clique no dia para comparar os tempos de cada uma. O realizado pode ultrapassar a meta. Dias passados mostram apenas o feito, pois metas anteriores não são armazenadas. O gráfico considera as tarefas ativas.
- **Tema escuro:** use o botão com ícone de lua/sol na barra lateral. A preferência fica salva neste navegador, separada das tarefas e dos backups, e também se aplica ao calendário, aos diálogos e ao cronômetro.
- **Arquivar:** retira a tarefa do planejamento sem apagar o histórico. Para reativar, habilite a edição e clique em `Ver arquivadas`.
- **Exportar / restaurar backup:** transporta os dados em JSON. A restauração substitui os dados e tenta baixar uma cópia dos dados anteriores antes de salvar.

## Como o planejamento funciona

A semana começa na segunda-feira e termina no domingo, segundo o fuso horário do dispositivo. Uma meta de 10 horas numa semana completa equivale a 1 hora em cada dia útil e 2h30 no sábado e no domingo.

No modo automático, para a data de hoje:

```text
saldo no início do dia = max(0, meta semanal − tempo dos dias anteriores da semana)
meta de hoje = saldo no início do dia × peso de hoje / soma dos pesos de hoje até domingo
falta hoje = max(0, meta de hoje − tempo já registrado hoje)
```

O saldo diário também é limitado ao que falta na semana. A meta inicial do dia permanece estável enquanto as sessões são concluídas; não se recalcula uma fração menor do saldo a cada sessão. Se você trabalhar além da meta diária, o excesso reduz proporcionalmente o planejamento futuro. No dia seguinte, qualquer saldo não cumprido volta a ser distribuído pelos dias restantes. No domingo, todo o saldo fica para domingo, se seu peso for positivo.

Uma tarefa criada no meio da semana distribui a meta pelos dias ainda disponíveis. Se não houver nenhum peso positivo entre hoje e domingo, um aviso pede que você ajuste a distribuição; o sistema não inventa um dia disponível. Na segunda seguinte, a meta se renova sem acumular dívida. Metas podem ser ultrapassadas; os saldos nunca ficam negativos e o histórico mantém todo o tempo.

## Cronômetro e persistência

- Dados armazenados em `localStorage`, sob a chave `compasso-data-v1`. Sem conta, servidor de dados, telemetria ou conexões externas.
- Uma sessão ativa por vez. A sessão, o início do intervalo e os intervalos pausados são persistidos.
- O cronômetro usa timestamps e continua com a página fechada ou o dispositivo suspenso. **Pause antes de uma interrupção.** Ao retornar, você pode corrigir qualquer tempo excedente no calendário, depois de terminar a sessão.
- Pausas não entram na contagem. Intervalos que atravessam a meia-noite são separados por data local; isso também resolve viradas de semana e horário de verão.
- Alterações são propagadas entre abas do mesmo navegador via evento `storage`. Cada gravação relê os dados atuais. Evite editar simultaneamente em várias janelas: não há transações de banco de dados nem controle distribuído de concorrência.
- Backups preservam o tempo contado até a exportação. Sessões restauradas ficam pausadas.
- Se dados inválidos forem encontrados, o aplicativo bloqueia gravações e permite baixar os dados originais, em vez de sobrescrevê-los silenciosamente.
- O saldo histórico anterior não tem data e, portanto, não aparece no calendário nem conta na semana. Registros datados contam em todos os totais correspondentes.

**Faça backups regulares.** Limpar dados do navegador, usar uma janela anônima, trocar de navegador ou trocar de endereço não preserva automaticamente o histórico. Não há sincronização entre dispositivos nem integração com Trello e Google Calendar nesta versão.

## Círculos do calendário

Para cada dia, o tempo é agregado por tarefa. As cores acompanham as cores atuais das tarefas. Todos os círculos da grade mensal usam a mesma escala:

```text
diâmetro = 32 px × raiz(tempo da tarefa no dia / maior tempo de referência)
referência = máximo de 1 hora e dos tempos por tarefa/dia na grade
```

Logo, a **área** é proporcional ao tempo; 2 horas ocupam o dobro da área de 1 hora. A escala pode mudar ao navegar entre meses. Círculos muito pequenos preservam a proporção; durações exatas continuam disponíveis no detalhe do dia.

## Estrutura e desenvolvimento

| Arquivo | Responsabilidade |
| --- | --- |
| `dist/index.html` | Documento, metadados e carregamento |
| `dist/styles.css` | Tema, componentes e layout responsivo |
| `dist/core.js` | Datas, distribuição, totais, sessões e validação |
| `dist/app.js` | Interface, formulários, persistência e backup |
| `server.mjs` | Servidor estático local, usando apenas Node |
| `tests/core.test.mjs` | Testes das regras de negócio |

`dist` contém o código-fonte estático, e deve ser incluído no Git. Não há compilação. A interface não usa bibliotecas ou fontes remotas. O navegador utiliza a fonte local disponível entre Inter, Segoe UI e Arial.

```bash
npm test       # testes das regras de negócio
npm run check  # verificação de sintaxe
```

O código inclui uma consulta somente de leitura ao planejamento para navegadores com suporte experimental a WebMCP. O funcionamento normal não depende dessa API.

## Enviar ao GitHub

Crie um repositório vazio na sua conta. No terminal do VSCode, dentro desta pasta:

```bash
git init
git add .
git commit -m "Adiciona planejador pessoal Compasso"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

Substitua `URL_DO_SEU_REPOSITORIO` pela URL do repositório criado. Alternativamente, use `Publish to GitHub` no painel de controle de código-fonte do VSCode. Nenhuma credencial ou dado pessoal é incluído na pasta. Os registros do aplicativo ficam no navegador, não no repositório.

Para hospedar futuramente, publique o conteúdo da pasta `dist` num serviço de hospedagem estática com HTTPS. Exporte um backup antes de mudar o endereço e restaure-o no novo endereço.

## Design

Direção visual: superfícies claras, verde escuro, bordas discretas e cores reservadas às tarefas. Referência de hierarquia visual e redução de ruído: [A calmer interface for a product in motion, Linear](https://linear.app/now/behind-the-latest-design-refresh). O desenho e a implementação são próprios.

## Verificação

13 testes automatizados cobrem distribuição padrão e personalizada, saldos, excesso diário, virada de semana/ano, registros inválidos, divisão à meia-noite, pausa e persistência da sessão. O fluxo de criação, foco, pausa, recarregamento e conclusão também foi exercitado no navegador durante a implementação.
