# Changelog

## [0.5.0](https://github.com/think-bro/rag-ingestion-pipeline/compare/frontend-v0.4.0...frontend-v0.5.0) (2026-06-25)


### Features

* **document_parsing:** Add task cancellation API ([db780dc](https://github.com/think-bro/rag-ingestion-pipeline/commit/db780dc981a046f1c84c87303d7e395d85a8b3be))
* **document_parsing:** Add task cancellation API (closes [#8](https://github.com/think-bro/rag-ingestion-pipeline/issues/8)) ([a3790d9](https://github.com/think-bro/rag-ingestion-pipeline/commit/a3790d98ac02cc309be03b1bb0fc1fc3236c22a6))
* **document_parsing:** Add task cancellation API (closes [#8](https://github.com/think-bro/rag-ingestion-pipeline/issues/8)) ([db780dc](https://github.com/think-bro/rag-ingestion-pipeline/commit/db780dc981a046f1c84c87303d7e395d85a8b3be))
* **document_parsing:** Asynchronous PDF splitting and parallel processing ([e94590e](https://github.com/think-bro/rag-ingestion-pipeline/commit/e94590e41686df23e73d1cacad57055f62fbec43))
* **document_parsing:** Implement asynchronous PDF splitting and parallel processing ([45dae07](https://github.com/think-bro/rag-ingestion-pipeline/commit/45dae07a4b6b6db6d47494770fb99016794b0b0d)), closes [#10](https://github.com/think-bro/rag-ingestion-pipeline/issues/10)
* Implement two-step upload flow with enhanced UI and time tracking ([088488c](https://github.com/think-bro/rag-ingestion-pipeline/commit/088488ce34c39eb5df5000bb85deb884aadbd6ee))
* **root:** Track task processing time and format file sizes ([bc0fdd6](https://github.com/think-bro/rag-ingestion-pipeline/commit/bc0fdd6a786371241325063ae8d93126c8569da5))
* **task-detail-view:** add pending UI and disable delete while pending ([fa182ba](https://github.com/think-bro/rag-ingestion-pipeline/commit/fa182baf65a4e96bacc8a4abd1bf73d9efaf6329))


### Performance Improvements

* **backend:** migrate TaskIQ worker to process pool (closes [#15](https://github.com/think-bro/rag-ingestion-pipeline/issues/15)) ([e2c5e70](https://github.com/think-bro/rag-ingestion-pipeline/commit/e2c5e70353670e84b402939bdb56648d0f7a1008))

## [0.4.0](https://github.com/think-bro/rag-ingestion-pipeline/compare/frontend-v0.3.0...frontend-v0.4.0) (2026-06-21)


### Features

* **frontend:** Add shadcn sidebar-08 layout and fix lints ([46d5d79](https://github.com/think-bro/rag-ingestion-pipeline/commit/46d5d795afc38c56f95ce78db8a2e6e6561bfc37))
* **frontend:** Dockerize Next.js app with Nginx and update compose ([b2c8d6a](https://github.com/think-bro/rag-ingestion-pipeline/commit/b2c8d6a1028830832610e0ce3579f6bcede85d85))
* **frontend:** implement responsive dynamic ingestion modal ([db4f5c3](https://github.com/think-bro/rag-ingestion-pipeline/commit/db4f5c31c8d7ce94fe116c74527d50735d403a6f))
* **frontend:** integrate real backend api and dynamic polling for ingestion tasks ([8f5b6f6](https://github.com/think-bro/rag-ingestion-pipeline/commit/8f5b6f6a4943109eca40883082c5fe872e862049))
* **frontend:** make shadcn sidebar functional with dummy tasks state ([8bc3c5c](https://github.com/think-bro/rag-ingestion-pipeline/commit/8bc3c5c0f123c35c1a60e848fc6d1754214ad15c))
* **frontend:** Replace Streamlit with Next.js scaffold ([4fb5ba2](https://github.com/think-bro/rag-ingestion-pipeline/commit/4fb5ba2f049de6d71a8d5bc9d8cce702ff1d60dd))
* Next.js frontend rewrite, dynamic polling, and disk-based results storage ([#7](https://github.com/think-bro/rag-ingestion-pipeline/issues/7)) ([75bf31a](https://github.com/think-bro/rag-ingestion-pipeline/commit/75bf31ac0a5229e319fc9cb9c6ffdaf9a5b2ef5c))
* **root:** Implement task deletion, stabilize detail UI, and configure dev proxy ([b9b857d](https://github.com/think-bro/rag-ingestion-pipeline/commit/b9b857d29dfdce0d17faff168ffa1fff0fe367a6))

## [0.3.0](https://github.com/think-bro/rag-ingestion-pipeline/compare/frontend-v0.2.0...frontend-v0.3.0) (2026-06-18)


### Features

* **document_parsing:** Implement async task polling and advanced UI ([#3](https://github.com/think-bro/rag-ingestion-pipeline/issues/3)) ([a1e0e59](https://github.com/think-bro/rag-ingestion-pipeline/commit/a1e0e592e17eae92fba38edb836944b1b6ecbf72))

## [0.2.0](https://github.com/think-bro/rag-ingestion-pipeline/compare/frontend-v0.1.0...frontend-v0.2.0) (2026-06-18)


### Features

* **root:** Migrate to uv workspaces monorepo and add Streamlit frontend UI ([ec48ad1](https://github.com/think-bro/rag-ingestion-pipeline/commit/ec48ad148b1baebe09f2f6f98fe7ae01a5d01d67))
