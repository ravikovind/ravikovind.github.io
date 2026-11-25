(function initMotion() {
    const STORAGE_KEY = 'ravikovind-motion';
    const SWARM_KEY   = '__swarmline';

    const prefersReduced = () =>
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    function renderIcon(fab, name) {
        fab.innerHTML = '';
        fab.appendChild(lucideIcon(name));
        if (window.lucide) window.lucide.createIcons({ nodes: [fab] });
    }

    function buildFab() {
        const btn = document.createElement('button');
        btn.id = 'motion-toggle';
        btn.className = 'motion-fab';
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Start scan');
        return btn;
    }

    function syncUI(fab) {
        const on = isRunning();
        fab.setAttribute('aria-pressed', String(on));
        fab.setAttribute('aria-label', on ? 'Stop scan' : 'Start scan');
        fab.classList.toggle('is-on', on);
        fab.innerHTML = '';
        fab.appendChild(lucideIcon(on ? 'stop-circle' : 'crosshair'));
        const label = document.createElement('span');
        label.textContent = on ? 'Stop Scan' : 'Quick Scan All';
        fab.appendChild(label);
        if (window.lucide) window.lucide.createIcons({ nodes: [fab] });
        document.documentElement.setAttribute('data-motion', on ? 'on' : 'off');
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
        const startOn = saved !== 'off';

        if (startOn) {
            // Wait for page load + 2s, then confirm swarmline is ready before starting
            const tryStart = () => {
                if (window[SWARM_KEY]) {
                    swarmToggle();
                    setTimeout(() => syncUI(fab), 50);
                } else {
                    // swarmline not ready yet, poll every 100ms (max ~3s)
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
            };

            if (document.readyState === 'complete') {
                setTimeout(tryStart, 2000);
            } else {
                window.addEventListener('load', () => setTimeout(tryStart, 2000), { once: true });
            }
        } else {
            syncUI(fab);
        }

        document.addEventListener('visibilitychange', () => {
            const sw = window[SWARM_KEY];
            if (!sw) return;
            if (document.hidden && sw.app) sw.stop();
        });

        window.matchMedia('(prefers-reduced-motion: reduce)')
            .addEventListener('change', (e) => {
                if (e.matches && isRunning()) {
                    swarmToggle();
                    setTimeout(() => syncUI(fab), 50);
                }
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
