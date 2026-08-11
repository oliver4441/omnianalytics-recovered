import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { addTeamMember, removeTeamMember } from '../services/projectService';
import Icon from './Icon';
import './TeamManagement.css';

const formatDate = (value) => {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

function TeamManagement({ project, onProjectUpdate }) {
  const { user } = useSelector((state) => state.auth);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isOwner = project?.ownerId === user?.uid;
  const { activeMembers, pendingMembers } = useMemo(() => {
    const members = project?.teamMembers || [];
    const active = members.filter((member) => member.status !== 'pending' && !member.uid?.startsWith('invite-'));
    const pending = members.filter((member) => member.status === 'pending' || member.uid?.startsWith('invite-'));

    if (!active.length && isOwner) {
      active.push({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
        role: 'owner',
      });
    }
    return { activeMembers: active, pendingMembers: pending };
  }, [isOwner, project?.teamMembers, user]);

  useEffect(() => {
    if (!showInviteModal) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) setShowInviteModal(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, showInviteModal]);

  const handleInvite = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      await addTeamMember(project.id, inviteEmail, 'member');
      setNotice('Pending invite recorded. No access has been granted yet.');
      setInviteEmail('');
      setShowInviteModal(false);
      await onProjectUpdate?.();
    } catch (inviteError) {
      setError(inviteError.message || 'Unable to record the pending invite.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (member) => {
    const label = member.status === 'pending' ? 'Remove this pending invite?' : `Remove ${member.email} from this project?`;
    if (!window.confirm(label)) return;

    setLoading(true);
    setError('');
    setNotice('');
    try {
      await removeTeamMember(project.id, member.email);
      await onProjectUpdate?.();
    } catch (removeError) {
      setError(removeError.message || 'Unable to remove this team record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="oa-team">
      <header className="oa-team__header">
        <div>
          <h2>Project team</h2>
          <p>People with active project access and pending invite records.</p>
        </div>
        {isOwner && (
          <button className="oa-team__invite" type="button" onClick={() => setShowInviteModal(true)}>
            <Icon name="plus" size={15} /> Record invite
          </button>
        )}
      </header>

      {error && <div className="oa-team__message oa-team__message--error" role="alert"><Icon name="issue" size={15} /> {error}</div>}
      {notice && <div className="oa-team__message oa-team__message--notice" role="status"><Icon name="checkCircle" size={15} /> {notice}</div>}

      <section className="oa-team__section" aria-labelledby="active-team-heading">
        <div className="oa-team__section-title">
          <h3 id="active-team-heading">Active access</h3>
          <span>{activeMembers.length}</span>
        </div>
        {activeMembers.length ? (
          <ul className="oa-team__list">
            {activeMembers.map((member) => (
              <li key={member.uid || member.email}>
                <span className="oa-team__avatar" aria-hidden="true">
                  {(member.displayName || member.email || 'U').charAt(0).toUpperCase()}
                </span>
                <div>
                  <strong>
                    {member.displayName || member.email}
                    {member.uid === user?.uid && <small>You</small>}
                  </strong>
                  <p>{member.email}</p>
                  {formatDate(member.joinedAt) && <span>Joined {formatDate(member.joinedAt)}</span>}
                </div>
                <span className={`oa-team__role ${member.role === 'owner' ? 'is-owner' : ''}`}>
                  {member.role === 'owner' ? 'Owner' : 'Member'}
                </span>
                {isOwner && member.role !== 'owner' && (
                  <button disabled={loading} type="button" onClick={() => handleRemove(member)}>Remove</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="oa-team__empty">No active member records are available.</p>
        )}
      </section>

      {pendingMembers.length > 0 && (
        <section className="oa-team__section oa-team__section--pending" aria-labelledby="pending-team-heading">
          <div className="oa-team__section-title">
            <h3 id="pending-team-heading">Pending records</h3>
            <span>{pendingMembers.length}</span>
          </div>
          <p className="oa-team__pending-note">These addresses do not have project access. Invite delivery and acceptance are not connected yet.</p>
          <ul className="oa-team__pending-list">
            {pendingMembers.map((member) => (
              <li key={member.uid || member.email}>
                <span><Icon name="clock" size={15} /></span>
                <div><strong>{member.email}</strong><small>Access not granted</small></div>
                {isOwner && <button disabled={loading} type="button" onClick={() => handleRemove(member)}>Remove</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {showInviteModal && (
        <div className="oa-team-modal__overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !loading) setShowInviteModal(false);
        }}>
          <section aria-labelledby="team-invite-title" aria-modal="true" className="oa-team-modal" role="dialog">
            <header>
              <div><span>Team access</span><h2 id="team-invite-title">Record pending invite</h2></div>
              <button aria-label="Close invite dialog" disabled={loading} type="button" onClick={() => setShowInviteModal(false)}>
                <Icon name="close" size={17} />
              </button>
            </header>
            <form onSubmit={handleInvite}>
              <div className="oa-team-modal__notice">
                <Icon name="issue" size={17} />
                <p><strong>Invite delivery is not connected.</strong> This stores a pending email address only. It does not email the recipient or grant project access.</p>
              </div>
              <label>
                <span>Email address</span>
                <input
                  autoFocus
                  placeholder="engineer@example.com"
                  required
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
              </label>
              <div className="oa-team-modal__actions">
                <button disabled={loading} type="button" onClick={() => setShowInviteModal(false)}>Cancel</button>
                <button className="oa-team__invite" disabled={loading || !inviteEmail.trim()} type="submit">
                  {loading ? 'Recording…' : 'Record invite'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default TeamManagement;
