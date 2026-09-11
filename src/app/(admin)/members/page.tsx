'use client';

import { useMembers } from './hooks/useMembers';
import { MembersToolbar } from './components/MembersToolbar';
import { MembersTable } from './components/MembersTable';
import { CreateMemberModal } from './components/CreateMemberModal';
import { EditMemberModal } from './components/EditMemberModal';
import { RenewMemberModal } from './components/RenewMemberModal';

export default function Members() {
  const {
    members, plans, loading,
    searchQuery, setSearchQuery,
    sortCriteria, sortDirection, handleSort,
    view, setView,
    isCreateModalOpen, setIsCreateModalOpen,
    isEditModalOpen, setIsEditModalOpen, openEditModal, memberToEdit,
    isRenewModalOpen, setIsRenewModalOpen, openRenewModal, memberToRenew,
    handleArchiveMember,
    fetchMembersAndSubscriptions,
    darkMode
  } = useMembers();

  return (
    <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <MembersToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        view={view}
        onViewChange={() => setView(view === 'active' ? 'archived' : 'active')}
        onOpenCreate={() => setIsCreateModalOpen(true)}
        darkMode={darkMode}
      />

      <MembersTable
        members={members}
        loading={loading}
        sortCriteria={sortCriteria}
        sortDirection={sortDirection}
        onSort={handleSort}
        onEdit={openEditModal}
        onRenew={openRenewModal}
        onArchive={handleArchiveMember}
        view={view}
        darkMode={darkMode}
      />

      <CreateMemberModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchMembersAndSubscriptions}
        plans={plans}
        darkMode={darkMode}
      />
      <EditMemberModal
        key={isEditModalOpen ? `edit-member-${memberToEdit?.id}` : 'edit-member-closed'}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchMembersAndSubscriptions}
        memberToEdit={memberToEdit}
        darkMode={darkMode}
      />
      <RenewMemberModal
        key={isRenewModalOpen ? `renew-member-${memberToRenew?.id}` : 'renew-member-closed'}
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        onSuccess={fetchMembersAndSubscriptions}
        member={memberToRenew}
        plans={plans}
        darkMode={darkMode}
      />
    </main>
  );
}