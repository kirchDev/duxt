---
title: Architecture decisions
description: The decision log — every architecture decision recorded for duxt.
icon: lucide:gavel
---

A decision earns an ADR when it constrains work that comes later and its
reasoning would otherwise be lost: a choice between real alternatives, a
convention every part of the project has to follow, a trade-off that looks like a
mistake until the reason is known. Records are append-only — a reversed decision
is written as a new ADR that supersedes the old one, never as an edit to it.

| ADR                                                              | Decision                                          | Status   | Date       |
| :--------------------------------------------------------------- | :------------------------------------------------ | :------- | :--------- |
| [ADR-0001](/adr/0001-build-duxt-as-a-layer-carrying-a-module)     | Build duxt as a layer carrying a module           | accepted | 2026-09-06 |
| [ADR-0002](/adr/0002-generate-the-collections-from-one-source-list) | Generate the collections from one source list   | accepted | 2026-09-06 |
| [ADR-0003](/adr/0003-decide-the-url-prefixes-at-build-time)       | Decide the URL prefixes at build time            | accepted | 2026-09-06 |
| [ADR-0004](/adr/0004-render-markdown-components-with-mdc)         | Render Markdown components with MDC              | accepted | 2026-09-06 |
| [ADR-0005](/adr/0005-ship-the-layer-without-owner-specific-links) | Ship the layer without owner-specific links      | accepted | 2026-09-06 |
| [ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime) | Rebuild on a schedule rather than refresh at runtime | accepted | 2026-09-06 |
