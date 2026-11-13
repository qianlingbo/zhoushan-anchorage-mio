export const MUSIC_URL = './assets/audio/nantian-cloud-steps.mp3';

export function createAmbient(view) {
  let audio, disposed = false, unavailable = false;
  let volume = .35, paused = true;
  const play = () => {
    try { audio.play()?.catch(() => {}); }
    catch { /* Audio permission or decoding failure must not block exploration. */ }
  };
  const failed = () => { unavailable = true; audio.volume = 0; audio.pause(); };
  const apply = () => {
    if (!audio || disposed || unavailable) return;
    audio.volume = paused ? 0 : volume * .7;
    if (paused || volume === 0) audio.pause();
    else if (audio.paused) play();
  };
  return {
    start() {
      if (audio || disposed || typeof view.Audio !== 'function') return;
      audio = new view.Audio(MUSIC_URL); audio.loop = true; audio.preload = 'auto';
      audio.id = 'ambient-music'; audio.hidden = true; audio.setAttribute('aria-hidden', 'true');
      view.document.body.append(audio);
      audio.addEventListener('error', failed);
      // Prime media permission in the cover's user gesture, keeping the atlas silent.
      audio.volume = 0; play(); apply();
    },
    setVolume(value) { volume = Math.max(0, Math.min(1, value)); apply(); },
    setPaused(value) { paused = value; apply(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (!audio) return;
      audio.pause(); audio.removeEventListener('error', failed);
      audio.removeAttribute('src'); audio.load(); audio.remove();
    },
  };
}
