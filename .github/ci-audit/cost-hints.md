# CI Cost Hints for Diatonic-AI/Diatonic-AI-Workbench

Failed runs (window): 70

## Longest failing jobs (minutes)
-   0.78m  Code Quality & Testing  labels=['ubuntu-latest']  run=https://github.com/Diatonic-AI/Diatonic-AI-Workbench/actions/runs/18830509154
-   0.78m  Code Quality & Testing  labels=['ubuntu-latest']  run=https://github.com/Diatonic-AI/Diatonic-AI-Workbench/actions/runs/18830230778
-   0.73m  Code Quality & Testing  labels=['ubuntu-latest']  run=https://github.com/Diatonic-AI/Diatonic-AI-Workbench/actions/runs/18455565548
-   0.72m  Code Quality & Testing  labels=['ubuntu-latest']  run=https://github.com/Diatonic-AI/Diatonic-AI-Workbench/actions/runs/18086238858
-    0.7m  Code Quality & Testing  labels=['ubuntu-latest']  run=https://github.com/Diatonic-AI/Diatonic-AI-Workbench/actions/runs/17905431727
-   0.68m  Code Quality & Testing  labels=['ubuntu-latest']  run=https://github.com/Diatonic-AI/Diatonic-AI-Workbench/actions/runs/19024167614
-   0.68m  Code Quality & Testing  labels=['ubuntu-latest']  run=https://github.com/Diatonic-AI/Diatonic-AI-Workbench/actions/runs/18642451249
-   0.68m  Code Quality & Testing  labels=['ubuntu-latest']  run=https://github.com/Diatonic-AI/Diatonic-AI-Workbench/actions/runs/18455529578
-   0.68m  Code Quality & Testing  labels=['ubuntu-latest']  run=https://github.com/Diatonic-AI/Diatonic-AI-Workbench/actions/runs/17905429945
-   0.68m  Code Quality & Testing  labels=['ubuntu-latest']  run=https://github.com/Diatonic-AI/Diatonic-AI-Workbench/actions/runs/17905413711

## Recommendations
- Add concurrency + cancel-in-progress to long-lived workflows (prevents duplicate runs)
- Add on:push paths filters to skip docs-only or non-code changes
- Consider scheduled workflows cadence (weekly/monthly instead of daily)
- Increase cache hit rates (setup-node/setup-python + actions/cache with lockfiles)
- Timeouts: set step/job-level timeouts to prevent runaway costs
- Reduce matrix size or shard by priority (nightly full matrix, PRs minimal)
