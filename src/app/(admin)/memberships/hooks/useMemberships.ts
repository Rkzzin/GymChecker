import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Member, Membership, MembershipToEdit } from '../types';
import { useTheme } from '../../../../components/ThemeProvider';

export function useMemberships() {
  // Dados
  const [members, setMembers] = useState<Member[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [openMemberships, setOpenMemberships] = useState<{ [key: string]: boolean }>({});
  const [loadingMemberships, setLoadingMemberships] = useState<{ [key: string]: boolean }>({});
  const { darkMode } = useTheme();

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [membershipToEdit, setMembershipToEdit] = useState<MembershipToEdit | null>(null);

  // --- Buscas ---
  const fetchMembers = useCallback(async () => {
    const { data } = await supabase.from('customer').select('id, name').order('name');
    if (data) setMembers(data);
  }, []);

  const fetchMembershipsForMember = async (memberId: string) => {
    setLoadingMemberships(prev => ({ ...prev, [memberId]: true }));
    try {
      const { data, error } = await supabase
        .from('subscription')
        .select(`*, plan (name, price)`)
        .eq('customer_id', memberId)
        .order('end_date', { ascending: false });

      if (error) throw error;

      const mappedData = (data || []).map((sub: any) => ({
        id: sub.id,
        memberId: sub.customer_id,
        startDate: new Date(sub.start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
        endDate: new Date(sub.end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
        rawStartDate: sub.start_date,
        rawEndDate: sub.end_date,
        planName: sub.plan?.name || 'Personalizado',
        price: sub.plan?.price || 0
      } as Membership));

      // Atualiza a lista global de matrículas mantendo as dos outros membros
      setMemberships(prev => {
        const others = prev.filter(m => m.memberId !== memberId);
        return [...others, ...mappedData];
      });
    } catch (error) {
      console.error("Error fetching memberships:", error);
    } finally {
      setLoadingMemberships(prev => ({ ...prev, [memberId]: false }));
    }
  };

  // --- Inicialização ---
  useEffect(() => {
    (async () => {
      await fetchMembers();
    })();
  }, [fetchMembers]);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // --- Ações ---
  const toggleMemberships = (memberId: string) => {
    const isOpening = !openMemberships[memberId];
    if (isOpening) fetchMembershipsForMember(memberId); // Fetch on demand
    setOpenMemberships(prev => ({ ...prev, [memberId]: isOpening }));
  };

  const openEditModal = (membership: Membership, memberName: string) => {
    setMembershipToEdit({ ...membership, memberName });
    setIsEditModalOpen(true);
  };

  const handleDeleteMembership = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro de matrícula?")) return;
    try {
      const { error } = await supabase.from('subscription').delete().eq('id', id);
      if (error) throw error;
      setMemberships(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      alert('Erro ao excluir matrícula.');
    }
  };

  // Chamado pelo modal ao salvar com sucesso
  const onEditSuccess = async (memberId: string) => {
    await fetchMembershipsForMember(memberId);
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    filteredMembers,
    memberships, // Lista plana de todas as matrículas carregadas
    openMemberships,
    loadingMemberships,
    searchQuery, setSearchQuery,
    darkMode,
    
    // Actions
    toggleMemberships,
    handleDeleteMembership,
    openEditModal,
    onEditSuccess,

    // Modal State
    isEditModalOpen, setIsEditModalOpen,
    membershipToEdit, setMembershipToEdit
  };
}
