# Gestor de Mesas de Bilhar - Guia do Utilizador

## Bem-vindo ao Gestor de Mesas de Bilhar

O Gestor de Mesas de Bilhar é uma solução completa para gerir as operações de uma sala de bilhar. Este guia ajuda-o a compreender e utilizar todas as funcionalidades disponíveis na aplicação.

---

## Introdução

### Aceder à aplicação

Abra o navegador e aceda a `http://localhost:3000` (ou ao endereço do seu servidor).

Na primeira utilização, ser-lhe-á pedido que defina a palavra-passe do administrador local (ou que inicie sessão, se já estiver configurada uma palavra-passe/OIDC). Depois de iniciar sessão, o painel apresenta todas as mesas organizadas por tipo.

### Menu principal

O cabeçalho tem três opções, além do seletor de tema e do botão para terminar sessão:

- **Painel** - Mesas, sessões e pedidos pendentes em tempo real
- **Admin** - Menu, inventário de mesas, subscrições, relatórios e definições
- **Estado público** - Abre o painel de disponibilidade para clientes num novo separador (não é necessário iniciar sessão)
- **Ajuda** - Guia do utilizador na aplicação (este documento), com índice; inclui uma ligação para a referência da API
- **Seletor de idioma** - Disponível no cabeçalho (computador), em Definições → Localização e preços, na página da mesa do jogador e no painel de estado público. A escolha fica guardada no dispositivo; os nomes das bebidas seguem as traduções do menu (atualmente, inglês/francês)
- **Terminar sessão** (canto superior direito) - Termina a sessão de administrador. Se o OIDC estiver ativado, a sessão do fornecedor de identidade também é terminada quando suportado; regressa à página de início de sessão

---

## Visão geral do painel

O painel é o ponto central para gerir todas as mesas.

### Apresentação das mesas

As mesas estão agrupadas por tipo (Americana, Pool, Snooker, Francesa, …), com emblemas de bandeiras e cartões codificados por cores:
- **Cartões verdes** = Mesas disponíveis
- **Cartões vermelhos** = Sessões ativas
- As mesas em manutenção estão ocultas no painel (faça a gestão em Admin → Tipos de mesa e inventário)

Existem dois esquemas disponíveis (selecione em **Definições → Disposição do painel**):

- **Secções** (predefinição) — todos os tipos em grupos recolhíveis. Uma fila de **bandeiras no topo** permite saltar para um tipo (e expandi-lo); use a seta de um grupo para o recolher. O estado recolhido fica guardado neste dispositivo.
- **Separadores** — um tipo de mesa por separador; arraste a **pega** junto a um separador para reordenar os separadores.

Em ambos os esquemas pode reordenar os grupos de tipos de mesa: no modo Secções, arraste a **pega ⋮⋮** à esquerda do cabeçalho de um grupo. A ordem é guardada para todos os dispositivos do pessoal e também é usada no painel de estado público.

### Informação das mesas

Cada cartão apresenta:
- Número e tipo da mesa
- PIN da sessão (quando ativa) - apresentado junto ao número da mesa, por exemplo, "#5 (1234)"
- Duração da sessão atual
- Número atual de jogadores
- Total da conta (valores acumulados)
- Botões de ações rápidas

### Ações rápidas

**Mesas disponíveis:**
- **Iniciar sessão** - Começar uma nova sessão
- **Manutenção** - Retirar a mesa de serviço (ao reativá-la, o contador de utilização é reposto)

**Mesas ocupadas:**
- **Bebida** - Adicionar bebidas à conta (agrupadas por categoria do menu)
- **Transferir** - Transferir a sessão para outra mesa
- **Finalizar pagamento** - Aplicar um desconto, imprimir a estimativa da conta, concluir o pagamento e imprimir a fatura
- **−** junto ao número de jogadores - Liquidação do jogador (um jogador paga a sua parte e sai)
- **+** - Adicionar um jogador — pergunta se é subscritor (o que afeta o desconto)
- **Miniatura QR** - Ampliar o código QR do jogador

---

## Iniciar uma sessão

1. Clique em **▶ Iniciar** numa mesa disponível
2. Defina o número de jogadores (predefinição: 1)
3. (Opcional) Selecione subscritores da sua lista
   - Os subscritores recebem descontos quando jogam; **são permitidas sessões apenas com subscritores** (0 não subscritores), que jogam sem pagar o tempo de mesa
   - É necessário pelo menos um jogador (subscritor ou não)
