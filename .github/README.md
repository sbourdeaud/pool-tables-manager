# GitHub Actions

## Validation

`ci.yml` runs on pushes and pull requests targeting `master`, `main`, `develop`,
and `release`. All three jobs are blocking:

- **Workflow validation:** release/image policy tests and actionlint.
- **Backend lint and PostgreSQL tests:** lint, Prisma generation, migrations, and
  one Jest invocation with coverage. Session, payment, and backup/restore suites
  use an ephemeral PostgreSQL 18 service. Matching PostgreSQL 18 CLI tools are
  installed explicitly; never point these tests at an application database.
- **Frontend type-check + build:** lint, tests, TypeScript, and Vite build.

Coverage artifacts are retained for seven days, including on test failures when
coverage was produced. Set the repository Actions variable `ENABLE_CODECOV=true`
to enable optional tokenless Codecov uploads; upload errors never override test
results. `backend-tests.yml` remains available as a **manual-only**, database-free
diagnostic, not a duplicate push/PR suite.

CodeQL retains native security alerts and PR integration. Superseded PR runs are
canceled; push validation and publication are not interrupted. Action dependencies
are SHA-pinned and Dependabot proposes weekly action and package updates.

## Automatic releases

A successful **push** CI run on this repository's `master`/`main` triggers
`release-on-merge.yml`. PRs, forks, other branches, and failed CI cannot enter the
write-capable jobs. The workflow checks out the exact tested SHA and then:

1. Calculates a version from stable `vMAJOR.MINOR.PATCH` ancestor tags and
   conventional commit messages (patch by default, minor for features, major for
   breaking changes). With no stable ancestor tag, the base is `v0.0.0`.
2. Creates the annotated tag and a draft GitHub release, or resumes existing work.
3. Calls the reusable image publisher and waits for success.
4. Publishes the draft with generated notes and the immutable image digest.

Publication is serialized with `concurrency.queue: max` (up to GitHub's queue
limit). CI completion order can differ from commit order: an untagged commit
whose descendant already has a stable tag fails explicitly for operator review
rather than creating a backwards release. Existing tagged releases can be retried;
rerun the original release workflow to complete a failed draft/publication.
Historical commits without the release helper scripts fail safely rather than
being released using untested replacement scripts.

Manual dispatch of **Release on merge to master** is a read-only version preview
for the selected `master`/`main` branch. It never creates a tag, release, or image.

## Container publication

`publish-image.yml` supports reusable calls, `v*` tag pushes, and manual builds of
existing tags. It resolves the tag once; reusable calls additionally require it to
match the caller's tested commit. Each native amd64/arm64 runner builds the
frontend from that commit before building the backend-only Docker context.
Archived/static resources are preserved. Images are pushed by digest, smoke-tested
against their own disposable PostgreSQL instance, then combined into a verified
multi-platform manifest. Failed smoke tests never expose release tags or `latest`
(untagged registry digests may remain).

Smoke tests check startup, migrations, `/health`, all three frontend entry points,
referenced JS files, and the embedded frontend source revision. Temporary
containers and networks are removed on script exit; no Compose volumes are used.

A stable tag push or an automatic release may advance `latest`. Manual dispatch
**defaults to not updating it**. Even with the option enabled, prereleases and
older versions cannot replace a newer stable `latest`. Unknown/missing version
labels on an existing `latest` fail closed rather than guessing. GitHub release
"latest" is likewise not moved backwards by an older retry.

## Local workflow checks

From the repository root, with the `.nvmrc` Node version active:

```bash
node --test scripts/*.test.mjs
bash scripts/check-workflows.sh
bash -n scripts/check-workflows.sh scripts/smoke-image.sh
```

The validator downloads actionlint 1.7.12 and verifies its fixed SHA-256. That
version does not yet understand GitHub's `concurrency.queue`: the validator
checks the supported literal values/cancellation combination and filters only
that exact known diagnostic. All other actionlint and available ShellCheck
findings remain blocking. The downloader targets Linux amd64, matching its CI
runner.

To test a locally built image (Docker, Bash, curl, jq, and openssl required):

```bash
bash scripts/smoke-image.sh LOCAL_IMAGE_TAG EXPECTED_FRONTEND_COMMIT_SHA
```

Before enabling these workflows, verify repository Actions/package permissions
and configure branch protection as appropriate. Recommended required checks are
`Workflow validation`, `Backend lint and PostgreSQL tests`, and
`Frontend type-check + build`. Merging to `master`/`main` can create a real release;
use PR CI or the `release` branch for validation without automatic publication.
