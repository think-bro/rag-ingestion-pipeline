# Changelog

## [0.8.1](https://github.com/think-bro/rag-ingestion-pipeline/compare/frontend-v0.8.0...frontend-v0.8.1) (2026-07-22)


### Bug Fixes

* **frontend:** update shadcn to patch vulnerable transitive dependencies ([ecc9ff4](https://github.com/think-bro/rag-ingestion-pipeline/commit/ecc9ff4c460cfe46b03860b92d78c74ec732cf3e))

## [0.8.0](https://github.com/think-bro/rag-ingestion-pipeline/compare/frontend-v0.7.0...frontend-v0.8.0) (2026-07-20)


### Features

* **frontend:** add dense and sparse model selection to ingestion ui ([9344a18](https://github.com/think-bro/rag-ingestion-pipeline/commit/9344a1815cd740f8d276ba915249efd9750f35e4))
* Implement hybrid embedding pipeline ([80d03ac](https://github.com/think-bro/rag-ingestion-pipeline/commit/80d03ac5e55cee9da231612350d2bb2c9da475f3))

## [0.7.0](https://github.com/think-bro/rag-ingestion-pipeline/compare/frontend-v0.6.0...frontend-v0.7.0) (2026-07-19)


### Features

* **frontend:** add embed model selection and persist form state via Zustand ([1d4e38d](https://github.com/think-bro/rag-ingestion-pipeline/commit/1d4e38d0cdc3cd8a301aa22803f0276254b41cf3))
* **frontend:** add real-time progress bar updates for embedding tasks ([00fef85](https://github.com/think-bro/rag-ingestion-pipeline/commit/00fef856cac76ef509b7900d1664979f4cb18459))
* **frontend:** add vector db selection and indexing task progress ui ([7ad5a3e](https://github.com/think-bro/rag-ingestion-pipeline/commit/7ad5a3e63bd0ef62c42669b684f52a8be5cceda1))
* **frontend:** replace text inputs with select dropdowns for preset options ([7bd4d56](https://github.com/think-bro/rag-ingestion-pipeline/commit/7bd4d568ee9b72220216d2aa6a338cbeda50df0f))
* Implement vector database indexing pipeline ([b14442d](https://github.com/think-bro/rag-ingestion-pipeline/commit/b14442deec8477f430887fc337b1554d1653ed56))

## [0.6.0](https://github.com/think-bro/rag-ingestion-pipeline/compare/frontend-v0.5.0...frontend-v0.6.0) (2026-07-17)


### Features

* **frontend:** implement chunking configuration ui and api integration ([66bef45](https://github.com/think-bro/rag-ingestion-pipeline/commit/66bef452b29a09f433c93082e1b501d1f7850055))
* **frontend:** integrate embedding task into UI components ([a6a7df4](https://github.com/think-bro/rag-ingestion-pipeline/commit/a6a7df47843a7ef56cbed00d7cf5c890a6397dc8))
* Implement document embedding to pipeline ([56e7291](https://github.com/think-bro/rag-ingestion-pipeline/commit/56e729128bc3b729b6d254921fcb40e57533c273))
* Implement recursive document chunking to pipeline ([a1fd0fb](https://github.com/think-bro/rag-ingestion-pipeline/commit/a1fd0fb2494458be2a412b8e0dd6e247849ec0de))

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
