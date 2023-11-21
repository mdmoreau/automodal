export default (target, options) => {
  const reflow = () => {
    document.documentElement.scrollTop;
  };

  const animations = (element) => {
    return Promise.allSettled(element.getAnimations().map((animation) => animation.finished));
  };

  const getType = (target) => {
    const href = target.getAttribute('href');
    const type = target.getAttribute('data-automodal-type');

    if (type) {
      return type;
    }

    if (href.startsWith('#')) {
      return 'id';
    }

    if (href.includes('youtube.com/shorts/')) {
      return 'short';
    }

    if (href.includes('youtube.com') || href.includes('youtu.be')) {
      return 'youtube';
    }

    if (href.includes('tiktok.com')) {
      return 'tiktok';
    }

    if (href.includes('instagram.com/p/')) {
      return 'instagram';
    }

    if (href.includes('instagram.com/reel/')) {
      return 'reel';
    }

    if (href.includes('vimeo.com')) {
      return 'vimeo';
    }

    if (href.includes('google.com/maps/')) {
      return 'map';
    }

    return 'image';
  };

  const iframe = (src, title) => {
    return `<iframe src="${src}" ${title && `title="${title}"`} allow="autoplay; fullscreen;"></iframe>`;
  };

  const load = async (target) => {
    const href = target.getAttribute('href');
    const type = getType(target);
    const alt = target.getAttribute('data-automodal-alt') ?? '';
    const title = target.getAttribute('data-automodal-title') ?? '';

    if (type === 'fetch') {
      return (await (await fetch(href)).text()).trim();
    }

    if (type === 'iframe') {
      return iframe(href, title);
    }

    if (type === 'id') {
      return document.querySelector(href).outerHTML.trim();
    }

    if (type === 'short') {
      const id = href.split('/shorts/')[1];
      const src = `https://www.youtube.com/embed/${id}`;

      return iframe(src, title);
    }

    if (type === 'youtube') {
      let src = `https://www.youtube.com/embed/`;

      if (href.includes('youtube.com')) {
        src += href.split('v=')[1].replace('&', '?');
      }

      if (href.includes('youtu.be')) {
        src += href.split('youtu.be/')[1];
      }

      return iframe(src, title);
    }

    if (type === 'tiktok') {
      const id = href.split('/video/')[1];
      const src = `https://www.tiktok.com/embed/v2/${id}`;

      return iframe(src, title);
    }

    if (type === 'instagram') {
      const id = href.split('/p/')[1].split('/')[0];
      const src = `https://www.instagram.com/p/${id}/embed/captioned/`;

      return iframe(src, title);
    }

    if (type === 'reel') {
      const id = href.split('/reel/')[1].split('/')[0];
      const src = `https://www.instagram.com/reel/${id}/embed/captioned/`;

      return iframe(src, title);
    }

    if (type === 'vimeo') {
      const id = href.split('vimeo.com/')[1];
      const src = `https://player.vimeo.com/video/${id}`;

      return iframe(src, title);
    }

    if (type === 'map') {
      let src = 'https://www.google.com/maps/embed/v1/';

      if (href.includes('/maps/place/')) {
        const place = href.match('(?:/maps/place/)([^/]+)')[1];

        src += `place?key=${options.googleMapsAPIKey}&q=${place}`;
      }

      if (href.includes('/maps/@')) {
        const data = href.match('(?:/maps/@)([^z]+)')[1].split(',');

        src += `view?key=${options.googleMapsAPIKey}&center=${data[0]},${data[1]}&zoom=${data[2]}z`;
      }

      return iframe(src, title);
    }

    return `<img src="${href}" ${alt && `alt="${alt}"`}>`;
  };

  const item = async (target) => {
    const type = getType(target);
    const name = target.getAttribute('data-automodal') ?? '';
    const content = await load(target);
    const caption = target.getAttribute('data-automodal-caption') ?? '';

    return `
      <figure class="Automodal__item Automodal__item--${type} ${name && `Automodal__item--${name}`}">
        <div class="Automodal__content">${content}</div>
        ${caption && `<figcaption class="Automodal__caption">${caption}</figcaption>`}
      </figure>
    `;
  };

  target.addEventListener('click', (e) => {
    e.preventDefault();

    let updating = false;

    let index;
    let group = target.getAttribute('data-automodal-group') ?? '';

    if (group) {
      group = document.querySelectorAll(`[data-automodal-group="${group}"]`);
      index = [...group].indexOf(target);
    }

    const dialog = document.createElement('dialog');
    dialog.classList.add('Automodal');
    dialog.innerHTML = `
      <button class="Automodal__close" aria-label="Close"></button>
      <div class="Automodal__viewport"></div>
      ${group && `
        <button class="Automodal__nav Automodal__nav--prev" aria-label="Previous"></button>
        <button class="Automodal__nav Automodal__nav--next" aria-label="Next"></button>
      `}
    `;

    const viewport = dialog.querySelector('.Automodal__viewport');
    const prev = dialog.querySelector('.Automodal__nav--prev');
    const next = dialog.querySelector('.Automodal__nav--next');
    const close = dialog.querySelector('.Automodal__close');

    const insert = async (target) => {
      viewport.insertAdjacentHTML('beforeend', await item(target));
      target.dispatchEvent(new CustomEvent('load'));
    };

    const nav = async (dir) => {
      if (group && !updating) {
        const remove = viewport.firstElementChild;

        if (dir === 'prev') {
          index = index - 1 >= 0 ? index - 1 : group.length - 1;
        }

        if (dir === 'next') {
          index = index + 1 < group.length ? index + 1 : 0;
        }

        updating = true;
        dialog.classList.add(`Automodal--${dir}`);

        await insert(group[index]);
        const add = viewport.lastElementChild;
        add.classList.add('Automodal__item--add');

        reflow();
        add.classList.remove('Automodal__item--add');
        remove.classList.add('Automodal__item--remove');

        await animations(add);
        await animations(remove);
        remove.remove();

        dialog.classList.remove(`Automodal--${dir}`);
        updating = false;
      }
    };

    const remove = async () => {
      dialog.classList.remove('Automodal--active');
      await animations(dialog);
      dialog.close();
      dialog.remove();
    };

    const keydown = (e) => {
      if (e.key === 'ArrowLeft') {
        nav('prev');
      }

      if (e.key === 'ArrowRight') {
        nav('next');
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        remove();
      }
    };

    const build = async () => {
      document.body.append(dialog);
      dialog.showModal();
      await insert(target);
      reflow();
      dialog.classList.add('Automodal--active');
    };

    const outside = (e) => {
      if (e.target === dialog) {
        remove();
      }
    };

    const listen = () => {
      dialog.addEventListener('keydown', keydown);
      dialog.addEventListener('click', outside);
      prev?.addEventListener('click', () => { nav('prev') });
      next?.addEventListener('click', () => { nav('next') });
      close.addEventListener('click', remove);
    };

    const init = () => {
      build();
      listen();
    };

    init();
  });
}
