# RQ3 LLM–Human Agreement Gate

`judge_icc.py` is the reproducible pre-data check for the RQ3 calibration
gate. It does not produce ratings, contact an LLM, or establish that any human
rater calibration took place.

## Input contract

First export the isolated research database with `export_logs.py`. The tool
expects its `judgescores.json` array and uses only rows where
`isCalibrationItem` is exactly `true`. Each `(testResultId, itemId)` must have:

- one LLM score;
- exactly two distinct human `judgeId` values, consistent across all items;
- an integer `totalScore` on the frozen 0–8 post-test rubric.

Missing or malformed cells stop the command. The script never fills missing
ratings or converts a non-calibration score into evidence.

## Command after independent scoring

```powershell
$py = 'C:\\path\\to\\python.exe'
& $py research\judge_icc.py `
  --input data\export\judgescores.json `
  --out data\export\judge_icc_report.json `
  --minimum-items 40 `
  --threshold 0.70
```

The report gives the protocol-requested ICC(2,1) comparison between LLM total
and the two-human mean, plus a human–human diagnostic. It returns exit code 2
when the number of dual-scored items is under 40 or the configured LLM gate is
not met. A passing technical gate is not an RQ3 result; preserve the blinded
source scores, rater records, exact prompt, model identifier, and rubric
version for review.

## Terminology to freeze before preregistration

`ICC(2,1)` conventionally denotes a two-way random-effects, absolute-agreement,
single-measure calculation. `CALIBRATION_GUIDE.md` currently labels that same
notation “two-way mixed,” while the draft preregistration calls it “two-way
random.” The calculation follows the ICC(2,1) formula, but the research team
must reconcile the prose and freeze the intended interpretation before data
collection. This file does not make that protocol decision.

## Test-only verification

```powershell
& $py -m pytest research\test_judge_icc.py -q
```

The unit fixture contains deliberately synthetic scores and is only a software
test. Its output must never be used as a calibration or study finding.

