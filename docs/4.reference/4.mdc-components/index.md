---
title: MDC components
description: The blocks a Markdown page can call, one page each, with their props.
icon: lucide:blocks
---

Anything in `app/components/content/` is callable from Markdown with MDC syntax —
no module, no MDX. These ship with the layer; your own file of the same name
replaces one.

Every page here is built the same way: what the block is, an example rendered as
this site renders it with the Markdown that produced it beside it, then its
props, slots and events.

::page-cards
::

::callout{type="tip" title="Nesting takes one more colon"}
A block inside a block opens with one colon more than its parent — `:::accordion`
around `::accordion-item`. The closing fence matches the opening one.
::
