'use client';

import { useMembers } from './hooks/useMembers';
import { MembersToolbar } from './components/MembersToolbar';
import { MembersTable } from './components/MembersTable';
import { CreateMemberModal } from './components/CreateMemberModal';
import { EditMemberModal } from './components/EditMemberModal';
import { RenewMemberModal } from './components/RenewMemberModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
    pendingArchiveMember,
    confirmArchiveMember,
    cancelArchive,
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
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchMembersAndSubscriptions}
        memberToEdit={memberToEdit}
        darkMode={darkMode}
      />
      <RenewMemberModal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        onSuccess={fetchMembersAndSubscriptions}
        member={memberToRenew}
        plans={plans}
        darkMode={darkMode}
      />

      <AlertDialog open={!!pendingArchiveMember} onOpenChange={(open) => !open && cancelArchive()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar {view === 'active' ? 'arquivamento' : 'reativação'}</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente {view === 'active' ? 'arquivar' : 'reativar'} {pendingArchiveMember?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchiveMember}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}