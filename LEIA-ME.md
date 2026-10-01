# LX Gestão Imobiliária

Primeira versão com interface em português e layout para computador e celular.

## Implementado

- Entrada com a conta do ChatGPT e publicação prevista com acesso privado do proprietário.
- Banco D1 com clientes, lotes, vendas, parcelas e dados da empresa.
- Cadastro e edição de clientes e lotes; busca e filtro por situação.
- Registro de venda com entrada, correção anual fixa e geração de parcelas.
- Registro integral de pagamentos por Pix, dinheiro, transferência, cartão ou boleto.
- Dashboard, caixa, relatórios de recebimentos e inadimplência.
- Recibo interno com impressão, exportação de relatórios e cópia dos dados em JSON.
- Simulador com correção a partir da 13ª parcela; valores armazenados em centavos.

## Validação realizada

- Verificação de tipos e preparação da versão de produção sem erros.
- Migração aplicada no banco local de testes.
- Cadastro de cliente e lote verificado pelo navegador.
- Simulação: lote R$ 55.000, entrada R$ 10.000, 24 parcelas e correção anual de 7,5%: parcela inicial R$ 1.875, total das parcelas R$ 46.687,50 e total com entrada R$ 56.687,50.
- Conservação do valor financiado sem correção para 1, 3, 12, 15, 24 e 120 parcelas; ajuste de datas no fim do mês.
- Layout conferido com largura de 390 pixels; navegação WebMCP válida e rejeição de seção inválida verificadas.

## Pendências

- Publicação online: Site registrado, mas sem versão publicada. A política do ambiente bloqueou o envio da credencial temporária de publicação. Não há URL de produção confirmada.
- O administrador confirmou na prévia local que a venda, geração de parcelas, recebimento e lançamento no caixa funcionaram. A validação em produção permanece pendente.
- Emissão fiscal e geração de documento contratual não estão integradas. Os recibos são comprovantes internos.
- Acesso de funcionários e definição individual de permissões não estão implementados. O acesso inicial é privado do administrador.
- A sincronização em vários dispositivos depende da publicação e da validação do banco online.

## Desenvolvimento

Use Node.js 22.13 ou superior. Instale as dependências com `npm ci`. Execute `npm run dev`; a prévia utiliza a porta 5173 e uma identidade fictícia local. A autenticação local de testes não é incluída na produção.

Execute `npm run db:generate` ao alterar o esquema. A migração atual está em `drizzle/0000_grey_thunderbolts.sql`. Prepare a versão com `npm run build`. Aplique a migração no banco local com:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_grey_thunderbolts.sql
```

Não repita uma migração já aplicada. Publicações devem reutilizar o `project_id` existente em `.openai/hosting.json` e manter o acesso privado. Dados fictícios do banco local não fazem parte dos arquivos para publicação.

## Regras da primeira versão

Uma venda por lote. Pagamentos integrais, sem estorno ou pagamento parcial. Correção fixa aplicada a cada 12 parcelas; índices variáveis e cobrança de multa/juros por atraso não estão implementados. A entrada deve ser menor que o valor do lote. Financiamentos de 1 a 600 parcelas.

