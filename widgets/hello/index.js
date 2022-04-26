const { createCustomElement } = require('../../src/lib/browser/customElement');

const { WIDGET_TAG_NAME } = require('./tagname');

const ensureDependencies = () =>
  Promise.all([
    import('react'),
    import('react-dom'),
    import('./WidgetContainer'),
  ]);

createCustomElement(
  WIDGET_TAG_NAME,
  () =>
    class extends HTMLElement {
      unmount;

      connectedCallback() {
        const location = this.getAttribute('location');

        ensureDependencies().then(([React, { render, unmountComponentAtNode }, { WidgetContainer }]) => {
          if (!this.isConnected) {
            return;
          }

          this.unmount = unmountComponentAtNode;

          const props = { location };

          render(<WidgetContainer {...props} />, this);
        });
      }

      disconnectedCallback() {
        if (this.unmount) {
          this.unmount(this);
          delete this.unmount;
        }
      }
    },
).catch((error) =>
  console.error(`Could not load custom element ${WIDGET_TAG_NAME}: ${error.message}`),
);
