# Security policy

## Supported versions

Synaesthete is a static, client-side application. The latest commit on `main`
is the only "supported version" — there is no server, no auth, and no
persistent data outside the user's browser.

## Reporting a vulnerability

If you find something:

- For issues that are not exploitable on the user's machine (typos in shader
  math, dropped frames, broken UI), open a GitHub issue.
- For anything you'd consider a vulnerability — including XSS via injected
  audio/video sources, prototype pollution, or a way to exfiltrate the
  user's mic/camera frames off-device — please email **baditaflorin@gmail.com**
  with details before disclosing publicly.

We aim to acknowledge within 7 days.
