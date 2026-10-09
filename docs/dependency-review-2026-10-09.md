# Dependency review — 9 October 2026

Compatible, pinned updates applied before the demonstration APK:

| Package | Before | After | Reason |
| --- | --- | --- | --- |
| Capacitor core/Android/CLI | 7.4.3 | 7.6.9 | Block internal HTTP-proxy navigation and subframes; remove vulnerable CLI archive dependency. |
| React Router DOM | 7.8.2 | 7.18.4 | Current Router 7 fixes, including navigation validation and route matching. |
| Vite | 6.3.6 | 6.4.4 | Windows path/UNC access, source-map traversal and development-server access checks. |
| Vitest | 3.2.4 | 3.2.7 | Latest compatible Vitest 3 browser filesystem-access backport. |

The lockfile is updated; install scripts were disabled for these updates. Capacitor remains major 7 with JDK 21, target/compile SDK 35 and minimum SDK 23. No forced audit fix, permission bypass, or major application-stack migration was used. Production typecheck/build/native sync and Android tests/lint/assembly passed with these updates; final source/artifact results are recorded in the continuation handoff.

References: [Capacitor maintainer advisory](https://github.com/ionic-team/capacitor/security/advisories/GHSA-rvm3-566m-v7fv), [Capacitor 7.6.9 release](https://github.com/ionic-team/capacitor/releases/tag/7.6.9), [Vite 6.4.4 changelog](https://github.com/vitejs/vite/blob/v6.4.4/packages/vite/CHANGELOG.md), [Router changelog](https://github.com/remix-run/react-router/blob/react-router%407.18.4/packages/react-router/CHANGELOG.md), [Vitest 3.2.7 release](https://github.com/vitest-dev/vitest/releases/tag/v3.2.7).

## Remaining test-tool advisories

The full npm audit still reports **three vulnerable packages: one moderate and two critical**. They are `@vitest/mocker`, `tinypool` and the dependent `vitest` severity rollup. The separately executed **`npm audit --omit=dev` passes with zero reported runtime vulnerabilities**; a passing application build is not an empty full audit.

- [Tinypool worker-options prototype pollution](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) and [run-options prototype pollution](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) affect Vitest's development-only worker dependency. This application does not use Tinypool at runtime, expose test workers as a service, or pass incident input into worker options. These libraries are not bundled into the web/APK runtime. This is a reachability assessment of the present demonstration, not a claim that the dependencies are patched.
- [Vitest redirect-mock path traversal](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) remains in Vitest 3. The repository runs trusted local tests with `vitest run`/jsdom; it has no exposed Vitest browser/mock server. Dedicated browser checks use Playwright, not Vitest browser mode.

Keep test servers on loopback and run trusted repository tests only. A supported Vitest migration must address both transitive dependencies before enabling network-exposed test tooling or executing untrusted test configuration. Owner: the developer continuing integration. Review by **16 October 2026**, or before changing those conditions, whichever comes first. npm proposes a major Vitest upgrade; it was deferred from this APK delivery rather than forced without its migration checks.
