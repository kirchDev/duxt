// The consuming site's own config, merged over the layer's defaults. This is
// also the example: legal links belong to whoever runs the site, never to the
// template, so the layer ships the row empty and kirchDev fills it here.
export default defineAppConfig({
  duxt: {
    footer: {
      copyright: `© ${new Date().getFullYear()} IT-Dienstleistungen Titus Kirch`,
      legal: [
        {
          label: 'Impressum',
          to: 'https://kirch.dev/impressum',
          external: true
        },
        {
          label: 'Datenschutz',
          to: 'https://kirch.dev/datenschutz',
          external: true
        }
      ]
    }
  }
});
