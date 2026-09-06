---
title: Render Markdown components with MDC
description: Use Content's own MDC syntax for components inside Markdown rather than adopting MDX.
status: accepted
date: 2026-09-06
---

## Context

A documentation theme needs components inside prose — callouts, tabbed code,
parameter fields, trees. Two syntaxes were available. **MDX** compiles Markdown
into a component module and lets a page import and write JSX; **MDC** is the block
and inline component syntax Content already ships and parses.

The pages are also read by something other than a browser. The theme publishes
each page's Markdown source for models, so whatever syntax the pages are written
in is what a model receives.

## Decision

Components in Markdown are **MDC**. Components callable from a page live in a
dedicated content directory, where a consumer's file of the same name replaces the
layer's.

## Consequences

Nothing has to be installed or configured for a page to call a component, and a
page stays a Markdown file rather than becoming a module.

An MDC block survives being handed to a model as text: it reads as a component
call with named arguments. Compiled JSX would not.

The syntax is Content's, so its capabilities and its limits are Content's too.
Anything a page wants that MDC cannot express has to be solved as a component
rather than as an expression in the page — which is a constraint on authors and,
for a documentation site, a desirable one.

Component names in the content directory are part of the public surface, since a
page written against one is a consumer's file.

## Alternatives considered

**MDX.** More expressive, and every bit of that expressiveness is JavaScript in a
documentation page. It would also need a module and a build path Content does not
have, to end up with pages that are worse to hand to a model.
