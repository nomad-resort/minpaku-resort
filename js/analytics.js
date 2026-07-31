(function () {
  const LINE_HOST = 'lin.ee';

  function citySlug() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (!parts.length) return 'home';
    if (parts[0].endsWith('.html')) return parts[0].replace(/\.html$/, '');
    return parts[0];
  }

  function textOf(element) {
    return (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  function sendEvent(name, params) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', name, {
      page_path: window.location.pathname,
      city_slug: citySlug(),
      ...params,
    });
  }

  function isLineUrl(url) {
    return url && url.hostname === LINE_HOST;
  }

  document.addEventListener('click', function (event) {
    const target = event.target.closest('a, button');
    if (!target) return;

    const label = textOf(target);
    const href = target.getAttribute('href') || '';
    const url = href ? new URL(href, window.location.href) : null;

    if (url && isLineUrl(url)) {
      const params = {
        lead_type: 'line',
        method: 'LINE',
        link_url: url.href,
        cta_text: label,
      };
      sendEvent('click_line', params);
      sendEvent('generate_lead', params);
      return;
    }

    if (href.startsWith('tel:')) {
      const params = {
        lead_type: 'phone',
        method: 'phone',
        link_url: href,
        cta_text: label,
      };
      sendEvent('click_phone', params);
      sendEvent('generate_lead', params);
      return;
    }

    if (href === '#contact' || /問い合わせ|お問合せ|相談|見積/.test(label)) {
      sendEvent('click_estimate', {
        cta_text: label,
        link_url: href,
      });
    }
  });

  document.addEventListener('submit', function (event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.id === 'contact-form' || form.name === 'contact') {
      sendEvent('generate_lead', {
        lead_type: 'form',
        method: 'contact_form',
        form_id: form.id || form.name || 'contact',
      });
      return;
    }

    if (form.id === 'sim-form') {
      sendEvent('calculate_estimate', {
        form_id: 'sim-form',
      });
    }
  });
})();