4. Clique em **Iniciar sessão**

**O que acontece:**
- É gerado um PIN único de 4 dígitos para a sessão
- A mesa é marcada como ocupada
- Os encargos começam a acumular-se com base no tempo decorrido
- O PIN é apresentado no cartão da mesa para os jogadores poderem aceder à conta

---

## Gerir sessões ativas

### Atualizações em tempo real

As sessões ativas apresentam:
- **Duração** - Atualizada a cada segundo (por exemplo, "1h 23m 45s")
- **Horas cobradas** - Arredondadas para a hora seguinte
- **Total da conta** - Encargo da mesa + encargos dos artigos

### Encargos da mesa

Os encargos são calculados por hora, com base no tipo de mesa:
- **Pool americano:** €30/hora
- **Pool:** €25/hora
- **Snooker:** €40/hora
- **Bilhar francês:** €35/hora

O tempo é sempre arredondado para a hora seguinte (por exemplo, 1 hora e 1 minuto = 2 horas cobradas).

### Descontos para subscritores

Quando subscritores jogam com não subscritores:
- **Predefinição:** 50% de desconto no encargo da mesa
- **Todos são subscritores:** Sem encargos
- **Sem subscritores:** Preço total

*A percentagem de desconto pode ser ajustada em Definições.*

---

## Adicionar artigos às contas

### Adicionar bebidas rapidamente

1. Clique em **Bebida** no cartão de uma mesa ocupada
2. Consulte o menu de bebidas — use as **etiquetas de categoria** (Frio / Quente / Alcoólico) e a **caixa de pesquisa** para encontrar artigos rapidamente
3. Use os botões **+** e **-** para selecionar as quantidades
4. Clique em **Adicionar à conta**

### Encargos personalizados

Nos detalhes da sessão:
1. Clique na mesa ocupada para ver os detalhes
2. Desloque-se até «Adicionar encargo personalizado»
3. Introduza a descrição e o valor
4. Clique em **Adicionar encargo**

**Casos de utilização:**
- Artigos alimentares
- Aluguer de equipamento
- Taxas especiais
- Serviços adicionais

---

## Pedidos pendentes (autosserviço dos jogadores)

