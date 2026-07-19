# Changelog

## [0.7.0](https://github.com/think-bro/rag-ingestion-pipeline/compare/backend-v0.6.0...backend-v0.7.0) (2026-07-19)


### Features

* **backend:** add predefined grade and subject metadata options to preset ([a10c52c](https://github.com/think-bro/rag-ingestion-pipeline/commit/a10c52cd74fa6807f10312fe410ba259bf564611))
* **backend:** add vector indexing support and background tasks ([1d242d8](https://github.com/think-bro/rag-ingestion-pipeline/commit/1d242d879229ab12fe75df612b39ca0ae3a0c866))
* **backend:** expose embedding models API and update request schemas ([21ab757](https://github.com/think-bro/rag-ingestion-pipeline/commit/21ab75735a302369a131d46a8cf87898078d720b))
* **backend:** implement real-time progress tracking for vectors ([0031010](https://github.com/think-bro/rag-ingestion-pipeline/commit/0031010efea43a86b9a81d37d8559e8162eb8a35))
* Implement vector database indexing pipeline ([b14442d](https://github.com/think-bro/rag-ingestion-pipeline/commit/b14442deec8477f430887fc337b1554d1653ed56))

## [0.6.0](https://github.com/think-bro/rag-ingestion-pipeline/compare/backend-v0.5.0...backend-v0.6.0) (2026-07-17)


### Features

* **backend:** add embedding feature slice with fastembed ([d9db36a](https://github.com/think-bro/rag-ingestion-pipeline/commit/d9db36a8b9f76a2032a53929d21727867f3e4a70))
* **backend:** implement recursive document chunking service and controllers ([de0961b](https://github.com/think-bro/rag-ingestion-pipeline/commit/de0961b0133e38599d6a478bc3aefef492c3cb6b))
* Implement document embedding to pipeline ([56e7291](https://github.com/think-bro/rag-ingestion-pipeline/commit/56e729128bc3b729b6d254921fcb40e57533c273))
* Implement recursive document chunking to pipeline ([a1fd0fb](https://github.com/think-bro/rag-ingestion-pipeline/commit/a1fd0fb2494458be2a412b8e0dd6e247849ec0de))


### Bug Fixes

* **backend:** iterate result directly instead of enumerate ([7223f54](https://github.com/think-bro/rag-ingestion-pipeline/commit/7223f542803e04828b7eb61a25cdfcae3d4ef63f))

## [0.5.0](https://github.com/think-bro/rag-ingestion-pipeline/compare/backend-v0.4.0...backend-v0.5.0) (2026-06-25)


### Features

* **document_parsing:** Add task cancellation API ([db780dc](https://github.com/think-bro/rag-ingestion-pipeline/commit/db780dc981a046f1c84c87303d7e395d85a8b3be))
* **document_parsing:** Add task cancellation API (closes [#8](https://github.com/think-bro/rag-ingestion-pipeline/issues/8)) ([a3790d9](https://github.com/think-bro/rag-ingestion-pipeline/commit/a3790d98ac02cc309be03b1bb0fc1fc3236c22a6))
* **document_parsing:** Add task cancellation API (closes [#8](https://github.com/think-bro/rag-ingestion-pipeline/issues/8)) ([db780dc](https://github.com/think-bro/rag-ingestion-pipeline/commit/db780dc981a046f1c84c87303d7e395d85a8b3be))
* **document_parsing:** Asynchronous PDF splitting and parallel processing ([e94590e](https://github.com/think-bro/rag-ingestion-pipeline/commit/e94590e41686df23e73d1cacad57055f62fbec43))
* **document_parsing:** Implement asynchronous PDF splitting and parallel processing ([45dae07](https://github.com/think-bro/rag-ingestion-pipeline/commit/45dae07a4b6b6db6d47494770fb99016794b0b0d)), closes [#10](https://github.com/think-bro/rag-ingestion-pipeline/issues/10)
* Implement two-step upload flow with enhanced UI and time tracking ([088488c](https://github.com/think-bro/rag-ingestion-pipeline/commit/088488ce34c39eb5df5000bb85deb884aadbd6ee))
* **root:** Track task processing time and format file sizes ([bc0fdd6](https://github.com/think-bro/rag-ingestion-pipeline/commit/bc0fdd6a786371241325063ae8d93126c8569da5))

## [0.4.0](https://github.com/think-bro/rag-ingestion-pipeline/compare/backend-v0.3.0...backend-v0.4.0) (2026-06-21)


### Features

* **backend:** Migrate asynchronous tasks to TaskIQ with Redis backend ([#5](https://github.com/think-bro/rag-ingestion-pipeline/issues/5)) ([9399df2](https://github.com/think-bro/rag-ingestion-pipeline/commit/9399df201f377bc997784c828ba53a68fbb84bfd))
* **frontend:** integrate real backend api and dynamic polling for ingestion tasks ([8f5b6f6](https://github.com/think-bro/rag-ingestion-pipeline/commit/8f5b6f6a4943109eca40883082c5fe872e862049))
* Next.js frontend rewrite, dynamic polling, and disk-based results storage ([#7](https://github.com/think-bro/rag-ingestion-pipeline/issues/7)) ([75bf31a](https://github.com/think-bro/rag-ingestion-pipeline/commit/75bf31ac0a5229e319fc9cb9c6ffdaf9a5b2ef5c))
* **root:** Implement task deletion, stabilize detail UI, and configure dev proxy ([b9b857d](https://github.com/think-bro/rag-ingestion-pipeline/commit/b9b857d29dfdce0d17faff168ffa1fff0fe367a6))

## [0.3.0](https://github.com/think-bro/rag-ingestion-pipeline/compare/backend-v0.2.0...backend-v0.3.0) (2026-06-18)


### Features

* **document_parsing:** Implement async task polling and advanced UI ([#3](https://github.com/think-bro/rag-ingestion-pipeline/issues/3)) ([a1e0e59](https://github.com/think-bro/rag-ingestion-pipeline/commit/a1e0e592e17eae92fba38edb836944b1b6ecbf72))

## [0.2.0](https://github.com/think-bro/rag-ingestion-pipeline/compare/backend-v0.1.0...backend-v0.2.0) (2026-06-18)


### Features

* **root:** Migrate to uv workspaces monorepo and add Streamlit frontend UI ([ec48ad1](https://github.com/think-bro/rag-ingestion-pipeline/commit/ec48ad148b1baebe09f2f6f98fe7ae01a5d01d67))
