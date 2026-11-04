---
title: Carregar pacotes de conteúdo em tempo de execução
description: Restringir a reconstrução como única via para implementações Node e SQLite que ativem esta opção, após comparar um pacote de conteúdo com uma compilação completa.
status: accepted
date: 2026-11-04
---

# ADR-0013 — Carregar pacotes de conteúdo em tempo de execução

## Contexto

Uma wiki pode alterar o Markdown mais frequentemente do que o código. Reconstruir
uma imagem por alteração liga o conteúdo ao processo de publicação; um pod sem
acesso à rede exterior não consegue obter as fontes por si próprio.
[ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime)
escolheu implementações imutáveis, uma predefinição útil para sites estáticos e
Workers.

A exceção precisava de provar que era possível empacotar conteúdo sem compilar a
aplicação. A experiência de 2026-11-04 usou `apps/www` no commit
`725534546886f06220f62a99525070ee63978a50`, Node 26.11.1, Nuxt 4.6.2 e
Content 3.16.2: 96 coleções, 9.603 ficheiros e 95 exportações de coleções públicas.

Ambos os processos correram a partir de `apps/www`, na mesma máquina com oito
CPU, as mesmas fontes e dependências instaladas. Espelhos Git públicos fixados
forneceram as fontes remotas por HTTPS numa rede de loopback isolada, sem rede
externa. Ambos começaram sem base de análise Content nem modelos anteriores e
analisaram os 9.603 ficheiros. Preparar o ambiente e copiar as entradas ficou
fora do tempo medido. Ambos terminaram com código `0`.

| Medição | Apenas conteúdo | `nuxt build` completo |
| :--- | ---: | ---: |
| Tempo real | 110.36 s | 278.54 s |
| Fração da compilação completa | 39.62% | 100% |
| Exportações de coleções | 95 | 95 |

As 95 exportações comprimidas e os literais de `checksums` e `checksumsStructure` foram idênticos byte a byte. Também coincidiram integralmente `database.compressed.mjs`, `manifest.ts` e `sql_dump.txt`; as tabelas do manifesto tinham 96 entradas em ambos os casos.

| File | Bytes | SHA-256 (both runs) |
| :--- | ----: | :----------------- |
| `database.compressed.mjs` | 18,747,182 | `e708db643cc47bc0cd742e910124f5cdd63586e9d06fd4c6301a35d871a2bb1f` |
| `manifest.ts` | 104,380 | `43bd5c30c30e426a117053d9256684aa992c52a9b72493c4af2b95ee1ea8df65` |
| `sql_dump.txt` | 76,747,454 | `eba31689710dc03ce165dfeb9770c666c7f561083336a7fc1ba85828c334fb00` |


A sequência apenas de conteúdo foi:

```js
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { loadNuxt, buildNuxt } from 'nuxt/kit';

const buildDir = await mkdtemp(join(process.cwd(), '.nuxt-pack-'));
const nuxt = await loadNuxt({
  cwd: process.cwd(),
  dev: false,
  overrides: { buildDir }
});
try {
  nuxt.options._prepare = true;
  await buildNuxt(nuxt);
  // Save buildDir/content before disposing the temporary directory.
} finally {
  await nuxt.close();
}
```

A inicialização dos módulos de produção e a análise terminaram **antes** de
ativar `_prepare`. Ativá-lo mais cedo omitiria a análise; reutilizar o diretório
permitiria devolver modelos antigos. Foram gerados modelos sem empacotar Vite
ou Nitro. A comparação executou `build` com a CLI Nuxt instalada a partir de
`apps/www`, sem substituir a configuração. A experiência não acrescentou um
empacotador de produção nem um carregador em execução.

`cd apps/www && node node_modules/nuxt/bin/nuxt.mjs build`

## Decisão

Permitir pacotes de conteúdo como opção explícita para implementações Node com
SQLite. Isto restringe ADR-0006 apenas para esta implementação; reconstruir
continua a ser a predefinição e a via para Workers e saída estática. A experiência
cumpriu ambos os critérios: exportações e somas idênticas byte a byte, e tempo de
empacotamento não superior a metade da compilação.

Um pacote pode alterar conteúdo, redirecionamentos e recursos de documentação.
Alterações do esquema, novas fontes ou versões e novo código de componentes MDC
continuam a exigir uma imagem. Compatibilidade e hashes são validados antes de
importar todas as coleções numa transação SQLite e publicar as somas Content
correspondentes. Rejeitar um pacote mantém o conteúdo ativo.

O transporte é um diretório gerido pelo operador, com um ponteiro `current`
substituído atomicamente; a camada não precisa de cliente de armazenamento,
credenciais ou saída para a rede. O empacotador vem do commit da aplicação, com
um segundo alvo Docker testado e um hash de compatibilidade esperado verificado
antes da publicação. Os componentes MDC existentes são globais neste modo;
o conteúdo pode usar um subconjunto. As réplicas mudam independentemente,
aceitando um desfasamento até ao intervalo de consulta mais o tempo de importação.

## Consequências

As publicações de conteúdo e aplicação tornam-se independentes neste âmbito,
ao custo de validar compatibilidade e ativar atomicamente. O formato de
exportação Content, a sua rota e o objeto mutável de somas precisam de testes de
contrato. O empacotamento a frio continuou a gastar quase todo o tempo na análise;
a medição demonstra o ganho para esta árvore, não para todos os consumidores ou
estados de cache. Aceitam-se o desfasamento entre réplicas e um navegador que
mantém o conteúdo até ao próximo recarregamento completo.

## Alternativas consideradas

**Reconstruir uma imagem por cada push de conteúdo.** Continua a ser a
predefinição; a etapa medida justificou uma exceção para a wiki que motivou a
proposta.

**Substituir ADR-0006 em todo o lado.** Rejeitado: sites estáticos e Workers
mantêm o seu modelo de compilação imutável.

**Deixar Content restaurar a pedido, ou aceder ao armazenamento a partir da camada.**
A restauração por coleção não permite mudar todas atomicamente. Um cliente de
armazenamento introduziria credenciais e saída para a rede na aplicação, em vez
de deixar o transporte ao operador.
