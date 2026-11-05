/* 라우팅 & 섹션 마운트 */
(function () {
  const { h } = GL.ui;
  const mounted = {};

  const SUBS = {
    left: {
      tension: (el) => GL.tension.mountExplorer(el),
      progression: (el) => GL.tension.mountProgression(el),
      quiz: (el) => GL.tension.mountQuiz(el)
    },
    right: {
      library: (el) => GL.rhythm.mountLibrary(el),
      separation: (el) => GL.rhythm.mountSeparation(el)
    }
  };

  function showSub(section, sub) {
    const view = document.getElementById('view-' + section);
    view.querySelectorAll('.subnav [data-sub]').forEach((b) => b.classList.toggle('active', b.dataset.sub === sub));
    view.querySelectorAll('.subpanel').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== sub));
    const key = section + ':' + sub;
    if (!mounted[key] && SUBS[section] && SUBS[section][sub]) {
      SUBS[section][sub](view.querySelector(`.subpanel[data-panel="${sub}"]`));
      mounted[key] = true;
    }
  }

  function route() {
    const raw = (location.hash || '#home').slice(1);
    const [section, param] = raw.split('/');
    const valid = ['home', 'left', 'right', 'single'];
    const sec = valid.includes(section) ? section : 'home';
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('hidden', v.id !== 'view-' + sec));
    document.querySelectorAll('.main-nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === sec));

    if (sec === 'left') showSub('left', param && SUBS.left[param] ? param : currentSub('left') || 'tension');
    if (sec === 'right') {
      if (!mounted.rightPlayer) { GL.rhythm.mountPlayer(document.getElementById('rhythm-player')); mounted.rightPlayer = true; }
      showSub('right', param && SUBS.right[param] ? param : currentSub('right') || 'library');
    }
    if (sec === 'single') {
      if (!mounted.single) { GL.single.mount(document.getElementById('single-root')); mounted.single = true; }
      GL.single.focus(param === 'left' ? 'left' : param === 'right' ? 'right' : null);
      if (param === 'left' || param === 'right') {
        const target = document.querySelector('.hand-card.' + param);
        if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
    }
    window.scrollTo({ top: 0 });
  }

  function currentSub(section) {
    const a = document.querySelector(`#view-${section} .subnav [data-sub].active`);
    return a ? a.dataset.sub : null;
  }

  document.querySelectorAll('.subnav [data-sub]').forEach((b) => {
    b.addEventListener('click', () => {
      const section = b.closest('.view').id.replace('view-', '');
      history.replaceState(null, '', '#' + section + '/' + b.dataset.sub);
      showSub(section, b.dataset.sub);
    });
  });

  // 스페이스바: 현재 보이는 섹션의 재생/정지
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || /INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) return;
    const btn = [...document.querySelectorAll('.view:not(.hidden) .btn-play')].find((b) => b.offsetParent !== null);
    if (btn) { e.preventDefault(); btn.click(); }
  });

  window.addEventListener('hashchange', route);
  route();
  void h;
})();
