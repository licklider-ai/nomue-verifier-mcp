# Non-Claims — nomue MCP local verifier adapter

This package is a local transport adapter for `@licklider/nomue-verifier`. It does not
add a scientific, statistical, or Protocol claim.

- A report whose applicable scoped checks pass is not an overall `VERIFIED` result.
- It does not establish scientific truth, scientific validity, declaration truth,
  causal validity, or publication acceptance.
- It does not calculate a Welch test from raw samples or choose a statistical method.
- It does not support paired-t, Wilcoxon, Mann-Whitney, or any bundle not supported by
  the pinned verifier package.
- It does not attest a Record or call a Licklider-hosted service.

The verifier artifact's `verification_results`, check versions, reason codes, scopes,
and `guarantee_boundary` remain the controlling machine-readable result.
