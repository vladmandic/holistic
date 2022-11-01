const log = (...msg) => console.log('webcam', ...msg); // eslint-disable-line no-console

export interface WebCamConfig {
  element: string | HTMLVideoElement | undefined,
  debug: boolean,
  mode: 'front' | 'back',
  crop: boolean,
  width: number,
  height: number,
}

export class webcam { // eslint-disable-line @typescript-eslint/no-extraneous-class
  public static config: WebCamConfig = {
    element: undefined,
    debug: true,
    mode: 'front',
    crop: false,
    width: 0,
    height: 0,
  };

  public static element: HTMLVideoElement | undefined;
  private static stream: MediaStream | undefined;

  public static get track(): MediaStreamTrack | undefined {
    if (!webcam.stream) return undefined;
    return webcam.stream.getVideoTracks()[0];
  }

  public static get capabilities(): MediaTrackCapabilities | undefined { // eslint-disable-line no-undef
    if (!webcam.track) return undefined;
    return webcam.track.getCapabilities ? webcam.track.getCapabilities() : undefined;
  }

  public static get constraints(): MediaTrackConstraints | undefined { // eslint-disable-line no-undef
    if (!webcam.track) return undefined;
    return webcam.track.getConstraints ? webcam.track.getConstraints() : undefined;
  }

  public static get settings(): MediaTrackSettings | undefined { // eslint-disable-line no-undef
    if (!webcam.stream) return undefined;
    const track: MediaStreamTrack = webcam.stream.getVideoTracks()[0];
    return track.getSettings ? track.getSettings() : undefined;
  }

  public static get label(): string {
    if (!webcam.track) return '';
    return webcam.track.label;
  }

  public static get paused(): boolean {
    return webcam.element?.paused || false;
  }

  public static get width(): number {
    return webcam.element?.videoWidth || 0;
  }

  public static get height(): number {
    return webcam.element?.videoHeight || 0;
  }

  public static start = async (webcamConfig?: Partial<WebCamConfig>): Promise<void> => {
    // set config
    if (webcamConfig?.debug) webcam.config.debug = webcamConfig?.debug;
    if (webcamConfig?.crop) webcam.config.crop = webcamConfig?.crop;
    if (webcamConfig?.mode) webcam.config.mode = webcamConfig?.mode;
    if (webcamConfig?.width) webcam.config.width = webcamConfig?.width;
    if (webcamConfig?.height) webcam.config.height = webcamConfig?.height;

    // use or create dom element
    if (webcamConfig?.element) {
      if (typeof webcamConfig.element === 'string') {
        const el = document.getElementById(webcamConfig.element);
        if (el && el instanceof HTMLVideoElement) {
          webcam.element = el;
        } else {
          if (webcam.config.debug) log('cannot get dom element', webcamConfig.element);
          return;
        }
      } else if (webcamConfig.element instanceof HTMLVideoElement) {
        webcam.element = webcamConfig.element;
      } else {
        if (webcam.config.debug) log('unknown dom element', webcamConfig.element);
        return;
      }
    } else {
      webcam.element = document.createElement('video');
    }

    // set constraints to use
    const requestedConstraints: DisplayMediaStreamConstraints = { // eslint-disable-line no-undef
      audio: false,
      video: {
        facingMode: webcam.config.mode === 'front' ? 'user' : 'environment',
        // @ts-ignore // resizeMode is still not defined in tslib
        resizeMode: webcam.config.crop ? 'crop-and-scale' : 'none',
        width: { ideal: webcam.config.width > 0 ? webcam.config.width : window.innerWidth },
        height: { ideal: webcam.config.height > 0 ? webcam.config.height : window.innerHeight },
      },
    };

    // set default event listeners
    webcam.element.addEventListener('play', () => { if (webcam.config.debug) log('play'); });
    webcam.element.addEventListener('pause', () => { if (webcam.config.debug) log('pause'); });
    webcam.element.addEventListener('click', async () => { // pause when clicked on screen and resume on next click
      if (!webcam.element || !webcam.stream) return;
      if (webcam.element.paused) await webcam.element.play();
      else webcam.element.pause();
    });

    // get webcam and set it to run in dom element
    if (!navigator?.mediaDevices) {
      if (webcam.config.debug) log('no devices');
      return;
    }
    try {
      webcam.stream = await navigator.mediaDevices.getUserMedia(requestedConstraints); // get stream that satisfies constraints
    } catch (err) {
      log(err);
      return;
    }
    if (!webcam.stream) {
      if (webcam.config.debug) log('no stream');
      return;
    }
    webcam.element.srcObject = webcam.stream; // assign it to dom element
    const ready = new Promise((resolve) => { // wait until stream is ready
      if (!webcam.element) resolve(false);
      else webcam.element.onloadeddata = () => resolve(true);
    });
    await ready;
    await webcam.element.play(); // start playing

    if (webcam.config.debug) {
      log({
        width: webcam.width,
        height: webcam.height,
        label: webcam.label,
        stream: webcam.stream,
        track: webcam.track,
        settings: webcam.settings,
        constraints: webcam.constraints,
        capabilities: webcam.capabilities,
      });
    }
  };

  public static stop = (): void => {
    if (webcam.config.debug) log('stop');
    if (webcam.track) webcam.track.stop();
  };
}
