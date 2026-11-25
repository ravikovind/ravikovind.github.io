(function initMotion() {
    const STORAGE_KEY = 'ravikovind-motion';
    const SWARM_KEY   = '__swarmline';

    function getSaved() {
        try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
    }
    function setSaved(val) {
        try { localStorage.setItem(STORAGE_KEY, val); } catch {}
    }

    function isRunning() {
        const sw = window[SWARM_KEY];
        return !!(sw && sw.app);
    }

    function swarmToggle() {
        const sw = window[SWARM_KEY];
        if (!sw) return;
        try { sw.toggle(); } catch(e) { console.error('[motion]', e); }
    }

    function lucideIcon(name) {
        const el = document.createElement('i');
        el.setAttribute('data-lucide', name);
        el.setAttribute('aria-hidden', 'true');
        return el;
    }

    function buildFab() {
        const btn = document.createElement('button');
        btn.id = 'motion-toggle';
        btn.className = 'motion-fab';
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Start tour');
        return btn;
    }

    function syncUI(fab) {
        const on = isRunning();
        fab.setAttribute('aria-pressed', String(on));
        fab.setAttribute('aria-label', on ? 'Stop tour' : 'Start tour');
        fab.classList.toggle('is-on', on);
        fab.innerHTML = '';
        fab.appendChild(lucideIcon(on ? 'stop-circle' : 'crosshair'));
        const label = document.createElement('span');
        label.textContent = on ? 'Stop Tour' : 'Page Tour';
        fab.appendChild(label);
        if (window.lucide) window.lucide.createIcons({ nodes: [fab] });
        document.documentElement.setAttribute('data-motion', on ? 'on' : 'off');
    }

    function buildPrompt(fab) {
        const prompt = document.createElement('div');
        prompt.id = 'motion-prompt';
        prompt.setAttribute('role', 'dialog');
        prompt.setAttribute('aria-label', 'Page Tour prompt');
        prompt.style.cssText = [
            'position:fixed',
            'bottom:100px',
            'left:50%',
            'transform:translateX(-50%) translateY(24px)',
            'background:#f3eee3',
            'border:2px solid #111111',
            'border-radius:21px',
            'padding:27px 30px 24px',
            'display:flex',
            'flex-direction:column',
            'align-items:center',
            'gap:15px',
            'font-family:inherit',
            'font-size:21px',
            'color:#111111',
            'box-shadow:0 12px 48px rgba(17,17,17,0.14)',
            'z-index:999997',
            'opacity:0',
            'transition:opacity 0.25s ease,transform 0.25s ease',
            'max-width:390px',
            'width:calc(100vw - 32px)',
            'text-align:center',
            'pointer-events:all',
        ].join(';');

        const title = document.createElement('p');
        title.style.cssText = 'margin:0;font-weight:700;font-size:15px;letter-spacing:-0.01em;';
        title.textContent = 'Take a Page Tour?';

        const sub = document.createElement('p');
        sub.style.cssText = 'margin:0;font-size:12px;color:#6b6b6b;line-height:1.5;';
        sub.textContent = 'Animate and highlight every element on this page';

        const btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:12px;width:100%;margin-top:3px;';

        const yes = document.createElement('button');
        yes.style.cssText = [
            'flex:1',
            'background:#eb1d25',
            'color:#f3eee3',
            'border:none',
            'border-radius:12px',
            'padding:14px 18px',
            'font-size:19px',
            'font-weight:600',
            'cursor:pointer',
            'font-family:inherit',
            'transition:opacity 0.15s',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'gap:8px',
        ].join(';');
        const yesIco = lucideIcon('crosshair');
        yesIco.style.cssText = 'width:20px;height:20px;display:flex;flex-shrink:0;';
        yes.appendChild(yesIco);
        const yesLabel = document.createElement('span');
        yesLabel.textContent = 'Start Tour';
        yes.appendChild(yesLabel);

        const skip = document.createElement('button');
        skip.style.cssText = [
            'flex:1',
            'background:transparent',
            'color:#111111',
            'border:1.5px solid #ddd8ce',
            'border-radius:12px',
            'padding:14px 18px',
            'font-size:19px',
            'cursor:pointer',
            'font-family:inherit',
            'transition:border-color 0.15s',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'gap:8px',
        ].join(';');
        const skipIco = lucideIcon('x');
        skipIco.style.cssText = 'width:20px;height:20px;display:flex;flex-shrink:0;';
        skip.appendChild(skipIco);
        const skipLabel = document.createElement('span');
        skipLabel.textContent = 'Skip';
        skip.appendChild(skipLabel);

        btns.appendChild(yes);
        btns.appendChild(skip);
        prompt.appendChild(title);
        prompt.appendChild(sub);
        prompt.appendChild(btns);
        document.body.appendChild(prompt);
        if (window.lucide) window.lucide.createIcons({ nodes: [yes, skip] });

        // Animate in after paint
        requestAnimationFrame(() => requestAnimationFrame(() => {
            prompt.style.opacity = '1';
            prompt.style.transform = 'translateX(-50%) translateY(0)';
        }));

        function dismiss() {
            prompt.style.opacity = '0';
            prompt.style.transform = 'translateX(-50%) translateY(16px)';
            setTimeout(() => { if (prompt.parentNode) prompt.remove(); }, 280);
        }

        yes.addEventListener('click', () => {
            dismiss();
            swarmToggle();
            setTimeout(() => syncUI(fab), 50);
            setSaved('on');
        });

        skip.addEventListener('click', () => {
            dismiss();
            setSaved('off');
            syncUI(fab);
        });
    }

    function tryStart(fab) {
        if (window[SWARM_KEY]) {
            swarmToggle();
            setTimeout(() => syncUI(fab), 50);
        } else {
            let attempts = 0;
            const poll = setInterval(() => {
                attempts++;
                if (window[SWARM_KEY]) {
                    clearInterval(poll);
                    swarmToggle();
                    setTimeout(() => syncUI(fab), 50);
                } else if (attempts > 30) {
                    clearInterval(poll);
                }
            }, 100);
        }
    }

    function afterLoad(fn) {
        if (document.readyState === 'complete') {
            setTimeout(fn, 2000);
        } else {
            window.addEventListener('load', () => setTimeout(fn, 2000), { once: true });
        }
    }

    function init() {
        const fab = buildFab();
        document.body.appendChild(fab);

        fab.addEventListener('click', () => {
            swarmToggle();
            setTimeout(() => {
                syncUI(fab);
                setSaved(isRunning() ? 'on' : 'off');
            }, 50);
        });

        const saved = getSaved();

        if (saved === null) {
            // First visit: show prompt after page settles
            syncUI(fab);
            afterLoad(() => buildPrompt(fab));
        } else if (saved === 'on') {
            // Returning visitor who said Yes: auto-start
            afterLoad(() => tryStart(fab));
        } else {
            // Returning visitor who said Skip
            syncUI(fab);
        }

        document.addEventListener('visibilitychange', () => {
            const sw = window[SWARM_KEY];
            if (!sw) return;
            if (document.hidden && sw.app) sw.stop();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
