export default defineAppConfig({
  duxt: {
    title: 'Content bundle example',
    locales: ['en-GB'],
    sources: [
      {
        path: 'examples/content-bundles/site/docs',
        // The Docker packer has no Git or checkout history. Opt out explicitly.
        history: false
      }
    ]
  }
});
