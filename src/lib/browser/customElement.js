import { ensureFeature } from './loadScript';

const createCustomElement = (
  tagName,
  createElementClass,
) => {
  const defineElement = () => {
    if (customElements.get(tagName)) {
      return;
    }

    // It's very important to declare the element class after
    // the polyfill have been loaded (if any). So we need to call
    // that createElementClass function to do this at the right time
    customElements.define(tagName, createElementClass());
  };

  return ensureFeature({
    check: () => window.customElements,
    load: () => import('@webcomponents/custom-elements'),
  }).then(defineElement);
};

module.exports = { createCustomElement };
