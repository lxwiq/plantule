import { Fact } from '@/components/care-sheet-view';
import { icons, ListSection } from '@/components/ui';
import { hasFindings, potText, type PhotoFindings } from '@/lib/identification';
import { TASK_KINDS } from '@/lib/labels';
import { capitalize } from '@/lib/text';

/** Single spaces, no trailing punctuation, capitalized: "Feuilles du bas jaunies". */
function cleanNote(text: string): string {
  return capitalize(
    text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\s.,;:]+$/, ''),
  );
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Why the photo says to repot or not ("Racines qui sortent du pot"), or null. */
export function repotReason(findings: PhotoFindings | null): string | null {
  if (!findings || findings.repot.needed === 'unknown') return null;
  return cleanNote(findings.repot.reason) || null;
}

/** The model's notes on the photo, without the ones repeating the repotting reason. */
function observations(findings: PhotoFindings): string[] {
  const reason = repotReason(findings)?.toLowerCase();
  const seen = new Set<string>();
  return findings.observations.map(cleanNote).filter((note) => {
    const key = note.toLowerCase();
    if (!note || key === reason || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Notes for a new plant, from what the photo shows: short sentences the user
 * can edit before saving. `withRepot` adds the repotting advice, for when no
 * repotting reminder carries it.
 */
export function findingsNotes(findings: PhotoFindings | null, { withRepot = false } = {}): string {
  if (!findings) return '';
  const notes = observations(findings);
  if (withRepot && findings.repot.needed === 'yes') {
    const reason = repotReason(findings);
    notes.push(reason ? `À rempoter : ${lowerFirst(reason)}` : 'À rempoter');
  }
  return notes.map((note) => `${note}.`).join(' ');
}

/** What the model saw besides the species: the pot, whether to repot, notes. Nothing when it saw nothing. */
export function PhotoFindingsSection({ findings }: { findings: PhotoFindings }) {
  if (!hasFindings(findings)) return null;
  const pot = potText(findings.pot);
  const { needed } = findings.repot;
  const reason = repotReason(findings);
  const notes = observations(findings);

  return (
    <ListSection
      title="Sur la photo"
      footer="Estimé d’après la photo : tu pourras corriger avant d’enregistrer la plante.">
      {pot ? <Fact icon={icons.pot} label="Pot" value={pot} /> : null}
      {needed !== 'unknown' ? (
        <Fact
          icon={TASK_KINDS.repot.icon}
          label="Rempotage"
          value={needed === 'yes' ? 'À rempoter' : 'Pas besoin pour l’instant'}
          detail={reason ?? undefined}
          warn={needed === 'yes'}
        />
      ) : null}
      {notes.length > 0 ? (
        <Fact
          icon={icons.eye}
          label="À noter"
          value={notes.length === 1 ? notes[0] : notes.map((note) => `• ${note}`).join('\n')}
        />
      ) : null}
    </ListSection>
  );
}
