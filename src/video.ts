const log = (...msg) => console.log('video', ...msg); // eslint-disable-line no-console

export interface WebCamConfig {
  element: string | HTMLVideoElement | undefined,
  src: string | undefined,
  debug: boolean,
  mode: 'front' | 'back',
  crop: boolean,
  width: number,
  height: number,
  visible: boolean,
}

export class video { // eslint-disable-line @typescript-eslint/no-extraneous-class
  public static config: WebCamConfig = {
    src: undefined,
    element: undefined,
    debug: false,
    mode: 'front',
    crop: false,
    width: 0,
    height: 0,
    visible: true,
  };

  public static element: HTMLVideoElement | undefined;
  private static stream: MediaStream | undefined;

  public static get track(): MediaStreamTrack | undefined {
    if (!video.stream) return undefined;
    return video.stream.getVideoTracks()[0];
  }

  public static get capabilities(): MediaTrackCapabilities | undefined { // eslint-disable-line no-undef
    if (!video.track) return undefined;
    return video.track.getCapabilities ? video.track.getCapabilities() : undefined;
  }

  public static get constraints(): MediaTrackConstraints | undefined { // eslint-disable-line no-undef
    if (!video.track) return undefined;
    return video.track.getConstraints ? video.track.getConstraints() : undefined;
  }

  public static get settings(): MediaTrackSettings | undefined { // eslint-disable-line no-undef
    if (!video.stream) return undefined;
    const track: MediaStreamTrack = video.stream.getVideoTracks()[0];
    return track.getSettings ? track.getSettings() : undefined;
  }

  public static get label(): string {
    if (!video.track) return '';
    return video.track.label;
  }

  public static get paused(): boolean {
    return video.element?.paused || false;
  }

  public static get width(): number {
    return video.element?.videoWidth || 0;
  }

  public static get height(): number {
    return video.element?.videoHeight || 0;
  }

  private static create(): void {
    // use or create dom element
    if (video.config?.element) {
      if (typeof video.config.element === 'string') {
        const el = document.getElementById(video.config.element);
        if (el && el instanceof HTMLVideoElement) video.element = el;
        else if (video.config.debug) log('cannot get dom element', video.config.element);
      } else if (video.config.element instanceof HTMLVideoElement) video.element = video.config.element;
      else if (video.config.debug) log('unknown dom element', video.config.element);
    } else {
      video.element = document.createElement('video');
    }
    if (!video.element) return;
    // set default event listeners
    video.element.addEventListener('play', () => { if (video.config.debug) log('play'); });
    video.element.addEventListener('pause', () => { if (video.config.debug) log('pause'); });
    video.element.onclick = async () => { // pause when clicked on screen and resume on next click
      if (!video.element) return;
      if (video.element.paused) await video.element.play();
      else video.element.pause();
    };
    if (video.config?.visible) video.element.style.visibility = video.config?.visible ? 'visible' : 'hidden';
  }

  public static start = async (webcamConfig?: Partial<WebCamConfig>): Promise<void> => {
    // set config
    if (webcamConfig?.debug) video.config.debug = webcamConfig?.debug;
    if (webcamConfig?.crop) video.config.crop = webcamConfig?.crop;
    if (webcamConfig?.mode) video.config.mode = webcamConfig?.mode;
    if (webcamConfig?.width) video.config.width = webcamConfig?.width;
    if (webcamConfig?.height) video.config.height = webcamConfig?.height;
    if (webcamConfig?.element) video.config.element = webcamConfig?.element;
    video.config.src = webcamConfig?.src;

    video.create();
    if (!video.element) return;

    if (video.config.src) {
      await this.uri();
      return;
    }

    // set constraints to use
    const requestedConstraints: DisplayMediaStreamConstraints = { // eslint-disable-line no-undef
      audio: false,
      video: {
        facingMode: video.config.mode === 'front' ? 'user' : 'environment',
        // @ts-ignore // resizeMode is still not defined in tslib
        resizeMode: video.config.crop ? 'crop-and-scale' : 'none',
        width: { ideal: video.config.width > 0 ? video.config.width : window.innerWidth },
        height: { ideal: video.config.height > 0 ? video.config.height : window.innerHeight },
      },
    };

    // get webcam and set it to run in dom element
    if (!navigator?.mediaDevices) {
      if (video.config.debug) log('no devices');
      return;
    }
    try {
      video.stream = await navigator.mediaDevices.getUserMedia(requestedConstraints); // get stream that satisfies constraints
    } catch (err) {
      log(err);
      return;
    }
    if (!video.stream) {
      if (video.config.debug) log('no stream');
      return;
    }
    video.element.src = '';
    video.element.srcObject = video.stream; // assign it to dom element
    const ready = new Promise((resolve) => { // wait until stream is ready
      if (!video.element) resolve(false);
      else video.element.onloadeddata = () => resolve(true);
    });
    await ready;
    await video.element.play(); // start playing

    if (video.config.debug) {
      log({
        width: video.width,
        height: video.height,
        label: video.label,
        src: video.element?.src,
        stream: video.stream,
        track: video.track,
        settings: video.settings,
        constraints: video.constraints,
        capabilities: video.capabilities,
      });
    }
  };

  private static uri = async (): Promise<void> => {
    if (!video.element) return;
    if (video.element.srcObject) video.element.srcObject = null;
    video.element.src = video.config.src as string;
    const ready = new Promise((resolve) => { // wait until stream is ready
      if (!video.element) resolve(false);
      else video.element.onloadeddata = () => resolve(true);
    });
    await ready;
    await video.element.play(); // start playing
  };

  public static stop = (): void => {
    if (video.config.debug) log('stop');
    if (video.track) video.track.stop();
  };
}
