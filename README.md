# Holistic

Holisting end-to-end detection and visualization of of body pose, hands with fingers, and face mesh  
Provided as both 2D overlay and fully reconstructed 3D scene  

## Notes

Written in **TypeScript** and transpiled to **JavaScript ECMAScript2020** using `@vladmandic/build` CI tool

Using:
- `@mediapipe/holistic` for ML detection & analysis: [Solution](https://google.github.io/mediapipe/solutions/holistic) | [Repository](https://github.com/google/mediapipe)
- `@babylonjs` for 3D rendering

## Install & Run

Transpiles and bundles solution and starts a dev web server: [HTTP](http://localhost:8001) | [HTTPS](https://localhost:8001)

> npm start

```js
INFO:  @vladmandic/holistic version 0.1.0
INFO:  User: vlado Platform: linux Arch: x64 Node: v18.10.0
INFO:  Application: { name: '@vladmandic/holistic', version: '0.1.0' }
INFO:  Environment: { profile: 'development', config: '.build.json', package: 'package.json', tsconfig: true, eslintrc: true, git: true }
INFO:  Toolchain: { build: '0.7.14', esbuild: '0.15.12', typescript: '4.8.4', typedoc: '0.23.19', eslint: '8.26.0' }
INFO:  Build: { profile: 'development', steps: [ 'serve', 'watch', 'lint', 'compile' ] }
STATE: WebServer: { ssl: false, port: 8000, root: '' }
STATE: WebServer: { ssl: true, port: 8001, root: '', sslKey: 'node_modules/@vladmandic/build/cert/https.key', sslCrt: 'node_modules/@vladmandic/build/cert/https.crt' }
STATE: Watch: { locations: [ 'src/**/*' ] }
STATE: Lint: { locations: [ '*.json', 'src/**/*.ts' ], files: 9, errors: 0, warnings: 0 }
STATE: Compile: { name: 'application', format: 'esm', platform: 'browser', input: 'src/index.ts', output: 'dist/index.js', files: 6, inputBytes: 94117, outputBytes: 9976829 }
INFO:  Listening...
DATA:  HTTPS: { method: 'GET', ver: '2.0', status: 200, mime: 'text/html', size: 1761, url: '/', remote: '::1' }
```

## Todo

- Support for video input
- Readme screenshots
- Live demo
