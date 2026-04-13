/* ============================================================
   THEME.JS — SprayPro Theme JavaScript
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Cart Drawer ---------- */
  const CartDrawer = {
    drawer: null,
    body: null,
    footer: null,
    subtotal: null,

    init() {
      this.drawer = document.getElementById('CartDrawer');
      this.body = document.getElementById('CartDrawerBody');
      this.footer = document.getElementById('CartDrawerFooter');
      this.subtotal = document.getElementById('CartDrawerSubtotal');

      if (!this.drawer) return;

      /* Open triggers */
      document.querySelectorAll('[data-cart-open]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          this.open();
        });
      });

      /* Close triggers */
      document.querySelectorAll('[data-cart-close]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          this.close();
        });
      });

      /* Escape key */
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && this.drawer.classList.contains('is-open')) {
          this.close();
        }
      });
    },

    open() {
      this.drawer.classList.add('is-open');
      this.drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      this.refresh();
    },

    close() {
      this.drawer.classList.remove('is-open');
      this.drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    },

    async refresh() {
      try {
        const res = await fetch('/cart.js');
        const cart = await res.json();
        this.render(cart);
      } catch (err) {
        console.error('Cart fetch error:', err);
      }
    },

    render(cart) {
      if (!cart.items || cart.items.length === 0) {
        this.body.innerHTML = '<p class="cart-drawer__empty">Your cart is empty</p>';
        this.footer.style.display = 'none';
        return;
      }

      this.footer.style.display = '';
      this.subtotal.textContent = this.formatMoney(cart.total_price);

      this.body.innerHTML = cart.items.map(item => `
        <div class="cart-drawer__item" data-line-key="${item.key}">
          <img class="cart-drawer__item-image"
               src="${item.image ? item.image.replace(/(\.[^.]+)$/, '_160x160$1') : ''}"
               alt="${item.title}"
               width="80" height="80"
               loading="lazy">
          <div class="cart-drawer__item-info">
            <p class="cart-drawer__item-title">${item.product_title}</p>
            ${item.variant_title ? `<p class="cart-drawer__item-variant" style="font-size:0.8125rem;color:var(--color-text-secondary)">${item.variant_title}</p>` : ''}
            <p class="cart-drawer__item-price">${this.formatMoney(item.final_line_price)}</p>
            <div class="cart-drawer__item-qty">
              <button onclick="CartDrawer.updateItem('${item.key}', ${item.quantity - 1})" aria-label="Decrease quantity">−</button>
              <span style="min-width:20px;text-align:center;font-weight:600">${item.quantity}</span>
              <button onclick="CartDrawer.updateItem('${item.key}', ${item.quantity + 1})" aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>
      `).join('');
    },

    async updateItem(key, qty) {
      try {
        const res = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity: Math.max(0, qty) })
        });
        const cart = await res.json();
        this.render(cart);
        this.updateCartCount(cart.item_count);
      } catch (err) {
        console.error('Cart update error:', err);
      }
    },

    updateCartCount(count) {
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? '' : 'none';
      });
    },

    formatMoney(cents) {
      return '$' + (cents / 100).toFixed(2);
    }
  };

  /* Make globally available for inline onclick */
  window.CartDrawer = CartDrawer;

  /* ---------- Add to Cart (AJAX) ---------- */
  const AddToCart = {
    init() {
      document.querySelectorAll('form[data-add-to-cart]').forEach(form => {
        form.addEventListener('submit', async e => {
          e.preventDefault();
          const btn = form.querySelector('[type="submit"]');
          const originalText = btn.textContent;
          btn.textContent = 'Adding...';
          btn.disabled = true;

          try {
            const formData = new FormData(form);
            const res = await fetch('/cart/add.js', {
              method: 'POST',
              body: formData
            });

            if (!res.ok) throw new Error('Add to cart failed');

            const item = await res.json();

            btn.textContent = '✓ Added!';
            setTimeout(() => {
              btn.textContent = originalText;
              btn.disabled = false;
            }, 1500);

            CartDrawer.open();
          } catch (err) {
            console.error('Add to cart error:', err);
            btn.textContent = 'Error – Try Again';
            btn.disabled = false;
            setTimeout(() => { btn.textContent = originalText; }, 2000);
          }
        });
      });
    }
  };

  /* ---------- Quantity Selector ---------- */
  const QuantitySelector = {
    init() {
      document.querySelectorAll('.quantity-selector').forEach(wrapper => {
        const input = wrapper.querySelector('.quantity-selector__input');
        const minus = wrapper.querySelector('[data-qty-minus]');
        const plus = wrapper.querySelector('[data-qty-plus]');

        if (!input) return;

        minus && minus.addEventListener('click', () => {
          const val = parseInt(input.value, 10) || 1;
          input.value = Math.max(1, val - 1);
          input.dispatchEvent(new Event('change'));
        });

        plus && plus.addEventListener('click', () => {
          const val = parseInt(input.value, 10) || 1;
          input.value = val + 1;
          input.dispatchEvent(new Event('change'));
        });
      });
    }
  };

  /* ---------- Scroll Animations ---------- */
  const ScrollAnimations = {
    init() {
      if (!('IntersectionObserver' in window)) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

      document.querySelectorAll('[data-animate]').forEach(el => {
        observer.observe(el);
      });
    }
  };

  /* ---------- Mobile Menu ---------- */
  const MobileMenu = {
    init() {
      const toggle = document.querySelector('[data-menu-toggle]');
      const menu = document.querySelector('[data-mobile-menu]');
      if (!toggle || !menu) return;

      toggle.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });
    }
  };

  /* ---------- Variant Selector ---------- */
  const VariantSelector = {
    init() {
      const selectors = document.querySelectorAll('[data-variant-select]');
      if (!selectors.length) return;

      selectors.forEach(select => {
        select.addEventListener('change', () => {
          const variantId = select.value;
          const priceEl = document.querySelector('[data-product-price]');
          const compareEl = document.querySelector('[data-compare-price]');
          const addBtn = document.querySelector('[data-add-btn]');
          const variantInput = document.querySelector('input[name="id"]');

          if (variantInput) variantInput.value = variantId;

          /* Find variant data */
          const productData = window.productJSON;
          if (!productData) return;

          const variant = productData.variants.find(v => v.id == variantId);
          if (!variant) return;

          /* Update price */
          if (priceEl) priceEl.textContent = '$' + (variant.price / 100).toFixed(2);

          /* Update compare price */
          if (compareEl) {
            if (variant.compare_at_price && variant.compare_at_price > variant.price) {
              compareEl.textContent = '$' + (variant.compare_at_price / 100).toFixed(2);
              compareEl.style.display = '';
            } else {
              compareEl.style.display = 'none';
            }
          }

          /* Update availability */
          if (addBtn) {
            if (variant.available) {
              addBtn.disabled = false;
              addBtn.textContent = 'Add to Cart';
            } else {
              addBtn.disabled = true;
              addBtn.textContent = 'Sold Out';
            }
          }
        });
      });
    }
  };

  /* ---------- Init Everything ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    CartDrawer.init();
    AddToCart.init();
    QuantitySelector.init();
    ScrollAnimations.init();
    MobileMenu.init();
    VariantSelector.init();
  });
})();
