let activeView = $state<'gallery' | 'customer'>('gallery');
let transitionDirection = $state<1 | -1>(1);

export const viewStore = {
  get activeView() { return activeView; },
  get transitionDirection() { return transitionDirection; },
  setCustomer() {
    transitionDirection = 1;
    activeView = 'customer';
  },
  setGallery() {
    transitionDirection = -1;
    activeView = 'gallery';
  },
};
