# Security and data boundaries

Task Lantern is local workflow tooling. It is not a sandbox, authorization
service, agent watchdog, or access-control system.

The dashboard-builder prompt narrows what the designer should read and write.
That does not enforce directory-level permissions in the host. Claude's plugin
agent has only Read, Write, and Edit tools; those tools themselves can access
paths permitted by the host. The Codex adapter inherits host controls.

The renderer embeds escaped JSON and creates DOM text nodes. A content security
policy blocks external resources, connections, and forms. Custom CSS is trusted
local code; don't accept it from an untrusted source. Local filesystem checks
reject common symlink mistakes, but do not defend against a hostile local process
racing file operations or replacing parent directories.

Task snapshots can contain sensitive work details. Keep `.dashboard/` out of
public repositories and review screenshots before sharing. User preferences
store style only. Native Claude memory should also contain style only.

The publisher validates required-decision and completion structure. It cannot
verify whether a reported answer came from the user, whether work was actually
done, or whether a proposed action is authorized. Those remain agent/host duties.

If you find a vulnerability, use GitHub's private vulnerability reporting when
enabled on the repository. Otherwise contact the repository owner privately;
do not post private task data or exploitable details in a public issue.
