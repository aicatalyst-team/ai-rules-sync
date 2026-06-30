## Deploying ai-rules-sync: A Zero-Dependency Node.js App on Red Hat OpenShift

ai-rules-sync converts between AI coding-agent rule files. Codex uses AGENTS.md, Claude Code uses CLAUDE.md, and Cursor uses .cursorrules. Keeping them in sync is tedious. ai-rules-sync automates the conversion with a command-line interface (CLI) tool and a browser playground, all with zero npm dependencies.

We deployed the web playground on [Red Hat OpenShift AI](https://www.redhat.com/en/technologies/cloud-computing/openshift/openshift-ai) to demonstrate how lightweight developer tools containerize on the platform.

## Containerizing with UBI

The Dockerfile uses Red Hat's Universal Base Image (UBI) Node.js 22 image. Since ai-rules-sync has zero dependencies, there is no npm install step at all. The build copies source files and starts the built-in static server.

The entire Dockerfile is 12 lines. The resulting image starts in under a second.

## Deployment and validation

The deployment uses standard Kubernetes resources: a Deployment with one replica, a ClusterIP Service, and readiness probes pointing at the playground HTML. All three validation tests passed: the web playground loads correctly, the core JavaScript library is accessible, and the stylesheet loads.

This demonstrates that zero-dependency Node.js tools are ideal candidates for quick Red Hat OpenShift deployments. The UBI Node.js image provides the runtime, and the lack of external dependencies eliminates supply-chain concerns.

**Resources:**
- [ai-rules-sync repository](https://github.com/PanisHandsome/ai-rules-sync)
- [PoC fork](https://github.com/aicatalyst-team/ai-rules-sync)
- [Container image](https://quay.io/repository/aicatalyst/ai-rules-sync)
- [Red Hat OpenShift AI](https://www.redhat.com/en/technologies/cloud-computing/openshift/openshift-ai)