Os jogadores podem pedir bebidas por conta própria a partir da [Vista pública da mesa](#public-table-view), no telemóvel, sem precisarem que um membro do pessoal se desloque à mesa para receber o pedido.

### Como funciona

1. Um jogador na página específica da mesa introduz o **código PIN** da mesa e seleciona bebidas do menu.
2. O pedido é enviado e surge imediatamente no painel principal, numa nova secção **«Pedidos pendentes»** no topo do ecrã, acima da grelha de mesas.
3. É emitido um sinal sonoro («Bright Triangle») no painel de administração sempre que chega um pedido, para que o pessoal não tenha de estar constantemente a olhar para o ecrã.
4. Cada pedido pendente apresenta o número da mesa, os artigos pedidos e o total.
5. O pessoal verifica o pedido e clica em **✓ Satisfeito** assim que as bebidas forem entregues.
6. Quando o pedido é marcado como satisfeito, os artigos são automaticamente adicionados à conta da mesa — não é necessário voltar a introduzi-los manualmente.

**Segurança:** A exigência do PIN impede que outros jogadores, ou alguém que não esteja na mesa, faça pedidos na sua conta.

**Avisos sonoros:** O sinal sonoro de chegada de pedidos respeita a definição **Sons de interface** na página Definições.

---

## Liquidações de jogadores

Quando um jogador quiser sair enquanto os restantes continuam a jogar:

1. Clique em **🧾 Liquidar** no cartão da mesa
2. Verifique a conta atual e o encargo da mesa
3. **Selecione a opção de encargo da mesa:**
   - **Parte do jogador** - Divisão igual entre os jogadores iniciais
   - **Encargo total da mesa** - O jogador paga o encargo total da mesa
   - **Ignorar encargo da mesa** - Paga apenas os artigos

4. **Selecione os artigos:**
   - Use os controlos de quantidade para selecionar os artigos consumidos pelo jogador
   - É possível liquidar quantidades parciais (por exemplo, 1 de 3 cervejas)

5. Clique em **💰 Liquidar**

**O que acontece:**
- Os artigos selecionados são removidos da conta ou a respetiva quantidade é reduzida
- O número de jogadores diminui em 1
- A vista dos restantes jogadores é atualizada automaticamente
- É possível imprimir um recibo

**Importante:** Os valores da liquidação baseiam-se no encargo *original* da mesa, antes de quaisquer liquidações anteriores.

---

## Terminar sessões (finalizar pagamento)

Quando todos os jogadores tiverem terminado:

1. Clique em **✓ Finalizar pagamento** no cartão da mesa
2. Verifique os encargos finais:
   - Encargo da mesa (com base na duração total)
   - Todos os artigos na conta
   - Liquidações anteriores (apresentadas como deduções)
3. **Opcional:** Clique em **🖨 Imprimir recibo** para obter uma cópia em papel
4. Clique em **Terminar sessão** para concluir

**O que acontece:**
- O total final é calculado
- A sessão é marcada como concluída
- A mesa fica disponível para a sessão seguinte
- Os dados são guardados para os relatórios

---

## Subscrições

### O que são subscrições?

As subscrições são adesões pré-pagas que dão direito a descontos nos encargos das mesas.

### Consultar subscrições

1. Abra o menu (☰)
2. Clique em **Subscrições**
3. Consulte todas as subscrições ativas, incluindo:
   - Nome do jogador
   - Data de início
   - Data de fim
   - Estado atual

### Utilizar subscrições

Ao iniciar uma sessão:
1. Defina o número de jogadores
2. Assinale as caixas junto aos nomes dos subscritores
3. O sistema aplica automaticamente o desconto

**Vantagens:**
- Encargos das mesas reduzidos ou eliminados
- Utilização registada para análise
- Incentivo à frequência dos clientes

---

## Vista pública da mesa

Os jogadores podem consultar a conta em tempo real a partir de qualquer dispositivo e pedir bebidas por conta própria.

### Aceder à vista da mesa

**Formato do URL:** `http://[server]/table.html?number=[table_number]`

Exemplo: `http://localhost:3000/table.html?number=5`

### Primeiro acesso

1. O jogador acede ao URL
2. Introduz o PIN de 4 dígitos (apresentado no painel)
3. O PIN fica guardado durante a sessão

### O que os jogadores veem

- Número e tipo da mesa
- Duração atual
- Número de jogadores
- Todos os artigos na conta, com quantidades e preços
- Encargo da mesa (horas e valor)
- Total em curso
- Um menu de bebidas a partir do qual podem fazer pedidos diretamente (é necessário PIN) — consulte [Pedidos pendentes](#pending-orders-player-self-service)

**Atualização automática:** A vista é atualizada automaticamente (aproximadamente a cada 10 segundos e imediatamente quando regressa ao separador), para que os pedidos satisfeitos e as alterações à conta apareçam rapidamente.

### Códigos QR

O cartão de cada mesa ativa no painel apresenta um **código QR** que liga diretamente à vista da mesa, com o PIN previamente preenchido. Assim, o jogador pode simplesmente digitalizá-lo com a câmara do telemóvel para acompanhar a sessão — sem ter de escrever manualmente o URL ou o PIN. Clique no código QR no painel para o ampliar (útil para imprimir ou apresentar na mesa).

**Controlar o nome de anfitrião usado nos códigos QR:** Por predefinição, os códigos QR apontam para o endereço usado pelo navegador para carregar o painel de administração (por exemplo, `http://localhost:3000`), que só funciona na mesma máquina. Para que os jogadores possam digitalizar os códigos com os telemóveis, defina o **URL base público** em Admin → Definições com o nome de anfitrião/IP ou FQDN a que os telemóveis conseguem aceder, por exemplo `http://[IP_ADDRESS]:3000` ou `https://pool.example.com`. Deixe o campo em branco para usar o endereço atual do navegador.

---

## Funcionalidades de administração

Aceda através do menu (☰) → **Painel de administração**

### Tipos de mesa e inventário

**Gerir tipos de mesa:**
- Adicione novos tipos de mesa (por exemplo, «Bilhar», «Carambola»)
- Defina tarifas horárias na sua moeda
- Defina a **taxa de IVA** aplicada aos encargos de tempo desse tipo de mesa (20%, 10% ou 0% — consulte [Relatórios de IVA (TVA)](#vat-tva-reporting--france))
- Edite ou elimine tipos existentes

**Gerir mesas:**
- **Adicionar mesas:** especifique uma quantidade para criar várias mesas de uma só vez (numeradas sequencialmente de forma automática)
- **Renumerar:** clique no **lápis** junto ao número de uma mesa, introduza o novo número e prima Enter (se o número já estiver a ser usado, será rejeitado com uma mensagem explicativa)
- **Eliminar mesas:** Remova mesas não utilizadas
- **Ativar o modo de manutenção:** Desative temporariamente mesas; ao voltar a colocar uma mesa em serviço, o contador de utilização desde a manutenção é reposto
- **Ordenar os tipos:** use os botões **↑/↓** em cada tipo para alterar a ordem usada no painel, nos separadores/navegador de bandeiras do painel e no painel de estado público

**Operações em lote:**
- Adicione várias mesas do mesmo tipo (1 a 50 de cada vez)
- As mesas recebem automaticamente os números disponíveis seguintes

### Gestão do menu de bebidas

1. Clique em **Menu de bebidas**
2. **Adicionar novo artigo:**
   - Nome
   - Preço
   - Taxa de IVA (20% padrão, 10% reduzida ou 0% isenta — consulte [Relatórios de IVA (TVA)](#vat-tva-reporting--france))
   - **Categoria** — Frio, Quente, Alcoólico, Outro (ou nenhuma). As categorias agrupam o menu no ecrã de pedidos dos jogadores e na janela «Adicionar bebida» do painel.
3. **Editar/Eliminar:** Use os botões de lápis/caixote do lixo junto a cada artigo

**Suporte multilingue:**
- Os artigos podem ter nomes em inglês e francês
- O idioma de apresentação pode ser alterado em Definições

### Numerário e pagamentos (POS opcional)

Os pagamentos estão **desativados por predefinição**. Ative-os em **Definições → Geral → «Pagamentos (POS)»** (consulte também [Configurar pagamentos com cartão](#setting-up-card-payments-administrator) para terminais de cartões).

Depois de ativados:

- **Finalização do pagamento** cobra o valor antes de emitir a fatura:
  - **Numerário:** introduza o valor recebido e clique em **Adicionar pagamento** (o troco é apresentado). Use **Valor exato** para pagar exatamente o saldo em dívida.
  - **Cartão (terminal):** clique em **Cartão (terminal) — €X**. Surge uma faixa «Apresente o cartão no terminal…»; o cliente aproxima ou insere o cartão e o pagamento é adicionado automaticamente. **Cancelar** interrompe a operação no terminal.
  - **Pagamentos divididos:** adicione vários pagamentos (em numerário e/ou cartão) até o saldo restante chegar a zero. A opção **Concluir pagamento** só fica ativa quando a conta estiver totalmente paga.
  - Os descontos ficam bloqueados após a adição de um pagamento (para evitar discrepâncias nos valores).
- Os **recibos** (no ecrã e na fatura impressa) indicam os métodos de pagamento e qualquer troco devido.
- **Admin → Numerário e pagamentos** (apresentado apenas quando ativado):
  - **Turno de caixa:** abra um turno com um fundo de caixa inicial no começo do dia; ao fechar, introduza o numerário contado — o total esperado (fundo + numerário líquido) e a **diferença** são calculados. Uma diferença diferente de zero envia um e-mail para o endereço de manutenção configurado (quando o SMTP está definido).
  - **Reembolsos:** por pagamento, com um valor (são permitidos reembolsos parciais) e um motivo opcional. O reembolso de um pagamento faturado emite uma **nota de crédito (avoir)** numerada; a notificação apresenta o número.
  - **Notas de crédito:** listadas com um botão **Imprimir** (incluem a referência do recibo original e o detalhe do IVA; guarde como PDF através da janela de impressão).
  - **Fecho do dia e reconciliação:** escolha uma data para ver os pagamentos por método, as notas de crédito e o numerário esperado/contado/diferença; **Exportar CSV** descarrega o livro de pagamentos; **Fechar dia** bloqueia o dia (não é permitido enquanto houver um turno de caixa aberto).
- **Admin → Relatórios → Financeiro** apresenta as linhas **Pago em numerário/cartão** e **Reembolsos (notas de crédito)** (também nas exportações PDF e Excel). O relatório **IVA / TVA** deduz as notas de crédito e apresenta uma categoria *Reembolsos (notas de crédito)*.

### Definições

Aceda através do menu (☰) → **Definições**

**Definições disponíveis:**

- **Nome da aplicação:** Nome apresentado no cabeçalho (por exemplo, «Sala de Bilhar do João»)
- **URL base público:** Nome de anfitrião/IP ou FQDN usado ao gerar códigos QR para as mesas (consulte [Códigos QR](#qr-codes)); deixe em branco para usar o endereço atual do navegador
- **Disposição do painel:** Secções (grupos recolhíveis + navegação por bandeiras) ou Separadores (um tipo por separador)
- **Idioma:** English, Français, Deutsch, Español ou Italiano — altera a interface neste dispositivo (também pode ser selecionado no cabeçalho, na página da mesa do jogador e no painel de estado público)
- **Moeda:** $ (USD), € (EUR) ou £ (GBP)
- **Desconto para subscritores:** Percentagem de desconto (0-100%)
- **Sons de interface:** Ativa/desativa os sons de clique da interface e o sinal sonoro de novos pedidos
- **Informação fiscal/legal:** Nome legal da empresa, SIRET, SIREN, número de IVA intracomunitário, morada registada, regime de IVA e periodicidade da declaração — usada no relatório de IVA e para os seus próprios registos (consulte [Relatórios de IVA (TVA)](#vat-tva-reporting--france))

**Zona de perigo:**
- **Limpar todo o histórico de sessões:** Elimina permanentemente as sessões concluídas
  - Requer confirmação dupla
  - As sessões ativas NÃO são afetadas
  - As sessões dentro de um **período de IVA fechado** também estão protegidas e não serão eliminadas

---

## Configurar pagamentos com cartão (administrador)

### O que é necessário

- A aplicação em execução (Docker) numa máquina com acesso à Internet.
- Uma **conta Stripe** (dados da empresa verificados). Comece no modo de teste.
- Um **terminal Stripe Terminal** (por exemplo, WisePOS E) associado à rede Wi-Fi do estabelecimento — ou, para testes, um **terminal simulado** Stripe.
- A Stripe tem de conseguir aceder ao servidor em `https://<your-domain>/api/webhooks/stripe` (HTTPS público, proxy inverso ou túnel durante o projeto-piloto). A aplicação pode continuar a usar HTTP dentro da rede local.
- Os estabelecimentos que aceitam apenas numerário não precisam de nada disto: basta ativar os pagamentos e usar numerário.

### Passos

1. **Stripe (modo de teste)**
   - Associe/registe o terminal (Dashboard → Terminal → Readers); anote o respetivo ID (`tmr_…`).
   - Developers → Webhooks → adicione `https://<your-domain>/api/webhooks/stripe` com os eventos `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`; copie o segredo de assinatura (`whsec_…`).
2. **Configuração do servidor** (ambiente do compose / `.env`) e, em seguida, reinicie (`docker compose up -d`):
   - `STRIPE_SECRET_KEY=sk_test_…` (mais tarde, a chave real)
   - `STRIPE_TERMINAL_READER_ID=tmr_…`
   - `STRIPE_WEBHOOK_SECRET=whsec_…`
   - `COOKIE_SECURE=true` quando a aplicação é servida por HTTPS
3. **Definições da aplicação**
   - **Definições → Geral → «Pagamentos (POS)» → ativado**.
   - A moeda tem de ser `€`, `$` ou `£` (enviada à Stripe como eur/usd/gbp).
   - Defina o nome da aplicação e a Informação fiscal/legal (usada pelos relatórios e nos seus registos).
   - Opcional: definições SMTP e e-mail de alerta de manutenção para alertas de diferenças de caixa.
4. **Testar sem comprar equipamento**
   - `PAYMENT_PROVIDER=fake` no ambiente: os pagamentos são registados instantaneamente (sem terminal nem rede) — ideal para formação/testar a interface.
   - Ou use o modo de teste Stripe com um **terminal simulado** para testar o fluxo real de pagamento com cartão.
5. **Lista de verificação do projeto-piloto antes de entrar em produção**
   - Venda em numerário com pagamento dividido + troco; venda com cartão; cartão recusado e nova tentativa; cancelar no terminal; reembolso parcial (imprimir a nota de crédito); fechar o turno; fechar o dia e exportar o CSV.
   - Só mude a Stripe para chaves reais depois de o projeto-piloto ser aprovado.

### Resolução de problemas e operações

- **Webhook não recebido** (o terminal apresenta o pagamento como efetuado, mas a aplicação continua a indicar «a apresentar»): verifique o URL do ponto final, o segredo de assinatura e as subscrições de eventos; a aplicação também consulta o estado do pagamento e sincroniza novamente os pagamentos com cartão desatualizados sempre que a página Numerário é carregada. Se o pagamento tiver sido abandonado, clique em **Cancelar** junto ao mesmo em Admin → Numerário e pagamentos.
- **Os totais do terminal e da aplicação são diferentes** no cartão de fecho do dia: a linha «Terminal (Stripe)» provém das transações de saldo da Stripe (valor bruto menos reembolsos, mais as taxas apresentadas). Verifique a apresentação das taxas de pagamento, os reembolsos no painel da Stripe e se o limite do dia corresponde ao dia contabilístico. A linha só é apresentada quando os dados de liquidação da Stripe estão disponíveis.
- **Desativar rapidamente os pagamentos**: desative **Definições → Geral → «Pagamentos (POS)»** — a finalização do pagamento regressa ao comportamento anterior ao POS, as opções de cartão desaparecem e a página Numerário fica oculta. Os recibos, notas de crédito e histórico existentes não são alterados.
- **Mudar as chaves/o terminal**: atualize `STRIPE_SECRET_KEY` / `STRIPE_TERMINAL_READER_ID` / `STRIPE_WEBHOOK_SECRET` no ambiente e reinicie (`docker compose up -d`). Deixe de usar o terminal antigo no painel da Stripe.
- **Entrada em produção**: substitua as chaves/segredos de teste pelos reais e, em seguida, repita a lista de verificação do projeto-piloto com um pequeno pagamento real antes de anunciar os pagamentos com cartão.
- **Estabelecimentos que aceitam apenas numerário**: não é necessária a configuração da Stripe; ative os pagamentos e use numerário. Os turnos, reembolsos, notas de crédito, fecho do dia e exportação CSV funcionam sem qualquer terminal.

### Aspetos a ter em conta

- **Um terminal por instalação**: o ID do terminal é configurado no ambiente. Para vários balcões seria necessário selecionar o terminal (funcionalidade não implementada).
- **Dependência da Internet**: os pagamentos com cartão precisam de ligação; se esta cair durante um pagamento, o estado pode permanecer «a apresentar» — cancele/reembolse na página Numerário. O numerário funciona sempre.
- **Uma única conta de funcionário**: atualmente, a aplicação tem um único início de sessão de administrador; os pagamentos/notas de crédito registam esse utilizador.
- **NF525 (França)**: a aplicação regista vendas e pagamentos com recibos sequenciais, linhas imutáveis, notas de crédito e fechos de períodos — mas a certificação é um processo de atestação legal. Confirme com o seu *expert-comptable* antes de anunciar conformidade ou ativar pagamentos com cartão em produção.
- Esta integração abrange **pagamentos**, não um POS externo de bar (sincronização do menu/pedidos), nem o pagamento autónomo dos clientes através do telemóvel.

## Relatórios

Aceda através de **Admin → Relatórios**. A página tem dois separadores: **Financeiro** e **IVA / TVA**.

### Relatórios financeiros

Gere relatórios de receitas detalhados para qualquer período.

**Tipos de período:**
- **Dia:** Data específica com detalhes das sessões
- **Semana:** Período de 7 dias com início à segunda-feira
- **Mês:** Mês civil completo
- **Trimestre:** T1, T2, T3 ou T4
- **Ano:** Resumo anual

**Conteúdo do relatório:**

1. **Receita total** - Todas as fontes em conjunto

2. **Receita por tipo de mesa**
   - Pool americano: €X
   - Pool: €X
   - Snooker: €X
   - Francesa: €X

3. **Receita de bebidas/artigos** - Vendas de alimentos e bebidas

4. **Receita de subscrições** - Subscrições ativas no período

5. **Análise de séries temporais** (relatórios semanais/mensais/trimestrais/anuais)
   - Tendências das receitas ao longo do tempo
   - Análise por dia da semana
   - Identificação das horas de ponta

6. **Detalhes diários** (apenas relatórios diários)
   - Discriminação de cada sessão
   - Utilização das mesas por sessão
   - Detalhes ao nível do artigo
   - Possibilidade de editar/eliminar encargos

### Compreender os relatórios

**O que está incluído:**
- Encargos das mesas de sessões concluídas
- Todos os artigos do menu e encargos personalizados
- Receita de subscrições

**O que não está incluído:**
- Sessões ativas (em curso)
- Lançamentos contabilísticos de liquidações (são ajustes internos)
- Mesas em manutenção ou pausadas

**Carregamento automático:** O relatório do dia atual é gerado automaticamente quando abre a página Relatórios.

---

## Relatórios de IVA (TVA) — França

> ⚠️ **Não constitui aconselhamento jurídico ou fiscal.** Consulte o seu *expert-comptable* para confirmar que estes valores e procedimentos correspondem ao regime de IVA específico da sua empresa antes de entregar a declaração. Consulte [VAT-COMPLIANCE.md](VAT-COMPLIANCE.md) para ver as notas completas de conformidade.

O separador **IVA / TVA** da página Relatórios prepara a sua declaração periódica de IVA (CA3/CA12).

### Gerar um relatório de IVA

1. Escolha um **tipo de período** (Mês, Trimestre, Ano ou Dia) e o período específico.
2. Clique em **Carregar relatório de IVA** para ver a discriminação por taxa de IVA:
   - Total HT (sem IVA)
   - TVA (valor do IVA)
   - Total TTC (com IVA)
3. Abaixo da tabela, é apresentada uma discriminação por categoria (tempo de mesa, bebidas, descontos, outros).

### Fechar um período

Depois de entregar a declaração às autoridades fiscais referente a um período, clique em **Fechar período**. Esta ação:
- Guarda um instantâneo dos totais do período para os seus registos.
- Impede que **Limpar todo o histórico de sessões** elimine vendas desse período, para que os valores declarados permaneçam sempre rastreáveis na base de dados.

Os períodos fechados aparecem numa lista de histórico abaixo do relatório, com o período, os totais e a pessoa que o fechou.

### Exportar para o contabilista

Clique em **Exportar livro CSV** para descarregar todas as linhas de venda individuais do período selecionado (data, mesa/sessão, descrição, quantidade, preço unitário, taxa de IVA, valor do IVA, valor HT) — útil para enviar ao contabilista ou arquivar a longo prazo.

### Manter a precisão dos relatórios de IVA

- Defina corretamente a taxa de IVA de cada bebida e tipo de mesa em Admin (consulte [Gestão do menu de bebidas](#drink-menu-management) e [Tipos de mesa e inventário](#table-types--inventory)).
- **Use sempre «✓ Finalizar pagamento» → Concluir pagamento** para terminar sessões que geraram receitas — é assim que o encargo de tempo de mesa fica registado e é emitido um recibo sequencial. Se terminar uma sessão de outra forma, esse encargo de tempo de mesa não será incluído no relatório de IVA.
- Preencha a **Informação fiscal/legal** em Definições (SIRET, número de IVA, regime de IVA, etc.) para a ter disponível ao entregar a declaração.

---

## Sugestões e boas práticas

### Para as operações diárias

1. **Início do dia:**
   - Verifique se existem mesas «ocupadas» sem sessão associada
   - Consulte o relatório do dia anterior
   - Confirme que todas as mesas estão marcadas como «disponíveis»

2. **Durante o serviço:**
   - Use os botões de bebidas rápidas para poupar tempo
   - Confirme o PIN com os jogadores quando precisarem de aceder à conta
   - Acompanhe as sessões de longa duração

3. **Fim do dia:**
   - Finalize o pagamento de todas as sessões restantes
   - Gere o relatório diário
   - Reveja quaisquer problemas ou ajustes

### Para liquidações

- Verifique sempre o número de jogadores antes de liquidar
- Imprima recibos para os registos dos clientes
- Confirme que os artigos selecionados correspondem ao que o jogador consumiu

### Para maior precisão

- Adicione os artigos às contas imediatamente (não espere até à finalização do pagamento)
- Use encargos personalizados para artigos que não constem do menu
- Confirme que o número de jogadores está correto no início da sessão

### Para o atendimento ao cliente

- Partilhe os URLs das mesas com os jogadores no início da sessão
- Coloque códigos QR perto das mesas para facilitar o acesso
- Explique as vantagens das subscrições para incentivar novas adesões

---

## Atalhos de teclado

Atualmente, a aplicação é controlada por rato/ecrã tátil e não tem atalhos de teclado. Todas as ações requerem que clique nos botões.

---

## Acesso móvel

A aplicação é totalmente adaptável e funciona em:
- Navegadores de computador
- Tablets
- Smartphones

**Recomendado para:**
- Pessoal: computador/tablet para o painel
- Jogadores: smartphones para a vista da mesa

---

## Resolução de problemas

### Problemas comuns

**«Não foi possível iniciar a sessão»**
- Verifique se a mesa está realmente disponível
- Confirme que o número de subscritores é ≤ ao número total de jogadores
- Atualize a página e tente novamente
- Se o problema persistir, contacte o administrador

**O PIN não funciona**
- Confirme que o PIN corresponde ao apresentado no painel
- Verifique se o número da mesa está correto
- O PIN expira quando a sessão termina

**Os artigos não aparecem na conta**
- Confirme que o artigo foi adicionado (verifique se foi apresentada uma mensagem de sucesso)
- Aguarde aproximadamente 10 segundos pela atualização automática (vista pública) ou regresse ao separador para atualizar imediatamente
- Atualize manualmente o painel

**São apresentados valores incorretos**
- Verifique a definição de moeda
- Confirme se foram aplicadas liquidações
- Consulte as linhas individuais nos detalhes da sessão

### Obter ajuda

Se os problemas persistirem:
1. Anote o número da mesa e a hora
2. Faça uma captura de ecrã, se possível
3. Contacte o administrador do sistema
4. Consulte os registos do Docker (para administradores)

---

## Perguntas frequentes

**P: Posso editar uma sessão depois de a iniciar?**

R: Sim, pode adicionar/remover artigos e ajustar o número de jogadores durante a sessão.

**P: O que acontece se terminar uma sessão por engano?**

R: As sessões terminadas não podem ser reabertas. Terá de iniciar uma nova sessão.

**P: Os jogadores podem adicionar artigos por conta própria?**

R: Não, só o pessoal pode adicionar artigos. Os jogadores só podem consultar a conta.

**P: Como posso gerir sessões oferecidas (gratuitas)?**

R: Inicie uma sessão com 1 jogador, adicione artigos e, em seguida, finalize o pagamento sem cobrar.

**P: Posso alterar a tarifa horária durante uma sessão?**

R: Não, as alterações de tarifa só se aplicam a novas sessões. As sessões ativas mantêm a tarifa original.

**P: O que acontece se a Internet falhar?**

R: O sistema requer acesso à rede. As sessões ativas mantêm-se, mas as atualizações ficam em pausa até a ligação ser restabelecida.

**P: Posso exportar os dados dos relatórios?**

R: Atualmente, os relatórios são apenas de consulta. Use a impressão do navegador ou guarde em PDF para manter registos.

**P: Até que data posso consultar os relatórios?**

R: Enquanto o histórico de sessões for mantido (até ser eliminado manualmente em Definições).

---

## Resumo das funcionalidades

### Funcionalidades principais
- Monitorização de sessões em tempo real
- Cobrança automática com base no tempo
- Suporte para vários jogadores com liquidações
- Vistas dos jogadores protegidas por PIN
- Gestão de bebidas e artigos
- Suporte para encargos personalizados
- Transferências de mesas
- Impressão de recibos
- Pedidos de bebidas em autosserviço pelos jogadores, com fila de pedidos pendentes e avisos sonoros
- Códigos QR para acesso direto à mesa a partir do telemóvel do jogador

### Funcionalidades de administração
- Gestão de tipos de mesa e inventário
- Criação de mesas em lote
- Configuração do menu de bebidas com taxas de IVA
- Gestão de subscrições
- Relatórios financeiros (vários períodos)
- Relatórios de IVA (TVA), exportação CSV e fecho de períodos para conformidade em França
- Suporte para várias moedas
- Sistema de descontos para subscritores
- Gestão do histórico de sessões
- URL base público configurável para códigos QR
- Informação fiscal/legal da empresa

### Funcionalidades para jogadores
- Consulta da conta em tempo real
- Apresentação com atualização automática
- Interface adaptada a dispositivos móveis
- Acesso protegido por PIN
- Pedidos de bebidas em autosserviço através de código QR

---

## Suporte

Para obter assistência técnica ou solicitar funcionalidades, contacte o administrador do sistema.

---

**Versão:** 1.0  
**Última atualização:** dezembro de 2025

---

Obrigado por utilizar o Gestor de Mesas de Bilhar! Esperamos que este guia o ajude a tirar o máximo partido da aplicação. Para obter documentação técnica, os programadores devem consultar `DEVELOPER_README.md`.


