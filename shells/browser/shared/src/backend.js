/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Do not use imports or top-level requires here!
// Running module factories is intentionally delayed until we know the hook exists.
// This is to avoid issues like: https://github.com/facebook/react-devtools/issues/1039

function welcome(event) {
  if (
    event.source !== window ||
    event.data.source !== 'relay-devtools-content-script'
  ) {
    return;
  }

  window.removeEventListener('message', welcome);

  setup(window.__RELAY_DEVTOOLS_HOOK__);
}

window.addEventListener('message', welcome);

function setup(hook) {
  const Agent = require('src/backend/agent').default;
  const Bridge = require('src/bridge').default;
  const { initBackend } = require('src/backend');

  const bridge = new Bridge({
    listen(fn) {
      const listener = event => {
        if (
          event.source !== window ||
          !event.data ||
          event.data.source !== 'relay-devtools-content-script' ||
          !event.data.payload
        ) {
          return;
        }
        fn(event.data.payload);
      };
      window.addEventListener('message', listener);
      return () => {
        window.removeEventListener('message', listener);
      };
    },
    send(event: string, payload: any, transferable?: Array<any>) {
      window.postMessage(
        {
          source: 'relay-devtools-bridge',
          payload: { event, payload },
        },
        '*',
        transferable
      );
    },
  });

  const agent = new Agent(bridge);
  agent.addListener('shutdown', () => {
    // If we received 'shutdown' from `agent`, we assume the `bridge` is already shutting down,
    // and that caused the 'shutdown' event on the `agent`, so we don't need to call `bridge.shutdown()` here.
    hook.emit('shutdown');
  });

  initBackend(hook, agent, window);
}
