---
title: Gerar as coleções a partir de uma só lista de fontes
description: Calcular as coleções do Content a partir de uma lista de fontes compacta ao carregar a configuração, em vez de fazer quem a consome declará-las.
status: accepted
date: 2026-09-06
---

## Contexto

O Nuxt Content vai buscar uma coleção a um repositório git num ramo ou numa tag,
autentica-se contra um repositório privado e guarda a descarga em cache por
hash. Isso foi verificado lendo o próprio Content antes de nada disto ser
construído, e significa que a metade difícil da documentação versionada e
multirrepositório já existia e não precisava de ser refeita.

O que não existia era a ergonomia. Um site que serve várias versões de vários
projetos declara uma coleção por repositório × ref, à mão: três versões em
catorze repositórios são quarenta e duas declarações, e cortar um lançamento
edita as catorze. O Content também não oferece nenhum hook para injetar
coleções — mas carrega a configuração de conteúdo de cada camada através do c12,
o que faz desse ficheiro código executado e não um ficheiro de dados, podendo
calcular as suas coleções quando é carregado.

## Decisão

Quem a consome declara uma **lista de fontes** compacta — uma pasta,
opcionalmente um repositório, opcionalmente refs — na configuração de aplicação
do próprio site, e a configuração de conteúdo da camada calcula a partir dela
uma coleção por fonte × ref no carregamento. A mesma lista é resolvida uma
segunda vez pela compilação num manifesto que nomeia que coleção serve que
prefixo de URL, e é esse manifesto que o tema lê.

## Consequências

A lista tem o comprimento do número de projetos e não o do produto de projetos
por versões, e a pasta única sem versões não precisa de configuração nenhuma.

O atalho exprime menos do que uma coleção escrita à mão, e vai exprimir sempre.
Isso só é suportável porque o Content combina a configuração de conteúdo de cada
camada, ganhando a posterior: quem a consome e precise de algo que o atalho não
consegue dizer escreve um ficheiro próprio e assume por completo.

Várias funcionalidades deixam de precisar de configuração própria, porque uma
fonte já nomeia um repositório, uma ref e uma pasta — as ligações de volta à
fonte, a data da última alteração e a lista de quem contribuiu derivam todas
dela.

Os nomes das coleções tornam-se dados. Um site com dois repositórios não tem
nenhuma coleção chamada `docs`, por isso nada na camada pode nomear uma, e o
tema lê antes o nome a partir do manifesto. Código que fixa um nome de coleção
funciona num site de fonte única e quebra em todos os outros.

Os caminhos das coleções resolvem contra a camada e não contra quem a consome,
porque o Content regista como raiz de uma coleção a camada que a declarou. A
camada calcula por isso caminhos absolutos, o que só é possível porque a
configuração é código executado — a mesma propriedade sobre a qual assenta todo
o atalho.
