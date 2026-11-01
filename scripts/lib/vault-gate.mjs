// vault-gate: the one call every deploy, host-env, verify and rotate script makes BEFORE any network step or
// credential read, naming the ACTION it is about to perform.
//
//   import { vaultGate } from './lib/vault-gate.mjs';
//   const gate = await vaultGate({ root: REPO_ROOT, action: 'deploy', err });
//   if (!gate.ok) return gate.code;   // non-zero: not authorized, nothing ran
//
// It runs vault-sync's `check` for that action: a fresh, unexpired pull that covers the action and whose files are
// unchanged, and a live answer from vault.terranimus.com that this person can read every record the project's
// manifest lists for the action. A record they lack is refused (exit 3) with, per record:
//   You don't have access to the '<record name>' account in the vault — contact an admin to share it with you.
// An unreachable vault refuses too (exit 5): the gate fails closed.
//
// An action that needs a human (the rotate action, and anything the vault's tier table marks HIGH) becomes an approval request
// that the person decides in their web Approvals inbox: the gate prints ONE line ("Waiting for approval in the vault web ...") and
// carries on when they approve. No code is typed or compared. Exit codes: 0 ok, 2 not signed in, 3 no access or denied in the
// inbox, 5 vault unreachable,
// 8 the approval expired or was cancelled (run the command again).

import { check, ensureSession, EXIT, VaultSyncError, resolveVaultUrl, isLoopbackOrigin } from '../vault-sync.mjs';

export { EXIT };

// allowLoopback: tests only, and only in code. A deploy never accepts a vault on this machine, whatever the
// environment says, so a stand-in server answering "authorized" cannot open the gate. The gate is still a
// client-side check: the host credentials themselves are the real boundary (rotate them out of any legacy copy).
export async function vaultGate({ root, action, actions, project, environment, env = process.env, out = () => {}, err = (l) => process.stderr.write(`${l}\n`), fetchImpl, now, allowLoopback = false } = {}) {
  const wanted = actions && actions.length ? actions : action ? [action] : ['deploy'];
  const label = wanted.join(', ').toUpperCase();
  try {
    if (!allowLoopback && isLoopbackOrigin(resolveVaultUrl({ ...env, VAULT_SYNC_TEST_LOOPBACK: '1' }))) {
      throw new VaultSyncError(EXIT.error, 'VAULT_URL points at this machine; a deploy only trusts vault.terranimus.com');
    }
    // No session and a person at this terminal: sign in once through the browser, then carry on. No person (an agent, CI):
    // nothing happens here and check stops with the one-line 'Not signed in' instruction (exit 2).
    await ensureSession({ root, project, environment, actions: wanted, env, out: (l) => process.stderr.write(`${l}\n`), fetchImpl, now });
    const code = await check({ root, project, environment, actions: wanted, env, out, fetchImpl, now });
    return { ok: code === EXIT.ok, code };
  } catch (error) {
    if (error instanceof VaultSyncError) {
      err(`vault gate: NOT AUTHORIZED TO ${label}. ${error.message}`);
      return { ok: false, code: error.code };
    }
    err(`vault gate: NOT AUTHORIZED TO ${label} (unexpected error: ${error && error.message ? error.message.split('\n')[0] : 'unknown'})`);
    return { ok: false, code: EXIT.error };
  }
}
