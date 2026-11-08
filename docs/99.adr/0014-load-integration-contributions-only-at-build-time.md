---
title: Load integration contributions only at build time
description: Keep parsers out of client configuration while Nuxt layers contribute collections and page metadata.
status: accepted
date: 2026-11-07
---

# ADR-0014 — Load integration contributions only at build time

## Context

Parsers and generated page metadata must reach both Content configuration and Nuxt modules. Putting executable build contributions in runtime configuration couples a browser bundle to build dependencies. Provider-specific navigation also makes a source dialect depend on the theme.

## Decision

We chose a build-only contribution file discovered through Nuxt layer resolution, with the site taking precedence. Built-in integrations use that same contract. Source dialects write generic navigation metadata while the core orders and groups pages without knowing their origin.

## Consequences

The schema can grow through an extension without imposing its fields on unrelated sites. Content-only updates retain the same parsing path; changing a schema requires a new application image before compatible bundles can be deployed. We exposed one unstable helper path while evaluating the extraction boundary, accepting that those helpers may change before separate packages establish it.
