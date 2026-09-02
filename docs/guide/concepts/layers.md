---
title: Layers
description: What a Nuxt layer gives you, and what it takes away.
icon: lucide:layers
---

duxt is a layer, not a template. You extend it and every file it ships becomes
overridable by putting a file of the same name in your own project.

## Overriding a component

Drop `app/components/DuxtHeader.vue` into your project and yours wins. No
configuration, no slot to thread a value through.

## Overriding a token

The palette is CSS variables. Redefine one in your own stylesheet:

```css
:root {
  --primary: oklch(0.55 0.2 260);
}
```

## What layers make harder

Every path inside the layer resolves against the **consumer** unless it is made
absolute. Stylesheet entries, component directories and collection paths have
all needed that treatment.
