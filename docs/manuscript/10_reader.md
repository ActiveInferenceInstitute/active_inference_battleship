```{=html}
<script>
/* Integrate the pinned MathJax 4 reader controls and native preference values. */
(() => {
  // Keep the illustrated opening before the contents in the actual reading order.
  const contents = document.getElementById('TOC');
  const finalPlate = document.getElementById('visual-decisions');
  if (contents && finalPlate) finalPlate.after(contents);
  /* Initial mathematical-rendering dependency: begin */
  const notice = document.querySelector('.paper-math-loading');
  const status = document.getElementById('paper-math-status');
  const retry = document.getElementById('paper-math-retry');
  const dependency = document.querySelector('script[src*="mathjax@4.0.0/tex-chtml.js"]');
  const publishMathState = (phase, cause = null) => {
    window.battleshipMathReaderState = {phase, cause};
    notice.dataset.state = phase;
    notice.setAttribute('aria-busy', String(phase === 'loading'));
    status.setAttribute('role', phase === 'error' ? 'alert' : 'status');
    status.textContent = phase === 'ready' ? 'Mathematical notation is ready.'
      : phase === 'loading' ? 'Loading mathematical notation.'
      : cause === 'timeout' ? 'Mathematical notation timed out after 30 seconds. Retry or open an edition below.'
      : 'Mathematical notation could not load. Check your connection, then retry or open an edition below.';
    retry.disabled = phase !== 'error';
  };
  retry.addEventListener('click', () => window.location.reload());
  publishMathState('loading');
  let deadline;
  let stopObservingDependency = () => {};
  let failed = false;
  const documentReady = document.readyState === 'loading'
    ? new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, {once: true}))
    : Promise.resolve();
  const dependencyReady = new Promise((resolve, reject) => {
    const fail = () => reject(new Error('Mathematical notation dependency did not load'));
    const check = () => {
      if (typeof window.MathJax?.startup?.promise?.then !== 'function') fail();
      else resolve();
    };
    if (!dependency) { fail(); return; }
    dependency.addEventListener('error', fail, {once: true});
    dependency.addEventListener('load', check, {once: true});
    // A failed defer script can report its error before this body script exists.
    // DOMContentLoaded settles only after that defer request has finished.
    documentReady.then(check);
    stopObservingDependency = () => {
      dependency.removeEventListener('error', fail);
      dependency.removeEventListener('load', check);
    };
  });
  const timedOut = new Promise((resolve, reject) => {
    deadline = setTimeout(() => reject(new Error('timeout')), 30000);
  });
  /* Initial mathematical-rendering dependency: end */
  /* ClearSpeak request lifetime: begin */
  const initializeMathMenu = Promise.all([documentReady, dependencyReady]).then(async () => {
    await window.MathJax.startup.promise;
    if (failed) return; // A late request cannot install controls after timeout.
    /* Native ClearSpeak adapter: begin */
    const registry = window.MathJax.startup.document.menu.menu.constructor.DynamicSubmenus;
    const entry = registry?.get('Clearspeak');
    if (!(registry instanceof Map) || !Array.isArray(entry) || typeof entry[0] !== 'function') {
      throw new Error('Unsupported MathJax ClearSpeak menu registry');
    }
    const [build, setting] = entry;
    const requests = new WeakMap();
    registry.set('Clearspeak', [(menu, parent, complete) => {
      const item = menu.mathItem;
      if (!item) throw new Error('ClearSpeak requires an active mathematical expression');
      const token = {};
      requests.set(menu, token);
      // Native unpost clears menu.mathItem while the real speech worker is pending.
      const snapshot = Object.create(menu, {mathItem: {value: item, writable: true}});
      return build(snapshot, parent, submenu => {
        // A dismissed or superseded request must not replace the current submenu.
        if (requests.get(menu) === token && menu.mathItem === item) {
          /* Dynamic submenu replacement: begin */
          const previous = parent.submenu;
          const wasPosted = previous?.isPosted();
          if (previous && previous !== submenu) previous.unpost();
          complete(submenu);
          if (wasPosted && parent.html.isConnected && parent.menu.focused === parent && !parent.disabled) submenu.post();
          /* Dynamic submenu replacement: end */
        }
      });
    }, setting]);
    /* Native ClearSpeak adapter: end */
  });
  window.battleshipMathMenuReady = Promise.race([initializeMathMenu, timedOut]).then(() => {
    clearTimeout(deadline);
    stopObservingDependency();
    publishMathState('ready');
  }, error => {
    failed = true;
    clearTimeout(deadline);
    stopObservingDependency();
    publishMathState('error', error.message === 'timeout' ? 'timeout' : String(error));
    throw error;
  });
  // Keep readiness failure observable to callers, with visible recovery feedback,
  // without producing an additional unhandled promise rejection.
  window.battleshipMathMenuReady.catch(() => {});
  /* ClearSpeak request lifetime: end */
  let nextTooltip = 0;
  /* Preference Escape scope: begin */
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const visible = element => element.getClientRects().length > 0;
    if ([...document.querySelectorAll('.CtxtMenu_ContextMenu')].some(visible)) return;
    const dialog = [...document.querySelectorAll('.CtxtMenu_Info[role="dialog"]')].filter(visible).at(-1);
    if (!dialog?.classList.contains('CtxtMenu_Selection')) return;
    const close = dialog.querySelector('.CtxtMenu_InfoClose');
    if (!close) throw new Error('Native preference Close is unavailable');
    event.preventDefault();
    event.stopImmediatePropagation();
    close.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, button: 0}));
  }, true);
  /* Preference Escape scope: end */
  const boundMenus = () => {
    // Change visible native preference copy, never the option values or handlers.
    document.querySelectorAll('.CtxtMenu_Selection').forEach(dialog => {
      const walker = document.createTreeWalker(dialog, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const original = node.textContent;
        if (!/[a-z][A-Z]/.test(original)) continue;
        const words = original.replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/\bFrac\b/g, 'fraction').replace(/\bImplied Times\b/g, 'implied multiplication');
        const readable = words.replace(/\b([A-Z])([a-z]+)\b/g,
          (word, first, rest, offset) => offset === words.search(/\S/) ? word : first.toLowerCase() + rest);
        if (readable !== original) node.textContent = readable;
      }
    });
    document.querySelectorAll('.CtxtMenu_MenuSlider').forEach(slider => {
      const input = slider.querySelector('input[type="range"]');
      const label = slider.firstElementChild;
      if (!input || !label?.id) return;
      const context = [...(slider.previousElementSibling?.childNodes || [])]
        .filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
      const text = `${context || 'Highlight'} opacity`;
      if (label.textContent !== text) label.textContent = text;
      if (slider.getAttribute('role') !== 'group') slider.setAttribute('role', 'group');
      if (slider.getAttribute('aria-labelledby') !== label.id) slider.setAttribute('aria-labelledby', label.id);
      if (input.getAttribute('aria-labelledby') !== label.id) input.setAttribute('aria-labelledby', label.id);
    });
    document.querySelectorAll('.CtxtMenu_Info[role="dialog"]').forEach(dialog => {
      if (!dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby')) {
        const title = dialog.querySelector('.CtxtMenu_InfoTitle')?.textContent.trim();
        dialog.setAttribute('aria-label', title || 'Mathematical expression information');
      }
      const close = dialog.querySelector('.CtxtMenu_InfoClose');
      const title = dialog.querySelector('.CtxtMenu_InfoTitle');
      if (dialog.classList.contains('CtxtMenu_Selection') && close && title && close.parentElement !== title) {
        title.append(close); // Keep the native close control inside the sticky header.
      }
      if (close && !close.querySelector('.paper-math-tooltip')) {
        const tooltip = document.createElement('span');
        tooltip.className = 'paper-math-tooltip';
        tooltip.id = `paper-math-close-tip-${++nextTooltip}`;
        tooltip.setAttribute('role', 'tooltip');
        tooltip.textContent = 'Close';
        close.append(tooltip);
        close.setAttribute('aria-describedby', [close.getAttribute('aria-describedby'), tooltip.id].filter(Boolean).join(' '));
      }
    });
    if (innerWidth <= 600) return; // The compact CSS cascade owns these positions.
    document.querySelectorAll('.CtxtMenu_ContextMenu[role="menu"]').forEach((menu, index, menus) => {
      const rect = menu.getBoundingClientRect();
      const parentMenu = menus[index - 1];
      const parent = parentMenu?.getBoundingClientRect();
      const trigger = parentMenu?.querySelector('.CtxtMenu_MenuActive[aria-haspopup="true"]');
      const adjacent = parent && (parent.right - 1 + rect.width <= innerWidth - 12
        ? parent.right - 1 : parent.left - rect.width + 1);
      const left = Math.max(12, Math.min(adjacent ?? rect.left, innerWidth - rect.width - 12));
      const anchorTop = trigger?.getBoundingClientRect().top ?? rect.top;
      const top = Math.max(12, Math.min(anchorTop, innerHeight - rect.height - 12));
      for (const [name, value] of [['position', 'fixed'], ['left', `${left}px`], ['top', `${top}px`]]) {
        if (menu.style.getPropertyValue(name) !== value) menu.style.setProperty(name, value);
      }
    });
  };
  new MutationObserver(boundMenus).observe(document.body, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['style']
  });
  addEventListener('resize', boundMenus);
  document.addEventListener('scroll', boundMenus, true);
})();
</script>
```
