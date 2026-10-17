# RQ1 clustered-inference gate — verified 2026-10-17

## What the code currently proves

- `fit_dart.py` splits cross-validation and resamples alpha confidence intervals
  by `userId`.
- `dart_model.py::lrt_alpha` explicitly documents that its boundary-corrected
  chi-square p-value assumes IID rows and is anti-conservative for clustered
  ReviewLog data.
- `fit_dart.py` previously printed that IID p-value as the reportable result;
  it is now labelled diagnostic-only.

## Why the existing bootstrap is not an approved primary test

`lrt_alpha_cluster_bootstrap` resamples observed user clusters and compares
their full-model LR values with the observed LR. It does not generate a
restricted-null distribution (for example by a validated constrained or wild
cluster bootstrap). Therefore its empirical tail is not, by itself, evidence
that the returned p-value controls Type-I error under H0.

No statistician approval, preregistration filing, participant data, or final
Type-I result is verified in this repository.

## Required next decision

Before RQ1 power is selected or any primary p-value is reported, a statistician
must approve and document one clustered-null procedure, its small-cluster
assumptions, the boundary treatment for alpha >= 0, and its simulated Type-I
calibration at the intended N/weeks/retrieval-type mix. Implement that method,
add regression tests, then rerun the synthetic diagnostic as test-only.

