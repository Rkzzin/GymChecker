import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MemberWithMembership, Plan } from '../types';
import { isInactiveMoreThan5Days, sortMembersData } from '../utils';
import { useTheme } from '@/components/ThemeProvider';

export function useMembers() {
  const { darkMode } = useTheme();

  // --- Estados de Dados ---
  const [sortedMembers, setSortedMembers] = useState<MemberWithMembership[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true); // <--- NOVO
  
  // --- Estados de Controle de UI ---
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCriteria, setSortCriteria] = useState<string>('endDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [view, setView] = useState<'active' | 'archived'>('active');

  // --- Estados de Modais ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  
  const [memberToEdit, setMemberToEdit] = useState<any | null>(null);
  const [memberToRenew, setMemberToRenew] = useState<MemberWithMembership | null>(null);

  // --- Inicialização ---
  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    fetchMembersAndSubscriptions();
  }, [view]);

  // --- Funções de Busca ---
  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    const { data, error } = await supabase
      .from('plan')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (error) console.error('Erro ao buscar planos:', error);
    if (data) setPlans(data);
    setLoadingPlans(false);
  }, []);

  const fetchMembersAndSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: customers, error } = await supabase
        .from('customer')
        .select(`
          id, name, email, phone, notes, status,
          subscription (id, start_date, end_date, plan (id, name))
        `)
        .eq('status', view);

      if (error) throw error;

      if (customers) {
        const processedData = customers.map((customer: any) => {
          const subscriptions = customer.subscription || [];
          const lastSubscription = subscriptions.sort((a: any, b: any) => 
            new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
          )[0];

          return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            notes: customer.notes,
            status: customer.status,
            startDate: lastSubscription ? new Date(lastSubscription.start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null,
            endDate: lastSubscription ? new Date(lastSubscription.end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null,
            rawEndDate: lastSubscription ? lastSubscription.end_date : null,
            isInactive: isInactiveMoreThan5Days(lastSubscription?.end_date),
            lastPlanName: lastSubscription?.plan?.name,
            lastPlanId: lastSubscription?.plan?.id
          };
        });

        setSortedMembers(prev => sortMembersData(processedData, sortCriteria, sortDirection));
      }
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
    } finally {
      setLoading(false);
    }
  }, [view, sortCriteria, sortDirection]);

  // --- Handlers ---
  const handleSort = (field: 'name' | 'startDate' | 'endDate') => {
    const nextDir = sortCriteria === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortCriteria(field);
    setSortDirection(nextDir);
    setSortedMembers(sortMembersData(sortedMembers, field, nextDir));
  };

  const handleArchiveMember = async (member: MemberWithMembership) => {
    const newStatus = member.status === 'active' ? 'archived' : 'active';
    const action = newStatus === 'archived' ? 'arquivar' : 'reativar';
    
    if (window.confirm(`Deseja realmente ${action} ${member.name}?`)) {
      const { error } = await supabase.from('customer').update({ status: newStatus }).eq('id', member.id);
      if (!error) {
        setSortedMembers(prev => prev.filter(m => m.id !== member.id));
      } else {
        alert("Erro ao alterar status: " + error.message);
      }
    }
  };

  const openEditModal = (member: MemberWithMembership) => {
    setMemberToEdit({
      id: member.id,
      name: member.name,
      email: member.email || '',
      phone: member.phone || '',
      notes: member.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const openRenewModal = (member: MemberWithMembership) => {
    setMemberToRenew(member);
    setIsRenewModalOpen(true);
  };

  const filteredMembers = sortedMembers.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    members: filteredMembers,
    plans,
    loading,
    loadingPlans, // <--- EXPORTADO
    
    searchQuery, setSearchQuery,
    sortCriteria, sortDirection,
    view, setView,
    darkMode, 

    isCreateModalOpen, setIsCreateModalOpen,
    isEditModalOpen, setIsEditModalOpen,
    isRenewModalOpen, setIsRenewModalOpen,
    memberToEdit,
    memberToRenew,

    fetchMembersAndSubscriptions,
    handleSort,
    handleArchiveMember,
    openEditModal,
    openRenewModal
  };
}