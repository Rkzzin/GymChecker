'use client';

import { useMemberships } from './hooks/useMemberships';
import { useTheme } from '@/components/ThemeProvider';

// Componentes
import { MembershipsToolbar } from './components/MembershipsToolbar';
import { MembersList } from './components/MembersList';
import { EditMembershipModal } from './components/EditMembershipModal';

export default function Memberships() {
  const {
    filteredMembers, memberships,
    openMemberships, loadingMemberships,
    searchQuery, setSearchQuery,
    toggleMemberships, handleDeleteMembership,
    isEditModalOpen, setIsEditModalOpen,
    membershipToEdit, openEditModal,
    onEditSuccess
  } = useMemberships();

  const { darkMode } = useTheme();

  const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const inputClass = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';

  return (
    <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <MembershipsToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cardClass={cardClass}
        inputClass={inputClass}
      />

      <MembersList
        filteredMembers={filteredMembers}
        memberships={memberships}
        openMemberships={openMemberships}
        loadingMemberships={loadingMemberships}
        onToggle={toggleMemberships}
        onEdit={openEditModal}
        onDelete={handleDeleteMembership}
        darkMode={darkMode}
        cardClass={cardClass}
      />

      <EditMembershipModal
        key={isEditModalOpen ? `edit-membership-${membershipToEdit?.id}` : 'edit-membership-closed'}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={onEditSuccess}
        membershipToEdit={membershipToEdit}
        darkMode={darkMode}
      />
    </main>
  );
}